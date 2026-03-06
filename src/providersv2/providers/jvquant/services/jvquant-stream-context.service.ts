import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { inflateRawSync } from "zlib";

import { createLogger } from "@common/logging/index";

type JvQuantMarket = "hk" | "us" | "ab";

interface ParsedSubscriptionSymbol {
  market: JvQuantMarket;
  providerCode: string;
  standardSymbol: string;
}

@Injectable()
export class JvQuantStreamContextService implements OnModuleDestroy {
  private readonly logger = createLogger(JvQuantStreamContextService.name);

  private readonly sockets = new Map<JvQuantMarket, any>();
  private readonly subscribedCodesByMarket = new Map<JvQuantMarket, Set<string>>();
  private readonly standardSymbolMap = new Map<string, string>();
  private readonly connectTasks = new Map<JvQuantMarket, Promise<void>>();
  private readonly messageCallbacks: Array<(data: any) => void> = [];

  private readonly serverApi: string;
  private readonly token: string;
  private readonly connectTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.serverApi =
      this.configService.get<string>("JVQUANT_SERVER_API") ||
      "http://jvQuant.com/query/server";
    this.token =
      this.configService.get<string>("JVQUANT_TOKEN") ||
      process.env.JVQUANT_TOKEN ||
      "";
    this.connectTimeoutMs = Number(
      this.configService.get<number>("JVQUANT_CONNECT_TIMEOUT_MS") || 10000,
    );
  }

  async initializeWebSocket(): Promise<void> {
    if (!this.token) {
      throw new Error("JVQUANT_TOKEN 未配置");
    }
  }

  async subscribe(symbols: string[]): Promise<void> {
    await this.initializeWebSocket();

    const parsedSymbols = symbols
      .map((symbol) => this.parseSymbol(symbol))
      .filter(Boolean) as ParsedSubscriptionSymbol[];

    if (parsedSymbols.length === 0) {
      return;
    }

    const codesByMarket = new Map<JvQuantMarket, Set<string>>();
    for (const parsed of parsedSymbols) {
      if (!codesByMarket.has(parsed.market)) {
        codesByMarket.set(parsed.market, new Set<string>());
      }
      codesByMarket.get(parsed.market)!.add(parsed.providerCode);
      this.standardSymbolMap.set(
        this.getMarketCodeKey(parsed.market, parsed.providerCode),
        parsed.standardSymbol,
      );
    }

    for (const [market, codes] of codesByMarket.entries()) {
      const codeList = Array.from(codes);
      if (codeList.length === 0) {
        continue;
      }

      await this.ensureMarketSocketConnected(market);
      await this.sendCommand(market, "add", codeList);

      if (!this.subscribedCodesByMarket.has(market)) {
        this.subscribedCodesByMarket.set(market, new Set<string>());
      }
      codeList.forEach((code) => this.subscribedCodesByMarket.get(market)!.add(code));
    }
  }

  async unsubscribe(symbols: string[]): Promise<void> {
    const parsedSymbols = symbols
      .map((symbol) => this.parseSymbol(symbol))
      .filter(Boolean) as ParsedSubscriptionSymbol[];

    if (parsedSymbols.length === 0) {
      return;
    }

    const codesByMarket = new Map<JvQuantMarket, Set<string>>();
    for (const parsed of parsedSymbols) {
      if (!codesByMarket.has(parsed.market)) {
        codesByMarket.set(parsed.market, new Set<string>());
      }
      codesByMarket.get(parsed.market)!.add(parsed.providerCode);
    }

    for (const [market, codes] of codesByMarket.entries()) {
      const socket = this.sockets.get(market);
      if (!this.isSocketOpen(socket)) {
        continue;
      }

      const codeList = Array.from(codes);
      if (codeList.length === 0) {
        continue;
      }

      await this.sendCommand(market, "del", codeList);

      const subscribed = this.subscribedCodesByMarket.get(market);
      if (subscribed) {
        codeList.forEach((code) => subscribed.delete(code));
      }
    }
  }

  onQuoteUpdate(callback: (data: any) => void): () => void {
    this.messageCallbacks.push(callback);

    let unregistered = false;
    return () => {
      if (unregistered) {
        return;
      }

      unregistered = true;
      const index = this.messageCallbacks.indexOf(callback);
      if (index >= 0) {
        this.messageCallbacks.splice(index, 1);
      }
    };
  }

  isWebSocketConnected(): boolean {
    return Array.from(this.sockets.values()).some((socket) =>
      this.isSocketOpen(socket),
    );
  }

  async cleanup(): Promise<void> {
    for (const socket of this.sockets.values()) {
      try {
        if (typeof socket?.close === "function") {
          socket.close();
        }
      } catch {
        // 忽略连接关闭异常
      }
    }

    this.sockets.clear();
    this.subscribedCodesByMarket.clear();
    this.standardSymbolMap.clear();
    this.connectTasks.clear();
    this.messageCallbacks.length = 0;
  }

  async onModuleDestroy(): Promise<void> {
    await this.cleanup();
  }

  private async ensureMarketSocketConnected(market: JvQuantMarket): Promise<void> {
    const existing = this.sockets.get(market);
    if (this.isSocketOpen(existing)) {
      return;
    }

    const pending = this.connectTasks.get(market);
    if (pending) {
      await pending;
      return;
    }

    const connectTask = (async () => {
      const wsUrl = await this.allocateMarketServer(market);
      await this.openSocket(market, wsUrl);
      this.logger.log("JvQuant WebSocket 连接成功", { market, wsUrl });
    })();

    this.connectTasks.set(market, connectTask);

    try {
      await connectTask;
    } finally {
      this.connectTasks.delete(market);
    }
  }

  private async allocateMarketServer(market: JvQuantMarket): Promise<string> {
    const response = await axios.get(this.serverApi, {
      params: {
        market,
        type: "websocket",
        token: this.token,
      },
      timeout: this.connectTimeoutMs,
    });

    const payload = response.data || {};
    if (String(payload.code) !== "0" || !payload.server) {
      throw new Error(
        `JvQuant 分配服务器失败: market=${market}, code=${payload.code}, msg=${payload.msg || "unknown"}`,
      );
    }

    const rawServer = String(payload.server).trim();
    const wsBase = /^wss?:\/\//i.test(rawServer)
      ? rawServer
      : `ws://${rawServer}`;

    const wsUrl = new URL(wsBase);
    if (!wsUrl.searchParams.has("token")) {
      wsUrl.searchParams.set("token", this.token);
    }

    return wsUrl.toString();
  }

  private async openSocket(market: JvQuantMarket, wsUrl: string): Promise<void> {
    const WebSocketCtor = (globalThis as any).WebSocket;
    if (!WebSocketCtor) {
      throw new Error("当前运行环境未提供全局 WebSocket 实现");
    }

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocketCtor(wsUrl);
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          socket.close();
        } catch {
          // ignore
        }
        reject(new Error(`JvQuant WebSocket 连接超时: market=${market}`));
      }, this.connectTimeoutMs);

      const handleOpen = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.attachSocketEvents(market, socket);
        this.sockets.set(market, socket);
        resolve();
      };

      const handleError = (event: any) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(new Error(`JvQuant WebSocket 连接失败: market=${market}, error=${event?.message || "unknown"}`));
      };

      if (typeof socket.addEventListener === "function") {
        socket.addEventListener("open", handleOpen, { once: true });
        socket.addEventListener("error", handleError, { once: true });
      } else {
        socket.onopen = handleOpen;
        socket.onerror = handleError;
      }
    });
  }

  private attachSocketEvents(market: JvQuantMarket, socket: any): void {
    const messageHandler = (event: any) => {
      const payload = event?.data ?? event;
      void this.handleSocketMessage(market, payload);
    };

    const closeHandler = () => {
      if (this.sockets.get(market) === socket) {
        this.sockets.delete(market);
      }
      this.logger.warn("JvQuant WebSocket 已关闭", { market });
    };

    const errorHandler = (event: any) => {
      this.logger.warn("JvQuant WebSocket 错误", {
        market,
        error: event?.message || "unknown",
      });
    };

    if (typeof socket.addEventListener === "function") {
      socket.addEventListener("message", messageHandler);
      socket.addEventListener("close", closeHandler);
      socket.addEventListener("error", errorHandler);
    } else {
      socket.onmessage = messageHandler;
      socket.onclose = closeHandler;
      socket.onerror = errorHandler;
    }
  }

  private async sendCommand(
    market: JvQuantMarket,
    command: "add" | "del",
    codes: string[],
  ): Promise<void> {
    const socket = this.sockets.get(market);
    if (!this.isSocketOpen(socket)) {
      throw new Error(`JvQuant WebSocket 未连接: market=${market}`);
    }

    const payload = `${command}=${codes.map((code) => `lv1_${code}`).join(",")}`;
    socket.send(payload);

    this.logger.debug("JvQuant 发送订阅命令", {
      market,
      command,
      codesCount: codes.length,
      preview: codes.slice(0, 5),
    });
  }

  private async handleSocketMessage(
    market: JvQuantMarket,
    payload: unknown,
  ): Promise<void> {
    const text = await this.decodePayloadToText(payload);
    if (!text) {
      return;
    }

    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return;
    }

    for (const line of lines) {
      if (!line.startsWith("lv1_")) {
        // 文本命令响应（如list/his）或其他级别行情，当前仅处理个股 lv1
        continue;
      }

      const quote = this.parseLv1QuoteLine(market, line);
      if (!quote) {
        continue;
      }

      for (const callback of this.messageCallbacks) {
        try {
          callback(quote);
        } catch {
          // 避免单个回调异常影响后续处理
        }
      }
    }
  }

  private async decodePayloadToText(payload: unknown): Promise<string> {
    if (typeof payload === "string") {
      return payload;
    }

    if (Buffer.isBuffer(payload)) {
      return this.decodeBufferPayload(payload);
    }

    if (payload instanceof ArrayBuffer) {
      return this.decodeBufferPayload(Buffer.from(payload));
    }

    if (ArrayBuffer.isView(payload)) {
      return this.decodeBufferPayload(
        Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength),
      );
    }

    if (payload && typeof (payload as any).arrayBuffer === "function") {
      const buffer = Buffer.from(await (payload as any).arrayBuffer());
      return this.decodeBufferPayload(buffer);
    }

    return "";
  }

  private decodeBufferPayload(buffer: Buffer): string {
    try {
      return inflateRawSync(buffer).toString("utf8");
    } catch {
      return buffer.toString("utf8");
    }
  }

  private parseLv1QuoteLine(market: JvQuantMarket, line: string): any | null {
    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 0) {
      return null;
    }

    const topic = line.slice(0, separatorIndex).trim();
    const payload = line.slice(separatorIndex + 1).trim();
    if (!topic.startsWith("lv1_")) {
      return null;
    }

    const rawCode = topic.slice(4).trim();
    const fields = payload.split(",");

    const providerCode = this.normalizeProviderCode(market, rawCode);
    const standardSymbol = this.resolveStandardSymbol(market, providerCode);

    let lastPrice: number | null = null;
    let volume: number | null = null;
    let turnover: number | null = null;
    let timestamp = new Date().toISOString();

    if (market === "us") {
      lastPrice = this.toNumber(fields[1]);
      turnover = this.toNumber(fields[3]);
      volume = this.toNumber(fields[4]);
      timestamp = this.normalizeTimestamp(fields[5]);
    } else if (market === "hk") {
      const hasBilingualName =
        fields.length >= 7 &&
        !this.isNumericLike(fields[1]) &&
        !this.isNumericLike(fields[2]);

      const priceIndex = hasBilingualName ? 3 : 2;
      const turnoverIndex = hasBilingualName ? 5 : 4;
      const volumeIndex = hasBilingualName ? 6 : 5;

      lastPrice = this.toNumber(fields[priceIndex]);
      turnover = this.toNumber(fields[turnoverIndex]);
      volume = this.toNumber(fields[volumeIndex]);
      timestamp = this.normalizeTimestamp(fields[0]);
    } else {
      lastPrice = this.toNumber(fields[2]);
      turnover = this.toNumber(fields[4]);
      volume = this.toNumber(fields[5]);
      timestamp = this.normalizeTimestamp(fields[0]);
    }

    if (lastPrice == null) {
      return null;
    }

    return {
      symbol: standardSymbol,
      lastPrice,
      previousClose: null,
      openPrice: null,
      highPrice: null,
      lowPrice: null,
      volume,
      turnover,
      timestamp,
      tradeStatus: "Normal",
      sourceProvider: "jvquant",
      sourceMarket: market,
      sourceSymbol: providerCode,
    };
  }

  private parseSymbol(symbol: string): ParsedSubscriptionSymbol | null {
    if (!symbol || typeof symbol !== "string") {
      return null;
    }

    const trimmed = symbol.trim();
    if (!trimmed) {
      return null;
    }

    const upper = trimmed.toUpperCase();

    if (upper.includes(".")) {
      const lastDotIndex = upper.lastIndexOf(".");
      const rawCode = upper.slice(0, lastDotIndex);
      const suffix = upper.slice(lastDotIndex + 1);

      if (suffix === "HK") {
        const code = this.normalizeProviderCode("hk", rawCode);
        return {
          market: "hk",
          providerCode: code,
          standardSymbol: `${code}.HK`,
        };
      }

      if (suffix === "US") {
        const code = this.normalizeProviderCode("us", rawCode);
        return {
          market: "us",
          providerCode: code,
          standardSymbol: `${rawCode.toUpperCase()}.US`,
        };
      }

      if (suffix === "SH" || suffix === "SZ") {
        const code = this.normalizeProviderCode("ab", rawCode);
        return {
          market: "ab",
          providerCode: code,
          standardSymbol: `${code}.${suffix}`,
        };
      }
    }

    if (/^\d{5}$/.test(upper)) {
      return {
        market: "hk",
        providerCode: this.normalizeProviderCode("hk", upper),
        standardSymbol: `${this.normalizeProviderCode("hk", upper)}.HK`,
      };
    }

    if (/^\d{6}$/.test(upper)) {
      const suffix = this.inferChinaSuffix(upper);
      return {
        market: "ab",
        providerCode: upper,
        standardSymbol: `${upper}.${suffix}`,
      };
    }

    return {
      market: "us",
      providerCode: this.normalizeProviderCode("us", upper),
      standardSymbol: `${upper}.US`,
    };
  }

  private normalizeProviderCode(market: JvQuantMarket, code: string): string {
    const normalized = (code || "").replace(/^lv1_/i, "").trim();

    if (market === "hk") {
      const digits = normalized.replace(/\D/g, "");
      return digits.padStart(5, "0");
    }

    if (market === "ab") {
      return normalized.replace(/\D/g, "").slice(0, 6);
    }

    return normalized.toLowerCase();
  }

  private resolveStandardSymbol(market: JvQuantMarket, providerCode: string): string {
    const mapped = this.standardSymbolMap.get(
      this.getMarketCodeKey(market, providerCode),
    );
    if (mapped) {
      return mapped;
    }

    if (market === "hk") {
      return `${providerCode}.HK`;
    }

    if (market === "us") {
      return `${providerCode.toUpperCase()}.US`;
    }

    return `${providerCode}.${this.inferChinaSuffix(providerCode)}`;
  }

  private inferChinaSuffix(code: string): "SH" | "SZ" {
    return /^(6|688)/.test(code) ? "SH" : "SZ";
  }

  private getMarketCodeKey(market: JvQuantMarket, providerCode: string): string {
    return `${market}:${providerCode.toUpperCase()}`;
  }

  private isSocketOpen(socket: any): boolean {
    return !!socket && socket.readyState === 1;
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalized = String(value).replace(/%/g, "").trim();
    if (!normalized) {
      return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private isNumericLike(value: unknown): boolean {
    return this.toNumber(value) !== null;
  }

  private normalizeTimestamp(raw: unknown): string {
    if (raw === null || raw === undefined) {
      return new Date().toISOString();
    }

    const text = String(raw).trim();
    if (!text) {
      return new Date().toISOString();
    }

    if (/^\d{13}$/.test(text)) {
      return new Date(Number(text)).toISOString();
    }

    if (/^\d{10}$/.test(text)) {
      return new Date(Number(text) * 1000).toISOString();
    }

    if (/^\d{6}$/.test(text)) {
      const now = new Date();
      const hh = Number(text.slice(0, 2));
      const mm = Number(text.slice(2, 4));
      const ss = Number(text.slice(4, 6));
      const composed = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hh,
        mm,
        ss,
      );
      return composed.toISOString();
    }

    const parsedTime = Date.parse(text);
    if (!Number.isNaN(parsedTime)) {
      return new Date(parsedTime).toISOString();
    }

    return new Date().toISOString();
  }
}

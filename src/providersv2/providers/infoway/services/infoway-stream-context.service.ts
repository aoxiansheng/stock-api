import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

import { createLogger } from "@common/logging/index";
import {
  throwInfowayConfigurationError,
  throwInfowayDataValidationError,
} from "../helpers/capability-context.helper";
import { normalizeInfowayTimestampToIso } from "../utils/infoway-datetime.util";
import { sanitizeInfowayUpstreamMessage } from "../utils/infoway-error.util";
import {
  INFOWAY_SYMBOL_LIMIT,
  normalizeAndValidateInfowaySymbols,
} from "../utils/infoway-symbols.util";

@Injectable()
export class InfowayStreamContextService implements OnModuleDestroy {
  private readonly logger = createLogger(InfowayStreamContextService.name);

  private readonly wsBaseUrl: string;
  private readonly apiKey: string;
  private readonly business: string;
  private readonly connectTimeoutMs: number;
  private readonly heartbeatIntervalMs: number;
  private readonly reconnectDelayMs: number;
  private readonly reconnectMaxDelayMs: number;
  private readonly reconnectJitterMs: number;
  private readonly maxReconnectAttempts: number;
  private readonly klineType: number;
  private readonly wsAuthFrameCode: number;

  private socket: any | null = null;
  private connectTask: Promise<void> | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isShuttingDown = false;

  private readonly subscribedSymbols = new Set<string>();
  private subscriptionsInvalidated = false;
  private readonly messageCallbacks = new Set<(data: any) => void>();

  constructor(private readonly configService: ConfigService) {
    this.wsBaseUrl =
      this.configService.get<string>("INFOWAY_WS_BASE_URL") ||
      "wss://data.infoway.io/ws";
    this.apiKey =
      this.configService.get<string>("INFOWAY_API_KEY") ||
      process.env.INFOWAY_API_KEY ||
      "";
    this.business =
      this.configService.get<string>("INFOWAY_WS_BUSINESS") || "stock";
    this.connectTimeoutMs = this.readNumericConfig(
      "INFOWAY_WS_CONNECT_TIMEOUT_MS",
      10000,
      {
        min: 1,
        integer: true,
      },
    );
    this.heartbeatIntervalMs = this.readNumericConfig(
      "INFOWAY_WS_HEARTBEAT_MS",
      30000,
      {
        min: 1,
        integer: true,
      },
    );
    this.reconnectDelayMs = this.readNumericConfig(
      "INFOWAY_WS_RECONNECT_DELAY_MS",
      3000,
      {
        min: 0,
        integer: true,
      },
    );
    this.reconnectMaxDelayMs = this.readNumericConfig(
      "INFOWAY_WS_RECONNECT_MAX_DELAY_MS",
      30000,
      {
        min: 1,
        integer: true,
      },
    );
    this.reconnectJitterMs = this.readNumericConfig(
      "INFOWAY_WS_RECONNECT_JITTER_MS",
      500,
      {
        min: 0,
        integer: true,
      },
    );
    this.maxReconnectAttempts = this.readNumericConfig(
      "INFOWAY_WS_MAX_RECONNECT_ATTEMPTS",
      8,
      {
        min: 0,
        integer: true,
      },
    );
    this.klineType = this.readNumericConfig("INFOWAY_WS_KLINE_TYPE", 1, {
      min: 1,
      integer: true,
    });
    this.wsAuthFrameCode = this.readNumericConfig("INFOWAY_WS_AUTH_FRAME_CODE", 90001, {
      min: 1,
      integer: true,
    });
  }

  async initializeWebSocket(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    if (!this.apiKey) {
      throwInfowayConfigurationError(
        "INFOWAY_API_KEY 未配置",
        {
          configKey: "INFOWAY_API_KEY",
        },
        "initializeWebSocket",
      );
    }

    if (this.isWebSocketConnected()) {
      return;
    }

    if (this.connectTask) {
      await this.connectTask;
      return;
    }

    this.connectTask = this.openSocket();

    try {
      await this.connectTask;
    } finally {
      this.connectTask = null;
    }
  }

  async subscribe(symbols: string[]): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    const normalized = normalizeAndValidateInfowaySymbols(symbols, {
      allowEmpty: true,
      maxCount: INFOWAY_SYMBOL_LIMIT.WS,
    });

    if (normalized.length === 0) {
      return;
    }

    if (this.subscriptionsInvalidated) {
      this.logger.warn("Infoway WebSocket 订阅状态已失效，将按最新入参重建订阅", {
        requestedCount: normalized.length,
      });
    }

    const newSymbols = normalized.filter((symbol) => !this.subscribedSymbols.has(symbol));
    if (newSymbols.length === 0) {
      return;
    }

    const existing = this.subscribedSymbols.size;
    const total = existing + newSymbols.length;
    if (total > INFOWAY_SYMBOL_LIMIT.WS) {
      throwInfowayDataValidationError(
        `Infoway 参数错误: WebSocket 订阅总量超过上限（existing + new <= ${INFOWAY_SYMBOL_LIMIT.WS}）`,
        {
          existing,
          new: newSymbols.length,
          max: INFOWAY_SYMBOL_LIMIT.WS,
        },
        "subscribe",
      );
    }

    await this.initializeWebSocket();

    this.sendJson({
      code: 10006,
      trace: randomUUID().replace(/-/g, ""),
      data: {
        arr: [
          {
            type: this.klineType,
            codes: newSymbols.join(","),
          },
        ],
      },
    });

    newSymbols.forEach((symbol) => this.subscribedSymbols.add(symbol));
    this.subscriptionsInvalidated = false;

    this.logger.debug("Infoway WebSocket 订阅发送成功", {
      symbolsCount: newSymbols.length,
      preview: newSymbols.slice(0, 10),
      klineType: this.klineType,
    });
  }

  async unsubscribe(symbols: string[]): Promise<void> {
    const normalized = normalizeAndValidateInfowaySymbols(symbols, {
      allowEmpty: true,
      maxCount: INFOWAY_SYMBOL_LIMIT.WS,
    })
      .filter((symbol) => this.subscribedSymbols.has(symbol));

    if (normalized.length === 0) {
      return;
    }

    normalized.forEach((symbol) => this.subscribedSymbols.delete(symbol));

    if (!this.isWebSocketConnected()) {
      return;
    }

    this.sendJson({
      code: 11002,
      trace: randomUUID().replace(/-/g, ""),
      data: {
        codes: normalized.join(","),
        klineTypes: String(this.klineType),
      },
    });
  }

  onQuoteUpdate(callback: (data: any) => void): () => void {
    this.messageCallbacks.add(callback);
    return () => {
      this.messageCallbacks.delete(callback);
    };
  }

  isWebSocketConnected(): boolean {
    return !!this.socket && this.socket.readyState === 1;
  }

  async cleanup(): Promise<void> {
    if (this.isShuttingDown) {
      if (this.connectTask) {
        try {
          await this.connectTask;
        } catch {
          // ignore
        }
      }
      return;
    }

    this.isShuttingDown = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      if (this.socket && typeof this.socket.close === "function") {
        this.socket.close();
      }
    } catch {
      // ignore
    }

    this.socket = null;

    if (this.connectTask) {
      try {
        await this.connectTask;
      } catch {
        // ignore
      } finally {
        this.connectTask = null;
      }
    }

    this.subscribedSymbols.clear();
    this.subscriptionsInvalidated = false;
    this.messageCallbacks.clear();
    this.reconnectAttempts = 0;
    this.isShuttingDown = false;
  }

  async onModuleDestroy(): Promise<void> {
    await this.cleanup();
  }

  private async openSocket(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    const WebSocketCtor = (globalThis as any).WebSocket;
    if (!WebSocketCtor) {
      throwInfowayConfigurationError(
        "当前运行环境未提供全局 WebSocket 实现",
        {
          runtime: typeof globalThis,
          expected: "globalThis.WebSocket",
        },
        "openSocket",
      );
    }

    const url = this.buildWsUrl();

    await new Promise<void>((resolve, reject) => {
      const { socket, authMode } = this.createSocketWithAuth(WebSocketCtor, url);
      let settled = false;

      const timeout = setTimeout(() => {
        if (settled) return;
        if (this.isShuttingDown) {
          settled = true;
          resolve();
          return;
        }
        settled = true;
        try {
          socket.close();
        } catch {
          // ignore
        }
        reject(new Error("Infoway WebSocket 连接超时"));
      }, this.connectTimeoutMs);
      timeout.unref?.();

      const handleOpen = () => {
        if (settled) return;
        clearTimeout(timeout);
        if (this.isShuttingDown) {
          settled = true;
          try {
            socket.close();
          } catch {
            // ignore
          }
          resolve();
          return;
        }
        this.socket = socket;
        this.attachSocketEvents(socket);
        this.startHeartbeat();

        try {
          if (authMode === "frame") {
            this.sendAuthFrame();
          }
        } catch {
          settled = true;
          this.socket = null;
          try {
            socket.close();
          } catch {
            // ignore
          }
          reject(new Error("Infoway WebSocket 认证失败"));
          return;
        }

        settled = true;
        this.logger.log("Infoway WebSocket 连接成功", {
          business: this.business,
          authMode,
        });
        resolve();
      };

      const handleError = (event: any) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (this.isShuttingDown) {
          resolve();
          return;
        }
        reject(
          new Error(
            `Infoway WebSocket 连接失败: ${event?.message || "unknown"}`,
          ),
        );
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

  private attachSocketEvents(socket: any): void {
    const onMessage = (event: any) => {
      const payload = event?.data;
      this.handleMessage(payload);
    };

    const onClose = () => {
      const hadConnection = this.socket === socket;
      if (hadConnection) {
        this.socket = null;
      }

      this.stopHeartbeat();
      this.logger.warn("Infoway WebSocket 已关闭");

      if (this.shouldScheduleReconnect(hadConnection)) {
        this.scheduleReconnect();
      }
    };

    const onError = (event: any) => {
      this.logger.warn("Infoway WebSocket 错误", {
        error: event?.message || "unknown",
      });
    };

    if (typeof socket.addEventListener === "function") {
      socket.addEventListener("message", onMessage);
      socket.addEventListener("close", onClose);
      socket.addEventListener("error", onError);
    } else {
      socket.onmessage = onMessage;
      socket.onclose = onClose;
      socket.onerror = onError;
    }
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== "string") {
      return;
    }

    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }

    if (!payload || typeof payload !== "object") {
      return;
    }

    if (payload.code === 10008 && payload.data) {
      const quote = this.mapPushToQuote(payload.data);
      if (!quote) {
        return;
      }

      for (const callback of this.messageCallbacks) {
        try {
          callback(quote);
        } catch {
          // ignore callback failure
        }
      }
      return;
    }

    if (payload.code === 10007 || payload.code === 11010) {
      return;
    }

    if (payload.code !== 10010) {
      this.logger.debug("Infoway WebSocket 收到控制消息", {
        code: payload.code,
        msg: sanitizeInfowayUpstreamMessage(payload.msg),
      });
    }
  }

  private mapPushToQuote(data: any): any | null {
    const symbol = String(data?.s || "").trim().toUpperCase();
    const lastPrice = this.toNumber(data?.c);

    if (!symbol || lastPrice == null) {
      return null;
    }

    const change = this.toNumber(data?.pca);
    const previousClose =
      change == null ? null : this.normalizeNumber(lastPrice - change);
    const timestamp = normalizeInfowayTimestampToIso(data?.t);
    if (!timestamp) {
      this.logger.warn("Infoway 推送时间戳解析失败，已丢弃脏数据", {
        symbol,
        rawTimestamp: data?.t,
      });
      return null;
    }

    return {
      symbol,
      lastPrice,
      previousClose,
      openPrice: this.toNumber(data?.o),
      highPrice: this.toNumber(data?.h),
      lowPrice: this.toNumber(data?.l),
      volume: this.toNumber(data?.v),
      turnover: this.toNumber(data?.vw),
      change,
      changePercent: this.toPercentNumber(data?.pfr),
      timestamp,
      tradeStatus: "Normal",
      sourceProvider: "infoway",
      sourceSymbol: symbol,
    };
  }

  private buildWsUrl(): string {
    const url = new URL(this.wsBaseUrl);
    url.searchParams.set("business", this.business);
    return url.toString();
  }

  private createSocketWithAuth(
    WebSocketCtor: any,
    url: string,
  ): { socket: any; authMode: "header" | "frame" } {
    try {
      const socket = this.createSocketWithHeaders(WebSocketCtor, url, {
        apiKey: this.apiKey,
      });
      return { socket, authMode: "header" };
    } catch (error: any) {
      this.logger.debug("Infoway WebSocket 当前环境不支持握手 header 鉴权，回退认证帧", {
        reason: sanitizeInfowayUpstreamMessage(error?.message),
      });
      const socket = new WebSocketCtor(url);
      return { socket, authMode: "frame" };
    }
  }

  private createSocketWithHeaders(
    WebSocketCtor: any,
    url: string,
    headers: Record<string, string>,
  ): any {
    try {
      return new WebSocketCtor(url, { headers });
    } catch {
      return new WebSocketCtor(url, [], { headers });
    }
  }

  private sendAuthFrame(): void {
    this.sendJson({
      code: this.wsAuthFrameCode,
      trace: randomUUID().replace(/-/g, ""),
      data: {
        apiKey: this.apiKey,
        business: this.business,
      },
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    const heartbeatTimer = setInterval(() => {
      if (!this.isWebSocketConnected()) {
        return;
      }

      try {
        this.sendJson({
          code: 10010,
          trace: randomUUID().replace(/-/g, ""),
        });
      } catch (error: any) {
        const socket = this.socket;
        const hadConnection = !!socket;
        const subscribedSymbolsCount = this.subscribedSymbols.size;
        const wasShuttingDown = this.isShuttingDown;
        this.stopHeartbeat();
        if (hadConnection) {
          this.socket = null;
          try {
            socket.close?.();
          } catch {
            // ignore close failure
          }
        }
        this.logger.warn("Infoway WebSocket 心跳发送失败，已停止心跳并准备重连", {
          reason: sanitizeInfowayUpstreamMessage(error?.message),
          hadConnection,
          subscribedSymbolsCount,
          isShuttingDown: wasShuttingDown,
        });
        if (this.shouldScheduleReconnect(hadConnection)) {
          this.scheduleReconnect();
        }
      }
    }, this.heartbeatIntervalMs);
    heartbeatTimer.unref?.();
    this.heartbeatTimer = heartbeatTimer;
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private shouldScheduleReconnect(hadConnection: boolean): boolean {
    return !this.isShuttingDown && hadConnection && this.subscribedSymbols.size > 0;
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown) {
      return;
    }

    if (this.reconnectTimer) {
      return;
    }
    if (
      Number.isFinite(this.maxReconnectAttempts) &&
      this.maxReconnectAttempts > 0 &&
      this.reconnectAttempts >= this.maxReconnectAttempts
    ) {
      const droppedSubscriptions = this.subscribedSymbols.size;
      if (droppedSubscriptions > 0) {
        this.subscribedSymbols.clear();
        this.subscriptionsInvalidated = true;
      }
      this.logger.error("Infoway WebSocket 重连已达到最大次数，停止重试", {
        maxReconnectAttempts: this.maxReconnectAttempts,
        droppedSubscriptions,
      });
      return;
    }

    this.reconnectAttempts += 1;
    const currentAttempt = this.reconnectAttempts;
    const delayMs = this.computeReconnectDelayMs(currentAttempt);

    const reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (this.isShuttingDown) {
        return;
      }

      try {
        await this.initializeWebSocket();
        if (this.isShuttingDown) {
          return;
        }
        this.reconnectAttempts = 0;
        this.subscriptionsInvalidated = false;

        const symbols = Array.from(this.subscribedSymbols);
        if (symbols.length > 0) {
          this.sendJson({
            code: 10006,
            trace: randomUUID().replace(/-/g, ""),
            data: {
              arr: [
                {
                  type: this.klineType,
                  codes: symbols.join(","),
                },
              ],
            },
          });
        }
      } catch (error: any) {
        this.logger.warn("Infoway WebSocket 重连失败", {
          reason: error?.message,
          reconnectAttempt: currentAttempt,
          maxReconnectAttempts: this.maxReconnectAttempts,
        });
        this.scheduleReconnect();
      }
    }, delayMs);
    reconnectTimer.unref?.();
    this.reconnectTimer = reconnectTimer;
  }

  private computeReconnectDelayMs(attempt: number): number {
    const expDelay = this.reconnectDelayMs * Math.pow(2, Math.max(0, attempt - 1));
    const cappedDelay = Math.min(expDelay, this.reconnectMaxDelayMs);
    if (this.reconnectJitterMs <= 0) {
      return cappedDelay;
    }
    const jitter = Math.floor(Math.random() * (this.reconnectJitterMs * 2 + 1))
      - this.reconnectJitterMs;
    return Math.max(0, cappedDelay + jitter);
  }

  private sendJson(payload: Record<string, any>): void {
    if (!this.isWebSocketConnected()) {
      throw new Error("Infoway WebSocket 未连接");
    }
    this.socket.send(JSON.stringify(payload));
  }

  private readNumericConfig(
    key: string,
    defaultValue: number,
    options?: {
      min?: number;
      integer?: boolean;
    },
  ): number {
    const rawValue = this.configService.get<unknown>(key);
    if (rawValue === undefined || rawValue === null) {
      return defaultValue;
    }
    if (typeof rawValue === "string" && rawValue.trim() === "") {
      return defaultValue;
    }

    const parsed = Number(rawValue);
    const min = options?.min ?? Number.NEGATIVE_INFINITY;
    const requireInteger = options?.integer ?? false;
    const isValid =
      Number.isFinite(parsed) &&
      parsed >= min &&
      (!requireInteger || Number.isInteger(parsed));

    if (isValid) {
      return parsed;
    }

    this.logger.warn("Infoway WebSocket 配置值非法，已回退默认值", {
      key,
      value: String(rawValue),
      defaultValue,
      min,
      requireInteger,
    });
    return defaultValue;
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    const text = String(value).trim().replace(/,/g, "");
    if (!text) {
      return null;
    }
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toPercentNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    const text = String(value).trim().replace(/%/g, "");
    if (!text) {
      return null;
    }
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private normalizeNumber(value: number): number {
    return Number(value.toFixed(6));
  }
}

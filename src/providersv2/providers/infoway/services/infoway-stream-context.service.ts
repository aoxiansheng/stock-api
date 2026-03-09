import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

import { createLogger } from "@common/logging/index";
import {
  throwInfowayConfigurationError,
  throwInfowayDataValidationError,
} from "../helpers/capability-context.helper";
import { sanitizeInfowayUpstreamMessage } from "../utils/infoway-error.util";
import {
  INFOWAY_SYMBOL_LIMIT,
  normalizeAndValidateInfowaySymbols,
} from "../utils/infoway-symbols.util";

type InfowayWsAuthMode = "auto" | "query" | "header" | "frame";
type InfowayResolvedWsAuthMode = Exclude<InfowayWsAuthMode, "auto">;

@Injectable()
export class InfowayStreamContextService implements OnModuleDestroy {
  private readonly logger = createLogger(InfowayStreamContextService.name);

  private readonly wsBaseUrl: string;
  private readonly apiKey: string;
  private readonly business: string;
  private readonly connectTimeoutMs: number;
  private readonly wsAuthMode: InfowayWsAuthMode;
  private readonly wsUseQueryApiKey: boolean;
  private readonly heartbeatIntervalMs: number;
  private readonly reconnectDelayMs: number;
  private readonly reconnectMaxDelayMs: number;
  private readonly reconnectJitterMs: number;
  private readonly maxReconnectAttempts: number;
  private readonly wsAuthFrameCode: number;

  private socket: any | null = null;
  private connectTask: Promise<void> | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private isShuttingDown = false;
  private readonly wsConnectMetrics = {
    ws_connect_attempt_total: 0,
    ws_connect_success_total: 0,
    ws_connect_timeout_total: 0,
  };

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
      30000,
      {
        min: 1,
        integer: true,
      },
    );
    this.wsAuthMode = this.readAuthModeConfig("INFOWAY_WS_AUTH_MODE", "auto");
    this.wsUseQueryApiKey = this.readBooleanConfig(
      "INFOWAY_WS_USE_QUERY_APIKEY",
      true,
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
      code: 10000,
      trace: randomUUID().replace(/-/g, ""),
      data: {
        codes: newSymbols.join(","),
      },
    });

    newSymbols.forEach((symbol) => this.subscribedSymbols.add(symbol));
    this.subscriptionsInvalidated = false;

    this.logger.debug("Infoway WebSocket 订阅发送成功", {
      symbolsCount: newSymbols.length,
      preview: newSymbols.slice(0, 10),
      protocolCode: 10000,
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
      code: 11000,
      trace: randomUUID().replace(/-/g, ""),
      data: {
        codes: normalized.join(","),
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

    const authModeCandidates = this.resolveAuthModeCandidates();
    let lastError: Error | null = null;

    for (let index = 0; index < authModeCandidates.length; index += 1) {
      const candidate = authModeCandidates[index];
      const connectStartedAt = Date.now();
      this.wsConnectMetrics.ws_connect_attempt_total += 1;

      let socketBundle:
        | {
            socket: any;
            authMode: InfowayResolvedWsAuthMode;
            wsUrlMasked: string;
          }
        | undefined;
      try {
        socketBundle = this.createSocketWithAuth(WebSocketCtor, candidate);
      } catch (error: any) {
        const reason = sanitizeInfowayUpstreamMessage(error?.message);
        this.logger.warn("Infoway WebSocket 鉴权模式建连初始化失败，尝试下一模式", {
          authModeConfigured: this.wsAuthMode,
          authModeResolved: candidate,
          errorMessage: reason || "unknown",
          candidateIndex: index + 1,
          candidateTotal: authModeCandidates.length,
        });
        lastError = error instanceof Error ? error : new Error(String(error));
        continue;
      }

      const { socket, authMode, wsUrlMasked } = socketBundle;
      this.logger.log("Infoway WebSocket 开始建连", {
        provider: "infoway",
        capability: "stream-stock-quote",
        business: this.business,
        authModeConfigured: this.wsAuthMode,
        authModeResolved: authMode,
        connectTimeoutMs: this.connectTimeoutMs,
        wsUrlMasked,
        candidateIndex: index + 1,
        candidateTotal: authModeCandidates.length,
        metrics: { ...this.wsConnectMetrics },
      });

      try {
        await this.waitSocketOpen({
          socket,
          authMode,
          connectStartedAt,
        });
        this.wsConnectMetrics.ws_connect_success_total += 1;
        this.logger.log("Infoway WebSocket 连接成功", {
          business: this.business,
          authModeConfigured: this.wsAuthMode,
          authModeResolved: authMode,
          wsUrlMasked,
          durationMs: Date.now() - connectStartedAt,
          candidateIndex: index + 1,
          candidateTotal: authModeCandidates.length,
          metrics: { ...this.wsConnectMetrics },
        });
        return;
      } catch (error: any) {
        const reason = sanitizeInfowayUpstreamMessage(error?.message);
        const isTimeout =
          error?.code === "INFOWAY_WS_CONNECT_TIMEOUT" ||
          reason.includes("连接超时");
        if (isTimeout) {
          this.wsConnectMetrics.ws_connect_timeout_total += 1;
        }
        this.logger.error("Infoway WebSocket 建连失败", {
          provider: "infoway",
          capability: "stream-stock-quote",
          business: this.business,
          authModeConfigured: this.wsAuthMode,
          authModeResolved: authMode,
          wsUrlMasked,
          errorType: isTimeout ? "timeout" : "connect_error",
          errorMessage: reason || "unknown",
          durationMs: Date.now() - connectStartedAt,
          retryAttempt: this.reconnectAttempts,
          candidateIndex: index + 1,
          candidateTotal: authModeCandidates.length,
          metrics: { ...this.wsConnectMetrics },
        });
        lastError = error instanceof Error ? error : new Error(String(error));
        try {
          socket.close?.();
        } catch {
          // ignore
        }
      }
    }

    throw lastError || new Error("Infoway WebSocket 连接失败");
  }

  private waitSocketOpen(params: {
    socket: any;
    authMode: InfowayResolvedWsAuthMode;
    connectStartedAt: number;
  }): Promise<void> {
    const { socket, authMode, connectStartedAt } = params;
    return new Promise<void>((resolve, reject) => {
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
        const timeoutError = new Error("Infoway WebSocket 连接超时") as Error & {
          code?: string;
        };
        timeoutError.code = "INFOWAY_WS_CONNECT_TIMEOUT";
        reject(timeoutError);
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

        this.logger.debug("Infoway WebSocket 已打开", {
          authModeResolved: authMode,
          handshakeDurationMs: Date.now() - connectStartedAt,
        });

        try {
          // 始终发送认证帧，避免握手 header/query 在部分运行时被静默忽略时发生鉴权漂移。
          this.sendAuthFrame();
          this.logger.debug("Infoway WebSocket 认证帧发送成功", {
            authFrameCode: this.wsAuthFrameCode,
            authModeResolved: authMode,
          });
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
          new Error(`Infoway WebSocket 连接失败: ${event?.message || "unknown"}`),
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

    if (payload.code === 10002) {
      if (!payload.data || typeof payload.data !== "object") {
        return;
      }
      for (const callback of this.messageCallbacks) {
        try {
          callback(payload.data);
        } catch {
          // ignore callback failure
        }
      }
      return;
    }

    if (payload.code === 10001 || payload.code === 11010) {
      return;
    }

    if (payload.code !== 10010) {
      this.logger.debug("Infoway WebSocket 收到控制消息", {
        code: payload.code,
        msg: sanitizeInfowayUpstreamMessage(payload.msg),
      });
    }
  }

  private buildWsUrl(authMode: InfowayResolvedWsAuthMode): string {
    const url = new URL(this.wsBaseUrl);
    url.searchParams.set("business", this.business);
    if (authMode === "query") {
      url.searchParams.set("apikey", this.apiKey);
    }
    return url.toString();
  }

  private createSocketWithAuth(
    WebSocketCtor: any,
    authMode: InfowayResolvedWsAuthMode,
  ): {
    socket: any;
    authMode: InfowayResolvedWsAuthMode;
    wsUrlMasked: string;
  } {
    const url = this.buildWsUrl(authMode);
    const wsUrlMasked = this.maskWsUrl(url);

    if (authMode === "query") {
      return {
        socket: new WebSocketCtor(url),
        authMode: "query",
        wsUrlMasked,
      };
    }

    if (authMode === "frame") {
      return {
        socket: new WebSocketCtor(url),
        authMode: "frame",
        wsUrlMasked,
      };
    }
    const socket = this.createSocketWithHeaders(WebSocketCtor, url, {
      apiKey: this.apiKey,
    });
    return { socket, authMode: "header", wsUrlMasked };
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
            code: 10000,
            trace: randomUUID().replace(/-/g, ""),
            data: {
              codes: symbols.join(","),
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

  private readBooleanConfig(key: string, defaultValue: boolean): boolean {
    const rawValue = this.configService.get<unknown>(key);
    if (rawValue === undefined || rawValue === null) {
      return defaultValue;
    }
    if (typeof rawValue === "boolean") {
      return rawValue;
    }
    if (typeof rawValue === "number") {
      return rawValue !== 0;
    }
    const normalized = String(rawValue).trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
    this.logger.warn("Infoway WebSocket 布尔配置值非法，已回退默认值", {
      key,
      value: String(rawValue),
      defaultValue,
    });
    return defaultValue;
  }

  private readAuthModeConfig(
    key: string,
    defaultValue: InfowayWsAuthMode,
  ): InfowayWsAuthMode {
    const rawValue = this.configService.get<unknown>(key);
    if (rawValue === undefined || rawValue === null) {
      return defaultValue;
    }
    const normalized = String(rawValue).trim().toLowerCase();
    if (
      normalized === "auto" ||
      normalized === "query" ||
      normalized === "header" ||
      normalized === "frame"
    ) {
      return normalized;
    }
    this.logger.warn("Infoway WebSocket 鉴权模式配置非法，已回退默认值", {
      key,
      value: String(rawValue),
      defaultValue,
    });
    return defaultValue;
  }

  private resolveAuthModeCandidates(): InfowayResolvedWsAuthMode[] {
    if (this.wsAuthMode === "query") {
      return ["query"];
    }
    if (this.wsAuthMode === "header") {
      return ["header"];
    }
    if (this.wsAuthMode === "frame") {
      return ["frame"];
    }
    if (this.wsUseQueryApiKey) {
      return ["query", "header", "frame"];
    }
    return ["header", "frame"];
  }

  private maskWsUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.searchParams.has("apikey")) {
        const key = parsed.searchParams.get("apikey") || "";
        const masked = key.length > 6 ? `${key.slice(0, 3)}***${key.slice(-3)}` : "***";
        parsed.searchParams.set("apikey", masked);
      }
      return parsed.toString();
    } catch {
      return sanitizeInfowayUpstreamMessage(url);
    }
  }

}

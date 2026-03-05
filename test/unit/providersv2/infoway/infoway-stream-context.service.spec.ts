import { ConfigService } from "@nestjs/config";

import { InfowayStreamContextService } from "@providersv2/providers/infoway/services/infoway-stream-context.service";

type Listener = (event?: any) => void;

class HeaderCapableMockWebSocket {
  static instances: HeaderCapableMockWebSocket[] = [];

  readonly url: string;
  readonly headers: Record<string, string>;
  readonly sent: string[] = [];
  readyState = 0;

  private listeners = new Map<string, Listener[]>();

  constructor(url: string, protocolsOrOptions?: any, maybeOptions?: any) {
    this.url = url;
    this.headers =
      protocolsOrOptions?.headers ||
      maybeOptions?.headers ||
      {};
    HeaderCapableMockWebSocket.instances.push(this);

    setTimeout(() => {
      this.readyState = 1;
      this.emit("open", {});
    }, 0);
  }

  addEventListener(type: string, listener: Listener): void {
    const current = this.listeners.get(type) || [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  send(payload: string): void {
    this.sent.push(payload);
  }

  close(): void {
    this.readyState = 3;
    this.emit("close", {});
  }

  private emit(type: string, event: any): void {
    const current = this.listeners.get(type) || [];
    for (const listener of current) {
      listener(event);
    }
  }
}

class FrameFallbackMockWebSocket extends HeaderCapableMockWebSocket {
  constructor(url: string, protocolsOrOptions?: any, maybeOptions?: any) {
    if (arguments.length > 1) {
      throw new Error("headers not supported");
    }
    super(url, protocolsOrOptions, maybeOptions);
  }
}

function createConfigService(values: Record<string, any>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as any;
}

describe("InfowayStreamContextService", () => {
  const originalWebSocket = (globalThis as any).WebSocket;

  afterEach(async () => {
    (globalThis as any).WebSocket = originalWebSocket;
    HeaderCapableMockWebSocket.instances = [];
  });

  it("握手 URL 不带 apikey，且优先使用 header 鉴权", async () => {
    (globalThis as any).WebSocket = HeaderCapableMockWebSocket as any;

    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
        INFOWAY_WS_BASE_URL: "wss://data.infoway.io/ws",
        INFOWAY_WS_BUSINESS: "stock",
      }),
    );

    await service.initializeWebSocket();

    const instance = HeaderCapableMockWebSocket.instances[0];
    expect(instance.url).toContain("business=stock");
    expect(instance.url).not.toContain("apikey=");
    expect(instance.headers.apiKey).toBe("test-api-key");
    expect(instance.sent).toHaveLength(0);

    await service.cleanup();
  });

  it("不支持 header 时连接后发送 auth 帧", async () => {
    (globalThis as any).WebSocket = FrameFallbackMockWebSocket as any;

    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
        INFOWAY_WS_BASE_URL: "wss://data.infoway.io/ws",
        INFOWAY_WS_BUSINESS: "stock",
        INFOWAY_WS_AUTH_FRAME_CODE: 90001,
      }),
    );

    await service.initializeWebSocket();

    const instance = HeaderCapableMockWebSocket.instances[0];
    expect(instance.url).not.toContain("apikey=");
    expect(instance.sent).toHaveLength(1);

    const authPayload = JSON.parse(instance.sent[0]);
    expect(authPayload.code).toBe(90001);
    expect(authPayload.data.apiKey).toBe("test-api-key");
    expect(authPayload.data.business).toBe("stock");

    await service.cleanup();
  });

  it("离线 unsubscribe 也会先更新本地订阅集合", async () => {
    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );

    (service as any).subscribedSymbols.add("AAPL.US");

    await service.unsubscribe(["AAPL.US"]);

    expect((service as any).subscribedSymbols.has("AAPL.US")).toBe(false);
  });

  it("mapPushToQuote 遇到异常时间戳时返回 null", () => {
    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );

    const quote = (service as any).mapPushToQuote({
      s: "AAPL.US",
      c: "182.31",
      t: "2024-03-01T09:30:00Z",
    });

    expect(quote).toBeNull();
  });

  it("mapPushToQuote 缺少关键字段时返回 null", () => {
    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );

    const missingSymbol = (service as any).mapPushToQuote({
      c: "182.31",
      t: "1709251200",
    });
    const missingPrice = (service as any).mapPushToQuote({
      s: "AAPL.US",
      t: "1709251200",
    });

    expect(missingSymbol).toBeNull();
    expect(missingPrice).toBeNull();
  });

  it("关键数值配置非法时回退默认值", () => {
    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
        INFOWAY_WS_CONNECT_TIMEOUT_MS: "bad",
        INFOWAY_WS_HEARTBEAT_MS: 0,
        INFOWAY_WS_RECONNECT_DELAY_MS: -1,
        INFOWAY_WS_RECONNECT_MAX_DELAY_MS: "NaN",
        INFOWAY_WS_RECONNECT_JITTER_MS: -10,
        INFOWAY_WS_MAX_RECONNECT_ATTEMPTS: -2,
        INFOWAY_WS_KLINE_TYPE: 0,
        INFOWAY_WS_AUTH_FRAME_CODE: 0,
      }),
    );

    expect((service as any).connectTimeoutMs).toBe(10000);
    expect((service as any).heartbeatIntervalMs).toBe(30000);
    expect((service as any).reconnectDelayMs).toBe(3000);
    expect((service as any).reconnectMaxDelayMs).toBe(30000);
    expect((service as any).reconnectJitterMs).toBe(500);
    expect((service as any).maxReconnectAttempts).toBe(8);
    expect((service as any).klineType).toBe(1);
    expect((service as any).wsAuthFrameCode).toBe(90001);
  });
});

import { ConfigService } from "@nestjs/config";

import { BusinessErrorCode } from "@common/core/exceptions";
import { InfowayStreamContextService } from "@providersv2/providers/infoway/services/infoway-stream-context.service";
import { INFOWAY_SYMBOL_LIMIT } from "@providersv2/providers/infoway/utils/infoway-symbols.util";

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

class HeaderIgnoredMockWebSocket extends HeaderCapableMockWebSocket {
  constructor(url: string, _protocolsOrOptions?: any, _maybeOptions?: any) {
    super(url);
  }
}

function createConfigService(values: Record<string, any>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as any;
}

describe("InfowayStreamContextService", () => {
  const originalWebSocket = (globalThis as any).WebSocket;

  async function flushTimers(stepMs = 1, rounds = 4): Promise<void> {
    for (let i = 0; i < rounds; i += 1) {
      await jest.advanceTimersByTimeAsync(stepMs);
      await Promise.resolve();
    }
  }

  afterEach(async () => {
    (globalThis as any).WebSocket = originalWebSocket;
    HeaderCapableMockWebSocket.instances = [];
    jest.useRealTimers();
    jest.restoreAllMocks();
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
    expect(instance.sent).toHaveLength(1);
    const authPayload = JSON.parse(instance.sent[0]);
    expect(authPayload.code).toBe(90001);
    expect(authPayload.data.apiKey).toBe("test-api-key");
    expect(authPayload.data.business).toBe("stock");

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

  it("握手 header 被运行时忽略时仍发送 auth 帧", async () => {
    (globalThis as any).WebSocket = HeaderIgnoredMockWebSocket as any;

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
    expect(instance.headers.apiKey).toBeUndefined();
    expect(instance.sent).toHaveLength(1);
    const authPayload = JSON.parse(instance.sent[0]);
    expect(authPayload.code).toBe(90001);
    expect(authPayload.data.apiKey).toBe("test-api-key");

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

  it("在线 unsubscribe 会发送实时成交取消订阅协议", async () => {
    (globalThis as any).WebSocket = HeaderCapableMockWebSocket as any;

    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );

    await service.initializeWebSocket();
    await service.subscribe(["AAPL.US"]);
    await service.unsubscribe(["AAPL.US"]);

    const instance = HeaderCapableMockWebSocket.instances[0];
    expect(instance.sent).toHaveLength(3);
    const unsubscribePayload = JSON.parse(instance.sent[2]);
    expect(unsubscribePayload.code).toBe(11000);
    expect(unsubscribePayload.data.codes).toBe("AAPL.US");

    await service.cleanup();
  });

  it("subscribe 会先校验 symbols，再尝试初始化 WebSocket", async () => {
    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );
    const initializeSpy = jest
      .spyOn(service, "initializeWebSocket")
      .mockResolvedValue();

    await expect(service.subscribe(["INVALID"])).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
    });
    expect(initializeSpy).not.toHaveBeenCalled();
  });

  it("累计订阅总量超过上限时抛业务异常并包含 existing/new/max", async () => {
    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );
    const initializeSpy = jest
      .spyOn(service, "initializeWebSocket")
      .mockResolvedValue();

    for (let i = 0; i < INFOWAY_SYMBOL_LIMIT.WS - 1; i += 1) {
      (service as any).subscribedSymbols.add(`${i}.US`);
    }

    await expect(service.subscribe(["AAPL.US", "MSFT.US"])).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      context: {
        provider: "infoway",
        existing: INFOWAY_SYMBOL_LIMIT.WS - 1,
        new: 2,
        max: INFOWAY_SYMBOL_LIMIT.WS,
      },
    });
    expect(initializeSpy).not.toHaveBeenCalled();
  });

  it("连接 close 后会触发重连调度", async () => {
    (globalThis as any).WebSocket = HeaderCapableMockWebSocket as any;

    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );

    await service.initializeWebSocket();
    await service.subscribe(["AAPL.US"]);

    const scheduleReconnectSpy = jest.spyOn(service as any, "scheduleReconnect");
    HeaderCapableMockWebSocket.instances[0].close();

    expect(scheduleReconnectSpy).toHaveBeenCalledTimes(1);

    (service as any).subscribedSymbols.clear();
    await service.cleanup();
  });

  it("cleanup 触发 close 时不会调度重连", async () => {
    (globalThis as any).WebSocket = HeaderCapableMockWebSocket as any;

    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );

    await service.initializeWebSocket();
    await service.subscribe(["AAPL.US"]);

    const scheduleReconnectSpy = jest.spyOn(service as any, "scheduleReconnect");
    await service.cleanup();

    expect(scheduleReconnectSpy).not.toHaveBeenCalled();
    expect(service.isWebSocketConnected()).toBe(false);
    expect((service as any).heartbeatTimer).toBeNull();
  });

  it("cleanup 会等待 pending connectTask 收敛且不会残留连接", async () => {
    jest.useFakeTimers();
    (globalThis as any).WebSocket = HeaderCapableMockWebSocket as any;

    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );

    const connectPromise = service.initializeWebSocket();
    const cleanupPromise = service.cleanup();

    await flushTimers(1, 6);
    await Promise.all([connectPromise, cleanupPromise]);

    expect(service.isWebSocketConnected()).toBe(false);
    expect((service as any).connectTask).toBeNull();
    expect((service as any).heartbeatTimer).toBeNull();
    expect((service as any).reconnectTimer).toBeNull();
  });

  it("重连成功后会自动重订阅已有 symbols", async () => {
    jest.useFakeTimers();
    (globalThis as any).WebSocket = HeaderCapableMockWebSocket as any;

    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
        INFOWAY_WS_RECONNECT_DELAY_MS: 1,
        INFOWAY_WS_RECONNECT_JITTER_MS: 0,
        INFOWAY_WS_MAX_RECONNECT_ATTEMPTS: 3,
      }),
    );

    const connectTask = service.initializeWebSocket();
    await jest.advanceTimersByTimeAsync(0);
    await connectTask;
    await service.subscribe(["AAPL.US", "MSFT.US"]);

    const firstSocket = HeaderCapableMockWebSocket.instances[0];
    expect(firstSocket.sent).toHaveLength(2);

    firstSocket.close();
    await flushTimers(1, 10);

    expect(HeaderCapableMockWebSocket.instances).toHaveLength(2);
    const reconnectedSocket = HeaderCapableMockWebSocket.instances[1];
    expect(reconnectedSocket.sent).toHaveLength(2);

    const subscribePayload = JSON.parse(reconnectedSocket.sent[1]);
    expect(subscribePayload.code).toBe(10000);
    expect(subscribePayload.data.codes).toBe("AAPL.US,MSFT.US");

    await service.unsubscribe(["AAPL.US", "MSFT.US"]);
    await service.cleanup();
  });

  it("达到最大重试次数后停止重连", async () => {
    jest.useFakeTimers();

    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
        INFOWAY_WS_RECONNECT_DELAY_MS: 1,
        INFOWAY_WS_RECONNECT_JITTER_MS: 0,
        INFOWAY_WS_MAX_RECONNECT_ATTEMPTS: 2,
      }),
    );

    const initializeSpy = jest
      .spyOn(service, "initializeWebSocket")
      .mockRejectedValue(new Error("connect failed"));

    (service as any).subscribedSymbols.add("AAPL.US");
    (service as any).scheduleReconnect();
    await flushTimers(1, 8);

    expect(initializeSpy).toHaveBeenCalledTimes(2);
    expect((service as any).reconnectAttempts).toBe(2);
    expect((service as any).reconnectTimer).toBeNull();

    await service.cleanup();
  });

  it("达到最大重连后清理脏订阅，并允许同符号重新订阅", async () => {
    jest.useFakeTimers();

    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
        INFOWAY_WS_RECONNECT_DELAY_MS: 1,
        INFOWAY_WS_RECONNECT_JITTER_MS: 0,
        INFOWAY_WS_MAX_RECONNECT_ATTEMPTS: 2,
      }),
    );

    const initializeSpy = jest
      .spyOn(service, "initializeWebSocket")
      .mockRejectedValueOnce(new Error("connect failed"))
      .mockRejectedValueOnce(new Error("connect failed"))
      .mockResolvedValue();

    (service as any).subscribedSymbols.add("AAPL.US");
    (service as any).scheduleReconnect();
    await flushTimers(1, 8);

    expect((service as any).subscribedSymbols.size).toBe(0);
    expect((service as any).subscriptionsInvalidated).toBe(true);

    const send = jest.fn();
    (service as any).socket = {
      readyState: 1,
      send,
    };

    await service.subscribe(["AAPL.US"]);

    expect(initializeSpy).toHaveBeenCalledTimes(3);
    expect(send).toHaveBeenCalledTimes(1);
    expect((service as any).subscriptionsInvalidated).toBe(false);
  });

  it("handleMessage: code=10002 且 data 非对象时忽略", () => {
    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );
    const onQuote = jest.fn();
    (service as any).messageCallbacks.add(onQuote);

    (service as any).handleMessage(JSON.stringify({ code: 10002, data: "bad" }));
    expect(onQuote).not.toHaveBeenCalled();
  });

  it("handleMessage: code=10002 时应触发行情回调", () => {
    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );
    const onQuote = jest.fn();
    (service as any).messageCallbacks.add(onQuote);

    (service as any).handleMessage(
      JSON.stringify({
        code: 10002,
        data: {
          s: "AAPL.US",
          p: "182.31",
          t: "1709251200999",
          v: "123",
          vw: "1000",
        },
      }),
    );

    expect(onQuote).toHaveBeenCalledTimes(1);
    expect(onQuote.mock.calls[0][0]).toEqual({
      s: "AAPL.US",
      p: "182.31",
      t: "1709251200999",
      v: "123",
      vw: "1000",
    });
  });

  it("handleMessage: code=10001/11010 时应忽略控制帧", () => {
    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );
    const onQuote = jest.fn();
    const debugSpy = jest.spyOn((service as any).logger, "debug");
    (service as any).messageCallbacks.add(onQuote);

    (service as any).handleMessage(JSON.stringify({ code: 10001, msg: "sub ack" }));
    (service as any).handleMessage(JSON.stringify({ code: 11010, msg: "pong" }));

    expect(onQuote).not.toHaveBeenCalled();
    expect(debugSpy).not.toHaveBeenCalledWith(
      "Infoway WebSocket 收到控制消息",
      expect.any(Object),
    );
  });

  it("handleMessage: code=10002 时透传非完整 trade 字段", () => {
    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );
    const onQuote = jest.fn();
    (service as any).messageCallbacks.add(onQuote);

    (service as any).handleMessage(
      JSON.stringify({
        code: 10002,
        data: { p: "182.31" },
      }),
    );

    expect(onQuote).toHaveBeenCalledTimes(1);
    expect(onQuote).toHaveBeenCalledWith({ p: "182.31" });
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
        INFOWAY_WS_AUTH_FRAME_CODE: 0,
      }),
    );

    expect((service as any).connectTimeoutMs).toBe(10000);
    expect((service as any).heartbeatIntervalMs).toBe(30000);
    expect((service as any).reconnectDelayMs).toBe(3000);
    expect((service as any).reconnectMaxDelayMs).toBe(30000);
    expect((service as any).reconnectJitterMs).toBe(500);
    expect((service as any).maxReconnectAttempts).toBe(8);
    expect((service as any).wsAuthFrameCode).toBe(90001);
  });

  it("INFOWAY_API_KEY 缺失时抛 CONFIGURATION_ERROR", async () => {
    const previousApiKey = process.env.INFOWAY_API_KEY;
    delete process.env.INFOWAY_API_KEY;

    try {
      const service = new InfowayStreamContextService(createConfigService({}));
      await expect(service.initializeWebSocket()).rejects.toMatchObject({
        message: "INFOWAY_API_KEY 未配置",
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
      });
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.INFOWAY_API_KEY;
      } else {
        process.env.INFOWAY_API_KEY = previousApiKey;
      }
    }
  });

  it("心跳 sendJson 异常时停止心跳并在守卫下触发重连", async () => {
    jest.useFakeTimers();
    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
        INFOWAY_WS_HEARTBEAT_MS: 1,
      }),
    );

    const mockSocket = {
      readyState: 1,
      close: jest.fn(),
    };
    (service as any).socket = mockSocket;
    (service as any).subscribedSymbols.add("AAPL.US");

    jest
      .spyOn(service as any, "sendJson")
      .mockImplementation(() => {
        throw new Error("send failed");
      });
    const scheduleReconnectSpy = jest
      .spyOn(service as any, "scheduleReconnect")
      .mockImplementation(() => {});

    (service as any).startHeartbeat();
    await jest.advanceTimersByTimeAsync(1);

    expect((service as any).heartbeatTimer).toBeNull();
    expect((service as any).socket).toBeNull();
    expect(mockSocket.close).toHaveBeenCalledTimes(1);
    expect(scheduleReconnectSpy).toHaveBeenCalledTimes(1);
  });

  it("心跳 sendJson 异常但守卫不满足时不触发重连", async () => {
    jest.useFakeTimers();
    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
        INFOWAY_WS_HEARTBEAT_MS: 1,
      }),
    );

    (service as any).socket = {
      readyState: 1,
      close: jest.fn(),
    };
    const scheduleReconnectSpy = jest
      .spyOn(service as any, "scheduleReconnect")
      .mockImplementation(() => {});
    jest
      .spyOn(service as any, "sendJson")
      .mockImplementation(() => {
        throw new Error("send failed");
      });

    (service as any).startHeartbeat();
    await jest.advanceTimersByTimeAsync(1);

    expect(scheduleReconnectSpy).not.toHaveBeenCalled();
    expect((service as any).heartbeatTimer).toBeNull();
  });

  it("心跳定时器创建后调用 unref", () => {
    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );

    const unref = jest.fn();
    const timer = { unref } as any;
    const setIntervalSpy = jest.spyOn(global, "setInterval").mockReturnValue(timer);

    (service as any).startHeartbeat();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(unref).toHaveBeenCalledTimes(1);
    expect((service as any).heartbeatTimer).toBe(timer);
  });

  it("重连定时器创建后调用 unref", () => {
    const service = new InfowayStreamContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );

    const unref = jest.fn();
    const timer = { unref } as any;
    const setTimeoutSpy = jest.spyOn(global, "setTimeout").mockReturnValue(timer);

    (service as any).scheduleReconnect();

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(unref).toHaveBeenCalledTimes(1);
    expect((service as any).reconnectTimer).toBe(timer);
  });
});

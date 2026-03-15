jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  sanitizeLogData: (data: unknown) => data,
}));

jest.mock("uuid", () => ({
  v4: jest.fn(),
}));

import { createHmac } from "crypto";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { v4 as uuidv4 } from "uuid";

import { StreamDataFetcherService } from "@core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service";
import { StreamClientStateManager } from "@core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service";

type CtxServiceMock = {
  initializeWebSocket: jest.Mock<Promise<void>, []>;
  cleanup: jest.Mock<Promise<void>, []>;
  onQuoteUpdate: jest.Mock<() => void, [(data: any) => void]>;
  isWebSocketConnected: jest.Mock<boolean, []>;
  subscribe: jest.Mock<Promise<void>, [string[]]>;
  unsubscribe: jest.Mock<Promise<void>, [string[]]>;
};

describe("StreamDataFetcherService close/cleanup 解耦", () => {
  let service: StreamDataFetcherService;
  let ctxService: CtxServiceMock;
  let unsubscribeProxy: jest.Mock;
  let capabilityRegistry: { getProvider: jest.Mock };
  let clientStateManager: {
    getClientSubscription: jest.Mock;
    updateSubscriptionState: jest.Mock;
    removeConnection: jest.Mock;
  };
  let connectionPoolManager: {
    canCreateConnection: jest.Mock<boolean, [string, string?]>;
    registerConnection: jest.Mock<void, [string, string?]>;
    unregisterConnection: jest.Mock<void, [string, string?]>;
    getStats: jest.Mock<Record<string, unknown>, []>;
    getAlerts: jest.Mock<Array<unknown>, []>;
  };

  beforeEach(() => {
    let uuidSeq = 0;
    (uuidv4 as jest.Mock<string, []>).mockReset();
    (uuidv4 as jest.Mock<string, []>).mockImplementation(
      () => `uuid-${uuidSeq++}`,
    );

    jest
      .spyOn(
        StreamDataFetcherService.prototype as any,
        "loadConcurrencyConfigFromService",
      )
      .mockImplementation(() => undefined);
    jest
      .spyOn(
        StreamDataFetcherService.prototype as any,
        "startPeriodicMapCleanup",
      )
      .mockImplementation(() => undefined);
    jest
      .spyOn(
        StreamDataFetcherService.prototype as any,
        "startAdaptiveConcurrencyMonitoring",
      )
      .mockImplementation(() => undefined);

    unsubscribeProxy = jest.fn();
    ctxService = {
      initializeWebSocket: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
      onQuoteUpdate: jest.fn().mockReturnValue(unsubscribeProxy),
      isWebSocketConnected: jest.fn().mockReturnValue(true),
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
    };

    const provider = {
      getStreamContextService: jest.fn(() => ctxService),
    };

    capabilityRegistry = {
      getProvider: jest.fn(() => provider),
    };
    const streamCache = {
      deleteData: jest.fn().mockResolvedValue(undefined),
      setData: jest.fn().mockResolvedValue(undefined),
    };
    clientStateManager = {
      getClientSubscription: jest.fn().mockReturnValue(undefined),
      updateSubscriptionState: jest.fn(),
      removeConnection: jest.fn(),
    };
    connectionPoolManager = {
      canCreateConnection: jest.fn().mockReturnValue(true),
      registerConnection: jest.fn(),
      unregisterConnection: jest.fn(),
      getStats: jest.fn(() => ({})),
      getAlerts: jest.fn(() => []),
    };
    const configService = {
      get: jest.fn(() => undefined),
    };
    const streamConfigService = {
      getPerformanceConfig: jest.fn(() => ({})),
    };

    service = new StreamDataFetcherService(
      capabilityRegistry as any,
      streamCache as any,
      connectionPoolManager as any,
      new EventEmitter2(),
      configService as any,
      streamConfigService as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function createConnection(requestId: string, clientIP?: string) {
    return service.establishStreamConnection({
      provider: "mock-provider",
      capability: "stream-stock-quote",
      requestId,
      clientIP,
    });
  }

  it("同 provider/capability 的两条连接 registerConnection 使用同一 poolKey", async () => {
    await createConnection("req-1");
    await createConnection("req-2");

    expect(connectionPoolManager.registerConnection).toHaveBeenCalledTimes(2);
    expect(connectionPoolManager.registerConnection).toHaveBeenNthCalledWith(
      1,
      "mock-provider:stream-stock-quote",
      undefined,
    );
    expect(connectionPoolManager.registerConnection).toHaveBeenNthCalledWith(
      2,
      "mock-provider:stream-stock-quote",
      undefined,
    );
  });

  it("close 路径 unregisterConnection 使用 poolKey", async () => {
    const conn = await createConnection("req-1");

    await service.closeConnection(conn);

    expect(connectionPoolManager.unregisterConnection).toHaveBeenCalledWith(
      "mock-provider:stream-stock-quote",
      undefined,
    );
  });

  it("僵尸清理路径 unregisterConnection 使用 poolKey", async () => {
    const conn = await createConnection("req-1");
    conn.isConnected = false;
    conn.lastActiveAt = new Date(Date.now() - 31 * 60 * 1000);

    (service as any).performPeriodicMapCleanup();

    expect(connectionPoolManager.unregisterConnection).toHaveBeenCalledWith(
      "mock-provider:stream-stock-quote",
      undefined,
    );
  });

  it("canCreateConnection 调用顺序先于 initializeWebSocket", async () => {
    const callOrder: string[] = [];

    connectionPoolManager.canCreateConnection.mockImplementation(() => {
      callOrder.push("canCreateConnection");
      return true;
    });
    ctxService.initializeWebSocket.mockImplementation(async () => {
      callOrder.push("initializeWebSocket");
    });

    await createConnection("req-1");

    expect(callOrder).toEqual(["canCreateConnection", "initializeWebSocket"]);
  });

  it("超限拒绝路径不进入 initialize/register/active map", async () => {
    connectionPoolManager.canCreateConnection.mockImplementation(() => {
      throw new Error("pool-limit-exceeded");
    });

    await expect(createConnection("req-1")).rejects.toThrow(
      "pool-limit-exceeded",
    );
    expect(ctxService.initializeWebSocket).not.toHaveBeenCalled();
    expect(connectionPoolManager.registerConnection).not.toHaveBeenCalled();
    expect((service as any).activeConnections.size).toBe(0);
    expect((service as any).connectionIdToKey.size).toBe(0);
  });

  it("clientIP 透传分支：有 IP 时传入 canCreate/register", async () => {
    await createConnection("req-ip", "127.0.0.1");

    expect(connectionPoolManager.canCreateConnection).toHaveBeenCalledWith(
      "mock-provider:stream-stock-quote",
      "127.0.0.1",
    );
    expect(connectionPoolManager.registerConnection).toHaveBeenCalledWith(
      "mock-provider:stream-stock-quote",
      "127.0.0.1",
    );
  });

  it("clientIP 透传分支：无 IP 时传入 undefined", async () => {
    await createConnection("req-no-ip");

    expect(connectionPoolManager.canCreateConnection).toHaveBeenCalledWith(
      "mock-provider:stream-stock-quote",
      undefined,
    );
    expect(connectionPoolManager.registerConnection).toHaveBeenCalledWith(
      "mock-provider:stream-stock-quote",
      undefined,
    );
  });

  it("subscribeToSymbols 不再触碰客户端状态管理器", async () => {
    const conn = await createConnection("req-subscribe-no-client-state");
    const symbols = ["AAPL", "TSLA"];

    await expect(
      service.subscribeToSymbols(conn, symbols),
    ).resolves.toBeUndefined();

    expect(clientStateManager.getClientSubscription).not.toHaveBeenCalled();
    expect(clientStateManager.updateSubscriptionState).not.toHaveBeenCalled();
    expect(clientStateManager.removeConnection).not.toHaveBeenCalled();
  });

  it("unsubscribeFromSymbols 不再触碰客户端状态管理器", async () => {
    const conn = await createConnection("req-unsubscribe-no-client-state");
    const symbols = ["AAPL", "TSLA"];

    await expect(
      service.unsubscribeFromSymbols(conn, symbols),
    ).resolves.toBeUndefined();

    expect(clientStateManager.getClientSubscription).not.toHaveBeenCalled();
    expect(clientStateManager.updateSubscriptionState).not.toHaveBeenCalled();
    expect(clientStateManager.removeConnection).not.toHaveBeenCalled();
  });

  it("conn.close() 统一走 closeConnection 语义，并保持幂等", async () => {
    const conn = await createConnection("req-1");
    conn.onData(jest.fn());

    await expect(conn.close()).resolves.toBeUndefined();
    await expect(conn.close()).resolves.toBeUndefined();

    expect(conn.isConnected).toBe(false);
    expect(unsubscribeProxy).toHaveBeenCalledTimes(1);
    expect(ctxService.cleanup).toHaveBeenCalledTimes(1);
  });

  it("closeConnection 仅在 provider 无活跃连接时触发一次 cleanup", async () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1700000000000);

    const conn1 = await createConnection("req-1");
    const conn2 = await createConnection("req-2");

    try {
      expect(conn1.id).toMatch(
        /^mock-provider_stream-stock-quote_1700000000000_uuid-\d+$/,
      );
      expect(conn2.id).toMatch(
        /^mock-provider_stream-stock-quote_1700000000000_uuid-\d+$/,
      );
      expect(conn1.id).not.toBe(conn2.id);

      await service.closeConnection(conn1);
      expect(ctxService.cleanup).not.toHaveBeenCalled();

      await service.closeConnection(conn2);
      expect(ctxService.cleanup).toHaveBeenCalledTimes(1);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("closeConnection 存在订阅时会先执行退订并清空订阅集合", async () => {
    const conn = await createConnection("req-1");
    conn.subscribedSymbols.add("AAPL");
    conn.subscribedSymbols.add("TSLA");

    await expect(service.closeConnection(conn)).resolves.toBeUndefined();

    expect(ctxService.unsubscribe).toHaveBeenCalledTimes(1);
    expect(ctxService.unsubscribe).toHaveBeenCalledWith(["AAPL", "TSLA"]);
    expect(conn.subscribedSymbols.size).toBe(0);
  });

  it("closeConnection 退订失败时仅告警且不阻断关闭主流程", async () => {
    const conn = await createConnection("req-1");
    conn.subscribedSymbols.add("AAPL");
    ctxService.unsubscribe.mockRejectedValueOnce(
      new Error("unsubscribe-failed"),
    );

    await expect(service.closeConnection(conn)).resolves.toBeUndefined();

    expect(ctxService.unsubscribe).toHaveBeenCalledTimes(1);
    expect(conn.isConnected).toBe(false);
    expect(ctxService.cleanup).toHaveBeenCalledTimes(1);
  });

  it("closeConnection 无订阅时不调用退订", async () => {
    const conn = await createConnection("req-1");

    await expect(service.closeConnection(conn)).resolves.toBeUndefined();

    expect(ctxService.unsubscribe).not.toHaveBeenCalled();
  });

  it("closeConnection 不再触碰客户端状态管理器", async () => {
    const conn = await createConnection("req-close-no-client-state");

    await expect(service.closeConnection(conn)).resolves.toBeUndefined();

    expect(clientStateManager.getClientSubscription).not.toHaveBeenCalled();
    expect(clientStateManager.updateSubscriptionState).not.toHaveBeenCalled();
    expect(clientStateManager.removeConnection).not.toHaveBeenCalled();
  });

  it("重复 closeConnection 不会重复执行退订", async () => {
    const conn = await createConnection("req-1");
    conn.subscribedSymbols.add("AAPL");

    await expect(service.closeConnection(conn)).resolves.toBeUndefined();
    await expect(service.closeConnection(conn)).resolves.toBeUndefined();

    expect(ctxService.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("重复 closeConnection 幂等：不抛错且不重复 cleanup", async () => {
    const conn = await createConnection("req-1");

    await expect(service.closeConnection(conn)).resolves.toBeUndefined();
    await expect(service.closeConnection(conn)).resolves.toBeUndefined();

    expect(ctxService.cleanup).toHaveBeenCalledTimes(1);
  });

  it("同毫秒并发关闭多个连接时仅触发一次 provider cleanup", async () => {
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(1700000000000);
    const conn1 = await createConnection("req-1");
    const conn2 = await createConnection("req-2");

    try {
      expect(conn1.id).not.toBe(conn2.id);

      await Promise.all([
        service.closeConnection(conn1),
        service.closeConnection(conn2),
      ]);

      expect(ctxService.cleanup).toHaveBeenCalledTimes(1);
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("close(lastConn) 与 establish(newConn) 并发时不会误触发 provider cleanup", async () => {
    const conn1 = await createConnection("req-1");

    let resolveInitialize: (() => void) | null = null;
    const pendingInitialize = new Promise<void>((resolve) => {
      resolveInitialize = resolve;
    });
    ctxService.initializeWebSocket.mockImplementationOnce(
      () => pendingInitialize,
    );

    const establishPromise = service.establishStreamConnection({
      provider: "mock-provider",
      capability: "stream-stock-quote",
      requestId: "req-2",
    });

    await Promise.resolve();
    await service.closeConnection(conn1);
    expect(ctxService.cleanup).not.toHaveBeenCalled();

    resolveInitialize?.();
    const conn2 = await establishPromise;
    expect(conn2.isConnected).toBe(true);
  });

  it("同连接并发 close 会等待同一 in-flight promise 并返回一致错误", async () => {
    const conn = await createConnection("req-1");
    ctxService.cleanup.mockRejectedValue(new Error("cleanup-failed"));

    const closePromise1 = service.closeConnection(conn);
    const closePromise2 = service.closeConnection(conn);

    await expect(closePromise1).rejects.toThrow(
      "连接已关闭，但 provider cleanup 失败: cleanup-failed",
    );
    await expect(closePromise2).rejects.toThrow(
      "连接已关闭，但 provider cleanup 失败: cleanup-failed",
    );

    expect(ctxService.cleanup).toHaveBeenCalledTimes(2);
  });

  it("closed 记录 TTL 内阻止重复 close，过期后会被清理", async () => {
    jest.useFakeTimers();
    const baseTime = new Date("2026-01-01T00:00:00.000Z");
    jest.setSystemTime(baseTime);

    const closeMock = jest.fn().mockResolvedValue(undefined);
    const connection = {
      id: "mock-provider_stream-stock-quote_ttl",
      provider: "mock-provider",
      capability: "stream-stock-quote",
      isConnected: true,
      createdAt: baseTime,
      lastActiveAt: baseTime,
      subscribedSymbols: new Set<string>(),
      options: {},
      close: closeMock,
    } as any;

    try {
      await service.closeConnection(connection);
      await service.closeConnection(connection);

      expect(closeMock).toHaveBeenCalledTimes(1);

      const closedConnectionIds = (service as any).closedConnectionIds as Map<
        string,
        number
      >;
      expect(closedConnectionIds.has(connection.id)).toBe(true);

      const ttlMs = (service as any).closedConnectionTtlMs as number;
      jest.setSystemTime(new Date(baseTime.getTime() + ttlMs + 1));
      (service as any).performPeriodicMapCleanup();

      expect(closedConnectionIds.has(connection.id)).toBe(false);

      await service.closeConnection(connection);
      expect(closeMock).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it("provider 无 cleanup 方法时返回 no_method", async () => {
    capabilityRegistry.getProvider.mockReturnValue({
      getStreamContextService: jest.fn(() => ({})),
    });

    const result = await (service as any).cleanupProviderContextIfIdle(
      "mock-provider",
    );

    expect(result).toEqual({ status: "no_method" });
  });

  it("provider cleanup 首次失败会重试一次并返回 failed", async () => {
    ctxService.cleanup
      .mockRejectedValueOnce(new Error("first-failure"))
      .mockRejectedValueOnce(new Error("second-failure"));

    const result = await (service as any).cleanupProviderContextIfIdle(
      "mock-provider",
    );

    expect(ctxService.cleanup).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("failed");
    expect(result.error).toBe("second-failure");
  });

  it("TTL 内命中历史 close 错误会重试，失败后更新最新错误并进入冷却", async () => {
    const conn = await createConnection("req-1");

    ctxService.cleanup
      .mockRejectedValueOnce(new Error("first-failure"))
      .mockRejectedValueOnce(new Error("second-failure"))
      .mockRejectedValueOnce(new Error("third-failure"))
      .mockRejectedValueOnce(new Error("fourth-failure"));

    await expect(service.closeConnection(conn)).rejects.toThrow(
      "连接已关闭，但 provider cleanup 失败: second-failure",
    );
    await expect(service.closeConnection(conn)).rejects.toThrow(
      "连接已关闭，但 provider cleanup 失败: fourth-failure",
    );
    await expect(service.closeConnection(conn)).rejects.toThrow(
      "连接已关闭，但 provider cleanup 失败: fourth-failure",
    );

    expect(conn.isConnected).toBe(false);
    expect(ctxService.cleanup).toHaveBeenCalledTimes(4);
  });

  it("TTL 内历史 close 错误重试成功后会清除错误记录", async () => {
    const conn = await createConnection("req-1");

    ctxService.cleanup
      .mockRejectedValueOnce(new Error("first-failure"))
      .mockRejectedValueOnce(new Error("second-failure"))
      .mockResolvedValueOnce(undefined);

    await expect(service.closeConnection(conn)).rejects.toThrow(
      "连接已关闭，但 provider cleanup 失败: second-failure",
    );
    await expect(service.closeConnection(conn)).resolves.toBeUndefined();

    const closedConnectionErrors = (service as any)
      .closedConnectionErrors as Map<string, string>;
    expect(closedConnectionErrors.has(conn.id)).toBe(false);
    expect(ctxService.cleanup).toHaveBeenCalledTimes(3);
  });

  it("provider cleanup 成功时返回 cleaned", async () => {
    const result = await (service as any).cleanupProviderContextIfIdle(
      "mock-provider",
    );

    expect(result).toEqual({ status: "cleaned" });
    expect(ctxService.cleanup).toHaveBeenCalledTimes(1);
  });
});

describe("StreamClientStateManager intraday domain events", () => {
  let manager: StreamClientStateManager;
  let webSocketProvider: {
    isServerAvailable: jest.Mock<boolean, []>;
    healthCheck: jest.Mock<Record<string, unknown>, []>;
    broadcastToRoom: jest.Mock<Promise<boolean>, [string, string, any]>;
  };
  let originalChartSecret: string | undefined;
  let originalCursorSigningSecret: string | undefined;
  let originalJwtSecret: string | undefined;
  let originalAppSecret: string | undefined;

  beforeEach(() => {
    originalChartSecret = process.env.CHART_INTRADAY_CURSOR_SECRET;
    originalCursorSigningSecret = process.env.CURSOR_SIGNING_SECRET;
    originalJwtSecret = process.env.JWT_SECRET;
    originalAppSecret = process.env.APP_SECRET;
    process.env.CHART_INTRADAY_CURSOR_SECRET = "chart-only-secret";
    process.env.CURSOR_SIGNING_SECRET = "legacy-cursor-secret";
    process.env.JWT_SECRET = "legacy-jwt-secret";
    process.env.APP_SECRET = "legacy-app-secret";

    manager = new StreamClientStateManager();
    webSocketProvider = {
      isServerAvailable: jest.fn().mockReturnValue(true),
      healthCheck: jest
        .fn()
        .mockReturnValue({ status: "healthy", details: { reason: "ok" } }),
      broadcastToRoom: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(async () => {
    await manager.onModuleDestroy();
    process.env.CHART_INTRADAY_CURSOR_SECRET = originalChartSecret;
    process.env.CURSOR_SIGNING_SECRET = originalCursorSigningSecret;
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.APP_SECRET = originalAppSecret;
  });

  it("合法 item 广播包含 delta 语义一致的 signed cursor（含 sig/tradingDay）", async () => {
    await expect(
      manager.broadcastToSymbolViaGateway(
        "AAPL",
        {
          lastPrice: "123.45",
          timestamp: "2026-01-02T14:30:01.000Z",
          volume: "1000",
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(2);
    const intradayCall = webSocketProvider.broadcastToRoom.mock.calls[1];
    expect(intradayCall[0]).toBe("symbol:AAPL");
    expect(intradayCall[1]).toBe("chart.intraday.point");

    const payload = intradayCall[2];
    expect(payload).toEqual(
      expect.objectContaining({
        symbol: "AAPL",
        market: expect.any(String),
        tradingDay: expect.any(String),
        granularity: "1s",
        cursor: expect.any(String),
      }),
    );

    const decodedCursor = JSON.parse(
      Buffer.from(payload.cursor, "base64").toString("utf-8"),
    );
    expect(decodedCursor).toEqual(
      expect.objectContaining({
        v: 1,
        symbol: "AAPL",
        market: payload.market,
        tradingDay: payload.tradingDay,
        lastPointTimestamp: payload.point.timestamp,
        issuedAt: expect.any(String),
        sig: expect.any(String),
      }),
    );

    const signingSecret = String(
      process.env.CHART_INTRADAY_CURSOR_SECRET || "",
    ).trim();
    const signingRaw = [
      decodedCursor.v,
      decodedCursor.symbol,
      decodedCursor.market,
      decodedCursor.tradingDay,
      decodedCursor.provider || "",
      decodedCursor.lastPointTimestamp,
      decodedCursor.issuedAt,
    ].join("|");
    const expectedSig = createHmac("sha256", signingSecret)
      .update(signingRaw, "utf-8")
      .digest("hex");

    expect(decodedCursor.sig).toBe(expectedSig);
  });

  it("同一批次内仅广播每个秒桶的最后一个分时点", async () => {
    await expect(
      manager.broadcastToSymbolViaGateway(
        "BTCUSDT",
        [
          {
            lastPrice: 70679.87,
            timestamp: "2026-03-14T16:56:50.056Z",
            volume: 0.02,
          },
          {
            lastPrice: 70679.87,
            timestamp: "2026-03-14T16:56:50.577Z",
            volume: 0.02,
          },
          {
            lastPrice: 70679.88,
            timestamp: "2026-03-14T16:56:51.056Z",
            volume: 0.02,
          },
          {
            lastPrice: 70679.89,
            timestamp: "2026-03-14T16:56:51.577Z",
            volume: 0.02,
          },
        ],
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(3);
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      2,
      "symbol:BTCUSDT",
      "chart.intraday.point",
      expect.objectContaining({
        point: expect.objectContaining({
          timestamp: "2026-03-14T16:56:50.000Z",
          price: 70679.87,
          volume: 0.02,
        }),
      }),
    );
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      3,
      "symbol:BTCUSDT",
      "chart.intraday.point",
      expect.objectContaining({
        point: expect.objectContaining({
          timestamp: "2026-03-14T16:56:51.000Z",
          price: 70679.89,
          volume: 0.02,
        }),
      }),
    );
  });

  it("秒桶已广播后，同秒内容重放或修正都跳过", async () => {
    await expect(
      manager.broadcastToSymbolViaGateway(
        "BTCUSDT",
        {
          lastPrice: 70679.87,
          timestamp: "2026-03-14T16:56:50.577Z",
          volume: 0.02,
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(2);

    webSocketProvider.broadcastToRoom.mockClear();

    await expect(
      manager.broadcastToSymbolViaGateway(
        "BTCUSDT",
        {
          lastPrice: 70679.87,
          timestamp: "2026-03-14T16:56:50.577Z",
          volume: 0.02,
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(1);
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      1,
      "symbol:BTCUSDT",
      "data",
      expect.any(Object),
    );

    webSocketProvider.broadcastToRoom.mockClear();

    await expect(
      manager.broadcastToSymbolViaGateway(
        "BTCUSDT",
        {
          lastPrice: 70679.88,
          timestamp: "2026-03-14T16:56:50.900Z",
          volume: 0.03,
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(1);
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      1,
      "symbol:BTCUSDT",
      "data",
      expect.any(Object),
    );
  });

  it("当前秒桶内多次更新仅在秒桶结束后广播一次最终点", async () => {
    await manager.onModuleDestroy();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-14T16:56:50.100Z"));

    manager = new StreamClientStateManager();
    webSocketProvider = {
      isServerAvailable: jest.fn().mockReturnValue(true),
      healthCheck: jest
        .fn()
        .mockReturnValue({ status: "healthy", details: { reason: "ok" } }),
      broadcastToRoom: jest.fn().mockResolvedValue(true),
    };

    await expect(
      manager.broadcastToSymbolViaGateway(
        "BTCUSDT",
        {
          lastPrice: 70679.87,
          timestamp: "2026-03-14T16:56:50.120Z",
          volume: 0.02,
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(1);
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      1,
      "symbol:BTCUSDT",
      "data",
      expect.any(Object),
    );

    await expect(
      manager.broadcastToSymbolViaGateway(
        "BTCUSDT",
        {
          lastPrice: 70679.88,
          timestamp: "2026-03-14T16:56:50.920Z",
          volume: 0.03,
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(3);
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      3,
      "symbol:BTCUSDT",
      "chart.intraday.point",
      expect.objectContaining({
        point: expect.objectContaining({
          timestamp: "2026-03-14T16:56:50.000Z",
          price: 70679.88,
          volume: 0.03,
        }),
      }),
    );

    jest.useRealTimers();
  });

  it("秒桶 flush 后到达的同秒晚到数据不会再次触发 intraday 广播", async () => {
    await manager.onModuleDestroy();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-14T16:56:50.100Z"));

    manager = new StreamClientStateManager();
    webSocketProvider = {
      isServerAvailable: jest.fn().mockReturnValue(true),
      healthCheck: jest
        .fn()
        .mockReturnValue({ status: "healthy", details: { reason: "ok" } }),
      broadcastToRoom: jest.fn().mockResolvedValue(true),
    };

    await expect(
      manager.broadcastToSymbolViaGateway(
        "BTCUSDT",
        {
          lastPrice: 70679.87,
          timestamp: "2026-03-14T16:56:50.520Z",
          volume: 0.02,
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(2);
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      2,
      "symbol:BTCUSDT",
      "chart.intraday.point",
      expect.objectContaining({
        point: expect.objectContaining({
          timestamp: "2026-03-14T16:56:50.000Z",
          price: 70679.87,
          volume: 0.02,
        }),
      }),
    );

    webSocketProvider.broadcastToRoom.mockClear();
    jest.setSystemTime(new Date("2026-03-14T16:56:51.400Z"));

    await expect(
      manager.broadcastToSymbolViaGateway(
        "BTCUSDT",
        {
          lastPrice: 70679.88,
          timestamp: "2026-03-14T16:56:50.946Z",
          volume: 0.03,
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(1);
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      1,
      "symbol:BTCUSDT",
      "data",
      expect.any(Object),
    );

    jest.useRealTimers();
  });

  it("跨秒价格未变化时跳过后续 intraday 广播", async () => {
    await manager.onModuleDestroy();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-14T16:56:50.100Z"));

    manager = new StreamClientStateManager();
    webSocketProvider = {
      isServerAvailable: jest.fn().mockReturnValue(true),
      healthCheck: jest
        .fn()
        .mockReturnValue({ status: "healthy", details: { reason: "ok" } }),
      broadcastToRoom: jest.fn().mockResolvedValue(true),
    };

    await expect(
      manager.broadcastToSymbolViaGateway(
        "BTCUSDT",
        {
          lastPrice: 70679.87,
          timestamp: "2026-03-14T16:56:50.520Z",
          volume: 0.02,
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(2);
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      2,
      "symbol:BTCUSDT",
      "chart.intraday.point",
      expect.objectContaining({
        point: expect.objectContaining({
          timestamp: "2026-03-14T16:56:50.000Z",
          price: 70679.87,
        }),
      }),
    );

    webSocketProvider.broadcastToRoom.mockClear();
    jest.setSystemTime(new Date("2026-03-14T16:56:51.100Z"));

    await expect(
      manager.broadcastToSymbolViaGateway(
        "BTCUSDT",
        {
          lastPrice: 70679.87,
          timestamp: "2026-03-14T16:56:51.520Z",
          volume: 0.03,
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(1);
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      1,
      "symbol:BTCUSDT",
      "data",
      expect.any(Object),
    );

    jest.useRealTimers();
  });

  it("无效 item 被跳过", async () => {
    await expect(
      manager.broadcastToSymbolViaGateway(
        "AAPL",
        {
          lastPrice: "not-a-number",
          timestamp: "invalid",
          volume: 100,
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(1);
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      1,
      "symbol:AAPL",
      "data",
      expect.any(Object),
    );
  });

  it("market UNKNOWN 时跳过 intraday 事件", async () => {
    await expect(
      manager.broadcastToSymbolViaGateway(
        "ABC.SG",
        {
          lastPrice: "123.45",
          timestamp: "2026-01-02T14:30:04.000Z",
          volume: "1000",
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(1);
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      1,
      "symbol:ABC.SG",
      "data",
      expect.any(Object),
    );
  });

  it("market UNKNOWN 但 payload 提供 market 时仍广播 intraday", async () => {
    await expect(
      manager.broadcastToSymbolViaGateway(
        "INVALID@@",
        {
          lastPrice: 123.45,
          timestamp: "2026-01-02T14:30:05.000Z",
          volume: 1000,
          market: "US",
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(2);
    const intradayCall = webSocketProvider.broadcastToRoom.mock.calls[1];
    expect(intradayCall[1]).toBe("chart.intraday.point");
    expect(intradayCall[2]).toEqual(
      expect.objectContaining({
        market: "US",
        cursor: expect.any(String),
      }),
    );
  });

  it("缺少分时游标密钥时跳过 intraday 事件且不阻塞主广播", async () => {
    process.env.CHART_INTRADAY_CURSOR_SECRET = "";

    await expect(
      manager.broadcastToSymbolViaGateway(
        "AAPL",
        {
          lastPrice: 123.45,
          timestamp: "2026-01-02T14:30:06.000Z",
          volume: 1000,
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(1);
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      1,
      "symbol:AAPL",
      "data",
      expect.any(Object),
    );
  });

  it("intraday 广播异常不影响主流程", async () => {
    webSocketProvider.broadcastToRoom
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new Error("intraday-broadcast-failed"));

    await expect(
      manager.broadcastToSymbolViaGateway(
        "AAPL",
        {
          lastPrice: 123.45,
          timestamp: "2026-01-02T14:30:02.000Z",
          volume: 1000,
        },
        webSocketProvider,
      ),
    ).resolves.toBeUndefined();

    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(2);
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      2,
      "symbol:AAPL",
      "chart.intraday.point",
      expect.any(Object),
    );
  });

  it("主 data 广播成功后不等待 intraday 广播完成", async () => {
    let resolveIntradayBroadcast: ((value: boolean) => void) | null = null;
    const pendingIntradayBroadcast = new Promise<boolean>((resolve) => {
      resolveIntradayBroadcast = resolve;
    });

    webSocketProvider.broadcastToRoom
      .mockResolvedValueOnce(true)
      .mockImplementationOnce(() => pendingIntradayBroadcast);

    const promise = manager.broadcastToSymbolViaGateway(
      "AAPL",
      {
        lastPrice: 123.45,
        timestamp: "2026-01-02T14:30:03.000Z",
        volume: 1000,
      },
      webSocketProvider,
    );

    await expect(promise).resolves.toBeUndefined();
    await Promise.resolve();
    expect(webSocketProvider.broadcastToRoom).toHaveBeenCalledTimes(2);
    expect(webSocketProvider.broadcastToRoom).toHaveBeenNthCalledWith(
      2,
      "symbol:AAPL",
      "chart.intraday.point",
      expect.any(Object),
    );

    resolveIntradayBroadcast?.(true);
    await Promise.resolve();
  });
});

jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  sanitizeLogData: (data: unknown) => data,
}));

import { EventEmitter2 } from "@nestjs/event-emitter";

import { StreamDataFetcherService } from "@core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service";

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

  beforeEach(() => {
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

    const unsubscribeProxy = jest.fn();
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

    const capabilityRegistry = {
      getProvider: jest.fn(() => provider),
    };
    const streamCache = {
      deleteData: jest.fn().mockResolvedValue(undefined),
      setData: jest.fn().mockResolvedValue(undefined),
    };
    const clientStateManager = {
      removeConnection: jest.fn(),
    };
    const connectionPoolManager = {
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
      clientStateManager as any,
      connectionPoolManager as any,
      new EventEmitter2(),
      configService as any,
      streamConfigService as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  async function createConnection(requestId: string) {
    return service.establishStreamConnection({
      provider: "mock-provider",
      capability: "stream-stock-quote",
      requestId,
    });
  }

  it("conn.close() 只做连接级清理，不触发 provider cleanup", async () => {
    const conn = await createConnection("req-1");

    await expect(conn.close()).resolves.toBeUndefined();
    await expect(conn.close()).resolves.toBeUndefined();

    expect(conn.isConnected).toBe(false);
    expect(ctxService.cleanup).not.toHaveBeenCalled();
  });

  it("closeConnection 仅在 provider 无活跃连接时触发一次 cleanup", async () => {
    const conn1 = await createConnection("req-1");
    await new Promise((resolve) => setTimeout(resolve, 1));
    const conn2 = await createConnection("req-2");

    await service.closeConnection(conn1);
    expect(ctxService.cleanup).not.toHaveBeenCalled();

    await service.closeConnection(conn2);
    expect(ctxService.cleanup).toHaveBeenCalledTimes(1);
  });

  it("重复 closeConnection 幂等：不抛错且不重复 cleanup", async () => {
    const conn = await createConnection("req-1");

    await expect(service.closeConnection(conn)).resolves.toBeUndefined();
    await expect(service.closeConnection(conn)).resolves.toBeUndefined();

    expect(ctxService.cleanup).toHaveBeenCalledTimes(1);
  });
});

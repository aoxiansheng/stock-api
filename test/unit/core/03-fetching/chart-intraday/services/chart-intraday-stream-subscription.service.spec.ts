import { ChartIntradayStreamSubscriptionService } from "@core/03-fetching/chart-intraday/services/chart-intraday-stream-subscription.service";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";

describe("ChartIntradayStreamSubscriptionService", () => {
  const originalLeaseTtl = process.env.CHART_INTRADAY_STREAM_LEASE_TTL_MS;
  const originalCleanupInterval =
    process.env.CHART_INTRADAY_STREAM_CLEANUP_INTERVAL_MS;

  function createService() {
    const streamReceiverService = {
      subscribeStream: jest.fn().mockResolvedValue(undefined),
      unsubscribeStream: jest.fn().mockResolvedValue(undefined),
    };
    const streamClientStateManager = {
      getClientSubscription: jest.fn().mockReturnValue(null),
    };

    const service = new ChartIntradayStreamSubscriptionService(
      streamReceiverService as any,
      streamClientStateManager as any,
    );

    return {
      service,
      streamReceiverService,
      streamClientStateManager,
    };
  }

  beforeEach(() => {
    process.env.CHART_INTRADAY_STREAM_LEASE_TTL_MS = "60000";
    process.env.CHART_INTRADAY_STREAM_CLEANUP_INTERVAL_MS = "60000";
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalLeaseTtl === undefined) {
      delete process.env.CHART_INTRADAY_STREAM_LEASE_TTL_MS;
    } else {
      process.env.CHART_INTRADAY_STREAM_LEASE_TTL_MS = originalLeaseTtl;
    }

    if (originalCleanupInterval === undefined) {
      delete process.env.CHART_INTRADAY_STREAM_CLEANUP_INTERVAL_MS;
    } else {
      process.env.CHART_INTRADAY_STREAM_CLEANUP_INTERVAL_MS =
        originalCleanupInterval;
    }
  });

  it("首次确保订阅时应创建内部 stream-stock-quote 订阅", async () => {
    const { service, streamReceiverService } = createService();

    await service.ensureRealtimeSubscription({
      symbol: "aapl.us",
      market: "us",
      provider: "InfoWay",
    });

    expect(streamReceiverService.subscribeStream).toHaveBeenCalledWith(
      {
        symbols: ["AAPL.US"],
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        preferredProvider: "infoway",
      },
      "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
      undefined,
      { connectionAuthenticated: true },
    );

    await service.onModuleDestroy();
  });

  it("内部订阅仍然活跃时不应重复订阅", async () => {
    const { service, streamReceiverService, streamClientStateManager } =
      createService();

    streamClientStateManager.getClientSubscription.mockReturnValue({
      clientId: "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
      symbols: new Set(["AAPL.US"]),
      wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
      providerName: "infoway",
      subscriptionTime: Date.now(),
      lastActiveTime: Date.now(),
    });

    await service.ensureRealtimeSubscription({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
    });
    await service.ensureRealtimeSubscription({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
    });

    expect(streamReceiverService.subscribeStream).not.toHaveBeenCalled();

    await service.onModuleDestroy();
  });

  it("租约过期时应使用同一内部 clientId 退订", async () => {
    const { service, streamReceiverService } = createService();

    await service.ensureRealtimeSubscription({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
    });

    const lease = (service as any).leases.get(
      "infoway:stream-stock-quote:AAPL.US",
    );
    lease.lastTouchedAt = Date.now() - 61_000;

    await (service as any).cleanupExpiredLeases();

    expect(streamReceiverService.unsubscribeStream).toHaveBeenCalledWith(
      {
        symbols: ["AAPL.US"],
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
      },
      "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
    );

    await service.onModuleDestroy();
  });

  it("显式释放时应立即退订并返回 released=true", async () => {
    const { service, streamReceiverService } = createService();

    await service.ensureRealtimeSubscription({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
    });

    const result = await service.releaseRealtimeSubscription({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
    });

    expect(result).toEqual({
      released: true,
      symbol: "AAPL.US",
      provider: "infoway",
      wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
      clientId: "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
    });
    expect(streamReceiverService.unsubscribeStream).toHaveBeenCalledWith(
      {
        symbols: ["AAPL.US"],
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
      },
      "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
    );

    await service.onModuleDestroy();
  });

  it("显式释放不存在的租约时应返回 released=false", async () => {
    const { service, streamReceiverService } = createService();

    const result = await service.releaseRealtimeSubscription({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
    });

    expect(result).toEqual({
      released: false,
      symbol: "AAPL.US",
      provider: "infoway",
      wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
      clientId: "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
    });
    expect(streamReceiverService.unsubscribeStream).not.toHaveBeenCalled();

    await service.onModuleDestroy();
  });
});

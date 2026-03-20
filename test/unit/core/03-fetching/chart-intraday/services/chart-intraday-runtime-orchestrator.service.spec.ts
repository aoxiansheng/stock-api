import { MarketStatus } from "@core/shared/constants/market.constants";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
import { ChartIntradayRuntimeOrchestratorService } from "@core/03-fetching/chart-intraday/services/chart-intraday-runtime-orchestrator.service";
import type { ChartIntradayRuntimeDecision } from "@core/03-fetching/chart-intraday/services/chart-intraday-session-policy.service";

describe("ChartIntradayRuntimeOrchestratorService", () => {
  type RuntimeMode = "live" | "paused" | "frozen";

  function createDecision(params?: {
    mode?: RuntimeMode;
    reason?: ChartIntradayRuntimeDecision["reason"];
    market?: string;
    tradingDay?: string;
    marketStatus?: MarketStatus;
    timezone?: string;
    nextSessionStart?: string | null;
  }): ChartIntradayRuntimeDecision {
    const market = params?.market ?? "SZ";
    const tradingDay = params?.tradingDay ?? "20260317";

    return {
      mode: params?.mode ?? "paused",
      reason: params?.reason ?? "LUNCH_BREAK",
      market,
      requestedTradingDay: tradingDay,
      currentTradingDay: tradingDay,
      marketStatus: params?.marketStatus ?? MarketStatus.LUNCH_BREAK,
      timezone: params?.timezone ?? "Asia/Shanghai",
      nextSessionStart: params?.nextSessionStart ?? "2026-03-17T05:00:00.000Z",
    };
  }

  function buildResumeTicketKey(params: {
    symbol: string;
    provider: string;
    market: string;
  }) {
    const wsCapabilityType =
      String(params.market || "")
        .trim()
        .toUpperCase() === "CRYPTO"
        ? CAPABILITY_NAMES.STREAM_CRYPTO_QUOTE
        : CAPABILITY_NAMES.STREAM_STOCK_QUOTE;
    return [
      "chart-intraday:resume-ticket:v1:",
      String(params.provider || "").trim().toLowerCase(),
      ":",
      wsCapabilityType,
      ":",
      String(params.symbol || "").trim().toUpperCase(),
    ].join("");
  }

  function createBasicCacheMock() {
    const store = new Map<string, unknown>();

    return {
      store,
      service: {
        get: jest.fn(async <T>(key: string) => {
          if (!store.has(key)) {
            return null;
          }
          return JSON.parse(JSON.stringify(store.get(key))) as T;
        }),
        set: jest.fn(async (key: string, value: unknown) => {
          store.set(key, JSON.parse(JSON.stringify(value)));
        }),
        del: jest.fn(async (key: string) => {
          const existed = store.delete(key);
          return existed ? 1 : 0;
        }),
      },
    };
  }

  function createService() {
    const basicCache = createBasicCacheMock();
    const chartIntradaySessionPolicyService = {
      decide: jest.fn(),
    };
    const chartIntradayStreamSubscriptionService = {
      openRealtimeOwnerLease: jest.fn(async (params: any) => ({
        sessionId: "session-live-1",
        symbol: params.symbol,
        provider: params.provider,
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        clientId: `chart-intraday:auto:${params.provider}:${CAPABILITY_NAMES.STREAM_STOCK_QUOTE}:${params.symbol}`,
      })),
      openPassiveOwnerLease: jest.fn(async (params: any) => ({
        sessionId: "session-passive-1",
        symbol: params.symbol,
        provider: params.provider,
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        clientId: `chart-intraday:auto:${params.provider}:${CAPABILITY_NAMES.STREAM_STOCK_QUOTE}:${params.symbol}`,
      })),
      touchRealtimeOwnerLease: jest.fn(),
      touchPassiveOwnerLease: jest.fn(),
      pauseRealtimeUpstream: jest.fn().mockResolvedValue(true),
      resumeRealtimeUpstream: jest.fn().mockResolvedValue(true),
    };
    const chartIntradaySessionService = {
      getUpstreamActiveSessionCount: jest.fn(),
    };

    const service = new ChartIntradayRuntimeOrchestratorService(
      chartIntradaySessionPolicyService as any,
      chartIntradayStreamSubscriptionService as any,
      chartIntradaySessionService as any,
      basicCache.service as any,
    );

    return {
      service,
      basicCache,
      chartIntradaySessionPolicyService,
      chartIntradayStreamSubscriptionService,
      chartIntradaySessionService,
    };
  }

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.CHART_INTRADAY_RESUME_BUFFER_SECONDS = "1800";
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("paused snapshot session 应创建 resume ticket 并暂停上游", async () => {
    jest.setSystemTime(new Date("2026-03-17T04:00:00.000Z"));
    const {
      service,
      basicCache,
      chartIntradayStreamSubscriptionService,
    } = createService();
    const ticketKey = buildResumeTicketKey({
      symbol: "000001.SZ",
      market: "SZ",
      provider: "infoway",
    });

    await service.openSnapshotSession({
      symbol: "000001.SZ",
      market: "SZ",
      provider: "infoway",
      ownerIdentity: "user:test",
      tradingDay: "20260317",
      decision: createDecision(),
    });

    expect(
      chartIntradayStreamSubscriptionService.openPassiveOwnerLease,
    ).toHaveBeenCalledTimes(1);
    expect(
      chartIntradayStreamSubscriptionService.pauseRealtimeUpstream,
    ).toHaveBeenCalledWith({
      symbol: "000001.SZ",
      market: "SZ",
      provider: "infoway",
    });
    expect(basicCache.store.get(ticketKey)).toEqual(
      expect.objectContaining({
        symbol: "000001.SZ",
        market: "SZ",
        provider: "infoway",
        tradingDay: "20260317",
        nextSessionStart: "2026-03-17T05:00:00.000Z",
      }),
    );
    expect((service as any).localResumeTimers.size).toBe(1);

    service.onModuleDestroy();
  });

  it("release 到最后一个消费者退出时应清理 resume ticket", async () => {
    jest.setSystemTime(new Date("2026-03-17T04:00:00.000Z"));
    const { service, basicCache } = createService();
    const ticketKey = buildResumeTicketKey({
      symbol: "000001.SZ",
      market: "SZ",
      provider: "infoway",
    });

    await service.openSnapshotSession({
      symbol: "000001.SZ",
      market: "SZ",
      provider: "infoway",
      ownerIdentity: "user:test",
      tradingDay: "20260317",
      decision: createDecision(),
    });
    expect(basicCache.store.has(ticketKey)).toBe(true);

    await service.handleRelease({
      symbol: "000001.SZ",
      market: "SZ",
      provider: "infoway",
      activeSessionCount: 0,
    });

    expect(basicCache.store.has(ticketKey)).toBe(false);
    expect((service as any).localResumeTimers.size).toBe(0);

    service.onModuleDestroy();
  });

  it("resume ticket 命中 live 且仍有活跃消费者时应恢复上游", async () => {
    const {
      service,
      basicCache,
      chartIntradaySessionPolicyService,
      chartIntradaySessionService,
      chartIntradayStreamSubscriptionService,
    } = createService();
    const ticketKey = buildResumeTicketKey({
      symbol: "000001.SZ",
      market: "SZ",
      provider: "infoway",
    });

    basicCache.store.set(ticketKey, {
      upstreamKey: "infoway:stream-stock-quote:000001.SZ",
      symbol: "000001.SZ",
      market: "SZ",
      provider: "infoway",
      tradingDay: "20260317",
      nextSessionStart: "2026-03-17T05:00:00.000Z",
      createdAt: "2026-03-17T04:00:00.000Z",
    });
    chartIntradaySessionPolicyService.decide.mockResolvedValue(
      createDecision({
        mode: "live",
        reason: "CURRENT_SESSION_TRADING",
        marketStatus: MarketStatus.TRADING,
        nextSessionStart: null,
      }),
    );
    chartIntradaySessionService.getUpstreamActiveSessionCount.mockResolvedValue(2);

    await (service as any).handleResumeTicket(ticketKey);

    expect(
      chartIntradayStreamSubscriptionService.resumeRealtimeUpstream,
    ).toHaveBeenCalledWith({
      symbol: "000001.SZ",
      market: "SZ",
      provider: "infoway",
    });
    expect(basicCache.store.has(ticketKey)).toBe(false);

    service.onModuleDestroy();
  });

  it("resume ticket 在仍处于 paused 时应按新的 nextSessionStart 重新排程", async () => {
    jest.setSystemTime(new Date("2026-03-17T04:59:00.000Z"));
    const {
      service,
      basicCache,
      chartIntradaySessionPolicyService,
      chartIntradaySessionService,
      chartIntradayStreamSubscriptionService,
    } = createService();
    const ticketKey = buildResumeTicketKey({
      symbol: "000001.SZ",
      market: "SZ",
      provider: "infoway",
    });

    basicCache.store.set(ticketKey, {
      upstreamKey: "infoway:stream-stock-quote:000001.SZ",
      symbol: "000001.SZ",
      market: "SZ",
      provider: "infoway",
      tradingDay: "20260317",
      nextSessionStart: "2026-03-17T05:00:00.000Z",
      createdAt: "2026-03-17T04:00:00.000Z",
    });
    chartIntradaySessionPolicyService.decide.mockResolvedValue(
      createDecision({
        nextSessionStart: "2026-03-17T05:30:00.000Z",
      }),
    );
    chartIntradaySessionService.getUpstreamActiveSessionCount.mockResolvedValue(1);

    await (service as any).handleResumeTicket(ticketKey);

    expect(
      chartIntradayStreamSubscriptionService.resumeRealtimeUpstream,
    ).not.toHaveBeenCalled();
    expect(basicCache.store.get(ticketKey)).toEqual(
      expect.objectContaining({
        nextSessionStart: "2026-03-17T05:30:00.000Z",
      }),
    );

    service.onModuleDestroy();
  });

  it("DST 切换周应严格按 nextSessionStart 恢复，不受本地时区影响", async () => {
    jest.setSystemTime(new Date("2026-03-09T13:29:59.000Z"));
    const {
      service,
      chartIntradaySessionPolicyService,
      chartIntradaySessionService,
      chartIntradayStreamSubscriptionService,
    } = createService();
    chartIntradaySessionPolicyService.decide.mockResolvedValue(
      createDecision({
        mode: "live",
        reason: "CURRENT_SESSION_TRADING",
        market: "US",
        tradingDay: "20260309",
        marketStatus: MarketStatus.TRADING,
        timezone: "America/New_York",
        nextSessionStart: null,
      }),
    );
    chartIntradaySessionService.getUpstreamActiveSessionCount.mockResolvedValue(1);

    await service.openSnapshotSession({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "user:test",
      tradingDay: "20260309",
      decision: createDecision({
        market: "US",
        tradingDay: "20260309",
        timezone: "America/New_York",
        nextSessionStart: "2026-03-09T13:30:00.000Z",
      }),
    });

    await jest.advanceTimersByTimeAsync(999);
    expect(
      chartIntradayStreamSubscriptionService.resumeRealtimeUpstream,
    ).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(
      chartIntradayStreamSubscriptionService.resumeRealtimeUpstream,
    ).toHaveBeenCalledWith({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
    });

    service.onModuleDestroy();
  });
});

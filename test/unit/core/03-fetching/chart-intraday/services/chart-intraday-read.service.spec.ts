import { ChartIntradayCursorService } from "@core/03-fetching/chart-intraday/services/chart-intraday-cursor.service";
import { ChartIntradayReadService } from "@core/03-fetching/chart-intraday/services/chart-intraday-read.service";
import { resolveMarketTimezone } from "@core/shared/utils/market-time.util";
import {
  BusinessException,
  BusinessErrorCode,
  ComponentIdentifier,
} from "@common/core/exceptions";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
import { createHmac } from "crypto";

type CursorPayload = {
  v: number;
  symbol: string;
  market: string;
  tradingDay: string;
  provider?: string;
  lastPointTimestamp: string;
  issuedAt: string;
};

describe("ChartIntradayReadService", () => {
  const DEFAULT_CURSOR_SECRET = "chart-intraday-test-secret";
  const DEFAULT_SESSION_ID =
    "chart_session_7b7f3e1c6cb84f1494f8f1b31580aa4a";
  const originalStandardSymbolIdentityProviders =
    process.env.STANDARD_SYMBOL_IDENTITY_PROVIDERS;
  const CURSOR_SECRET_ENV_KEYS = [
    "CHART_INTRADAY_CURSOR_SECRET",
    "CURSOR_SIGNING_SECRET",
    "JWT_SECRET",
    "APP_SECRET",
  ] as const;
  const originalCursorSecretEnv = Object.fromEntries(
    CURSOR_SECRET_ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof CURSOR_SECRET_ENV_KEYS)[number], string | undefined>;

  function setCursorSecret(secret: string | null = DEFAULT_CURSOR_SECRET) {
    for (const key of CURSOR_SECRET_ENV_KEYS) {
      delete process.env[key];
    }
    if (secret !== null) {
      process.env.CHART_INTRADAY_CURSOR_SECRET = secret;
    }
  }

  function restoreCursorSecretEnv() {
    for (const key of CURSOR_SECRET_ENV_KEYS) {
      const original = originalCursorSecretEnv[key];
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  }

  function signCursorPayload(payload: CursorPayload, secret: string) {
    const raw = [
      payload.v,
      payload.symbol,
      payload.market,
      payload.tradingDay,
      payload.provider || "",
      payload.lastPointTimestamp,
      payload.issuedAt,
    ].join("|");
    return createHmac("sha256", secret).update(raw, "utf-8").digest("hex");
  }

  function encodeCursor(cursorPayload: Record<string, unknown>) {
    return Buffer.from(JSON.stringify(cursorPayload), "utf-8").toString(
      "base64",
    );
  }

  function decodeCursor(cursor: string): Record<string, unknown> {
    return JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
  }

  function createSignedCursor(
    payloadInput: Omit<CursorPayload, "v" | "issuedAt"> &
      Partial<Pick<CursorPayload, "v" | "issuedAt">>,
    secret = process.env.CHART_INTRADAY_CURSOR_SECRET || DEFAULT_CURSOR_SECRET,
  ) {
    const payload: CursorPayload = {
      v: payloadInput.v ?? 1,
      issuedAt: payloadInput.issuedAt ?? new Date().toISOString(),
      symbol: payloadInput.symbol,
      market: payloadInput.market,
      tradingDay: payloadInput.tradingDay,
      provider: payloadInput.provider,
      lastPointTimestamp: payloadInput.lastPointTimestamp,
    };
    return encodeCursor({
      ...payload,
      sig: signCursorPayload(payload, secret),
    });
  }

  function createService(options?: { secret?: string | null }) {
    setCursorSecret(
      options?.secret === undefined ? DEFAULT_CURSOR_SECRET : options.secret,
    );

    const dataFetcherService = {
      fetchRawData: jest.fn(),
      supportsCapability: jest.fn().mockResolvedValue(true),
      getProviderContext: jest.fn().mockResolvedValue(null),
    };
    const symbolTransformerService = {
      transformSymbolsForProvider: jest.fn(),
      transformSingleSymbol: jest.fn(),
    };
    const providerRegistryService = {
      getCandidateProviders: jest.fn().mockReturnValue(["infoway"]),
      rankProvidersForCapability: jest.fn().mockReturnValue(["infoway"]),
      getBestProvider: jest.fn().mockReturnValue("infoway"),
      resolveHistoryExecutionContext: jest.fn().mockReturnValue({
        reasonCode: "success",
        contextService: null,
        capability: { name: CAPABILITY_NAMES.GET_STOCK_HISTORY },
      }),
      getCapability: jest.fn().mockReturnValue({
        name: CAPABILITY_NAMES.GET_STOCK_HISTORY,
      }),
    };
    const streamCache = {
      getData: jest.fn(),
    };
    const streamDataFetcherService = {
      getStreamDataCache: jest.fn().mockReturnValue(streamCache),
    };
    const chartIntradayStreamSubscriptionService = {
      openRealtimeOwnerLease: jest.fn().mockResolvedValue({
        sessionId: DEFAULT_SESSION_ID,
        symbol: "AAPL.US",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        clientId: "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
      }),
      openPassiveOwnerLease: jest.fn().mockResolvedValue({
        sessionId: DEFAULT_SESSION_ID,
        symbol: "AAPL.US",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        clientId: "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
      }),
      touchRealtimeOwnerLease: jest.fn().mockResolvedValue({
        sessionId: DEFAULT_SESSION_ID,
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        clientId: "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
      }),
      touchPassiveOwnerLease: jest.fn().mockResolvedValue({
        sessionId: DEFAULT_SESSION_ID,
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        clientId: "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
      }),
      findRealtimeOwnerLease: jest.fn().mockResolvedValue(null),
      releaseRealtimeOwnerLease: jest.fn().mockResolvedValue({
        sessionReleased: true,
        upstreamReleased: false,
        reason: "RELEASED",
        symbol: "AAPL.US",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        clientId: "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
        activeSessionCount: 0,
        graceExpiresAt: "2026-01-15T09:31:00.000Z",
      }),
      releaseRealtimeSubscription: jest.fn().mockResolvedValue({
        sessionReleased: true,
        upstreamReleased: false,
        reason: "RELEASED",
        symbol: "AAPL.US",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        clientId: "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
        activeSessionCount: 0,
        graceExpiresAt: "2026-01-15T09:31:00.000Z",
      }),
    };
    const chartIntradayFrozenSnapshotService = {
      findSnapshot: jest.fn(),
      writeSnapshot: jest.fn().mockResolvedValue(undefined),
    };
    const chartIntradayRuntimeOrchestratorService = {
      decideRuntime: jest.fn().mockImplementation(async (params: any) => ({
        mode: "live",
        reason: "CURRENT_SESSION_TRADING",
        market: params.market,
        requestedTradingDay: params.tradingDay,
        currentTradingDay: params.tradingDay,
        marketStatus: "TRADING",
        timezone: resolveMarketTimezone(params.market),
        nextSessionStart: null,
      })),
      openSnapshotSession: jest.fn().mockImplementation(async (params: any) => {
        if (params.decision?.mode === "live") {
          return chartIntradayStreamSubscriptionService.openRealtimeOwnerLease({
            symbol: params.symbol,
            market: params.market,
            provider: params.provider,
            ownerIdentity: params.ownerIdentity,
          });
        }
        return chartIntradayStreamSubscriptionService.openPassiveOwnerLease({
          symbol: params.symbol,
          market: params.market,
          provider: params.provider,
          ownerIdentity: params.ownerIdentity,
        });
      }),
      touchDeltaSession: jest.fn().mockImplementation(async (params: any) => {
        if (params.decision?.mode === "live") {
          return chartIntradayStreamSubscriptionService.touchRealtimeOwnerLease({
            symbol: params.symbol,
            market: params.market,
            provider: params.provider,
            ownerIdentity: params.ownerIdentity,
          });
        }
        return chartIntradayStreamSubscriptionService.touchPassiveOwnerLease({
          symbol: params.symbol,
          market: params.market,
          provider: params.provider,
          ownerIdentity: params.ownerIdentity,
        });
      }),
      handleRelease: jest.fn().mockResolvedValue(undefined),
    };
    const basicCacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const chartIntradayCursorService = new ChartIntradayCursorService();
    symbolTransformerService.transformSymbolsForProvider.mockImplementation(
      async (provider: string, symbols: string[]) => ({
        transformedSymbols: symbols,
        mappingResults: {
          transformedSymbols: Object.fromEntries(
            symbols.map((symbol) => [symbol, symbol]),
          ),
          failedSymbols: [],
          metadata: {
            provider,
            totalSymbols: symbols.length,
            successfulTransformations: symbols.length,
            failedTransformations: 0,
            processingTimeMs: 0,
          },
        },
      }),
    );
    symbolTransformerService.transformSingleSymbol.mockImplementation(
      async (_provider: string, symbol: string) => symbol,
    );
    const service = new ChartIntradayReadService(
      dataFetcherService as any,
      symbolTransformerService as any,
      providerRegistryService as any,
      streamDataFetcherService as any,
      chartIntradayCursorService,
      chartIntradayStreamSubscriptionService as any,
      chartIntradayFrozenSnapshotService as any,
      chartIntradayRuntimeOrchestratorService as any,
      basicCacheService as any,
    );

    return {
      service,
      dataFetcherService,
      symbolTransformerService,
      providerRegistryService,
      streamDataFetcherService,
      streamCache,
      chartIntradayStreamSubscriptionService,
      chartIntradayFrozenSnapshotService,
      chartIntradayRuntimeOrchestratorService,
      basicCacheService,
    };
  }

  function createRetryableHistoryFetchError(
    message = "timeout of 10000ms exceeded",
  ) {
    return new BusinessException({
      message,
      errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
      operation: "fetchRawData",
      component: ComponentIdentifier.DATA_FETCHER,
      retryable: true,
    });
  }

  beforeEach(() => {
    setCursorSecret(DEFAULT_CURSOR_SECRET);
  });

  afterEach(() => {
    jest.useRealTimers();
    if (originalStandardSymbolIdentityProviders === undefined) {
      delete process.env.STANDARD_SYMBOL_IDENTITY_PROVIDERS;
    } else {
      process.env.STANDARD_SYMBOL_IDENTITY_PROVIDERS =
        originalStandardSymbolIdentityProviders;
    }
  });

  afterAll(() => {
    restoreCursorSecretEnv();
  });

  it("初始化: 未配置 cursor secret 时应 fail-fast", () => {
    expect(() => createService({ secret: null })).toThrow(
      "CHART_INTRADAY_CURSOR_SECRET 未配置",
    );
  });

  it("snapshot: 合并分钟基线与实时点，实时点可覆盖同秒历史点", async () => {
    const {
      service,
      dataFetcherService,
      symbolTransformerService,
      streamCache,
      chartIntradayStreamSubscriptionService,
    } = createService();
    const nowMs = Date.now();
    const t1 = Math.floor((nowMs - 120_000) / 1000);
    const t2 = Math.floor((nowMs - 60_000) / 1000);
    const t3 = Math.floor(nowMs / 1000);

    dataFetcherService.fetchRawData.mockResolvedValue({
      data: [
        {
          symbol: "AAPL.US",
          timestamp: String(t1),
          lastPrice: "100.10",
          volume: "1000",
        },
        {
          symbol: "AAPL.US",
          timestamp: String(t2),
          lastPrice: "100.20",
          volume: "2000",
        },
      ],
      metadata: {
        provider: "infoway",
        capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
        processingTimeMs: 5,
        symbolsProcessed: 1,
      },
    });

    streamCache.getData.mockResolvedValue([
      {
        s: "AAPL.US",
        t: t2 * 1000,
        p: 101.25,
        v: 3000,
      },
      {
        s: "AAPL.US",
        t: t3 * 1000,
        p: 101.55,
        v: 4000,
      },
    ]);

    const result = await service.getSnapshot({
      symbol: "aapl.us",
      market: "us",
      provider: "infoway",
      pointLimit: 300,
    });

    expect(dataFetcherService.fetchRawData).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "infoway",
        capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
        symbols: ["AAPL.US"],
      }),
    );
    const transformCalls =
      symbolTransformerService.transformSymbolsForProvider.mock.calls.length +
      symbolTransformerService.transformSingleSymbol.mock.calls.length;
    expect(transformCalls).toBeGreaterThan(0);

    expect(result.line.symbol).toBe("AAPL.US");
    expect(result.line.granularity).toBe("1s");
    expect(result.line.points).toHaveLength(3);
    expect(result.line.points[1].price).toBe(101.25);
    expect(result.metadata.historyPoints).toBe(2);
    expect(result.metadata.realtimeMergedPoints).toBe(2);
    expect(result.metadata.deduplicatedPoints).toBe(1);
    expect(result.capability.supportsFullDay1sHistory).toBe(false);
    expect(result.sync.cursor).toBeTruthy();
    expect(
      chartIntradayStreamSubscriptionService.openRealtimeOwnerLease,
    ).toHaveBeenCalledWith({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "anonymous:chart-intraday",
    });
    expect(
      chartIntradayStreamSubscriptionService.releaseRealtimeSubscription,
    ).not.toHaveBeenCalled();
  });

  it("snapshot: CRYPTO 裸 pair 未传 market 时应自动推断并路由到 GET_CRYPTO_HISTORY", async () => {
    const {
      service,
      dataFetcherService,
      providerRegistryService,
      streamCache,
    } = createService();
    streamCache.getData.mockResolvedValue([]);
    dataFetcherService.fetchRawData.mockResolvedValue({
      data: [
        {
          symbol: "BTCUSDT",
          timestamp: "2026-01-15T00:00:00.000Z",
          lastPrice: "45000.10",
          volume: "10",
        },
      ],
      metadata: {
        provider: "infoway",
        capability: CAPABILITY_NAMES.GET_CRYPTO_HISTORY,
        processingTimeMs: 5,
        symbolsProcessed: 1,
      },
    });

    await service.getSnapshot({
      symbol: "BTCUSDT",
      tradingDay: "20260115",
    });

    expect(providerRegistryService.getBestProvider).toHaveBeenCalledWith(
      CAPABILITY_NAMES.GET_CRYPTO_HISTORY,
      "CRYPTO",
    );
    expect(dataFetcherService.fetchRawData).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: CAPABILITY_NAMES.GET_CRYPTO_HISTORY,
        symbols: ["BTCUSDT"],
        options: expect.objectContaining({
          market: "CRYPTO",
        }),
      }),
    );
  });

  it("snapshot: 上游实时订阅建立失败时应返回 503，且不回传假成功 session", async () => {
    const { service, chartIntradayStreamSubscriptionService } = createService();
    chartIntradayStreamSubscriptionService.openRealtimeOwnerLease.mockRejectedValueOnce(
      new Error("stream subscribe failed"),
    );

    await expect(
      service.getSnapshot({
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: BusinessException.name,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
      }),
    );
    expect(
      chartIntradayStreamSubscriptionService.releaseRealtimeSubscription,
    ).not.toHaveBeenCalled();
  });

  it("snapshot: CRYPTO 当日历史锚点应使用当前 UTC 时间", async () => {
    const { service, dataFetcherService, streamCache } = createService();
    jest.useFakeTimers().setSystemTime(new Date("2026-01-15T12:34:56.000Z"));
    streamCache.getData.mockResolvedValue([]);
    dataFetcherService.fetchRawData.mockResolvedValue({
      data: [
        {
          symbol: "BTCUSDT",
          timestamp: "2026-01-15T12:34:00.000Z",
          lastPrice: "45000.10",
          volume: "10",
        },
      ],
      metadata: {
        provider: "infoway",
        capability: CAPABILITY_NAMES.GET_CRYPTO_HISTORY,
        processingTimeMs: 5,
        symbolsProcessed: 1,
      },
    });

    await service.getSnapshot({
      symbol: "BTCUSDT",
      market: "CRYPTO",
      tradingDay: "20260115",
    });

    expect(dataFetcherService.fetchRawData).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          timestamp: Math.floor(Date.parse("2026-01-15T12:34:56.000Z") / 1000),
        }),
      }),
    );
  });

  it("snapshot: CRYPTO 历史日锚点应使用 UTC 23:59:59", async () => {
    const { service, dataFetcherService, streamCache } = createService();
    jest.useFakeTimers().setSystemTime(new Date("2026-01-15T12:34:56.000Z"));
    streamCache.getData.mockResolvedValue([]);
    dataFetcherService.fetchRawData.mockResolvedValue({
      data: [
        {
          symbol: "BTCUSDT",
          timestamp: "2026-01-14T23:59:00.000Z",
          lastPrice: "44990.10",
          volume: "20",
        },
      ],
      metadata: {
        provider: "infoway",
        capability: CAPABILITY_NAMES.GET_CRYPTO_HISTORY,
        processingTimeMs: 5,
        symbolsProcessed: 1,
      },
    });

    await service.getSnapshot({
      symbol: "BTCUSDT",
      market: "CRYPTO",
      tradingDay: "20260114",
    });

    expect(dataFetcherService.fetchRawData).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          timestamp: Math.floor(Date.parse("2026-01-14T23:59:59.000Z") / 1000),
        }),
      }),
    );
  });

  it("snapshot: 应返回 market-aware 的昨收与今开参考值", async () => {
    const { service, dataFetcherService, streamCache, basicCacheService } =
      createService();
    streamCache.getData.mockResolvedValue([]);
    dataFetcherService.fetchRawData.mockImplementation(async (params: any) => {
      if (params?.options?.klineType === 8) {
        return {
          data: [
            {
              s: "AAPL.US",
              respList: [
                {
                  t: "1773374400",
                  o: "255.48",
                  c: "250.12",
                },
                {
                  t: "1773288000",
                  o: "258.66",
                  c: "255.76",
                },
              ],
            },
          ],
          metadata: {
            provider: "infoway",
            capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
            processingTimeMs: 5,
            symbolsProcessed: 1,
          },
        };
      }

      return {
        data: [
          {
            symbol: "AAPL.US",
            timestamp: "2026-03-13T14:30:00.000Z",
            lastPrice: "250.12",
            volume: "1000",
          },
          {
            symbol: "AAPL.US",
            timestamp: "2026-03-13T14:31:00.000Z",
            lastPrice: "250.18",
            volume: "1200",
          },
        ],
        metadata: {
          provider: "infoway",
          capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
          processingTimeMs: 5,
          symbolsProcessed: 1,
        },
      };
    });

    const result = await service.getSnapshot({
      symbol: "AAPL.US",
      market: "US",
      tradingDay: "20260313",
      provider: "infoway",
    });

    expect(result.reference).toEqual({
      previousClosePrice: 255.76,
      sessionOpenPrice: 255.48,
      priceBase: "previous_close",
      marketSession: "regular",
      timezone: "America/New_York",
      status: "complete",
    });
    expect(basicCacheService.set).toHaveBeenCalledWith(
      "chart-intraday:snapshot-reference:v1:infoway:US:20260313:AAPL.US",
      result.reference,
      expect.objectContaining({
        ttlSeconds: 86400,
      }),
    );
    expect(dataFetcherService.fetchRawData).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          klineType: 8,
          klineNum: 2,
        }),
      }),
    );
  });

  it("snapshot: 历史基线按 tradingDay 过滤，避免跨日污染", async () => {
    const { service, dataFetcherService, streamCache } = createService();
    streamCache.getData.mockResolvedValue([]);
    dataFetcherService.fetchRawData.mockResolvedValue({
      data: [
        {
          symbol: "AAPL.US",
          timestamp: "2026-01-15T04:59:59.000Z",
          lastPrice: "99.10",
          volume: "100",
        },
        {
          symbol: "AAPL.US",
          timestamp: "2026-01-15T05:00:00.000Z",
          lastPrice: "100.20",
          volume: "200",
        },
      ],
      metadata: {
        provider: "infoway",
        capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
        processingTimeMs: 5,
        symbolsProcessed: 1,
      },
    });

    const result = await service.getSnapshot({
      symbol: "AAPL.US",
      market: "US",
      tradingDay: "20260115",
      pointLimit: 300,
    });

    expect(result.line.points).toHaveLength(1);
    expect(result.line.points[0].timestamp).toBe("2026-01-15T05:00:00.000Z");
    expect(result.metadata.historyPoints).toBe(1);
  });

  it("snapshot: 保持 symbol mapper 输出大小写，不做二次大写改写", async () => {
    const {
      service,
      dataFetcherService,
      symbolTransformerService,
      streamCache,
    } = createService();
    const providerSymbol = "aapl.us";
    const t1 = "2026-01-15T15:00:00.000Z";
    streamCache.getData.mockResolvedValue([]);
    symbolTransformerService.transformSymbolsForProvider.mockResolvedValue({
      transformedSymbols: [providerSymbol],
      mappingResults: {
        transformedSymbols: { "AAPL.US": providerSymbol },
        failedSymbols: [],
        metadata: {
          provider: "infoway",
          totalSymbols: 1,
          successfulTransformations: 1,
          failedTransformations: 0,
          processingTimeMs: 0,
        },
      },
    });
    dataFetcherService.fetchRawData.mockResolvedValue({
      data: [
        {
          symbol: providerSymbol,
          timestamp: t1,
          lastPrice: "100.20",
          volume: "200",
        },
      ],
      metadata: {
        provider: "infoway",
        capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
        processingTimeMs: 5,
        symbolsProcessed: 1,
      },
    });

    await service.getSnapshot({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      tradingDay: "20260115",
      pointLimit: 300,
    });

    expect(dataFetcherService.fetchRawData).toHaveBeenCalledWith(
      expect.objectContaining({
        symbols: [providerSymbol],
      }),
    );
  });

  it("snapshot: provider 拉取失败时应回滚已创建 session，并返回 503", async () => {
    const { service, dataFetcherService, chartIntradayStreamSubscriptionService } =
      createService();
    dataFetcherService.fetchRawData.mockRejectedValue(
      new Error("provider unavailable"),
    );

    expect.assertions(2);
    try {
      await service.getSnapshot({
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        pointLimit: 300,
      });
    } catch (error) {
      const status =
        typeof (error as { getStatus?: () => number }).getStatus === "function"
          ? (error as { getStatus: () => number }).getStatus()
          : ((error as { statusCode?: number; status?: number }).statusCode ??
            (error as { status?: number }).status);
      expect(status).toBe(503);
    }
    expect(
      chartIntradayStreamSubscriptionService.releaseRealtimeSubscription,
    ).toHaveBeenCalledWith({
      sessionId: DEFAULT_SESSION_ID,
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "anonymous:chart-intraday",
    });
  });

  it("snapshot: 历史基线遇到可重试错误时应重试一次后成功", async () => {
    const { service, dataFetcherService, streamCache } = createService();
    streamCache.getData.mockResolvedValue([]);
    dataFetcherService.fetchRawData
      .mockRejectedValueOnce(createRetryableHistoryFetchError())
      .mockResolvedValueOnce({
        data: [
          {
            symbol: "AAPL.US",
            timestamp: "2026-01-15T15:00:00.000Z",
            lastPrice: "100.20",
            volume: "200",
          },
        ],
        metadata: {
          provider: "infoway",
          capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
          processingTimeMs: 5,
          symbolsProcessed: 1,
        },
      });

    const result = await service.getSnapshot({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      tradingDay: "20260115",
      pointLimit: 300,
    });

    expect(
      dataFetcherService.fetchRawData.mock.calls.length,
    ).toBeGreaterThanOrEqual(2);
    expect(result.metadata.historyPoints).toBe(1);
    expect(result.line.points).toHaveLength(1);
  });

  it("snapshot: 历史基线重试后仍失败时应回滚已创建 session", async () => {
    const {
      service,
      dataFetcherService,
      streamCache,
      chartIntradayStreamSubscriptionService,
    } = createService();
    streamCache.getData.mockResolvedValue([]);
    dataFetcherService.fetchRawData.mockRejectedValue(
      createRetryableHistoryFetchError(),
    );

    await expect(
      service.getSnapshot({
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        tradingDay: "20260115",
        pointLimit: 300,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: BusinessException.name,
        errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
        retryable: true,
      }),
    );
    expect(dataFetcherService.fetchRawData).toHaveBeenCalledTimes(2);
    expect(
      chartIntradayStreamSubscriptionService.releaseRealtimeSubscription,
    ).toHaveBeenCalledWith({
      sessionId: DEFAULT_SESSION_ID,
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "anonymous:chart-intraday",
    });
  });

  it("snapshot: reference 命中缓存时应直接返回缓存值且不额外拉日线", async () => {
    const { service, dataFetcherService, streamCache, basicCacheService } =
      createService();
    streamCache.getData.mockResolvedValue([]);
    basicCacheService.get.mockResolvedValue({
      previousClosePrice: 255.76,
      sessionOpenPrice: 255.48,
      priceBase: "previous_close",
      marketSession: "regular",
      timezone: "America/New_York",
      status: "complete",
    });
    dataFetcherService.fetchRawData.mockResolvedValue({
      data: [
        {
          symbol: "AAPL.US",
          timestamp: "2026-03-13T14:30:00.000Z",
          lastPrice: "250.12",
          volume: "1000",
        },
      ],
      metadata: {
        provider: "infoway",
        capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
        processingTimeMs: 5,
        symbolsProcessed: 1,
      },
    });

    const result = await service.getSnapshot({
      symbol: "AAPL.US",
      market: "US",
      tradingDay: "20260313",
      provider: "infoway",
    });

    expect(result.reference).toEqual({
      previousClosePrice: 255.76,
      sessionOpenPrice: 255.48,
      priceBase: "previous_close",
      marketSession: "regular",
      timezone: "America/New_York",
      status: "complete",
    });
    expect(basicCacheService.get).toHaveBeenCalledWith(
      "chart-intraday:snapshot-reference:v1:infoway:US:20260313:AAPL.US",
    );
    expect(dataFetcherService.fetchRawData).toHaveBeenCalledTimes(1);
    expect(dataFetcherService.fetchRawData).not.toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          klineType: 8,
        }),
      }),
    );
  });

  it("snapshot: reference 首次拉取失败后应重试并成功返回", async () => {
    const { service, dataFetcherService, streamCache } = createService();
    streamCache.getData.mockResolvedValue([]);
    dataFetcherService.fetchRawData
      .mockResolvedValueOnce({
        data: [
          {
            symbol: "BTCUSDT",
            timestamp: "2026-03-15T00:00:00.000Z",
            lastPrice: "71211.95",
            volume: "10",
          },
        ],
        metadata: {
          provider: "infoway",
          capability: CAPABILITY_NAMES.GET_CRYPTO_HISTORY,
          processingTimeMs: 5,
          symbolsProcessed: 1,
        },
      })
      .mockRejectedValueOnce(createRetryableHistoryFetchError("429"))
      .mockResolvedValueOnce({
        data: [
          {
            s: "BTCUSDT",
            respList: [
              {
                t: "1773532800",
                o: "71211.95000",
                c: "71630.00000",
              },
              {
                t: "1773446400",
                o: "70930.01000",
                c: "71211.95000",
              },
            ],
          },
        ],
        metadata: {
          provider: "infoway",
          capability: CAPABILITY_NAMES.GET_CRYPTO_HISTORY,
          processingTimeMs: 5,
          symbolsProcessed: 1,
        },
      });

    const result = await service.getSnapshot({
      symbol: "BTCUSDT",
      market: "CRYPTO",
      tradingDay: "20260315",
      provider: "infoway",
    });

    expect(result.reference).toEqual({
      previousClosePrice: 71211.95,
      sessionOpenPrice: 71211.95,
      priceBase: "previous_close",
      marketSession: "utc_day",
      timezone: "UTC",
      status: "complete",
    });
    expect(dataFetcherService.fetchRawData).toHaveBeenCalledTimes(3);
  });

  it("snapshot: 显式 market 与 symbol 可推断市场不一致时返回 400", async () => {
    const { service } = createService();

    expect.assertions(3);
    try {
      await service.getSnapshot({
        symbol: "AAPL.US",
        market: "HK",
      } as any);
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).getStatus()).toBe(400);
      expect((error as Error).message).toContain(
        "market 与 symbol 推断市场不一致",
      );
    }
  });

  it("snapshot: infoway 命中标准代码直通时接受 CN 入参并规范为交易所级市场", async () => {
    process.env.STANDARD_SYMBOL_IDENTITY_PROVIDERS = "infoway";

    const {
      service,
      dataFetcherService,
      chartIntradayStreamSubscriptionService,
      streamCache,
    } = createService();

    streamCache.getData.mockResolvedValue([]);
    dataFetcherService.fetchRawData
      .mockResolvedValueOnce({
        data: [
          {
            symbol: "000600.SZ",
            market: "SZ",
            timestamp: "2026-03-16T01:30:00.000Z",
            lastPrice: "9.52",
            volume: "9882",
          },
        ],
        metadata: {
          provider: "infoway",
          capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
          processingTimeMs: 3,
          symbolsProcessed: 1,
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            symbol: "000600.SZ",
            market: "SZ",
            timestamp: "2026-03-15T16:00:00.000Z",
            open: "9.50",
            close: "9.48",
          },
          {
            symbol: "000600.SZ",
            market: "SZ",
            timestamp: "2026-03-16T16:00:00.000Z",
            open: "9.49",
            close: "9.52",
          },
        ],
        metadata: {
          provider: "infoway",
          capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
          processingTimeMs: 3,
          symbolsProcessed: 1,
        },
      });

    const result = await service.getSnapshot({
      symbol: "000600.SZ",
      market: "CN",
      tradingDay: "20260316",
      provider: "infoway",
    });

    expect(result.line.market).toBe("SZ");
    expect(dataFetcherService.fetchRawData).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        provider: "infoway",
        capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
        symbols: ["000600.SZ"],
        options: expect.objectContaining({
          market: "SZ",
        }),
      }),
    );
  });

  it("delta: 合法 cursor 正常，并按 limit 返回分页增量", async () => {
    const { service, streamCache, chartIntradayStreamSubscriptionService } =
      createService();
    const baseMs = Date.parse("2026-01-15T15:00:00.000Z");
    const t1 = baseMs + 1000;
    const t2 = baseMs + 2000;

    streamCache.getData.mockResolvedValue([
      { s: "AAPL.US", t: t1, p: 100.1, v: 100 },
      { s: "AAPL.US", t: t2, p: 100.2, v: 200 },
      { s: "AAPL.US", t: baseMs + 3000, p: 100.3, v: 300 },
    ]);

    const first = await service.getDelta({
      symbol: "AAPL.US",
      cursor: createSignedCursor({
        symbol: "AAPL.US",
        market: "US",
        tradingDay: "20260115",
        provider: "infoway",
        lastPointTimestamp: new Date(baseMs).toISOString(),
      }),
      limit: 1,
    });

    expect(first.delta.points).toHaveLength(1);
    expect(first.delta.points[0].timestamp).toBe(new Date(t1).toISOString());
    expect(first.delta.hasMore).toBe(true);
    expect(
      chartIntradayStreamSubscriptionService.touchRealtimeOwnerLease,
    ).toHaveBeenCalledWith({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "anonymous:chart-intraday",
    });

    const second = await service.getDelta({
      symbol: "AAPL.US",
      cursor: first.delta.nextCursor,
      limit: 10,
    });

    expect(second.delta.points).toHaveLength(2);
    expect(second.delta.hasMore).toBe(false);
  });

  it("delta: provider-scoped 缓存缺失时，只能从 legacy 中回收同 provider 的点", async () => {
    const { service, streamCache } = createService();
    const baseMs = Date.parse("2026-01-15T15:00:00.000Z");

    streamCache.getData.mockImplementation(async (key: string) => {
      if (key === "quote:infoway:AAPL.US") {
        return [];
      }
      if (key === "quote:AAPL.US") {
        return [
          {
            s: "AAPL.US",
            t: baseMs + 1000,
            p: 301.1,
            v: 11,
            provider: "longport",
          },
          {
            s: "AAPL.US",
            t: baseMs + 2000,
            p: 301.2,
            v: 22,
            provider: "infoway",
          },
          { s: "AAPL.US", t: baseMs + 3000, p: 301.3, v: 33 },
        ];
      }
      return [];
    });

    const result = await service.getDelta({
      symbol: "AAPL.US",
      provider: "infoway",
      cursor: createSignedCursor({
        symbol: "AAPL.US",
        market: "US",
        tradingDay: "20260115",
        provider: "infoway",
        lastPointTimestamp: new Date(baseMs).toISOString(),
      }),
      limit: 10,
    });

    expect(streamCache.getData).toHaveBeenNthCalledWith(
      1,
      "quote:infoway:AAPL.US",
    );
    expect(streamCache.getData).toHaveBeenNthCalledWith(2, "quote:AAPL.US");
    expect(result.delta.points).toHaveLength(1);
    expect(result.delta.points[0]).toEqual({
      timestamp: new Date(baseMs + 2000).toISOString(),
      price: 301.2,
      volume: 22,
    });
  });

  it("delta: 同秒多笔实时点仅保留该秒最后一个点", async () => {
    const { service, streamCache } = createService();
    const baseMs = Date.parse("2026-01-15T15:00:00.000Z");

    streamCache.getData.mockResolvedValue([
      { s: "AAPL.US", t: baseMs + 1000, p: 100.1, v: 10 },
      { s: "AAPL.US", t: baseMs + 1500, p: 100.2, v: 20 },
      { s: "AAPL.US", t: baseMs + 2000, p: 100.3, v: 30 },
      { s: "AAPL.US", t: baseMs + 2800, p: 100.4, v: 40 },
    ]);

    const result = await service.getDelta({
      symbol: "AAPL.US",
      cursor: createSignedCursor({
        symbol: "AAPL.US",
        market: "US",
        tradingDay: "20260115",
        provider: "infoway",
        lastPointTimestamp: new Date(baseMs).toISOString(),
      }),
      limit: 10,
    });

    expect(result.delta.points).toHaveLength(2);
    expect(result.delta.points[0]).toEqual({
      timestamp: new Date(baseMs + 1000).toISOString(),
      price: 100.2,
      volume: 20,
    });
    expect(result.delta.points[1]).toEqual({
      timestamp: new Date(baseMs + 2000).toISOString(),
      price: 100.4,
      volume: 40,
    });
  });

  it("delta: 上游实时订阅建立失败时应返回 503，而不是空增量成功", async () => {
    const { service, chartIntradayStreamSubscriptionService } = createService();
    chartIntradayStreamSubscriptionService.touchRealtimeOwnerLease.mockRejectedValueOnce(
      new Error("stream subscribe failed"),
    );

    await expect(
      service.getDelta({
        symbol: "AAPL.US",
        cursor: createSignedCursor({
          symbol: "AAPL.US",
          market: "US",
          tradingDay: "20260115",
          provider: "infoway",
          lastPointTimestamp: "2026-01-15T15:00:00.000Z",
        }),
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: BusinessException.name,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
      }),
    );
  });

  it("release: 应释放当前 symbol 的内部实时订阅", async () => {
    const { service, chartIntradayStreamSubscriptionService } = createService();

    const result = await service.releaseRealtimeSubscription({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
    });

    expect(
      chartIntradayStreamSubscriptionService.releaseRealtimeOwnerLease,
    ).toHaveBeenCalledWith({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
      ownerIdentity: "anonymous:chart-intraday",
    });
    expect(result).toEqual({
      release: {
        leaseReleased: true,
        upstreamReleased: false,
        reason: "RELEASED",
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        activeLeaseCount: 0,
        graceExpiresAt: "2026-01-15T09:31:00.000Z",
      },
    });
  });

  it("release: CRYPTO 裸 pair 未传 market 时应自动推断并释放订阅", async () => {
    const { service, chartIntradayStreamSubscriptionService } = createService();
    chartIntradayStreamSubscriptionService.releaseRealtimeOwnerLease.mockResolvedValueOnce(
      {
        sessionReleased: true,
        upstreamReleased: false,
        reason: "RELEASED",
        symbol: "BTCUSDT",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_CRYPTO_QUOTE,
        clientId: "chart-intraday:auto:infoway:stream-crypto-quote:BTCUSDT",
        activeSessionCount: 0,
        graceExpiresAt: null,
      },
    );

    const result = await service.releaseRealtimeSubscription({
      symbol: "BTCUSDT",
      provider: "infoway",
    });

    expect(
      chartIntradayStreamSubscriptionService.releaseRealtimeOwnerLease,
    ).toHaveBeenCalledWith({
      symbol: "BTCUSDT",
      market: "CRYPTO",
      provider: "infoway",
      ownerIdentity: "anonymous:chart-intraday",
    });
    expect(result).toEqual({
      release: {
        leaseReleased: true,
        upstreamReleased: false,
        reason: "RELEASED",
        symbol: "BTCUSDT",
        market: "CRYPTO",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_CRYPTO_QUOTE,
        activeLeaseCount: 0,
        graceExpiresAt: null,
      },
    });
  });

  it("release: 已释放 session 应按幂等成功返回", async () => {
    const { service, chartIntradayStreamSubscriptionService } = createService();
    chartIntradayStreamSubscriptionService.releaseRealtimeOwnerLease.mockResolvedValueOnce(
      {
        sessionReleased: false,
        upstreamReleased: true,
        reason: "ALREADY_RELEASED",
        symbol: "AAPL.US",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        clientId: "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
        activeSessionCount: 0,
        graceExpiresAt: null,
      },
    );

    const result = await service.releaseRealtimeSubscription({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
    });

    expect(result).toEqual({
      release: {
        leaseReleased: false,
        upstreamReleased: true,
        reason: "ALREADY_RELEASED",
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        activeLeaseCount: 0,
        graceExpiresAt: null,
      },
    });
  });

  it("release: provider 缺失时应只释放唯一活跃 lease", async () => {
    const {
      service,
      chartIntradayStreamSubscriptionService,
      chartIntradayRuntimeOrchestratorService,
    } = createService();
    chartIntradayStreamSubscriptionService.releaseRealtimeOwnerLease.mockResolvedValueOnce(
      {
        sessionReleased: true,
        upstreamReleased: false,
        reason: "RELEASED",
        symbol: "AAPL.US",
        provider: "longport",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        clientId: "chart-intraday:auto:longport:stream-stock-quote:AAPL.US",
        activeSessionCount: 0,
        graceExpiresAt: null,
      },
    );

    const result = await service.releaseRealtimeSubscription({
      symbol: "AAPL.US",
      market: "US",
    });

    expect(
      chartIntradayStreamSubscriptionService.releaseRealtimeOwnerLease,
    ).toHaveBeenCalledWith({
      symbol: "AAPL.US",
      market: "US",
      provider: undefined,
      ownerIdentity: "anonymous:chart-intraday",
    });
    expect(
      chartIntradayRuntimeOrchestratorService.handleRelease,
    ).toHaveBeenCalledWith({
      symbol: "AAPL.US",
      market: "US",
      provider: "longport",
      activeSessionCount: 0,
    });
    expect(result.release.provider).toBe("longport");
  });

  it("release: provider 缺失且命中多个 provider 活跃 lease 时返回 409", async () => {
    const {
      service,
      chartIntradayStreamSubscriptionService,
      chartIntradayRuntimeOrchestratorService,
    } = createService();
    chartIntradayStreamSubscriptionService.releaseRealtimeOwnerLease.mockRejectedValueOnce(
      new Error("OWNER_LEASE_AMBIGUOUS"),
    );

    await expect(
      service.releaseRealtimeSubscription({
        symbol: "AAPL.US",
        market: "US",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: BusinessException.name,
        errorCode: BusinessErrorCode.RESOURCE_CONFLICT,
        message:
          "LEASE_CONFLICT: 当前存在多个 provider 的活跃分时图租约，请显式指定 provider 后重试",
      }),
    );
    expect(
      chartIntradayStreamSubscriptionService.releaseRealtimeOwnerLease,
    ).toHaveBeenCalledWith({
      symbol: "AAPL.US",
      market: "US",
      provider: undefined,
      ownerIdentity: "anonymous:chart-intraday",
    });
    expect(
      chartIntradayRuntimeOrchestratorService.handleRelease,
    ).not.toHaveBeenCalled();
  });

  it("release: session 冲突类错误应映射为 409 SESSION_CONFLICT", async () => {
    const { service, chartIntradayStreamSubscriptionService } = createService();
    chartIntradayStreamSubscriptionService.releaseRealtimeOwnerLease.mockRejectedValueOnce(
      new Error("SESSION_OWNER_MISMATCH"),
    );

    await expect(
      service.releaseRealtimeSubscription({
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: BusinessException.name,
        errorCode: BusinessErrorCode.RESOURCE_CONFLICT,
      }),
    );
  });

  it("release: SESSION_RELEASE_IN_PROGRESS 不应误映射为 SESSION_CONFLICT", async () => {
    const { service, chartIntradayStreamSubscriptionService } = createService();
    chartIntradayStreamSubscriptionService.releaseRealtimeOwnerLease.mockRejectedValueOnce(
      new Error("SESSION_RELEASE_IN_PROGRESS"),
    );

    await expect(
      service.releaseRealtimeSubscription({
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: BusinessException.name,
        errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
        message: "RELEASE_IN_PROGRESS: 当前租约释放正在处理中，请稍后重试",
      }),
    );
  });

  it("release: 真实上游退订失败不应误报为 SESSION_CONFLICT", async () => {
    const { service, chartIntradayStreamSubscriptionService } = createService();
    const upstreamError = new Error("unsubscribe failed");
    chartIntradayStreamSubscriptionService.releaseRealtimeOwnerLease.mockRejectedValueOnce(
      upstreamError,
    );

    await expect(
      service.releaseRealtimeSubscription({
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
      }),
    ).rejects.toBe(upstreamError);
  });

  it("delta: cursor 与请求上下文不匹配时返回 CURSOR_EXPIRED", async () => {
    const { service } = createService();

    await expect(
      service.getDelta({
        symbol: "MSFT.US",
        cursor: createSignedCursor({
          symbol: "AAPL.US",
          market: "US",
          tradingDay: "20260115",
          provider: "infoway",
          lastPointTimestamp: "2026-01-15T15:00:00.000Z",
        }),
        limit: 10,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: BusinessException.name,
      }),
    );
  });

  it("delta: 显式 market 与 symbol 可推断市场不一致时返回 400", async () => {
    const { service } = createService();

    expect.assertions(3);
    try {
      await service.getDelta({
        symbol: "AAPL.US",
        market: "HK",
        cursor: createSignedCursor({
          symbol: "AAPL.US",
          market: "US",
          tradingDay: "20260115",
          provider: "infoway",
          lastPointTimestamp: "2026-01-15T15:00:00.000Z",
        }),
      });
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).getStatus()).toBe(400);
      expect((error as Error).message).toContain(
        "market 与 symbol 推断市场不一致",
      );
    }
  });

  it("delta: strictProviderConsistency=true 时 provider 不一致应拒绝", async () => {
    const { service } = createService();

    await expect(
      service.getDelta({
        symbol: "AAPL.US",
        provider: "longport",
        cursor: createSignedCursor({
          symbol: "AAPL.US",
          market: "US",
          tradingDay: "20260115",
          provider: "infoway",
          lastPointTimestamp: "2026-01-15T15:00:00.000Z",
        }),
        strictProviderConsistency: true,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: BusinessException.name,
      }),
    );
  });

  it("delta: cursor 被篡改（签名不匹配）应拒绝", async () => {
    const { service } = createService();
    const validCursor = createSignedCursor({
      symbol: "AAPL.US",
      market: "US",
      tradingDay: "20260115",
      provider: "infoway",
      lastPointTimestamp: "2026-01-15T15:00:00.000Z",
    });
    const decoded = decodeCursor(validCursor);
    const tampered = encodeCursor({
      ...decoded,
      tradingDay: "20990101",
    });

    await expect(
      service.getDelta({
        symbol: "AAPL.US",
        cursor: tampered,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: BusinessException.name,
      }),
    );
  });

  it("delta: issuedAt 过度超前（超出允许漂移）应拒绝", async () => {
    const secret = "chart-intraday-future-secret";
    const { service } = createService({ secret });
    const futureIssuedAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const payload = {
      v: 1,
      symbol: "AAPL.US",
      market: "US",
      tradingDay: "20260101",
      provider: "infoway",
      lastPointTimestamp: new Date(Date.now() - 1000).toISOString(),
      issuedAt: futureIssuedAt,
    };
    const cursor = encodeCursor({
      ...payload,
      sig: signCursorPayload(payload, secret),
    });

    await expect(
      service.getDelta({
        symbol: "AAPL.US",
        market: "US",
        cursor,
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        name: BusinessException.name,
      }),
    );
  });

  it("delta: 无 cursor 时返回 400", async () => {
    const { service } = createService();

    expect.assertions(2);
    try {
      await service.getDelta({
        symbol: "AAPL.US",
      } as any);
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).getStatus()).toBe(400);
    }
  });

  it("delta: 超长 cursor 时返回 400", async () => {
    const { service } = createService();

    expect.assertions(2);
    try {
      await service.getDelta({
        symbol: "AAPL.US",
        cursor: "a".repeat(4097),
      });
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).getStatus()).toBe(400);
    }
  });

  it("delta: 仅 since 时按缺少 cursor 处理", async () => {
    const { service } = createService();

    expect.assertions(3);
    try {
      await service.getDelta({
        symbol: "AAPL.US",
        since: new Date().toISOString(),
      } as any);
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).getStatus()).toBe(400);
      expect((error as Error).message).toContain(
        "delta 请求必须提供带 sig 的 cursor",
      );
    }
  });

  it("delta: WS -> HTTP 桥接时可直接消费带 sig 的 cursor", async () => {
    const { service, streamCache } = createService();
    const wsPointMs = Date.parse("2026-01-15T15:00:00.000Z");
    const t1 = wsPointMs + 1000;
    const t2 = wsPointMs + 2000;
    streamCache.getData.mockResolvedValue([
      { s: "AAPL.US", t: t1, p: 201.1, v: 11 },
      { s: "AAPL.US", t: t2, p: 201.2, v: 22 },
    ]);

    const result = await service.getDelta({
      symbol: "AAPL.US",
      cursor: createSignedCursor({
        symbol: "AAPL.US",
        market: "US",
        tradingDay: "20260115",
        lastPointTimestamp: new Date(wsPointMs).toISOString(),
      }),
      limit: 10,
    });

    expect(result.delta.points).toHaveLength(2);
    expect(result.delta.points[0].timestamp).toBe(new Date(t1).toISOString());
    expect(result.delta.hasMore).toBe(false);
  });

  it("snapshot: frozen 模式命中请求日冻结快照时不回源上游", async () => {
    const {
      service,
      dataFetcherService,
      chartIntradayFrozenSnapshotService,
      chartIntradayRuntimeOrchestratorService,
      chartIntradayStreamSubscriptionService,
    } = createService();
    chartIntradayRuntimeOrchestratorService.decideRuntime.mockResolvedValue({
      mode: "frozen",
      reason: "MARKET_CLOSED",
      market: "US",
      requestedTradingDay: "20260317",
      currentTradingDay: "20260317",
      marketStatus: "MARKET_CLOSED",
      timezone: "America/New_York",
      nextSessionStart: null,
    });
    chartIntradayFrozenSnapshotService.findSnapshot.mockResolvedValue({
      effectiveTradingDay: "20260317",
      fallback: false,
      payload: {
        line: {
          symbol: "AAPL.US",
          market: "US",
          tradingDay: "20260317",
          granularity: "1s",
          points: [
            {
              timestamp: "2026-03-17T15:59:59.000Z",
              price: 101.2,
              volume: 100,
            },
          ],
        },
        capability: {
          snapshotBaseGranularity: "1m",
          supportsFullDay1sHistory: false,
        },
        reference: {
          previousClosePrice: 100.5,
          sessionOpenPrice: 100.8,
          priceBase: "previous_close",
          marketSession: "regular",
          timezone: "America/New_York",
          status: "complete",
        },
        metadata: {
          provider: "infoway",
          historyPoints: 240,
          realtimeMergedPoints: 0,
          deduplicatedPoints: 0,
        },
        storedAt: "2026-03-14T16:00:00.000Z",
      },
    });

    const result = await service.getSnapshot({
      symbol: "AAPL.US",
      market: "US",
      tradingDay: "20260317",
      provider: "infoway",
    });

    expect(dataFetcherService.fetchRawData).not.toHaveBeenCalled();
    expect(chartIntradayFrozenSnapshotService.findSnapshot).toHaveBeenCalledWith({
      provider: "infoway",
      market: "US",
      symbol: "AAPL.US",
      tradingDay: "20260317",
      allowPreviousTradingDayFallback: false,
    });
    expect(
      chartIntradayStreamSubscriptionService.openPassiveOwnerLease,
    ).toHaveBeenCalledTimes(1);
    expect(result.metadata.runtimeMode).toBe("frozen");
    expect(result.metadata.frozenSnapshotHit).toBe(true);
    expect(result.metadata.frozenSnapshotFallback).toBe(false);
    expect(result.metadata.effectiveTradingDay).toBe("20260317");
    expect(result.line.tradingDay).toBe("20260317");
  });

  it("snapshot: frozen 模式未命中请求日冻结快照时应返回空快照降级且不回源", async () => {
    const {
      service,
      dataFetcherService,
      chartIntradayFrozenSnapshotService,
      chartIntradayRuntimeOrchestratorService,
      chartIntradayStreamSubscriptionService,
    } = createService();
    chartIntradayRuntimeOrchestratorService.decideRuntime.mockResolvedValue({
      mode: "frozen",
      reason: "MARKET_CLOSED",
      market: "US",
      requestedTradingDay: "20260317",
      currentTradingDay: "20260317",
      marketStatus: "MARKET_CLOSED",
      timezone: "America/New_York",
      nextSessionStart: null,
    });
    chartIntradayFrozenSnapshotService.findSnapshot.mockResolvedValue({
      effectiveTradingDay: "20260314",
      fallback: true,
      payload: {
        line: {
          symbol: "AAPL.US",
          market: "US",
          tradingDay: "20260314",
          granularity: "1s",
          points: [
            {
              timestamp: "2026-03-14T15:59:59.000Z",
              price: 99.1,
              volume: 10,
            },
          ],
        },
        capability: {
          snapshotBaseGranularity: "1m",
          supportsFullDay1sHistory: false,
        },
        reference: {
          previousClosePrice: 98.5,
          sessionOpenPrice: 98.8,
          priceBase: "previous_close",
          marketSession: "regular",
          timezone: "America/New_York",
          status: "complete",
        },
        metadata: {
          provider: "infoway",
          historyPoints: 240,
          realtimeMergedPoints: 0,
          deduplicatedPoints: 0,
        },
        storedAt: "2026-03-14T16:00:00.000Z",
      },
    });

    const result = await service.getSnapshot({
      symbol: "AAPL.US",
      market: "US",
      tradingDay: "20260317",
      provider: "infoway",
    });

    const decodedCursor = decodeCursor(result.sync.cursor);

    expect(dataFetcherService.fetchRawData).not.toHaveBeenCalled();
    expect(
      chartIntradayStreamSubscriptionService.openPassiveOwnerLease,
    ).toHaveBeenCalledTimes(1);
    expect(chartIntradayFrozenSnapshotService.writeSnapshot).not.toHaveBeenCalled();
    expect(result.metadata.runtimeMode).toBe("frozen");
    expect(result.metadata.frozenSnapshotHit).toBe(false);
    expect(result.metadata.frozenSnapshotFallback).toBe(false);
    expect(result.metadata.effectiveTradingDay).toBe("20260317");
    expect(result.metadata.historyPoints).toBe(0);
    expect(result.metadata.realtimeMergedPoints).toBe(0);
    expect(result.metadata.deduplicatedPoints).toBe(0);
    expect(result.line.tradingDay).toBe("20260317");
    expect(result.line.points).toEqual([]);
    expect(result.reference.status).toBe("unavailable");
    expect(result.sync.lastPointTimestamp).toBe("2026-03-17T04:00:00.000Z");
    expect(decodedCursor.lastPointTimestamp).toBe(result.sync.lastPointTimestamp);
    expect(decodedCursor.tradingDay).toBe("20260317");
  });

  it("snapshot: frozen 模式遇到 fallback=true 且请求日匹配时仍应忽略快照并返回空快照", async () => {
    const {
      service,
      dataFetcherService,
      chartIntradayFrozenSnapshotService,
      chartIntradayRuntimeOrchestratorService,
      chartIntradayStreamSubscriptionService,
    } = createService();
    chartIntradayRuntimeOrchestratorService.decideRuntime.mockResolvedValue({
      mode: "frozen",
      reason: "MARKET_CLOSED",
      market: "US",
      requestedTradingDay: "20260317",
      currentTradingDay: "20260317",
      marketStatus: "MARKET_CLOSED",
      timezone: "America/New_York",
      nextSessionStart: null,
    });
    chartIntradayFrozenSnapshotService.findSnapshot.mockResolvedValue({
      effectiveTradingDay: "20260317",
      fallback: true,
      payload: {
        line: {
          symbol: "AAPL.US",
          market: "US",
          tradingDay: "20260317",
          granularity: "1s",
          points: [
            {
              timestamp: "2026-03-17T15:59:59.000Z",
              price: 101.2,
              volume: 100,
            },
          ],
        },
        capability: {
          snapshotBaseGranularity: "1m",
          supportsFullDay1sHistory: false,
        },
        reference: {
          previousClosePrice: 100.5,
          sessionOpenPrice: 100.8,
          priceBase: "previous_close",
          marketSession: "regular",
          timezone: "America/New_York",
          status: "complete",
        },
        metadata: {
          provider: "infoway",
          historyPoints: 240,
          realtimeMergedPoints: 0,
          deduplicatedPoints: 0,
        },
        storedAt: "2026-03-17T16:00:00.000Z",
      },
    });

    const result = await service.getSnapshot({
      symbol: "AAPL.US",
      market: "US",
      tradingDay: "20260317",
      provider: "infoway",
    });

    expect(dataFetcherService.fetchRawData).not.toHaveBeenCalled();
    expect(
      chartIntradayStreamSubscriptionService.openPassiveOwnerLease,
    ).toHaveBeenCalledTimes(1);
    expect(result.metadata.runtimeMode).toBe("frozen");
    expect(result.metadata.frozenSnapshotHit).toBe(false);
    expect(result.line.points).toEqual([]);
    expect(result.reference.status).toBe("unavailable");
    expect(result.sync.lastPointTimestamp).toBe("2026-03-17T04:00:00.000Z");
  });

  it("snapshot: frozen 模式遇到 effectiveTradingDay 不匹配且 fallback=false 时仍应忽略快照并返回空快照", async () => {
    const {
      service,
      dataFetcherService,
      chartIntradayFrozenSnapshotService,
      chartIntradayRuntimeOrchestratorService,
      chartIntradayStreamSubscriptionService,
    } = createService();
    chartIntradayRuntimeOrchestratorService.decideRuntime.mockResolvedValue({
      mode: "frozen",
      reason: "MARKET_CLOSED",
      market: "US",
      requestedTradingDay: "20260317",
      currentTradingDay: "20260317",
      marketStatus: "MARKET_CLOSED",
      timezone: "America/New_York",
      nextSessionStart: null,
    });
    chartIntradayFrozenSnapshotService.findSnapshot.mockResolvedValue({
      effectiveTradingDay: "20260316",
      fallback: false,
      payload: {
        line: {
          symbol: "AAPL.US",
          market: "US",
          tradingDay: "20260316",
          granularity: "1s",
          points: [
            {
              timestamp: "2026-03-16T15:59:59.000Z",
              price: 99.9,
              volume: 88,
            },
          ],
        },
        capability: {
          snapshotBaseGranularity: "1m",
          supportsFullDay1sHistory: false,
        },
        reference: {
          previousClosePrice: 99.1,
          sessionOpenPrice: 99.5,
          priceBase: "previous_close",
          marketSession: "regular",
          timezone: "America/New_York",
          status: "complete",
        },
        metadata: {
          provider: "infoway",
          historyPoints: 240,
          realtimeMergedPoints: 0,
          deduplicatedPoints: 0,
        },
        storedAt: "2026-03-16T16:00:00.000Z",
      },
    });

    const result = await service.getSnapshot({
      symbol: "AAPL.US",
      market: "US",
      tradingDay: "20260317",
      provider: "infoway",
    });

    expect(dataFetcherService.fetchRawData).not.toHaveBeenCalled();
    expect(
      chartIntradayStreamSubscriptionService.openPassiveOwnerLease,
    ).toHaveBeenCalledTimes(1);
    expect(result.metadata.runtimeMode).toBe("frozen");
    expect(result.metadata.frozenSnapshotHit).toBe(false);
    expect(result.metadata.effectiveTradingDay).toBe("20260317");
    expect(result.line.points).toEqual([]);
    expect(result.reference.status).toBe("unavailable");
    expect(result.sync.lastPointTimestamp).toBe("2026-03-17T04:00:00.000Z");
  });

  it("snapshot: paused 模式未命中请求日冻结快照时应返回空快照降级且不回源", async () => {
    const {
      service,
      dataFetcherService,
      streamCache,
      chartIntradayFrozenSnapshotService,
      chartIntradayRuntimeOrchestratorService,
      chartIntradayStreamSubscriptionService,
    } = createService();
    chartIntradayRuntimeOrchestratorService.decideRuntime.mockResolvedValue({
      mode: "paused",
      reason: "LUNCH_BREAK",
      market: "CN",
      requestedTradingDay: "20260317",
      currentTradingDay: "20260317",
      marketStatus: "LUNCH_BREAK",
      timezone: "Asia/Shanghai",
      nextSessionStart: "2026-03-17T05:00:00.000Z",
    });
    chartIntradayFrozenSnapshotService.findSnapshot.mockResolvedValue(null);

    const result = await service.getSnapshot({
      symbol: "000001.SZ",
      market: "SZ",
      tradingDay: "20260317",
      provider: "infoway",
    });

    const decodedCursor = decodeCursor(result.sync.cursor);

    expect(dataFetcherService.fetchRawData).not.toHaveBeenCalled();
    expect(streamCache.getData).not.toHaveBeenCalled();
    expect(
      chartIntradayStreamSubscriptionService.openPassiveOwnerLease,
    ).toHaveBeenCalledTimes(1);
    expect(result.metadata.runtimeMode).toBe("paused");
    expect(result.line.points).toEqual([]);
    expect(result.reference.status).toBe("unavailable");
    expect(result.sync.lastPointTimestamp).toBe("2026-03-16T16:00:00.000Z");
    expect(decodedCursor.symbol).toBe("000001.SZ");
    expect(decodedCursor.market).toBe("SZ");
    expect(decodedCursor.tradingDay).toBe("20260317");
    expect(decodedCursor.provider).toBe("infoway");
    expect(decodedCursor.lastPointTimestamp).toBe(result.sync.lastPointTimestamp);
  });

  it("delta: paused 模式直接返回空增量且不读取实时缓存", async () => {
    const {
      service,
      streamCache,
      chartIntradayRuntimeOrchestratorService,
      chartIntradayStreamSubscriptionService,
    } = createService();
    chartIntradayRuntimeOrchestratorService.decideRuntime.mockResolvedValue({
      mode: "paused",
      reason: "LUNCH_BREAK",
      market: "CN",
      requestedTradingDay: "20260317",
      currentTradingDay: "20260317",
      marketStatus: "LUNCH_BREAK",
      timezone: "Asia/Shanghai",
      nextSessionStart: "2026-03-17T05:00:00.000Z",
    });

    const result = await service.getDelta({
      symbol: "000001.SZ",
      market: "SZ",
      tradingDay: "20260317",
      provider: "infoway",
      cursor: createSignedCursor({
        symbol: "000001.SZ",
        market: "SZ",
        tradingDay: "20260317",
        provider: "infoway",
        lastPointTimestamp: "2026-03-17T03:29:59.000Z",
      }),
    });

    expect(
      chartIntradayStreamSubscriptionService.touchPassiveOwnerLease,
    ).toHaveBeenCalledTimes(1);
    expect(streamCache.getData).not.toHaveBeenCalled();
    expect(result.delta.points).toEqual([]);
    expect(result.delta.hasMore).toBe(false);
    expect(result.delta.lastPointTimestamp).toBe("2026-03-17T03:29:59.000Z");
  });

  it("delta: frozen 模式应接受空 snapshot 的 cursor 并返回空增量且不读取实时缓存", async () => {
    const {
      service,
      streamCache,
      chartIntradayFrozenSnapshotService,
      chartIntradayRuntimeOrchestratorService,
      chartIntradayStreamSubscriptionService,
    } = createService();
    chartIntradayRuntimeOrchestratorService.decideRuntime.mockResolvedValue({
      mode: "frozen",
      reason: "MARKET_CLOSED",
      market: "US",
      requestedTradingDay: "20260317",
      currentTradingDay: "20260317",
      marketStatus: "MARKET_CLOSED",
      timezone: "America/New_York",
      nextSessionStart: null,
    });
    chartIntradayFrozenSnapshotService.findSnapshot.mockResolvedValue(null);

    const snapshot = await service.getSnapshot({
      symbol: "AAPL.US",
      market: "US",
      tradingDay: "20260317",
      provider: "infoway",
    });

    const result = await service.getDelta({
      symbol: "AAPL.US",
      market: "US",
      tradingDay: "20260317",
      provider: "infoway",
      cursor: snapshot.sync.cursor,
    });

    expect(
      chartIntradayStreamSubscriptionService.openPassiveOwnerLease,
    ).toHaveBeenCalledTimes(1);
    expect(
      chartIntradayStreamSubscriptionService.touchPassiveOwnerLease,
    ).toHaveBeenCalledTimes(1);
    expect(streamCache.getData).not.toHaveBeenCalled();
    expect(result.delta.points).toEqual([]);
    expect(result.delta.hasMore).toBe(false);
    expect(result.delta.lastPointTimestamp).toBe(snapshot.sync.lastPointTimestamp);
  });
});

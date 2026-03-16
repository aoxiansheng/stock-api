import { ChartIntradayCursorService } from "@core/03-fetching/chart-intraday/services/chart-intraday-cursor.service";
import { ChartIntradayReadService } from "@core/03-fetching/chart-intraday/services/chart-intraday-read.service";
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
      ensureRealtimeSubscription: jest.fn().mockResolvedValue(undefined),
      releaseRealtimeSubscription: jest.fn().mockResolvedValue({
        released: true,
        symbol: "AAPL.US",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        clientId: "chart-intraday:auto:infoway:stream-stock-quote:AAPL.US",
      }),
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
      chartIntradayStreamSubscriptionService.ensureRealtimeSubscription,
    ).toHaveBeenCalledWith({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
    });
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

  it("snapshot: provider 拉取失败时返回 503", async () => {
    const { service, dataFetcherService } = createService();
    dataFetcherService.fetchRawData.mockRejectedValue(
      new Error("provider unavailable"),
    );

    expect.assertions(1);
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

  it("snapshot: 历史基线重试后仍失败时应直接返回失败", async () => {
    const { service, dataFetcherService, streamCache } = createService();
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

    chartIntradayStreamSubscriptionService.ensureRealtimeSubscription.mockResolvedValue(
      undefined,
    );
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
      chartIntradayStreamSubscriptionService.ensureRealtimeSubscription,
    ).toHaveBeenCalledWith({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
    });

    const second = await service.getDelta({
      symbol: "AAPL.US",
      cursor: first.delta.nextCursor,
      limit: 10,
    });

    expect(second.delta.points).toHaveLength(2);
    expect(second.delta.hasMore).toBe(false);
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

  it("release: 应释放当前 symbol 的内部实时订阅", async () => {
    const { service, chartIntradayStreamSubscriptionService } = createService();

    const result = await service.releaseRealtimeSubscription({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
    });

    expect(
      chartIntradayStreamSubscriptionService.releaseRealtimeSubscription,
    ).toHaveBeenCalledWith({
      symbol: "AAPL.US",
      market: "US",
      provider: "infoway",
    });
    expect(result).toEqual({
      release: {
        released: true,
        symbol: "AAPL.US",
        market: "US",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
      },
    });
  });

  it("release: CRYPTO 裸 pair 未传 market 时应自动推断并释放订阅", async () => {
    const { service, chartIntradayStreamSubscriptionService } = createService();
    chartIntradayStreamSubscriptionService.releaseRealtimeSubscription.mockResolvedValueOnce(
      {
        released: true,
        symbol: "BTCUSDT",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_CRYPTO_QUOTE,
        clientId: "chart-intraday:auto:infoway:stream-crypto-quote:BTCUSDT",
      },
    );

    const result = await service.releaseRealtimeSubscription({
      symbol: "BTCUSDT",
      provider: "infoway",
    });

    expect(
      chartIntradayStreamSubscriptionService.releaseRealtimeSubscription,
    ).toHaveBeenCalledWith({
      symbol: "BTCUSDT",
      market: "CRYPTO",
      provider: "infoway",
    });
    expect(result).toEqual({
      release: {
        released: true,
        symbol: "BTCUSDT",
        market: "CRYPTO",
        provider: "infoway",
        wsCapabilityType: CAPABILITY_NAMES.STREAM_CRYPTO_QUOTE,
      },
    });
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
});

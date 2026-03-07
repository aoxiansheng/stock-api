jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  sanitizeLogData: (data: unknown) => data,
}));

import {
  CAPABILITY_NAMES,
  GET_STOCK_HISTORY_SINGLE_SYMBOL_ERROR,
} from "@providersv2/providers/constants/capability-names.constants";
import {
  BusinessErrorCode,
  BusinessException,
  ComponentIdentifier,
} from "@common/core/exceptions";
import { ReceiverService } from "@core/01-entry/receiver/services/receiver.service";
import { StorageClassification } from "@core/shared/types/storage-classification.enum";

const HISTORY_TIMESTAMP_FORMAT_ERROR =
  "timestamp 仅支持 10 位秒或 13 位毫秒时间戳";

describe("ReceiverService get-stock-history pipeline", () => {
  function createReceiverService() {
    const symbolTransformerService = {
      transformSymbolsForProvider: jest.fn(),
    };

    const dataFetcherService = {
      fetchRawData: jest.fn(),
    };

    const dataTransformerService = {
      transform: jest.fn(),
    };

    const storageService = {
      storeData: jest.fn().mockResolvedValue(undefined),
    };

    const contextService = { name: "infoway-context" };
    const capabilityRegistryService = {
      getBestProvider: jest.fn().mockReturnValue("infoway"),
      getProvider: jest.fn().mockReturnValue({
        getContextService: () => contextService,
      }),
    };

    const marketStatusService = {
      getBatchMarketStatus: jest.fn().mockResolvedValue({}),
    };

    const marketInferenceService = {
      inferMarket: jest.fn().mockReturnValue("US"),
      inferDominantMarket: jest.fn().mockReturnValue("US"),
      inferMarkets: jest.fn().mockReturnValue(["US"]),
    };

    const smartCacheOrchestrator = {
      getDataWithSmartCache: jest.fn(),
    };

    const service = new ReceiverService(
      symbolTransformerService as any,
      dataFetcherService as any,
      dataTransformerService as any,
      storageService as any,
      capabilityRegistryService as any,
      marketStatusService as any,
      marketInferenceService as any,
      smartCacheOrchestrator as any,
    );

    return {
      service,
      symbolTransformerService,
      dataFetcherService,
      dataTransformerService,
      storageService,
      contextService,
      capabilityRegistryService,
      marketStatusService,
      marketInferenceService,
      smartCacheOrchestrator,
    };
  }

  it("get-stock-history 必走 Transformer（candle_fields），且写入 STOCK_CANDLE", async () => {
    const {
      service,
      dataFetcherService,
      dataTransformerService,
      storageService,
      contextService,
    } = createReceiverService();

    const rawData = [
      {
        symbol: "AAPL.US",
        rawOnly: true,
        lastPrice: 100,
      },
    ];

    const transformedData = [
      {
        symbol: "AAPL.US",
        transformedOnly: true,
        lastPrice: 101,
      },
    ];

    dataFetcherService.fetchRawData.mockResolvedValue({
      data: rawData,
      metadata: {
        provider: "infoway",
        capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
        processingTimeMs: 3,
        symbolsProcessed: 1,
      },
    });

    dataTransformerService.transform.mockResolvedValue({
      transformedData,
      metadata: {},
    });

    const request = {
      symbols: ["AAPL.US"],
      receiverType: CAPABILITY_NAMES.GET_STOCK_HISTORY,
      options: {
        market: "US",
      },
    } as any;

    const mappedSymbols = {
      transformedSymbols: ["AAPL.US"],
      mappingResults: {
        transformedSymbols: {
          "AAPL.US": "AAPL.US",
        },
        failedSymbols: [],
        metadata: {
          provider: "infoway",
          totalSymbols: 1,
          successfulTransformations: 1,
          failedTransformations: 0,
          processingTimeMs: 1,
        },
      },
    } as any;

    const marketContext = {
      primaryMarket: "US",
      marketType: "US",
      markets: ["US"],
      candidates: ["US", "*"],
    };

    const response = await (service as any).executeDataFetching(
      request,
      "infoway",
      mappedSymbols,
      "request-history-1",
      marketContext,
    );

    expect(dataFetcherService.fetchRawData).toHaveBeenCalledTimes(1);
    expect(dataFetcherService.fetchRawData).toHaveBeenCalledWith(
      expect.objectContaining({
        contextService,
        capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
      }),
    );

    expect(dataTransformerService.transform).toHaveBeenCalledTimes(1);
    expect(dataTransformerService.transform).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "infoway",
        transDataRuleListType: "candle_fields",
        rawData,
        marketType: "US",
      }),
    );

    expect(storageService.storeData).toHaveBeenCalledTimes(1);
    expect(storageService.storeData).toHaveBeenCalledWith(
      expect.objectContaining({
        storageClassification: StorageClassification.STOCK_CANDLE,
        data: transformedData,
      }),
    );

    expect(response.data).toEqual(transformedData);
    expect(response.data[0].transformedOnly).toBe(true);
    expect(response.data[0].rawOnly).toBeUndefined();
  });

  it("get-stock-history 在 Receiver 前置校验阶段强制单标的", async () => {
    const { service } = createReceiverService();

    await expect(
      (service as any).validateRequest(
        {
          symbols: ["AAPL.US", "MSFT.US"],
          receiverType: CAPABILITY_NAMES.GET_STOCK_HISTORY,
          options: {
            market: "US",
          },
        },
        "request-history-invalid",
      ),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      message: GET_STOCK_HISTORY_SINGLE_SYMBOL_ERROR,
      context: {
        errors: expect.arrayContaining([GET_STOCK_HISTORY_SINGLE_SYMBOL_ERROR]),
      },
    });
  });

  it("非 get-stock-history 请求携带 klineNum/timestamp 时在前置校验阶段拦截", async () => {
    const { service } = createReceiverService();

    await expect(
      (service as any).validateRequest(
        {
          symbols: ["AAPL.US"],
          receiverType: CAPABILITY_NAMES.GET_STOCK_QUOTE,
          options: {
            market: "US",
            klineNum: 120,
            timestamp: 1758553860,
          },
        },
        "request-history-options-invalid",
      ),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      message: "klineNum/timestamp 仅允许在 get-stock-history 请求中使用",
      context: {
        errors: expect.arrayContaining([
          "klineNum/timestamp 仅允许在 get-stock-history 请求中使用",
        ]),
      },
    });
  });

  it("get-stock-history 请求携带 11/12 位 timestamp 时在前置校验阶段拦截", async () => {
    const { service } = createReceiverService();

    await expect(
      (service as any).validateRequest(
        {
          symbols: ["AAPL.US"],
          receiverType: CAPABILITY_NAMES.GET_STOCK_HISTORY,
          options: {
            market: "US",
            timestamp: 17092512600,
            klineNum: 120,
          },
        },
        "request-history-timestamp-invalid",
      ),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      message: HISTORY_TIMESTAMP_FORMAT_ERROR,
      context: {
        errors: expect.arrayContaining([HISTORY_TIMESTAMP_FORMAT_ERROR]),
      },
    });
  });

  it("executeDataFetching 对非 history 请求会剔除 klineNum/timestamp", async () => {
    const {
      service,
      dataFetcherService,
      dataTransformerService,
    } = createReceiverService();

    dataFetcherService.fetchRawData.mockResolvedValue({
      data: [{ symbol: "AAPL.US", price: 100 }],
      metadata: {
        provider: "infoway",
        capability: CAPABILITY_NAMES.GET_STOCK_QUOTE,
        processingTimeMs: 3,
        symbolsProcessed: 1,
      },
    });

    dataTransformerService.transform.mockResolvedValue({
      transformedData: [{ symbol: "AAPL.US", price: 100 }],
      metadata: {},
    });

    await (service as any).executeDataFetching(
      {
        symbols: ["AAPL.US"],
        receiverType: CAPABILITY_NAMES.GET_STOCK_QUOTE,
        options: {
          market: "US",
          realtime: true,
          klineNum: 240,
          timestamp: 1758553860,
        },
      } as any,
      "infoway",
      {
        transformedSymbols: ["AAPL.US"],
        mappingResults: {
          transformedSymbols: {
            "AAPL.US": "AAPL.US",
          },
          failedSymbols: [],
          metadata: {
            provider: "infoway",
            totalSymbols: 1,
            successfulTransformations: 1,
            failedTransformations: 0,
            processingTimeMs: 1,
          },
        },
      } as any,
      "request-quote-sanitize-options",
      {
        primaryMarket: "US",
        marketType: "US",
        markets: ["US"],
        candidates: ["US", "*"],
      },
    );

    expect(dataFetcherService.fetchRawData).toHaveBeenCalledWith(
      expect.objectContaining({
        capability: CAPABILITY_NAMES.GET_STOCK_QUOTE,
      }),
    );

    const fetchOptions = dataFetcherService.fetchRawData.mock.calls[0][0]
      .options;
    expect(fetchOptions).toMatchObject({
      market: "US",
      realtime: true,
    });
    expect(fetchOptions).not.toHaveProperty("klineNum");
    expect(fetchOptions).not.toHaveProperty("timestamp");
  });

  it("executeDataFetching 遇到 BusinessException 时直接透传，不包装为 EXTERNAL_API_ERROR", async () => {
    const { service, dataFetcherService } = createReceiverService();

    const upstreamValidationError = new BusinessException({
      message: "上游参数错误",
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: "fetchRawData",
      component: ComponentIdentifier.DATA_FETCHER,
      context: { reason: "timestamp invalid" },
    });

    dataFetcherService.fetchRawData.mockRejectedValue(upstreamValidationError);

    await expect(
      (service as any).executeDataFetching(
        {
          symbols: ["AAPL.US"],
          receiverType: CAPABILITY_NAMES.GET_STOCK_HISTORY,
          options: {
            market: "US",
            timestamp: 1758553860,
          },
        } as any,
        "infoway",
        {
          transformedSymbols: ["AAPL.US"],
          mappingResults: {
            transformedSymbols: {
              "AAPL.US": "AAPL.US",
            },
            failedSymbols: [],
            metadata: {
              provider: "infoway",
              totalSymbols: 1,
              successfulTransformations: 1,
              failedTransformations: 0,
              processingTimeMs: 1,
            },
          },
        } as any,
        "request-history-upstream-validation-error",
        {
          primaryMarket: "US",
          marketType: "US",
          markets: ["US"],
          candidates: ["US", "*"],
        },
      ),
    ).rejects.toBe(upstreamValidationError);
  });

  it("buildReceiverCacheKeyParams 会归一化 market 与 history timestamp", () => {
    const { service } = createReceiverService();

    const cacheKeyParams = (service as any).buildReceiverCacheKeyParams({
      symbols: ["AAPL.US"],
      receiverType: CAPABILITY_NAMES.GET_STOCK_HISTORY,
      options: {
        market: "us",
        klineNum: 240,
        timestamp: 1709251260000,
      },
    });

    expect(cacheKeyParams).toMatchObject({
      market: "US",
      klineNum: 240,
      timestamp: 1709251260,
    });
  });

  it.each([
    ["SH", "CN"],
    ["SZ", "CN"],
    ["CN", "CN"],
    ["US", "US"],
    ["HK", "HK"],
  ])(
    "buildReceiverCacheKeyParams 市场归一化 %s -> %s",
    (inputMarket, expectedMarket) => {
      const { service } = createReceiverService();

      const cacheKeyParams = (service as any).buildReceiverCacheKeyParams({
        symbols: ["AAPL.US"],
        receiverType: CAPABILITY_NAMES.GET_STOCK_QUOTE,
        options: {
          market: inputMarket,
        },
      });

      expect(cacheKeyParams).toEqual({
        market: expectedMarket,
      });
    },
  );

  it.each([
    "CRYPTO",
    "drop table users",
    "US;DELETE",
    "__proto__",
    "CN\nUS",
    "  ",
    "",
  ])(
    "buildReceiverCacheKeyParams 非法 market 不进入缓存键: %s",
    (inputMarket) => {
      const { service } = createReceiverService();

      const cacheKeyParams = (service as any).buildReceiverCacheKeyParams({
        symbols: ["AAPL.US"],
        receiverType: CAPABILITY_NAMES.GET_STOCK_QUOTE,
        options: {
          market: inputMarket,
        },
      });

      expect(cacheKeyParams).toEqual({});
    },
  );

  it("buildReceiverCacheKeyParams 非法 market 不污染 history 缓存键其他参数", () => {
    const { service } = createReceiverService();

    const cacheKeyParams = (service as any).buildReceiverCacheKeyParams({
      symbols: ["AAPL.US"],
      receiverType: CAPABILITY_NAMES.GET_STOCK_HISTORY,
      options: {
        market: "CRYPTO",
        klineNum: 120,
        timestamp: 1709251260000,
      },
    });

    expect(cacheKeyParams).toEqual({
      klineNum: 120,
      timestamp: 1709251260,
    });
  });

  it("handleRequest 走智能缓存且返回空数组时，标记部分失败并 correctly 统计成功数", async () => {
    const { service, smartCacheOrchestrator, marketStatusService } =
      createReceiverService();

    smartCacheOrchestrator.getDataWithSmartCache.mockResolvedValue({
      data: [],
      hit: true,
      strategy: "strong_timeliness",
      storageKey: "receiver:get-stock-history:AAPL.US",
    });
    marketStatusService.getBatchMarketStatus.mockResolvedValue({});

    const response = await service.handleRequest({
      symbols: ["AAPL.US"],
      receiverType: CAPABILITY_NAMES.GET_STOCK_HISTORY,
      options: {
        useSmartCache: true,
      },
    } as any);

    expect(response.metadata.totalRequested).toBe(1);
    expect(response.metadata.successfullyProcessed).toBe(0);
    expect(response.metadata.hasPartialFailures).toBe(true);
  });
});

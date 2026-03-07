jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { BusinessErrorCode } from "@common/core/exceptions";
import { REFERENCE_DATA } from "@common/constants/domain";
import { StreamReceiverService } from "@core/01-entry/stream-receiver/services/stream-receiver.service";

type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
};

function createService(options?: {
  subscribeValidation?: ValidationResult;
  unsubscribeValidation?: ValidationResult;
}) {
  const subscribeValidation =
    options?.subscribeValidation ||
    ({
      isValid: true,
      errors: [],
      warnings: [],
      sanitizedData: {
        symbols: ["AAPL.US"],
        wsCapabilityType: "quote",
        preferredProvider: "longport",
      },
    } as ValidationResult);
  const unsubscribeValidation =
    options?.unsubscribeValidation ||
    ({
      isValid: true,
      errors: [],
      warnings: [],
      sanitizedData: {
        symbols: ["AAPL.US"],
      },
    } as ValidationResult);

  const clientStateManager = {
    addSubscriptionChangeListener: jest.fn(),
    addClientSubscription: jest.fn(),
    getClientSubscription: jest.fn(),
    getClientSymbols: jest.fn(() => []),
    removeClientSubscription: jest.fn(),
  };

  const mocks = {
    eventBus: { emit: jest.fn() },
    configService: {
      get: jest.fn((_: string, defaultValue: any) => defaultValue),
    },
    symbolTransformerService: {},
    marketInferenceService: {
      inferMarkets: jest.fn(() => ["US"]),
      inferDominantMarket: jest.fn(() => "US"),
    },
    dataTransformerService: {},
    streamDataFetcher: {
      getClientStateManager: jest.fn(() => clientStateManager),
      subscribeToSymbols: jest.fn(),
      unsubscribeFromSymbols: jest.fn(),
      isConnectionActive: jest.fn(() => false),
    },
    providerRegistryService: {},
    dataValidator: {
      validateSubscribeRequest: jest.fn(() => subscribeValidation),
      validateUnsubscribeRequest: jest.fn(() => unsubscribeValidation),
    },
    batchProcessor: { setCallbacks: jest.fn() },
    connectionManager: {
      setCallbacks: jest.fn(),
      getActiveConnectionsCount: jest.fn(() => 0),
      getOrCreateConnection: jest.fn(),
      isConnectionActive: jest.fn(() => false),
      forceConnectionCleanup: jest.fn(async () => ({
        totalCleaned: 0,
        remainingConnections: 0,
        staleConnectionsCleaned: 0,
        unhealthyConnectionsCleaned: 0,
        cleanupType: "manual",
      })),
    },
    dataProcessor: { setCallbacks: jest.fn() },
    rateLimitService: {
      checkRateLimit: jest.fn(),
    },
    clientStateManager,
  };

  const service = new StreamReceiverService(
    mocks.eventBus as any,
    mocks.configService as any,
    mocks.symbolTransformerService as any,
    mocks.marketInferenceService as any,
    mocks.dataTransformerService as any,
    mocks.streamDataFetcher as any,
    mocks.providerRegistryService as any,
    mocks.dataValidator as any,
    mocks.batchProcessor as any,
    mocks.connectionManager as any,
    mocks.dataProcessor as any,
    undefined,
    mocks.rateLimitService as any,
    undefined,
  );

  return { service, mocks };
}

describe("StreamReceiverService request validation fail-fast", () => {
  it("subscribeStream: 非法请求应 fail-fast 且不触发下游流程", async () => {
    const dto = {
      symbols: ["INVALID_SYMBOL"],
      wsCapabilityType: "quote",
      preferredProvider: "longport",
    };
    const { service, mocks } = createService({
      subscribeValidation: {
        isValid: false,
        errors: ["无效的符号格式: INVALID_SYMBOL"],
        warnings: [],
        sanitizedData: dto,
      },
    });

    await expect(
      service.subscribeStream(dto as any, "client-1", "127.0.0.1"),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: "subscribeStream",
    });

    expect(mocks.dataValidator.validateSubscribeRequest).toHaveBeenCalledWith(dto);
    expect(mocks.rateLimitService.checkRateLimit).not.toHaveBeenCalled();
    expect(mocks.connectionManager.getOrCreateConnection).not.toHaveBeenCalled();
    expect(mocks.streamDataFetcher.subscribeToSymbols).not.toHaveBeenCalled();
    expect(mocks.clientStateManager.addClientSubscription).not.toHaveBeenCalled();
  });

  it("subscribeStream: 连接已认证时应通知 validator 跳过消息级认证校验", async () => {
    const dto = {
      symbols: ["AAPL.US"],
      wsCapabilityType: "quote",
      preferredProvider: "longport",
    };
    const { service, mocks } = createService({
      subscribeValidation: {
        isValid: false,
        errors: ["测试用校验失败"],
        warnings: [],
        sanitizedData: dto,
      },
    });

    await expect(
      service.subscribeStream(dto as any, "client-1", undefined, {
        connectionAuthenticated: true,
      }),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: "subscribeStream",
    });

    expect(mocks.dataValidator.validateSubscribeRequest).toHaveBeenCalledWith(
      dto,
      { skipAuthValidation: true },
    );
  });

  it("unsubscribeStream: 非法请求应 fail-fast 且不触发下游流程", async () => {
    const dto = {
      symbols: ["INVALID_SYMBOL"],
    };
    const { service, mocks } = createService({
      unsubscribeValidation: {
        isValid: false,
        errors: ["无效的符号格式: INVALID_SYMBOL"],
        warnings: [],
        sanitizedData: dto,
      },
    });

    await expect(
      service.unsubscribeStream(dto as any, "client-1"),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: "unsubscribeStream",
    });

    expect(mocks.dataValidator.validateUnsubscribeRequest).toHaveBeenCalledWith(dto);
    expect(mocks.clientStateManager.getClientSubscription).not.toHaveBeenCalled();
    expect(mocks.streamDataFetcher.unsubscribeFromSymbols).not.toHaveBeenCalled();
    expect(mocks.clientStateManager.removeClientSubscription).not.toHaveBeenCalled();
  });
});

describe("StreamReceiverService subscription lifecycle", () => {
  it("subscribeStream: 下游订阅失败时不应提前写入客户端订阅状态", async () => {
    const dto = {
      symbols: ["AAPL.US"],
      wsCapabilityType: "quote",
      preferredProvider: "longport",
    };
    const { service, mocks } = createService();

    jest.spyOn(service as any, "resolveSymbolMappings").mockResolvedValue({
      standardSymbols: ["AAPL.US"],
      providerSymbols: ["AAPL.US"],
    });
    jest.spyOn(service as any, "setupDataReceiving").mockImplementation(jest.fn());

    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({ id: "conn-1" });
    mocks.streamDataFetcher.subscribeToSymbols.mockRejectedValue(
      new Error("subscribe failed"),
    );

    await expect(service.subscribeStream(dto as any, "client-1")).rejects.toThrow(
      "subscribe failed",
    );

    expect(mocks.clientStateManager.addClientSubscription).not.toHaveBeenCalled();
  });

  it("subscribeStream: 订阅成功后才写入客户端订阅状态", async () => {
    const dto = {
      symbols: ["AAPL.US"],
      wsCapabilityType: "quote",
      preferredProvider: "longport",
    };
    const { service, mocks } = createService();

    jest.spyOn(service as any, "resolveSymbolMappings").mockResolvedValue({
      standardSymbols: ["AAPL.US"],
      providerSymbols: ["AAPL.US"],
    });
    jest.spyOn(service as any, "setupDataReceiving").mockImplementation(jest.fn());

    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({ id: "conn-1" });
    mocks.streamDataFetcher.subscribeToSymbols.mockResolvedValue(undefined);

    await service.subscribeStream(dto as any, "client-1");

    expect(mocks.clientStateManager.addClientSubscription).toHaveBeenCalledWith(
      "client-1",
      ["AAPL.US"],
      "quote",
      "longport",
    );

    const subscribeCallOrder =
      mocks.streamDataFetcher.subscribeToSymbols.mock.invocationCallOrder[0];
    const addStateCallOrder =
      mocks.clientStateManager.addClientSubscription.mock.invocationCallOrder[0];
    expect(addStateCallOrder).toBeGreaterThan(subscribeCallOrder);
  });

  it("initializeConnectionCleanup: cleanup 异常应被捕获且不向外抛出", async () => {
    const { service, mocks } = createService();
    mocks.connectionManager.forceConnectionCleanup.mockRejectedValue(
      new Error("cleanup-failed"),
    );

    let intervalCallback: (() => Promise<void>) | undefined;
    const setIntervalSpy = jest
      .spyOn(global, "setInterval")
      .mockImplementation(((callback: () => Promise<void>) => {
        intervalCallback = callback;
        return 1 as any;
      }) as any);

    try {
      (service as any).initializeConnectionCleanup();
      expect(intervalCallback).toBeDefined();

      await expect(intervalCallback!()).resolves.toBeUndefined();
      expect((service as any).logger.error).toHaveBeenCalledWith(
        "连接清理任务执行失败",
        expect.objectContaining({ error: "cleanup-failed" }),
      );
    } finally {
      setIntervalSpy.mockRestore();
    }
  });
});

describe("StreamReceiverService provider mapping consistency", () => {
  it("SG 市场默认 provider 应为 longport", () => {
    const { service } = createService();
    const expectedProvider = REFERENCE_DATA.PROVIDER_IDS.LONGPORT;

    expect((service as any).getProviderByMarketPriority("SG")).toBe(
      expectedProvider,
    );
    expect((service as any).selectProviderBasic("SG")).toBe(expectedProvider);
  });

  it("SG/US/HK/CN/JP/UNKNOWN 在不同选择路径上应保持一致映射", () => {
    const { service } = createService();
    const expectedProvider = REFERENCE_DATA.PROVIDER_IDS.LONGPORT;
    const markets = ["SG", "US", "HK", "CN", "JP", "UNKNOWN"];
    const strategy = (service as any).getProviderSelectionStrategy();

    for (const market of markets) {
      expect((service as any).getProviderByMarketPriority(market)).toBe(
        expectedProvider,
      );
      expect((service as any).selectProviderBasic(market)).toBe(
        expectedProvider,
      );
      expect((service as any).getProviderByHeuristics("AAPL.US", market)).toBe(
        expectedProvider,
      );
      expect(strategy.marketPriorities[market]).toEqual([expectedProvider]);
    }
  });
});

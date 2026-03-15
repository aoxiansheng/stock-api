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
import { StreamBatchProcessorService } from "@core/01-entry/stream-receiver/services/stream-batch-processor.service";
import { STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY } from "@core/shared/utils/provider-symbol-identity.util";

type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: any;
};

function createService(options?: {
  subscribeValidation?: ValidationResult;
  unsubscribeValidation?: ValidationResult;
  standardSymbolIdentityProviders?: string;
  webSocketAvailable?: boolean;
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
    getClientCountForSymbol: jest.fn(() => 0),
    getClientSubscription: jest.fn(),
    getClientSymbols: jest.fn(() => []),
    removeClientSubscription: jest.fn(),
    broadcastToSymbolViaGateway: jest.fn(),
  };
  const streamCache = {
    setData: jest.fn(),
  };
  const connectionMock = {
    id: "conn-1",
    onData: jest.fn(),
    onError: jest.fn(),
    onStatusChange: jest.fn(),
  };

  const mocks = {
    eventBus: { emit: jest.fn() },
    configService: {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY) {
          return options?.standardSymbolIdentityProviders ?? "";
        }
        return defaultValue;
      }),
    },
    symbolTransformerService: {
      transformSymbols: jest.fn(),
      transformSymbolsForProvider: jest.fn(),
    },
    marketInferenceService: {
      inferMarkets: jest.fn(() => ["US"]),
      inferDominantMarket: jest.fn(() => "US"),
    },
    dataTransformerService: {},
    streamDataFetcher: {
      getClientStateManager: jest.fn(() => clientStateManager),
      getStreamDataCache: jest.fn(() => streamCache),
      subscribeToSymbols: jest.fn(),
      unsubscribeFromSymbols: jest.fn(),
      isConnectionActive: jest.fn(() => false),
    },
    providerRegistryService: {
      getBestProvider: jest.fn(() => REFERENCE_DATA.PROVIDER_IDS.LONGPORT),
      getCandidateProviders: jest.fn(() => [
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      ]),
      rankProvidersForCapability: jest.fn((_: string, providers: string[]) => [
        ...providers,
      ]),
    },
    dataValidator: {
      validateSubscribeRequest: jest.fn(() => subscribeValidation),
      validateUnsubscribeRequest: jest.fn(() => unsubscribeValidation),
      isValidSymbolFormat: jest.fn((symbol: string) => {
        return (
          /^[0-9]{4,5}\.HK$/i.test(symbol) ||
          /^[A-Z0-9]+(?:[.\-][A-Z0-9]+){0,2}\.US$/i.test(symbol) ||
          /^[0-9]{6}\.(SH|SZ)$/i.test(symbol) ||
          /^[A-Z0-9]{3,5}\.SG$/i.test(symbol)
        );
      }),
    },
    batchProcessor: { addQuoteData: jest.fn() },
    connectionManager: {
      getActiveConnectionsCount: jest.fn(() => 0),
      getOrCreateConnection: jest.fn().mockResolvedValue(connectionMock),
      isConnectionActive: jest.fn(() => false),
      forceConnectionCleanup: jest.fn(async () => ({
        totalCleaned: 0,
        remainingConnections: 0,
        staleConnectionsCleaned: 0,
        unhealthyConnectionsCleaned: 0,
        cleanupType: "manual",
      })),
    },
    rateLimitService: {
      checkRateLimit: jest.fn(),
    },
    upstreamSymbolSubscriptionCoordinator: {
      acquire: jest.fn((params: any) => params.symbols),
      scheduleRelease: jest.fn((params: any, _callback: any) => params.symbols),
      cancelPendingUnsubscribe: jest.fn(),
    },
    webSocketProvider: {
      isServerAvailable: jest.fn(() => options?.webSocketAvailable ?? true),
      joinClientToRooms: jest.fn(),
      leaveClientFromRooms: jest.fn(),
    },
    clientStateManager,
    streamCache,
    connectionMock,
  };

  const service = new StreamReceiverService(
    mocks.eventBus as any,
    mocks.configService as any,
    mocks.symbolTransformerService as any,
    mocks.marketInferenceService as any,
    mocks.dataTransformerService as any,
    mocks.streamDataFetcher as any,
    mocks.clientStateManager as any,
    mocks.upstreamSymbolSubscriptionCoordinator as any,
    mocks.providerRegistryService as any,
    mocks.dataValidator as any,
    mocks.batchProcessor as any,
    mocks.connectionManager as any,
    undefined,
    mocks.rateLimitService as any,
    mocks.webSocketProvider as any,
  );

  return { service, mocks };
}

function createBatchProcessor(options?: {
  standardSymbolIdentityProviders?: string;
  webSocketAvailable?: boolean;
  configOverrides?: Record<string, any>;
}) {
  const clientStateManager = {
    addSubscriptionChangeListener: jest.fn(),
    addClientSubscription: jest.fn(),
    getClientCountForSymbol: jest.fn(() => 0),
    getClientSubscription: jest.fn(),
    getClientSymbols: jest.fn(() => []),
    removeClientSubscription: jest.fn(),
    broadcastToSymbolViaGateway: jest.fn(),
  };
  const streamCache = {
    setData: jest.fn(),
  };
  const configOverrides = options?.configOverrides ?? {};

  const mocks = {
    eventBus: { emit: jest.fn() },
    configService: {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY) {
          return options?.standardSymbolIdentityProviders ?? "";
        }
        if (Object.prototype.hasOwnProperty.call(configOverrides, key)) {
          return configOverrides[key];
        }
        return defaultValue;
      }),
    },
    dataTransformerService: { transform: jest.fn() },
    symbolTransformerService: { transformSymbols: jest.fn() },
    streamDataFetcher: {
      getClientStateManager: jest.fn(() => clientStateManager),
      getStreamDataCache: jest.fn(() => streamCache),
    },
    dataValidator: {
      isValidSymbolFormat: jest.fn((symbol: string) => {
        return (
          /^[0-9]{4,5}\.HK$/i.test(symbol) ||
          /^[A-Z0-9]+(?:[.\-][A-Z0-9]+){0,2}\.US$/i.test(symbol) ||
          /^[0-9]{6}\.(SH|SZ)$/i.test(symbol) ||
          /^[A-Z0-9]{3,5}\.SG$/i.test(symbol)
        );
      }),
    },
    webSocketProvider: {
      isServerAvailable: jest.fn(() => options?.webSocketAvailable ?? true),
    },
    clientStateManager,
    streamCache,
  };

  const batchProcessor = new StreamBatchProcessorService(
    mocks.configService as any,
    mocks.eventBus as any,
    mocks.dataTransformerService as any,
    mocks.symbolTransformerService as any,
    mocks.streamDataFetcher as any,
    mocks.clientStateManager as any,
    mocks.dataValidator as any,
    mocks.webSocketProvider as any,
  );

  return { batchProcessor, mocks };
}

describe("StreamReceiverService request validation fail-fast", () => {
  it("subscribeStream: 非法请求也应先经过连接限速门禁，再进行请求校验", async () => {
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
    mocks.rateLimitService.checkRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetTime: Date.now() + 1000,
    });

    await expect(
      service.subscribeStream(dto as any, "client-1", "127.0.0.1"),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: "subscribeStream",
    });

    expect(mocks.dataValidator.validateSubscribeRequest).toHaveBeenCalledWith(
      dto,
    );
    expect(mocks.rateLimitService.checkRateLimit).toHaveBeenCalledTimes(1);
    const rateLimitOrder =
      mocks.rateLimitService.checkRateLimit.mock.invocationCallOrder[0];
    const validateOrder =
      mocks.dataValidator.validateSubscribeRequest.mock.invocationCallOrder[0];
    expect(rateLimitOrder).toBeLessThan(validateOrder);
    expect(
      mocks.connectionManager.getOrCreateConnection,
    ).not.toHaveBeenCalled();
    expect(mocks.streamDataFetcher.subscribeToSymbols).not.toHaveBeenCalled();
    expect(
      mocks.clientStateManager.addClientSubscription,
    ).not.toHaveBeenCalled();
  });

  it("subscribeStream: 限速超限时应短路且不触发 validateSubscribeRequest", async () => {
    const dto = {
      symbols: ["INVALID_SYMBOL"],
      wsCapabilityType: "quote",
      preferredProvider: "longport",
    };
    const { service, mocks } = createService();
    mocks.rateLimitService.checkRateLimit.mockResolvedValue({
      allowed: false,
      limit: 1,
      current: 2,
      retryAfter: 60,
    });

    await expect(
      service.subscribeStream(dto as any, "client-1", "127.0.0.1"),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
      operation: "subscribeStream",
    });

    expect(mocks.rateLimitService.checkRateLimit).toHaveBeenCalledTimes(1);
    expect(mocks.dataValidator.validateSubscribeRequest).not.toHaveBeenCalled();
    expect(
      mocks.connectionManager.getOrCreateConnection,
    ).not.toHaveBeenCalled();
    expect(mocks.streamDataFetcher.subscribeToSymbols).not.toHaveBeenCalled();
    expect(
      mocks.clientStateManager.addClientSubscription,
    ).not.toHaveBeenCalled();
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

  it("subscribeStream: identity provider 下原始 symbols 含首尾空白应被拒绝", async () => {
    const dto = {
      symbols: ["  aapl.us  "],
      wsCapabilityType: "quote",
      preferredProvider: "longport",
    };
    const { service, mocks } = createService({
      standardSymbolIdentityProviders: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      subscribeValidation: {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: {
          symbols: ["AAPL.US"],
          wsCapabilityType: "quote",
          preferredProvider: "longport",
        },
      },
    });

    await expect(
      service.subscribeStream(dto as any, "client-1"),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: "subscribeStream",
      context: expect.objectContaining({
        reason: "non_standard_symbol_in_identity_provider",
      }),
    });

    expect(
      mocks.connectionManager.getOrCreateConnection,
    ).not.toHaveBeenCalled();
    expect(mocks.streamDataFetcher.subscribeToSymbols).not.toHaveBeenCalled();
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

    expect(mocks.dataValidator.validateUnsubscribeRequest).toHaveBeenCalledWith(
      dto,
    );
    expect(
      mocks.clientStateManager.getClientSubscription,
    ).not.toHaveBeenCalled();
    expect(
      mocks.streamDataFetcher.unsubscribeFromSymbols,
    ).not.toHaveBeenCalled();
    expect(
      mocks.clientStateManager.removeClientSubscription,
    ).not.toHaveBeenCalled();
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
    jest
      .spyOn(service as any, "setupDataReceiving")
      .mockImplementation(jest.fn());

    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({
      id: "conn-1",
    });
    mocks.streamDataFetcher.subscribeToSymbols.mockRejectedValue(
      new Error("subscribe failed"),
    );

    await expect(
      service.subscribeStream(dto as any, "client-1"),
    ).rejects.toThrow("subscribe failed");

    expect(
      mocks.clientStateManager.addClientSubscription,
    ).not.toHaveBeenCalled();
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
    jest
      .spyOn(service as any, "setupDataReceiving")
      .mockImplementation(jest.fn());

    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({
      id: "conn-1",
    });
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
      mocks.clientStateManager.addClientSubscription.mock
        .invocationCallOrder[0];
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

describe("StreamReceiverService provider级标准符号直通", () => {
  it("provider 命中时应返回 canonical symbols 并跳过 transformSymbolsForProvider", async () => {
    const { service, mocks } = createService({
      standardSymbolIdentityProviders: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    });

    const result = await (service as any).resolveSymbolMappings(
      ["aapl.us", "00700.hk"],
      REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      "request-identity-hit",
    );

    expect(result).toEqual({
      standardSymbols: ["AAPL.US", "00700.HK"],
      providerSymbols: ["AAPL.US", "00700.HK"],
    });
    expect(
      mocks.symbolTransformerService.transformSymbolsForProvider,
    ).not.toHaveBeenCalled();
    expect(
      mocks.symbolTransformerService.transformSymbols,
    ).not.toHaveBeenCalled();
  });

  it("ensureSymbolConsistency: provider 命中 identity 时仅 canonical 且不触发 transformSymbols", async () => {
    const { service, mocks } = createService({
      standardSymbolIdentityProviders: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    });

    const result = await (service as any).ensureSymbolConsistency(
      ["aapl.us", "00700.hk"],
      REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    );

    expect(result).toEqual(["AAPL.US", "00700.HK"]);
    expect(
      mocks.symbolTransformerService.transformSymbols,
    ).not.toHaveBeenCalled();
  });

  it("provider 命中时遇到非标准符号应抛 DATA_VALIDATION_FAILED", async () => {
    const { service, mocks } = createService({
      standardSymbolIdentityProviders: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    });

    await expect(
      (service as any).resolveSymbolMappings(
        ["AAPL"],
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        "request-identity-invalid",
      ),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: "resolveSymbolMappings",
    });
    expect(
      mocks.symbolTransformerService.transformSymbolsForProvider,
    ).not.toHaveBeenCalled();
    expect(
      mocks.symbolTransformerService.transformSymbols,
    ).not.toHaveBeenCalled();
  });

  it("provider 未命中时应保持原有符号映射行为", async () => {
    const { service, mocks } = createService({
      standardSymbolIdentityProviders: "infoway",
    });

    mocks.symbolTransformerService.transformSymbols.mockResolvedValue({
      mappingDetails: {
        AAPL: "AAPL.US",
        "00700": "00700.HK",
      },
    });
    mocks.symbolTransformerService.transformSymbolsForProvider.mockResolvedValue(
      {
        transformedSymbols: ["AAPL", "700"],
        mappingResults: {
          transformedSymbols: {
            "AAPL.US": "AAPL",
            "00700.HK": "700",
          },
        },
      },
    );

    const result = await (service as any).resolveSymbolMappings(
      ["AAPL", "00700"],
      REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      "request-non-identity",
    );

    expect(result).toEqual({
      standardSymbols: ["AAPL.US", "00700.HK"],
      providerSymbols: ["AAPL", "700"],
    });
    expect(
      mocks.symbolTransformerService.transformSymbols,
    ).toHaveBeenCalledTimes(1);
    expect(
      mocks.symbolTransformerService.transformSymbolsForProvider,
    ).toHaveBeenCalledWith(
      REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      ["AAPL.US", "00700.HK"],
      "request-non-identity",
    );
  });
});

describe("StreamReceiverService symbol room key consistency", () => {
  it("subscribeStream: 加入房间应统一使用 canonical symbol key", async () => {
    const subscribeDto = {
      symbols: ["aapl.us"],
      wsCapabilityType: "quote",
      preferredProvider: "longport",
    };
    const { service, mocks } = createService({
      subscribeValidation: {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: subscribeDto,
      },
    });

    jest.spyOn(service as any, "resolveSymbolMappings").mockResolvedValue({
      standardSymbols: ["aapl.us", "AAPL.US"],
      providerSymbols: ["aapl.us"],
    });
    jest
      .spyOn(service as any, "setupDataReceiving")
      .mockImplementation(jest.fn());
    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({
      id: "conn-1",
    });
    mocks.streamDataFetcher.subscribeToSymbols.mockResolvedValue(undefined);

    await service.subscribeStream(subscribeDto as any, "client-1");

    expect(mocks.webSocketProvider.joinClientToRooms).toHaveBeenCalledWith(
      "client-1",
      ["symbol:AAPL.US"],
    );
  });

  it("unsubscribeStream: 退出房间应与订阅路径使用同一 canonical key 规则", async () => {
    const unsubscribeDto = {
      symbols: ["aapl.us"],
    };
    const { service, mocks } = createService({
      unsubscribeValidation: {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: unsubscribeDto,
      },
    });
    mocks.clientStateManager.getClientSubscription.mockReturnValue({
      providerName: "longport",
      wsCapabilityType: "quote",
    });
    jest.spyOn(service as any, "resolveSymbolMappings").mockResolvedValue({
      standardSymbols: ["aapl.us", "AAPL.US"],
      providerSymbols: ["aapl.us"],
    });

    await service.unsubscribeStream(unsubscribeDto as any, "client-1");

    expect(mocks.webSocketProvider.leaveClientFromRooms).toHaveBeenCalledWith(
      "client-1",
      ["symbol:AAPL.US"],
    );
  });

  it("pipelineBroadcastData: 广播路径应按 canonical symbol 聚合并分发", async () => {
    const { batchProcessor, mocks } = createBatchProcessor();
    mocks.clientStateManager.broadcastToSymbolViaGateway.mockResolvedValue(
      undefined,
    );

    await (batchProcessor as any).pipelineBroadcastData(
      [
        {
          symbol: "aapl.us",
          price: 190.12,
          timestamp: 1700000000000,
          volume: 100,
          payload: 1,
        },
        {
          symbol: "AAPL.US",
          lastPrice: "191.30",
          timestamp: "2024-01-01T00:00:00.000Z",
          volume: "200",
          payload: 2,
        },
        {
          symbol: "00700.hk",
          price: 300.45,
          timestamp: 1700000001000,
          volume: 300,
          payload: 3,
        },
      ],
      ["aapl.us", "00700.hk"],
    );

    expect(
      mocks.clientStateManager.broadcastToSymbolViaGateway,
    ).toHaveBeenCalledTimes(2);
    expect(
      mocks.clientStateManager.broadcastToSymbolViaGateway,
    ).toHaveBeenNthCalledWith(
      1,
      "AAPL.US",
      expect.any(Array),
      mocks.webSocketProvider,
    );
    expect(
      mocks.clientStateManager.broadcastToSymbolViaGateway,
    ).toHaveBeenNthCalledWith(
      2,
      "00700.HK",
      expect.any(Array),
      mocks.webSocketProvider,
    );

    const firstPayload =
      mocks.clientStateManager.broadcastToSymbolViaGateway.mock.calls[0][1];
    const secondPayload =
      mocks.clientStateManager.broadcastToSymbolViaGateway.mock.calls[1][1];
    expect(firstPayload).toHaveLength(2);
    expect(secondPayload).toHaveLength(1);
    expect(firstPayload.every((item: any) => item.symbol === "AAPL.US")).toBe(
      true,
    );
    expect(
      firstPayload.every((item: any) => typeof item.timestamp === "number"),
    ).toBe(true);
  });

  it("pipelineCacheData: 缓存键应与 room/broadcast 使用同一 canonical 规则", async () => {
    const { service } = createService();
    const { batchProcessor, mocks } = createBatchProcessor();
    const canonicalSymbol = "AAPL.US";

    expect((service as any).buildSymbolRoomKey("  aapl.us  ")).toBe(
      `symbol:${canonicalSymbol}`,
    );
    expect((service as any).buildSymbolBroadcastKey("  aapl.us  ")).toBe(
      canonicalSymbol,
    );

    await (batchProcessor as any).pipelineCacheData(
      [
        {
          symbol: "aapl.us",
          price: 190.12,
          timestamp: 1700000000000,
          volume: 100,
          payload: 1,
        },
        {
          symbol: "AAPL.US",
          lastPrice: "191.30",
          timestamp: "2024-01-01T00:00:00.000Z",
          volume: "200",
          payload: 2,
        },
      ],
      ["aapl.us"],
    );

    expect(mocks.streamCache.setData).toHaveBeenCalledTimes(1);
    expect(mocks.streamCache.setData).toHaveBeenCalledWith(
      `quote:${canonicalSymbol}`,
      expect.any(Array),
      "hot",
    );
    const cachedPoints = mocks.streamCache.setData.mock.calls[0][1];
    expect(cachedPoints).toHaveLength(2);
    expect(
      cachedPoints.every((point: any) => point.s === canonicalSymbol),
    ).toBe(true);
  });

  it("pipelineBroadcastData: 非法 payload 应统一丢弃并记录原因", async () => {
    const { batchProcessor, mocks } = createBatchProcessor();
    mocks.clientStateManager.broadcastToSymbolViaGateway.mockResolvedValue(
      undefined,
    );

    await (batchProcessor as any).pipelineBroadcastData(
      [
        {
          symbol: "aapl.us",
          price: 190.12,
          timestamp: 1700000000000,
          volume: 100,
        },
        { symbol: "  ", price: 1, timestamp: 1700000000000, volume: 1 },
        {
          symbol: "TSLA.US",
          price: "NaN",
          timestamp: 1700000000000,
          volume: 1,
        },
        { symbol: "NVDA.US", price: 1, timestamp: "not-a-time", volume: 1 },
        { symbol: "MSFT.US", price: 1, timestamp: 1700000000000, volume: -1 },
      ],
      ["aapl.us", "TSLA.US"],
    );

    expect(
      mocks.clientStateManager.broadcastToSymbolViaGateway,
    ).toHaveBeenCalledTimes(1);
    expect(
      mocks.clientStateManager.broadcastToSymbolViaGateway,
    ).toHaveBeenCalledWith(
      "AAPL.US",
      expect.any(Array),
      mocks.webSocketProvider,
    );
    expect((batchProcessor as any).logger.warn).toHaveBeenCalledWith(
      "流数据因无效payload被丢弃",
      expect.objectContaining({
        stage: "broadcast",
        droppedTotal: 4,
        reasons: expect.objectContaining({
          invalid_symbol: 1,
          invalid_price: 1,
          invalid_timestamp: 1,
          invalid_volume: 1,
        }),
      }),
    );
  });

  it("pipelineCacheData: 非法 payload 应被过滤，仅合法数据进入缓存", async () => {
    const { batchProcessor, mocks } = createBatchProcessor();

    await (batchProcessor as any).pipelineCacheData(
      [
        {
          symbol: "aapl.us",
          price: 190.12,
          timestamp: 1700000000000,
          volume: 100,
        },
        {
          symbol: "AAPL.US",
          lastPrice: "191.30",
          timestamp: "2024-01-01T00:00:00.000Z",
          volume: "200",
        },
        { symbol: "", price: 1, timestamp: 1700000000000, volume: 1 },
        {
          symbol: "TSLA.US",
          price: "NaN",
          timestamp: 1700000000000,
          volume: 1,
        },
      ],
      ["aapl.us"],
    );

    expect(mocks.streamCache.setData).toHaveBeenCalledTimes(1);
    const cacheKey = mocks.streamCache.setData.mock.calls[0][0];
    const cachedPoints = mocks.streamCache.setData.mock.calls[0][1];
    expect(cacheKey).toBe("quote:AAPL.US");
    expect(cachedPoints).toHaveLength(2);
    expect(cachedPoints.every((point: any) => point.s === "AAPL.US")).toBe(
      true,
    );
    expect((batchProcessor as any).logger.warn).toHaveBeenCalledWith(
      "流数据因无效payload被丢弃",
      expect.objectContaining({
        stage: "cache",
      }),
    );
  });

  it("pipelineCacheData: 批内完全重复 payload 应去重后再写缓存", async () => {
    const { batchProcessor, mocks } = createBatchProcessor();

    await (batchProcessor as any).pipelineCacheData(
      [
        {
          symbol: "AAPL.US",
          price: 70665.56,
          timestamp: 1700000000000,
          volume: 0.00015,
          turnover: "10.59",
          tradeDirection: 1,
        },
        {
          symbol: "AAPL.US",
          price: 70665.56,
          timestamp: 1700000000000,
          volume: 0.00015,
          turnover: "10.59",
          tradeDirection: 1,
        },
        {
          symbol: "AAPL.US",
          price: 70665.57,
          timestamp: 1700000000100,
          volume: 0.0002,
          turnover: "14.13",
          tradeDirection: 1,
        },
      ],
      ["AAPL.US"],
    );

    expect(mocks.streamCache.setData).toHaveBeenCalledTimes(1);
    const cachedPoints = mocks.streamCache.setData.mock.calls[0][1];
    expect(cachedPoints).toHaveLength(2);
    expect(
      ((batchProcessor as any).logger.debug as jest.Mock).mock.calls,
    ).toEqual(
      expect.arrayContaining([
        [
          "流数据批内重复payload已去重",
          expect.objectContaining({
            stage: "cache",
            deduplicatedCount: 1,
          }),
        ],
      ]),
    );
  });

  it("pipelineCacheData: I-01/I-02 边界输入应仅缓存合法点并记录 droppedReasons", async () => {
    const { batchProcessor, mocks } = createBatchProcessor();

    await (batchProcessor as any).pipelineCacheData(
      [
        { symbol: "aapl.us", price: "", timestamp: 1700000000000, volume: 1 },
        {
          symbol: "AAPL.US",
          price: "   ",
          timestamp: 1700000000001,
          volume: 1,
        },
        { symbol: "AAPL.US", price: 0, timestamp: 1700000000002, volume: 1 },
        { symbol: "AAPL.US", price: "0", timestamp: 1700000000003, volume: 1 },
        { symbol: "AAPL.US", price: 2, timestamp: "1700000000000", volume: 1 },
        {
          symbol: "AAPL.US",
          price: 3,
          timestamp: "2024-01-01T00:00:00.000Z",
          volume: 1,
        },
        { symbol: "AAPL.US", price: 4, timestamp: "   ", volume: 1 },
        { symbol: "AAPL.US", price: 5, timestamp: "not-a-time", volume: 1 },
      ],
      ["AAPL.US"],
    );

    expect(mocks.streamCache.setData).toHaveBeenCalledTimes(1);
    expect(mocks.streamCache.setData).toHaveBeenCalledWith(
      "quote:AAPL.US",
      expect.any(Array),
      "hot",
    );
    const cachedPoints = mocks.streamCache.setData.mock.calls[0][1];
    expect(cachedPoints).toHaveLength(4);
    expect(cachedPoints.every((point: any) => point.s === "AAPL.US")).toBe(
      true,
    );
    expect(cachedPoints.filter((point: any) => point.p === 0)).toHaveLength(2);
    expect(cachedPoints.some((point: any) => point.t === 1700000000000)).toBe(
      true,
    );
    expect(
      cachedPoints.some(
        (point: any) => point.t === Date.parse("2024-01-01T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect((batchProcessor as any).logger.warn).toHaveBeenCalledWith(
      "流数据因无效payload被丢弃",
      expect.objectContaining({
        stage: "cache",
        droppedTotal: 4,
        reasons: expect.objectContaining({
          invalid_price: 2,
          invalid_timestamp: 2,
        }),
      }),
    );
  });

  it("pipelineBroadcastData: I-01/I-02 边界输入应仅广播合法点并记录 droppedReasons", async () => {
    const { batchProcessor, mocks } = createBatchProcessor();
    mocks.clientStateManager.broadcastToSymbolViaGateway.mockResolvedValue(
      undefined,
    );

    await (batchProcessor as any).pipelineBroadcastData(
      [
        { symbol: "aapl.us", price: "", timestamp: 1700000000000, volume: 1 },
        {
          symbol: "AAPL.US",
          price: "   ",
          timestamp: 1700000000001,
          volume: 1,
        },
        { symbol: "AAPL.US", price: 0, timestamp: 1700000000002, volume: 1 },
        { symbol: "AAPL.US", price: "0", timestamp: 1700000000003, volume: 1 },
        { symbol: "AAPL.US", price: 2, timestamp: "1700000000000", volume: 1 },
        {
          symbol: "AAPL.US",
          price: 3,
          timestamp: "2024-01-01T00:00:00.000Z",
          volume: 1,
        },
        { symbol: "AAPL.US", price: 4, timestamp: "   ", volume: 1 },
        { symbol: "AAPL.US", price: 5, timestamp: "not-a-time", volume: 1 },
      ],
      ["AAPL.US"],
    );

    expect(
      mocks.clientStateManager.broadcastToSymbolViaGateway,
    ).toHaveBeenCalledTimes(1);
    expect(
      mocks.clientStateManager.broadcastToSymbolViaGateway,
    ).toHaveBeenCalledWith(
      "AAPL.US",
      expect.any(Array),
      mocks.webSocketProvider,
    );
    const broadcastPayload =
      mocks.clientStateManager.broadcastToSymbolViaGateway.mock.calls[0][1];
    expect(broadcastPayload).toHaveLength(4);
    expect(
      broadcastPayload.every((item: any) => item.symbol === "AAPL.US"),
    ).toBe(true);
    expect(
      broadcastPayload.filter((item: any) => item.price === 0),
    ).toHaveLength(2);
    expect(
      broadcastPayload.some((item: any) => item.timestamp === 1700000000000),
    ).toBe(true);
    expect(
      broadcastPayload.some(
        (item: any) =>
          item.timestamp === Date.parse("2024-01-01T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect((batchProcessor as any).logger.warn).toHaveBeenCalledWith(
      "流数据因无效payload被丢弃",
      expect.objectContaining({
        stage: "broadcast",
        droppedTotal: 4,
        reasons: expect.objectContaining({
          invalid_price: 2,
          invalid_timestamp: 2,
        }),
      }),
    );
  });

  it("pipelineBroadcastData: 批内完全重复 payload 应去重后再广播", async () => {
    const { batchProcessor, mocks } = createBatchProcessor();
    mocks.clientStateManager.broadcastToSymbolViaGateway.mockResolvedValue(
      undefined,
    );

    await (batchProcessor as any).pipelineBroadcastData(
      [
        {
          symbol: "AAPL.US",
          price: 70665.56,
          timestamp: 1700000000000,
          volume: 0.00015,
          turnover: "10.59",
          tradeDirection: 1,
        },
        {
          symbol: "AAPL.US",
          price: 70665.56,
          timestamp: 1700000000000,
          volume: 0.00015,
          turnover: "10.59",
          tradeDirection: 1,
        },
        {
          symbol: "AAPL.US",
          price: 70665.57,
          timestamp: 1700000000100,
          volume: 0.0002,
          turnover: "14.13",
          tradeDirection: 1,
        },
      ],
      ["AAPL.US"],
    );

    expect(
      mocks.clientStateManager.broadcastToSymbolViaGateway,
    ).toHaveBeenCalledTimes(1);
    const broadcastPayload =
      mocks.clientStateManager.broadcastToSymbolViaGateway.mock.calls[0][1];
    expect(broadcastPayload).toHaveLength(2);
    expect(
      ((batchProcessor as any).logger.debug as jest.Mock).mock.calls,
    ).toEqual(
      expect.arrayContaining([
        [
          "流数据批内重复payload已去重",
          expect.objectContaining({
            stage: "broadcast",
            deduplicatedCount: 1,
          }),
        ],
      ]),
    );
  });

  it("pipelineCacheData: I-03 timestamp 秒级字符串/数字应转毫秒，11位与小数输入应按 invalid_timestamp 丢弃", async () => {
    const { batchProcessor, mocks } = createBatchProcessor();

    await (batchProcessor as any).pipelineCacheData(
      [
        { symbol: "AAPL.US", price: 1, timestamp: "1700000000", volume: 1 },
        { symbol: "AAPL.US", price: 1.5, timestamp: 1700000000, volume: 1 },
        { symbol: "AAPL.US", price: 2, timestamp: "17000000000", volume: 1 },
        { symbol: "AAPL.US", price: 2.5, timestamp: 17000000000, volume: 1 },
        { symbol: "AAPL.US", price: 3, timestamp: 1700000000.5, volume: 1 },
      ],
      ["AAPL.US"],
    );

    expect(mocks.streamCache.setData).toHaveBeenCalledTimes(1);
    expect(mocks.streamCache.setData).toHaveBeenCalledWith(
      "quote:AAPL.US",
      expect.any(Array),
      "hot",
    );
    const cachedPoints = mocks.streamCache.setData.mock.calls[0][1];
    expect(cachedPoints).toHaveLength(2);
    expect(
      cachedPoints.every(
        (point: any) => point.s === "AAPL.US" && point.t === 1700000000000,
      ),
    ).toBe(true);
    expect((batchProcessor as any).logger.warn).toHaveBeenCalledWith(
      "流数据因无效payload被丢弃",
      expect.objectContaining({
        stage: "cache",
        droppedTotal: 3,
        reasons: expect.objectContaining({
          invalid_timestamp: 3,
        }),
      }),
    );
  });

  it("pipelineCacheData: I-01 前导零 11 位时间戳字符串应按 invalid_timestamp 丢弃", async () => {
    const { batchProcessor, mocks } = createBatchProcessor();

    await (batchProcessor as any).pipelineCacheData(
      [
        { symbol: "AAPL.US", price: 1, timestamp: "1700000000000", volume: 1 },
        { symbol: "AAPL.US", price: 2, timestamp: "01700000000", volume: 1 },
      ],
      ["AAPL.US"],
    );

    expect(mocks.streamCache.setData).toHaveBeenCalledTimes(1);
    expect(mocks.streamCache.setData).toHaveBeenCalledWith(
      "quote:AAPL.US",
      expect.any(Array),
      "hot",
    );
    const cachedPoints = mocks.streamCache.setData.mock.calls[0][1];
    expect(cachedPoints).toHaveLength(1);
    expect(cachedPoints[0].t).toBe(1700000000000);
    expect((batchProcessor as any).logger.warn).toHaveBeenCalledWith(
      "流数据因无效payload被丢弃",
      expect.objectContaining({
        stage: "cache",
        droppedTotal: 1,
        reasons: expect.objectContaining({
          invalid_timestamp: 1,
        }),
      }),
    );
  });

  it("pipelineBroadcastData: I-03 timestamp 秒级字符串/数字应转毫秒，11位与小数输入应按 invalid_timestamp 丢弃", async () => {
    const { batchProcessor, mocks } = createBatchProcessor();
    mocks.clientStateManager.broadcastToSymbolViaGateway.mockResolvedValue(
      undefined,
    );

    await (batchProcessor as any).pipelineBroadcastData(
      [
        { symbol: "AAPL.US", price: 1, timestamp: "1700000000", volume: 1 },
        { symbol: "AAPL.US", price: 1.5, timestamp: 1700000000, volume: 1 },
        { symbol: "AAPL.US", price: 2, timestamp: "17000000000", volume: 1 },
        { symbol: "AAPL.US", price: 2.5, timestamp: 17000000000, volume: 1 },
        { symbol: "AAPL.US", price: 3, timestamp: 1700000000.5, volume: 1 },
      ],
      ["AAPL.US"],
    );

    expect(
      mocks.clientStateManager.broadcastToSymbolViaGateway,
    ).toHaveBeenCalledTimes(1);
    expect(
      mocks.clientStateManager.broadcastToSymbolViaGateway,
    ).toHaveBeenCalledWith(
      "AAPL.US",
      expect.any(Array),
      mocks.webSocketProvider,
    );
    const broadcastPayload =
      mocks.clientStateManager.broadcastToSymbolViaGateway.mock.calls[0][1];
    expect(broadcastPayload).toHaveLength(2);
    expect(
      broadcastPayload.every(
        (item: any) =>
          item.symbol === "AAPL.US" && item.timestamp === 1700000000000,
      ),
    ).toBe(true);
    expect((batchProcessor as any).logger.warn).toHaveBeenCalledWith(
      "流数据因无效payload被丢弃",
      expect.objectContaining({
        stage: "broadcast",
        droppedTotal: 3,
        reasons: expect.objectContaining({
          invalid_timestamp: 3,
        }),
      }),
    );
  });

  it("pipeline cache/broadcast: 应复用同一symbol校验结果并丢弃非空非法symbol", async () => {
    const { batchProcessor, mocks } = createBatchProcessor();
    mocks.clientStateManager.broadcastToSymbolViaGateway.mockResolvedValue(
      undefined,
    );

    const transformedData = [
      {
        symbol: "AAPL.US",
        price: 190.12,
        timestamp: 1700000000000,
        volume: 100,
      },
      { symbol: "AAPL", price: 190.12, timestamp: 1700000000001, volume: 100 },
      {
        symbol: "AAPL US",
        price: 190.12,
        timestamp: 1700000000002,
        volume: 100,
      },
      {
        symbol: "00700.HK",
        price: 300.45,
        timestamp: 1700000001000,
        volume: 300,
      },
    ];

    await (batchProcessor as any).pipelineCacheData(transformedData, [
      "AAPL.US",
      "00700.HK",
    ]);
    await (batchProcessor as any).pipelineBroadcastData(transformedData, [
      "AAPL.US",
      "00700.HK",
    ]);

    expect(mocks.dataValidator.isValidSymbolFormat).toHaveBeenCalledTimes(8);

    const cacheKeys = mocks.streamCache.setData.mock.calls
      .map((call: any[]) => call[0])
      .sort();
    expect(cacheKeys).toEqual(["quote:00700.HK", "quote:AAPL.US"]);

    const broadcastSymbols =
      mocks.clientStateManager.broadcastToSymbolViaGateway.mock.calls
        .map((call: any[]) => call[0])
        .sort();
    expect(broadcastSymbols).toEqual(["00700.HK", "AAPL.US"]);

    const droppedWarnCalls = (
      (batchProcessor as any).logger.warn as jest.Mock
    ).mock.calls.filter(
      ([message]: [string]) => message === "流数据因无效payload被丢弃",
    );
    expect(droppedWarnCalls).toHaveLength(2);
    expect(droppedWarnCalls).toEqual(
      expect.arrayContaining([
        [
          "流数据因无效payload被丢弃",
          expect.objectContaining({
            stage: "cache",
            droppedTotal: 2,
            reasons: expect.objectContaining({
              invalid_symbol: 2,
            }),
          }),
        ],
        [
          "流数据因无效payload被丢弃",
          expect.objectContaining({
            stage: "broadcast",
            droppedTotal: 2,
            reasons: expect.objectContaining({
              invalid_symbol: 2,
            }),
          }),
        ],
      ]),
    );
  });
});

describe("StreamBatchProcessorService config parsing", () => {
  it("readBooleanConfig: 应处理 boolean 与 number 输入", () => {
    const { batchProcessor, mocks } = createBatchProcessor();

    mocks.configService.get.mockReturnValueOnce(true);
    expect(
      (batchProcessor as any).readBooleanConfig("STREAM_CACHE_ENABLED", false),
    ).toBe(true);

    mocks.configService.get.mockReturnValueOnce(false);
    expect(
      (batchProcessor as any).readBooleanConfig("STREAM_CACHE_ENABLED", true),
    ).toBe(false);

    mocks.configService.get.mockReturnValueOnce(1);
    expect(
      (batchProcessor as any).readBooleanConfig("STREAM_CACHE_ENABLED", false),
    ).toBe(true);

    mocks.configService.get.mockReturnValueOnce(0);
    expect(
      (batchProcessor as any).readBooleanConfig("STREAM_CACHE_ENABLED", true),
    ).toBe(false);
  });

  it.each(["true", " TRUE ", "1", "yes", "on"])(
    "readBooleanConfig: 字符串真值 %p 应返回 true",
    (rawValue) => {
      const { batchProcessor, mocks } = createBatchProcessor();
      mocks.configService.get.mockReturnValueOnce(rawValue);

      expect(
        (batchProcessor as any).readBooleanConfig(
          "STREAM_CACHE_ENABLED",
          false,
        ),
      ).toBe(true);
    },
  );

  it.each(["false", " FALSE ", "0", "no", "off"])(
    "readBooleanConfig: 字符串假值 %p 应返回 false",
    (rawValue) => {
      const { batchProcessor, mocks } = createBatchProcessor();
      mocks.configService.get.mockReturnValueOnce(rawValue);

      expect(
        (batchProcessor as any).readBooleanConfig("STREAM_CACHE_ENABLED", true),
      ).toBe(false);
    },
  );

  it.each([null, undefined])(
    "readBooleanConfig: 空值 %p 应回退 default",
    (rawValue) => {
      const { batchProcessor, mocks } = createBatchProcessor();
      mocks.configService.get.mockReturnValueOnce(rawValue);

      expect(
        (batchProcessor as any).readBooleanConfig("STREAM_CACHE_ENABLED", true),
      ).toBe(true);
    },
  );

  it.each(["maybe", "", "   ", { enabled: true }])(
    "readBooleanConfig: 非法值 %p 应抛出配置错误",
    (rawValue) => {
      const { batchProcessor, mocks } = createBatchProcessor();
      mocks.configService.get.mockReturnValueOnce(rawValue);

      try {
        (batchProcessor as any).readBooleanConfig("STREAM_CACHE_ENABLED", true);
        throw new Error("should_throw");
      } catch (error: any) {
        expect(error).toMatchObject({
          errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        });
      }
    },
  );
});

describe("StreamReceiverService private branch coverage", () => {
  it("extractSymbolsFromData: 应覆盖 symbol/s/symbols[]/quote.symbol/quote.s 分支", () => {
    const { service } = createService();

    expect(
      (service as any).extractSymbolsFromData({ symbol: "AAPL.US" }),
    ).toEqual(["AAPL.US"]);
    expect((service as any).extractSymbolsFromData({ s: "00700.HK" })).toEqual([
      "00700.HK",
    ]);
    expect(
      (service as any).extractSymbolsFromData({
        symbols: ["AAPL.US", "TSLA.US"],
      }),
    ).toEqual(["AAPL.US", "TSLA.US"]);
    expect(
      (service as any).extractSymbolsFromData({
        quote: { symbol: "MSFT.US" },
      }),
    ).toEqual(["MSFT.US"]);
    expect(
      (service as any).extractSymbolsFromData({
        quote: { s: "NVDA.US" },
      }),
    ).toEqual(["NVDA.US"]);
  });

  it("extractSymbolsFromData: 数组混合输入应仅提取 symbol/s", () => {
    const { service } = createService();

    expect(
      (service as any).extractSymbolsFromData([
        { symbol: "AAPL.US" },
        { s: "00700.HK" },
        { symbol: "" },
        { s: null },
        { quote: { symbol: "MSFT.US" } },
        {},
      ]),
    ).toEqual(["AAPL.US", "00700.HK"]);
  });

  it.each([null, undefined, 0, "", "AAPL.US", { symbols: "AAPL.US" }, {}])(
    "extractSymbolsFromData: 非法输入 %p 应返回空数组",
    (invalidInput) => {
      const { service } = createService();
      expect((service as any).extractSymbolsFromData(invalidInput)).toEqual([]);
    },
  );
});

describe("StreamReceiverService upstream subscription coordinator integration", () => {
  it("subscribeStream 仅对协调器返回的 symbol 发起上游订阅", async () => {
    const { service, mocks } = createService();
    mocks.symbolTransformerService.transformSymbolsForProvider.mockResolvedValue(
      {
        transformedSymbols: ["AAPL.US"],
        originalSymbols: ["AAPL.US"],
        success: true,
        mappingResults: { transformedSymbols: { "AAPL.US": "AAPL.US" } },
      },
    );
    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({
      ...mocks.connectionMock,
    });
    mocks.upstreamSymbolSubscriptionCoordinator.acquire.mockReturnValue([]);

    await service.subscribeStream(
      {
        symbols: ["AAPL.US"],
        wsCapabilityType: "stream-stock-quote",
        preferredProvider: "longport",
      } as any,
      "client-1",
    );

    expect(mocks.streamDataFetcher.subscribeToSymbols).not.toHaveBeenCalled();
    expect(mocks.clientStateManager.addClientSubscription).toHaveBeenCalled();
  });

  it("unsubscribeStream 非最后订阅者时不触发上游退订", async () => {
    const { service, mocks } = createService();
    mocks.clientStateManager.getClientSubscription.mockReturnValue({
      providerName: "longport",
      wsCapabilityType: "stream-stock-quote",
      symbols: new Set(["AAPL.US"]),
    });
    mocks.symbolTransformerService.transformSymbolsForProvider.mockResolvedValue(
      {
        transformedSymbols: ["AAPL.US"],
        originalSymbols: ["AAPL.US"],
        success: true,
        mappingResults: { transformedSymbols: { "AAPL.US": "AAPL.US" } },
      },
    );
    mocks.connectionManager.isConnectionActive.mockReturnValue(true);
    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({
      ...mocks.connectionMock,
    });
    mocks.upstreamSymbolSubscriptionCoordinator.scheduleRelease.mockReturnValue(
      [],
    );

    await service.unsubscribeStream(
      { symbols: ["AAPL.US"] } as any,
      "client-1",
    );

    expect(
      mocks.streamDataFetcher.unsubscribeFromSymbols,
    ).not.toHaveBeenCalled();
    expect(
      mocks.clientStateManager.removeClientSubscription,
    ).toHaveBeenCalledWith("client-1", ["AAPL.US"]);
  });
});

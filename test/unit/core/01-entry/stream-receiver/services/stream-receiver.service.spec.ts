jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { BusinessErrorCode, UniversalExceptionFactory, ComponentIdentifier } from "@common/core/exceptions";
import { REFERENCE_DATA } from "@common/constants/domain";
import { StreamReceiverService } from "@core/01-entry/stream-receiver/services/stream-receiver.service";
import { StreamBatchProcessorService } from "@core/01-entry/stream-receiver/services/stream-batch-processor.service";
import { STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY } from "@core/shared/utils/provider-symbol-identity.util";
import { ConfigService } from "@nestjs/config";
import { MarketInferenceService } from "@common/modules/market-inference/services/market-inference.service";
import { StreamDataFetcherService } from "@core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service";
import { StreamClientStateManager } from "@core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service";
import { UpstreamSymbolSubscriptionCoordinatorService } from "@core/03-fetching/stream-data-fetcher/services/upstream-symbol-subscription-coordinator.service";
import { StreamDataValidator } from "@core/01-entry/stream-receiver/validators/stream-data.validator";
import { StreamConnectionManagerService } from "@core/01-entry/stream-receiver/services/stream-connection-manager.service";
import { StreamSubscriptionContextService } from "@core/01-entry/stream-receiver/services/stream-subscription-context.service";
import { StreamProviderResolutionService } from "@core/01-entry/stream-receiver/services/stream-provider-resolution.service";
import { StreamReconnectCoordinatorService } from "@core/01-entry/stream-receiver/services/stream-reconnect-coordinator.service";
import { StreamIngressBindingService } from "@core/01-entry/stream-receiver/services/stream-ingress-binding.service";
import { WebSocketServerProvider } from "@core/03-fetching/stream-data-fetcher/providers/websocket-server.provider";
import { StreamSubscribeDto } from "@core/01-entry/stream-receiver/dto/stream-subscribe.dto";
import { StreamUnsubscribeDto } from "@core/01-entry/stream-receiver/dto/stream-unsubscribe.dto";
import { ClientReconnectRequest } from "@core/03-fetching/stream-data-fetcher/interfaces";
import { DataTransformerService } from "@core/02-processing/transformer/services/data-transformer.service";
import { SymbolTransformerService } from "@core/02-processing/symbol-transformer/services/symbol-transformer.service";

type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: unknown;
};

type BatchProcessorPrivate = any;

type CachePoint = {
  s?: string;
  t?: number;
};

type BroadcastPoint = {
  symbol?: string;
  timestamp?: number;
};

const createdBatchProcessors: StreamBatchProcessorService[] = [];

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
      get: jest.fn((key: string, defaultValue?: unknown) => {
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
      getProvider: jest.fn((providerName: string) => ({
        name:
          String(providerName || "").trim().toLowerCase() ||
          REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      })),
      getCapability: jest.fn((_providerName: string, capabilityName: string) => ({
        name: capabilityName,
        supportedMarkets: ["US", "HK", "CN", "SG", "JP", "UNKNOWN"],
      })),
      getProviderSelectionDiagnostics: jest.fn(
        (capabilityName: string, market?: string) => ({
          capabilityName,
          market: market ? String(market).trim().toUpperCase() : null,
          candidatesBefore: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT],
          configuredOrder: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT],
          rankedCandidates: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT],
          selectedProvider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
          selectionReason: "configured",
          orderSource: "capability",
        }),
      ),
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
    subscriptionContext: {
      toCanonicalSymbol: jest.fn((s: string) => (typeof s === "string" ? s.trim().toUpperCase() : "")),
      buildCanonicalSymbolKey: jest.fn((s: string, prefix = "") => {
        const c = typeof s === "string" ? s.trim().toUpperCase() : "";
        return c ? `${prefix}${c}` : "";
      }),
      buildSymbolBroadcastKey: jest.fn((s: string) => (typeof s === "string" ? s.trim().toUpperCase() : "")),
      buildSymbolRoomKey: jest.fn((s: string) => {
        const c = typeof s === "string" ? s.trim().toUpperCase() : "";
        return c ? `symbol:${c}` : "";
      }),
      buildSymbolRooms: jest.fn((symbols: string[]) =>
        (symbols || []).map((s) => `symbol:${s.trim().toUpperCase()}`).filter(Boolean),
      ),
      getStandardSymbolIdentityProvidersConfig: jest.fn(() =>
        options?.standardSymbolIdentityProviders ?? "",
      ),
      isProviderUsingStandardSymbolIdentity: jest.fn(() => false),
      throwIdentityProviderSymbolValidationError: jest.fn(),
      findSymbolsWithBoundaryWhitespace: jest.fn(() => []),
      validateIdentityProviderRawSymbolsNoBoundaryWhitespace: jest.fn(),
      validateIdentityProviderStandardSymbols: jest.fn(),
      mapSymbols: jest.fn(async (symbols: string[]) => symbols),
      resolveSymbolMappings: jest.fn(async (symbols: string[]) => ({
        standardSymbols: symbols,
        providerSymbols: symbols,
      })),
      mapSymbolsForProvider: jest.fn(async (_p: string, symbols: string[]) => symbols),
      notifyUpstreamReleased: jest.fn(),
      assertSubscriptionContextCompatibility: jest.fn(),
    },
    providerResolution: {
      resolveProviderForStreamRequest: jest.fn(() => "longport"),
    },
    reconnectCoordinator: {
      detectReconnection: jest.fn(),
      handleReconnection: jest.fn(),
      executeClientReconnect: jest.fn(),
    },
    ingressBinding: {
      setupDataReceiving: jest.fn(),
      handleIncomingData: jest.fn(),
      extractSymbolsFromData: jest.fn(() => []),
    },
    rateLimitService: {
      checkRateLimit: jest.fn(),
    },
    upstreamSymbolSubscriptionCoordinator: {
      acquire: jest.fn((params: Record<string, unknown>) => params.symbols),
      scheduleRelease: jest.fn((params: Record<string, unknown>) => ({
        immediateSymbols: params.symbols,
        scheduledSymbols: [],
      })),
      cancelPendingUnsubscribe: jest.fn(),
    },
    webSocketProvider: {
      isServerAvailable: jest.fn(() => options?.webSocketAvailable ?? true),
      joinClientToRooms: jest.fn().mockResolvedValue(true),
      leaveClientFromRooms: jest.fn().mockResolvedValue(true),
    },
    clientStateManager,
    streamCache,
    connectionMock,
  };

  const service = new StreamReceiverService(
    mocks.configService as unknown as ConfigService,
    mocks.marketInferenceService as unknown as MarketInferenceService,
    mocks.streamDataFetcher as unknown as StreamDataFetcherService,
    mocks.clientStateManager as unknown as StreamClientStateManager,
    mocks.upstreamSymbolSubscriptionCoordinator as unknown as UpstreamSymbolSubscriptionCoordinatorService,
    mocks.dataValidator as unknown as StreamDataValidator,
    mocks.batchProcessor as unknown as StreamBatchProcessorService,
    mocks.connectionManager as unknown as StreamConnectionManagerService,
    mocks.subscriptionContext as unknown as StreamSubscriptionContextService,
    mocks.providerResolution as unknown as StreamProviderResolutionService,
    mocks.reconnectCoordinator as unknown as StreamReconnectCoordinatorService,
    mocks.ingressBinding as unknown as StreamIngressBindingService,
    mocks.rateLimitService as unknown as { checkRateLimit: (key: Record<string, unknown>) => Promise<{ allowed: boolean; limit?: number; current?: number; retryAfter?: number; remaining?: number; resetTime?: number }> },
    mocks.webSocketProvider as unknown as WebSocketServerProvider,
  );

  return { service, mocks };
}

function createBatchProcessor(options?: {
  standardSymbolIdentityProviders?: string;
  webSocketAvailable?: boolean;
  configOverrides?: Record<string, unknown>;
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
      get: jest.fn((key: string, defaultValue?: unknown) => {
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
    mocks.configService as unknown as ConfigService,
    mocks.eventBus as any,
    mocks.dataTransformerService as unknown as DataTransformerService,
    mocks.symbolTransformerService as unknown as SymbolTransformerService,
    mocks.streamDataFetcher as unknown as StreamDataFetcherService,
    mocks.clientStateManager as unknown as StreamClientStateManager,
    mocks.dataValidator as unknown as StreamDataValidator,
    mocks.webSocketProvider as unknown as WebSocketServerProvider,
  );
  createdBatchProcessors.push(batchProcessor);

  return { batchProcessor, mocks };
}

afterEach(async () => {
  while (createdBatchProcessors.length > 0) {
    const batchProcessor = createdBatchProcessors.pop();
    if (!batchProcessor) {
      continue;
    }
    await batchProcessor.onModuleDestroy();
  }
});

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
      service.subscribeStream(dto as unknown as StreamSubscribeDto, "client-1", "127.0.0.1"),
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
      service.subscribeStream(dto as unknown as StreamSubscribeDto, "client-1", "127.0.0.1"),
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

  it("subscribeStream: 限流依赖异常时应拒绝连接且不触发 validateSubscribeRequest", async () => {
    const dto = {
      symbols: ["AAPL.US"],
      wsCapabilityType: "quote",
      preferredProvider: "longport",
    };
    const { service, mocks } = createService();
    mocks.rateLimitService.checkRateLimit.mockRejectedValue(
      new Error("redis unavailable"),
    );

    await expect(
      service.subscribeStream(
        dto as unknown as StreamSubscribeDto,
        "client-1",
        "127.0.0.1",
      ),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
      operation: "subscribeStream",
      context: expect.objectContaining({
        reason: "rate_limit_service_unavailable",
      }),
    });

    expect(mocks.dataValidator.validateSubscribeRequest).not.toHaveBeenCalled();
    expect(
      mocks.connectionManager.getOrCreateConnection,
    ).not.toHaveBeenCalled();
    expect(mocks.streamDataFetcher.subscribeToSymbols).not.toHaveBeenCalled();
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
      service.subscribeStream(dto as unknown as StreamSubscribeDto, "client-1", undefined, {
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

    const validationError = UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.STREAM_RECEIVER,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: "subscribeStream",
      message: "Identity provider requires standard symbol format",
      context: { reason: "non_standard_symbol_in_identity_provider" },
    });
    mocks.subscriptionContext.validateIdentityProviderRawSymbolsNoBoundaryWhitespace.mockImplementation(() => {
      throw validationError;
    });

    await expect(
      service.subscribeStream(dto as unknown as StreamSubscribeDto, "client-1"),
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
      service.unsubscribeStream(dto as unknown as StreamUnsubscribeDto, "client-1"),
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


    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({
      id: "conn-1",
    });
    mocks.streamDataFetcher.subscribeToSymbols.mockRejectedValue(
      new Error("subscribe failed"),
    );

    await expect(
      service.subscribeStream(dto as unknown as StreamSubscribeDto, "client-1"),
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


    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({
      id: "conn-1",
    });
    mocks.streamDataFetcher.subscribeToSymbols.mockResolvedValue(undefined);

    await service.subscribeStream(dto as unknown as StreamSubscribeDto, "client-1");

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

  it("subscribeStream: 真实 websocket 客户端加入房间失败时应回滚本地订阅与本次上游订阅", async () => {
    const dto = {
      symbols: ["AAPL.US"],
      wsCapabilityType: "quote",
      preferredProvider: "longport",
    };
    const { service, mocks } = createService({
      subscribeValidation: {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: dto,
      },
    });

    mocks.webSocketProvider.joinClientToRooms.mockResolvedValue(false);

    await expect(
      service.subscribeStream(dto as unknown as StreamSubscribeDto, "client-1"),
    ).rejects.toThrow("join websocket rooms failed");

    expect(
      mocks.clientStateManager.removeClientSubscription,
    ).toHaveBeenCalledWith("client-1", ["AAPL.US"]);
    expect(
      mocks.streamDataFetcher.unsubscribeFromSymbols,
    ).toHaveBeenCalledWith(mocks.connectionMock, ["AAPL.US"]);
  });

  it("subscribeStream: 同一 client 不允许混用不同 provider", async () => {
    const dto = {
      symbols: ["MSFT.US"],
      wsCapabilityType: "stream-stock-quote",
      preferredProvider: "longport",
    };
    const { service, mocks } = createService({
      subscribeValidation: {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: dto,
      },
    });
    mocks.clientStateManager.getClientSubscription.mockReturnValue({
      providerName: "infoway",
      wsCapabilityType: "stream-stock-quote",
      symbols: new Set(["AAPL.US"]),
    });

    const mixedError = UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.STREAM_RECEIVER,
      errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
      operation: "subscribeStream",
      message: "Mixed provider/capability subscriptions not allowed",
      context: { reason: "mixed_subscription_context_for_same_client" },
    });
    mocks.subscriptionContext.assertSubscriptionContextCompatibility.mockImplementation(() => {
      throw mixedError;
    });

    await expect(
      service.subscribeStream(dto as unknown as StreamSubscribeDto, "client-1"),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
      operation: "subscribeStream",
      context: expect.objectContaining({
        reason: "mixed_subscription_context_for_same_client",
      }),
    });

    expect(
      mocks.connectionManager.getOrCreateConnection,
    ).not.toHaveBeenCalled();
    expect(
      mocks.upstreamSymbolSubscriptionCoordinator.acquire,
    ).not.toHaveBeenCalled();
  });

  it("subscribeStream: 同一 client 不允许混用不同 capability", async () => {
    const dto = {
      symbols: ["AAPL.US"],
      wsCapabilityType: "stream-crypto-quote",
      preferredProvider: "longport",
    };
    const { service, mocks } = createService({
      subscribeValidation: {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: dto,
      },
    });
    mocks.clientStateManager.getClientSubscription.mockReturnValue({
      providerName: "longport",
      wsCapabilityType: "stream-stock-quote",
      symbols: new Set(["AAPL.US"]),
    });

    const mixedError = UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.STREAM_RECEIVER,
      errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
      operation: "subscribeStream",
      message: "Mixed provider/capability subscriptions not allowed",
      context: { reason: "mixed_subscription_context_for_same_client" },
    });
    mocks.subscriptionContext.assertSubscriptionContextCompatibility.mockImplementation(() => {
      throw mixedError;
    });

    await expect(
      service.subscribeStream(dto as unknown as StreamSubscribeDto, "client-1"),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
      operation: "subscribeStream",
      context: expect.objectContaining({
        reason: "mixed_subscription_context_for_same_client",
      }),
    });

    expect(
      mocks.connectionManager.getOrCreateConnection,
    ).not.toHaveBeenCalled();
    expect(
      mocks.upstreamSymbolSubscriptionCoordinator.acquire,
    ).not.toHaveBeenCalled();
  });
});

describe("StreamReceiverService capability-aware provider selection", () => {
  it("subscribeStream 自动选源应按 capability 级诊断结果选 provider", async () => {
    const { service, mocks } = createService({
      subscribeValidation: {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: {
          symbols: ["BTCUSDT"],
          wsCapabilityType: "stream-crypto-quote",
        },
      },
    });
    mocks.providerResolution.resolveProviderForStreamRequest.mockReturnValue(
      REFERENCE_DATA.PROVIDER_IDS.INFOWAY,
    );

    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({ id: "conn-1" });
    mocks.streamDataFetcher.subscribeToSymbols.mockResolvedValue(undefined);

    await service.subscribeStream(
      {
        symbols: ["BTCUSDT"],
        wsCapabilityType: "stream-crypto-quote",
      } as unknown as StreamSubscribeDto,
      "client-crypto",
    );

    expect(
      mocks.providerResolution.resolveProviderForStreamRequest,
    ).toHaveBeenCalledWith(expect.objectContaining({
      symbols: ["BTCUSDT"],
      capability: "stream-crypto-quote",
    }));
    expect(mocks.connectionManager.getOrCreateConnection).toHaveBeenCalledWith(
      REFERENCE_DATA.PROVIDER_IDS.INFOWAY,
      "stream-crypto-quote",
      expect.any(String),
      ["BTCUSDT"],
      "client-crypto",
    );
  });

  it("subscribeStream 指定的 preferredProvider 不支持 capability 时应 fail-fast", async () => {
    const { service, mocks } = createService({
      subscribeValidation: {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: {
          symbols: ["AAPL.US"],
          wsCapabilityType: "stream-crypto-quote",
          preferredProvider: "longport",
        },
      },
    });

    const capabilityError = UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.STREAM_RECEIVER,
      errorCode: BusinessErrorCode.DATA_NOT_FOUND,
      operation: "subscribeStream",
      message: "Preferred provider unavailable",
      context: { reason: "preferred_provider_capability_missing" },
    });
    mocks.providerResolution.resolveProviderForStreamRequest.mockImplementation(() => {
      throw capabilityError;
    });

    await expect(
      service.subscribeStream(
        {
          symbols: ["AAPL.US"],
          wsCapabilityType: "stream-crypto-quote",
          preferredProvider: "longport",
        } as unknown as StreamSubscribeDto,
        "client-preferred-miss",
      ),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_NOT_FOUND,
      operation: "subscribeStream",
      context: expect.objectContaining({
        reason: "preferred_provider_capability_missing",
      }),
    });

    expect(mocks.connectionManager.getOrCreateConnection).not.toHaveBeenCalled();
  });

  it("subscribeStream 自动选源无候选 provider 时应抛 DATA_NOT_FOUND", async () => {
    const { service, mocks } = createService({
      subscribeValidation: {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: {
          symbols: ["BTCUSDT"],
          wsCapabilityType: "stream-crypto-quote",
        },
      },
    });

    const noProviderError = UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.STREAM_RECEIVER,
      errorCode: BusinessErrorCode.DATA_NOT_FOUND,
      operation: "subscribeStream",
      message: "No provider found",
      context: { reason: "no_provider_for_capability_market" },
    });
    mocks.providerResolution.resolveProviderForStreamRequest.mockImplementation(() => {
      throw noProviderError;
    });

    await expect(
      service.subscribeStream(
        {
          symbols: ["BTCUSDT"],
          wsCapabilityType: "stream-crypto-quote",
        } as unknown as StreamSubscribeDto,
        "client-no-provider",
      ),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_NOT_FOUND,
      operation: "subscribeStream",
      context: expect.objectContaining({
        reason: "no_provider_for_capability_market",
      }),
    });

    expect(mocks.connectionManager.getOrCreateConnection).not.toHaveBeenCalled();
  });

  it("handleClientReconnect 应委托给 reconnectCoordinator.executeClientReconnect", async () => {
    const { service, mocks } = createService();

    const mockResponse = {
      success: false,
      clientId: "client-reconnect",
      confirmedSymbols: [],
      recoveryStrategy: { willRecover: false },
      connectionInfo: {
        provider: "",
        connectionId: "",
        serverTimestamp: Date.now(),
        heartbeatInterval: 30000,
      },
      instructions: {
        action: "resubscribe",
        message: "Preferred provider 'longport' is unavailable for market 'US'",
        params: {
          reason: "Preferred provider 'longport' is unavailable for market 'US'",
        },
      },
    };
    mocks.reconnectCoordinator.executeClientReconnect.mockResolvedValue(mockResponse);

    const reconnectRequest = {
      clientId: "client-reconnect",
      lastReceiveTimestamp: Date.now() - 1000,
      symbols: ["AAPL.US"],
      wsCapabilityType: "stream-stock-quote",
      preferredProvider: "longport",
      reason: "network_error",
    };

    const result = await service.handleClientReconnect(reconnectRequest as unknown as ClientReconnectRequest);

    expect(mocks.reconnectCoordinator.executeClientReconnect).toHaveBeenCalledWith(reconnectRequest);
    expect(result.success).toBe(false);
    expect(result.instructions?.params).toEqual(
      expect.objectContaining({
        reason: expect.stringContaining("Preferred provider 'longport'"),
      }),
    );
  });
});

describe("StreamReceiverService provider级标准符号直通", () => {
  it("provider 命中时 subscribeStream 应使用 subscriptionContext.resolveSymbolMappings 返回的 canonical symbols", async () => {
    const { service, mocks } = createService({
      standardSymbolIdentityProviders: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      subscribeValidation: {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: {
          symbols: ["aapl.us", "00700.hk"],
          wsCapabilityType: "quote",
          preferredProvider: "longport",
        },
      },
    });

    mocks.subscriptionContext.resolveSymbolMappings.mockResolvedValue({
      standardSymbols: ["AAPL.US", "00700.HK"],
      providerSymbols: ["AAPL.US", "00700.HK"],
    });

    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({ id: "conn-1" });
    mocks.streamDataFetcher.subscribeToSymbols.mockResolvedValue(undefined);

    await service.subscribeStream(
      { symbols: ["aapl.us", "00700.hk"], wsCapabilityType: "quote", preferredProvider: "longport" } as unknown as StreamSubscribeDto,
      "client-1",
    );

    expect(mocks.subscriptionContext.resolveSymbolMappings).toHaveBeenCalledWith(
      ["aapl.us", "00700.hk"],
      expect.any(String),
      expect.any(String),
    );
  });

  it("provider 命中时遇到非标准符号 subscriptionContext 应抛 DATA_VALIDATION_FAILED", async () => {
    const { service, mocks } = createService({
      standardSymbolIdentityProviders: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      subscribeValidation: {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: {
          symbols: ["AAPL"],
          wsCapabilityType: "quote",
          preferredProvider: "longport",
        },
      },
    });

    const validationError = UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.STREAM_RECEIVER,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: "resolveSymbolMappings",
      message: "Identity provider requires standard symbol format",
      context: { reason: "non_standard_symbol_in_identity_provider" },
    });
    mocks.subscriptionContext.resolveSymbolMappings.mockRejectedValue(validationError);

    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({ id: "conn-1" });

    await expect(
      service.subscribeStream(
        { symbols: ["AAPL"], wsCapabilityType: "quote", preferredProvider: "longport" } as unknown as StreamSubscribeDto,
        "client-1",
      ),
    ).rejects.toMatchObject({
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: "resolveSymbolMappings",
    });
  });

  it("provider 未命中时 subscriptionContext 应执行完整符号映射流程", async () => {
    const { service, mocks } = createService({
      standardSymbolIdentityProviders: "infoway",
      subscribeValidation: {
        isValid: true,
        errors: [],
        warnings: [],
        sanitizedData: {
          symbols: ["AAPL", "00700"],
          wsCapabilityType: "quote",
          preferredProvider: "longport",
        },
      },
    });

    mocks.subscriptionContext.resolveSymbolMappings.mockResolvedValue({
      standardSymbols: ["AAPL.US", "00700.HK"],
      providerSymbols: ["AAPL", "700"],
    });

    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({ id: "conn-1" });
    mocks.streamDataFetcher.subscribeToSymbols.mockResolvedValue(undefined);

    await service.subscribeStream(
      { symbols: ["AAPL", "00700"], wsCapabilityType: "quote", preferredProvider: "longport" } as unknown as StreamSubscribeDto,
      "client-1",
    );

    expect(mocks.subscriptionContext.resolveSymbolMappings).toHaveBeenCalledWith(
      ["AAPL", "00700"],
      expect.any(String),
      expect.any(String),
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

    mocks.subscriptionContext.resolveSymbolMappings.mockResolvedValue({
      standardSymbols: ["aapl.us", "AAPL.US"],
      providerSymbols: ["aapl.us"],
    });
    mocks.subscriptionContext.buildSymbolRooms.mockReturnValue(["symbol:AAPL.US"]);
    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({
      id: "conn-1",
    });
    mocks.streamDataFetcher.subscribeToSymbols.mockResolvedValue(undefined);

    await service.subscribeStream(subscribeDto as unknown as StreamSubscribeDto, "client-1");

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
    mocks.subscriptionContext.resolveSymbolMappings.mockResolvedValue({
      standardSymbols: ["aapl.us", "AAPL.US"],
      providerSymbols: ["aapl.us"],
    });
    mocks.subscriptionContext.buildSymbolRooms.mockReturnValue(["symbol:AAPL.US"]);

    await service.unsubscribeStream(unsubscribeDto as unknown as StreamUnsubscribeDto, "client-1");

    expect(mocks.webSocketProvider.leaveClientFromRooms).toHaveBeenCalledWith(
      "client-1",
      ["symbol:AAPL.US"],
    );
  });

  it("unsubscribeStream: 真实 websocket 客户端退出房间失败时应回滚本地订阅", async () => {
    const unsubscribeDto = {
      symbols: ["AAPL.US"],
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
      symbols: new Set(["AAPL.US"]),
    });
    mocks.connectionManager.isConnectionActive.mockReturnValue(false);
    mocks.webSocketProvider.leaveClientFromRooms.mockResolvedValue(false);

    await expect(
      service.unsubscribeStream(
        unsubscribeDto as unknown as StreamUnsubscribeDto,
        "client-1",
      ),
    ).rejects.toThrow("leave websocket rooms failed");

    expect(
      mocks.clientStateManager.addClientSubscription,
    ).toHaveBeenCalledWith("client-1", ["AAPL.US"], "quote", "longport");
  });

  it("pipelineBroadcastData: 广播路径应按 canonical symbol 聚合并分发", async () => {
    const { batchProcessor, mocks } = createBatchProcessor();
    mocks.clientStateManager.broadcastToSymbolViaGateway.mockResolvedValue(
      undefined,
    );

    await (batchProcessor as unknown as BatchProcessorPrivate).pipelineBroadcastData(
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
    expect(firstPayload.every((item: Record<string, unknown>) => item.symbol === "AAPL.US")).toBe(
      true,
    );
    expect(
      firstPayload.every((item: Record<string, unknown>) => typeof item.timestamp === "number"),
    ).toBe(true);
  });

  it("pipelineCacheData: 缓存键应与 room/broadcast 使用同一 canonical 规则", async () => {
    const { mocks: serviceMocks } = createService();
    const { batchProcessor, mocks } = createBatchProcessor();
    const canonicalSymbol = "AAPL.US";

    expect(serviceMocks.subscriptionContext.buildSymbolRoomKey("  aapl.us  ")).toBe(
      `symbol:${canonicalSymbol}`,
    );
    expect(serviceMocks.subscriptionContext.buildSymbolBroadcastKey("  aapl.us  ")).toBe(
      canonicalSymbol,
    );

    await (batchProcessor as unknown as BatchProcessorPrivate).pipelineCacheData(
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
      cachedPoints.every((point: Record<string, unknown>) => point.s === canonicalSymbol),
    ).toBe(true);
  });

  it("pipelineBroadcastData: 非法 payload 应统一丢弃并记录原因", async () => {
    const { batchProcessor, mocks } = createBatchProcessor();
    mocks.clientStateManager.broadcastToSymbolViaGateway.mockResolvedValue(
      undefined,
    );

    await (batchProcessor as unknown as BatchProcessorPrivate).pipelineBroadcastData(
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
    expect((batchProcessor as unknown as BatchProcessorPrivate).logger.warn).toHaveBeenCalledWith(
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

    await (batchProcessor as unknown as BatchProcessorPrivate).pipelineCacheData(
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
    expect(cachedPoints.every((point: Record<string, unknown>) => point.s === "AAPL.US")).toBe(
      true,
    );
    expect((batchProcessor as unknown as BatchProcessorPrivate).logger.warn).toHaveBeenCalledWith(
      "流数据因无效payload被丢弃",
      expect.objectContaining({
        stage: "cache",
      }),
    );
  });

  it("pipelineCacheData: 批内完全重复 payload 应去重后再写缓存", async () => {
    const { batchProcessor, mocks } = createBatchProcessor();

    await (batchProcessor as unknown as BatchProcessorPrivate).pipelineCacheData(
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
      ((batchProcessor as unknown as BatchProcessorPrivate).logger.debug as jest.Mock).mock.calls,
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

    await (batchProcessor as unknown as BatchProcessorPrivate).pipelineCacheData(
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
    expect(cachedPoints.every((point: Record<string, unknown>) => point.s === "AAPL.US")).toBe(
      true,
    );
    expect(cachedPoints.filter((point: Record<string, unknown>) => point.p === 0)).toHaveLength(2);
    expect(cachedPoints.some((point: Record<string, unknown>) => point.t === 1700000000000)).toBe(
      true,
    );
    expect(
      cachedPoints.some(
        (point: Record<string, unknown>) => point.t === Date.parse("2024-01-01T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect((batchProcessor as unknown as BatchProcessorPrivate).logger.warn).toHaveBeenCalledWith(
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

    await (batchProcessor as unknown as BatchProcessorPrivate).pipelineBroadcastData(
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
      broadcastPayload.every((item: Record<string, unknown>) => item.symbol === "AAPL.US"),
    ).toBe(true);
    expect(
      broadcastPayload.filter((item: Record<string, unknown>) => item.price === 0),
    ).toHaveLength(2);
    expect(
      broadcastPayload.some((item: Record<string, unknown>) => item.timestamp === 1700000000000),
    ).toBe(true);
    expect(
      broadcastPayload.some(
        (item: Record<string, unknown>) =>
          item.timestamp === Date.parse("2024-01-01T00:00:00.000Z"),
      ),
    ).toBe(true);
    expect((batchProcessor as unknown as BatchProcessorPrivate).logger.warn).toHaveBeenCalledWith(
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

    await (batchProcessor as unknown as BatchProcessorPrivate).pipelineBroadcastData(
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
      ((batchProcessor as unknown as BatchProcessorPrivate).logger.debug as jest.Mock).mock.calls,
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

    await (batchProcessor as unknown as BatchProcessorPrivate).pipelineCacheData(
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
    const cachedPoints = mocks.streamCache.setData.mock.calls[0][1] as CachePoint[];
    expect(cachedPoints).toHaveLength(2);
    expect(
      cachedPoints.every(
        (point: CachePoint) =>
          point.s === "AAPL.US" && point.t === 1700000000000,
      ),
    ).toBe(true);
    expect((batchProcessor as unknown as BatchProcessorPrivate).logger.warn).toHaveBeenCalledWith(
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

    await (batchProcessor as unknown as BatchProcessorPrivate).pipelineCacheData(
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
    expect((batchProcessor as unknown as BatchProcessorPrivate).logger.warn).toHaveBeenCalledWith(
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

    await (batchProcessor as unknown as BatchProcessorPrivate).pipelineBroadcastData(
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
      mocks.clientStateManager.broadcastToSymbolViaGateway.mock.calls[0][1] as BroadcastPoint[];
    expect(broadcastPayload).toHaveLength(2);
    expect(
      broadcastPayload.every(
        (item: BroadcastPoint) =>
          item.symbol === "AAPL.US" && item.timestamp === 1700000000000,
      ),
    ).toBe(true);
    expect((batchProcessor as unknown as BatchProcessorPrivate).logger.warn).toHaveBeenCalledWith(
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

    await (batchProcessor as unknown as BatchProcessorPrivate).pipelineCacheData(transformedData, [
      "AAPL.US",
      "00700.HK",
    ]);
    await (batchProcessor as unknown as BatchProcessorPrivate).pipelineBroadcastData(transformedData, [
      "AAPL.US",
      "00700.HK",
    ]);

    expect(mocks.dataValidator.isValidSymbolFormat).toHaveBeenCalledTimes(8);

    const cacheKeys = mocks.streamCache.setData.mock.calls
      .map(([cacheKey]: [string, unknown, string]) => cacheKey)
      .sort();
    expect(cacheKeys).toEqual(["quote:00700.HK", "quote:AAPL.US"]);

    const broadcastSymbols =
      mocks.clientStateManager.broadcastToSymbolViaGateway.mock.calls
        .map(([symbol]: [string, unknown, unknown]) => symbol)
        .sort();
    expect(broadcastSymbols).toEqual(["00700.HK", "AAPL.US"]);

    const droppedWarnCalls = (
      (batchProcessor as unknown as BatchProcessorPrivate).logger.warn as jest.Mock
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
      (batchProcessor as unknown as BatchProcessorPrivate).readBooleanConfig("STREAM_CACHE_ENABLED", false),
    ).toBe(true);

    mocks.configService.get.mockReturnValueOnce(false);
    expect(
      (batchProcessor as unknown as BatchProcessorPrivate).readBooleanConfig("STREAM_CACHE_ENABLED", true),
    ).toBe(false);

    mocks.configService.get.mockReturnValueOnce(1);
    expect(
      (batchProcessor as unknown as BatchProcessorPrivate).readBooleanConfig("STREAM_CACHE_ENABLED", false),
    ).toBe(true);

    mocks.configService.get.mockReturnValueOnce(0);
    expect(
      (batchProcessor as unknown as BatchProcessorPrivate).readBooleanConfig("STREAM_CACHE_ENABLED", true),
    ).toBe(false);
  });

  it.each(["true", " TRUE ", "1", "yes", "on"])(
    "readBooleanConfig: 字符串真值 %p 应返回 true",
    (rawValue) => {
      const { batchProcessor, mocks } = createBatchProcessor();
      mocks.configService.get.mockReturnValueOnce(rawValue);

      expect(
        (batchProcessor as unknown as BatchProcessorPrivate).readBooleanConfig(
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
        (batchProcessor as unknown as BatchProcessorPrivate).readBooleanConfig("STREAM_CACHE_ENABLED", true),
      ).toBe(false);
    },
  );

  it.each([null, undefined])(
    "readBooleanConfig: 空值 %p 应回退 default",
    (rawValue) => {
      const { batchProcessor, mocks } = createBatchProcessor();
      mocks.configService.get.mockReturnValueOnce(rawValue);

      expect(
        (batchProcessor as unknown as BatchProcessorPrivate).readBooleanConfig("STREAM_CACHE_ENABLED", true),
      ).toBe(true);
    },
  );

  it.each(["maybe", "", "   ", { enabled: true }])(
    "readBooleanConfig: 非法值 %p 应抛出配置错误",
    (rawValue) => {
      const { batchProcessor, mocks } = createBatchProcessor();
      mocks.configService.get.mockReturnValueOnce(rawValue);

      try {
        (batchProcessor as unknown as BatchProcessorPrivate).readBooleanConfig("STREAM_CACHE_ENABLED", true);
        throw new Error("should_throw");
      } catch (error: unknown) {
        expect(error).toMatchObject({
          errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        });
      }
    },
  );
});

// 注意：extractSymbolsFromData/setupDataReceiving/handleIncomingData 已迁移到 StreamIngressBindingService
// 相关测试见 stream-ingress-binding.service.spec.ts

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
      } as unknown as StreamSubscribeDto,
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
    mocks.upstreamSymbolSubscriptionCoordinator.scheduleRelease.mockReturnValue({
      immediateSymbols: [],
      scheduledSymbols: [],
    });

    await service.unsubscribeStream(
      { symbols: ["AAPL.US"] } as unknown as StreamUnsubscribeDto,
      "client-1",
    );

    expect(
      mocks.streamDataFetcher.unsubscribeFromSymbols,
    ).not.toHaveBeenCalled();
    expect(
      mocks.clientStateManager.removeClientSubscription,
    ).toHaveBeenCalledWith("client-1", ["AAPL.US"]);
  });

  it("unsubscribeStream 最后一个订阅者进入 upstream grace 时应返回 scheduled release 信息", async () => {
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
    mocks.upstreamSymbolSubscriptionCoordinator.scheduleRelease.mockReturnValue({
      immediateSymbols: [],
      scheduledSymbols: [
        {
          symbol: "AAPL.US",
          graceExpiresAt: "2026-03-21T12:00:15.000Z",
        },
      ],
    });

    const result = await service.unsubscribeStream(
      { symbols: ["AAPL.US"] } as unknown as StreamUnsubscribeDto,
      "client-1",
    );

    expect(result).toEqual({
      unsubscribedSymbols: ["AAPL.US"],
      upstreamReleasedSymbols: [],
      upstreamScheduledSymbols: [
        {
          symbol: "AAPL.US",
          graceExpiresAt: "2026-03-21T12:00:15.000Z",
        },
      ],
    });
    expect(
      mocks.streamDataFetcher.unsubscribeFromSymbols,
    ).not.toHaveBeenCalled();
  });

  it("unsubscribeStream 即时上游退订失败时应回滚本地状态并取消待退订", async () => {
    const { service, mocks } = createService();
    mocks.clientStateManager.getClientSubscription.mockReturnValue({
      providerName: "longport",
      wsCapabilityType: "stream-stock-quote",
      symbols: new Set(["AAPL.US"]),
    });
    mocks.connectionManager.isConnectionActive.mockReturnValue(true);
    mocks.connectionManager.getOrCreateConnection.mockResolvedValue({
      ...mocks.connectionMock,
    });
    mocks.upstreamSymbolSubscriptionCoordinator.scheduleRelease.mockReturnValue({
      immediateSymbols: ["AAPL.US"],
      scheduledSymbols: [],
    });
    mocks.streamDataFetcher.unsubscribeFromSymbols.mockRejectedValue(
      new Error("unsubscribe failed"),
    );

    await expect(
      service.unsubscribeStream(
        { symbols: ["AAPL.US"] } as unknown as StreamUnsubscribeDto,
        "client-1",
      ),
    ).rejects.toThrow("unsubscribe failed");

    expect(
      mocks.upstreamSymbolSubscriptionCoordinator.cancelPendingUnsubscribe,
    ).toHaveBeenCalledWith(
      "longport",
      "stream-stock-quote",
      ["AAPL.US"],
    );
    expect(mocks.streamDataFetcher.subscribeToSymbols).toHaveBeenCalledWith(
      expect.objectContaining({ id: "conn-1" }),
      ["AAPL.US"],
    );
    expect(mocks.clientStateManager.addClientSubscription).toHaveBeenCalledWith(
      "client-1",
      ["AAPL.US"],
      "stream-stock-quote",
      "longport",
    );
  });

  it("unsubscribeStream 连接不存在时不应伪造 upstream scheduled release 信息", async () => {
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
    mocks.connectionManager.isConnectionActive.mockReturnValue(false);

    const result = await service.unsubscribeStream(
      { symbols: ["AAPL.US"] } as unknown as StreamUnsubscribeDto,
      "client-1",
    );

    expect(result).toEqual({
      unsubscribedSymbols: ["AAPL.US"],
      upstreamReleasedSymbols: [],
      upstreamScheduledSymbols: [],
    });
  });
});

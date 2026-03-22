// RECENT_METRICS_COUNT 已移动到监控配置中，通过 configService 动态获取
import { Injectable, OnModuleDestroy, Inject, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createLogger } from "@common/logging/index";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier
} from '@common/core/exceptions';
import { STREAM_RECEIVER_ERROR_CODES } from '../constants/stream-receiver-error-codes.constants';
import { StreamDataFetcherService } from "../../../03-fetching/stream-data-fetcher/services/stream-data-fetcher.service";
import { StreamClientStateManager } from "../../../03-fetching/stream-data-fetcher/services/stream-client-state-manager.service";
import {
  UpstreamSymbolSubscriptionCoordinatorService,
  type ScheduledUpstreamRelease,
} from "../../../03-fetching/stream-data-fetcher/services/upstream-symbol-subscription-coordinator.service";
import {
  ClientReconnectRequest,
  ClientReconnectResponse,
} from "../../../03-fetching/stream-data-fetcher/interfaces";
import { StreamSubscribeDto } from "../dto/stream-subscribe.dto";
import { StreamUnsubscribeDto } from "../dto/stream-unsubscribe.dto";
import {
  StreamConnection,
} from "../../../03-fetching/stream-data-fetcher/interfaces";
import {
  StreamReceiverConfig,
  defaultStreamReceiverConfig,
  StreamReceiverConfigKeys,
  mergeStreamReceiverConfig,
  validateStreamReceiverConfig,
} from "../config/stream-receiver.config";
import { resolveMarketTypeFromSymbols } from "@core/shared/utils/market-type.util";



export type {
  UnsubscribeStreamResult,
  UnsubscribeStreamOptions,
} from "../interfaces/subscription-context.interface";
import type {
  UnsubscribeStreamResult,
  UnsubscribeStreamOptions,
} from "../interfaces/subscription-context.interface";
import { StreamSubscriptionContextService } from "./stream-subscription-context.service";
import { StreamProviderResolutionService } from "./stream-provider-resolution.service";
import { StreamReconnectCoordinatorService } from "./stream-reconnect-coordinator.service";

/**
 * StreamReceiver - 重构后的流数据接收器
 *
 * 🎯 核心职责 (重构后精简)：
 * - 流数据订阅和取消订阅协调
 * - 数据路由和分发
 * - 与 StreamDataFetcher 集成的连接管理
 * - 数据缓存策略协调
 *
 * ❌ 不再负责：
 * - 直接的 WebSocket 连接管理 (由 StreamDataFetcher 负责)
 * - 本地数据缓存 (由 StreamCacheStandardizedService 负责)
 * - 直接的数据转换 (统一由 DataTransformerService 负责)
 * - 客户端状态跟踪 (由 StreamClientStateManager 负责)
 *
 * 🔗 Pipeline 位置：WebSocket → **StreamReceiver** → StreamDataFetcher → Transformer → Storage
 */
import { MarketInferenceService } from '@common/modules/market-inference/services/market-inference.service';
import { StreamDataValidator } from '../validators/stream-data.validator';
import { StreamBatchProcessorService } from './stream-batch-processor.service';
import { StreamConnectionManagerService } from './stream-connection-manager.service';
import { StreamIngressBindingService } from './stream-ingress-binding.service';
import {
  WebSocketServerProvider,
  WEBSOCKET_SERVER_TOKEN,
} from "../../../03-fetching/stream-data-fetcher/providers/websocket-server.provider";

@Injectable()
export class StreamReceiverService implements OnModuleDestroy {
  private readonly logger = createLogger("StreamReceiver");

  // P1重构: 配置管理 - 从硬编码迁移到ConfigService
  private readonly config: StreamReceiverConfig;


  constructor(
    // P1重构: 添加配置服务
    private readonly configService: ConfigService,
    // ✅ Phase 4 精简依赖注入
    private readonly marketInferenceService: MarketInferenceService,
    private readonly streamDataFetcher: StreamDataFetcherService,
    private readonly clientStateManager: StreamClientStateManager,
    private readonly upstreamSymbolSubscriptionCoordinator: UpstreamSymbolSubscriptionCoordinatorService,
    // 🆕 P2重构: 数据验证模块
    private readonly dataValidator: StreamDataValidator,
    // 🆕 重构: 两个专职服务
    private readonly batchProcessor: StreamBatchProcessorService,
    private readonly connectionManager: StreamConnectionManagerService,
    // 🆕 Phase 2: 订阅上下文服务
    private readonly subscriptionContext: StreamSubscriptionContextService,
    // 🆕 Phase 2: Provider 决策服务
    private readonly providerResolution: StreamProviderResolutionService,
    // 🆕 Phase 4: 重连协调服务
    private readonly reconnectCoordinator: StreamReconnectCoordinatorService,
    // 🆕 Phase 5: 入站绑定服务
    private readonly ingressBinding: StreamIngressBindingService,
    @Optional() private readonly rateLimitService?: { checkRateLimit: (key: Record<string, unknown>) => Promise<{ allowed: boolean; limit?: number; current?: number; retryAfter?: number; remaining?: number; resetTime?: number }> },
    @Optional() @Inject(WEBSOCKET_SERVER_TOKEN)
    private readonly webSocketProvider?: WebSocketServerProvider,
  ) {
    // P1重构: 初始化配置管理
    this.config = this.initializeConfig();

    this.logger.log(
      "StreamReceiver 重构完成 - 事件化监控 + 配置管理 + 精简依赖架构 + 连接清理 + 频率限制 + 内存防护 + 动态批处理",
    );

    // 注意：批量处理、连接清理、内存监控、动态批处理已迁移到专职服务
    this.setupSubscriptionChangeListener();
  }

  // =============== 事件化监控辅助方法 ===============


  /**
   * 记录 WebSocket 连接监控事件
   * 与现有事件驱动架构兼容的连接监控方法
   */
  recordWebSocketConnection(
    clientId: string,
    connected: boolean,
    _metadata?: {
      remoteAddress?: string;
      userAgent?: string;
      apiKeyName?: string;
    }
  ): void {
    try {
      // 连接状态指标
      // 监控事件已移除（监控模块已删除）
      // 如需监控，请使用外部工具（如 Prometheus）

      // 连接计数指标 - 更新活跃连接数
      const currentConnections = this.connectionManager.getActiveConnectionsCount();
      
      // 监控事件已移除（监控模块已删除）
      // 如需监控，请使用外部工具（如 Prometheus）

      // 业务监控事件
      this.emitBusinessEvent(
        "websocket_client_lifecycle",
        1,
        {
          event: connected ? "client_connected" : "client_disconnected",
          clientId,
          totalConnections: currentConnections,
          timestamp: Date.now()
        }
      );

      this.logger.debug(`WebSocket 连接监控事件已记录: ${connected ? '连接' : '断开'}`, {
        clientId,
        currentConnections,
        action: connected ? "connect" : "disconnect"
      });

    } catch (error) {
      this.logger.warn("WebSocket 连接监控事件发送失败", {
        clientId,
        connected,
        error: error.message,
      });
    }
  }

  /**
   * 记录 WebSocket 连接质量监控事件
   * 用于监控连接建立时间、认证状态等
   */
  recordWebSocketConnectionQuality(
    clientId: string,
    connectionTime: number,
    authStatus: 'success' | 'failed',
    _errorReason?: string
  ): void {
    try {
      // 连接建立时间监控
      // 监控事件已移除（监控模块已删除）
      // 如需监控，请使用外部工具（如 Prometheus）

      // 认证状态监控
      // 监控事件已移除（监控模块已删除）
      // 如需监控，请使用外部工具（如 Prometheus）

      // 如果认证失败，记录错误监控
      if (authStatus === 'failed') {
        // 监控事件已移除（监控模块已删除）
      // 如需监控，请使用外部工具（如 Prometheus）
      }

    } catch (error) {
      this.logger.warn("WebSocket 连接质量监控事件发送失败", {
        clientId,
        connectionTime,
        authStatus,
        error: error.message,
      });
    }
  }

  /**
   * 🎯 业务监控事件发送
   */
  private emitBusinessEvent(
    metricName: string,
    _metricValue: number = 1,
    _tags: Record<string, unknown> = {},
  ): void {
    setImmediate(() => {
      try {
        // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
      } catch (error) {
        this.logger.warn("业务监控事件发送失败", {
          metricName,
          error: error.message,
        });
      }
    });
  }

  /**
   * P1重构: 初始化配置管理
   */
  private initializeConfig(): StreamReceiverConfig {
    // P2: 环境变量极简 - 仅读取核心参数，其余使用内建默认值
    const userConfig: Partial<StreamReceiverConfig> = {
      connectionCleanupInterval: this.configService.get<number>(
        StreamReceiverConfigKeys.CONNECTION_CLEANUP_INTERVAL,
        defaultStreamReceiverConfig.connectionCleanupInterval,
      ),
      maxConnections: this.configService.get<number>(
        StreamReceiverConfigKeys.MAX_CONNECTIONS,
        defaultStreamReceiverConfig.maxConnections,
      ),
      connectionStaleTimeout: this.configService.get<number>(
        StreamReceiverConfigKeys.CONNECTION_STALE_TIMEOUT,
        defaultStreamReceiverConfig.connectionStaleTimeout,
      ),
      batchProcessingInterval: this.configService.get<number>(
        StreamReceiverConfigKeys.BATCH_PROCESSING_INTERVAL,
        defaultStreamReceiverConfig.batchProcessingInterval,
      ),
    };

    const config = mergeStreamReceiverConfig(userConfig);

    // 验证配置
    const validationErrors = validateStreamReceiverConfig(config);
    if (validationErrors.length > 0) {
      this.logger.warn("配置验证发现问题，使用默认值", {
        errors: validationErrors,
        fallbackToDefaults: true,
      });
      return defaultStreamReceiverConfig;
    }

    this.logger.log("StreamReceiver配置已初始化", {
      maxConnections: config.maxConnections,
      cleanupInterval: `${Math.round(config.connectionCleanupInterval / 1000)}s`,
      batchProcessing: {
        baseInterval: `${config.batchProcessingInterval}ms`,
        dynamicEnabled: config.dynamicBatching.enabled,
        intervalRange: `${config.dynamicBatching.minInterval}-${config.dynamicBatching.maxInterval}ms`,
      },
      memoryThresholds: {
        warning: `${config.memoryMonitoring.warningThreshold / (1024 * 1024)}MB`,
        critical: `${config.memoryMonitoring.criticalThreshold / (1024 * 1024)}MB`,
      },
      // 已移除 rateLimit 的 ENV 配置输出
    });

    return config;
  }

  /**
   * 🎯 订阅流数据 - 重构后的核心方法 (Gateway模式)
   * @param subscribeDto 订阅请求
   * @param clientId WebSocket客户端ID (从Socket.IO获取)
   */
  /**
   * P0修复: 检查连接频率限制
   */
  private async checkConnectionRateLimit(
    clientIp: string,
    context: {
      clientId: string;
      requestId: string;
    },
  ): Promise<boolean> {
    if (!this.rateLimitService) {
      this.logger.debug("RateLimitService未注入，跳过频率检查");
      return true; // 服务不可用时允许连接
    }

    const key = `stream_connect:${clientIp}`;

    try {
      // 创建简化的ApiKey对象用于频率检查
      const mockApiKey = {
        appKey: key,
        rateLimit: {
          requests: this.config.rateLimit.maxConnectionsPerMinute,
          window: `${this.config.rateLimit.windowSize / 1000}s`,
        },
      } as Record<string, unknown>;

      const result = await this.rateLimitService.checkRateLimit(mockApiKey);

      if (!result.allowed) {
        this.logger.warn("连接频率超限", {
          clientIp,
          limit: result.limit,
          current: result.current,
          retryAfter: result.retryAfter,
        });
        return false;
      }

      this.logger.debug("连接频率检查通过", {
        clientIp,
        remaining: result.remaining,
        resetTime: new Date(result.resetTime).toISOString(),
      });

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("连接频率检查失败，拒绝连接", {
        clientIp,
        clientId: context.clientId,
        requestId: context.requestId,
        error: errorMessage,
      });
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STREAM_RECEIVER,
        errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
        operation: "subscribeStream",
        message: "Connection rate limit service unavailable, please try again later",
        context: {
          clientIp,
          clientId: context.clientId,
          requestId: context.requestId,
          errorType: STREAM_RECEIVER_ERROR_CODES.CONNECTION_RATE_EXCEEDED,
          reason: "rate_limit_service_unavailable",
          originalError: errorMessage,
        },
      });
    }
  }

  async subscribeStream(
    subscribeDto: StreamSubscribeDto,
    clientId?: string,
    clientIp?: string, // P0修复: 新增客户端IP参数用于频率限制
    options?: { connectionAuthenticated?: boolean },
  ): Promise<void> {
    let rollbackConnection: StreamConnection | undefined;
    let rollbackStandardSymbols: string[] = [];
    let rollbackUpstreamProviderSymbols: string[] = [];
    let localSubscriptionAdded = false;
    const resolvedClientId =
      clientId ||
      `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const requestId = `request_${Date.now()}`;

    // I-3: 轻量连接门禁先于请求深度参数校验，避免无效请求绕过连接限速
    if (clientIp) {
      const rateLimitPassed = await this.checkConnectionRateLimit(clientIp, {
        clientId: resolvedClientId,
        requestId,
      });
      if (!rateLimitPassed) {
        const error = UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.STREAM_RECEIVER,
          errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
          operation: "subscribeStream",
          message: "Connection rate limit exceeded, please try again later",
          context: {
            clientId: resolvedClientId,
            clientIp,
            requestId,
            errorType: STREAM_RECEIVER_ERROR_CODES.CONNECTION_RATE_EXCEEDED
          }
        });
        this.logger.warn("连接被频率限制拒绝", {
          clientId: resolvedClientId,
          clientIp,
          requestId,
        });
        throw error;
      }
    }

    const validationResult =
      options?.connectionAuthenticated === true
        ? this.dataValidator.validateSubscribeRequest(subscribeDto, {
            skipAuthValidation: true,
          })
        : this.dataValidator.validateSubscribeRequest(subscribeDto);
    if (!validationResult.isValid) {
      const error = UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STREAM_RECEIVER,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "subscribeStream",
        message: `Invalid subscribe request: ${validationResult.errors.join("; ")}`,
        context: {
          symbols: subscribeDto?.symbols,
          wsCapabilityType: subscribeDto?.wsCapabilityType,
          preferredProvider: subscribeDto?.preferredProvider,
          validationErrors: validationResult.errors,
          validationWarnings: validationResult.warnings,
          errorType: STREAM_RECEIVER_ERROR_CODES.INVALID_SUBSCRIPTION_DATA,
        },
      });
      this.logger.warn("订阅请求校验失败", {
        clientId,
        errors: validationResult.errors,
      });
      throw error;
    }

    if (validationResult.warnings.length > 0) {
      this.logger.warn("订阅请求校验告警", {
        clientId,
        warnings: validationResult.warnings,
      });
    }

    const sanitizedSubscribeDto = (validationResult.sanitizedData ||
      subscribeDto) as StreamSubscribeDto;
    const { symbols, wsCapabilityType, preferredProvider } = sanitizedSubscribeDto;
    const marketContext = resolveMarketTypeFromSymbols(
      this.marketInferenceService,
      symbols,
    );
    const providerName = this.providerResolution.resolveProviderForStreamRequest({
      symbols,
      capability: wsCapabilityType,
      preferredProvider,
      marketContext,
      operation: "subscribeStream",
      requestId,
    });
    this.subscriptionContext.assertSubscriptionContextCompatibility(
      resolvedClientId,
      providerName,
      wsCapabilityType,
    );
    this.subscriptionContext.validateIdentityProviderRawSymbolsNoBoundaryWhitespace(
      subscribeDto?.symbols,
      providerName,
      requestId,
      "subscribeStream",
    );

    this.logger.log("开始订阅流数据", {
      clientId: resolvedClientId,
      symbolsCount: symbols.length,
      capability: wsCapabilityType,
      provider: providerName,
      requestId,
      contextSource: clientId ? "websocket" : "generated",
      marketType: marketContext.marketType,
    });

    try {
      // 1. 符号映射：标准格式与Provider专用格式分离
      const { standardSymbols, providerSymbols } =
        await this.subscriptionContext.resolveSymbolMappings(symbols, providerName, requestId);
      rollbackStandardSymbols = standardSymbols;

      // 2. 获取或创建流连接
      const connection = await this.connectionManager.getOrCreateConnection(
        providerName,
        wsCapabilityType,
        requestId,
        symbols,
        resolvedClientId,
      );
      rollbackConnection = connection;

      const upstreamSymbolsToSubscribe =
        this.upstreamSymbolSubscriptionCoordinator.acquire({
          clientId: resolvedClientId,
          provider: providerName,
          capability: wsCapabilityType,
          symbols: standardSymbols,
        });

      // 3. 仅在 0 -> 1 时订阅符号到流连接（使用Provider要求的格式）
      if (upstreamSymbolsToSubscribe.length > 0) {
        const upstreamProviderSymbols = providerSymbols.filter((providerSymbol, index) =>
          upstreamSymbolsToSubscribe.includes(standardSymbols[index]),
        );
        rollbackUpstreamProviderSymbols = upstreamProviderSymbols;
        await this.streamDataFetcher.subscribeToSymbols(
          connection,
          upstreamProviderSymbols,
        );
      }

      // 4. 订阅成功后更新客户端状态，避免失败场景产生脏状态
      this.clientStateManager.addClientSubscription(
          resolvedClientId,
          standardSymbols,
          wsCapabilityType,
          providerName,
        );
      localSubscriptionAdded = standardSymbols.length > 0;

      // 5. 设置数据接收处理
      this.ingressBinding.setupDataReceiving(connection, providerName, wsCapabilityType);

      // 6. 将客户端加入标准化符号房间，便于按symbol广播
      await this.syncClientRooms(
        resolvedClientId,
        standardSymbols,
        "join",
      );

      this.logger.log("流数据订阅成功", {
        clientId: resolvedClientId,
        symbolsCount: standardSymbols.length,
        connectionId: connection.id,
      });
    } catch (error) {
      const rollbackError = await this.rollbackClientSubscribe({
        clientId: resolvedClientId,
        standardSymbols: rollbackStandardSymbols,
        providerName,
        wsCapabilityType,
        localSubscriptionAdded,
        connection: rollbackConnection,
        upstreamProviderSymbols: rollbackUpstreamProviderSymbols,
      });
      if (rollbackError) {
        this.logger.error("流数据订阅回滚失败", {
          clientId: resolvedClientId,
          requestId,
          originalError: error instanceof Error ? error.message : String(error),
          rollbackError: rollbackError.message,
        });
        throw rollbackError;
      }
      this.logger.error("流数据订阅失败", {
        clientId: resolvedClientId,
        error: error.message,
        requestId,
      });
      throw error;
    }
  }

  /**
   * 🎯 取消订阅流数据
   * @param unsubscribeDto 取消订阅请求
   * @param clientId WebSocket客户端ID (从Socket.IO获取)
   */
  async unsubscribeStream(
    unsubscribeDto: StreamUnsubscribeDto,
    clientId?: string,
    options?: UnsubscribeStreamOptions,
  ): Promise<UnsubscribeStreamResult> {
    let rollbackClientSubscription:
      | {
          providerName: string;
          wsCapabilityType: string;
        }
      | null = null;
    let rollbackStandardSymbols: string[] = [];
    let rollbackImmediateProviderSymbols: string[] = [];
    let rollbackConnection: StreamConnection | undefined;
    let localSubscriptionRemoved = false;

    const validationResult = this.dataValidator.validateUnsubscribeRequest(unsubscribeDto);
    if (!validationResult.isValid) {
      const error = UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STREAM_RECEIVER,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: "unsubscribeStream",
        message: `Invalid unsubscribe request: ${validationResult.errors.join("; ")}`,
        context: {
          symbols: unsubscribeDto?.symbols,
          validationErrors: validationResult.errors,
          validationWarnings: validationResult.warnings,
          errorType: STREAM_RECEIVER_ERROR_CODES.INVALID_UNSUBSCRIBE_DATA,
        },
      });
      this.logger.warn("取消订阅请求校验失败", {
        clientId,
        errors: validationResult.errors,
      });
      throw error;
    }

    if (validationResult.warnings.length > 0) {
      this.logger.warn("取消订阅请求校验告警", {
        clientId,
        warnings: validationResult.warnings,
      });
    }

    const sanitizedUnsubscribeDto = (validationResult.sanitizedData ||
      unsubscribeDto) as StreamUnsubscribeDto;
    const { symbols } = sanitizedUnsubscribeDto;
    // ✅ Phase 3 - P2: 使用传入的clientId，如果没有则记录警告
    if (!clientId) {
      this.logger.warn("取消订阅缺少clientId，无法精确定位客户端订阅", {
        symbolsCount: symbols?.length || 0,
        fallbackBehavior: "skip_operation",
      });
      return {
        unsubscribedSymbols: [],
        upstreamReleasedSymbols: [],
        upstreamScheduledSymbols: [],
      };
    }

    this.logger.log("开始取消订阅流数据", {
      clientId,
      symbolsCount: symbols?.length || 0,
      contextSource: "websocket",
    });

    try {
      // 获取客户端当前订阅信息
      const clientSub = this.clientStateManager.getClientSubscription(clientId);
      if (!clientSub) {
        this.logger.warn("客户端订阅不存在", { clientId });
        return {
          unsubscribedSymbols: [],
          upstreamReleasedSymbols: [],
          upstreamScheduledSymbols: [],
        };
      }

      // 获取要取消订阅的符号
      const symbolsToUnsubscribe =
        symbols && symbols.length > 0
          ? symbols
          : this.clientStateManager.getClientSymbols(clientId);

      if (symbolsToUnsubscribe.length === 0) {
        this.logger.warn("没有需要取消订阅的符号", { clientId });
        return {
          unsubscribedSymbols: [],
          upstreamReleasedSymbols: [],
          upstreamScheduledSymbols: [],
        };
      }

      // 映射符号（标准化 + Provider格式）
      const requestId = `unsubscribe_${Date.now()}`;
      this.subscriptionContext.validateIdentityProviderRawSymbolsNoBoundaryWhitespace(
        unsubscribeDto?.symbols,
        clientSub.providerName,
        requestId,
        "unsubscribeStream",
      );
      const { standardSymbols, providerSymbols } =
        await this.subscriptionContext.resolveSymbolMappings(
          symbolsToUnsubscribe,
          clientSub.providerName,
          requestId,
        );
      rollbackClientSubscription = {
        providerName: clientSub.providerName,
        wsCapabilityType: clientSub.wsCapabilityType,
      };
      rollbackStandardSymbols = standardSymbols;
      const connectionKey = `${clientSub.providerName}:${clientSub.wsCapabilityType}`;
      let connection: StreamConnection | undefined;
      let immediateUnsubscribeSymbols: string[] = [];
      let scheduledUpstreamSymbols: ScheduledUpstreamRelease[] = [];
      let immediateProviderSymbols: string[] = [];

      // 更新客户端状态
      this.clientStateManager.removeClientSubscription(clientId, standardSymbols);
      localSubscriptionRemoved = standardSymbols.length > 0;

      // 获取连接（通过连接管理器；仅在现有连接活跃时执行退订，避免误建新连接）
      if (this.connectionManager.isConnectionActive(connectionKey)) {
        connection = await this.connectionManager.getOrCreateConnection(
          clientSub.providerName,
          clientSub.wsCapabilityType,
          requestId,
          symbolsToUnsubscribe,
          clientId,
        );
        rollbackConnection = connection;
        const releasePlan = this.upstreamSymbolSubscriptionCoordinator.scheduleRelease(
          {
            clientId,
            provider: clientSub.providerName,
            capability: clientSub.wsCapabilityType,
            symbols: standardSymbols,
          },
          async (readySymbols) => {
            if (!connection) {
              return;
            }
            const readyProviderSymbols = providerSymbols.filter(
              (_providerSymbol, index) =>
                readySymbols.includes(standardSymbols[index]),
            );
            if (readyProviderSymbols.length === 0) {
              return;
            }
            await this.streamDataFetcher.unsubscribeFromSymbols(
              connection,
              readyProviderSymbols,
            );
            await this.subscriptionContext.notifyUpstreamReleased(
              options,
              readySymbols,
            );
          },
        );
        immediateUnsubscribeSymbols = releasePlan.immediateSymbols;
        scheduledUpstreamSymbols = releasePlan.scheduledSymbols;

        immediateProviderSymbols = providerSymbols.filter(
          (_providerSymbol, index) =>
            immediateUnsubscribeSymbols.includes(standardSymbols[index]),
        );
        rollbackImmediateProviderSymbols = immediateProviderSymbols;
        if (immediateProviderSymbols.length > 0) {
          await this.streamDataFetcher.unsubscribeFromSymbols(
            connection,
            immediateProviderSymbols,
          );
          await this.subscriptionContext.notifyUpstreamReleased(options, immediateUnsubscribeSymbols);
        }
      } else {
        this.logger.warn("未找到活跃连接，跳过上游退订", {
          clientId,
          provider: clientSub.providerName,
          capability: clientSub.wsCapabilityType,
          connectionKey,
        });
        await this.syncClientRooms(clientId, standardSymbols, "leave");

        this.logger.log("流数据取消订阅成功", {
          clientId,
          symbolsCount: standardSymbols.length,
        });
        return {
          unsubscribedSymbols: standardSymbols,
          upstreamReleasedSymbols: [],
          upstreamScheduledSymbols: [],
        };
      }

      // 将客户端从房间移除
      await this.syncClientRooms(clientId, standardSymbols, "leave");

      this.logger.log("流数据取消订阅成功", {
        clientId,
        symbolsCount: standardSymbols.length,
      });
      return {
        unsubscribedSymbols: standardSymbols,
        upstreamReleasedSymbols: immediateUnsubscribeSymbols || [],
        upstreamScheduledSymbols: scheduledUpstreamSymbols,
      };
    } catch (error) {
      const rollbackError = await this.rollbackClientUnsubscribe({
        clientId,
        clientSubscription: rollbackClientSubscription,
        standardSymbols: rollbackStandardSymbols,
        immediateProviderSymbols: rollbackImmediateProviderSymbols,
        connection: rollbackConnection,
        localSubscriptionRemoved,
      });
      if (rollbackError) {
        this.logger.error("取消订阅回滚失败", {
          clientId,
          originalError: error instanceof Error ? error.message : String(error),
          rollbackError: rollbackError.message,
        });
        throw rollbackError;
      }
      this.logger.error("流数据取消订阅失败", {
        clientId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 处理客户端重连 - 委托给 ReconnectCoordinator
   */
  async handleClientReconnect(
    reconnectRequest: ClientReconnectRequest,
  ): Promise<ClientReconnectResponse> {
    return this.reconnectCoordinator.executeClientReconnect(reconnectRequest);
  }

  /**
   * 主动断线检测 - 委托给 ReconnectCoordinator
   */
  detectReconnection(): void {
    this.reconnectCoordinator.detectReconnection();
  }

  /**
   * 手动触发客户端重连检查 - 委托给 ReconnectCoordinator
   */
  async handleReconnection(
    clientId: string,
    reason: string = "manual_check",
  ): Promise<void> {
    return this.reconnectCoordinator.handleReconnection(clientId, reason);
  }

  /**
   * 获取客户端统计信息
   */
  /**
   * 获取客户端统计信息
   * Note: Cache stats are now provided through event-driven monitoring
   */
  getClientStats() {
    const clientStats = this.clientStateManager.getClientStateStats();
    
    // ✅ Cache stats are now provided through MonitoringService via event-driven monitoring
 
    const rawConnectionStats = this.streamDataFetcher.getAllConnectionStats();
    const connectionsArray = Object.entries(rawConnectionStats).map(([key, stat]) => ({
      key,
      id: stat.connectionId || stat.id || 'unknown',
      capability: stat.capability || key.split(':')[1] || 'unknown',
      isConnected: Boolean(stat.isConnected),
      lastActiveAt: stat.lastActiveAt || new Date(),
    }));

    const connectionStats = {
      total: connectionsArray.length,
      active: connectionsArray.filter(c => c.isConnected).length,
      connections: connectionsArray,
    };

    return {
      clients: clientStats,
      cache: {
        // Placeholder - actual cache stats are provided by MonitoringService
        info: "Cache statistics are available through MonitoringService",
      },
      connections: connectionStats,
      batchProcessing: this.batchProcessor.getBatchProcessingStats(),
    };
  }

  /**
   * 健康检查
   */
  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: string;
    connections: number;
    clients: number;
    cacheHitRate: number;
  }> {
    const stats = this.getClientStats();
    const connectionHealth = await this.streamDataFetcher.batchHealthCheck();
    const healthyConnections =
      Object.values(connectionHealth).filter(Boolean).length;
    const totalConnections = Object.keys(connectionHealth).length;

    // ✅ Cache hit rate is now provided through MonitoringService
    // Setting to 0 as placeholder - actual metrics available via monitoring endpoints
    const cacheHitRate = 0; 

    return {
      status: healthyConnections === totalConnections ? "healthy" : "degraded",
      connections: totalConnections,
      clients: stats.clients.totalClients,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
    };
  }


  // 注意：processDataThroughPipeline 已迁移到 StreamDataProcessorService
  // 注意：getDefaultProvider/resolveProviderForStreamRequest/validatePreferredProviderForStream 已迁移到 StreamProviderResolutionService
  // 注意：detectReconnection/handleReconnection/executeClientReconnect 已迁移到 StreamReconnectCoordinatorService
  // 注意：setupDataReceiving/handleIncomingData/extractSymbolsFromData 已迁移到 StreamIngressBindingService

  /**
   * 模块销毁时清理资源
   */
  onModuleDestroy() {
    this.logger.log("StreamReceiver 资源已清理");
  }

  /**
   * 设置订阅变更监听器
   */
  private setupSubscriptionChangeListener(): void {
    this.clientStateManager.addSubscriptionChangeListener((event) => {
        this.logger.debug("订阅变更事件", {
          clientId: event.clientId,
          action: event.action,
          symbolsCount: event.symbols.length,
          provider: event.provider,
          capability: event.capability,
        });

        // 这里可以添加订阅变更后的处理逻辑
        // 例如：优化连接管理、调整缓存策略等
      });
  }

  private async rollbackClientUnsubscribe(params: {
    clientId: string;
    clientSubscription?:
      | {
          providerName: string;
          wsCapabilityType: string;
        }
      | null;
    standardSymbols: string[];
    immediateProviderSymbols: string[];
    connection?: StreamConnection;
    localSubscriptionRemoved: boolean;
  }): Promise<Error | null> {
    if (
      !params.localSubscriptionRemoved ||
      !params.clientSubscription ||
      params.standardSymbols.length === 0
    ) {
      return null;
    }

    try {
      this.upstreamSymbolSubscriptionCoordinator.cancelPendingUnsubscribe(
        params.clientSubscription.providerName,
        params.clientSubscription.wsCapabilityType,
        params.standardSymbols,
      );

      if (params.connection && params.immediateProviderSymbols.length > 0) {
        await this.streamDataFetcher.subscribeToSymbols(
          params.connection,
          params.immediateProviderSymbols,
        );
      }

      this.clientStateManager.addClientSubscription(
        params.clientId,
        params.standardSymbols,
        params.clientSubscription.wsCapabilityType,
        params.clientSubscription.providerName,
      );

      return null;
    } catch (rollbackError) {
      return rollbackError instanceof Error
        ? rollbackError
        : new Error(String(rollbackError));
    }
  }

  private async rollbackClientSubscribe(params: {
    clientId: string;
    standardSymbols: string[];
    providerName: string;
    wsCapabilityType: string;
    localSubscriptionAdded: boolean;
    connection?: StreamConnection;
    upstreamProviderSymbols: string[];
  }): Promise<Error | null> {
    try {
      if (params.localSubscriptionAdded && params.standardSymbols.length > 0) {
        this.clientStateManager.removeClientSubscription(
          params.clientId,
          params.standardSymbols,
        );
      }

      if (params.connection && params.upstreamProviderSymbols.length > 0) {
        await this.streamDataFetcher.unsubscribeFromSymbols(
          params.connection,
          params.upstreamProviderSymbols,
        );
      }

      return null;
    } catch (rollbackError) {
      return rollbackError instanceof Error
        ? rollbackError
        : new Error(String(rollbackError));
    }
  }

  private async syncClientRooms(
    clientId: string,
    symbols: string[],
    action: "join" | "leave",
  ): Promise<void> {
    if (!this.webSocketProvider || !this.shouldManageWebSocketRooms(clientId)) {
      return;
    }

    const rooms = this.subscriptionContext.buildSymbolRooms(symbols);
    if (rooms.length === 0) {
      return;
    }

    const success =
      action === "join"
        ? await this.webSocketProvider.joinClientToRooms(clientId, rooms)
        : await this.webSocketProvider.leaveClientFromRooms(clientId, rooms);

    if (!success) {
      throw new Error(
        `${action === "join" ? "join" : "leave"} websocket rooms failed`,
      );
    }
  }

  private shouldManageWebSocketRooms(clientId: string): boolean {
    const normalizedClientId = String(clientId || "").trim();
    if (!normalizedClientId) {
      return false;
    }

    if (normalizedClientId.startsWith("chart-intraday:auto:")) {
      return false;
    }

    if (normalizedClientId.startsWith("client_")) {
      return false;
    }

    return true;
  }

}

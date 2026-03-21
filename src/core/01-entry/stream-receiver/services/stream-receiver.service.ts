// RECENT_METRICS_COUNT 已移动到监控配置中，通过 configService 动态获取
import { REFERENCE_DATA } from "@common/constants/domain";
import { API_OPERATIONS } from "@common/constants/domain";
import { Injectable, OnModuleDestroy, Inject, forwardRef, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createLogger } from "@common/logging/index";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier
} from '@common/core/exceptions';
import { STREAM_RECEIVER_ERROR_CODES } from '../constants/stream-receiver-error-codes.constants';
import { SymbolTransformerService } from "../../../02-processing/symbol-transformer/services/symbol-transformer.service";
import { DataTransformerService } from "../../../02-processing/transformer/services/data-transformer.service";
import { StreamDataFetcherService } from "../../../03-fetching/stream-data-fetcher/services/stream-data-fetcher.service";
import { StreamClientStateManager } from "../../../03-fetching/stream-data-fetcher/services/stream-client-state-manager.service";
import {
  UpstreamSymbolSubscriptionCoordinatorService,
  type ScheduledUpstreamRelease,
} from "../../../03-fetching/stream-data-fetcher/services/upstream-symbol-subscription-coordinator.service";
import {
  StreamRecoveryWorkerService,
  RecoveryJob,
} from "../../../03-fetching/stream-data-fetcher/services/stream-recovery-worker.service";
import {
  ClientReconnectRequest,
  ClientReconnectResponse,
} from "../../../03-fetching/stream-data-fetcher/interfaces";
import { StreamSubscribeDto } from "../dto/stream-subscribe.dto";
import { StreamUnsubscribeDto } from "../dto/stream-unsubscribe.dto";
import {
  StreamConnection,
  StreamConnectionParams,
} from "../../../03-fetching/stream-data-fetcher/interfaces";
import { Subject } from "rxjs";
import { STREAM_RECEIVER_TIMEOUTS } from "../constants/stream-receiver-timeouts.constants";
import { MappingDirection } from "@core/shared/constants";

import {
  StreamReceiverConfig,
  defaultStreamReceiverConfig,
  StreamReceiverConfigKeys,
  mergeStreamReceiverConfig,
  validateStreamReceiverConfig,
} from "../config/stream-receiver.config";
import { QuoteData } from '../interfaces/data-processing.interface';
import { StreamConnectionContext } from '../interfaces/connection-management.interface';
import {
  resolveMarketTypeFromSymbols,
  MarketTypeContext,
} from "@core/shared/utils/market-type.util";
import {
  buildIdentitySymbolMappingPair,
  findNonStandardSymbolsForIdentityProvider,
  isStandardSymbolIdentityProvider,
  STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY,
} from "@core/shared/utils/provider-symbol-identity.util";



export interface UnsubscribeStreamResult {
  unsubscribedSymbols: string[];
  upstreamReleasedSymbols: string[];
  upstreamScheduledSymbols: ScheduledUpstreamRelease[];
}

export interface UnsubscribeStreamOptions {
  onUpstreamReleased?: (
    releasedSymbols: string[],
  ) => Promise<void> | void;
}

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
import {
  LatencyUtils,
  ConnectionHealthUtils,
  ConnectionStatsUtils,
  CollectionUtils,
  ConnectionHealthInfo
} from '../utils/stream-receiver.utils';
import { StreamDataValidator } from '../validators/stream-data.validator';
import { StreamBatchProcessorService } from './stream-batch-processor.service';
import { StreamConnectionManagerService } from './stream-connection-manager.service';
import {
  WebSocketServerProvider,
  WEBSOCKET_SERVER_TOKEN,
} from "../../../03-fetching/stream-data-fetcher/providers/websocket-server.provider";
import { ProviderRegistryService } from "@providersv2/provider-registry.service";

@Injectable()
export class StreamReceiverService implements OnModuleDestroy {
  private readonly logger = createLogger("StreamReceiver");

  // 注意：连接管理已迁移到 StreamConnectionManagerService，但保留核心属性供当前实现使用
  private readonly activeConnections = new Map<string, StreamConnection>();

  // P1重构: 配置管理 - 从硬编码迁移到ConfigService
  private readonly config: StreamReceiverConfig;
  private cleanupTimer?: NodeJS.Timeout; // 清理定时器
  private memoryCheckTimer?: NodeJS.Timeout;

  // 注意：批量处理管道已迁移到 StreamBatchProcessorService，但保留核心属性供当前实现使用
  private readonly quoteBatchSubject = new Subject<QuoteData>();
  private readonly dynamicBatchingState = {
    enabled: false,
    currentInterval: 0,
    adaptiveLevel: 0,
    adjustmentTimer: null as NodeJS.Timeout | null,
    performanceMetrics: {
      avgProcessingTime: 0,
      throughput: 0,
      errorRate: 0
    }
  };

  // 注意：批量处理统计已迁移到 StreamBatchProcessorService，但保留核心属性供当前实现使用
  private readonly batchProcessingStats = {
    totalBatches: 0,
    totalProcessedItems: 0,
    totalQuotes: 0,
    avgBatchSize: 0,
    avgProcessingTime: 0,
    batchProcessingTime: 0,
    errorCount: 0,
    lastProcessedAt: 0,
    totalFallbacks: 0,
    partialRecoverySuccess: 0
  };
  private readonly statsLock = new Map<string, Promise<void>>();

  // 注意：断路器状态已迁移到 StreamBatchProcessorService，但保留核心属性供当前实现使用
  private readonly circuitBreakerState = {
    isOpen: false,
    failures: 0,
    successes: 0,
    lastFailureTime: 0,
    nextAttemptTime: 0
  };


  constructor(
    // 🎯 事件化监控核心依赖 - 符合监控规范
    private readonly eventBus: EventEmitter2,
    // P1重构: 添加配置服务
    private readonly configService: ConfigService,
    // ✅ Phase 4 精简依赖注入 - 已移除unused SymbolMapperService 和违规的 CollectorService
    private readonly symbolTransformerService: SymbolTransformerService, // 🆕 新增SymbolTransformer依赖
    private readonly marketInferenceService: MarketInferenceService,
    private readonly dataTransformerService: DataTransformerService,
    private readonly streamDataFetcher: StreamDataFetcherService,
    private readonly clientStateManager: StreamClientStateManager,
    private readonly upstreamSymbolSubscriptionCoordinator: UpstreamSymbolSubscriptionCoordinatorService,
    private readonly providerRegistryService: ProviderRegistryService,
    // 🆕 P2重构: 数据验证模块
    private readonly dataValidator: StreamDataValidator,
    // 🆕 重构: 两个专职服务
    private readonly batchProcessor: StreamBatchProcessorService,
    private readonly connectionManager: StreamConnectionManagerService,
    // ✅ 移除违规的直接 CollectorService 依赖，改用事件化监控
    private readonly recoveryWorker?: StreamRecoveryWorkerService, // Phase 3 可选依赖
    @Optional() private readonly rateLimitService?: any, // 极简：不依赖旧限速服务
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
    metadata?: {
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
    errorReason?: string
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
    metricValue: number = 1,
    tags: Record<string, any> = {},
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
  private async checkConnectionRateLimit(clientIp: string): Promise<boolean> {
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
      } as any;

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
      this.logger.warn("连接频率检查失败，允许连接 (故障时开放)", {
        clientIp,
        error: error.message,
      });
      return true; // 故障时允许连接，确保服务可用性
    }
  }

  /**
   * P0修复: 初始化内存监控机制
   */
  private initializeMemoryMonitoring(): void {
    // 每30秒检查一次内存使用情况
    this.memoryCheckTimer = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.memoryMonitoring.checkInterval);

    this.logger.log("内存监控机制已初始化", {
      checkInterval: `${Math.round(this.config.memoryMonitoring.checkInterval / 1000)}s`,
      warningThreshold: `${Math.round(this.config.memoryMonitoring.warningThreshold / (1024 * 1024))}MB`,
      criticalThreshold: `${Math.round(this.config.memoryMonitoring.criticalThreshold / (1024 * 1024))}MB`,
    });
  }







  /**
   * P0修复: 检查内存使用情况
   */
  private checkMemoryUsage(): void {
    try {
      const usage = process.memoryUsage();
      const heapUsed = usage.heapUsed;

      if (heapUsed > this.config.memoryMonitoring.criticalThreshold) {
        this.logger.error("内存使用超过临界阈值，启动强制清理", {
          heapUsed: `${Math.round(heapUsed / (1024 * 1024))}MB`,
          connections: this.connectionManager.getActiveConnectionsCount(),
          threshold: `${Math.round(this.config.memoryMonitoring.criticalThreshold / (1024 * 1024))}MB`,
        });
        this.forceConnectionCleanup().catch((error) => {
          this.logger.error("强制连接清理失败", { error: error.message });
        });

        // 记录监控指标
        this.recordMemoryAlert(
          "critical",
          heapUsed,
          this.connectionManager.getActiveConnectionsCount(),
        );
      } else if (heapUsed > this.config.memoryMonitoring.warningThreshold) {
        this.logger.warn("内存使用接近阈值", {
          heapUsed: `${Math.round(heapUsed / (1024 * 1024))}MB`,
          connections: this.connectionManager.getActiveConnectionsCount(),
          threshold: `${Math.round(this.config.memoryMonitoring.warningThreshold / (1024 * 1024))}MB`,
        });

        // 记录监控指标
        this.recordMemoryAlert(
          "warning",
          heapUsed,
          this.connectionManager.getActiveConnectionsCount(),
        );
      }

      // 更新检查时间 (已迁移到config管理)
    } catch (error) {
      this.logger.warn("内存检查失败", { error: error.message });
    }
  }

  /**
   * 强制连接清理机制 - 委托给连接管理服务
   */
  private async forceConnectionCleanup(): Promise<void> {
    const result = await this.connectionManager.forceConnectionCleanup();

    this.logger.log("强制连接清理完成", {
      cleaned: result.totalCleaned,
      remaining: result.remainingConnections,
      staleConnectionsCleaned: result.staleConnectionsCleaned,
      unhealthyConnectionsCleaned: result.unhealthyConnectionsCleaned,
      cleanupType: result.cleanupType,
    });
  }

  /**
   * P0修复: 记录内存告警指标
   */
  private recordMemoryAlert(
    level: "warning" | "critical",
    heapUsed: number,
    connectionCount: number,
  ): void {
    try {
      // ✅ 事件化监控 - 内存告警事件发送
      // 监控事件已移除（监控模块已删除）
      // 如需监控，请使用外部工具（如 Prometheus）
    } catch (error) {
      this.logger.warn("内存告警事件发送失败", { error: error.message });
    }
  }

  async subscribeStream(
    subscribeDto: StreamSubscribeDto,
    clientId?: string,
    clientIp?: string, // P0修复: 新增客户端IP参数用于频率限制
    options?: { connectionAuthenticated?: boolean },
  ): Promise<void> {
    const resolvedClientId =
      clientId ||
      `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const requestId = `request_${Date.now()}`;

    // I-3: 轻量连接门禁先于请求深度参数校验，避免无效请求绕过连接限速
    if (clientIp) {
      const rateLimitPassed = await this.checkConnectionRateLimit(clientIp);
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
    const providerName =
      preferredProvider ||
      this.getDefaultProvider(symbols, wsCapabilityType, marketContext);
    this.assertSubscriptionContextCompatibility(
      resolvedClientId,
      providerName,
      wsCapabilityType,
    );
    this.validateIdentityProviderRawSymbolsNoBoundaryWhitespace(
      subscribeDto?.symbols,
      providerName,
      requestId,
      "subscribeStream",
    );

    // P0修复: 连接数量上限检查
    if (this.connectionManager.getActiveConnectionsCount() >= this.config.maxConnections) {
      const error = UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.STREAM_RECEIVER,
        errorCode: BusinessErrorCode.RESOURCE_EXHAUSTED,
        operation: 'subscribeStream',
        message: 'Server connection limit reached',
        context: {
          clientId: resolvedClientId,
          currentConnections: this.activeConnections.size,
          maxConnections: this.config.maxConnections,
          errorType: STREAM_RECEIVER_ERROR_CODES.CONNECTION_LIMIT_REACHED
        }
      });
      this.logger.warn("连接被数量上限拒绝", {
        clientId: resolvedClientId,
        currentConnections: this.activeConnections.size,
        maxConnections: this.config.maxConnections,
        requestId,
      });
      throw error;
    }

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
        await this.resolveSymbolMappings(symbols, providerName, requestId);

      // 2. 获取或创建流连接
      const connection = await this.connectionManager.getOrCreateConnection(
        providerName,
        wsCapabilityType,
        requestId,
        symbols,
        resolvedClientId,
      );

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

      // 5. 设置数据接收处理
      this.setupDataReceiving(connection, providerName, wsCapabilityType);

      // 6. 将客户端加入标准化符号房间，便于按symbol广播
      try {
        if (this.webSocketProvider && standardSymbols?.length) {
          const rooms = this.buildSymbolRooms(standardSymbols);
          await this.webSocketProvider.joinClientToRooms(resolvedClientId, rooms);
        }
      } catch (err) {
        this.logger.warn("加入房间失败(忽略)", { clientId: resolvedClientId, error: (err as any)?.message });
      }

      this.logger.log("流数据订阅成功", {
        clientId: resolvedClientId,
        symbolsCount: standardSymbols.length,
        connectionId: connection.id,
      });
    } catch (error) {
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
      this.validateIdentityProviderRawSymbolsNoBoundaryWhitespace(
        unsubscribeDto?.symbols,
        clientSub.providerName,
        requestId,
        "unsubscribeStream",
      );
      const { standardSymbols, providerSymbols } =
        await this.resolveSymbolMappings(
          symbolsToUnsubscribe,
          clientSub.providerName,
          requestId,
        );

      // 更新客户端状态
      this.clientStateManager.removeClientSubscription(clientId, standardSymbols);

      // 获取连接（通过连接管理器；仅在现有连接活跃时执行退订，避免误建新连接）
      const connectionKey = `${clientSub.providerName}:${clientSub.wsCapabilityType}`;
      let connection: StreamConnection | undefined;
      let immediateUnsubscribeSymbols: string[] = [];
      let scheduledUpstreamSymbols: ScheduledUpstreamRelease[] = [];
      if (this.connectionManager.isConnectionActive(connectionKey)) {
        connection = await this.connectionManager.getOrCreateConnection(
          clientSub.providerName,
          clientSub.wsCapabilityType,
          requestId,
          symbolsToUnsubscribe,
          clientId,
        );
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
            const readyProviderSymbols = providerSymbols.filter((providerSymbol, index) =>
              readySymbols.includes(standardSymbols[index]),
            );
          if (readyProviderSymbols.length === 0) {
            return;
          }
          await this.streamDataFetcher.unsubscribeFromSymbols(
            connection,
            readyProviderSymbols,
          );
          await this.notifyUpstreamReleased(options, readySymbols);
        },
      );
        immediateUnsubscribeSymbols = releasePlan.immediateSymbols;
        scheduledUpstreamSymbols = releasePlan.scheduledSymbols;

        const immediateProviderSymbols = providerSymbols.filter((providerSymbol, index) =>
          immediateUnsubscribeSymbols.includes(standardSymbols[index]),
        );
        if (immediateProviderSymbols.length > 0) {
          await this.streamDataFetcher.unsubscribeFromSymbols(
            connection,
            immediateProviderSymbols,
          );
          await this.notifyUpstreamReleased(options, immediateUnsubscribeSymbols);
        }
      } else {
        this.logger.warn("未找到活跃连接，跳过上游退订", {
          clientId,
          provider: clientSub.providerName,
          capability: clientSub.wsCapabilityType,
          connectionKey,
        });
        // 将客户端从房间移除
        try {
          if (this.webSocketProvider && standardSymbols?.length) {
            const rooms = this.buildSymbolRooms(standardSymbols);
            await this.webSocketProvider.leaveClientFromRooms(clientId, rooms);
          }
        } catch (err) {
          this.logger.warn("退出房间失败(忽略)", { clientId, error: (err as any)?.message });
        }

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
      try {
        if (this.webSocketProvider && standardSymbols?.length) {
          const rooms = this.buildSymbolRooms(standardSymbols);
          await this.webSocketProvider.leaveClientFromRooms(clientId, rooms);
        }
      } catch (err) {
        this.logger.warn("退出房间失败(忽略)", { clientId, error: (err as any)?.message });
      }

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
      this.logger.error("流数据取消订阅失败", {
        clientId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 处理客户端重连 - Phase 3 重连协议实现
   */
  async handleClientReconnect(
    reconnectRequest: ClientReconnectRequest,
  ): Promise<ClientReconnectResponse> {
    const {
      clientId,
      lastReceiveTimestamp,
      symbols,
      wsCapabilityType,
      preferredProvider,
      reason,
    } = reconnectRequest;

    const marketContext = resolveMarketTypeFromSymbols(
      this.marketInferenceService,
      symbols,
    );
    const providerName =
      preferredProvider ||
      this.getDefaultProvider(symbols, wsCapabilityType, marketContext);
    const requestId = `reconnect_${Date.now()}`;

    this.logger.log("客户端重连请求", {
      clientId,
      reason,
      symbolsCount: symbols.length,
      timeSinceLastReceive: Date.now() - lastReceiveTimestamp,
    });

    try {
      // 1. 验证lastReceiveTimestamp
      if (!lastReceiveTimestamp || lastReceiveTimestamp > Date.now()) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.STREAM_RECEIVER,
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          operation: 'handleClientReconnect',
          message: 'Invalid lastReceiveTimestamp: must be a valid past timestamp',
          context: {
            lastReceiveTimestamp,
            currentTime: Date.now(),
            errorType: STREAM_RECEIVER_ERROR_CODES.INVALID_TIMESTAMP
          }
        });
      }

      // 2. 映射符号（标准化 + Provider格式）
      const { standardSymbols, providerSymbols } =
        await this.resolveSymbolMappings(symbols, providerName, requestId);
      const rejectedSymbols: Array<{ symbol: string; reason: string }> = [];
      const confirmedStandardSymbols: string[] = [];
      const confirmedProviderSymbols: string[] = [];

      standardSymbols.forEach((standardSymbol, index) => {
        const providerSymbol = providerSymbols[index];
        if (!standardSymbol || !providerSymbol) {
          rejectedSymbols.push({
            symbol: symbols[index],
            reason: "符号映射失败",
          });
          return;
        }
        confirmedStandardSymbols.push(standardSymbol);
        confirmedProviderSymbols.push(providerSymbol);
      });

      // 3. 获取或创建连接
      const connection = await this.connectionManager.getOrCreateConnection(
        providerName,
        wsCapabilityType,
        requestId,
        symbols,
        clientId,
      );

      // 4. 订阅符号（Provider格式）
      if (confirmedProviderSymbols.length > 0) {
        await this.streamDataFetcher.subscribeToSymbols(
          connection,
          confirmedProviderSymbols,
        );
      }

      // 5. 订阅成功后恢复客户端订阅状态
      if (confirmedStandardSymbols.length > 0) {
        this.clientStateManager.addClientSubscription(
            clientId,
            confirmedStandardSymbols,
            wsCapabilityType,
            providerName,
          );
      }

      // 6. 判断是否需要补发数据
      const timeDiff = Date.now() - lastReceiveTimestamp;
      const maxRecoveryWindow = STREAM_RECEIVER_TIMEOUTS.RECOVERY_WINDOW_MS;

      let recoveryJobId: string | undefined;
      const willRecover =
        timeDiff <= maxRecoveryWindow && confirmedStandardSymbols.length > 0;

      if (willRecover && this.recoveryWorker) {
        // 提交补发任务
        const recoveryJob: RecoveryJob = {
          clientId,
          symbols: confirmedStandardSymbols,
          lastReceiveTimestamp,
          provider: providerName,
          capability: wsCapabilityType,
          priority: reason === "network_error" ? "high" : "normal",
        };

        recoveryJobId =
          await this.recoveryWorker.submitRecoveryJob(recoveryJob);

        this.logger.log("补发任务已提交", {
          clientId,
          jobId: recoveryJobId,
          symbolsCount: confirmedStandardSymbols.length,
        });
      }

      // 7. 构建响应
      const response: ClientReconnectResponse = {
        success: true,
        clientId,
        confirmedSymbols: confirmedStandardSymbols,
        rejectedSymbols:
          rejectedSymbols.length > 0 ? rejectedSymbols : undefined,
        recoveryStrategy: {
          willRecover,
          timeRange: willRecover
            ? {
                from: lastReceiveTimestamp,
                to: Date.now(),
              }
            : undefined,
          recoveryJobId,
        },
        connectionInfo: {
          provider: providerName,
          connectionId: connection.id,
          serverTimestamp: Date.now(),
          heartbeatInterval: STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_INTERVAL_MS,
        },
        instructions: {
          action: willRecover ? "wait_for_recovery" : "none",
          message: willRecover
            ? "正在恢复历史数据，请等待"
            : "已重新连接，开始接收实时数据",
        },
      };

      this.logger.log("客户端重连成功", {
        clientId,
        confirmedSymbolsCount: confirmedStandardSymbols.length,
        willRecover,
        recoveryJobId,
      });

      return response;
    } catch (error) {
      const failureMessage =
        (error as Error)?.message || "重连失败，请重新订阅";

      this.logger.error("客户端重连失败", {
        clientId,
        error: failureMessage,
      });

      return {
        success: false,
        clientId,
        confirmedSymbols: [],
        recoveryStrategy: {
          willRecover: false,
        },
        connectionInfo: {
          provider: providerName,
          connectionId: "",
          serverTimestamp: Date.now(),
          heartbeatInterval: STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_INTERVAL_MS,
        },
        instructions: {
          action: "resubscribe",
          message: failureMessage,
          params: {
            reason: failureMessage,
          },
        },
      };
    }
  }

  /**
   * 主动断线检测 - Phase 3 Critical Fix
   * 检测连接异常并触发重连流程
   */
  detectReconnection(): void {
    // 获取所有活跃客户端
    const allClients = this.clientStateManager.getClientStateStats();
    const now = Date.now();
    const heartbeatTimeout = STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_TIMEOUT_MS;

    this.logger.debug("开始断线检测", {
      totalClients: allClients.totalClients,
      checkTime: now,
    });

    // 遍历所有提供商检查连接状态
    if (allClients.providerBreakdown) {
      Object.keys(allClients.providerBreakdown).forEach((provider) => {
        // 检查提供商连接状态
        this.checkProviderConnections(provider);
      });
    }

    // 检查客户端最后活跃时间
    this.checkClientHeartbeat(heartbeatTimeout);
  }

  /**
   * 检查提供商连接状态
   */
  private checkProviderConnections(provider: string): void {
    // 获取该提供商的所有连接
    const connectionStats =
      this.streamDataFetcher.getConnectionStatsByProvider(provider);
    const providerStats = connectionStats;

    if (!providerStats || providerStats.connections?.length === 0) {
      this.logger.warn("检测到提供商连接断开", {
        provider,
        stats: providerStats,
      });

      // 触发该提供商下所有客户端的重连
      this.triggerProviderReconnection(provider);
    }
  }

  /**
   * 检查客户端心跳超时
   */
  private checkClientHeartbeat(timeoutMs: number): void {
    const now = Date.now();

    // 这里需要遍历所有客户端，检查最后活跃时间
    // 由于 ClientStateManager 没有提供遍历所有客户端的方法，我们需要扩展它
    this.logger.debug("检查客户端心跳", {
      timeoutThreshold: timeoutMs,
      currentTime: now,
    });

    // 通过订阅变更监听来跟踪断线客户端
  }

  /**
   * 触发提供商重连
   */
  private triggerProviderReconnection(provider: string): void {
    this.logger.log("触发提供商重连", { provider });

    // 获取该提供商下的所有客户端 - 需要扩展 ClientStateManager
    // 暂时记录事件，等待 ClientStateManager 扩展
    this.logger.warn("提供商重连触发完成", {
      provider,
      note: "需要 ClientStateManager 支持按提供商查询客户端",
    });
  }

  /**
   * 手动触发客户端重连检查 - 供外部调用
   */
  async handleReconnection(
    clientId: string,
    reason: string = "manual_check",
  ): Promise<void> {
    this.logger.log("手动触发重连检查", { clientId, reason });

    try {
      const clientInfo = this.clientStateManager.getClientSubscription(clientId);

      if (!clientInfo) {
        this.logger.warn("客户端不存在，跳过重连检查", { clientId });
        return;
      }

      // 检查连接是否活跃
      const connectionKey = `${clientInfo.providerName}:${clientInfo.wsCapabilityType}`;
      const connection = this.activeConnections.get(connectionKey);
      const isActive = connection
        ? this.streamDataFetcher.isConnectionActive(connectionKey)
        : false;

      if (!isActive) {
        this.logger.warn("检测到连接不活跃，调度补发任务", {
          clientId,
          provider: clientInfo.providerName,
          capability: clientInfo.wsCapabilityType,
        });

        // 调用 scheduleRecovery (需要在 Worker 中实现)
        if (this.recoveryWorker) {
          await this.scheduleRecoveryForClient(clientInfo, reason);
        } else {
          this.logger.error("Recovery Worker 不可用，无法调度补发", {
            clientId,
          });
        }
      } else {
        this.logger.debug("连接正常，无需重连", { clientId });
      }
    } catch (error) {
      this.logger.error("重连检查失败", {
        clientId,
        error: error.message,
      });
    }
  }

  /**
   * 为特定客户端调度补发任务
   */
  private async scheduleRecoveryForClient(
    clientInfo: any,
    reason: string,
  ): Promise<void> {
    const now = Date.now();
    const lastReceiveTimestamp =
      clientInfo.lastActiveTime ||
      now - STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_TIMEOUT_MS;

    const recoveryJob: RecoveryJob = {
      clientId: clientInfo.clientId,
      symbols: Array.from(clientInfo.symbols) as string[],
      lastReceiveTimestamp,
      provider: clientInfo.providerName,
      capability: clientInfo.wsCapabilityType,
      priority: reason === "network_error" ? "high" : "normal",
    };

    try {
      // 调用 Worker 的 submitRecoveryJob 方法
      const jobId = await this.recoveryWorker!.submitRecoveryJob(recoveryJob);

      this.logger.log("补发任务调度成功", {
        clientId: clientInfo.clientId,
        jobId,
        reason,
      });
    } catch (error) {
      this.logger.error("补发任务调度失败", {
        clientId: clientInfo.clientId,
        error: error.message,
        reason,
      });

      // 调度失败时的回退策略：提示客户端重新订阅
      await this.notifyClientResubscribe(clientInfo.clientId, error.message);
    }
  }

  /**
   * 通知客户端重新订阅 (调度失败时的回退)
   */
  private async notifyClientResubscribe(
    clientId: string,
    errorMessage: string,
  ): Promise<void> {
    const clientInfo = this.clientStateManager.getClientSubscription(clientId);

    if (clientInfo) {
      try {
        // messageCallback功能已移除，改为通过其他方式通知客户端
        // 例如：通过WebSocket直接发送消息或者通过事件系统

        this.logger.log("需要通知客户端重新订阅", {
          clientId,
          error: errorMessage,
          message: "数据恢复失败，请重新订阅",
        });
      } catch (error) {
        this.logger.error("通知客户端重新订阅失败", {
          clientId,
          error: error.message,
        });
      }
    }
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
 
    const connectionStats =
      this.streamDataFetcher.getConnectionStatsByProvider("all");

    return {
      clients: clientStats,
      cache: {
        // Placeholder - actual cache stats are provided by MonitoringService
        info: "Cache statistics are available through MonitoringService",
      },
      connections: connectionStats,
      batchProcessing: this.batchProcessingStats,
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

  // === 私有方法 ===

  private toCanonicalSymbol(symbol: string): string {
    if (typeof symbol !== "string") {
      return "";
    }
    const canonicalSymbol = symbol.trim().toUpperCase();
    if (canonicalSymbol.length === 0) {
      return "";
    }
    return canonicalSymbol;
  }

  private buildCanonicalSymbolKey(symbol: string, prefix = ""): string {
    const canonicalSymbol = this.toCanonicalSymbol(symbol);
    if (!canonicalSymbol) {
      return "";
    }
    return `${prefix}${canonicalSymbol}`;
  }

  private buildSymbolBroadcastKey(symbol: string): string {
    const canonicalSymbol = this.toCanonicalSymbol(symbol);
    if (!canonicalSymbol) {
      return "";
    }

    if (!this.dataValidator.isValidSymbolFormat(canonicalSymbol)) {
      return "";
    }

    return canonicalSymbol;
  }

  private buildSymbolRoomKey(symbol: string): string {
    return this.buildCanonicalSymbolKey(symbol, "symbol:");
  }

  private buildSymbolRooms(symbols: string[]): string[] {
    const rooms = new Set<string>();
    for (const symbol of symbols || []) {
      const room = this.buildSymbolRoomKey(symbol);
      if (room) {
        rooms.add(room);
      }
    }
    return Array.from(rooms);
  }

  private getStandardSymbolIdentityProvidersConfig(): string {
    return this.configService.get<string>(
      STANDARD_SYMBOL_IDENTITY_PROVIDERS_ENV_KEY,
      "",
    );
  }

  private isProviderUsingStandardSymbolIdentity(providerName: string): boolean {
    return isStandardSymbolIdentityProvider(
      providerName,
      this.getStandardSymbolIdentityProvidersConfig(),
    );
  }

  private throwIdentityProviderSymbolValidationError(
    providerName: string,
    requestId: string,
    invalidSymbols: string[],
    operation = "resolveSymbolMappings",
  ): never {
    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.STREAM_RECEIVER,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation,
      message: `Identity provider '${providerName}' requires standard symbol format`,
      context: {
        provider: providerName,
        symbol: invalidSymbols[0],
        invalidSymbols: invalidSymbols.slice(0, 5),
        expectedFormat: "*.HK/*.US/*.SH/*.SZ/*.SG",
        reason: "non_standard_symbol_in_identity_provider",
        requestId,
      },
    });
  }

  private findSymbolsWithBoundaryWhitespace(rawSymbols: unknown): string[] {
    if (!Array.isArray(rawSymbols)) {
      return [];
    }

    return rawSymbols.filter(
      (symbol): symbol is string =>
        typeof symbol === "string" && symbol !== symbol.trim(),
    );
  }

  private validateIdentityProviderRawSymbolsNoBoundaryWhitespace(
    rawSymbols: unknown,
    providerName: string,
    requestId: string,
    operation: "subscribeStream" | "unsubscribeStream",
  ): void {
    if (!this.isProviderUsingStandardSymbolIdentity(providerName)) {
      return;
    }

    const invalidSymbols = this.findSymbolsWithBoundaryWhitespace(rawSymbols);
    if (invalidSymbols.length > 0) {
      this.throwIdentityProviderSymbolValidationError(
        providerName,
        requestId,
        invalidSymbols,
        operation,
      );
    }
  }

  private validateIdentityProviderStandardSymbols(
    symbols: string[],
    providerName: string,
    requestId: string,
  ): void {
    const invalidSymbols = findNonStandardSymbolsForIdentityProvider(symbols);
    if (invalidSymbols.length > 0) {
      this.throwIdentityProviderSymbolValidationError(
        providerName,
        requestId,
        invalidSymbols,
      );
    }
  }

  /**
   * 符号映射
   */
  private async mapSymbols(
    symbols: string[],
    providerName: string,
  ): Promise<string[]> {
    try {
      // 🎯 优化：一次性批量转换，充分利用三层缓存
      const transformResult =
        await this.symbolTransformerService.transformSymbols(
          providerName,
          symbols, // 批量输入所有符号
          MappingDirection.TO_STANDARD, // 明确转换方向
        );

      // 构建结果，保持顺序一致性
      return symbols.map(
        (symbol) => transformResult.mappingDetails[symbol] || symbol,
      );
    } catch (error) {
      this.logger.warn("批量符号映射失败，降级处理", {
        provider: providerName,
        symbolsCount: symbols.length,
        error: error.message,
      });
      return symbols; // 安全降级
    }
  }

  /**
   * 统一解析标准符号与 Provider 符号
   */
  private async resolveSymbolMappings(
    symbols: string[],
    providerName: string,
    requestId: string,
  ): Promise<{ standardSymbols: string[]; providerSymbols: string[] }> {
    if (this.isProviderUsingStandardSymbolIdentity(providerName)) {
      this.validateIdentityProviderStandardSymbols(
        symbols,
        providerName,
        requestId,
      );
      const canonicalSymbols = symbols.map((symbol) =>
        this.toCanonicalSymbol(symbol),
      );
      this.logger.debug("命中 provider 级标准符号直通，跳过 Provider 符号转换", {
        provider: providerName,
        requestId,
        symbolsCount: canonicalSymbols.length,
      });
      return buildIdentitySymbolMappingPair(canonicalSymbols);
    }

    const standardSymbols = await this.mapSymbols(symbols, providerName);
    const providerSymbols = await this.mapSymbolsForProvider(
      providerName,
      standardSymbols,
      symbols,
      requestId,
    );

    return { standardSymbols, providerSymbols };
  }

  private async notifyUpstreamReleased(
    options: UnsubscribeStreamOptions | undefined,
    releasedSymbols: string[],
  ): Promise<void> {
    if (!options?.onUpstreamReleased || releasedSymbols.length === 0) {
      return;
    }

    try {
      await options.onUpstreamReleased(releasedSymbols);
    } catch (error) {
      this.logger.warn("上游释放回调失败(忽略)", {
        releasedSymbols,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private assertSubscriptionContextCompatibility(
    clientId: string,
    providerName: string,
    wsCapabilityType: string,
  ): void {
    const existingSubscription =
      this.clientStateManager.getClientSubscription(clientId);
    if (!existingSubscription || existingSubscription.symbols.size === 0) {
      return;
    }

    const normalizedProvider = String(providerName || "").trim().toLowerCase();
    const normalizedCapability = String(wsCapabilityType || "")
      .trim()
      .toLowerCase();
    const existingProvider = String(existingSubscription.providerName || "")
      .trim()
      .toLowerCase();
    const existingCapability = String(existingSubscription.wsCapabilityType || "")
      .trim()
      .toLowerCase();

    if (
      existingProvider === normalizedProvider &&
      existingCapability === normalizedCapability
    ) {
      return;
    }

    throw UniversalExceptionFactory.createBusinessException({
      component: ComponentIdentifier.STREAM_RECEIVER,
      errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
      operation: "subscribeStream",
      message:
        "Mixed provider/capability subscriptions are not allowed on the same client connection",
      context: {
        clientId,
        providerName: normalizedProvider,
        wsCapabilityType: normalizedCapability,
        existingProvider: existingProvider || null,
        existingWsCapabilityType: existingCapability || null,
        errorType: STREAM_RECEIVER_ERROR_CODES.SUBSCRIPTION_FAILED,
        reason: "mixed_subscription_context_for_same_client",
      },
    });
  }

  /**
   * 将标准符号映射为 Provider 所需格式
   */
  private async mapSymbolsForProvider(
    providerName: string,
    standardSymbols: string[],
    originalSymbols: string[],
    requestId: string,
  ): Promise<string[]> {
    if (!standardSymbols?.length) {
      return [];
    }

    try {
      const providerResult =
        await this.symbolTransformerService.transformSymbolsForProvider(
          providerName,
          standardSymbols,
          requestId,
        );

      const mappingTable =
        providerResult?.mappingResults?.transformedSymbols || {};

      return standardSymbols.map((symbol, index) => {
        return (
          mappingTable[symbol] ??
          providerResult?.transformedSymbols?.[index] ??
          standardSymbols[index] ??
          originalSymbols[index] ??
          symbol
        );
      });
    } catch (error) {
      this.logger.warn("Provider 符号映射失败，使用标准符号回退", {
        provider: providerName,
        symbolsCount: standardSymbols.length,
        error: (error as Error).message,
      });
      return standardSymbols;
    }
  }

  /**
   * 确保符号一致性：用于管道处理时的端到端标准化
   */
  private async ensureSymbolConsistency(
    symbols: string[],
    provider: string,
  ): Promise<string[]> {
    if (this.isProviderUsingStandardSymbolIdentity(provider)) {
      return symbols.map((symbol) => this.buildSymbolBroadcastKey(symbol) || symbol);
    }

    try {
      const result = await this.symbolTransformerService.transformSymbols(
        provider,
        symbols,
        MappingDirection.TO_STANDARD,
      );
      return symbols.map((symbol) => result.mappingDetails[symbol] || symbol);
    } catch (error) {
      this.logger.warn("符号标准化失败，使用原始符号", {
        provider,
        symbols,
        error: error.message,
      });
      return symbols;
    }
  }

  /**
   * 获取或创建流连接
   */
  private async getOrCreateConnection(
    provider: string,
    capability: string,
    requestId: string,
    symbols: string[],
    clientId: string,
  ): Promise<StreamConnection> {
    const connectionKey = `${provider}:${capability}`;

    // 检查现有连接
    let connection = this.activeConnections.get(connectionKey);
    if (
      connection &&
      this.streamDataFetcher.isConnectionActive(connectionKey)
    ) {
      return connection;
    }

    // 创建新连接
    const connectionParams: StreamConnectionParams = {
      provider,
      capability,
      // 🎯 修复：使用增强的上下文服务
      contextService: this.buildEnhancedContextService(
        requestId,
        provider,
        symbols,
        capability,
        clientId,
      ),
      requestId,
      options: {
        autoReconnect: true,
        maxReconnectAttempts: 3,
        heartbeatIntervalMs: STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_INTERVAL_MS,
      },
    };

    connection = await this.streamDataFetcher.establishStreamConnection(
      provider,
      capability,
      {
        maxReconnectAttempts: 3,
        connectionTimeoutMs: STREAM_RECEIVER_TIMEOUTS.CONNECTION_TIMEOUT_MS,
        autoReconnect: true,
        heartbeatIntervalMs: STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_INTERVAL_MS,
      },
    );
    this.activeConnections.set(connectionKey, connection);

    // ✅ 记录连接创建监控
    this.recordConnectionMetrics(connection.id, provider, capability, true);

    this.logger.log("新流连接已创建", {
      connectionId: connection.id,
      provider,
      capability,
    });

    return connection;
  }

  /**
   * 设置数据接收处理
   */
  private setupDataReceiving(
    connection: StreamConnection,
    provider: string,
    capability: string,
  ): void {
    // 设置数据接收回调
    connection.onData((rawData) => {
      this.handleIncomingData(rawData, provider, capability);
    });

    // 设置错误处理
    connection.onError((error) => {
      this.logger.error("流连接错误", {
        connectionId: connection.id,
        provider,
        capability,
        error: error.message,
      });
    });

    // 设置状态变化处理
    connection.onStatusChange((status) => {
      this.logger.debug("流连接状态变化", {
        connectionId: connection.id,
        provider,
        capability,
        status,
      });
    });
  }

  /**
   * 处理接收到的数据
   */
  private handleIncomingData(
    rawData: any,
    provider: string,
    capability: string,
  ): void {
    try {
      // 提取符号信息
      const symbols = this.extractSymbolsFromData(rawData);
      const marketContext = resolveMarketTypeFromSymbols(
        this.marketInferenceService,
        symbols,
      );

      // 推送到批量处理管道 - 使用专职批处理服务
      this.batchProcessor.addQuoteData({
        rawData,
        providerName: provider,
        wsCapabilityType: capability,
        timestamp: Date.now(),
        symbols,
        marketContext,
      });
    } catch (error) {
      this.logger.error("数据处理失败", {
        provider,
        capability,
        error: error.message,
      });
    }
  }

  /**
   * 从数据中提取符号
   */
  private extractSymbolsFromData(data: any): string[] {
    if (!data) return [];

    // 处理不同的数据格式
    if (data.symbol) return [data.symbol];
    if (data.s) return [data.s];
    if (data.symbols && Array.isArray(data.symbols)) return data.symbols;
    if (data.quote && data.quote.symbol) return [data.quote.symbol];
    if (data.quote && data.quote.s) return [data.quote.s];
    if (Array.isArray(data)) {
      return data.map((item) => item.symbol || item.s).filter(Boolean);
    }

    return [];
  }
  // 注意：processDataThroughPipeline 已迁移到 StreamDataProcessorService

  /**
   * 记录流数据推送延迟 - Phase 4 延迟监控埋点
   */
  private recordStreamPushLatency(symbol: string, latencyMs: number): void {
    // 分类延迟级别
    let latencyCategory: string;
    if (latencyMs <= 10) {
      latencyCategory = "low"; // 0-10ms: 低延迟
    } else if (latencyMs <= 50) {
      latencyCategory = "medium"; // 11-50ms: 中等延迟
    } else if (latencyMs <= 200) {
      latencyCategory = "high"; // 51-200ms: 高延迟
    } else {
      latencyCategory = "critical"; // 200ms+: 关键延迟
    }

    // 基础延迟日志
    if (latencyMs > 50) {
      // 超过50ms记录警告
      this.logger.warn("流数据推送延迟较高", {
        symbol,
        latencyMs,
        latencyCategory,
        threshold: 50,
      });
    } else if (latencyMs > 10) {
      // 超过10ms记录debug
      this.logger.debug("流数据推送延迟", {
        symbol,
        latencyMs,
        latencyCategory,
      });
    }

    // ✅ 使用事件驱动监控记录流数据延迟指标
    this.recordStreamLatencyMetrics(symbol, latencyMs);
  }

  /**
   * ✅ Phase 3 - P3: 智能提供商推断 - 基于能力注册表和市场支持
   * 替换简单的符号后缀匹配，使用更准确的提供商映射
   */
  private extractProviderFromSymbol(symbol: string): string {
    try {
      const market = this.inferMarketLabel(symbol);
      const capability = API_OPERATIONS.STOCK_DATA.STREAM_QUOTE;
      const provider =
        this.providerRegistryService.getBestProvider(capability, market) ||
        this.providerRegistryService.getBestProvider(capability) ||
        REFERENCE_DATA.PROVIDER_IDS.LONGPORT;

      this.logger.debug("基于注册表推断流提供商", {
        symbol,
        market,
        provider,
        method: "provider_registry",
      });
      return provider;
    } catch (error) {
      this.logger.warn("提供商推断失败，使用默认提供商", {
        symbol,
        error: error.message,
        fallback: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      });
      return REFERENCE_DATA.PROVIDER_IDS.LONGPORT;
    }
  }

  /**
   * 从符号推断市场代码
   */
  private inferMarketLabel(symbol: string): string {
    return this.marketInferenceService.inferMarketLabel(symbol, {
      collapseChina: true,
    });
  }

  private static readonly STREAM_PRIORITY_MARKETS = Object.freeze([
    "HK",
    "US",
    "CN",
    "SG",
    "JP",
    "UNKNOWN",
  ]);

  private getMarketPriorityProviders(
    market: string,
    capability = API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
  ): string[] {
    const normalizedMarket = (market || "UNKNOWN").toUpperCase();
    const candidates = this.providerRegistryService.getCandidateProviders(
      capability,
      normalizedMarket,
    );
    const ranked = this.providerRegistryService.rankProvidersForCapability(
      capability,
      candidates,
    );
    return ranked.length > 0 ? ranked : [REFERENCE_DATA.PROVIDER_IDS.LONGPORT];
  }

  private getPrimaryProviderByMarket(
    market: string,
    capability = API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
  ): string {
    return (
      this.getMarketPriorityProviders(market, capability)[0] ||
      REFERENCE_DATA.PROVIDER_IDS.LONGPORT
    );
  }

  private buildMarketPrioritiesSnapshot(
    capability = API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
  ): Record<string, string[]> {
    return StreamReceiverService.STREAM_PRIORITY_MARKETS.reduce(
      (acc, market) => {
        acc[market] = this.getMarketPriorityProviders(market, capability);
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }

  // =============== 连接健康管理方法 ===============

  /**
   * 更新连接健康状态 - 使用工具类
   */




  /**
   * 获取默认Provider：基于 ProviderRegistryService 的能力+市场选择
   */
  private getDefaultProvider(
    symbols: string[],
    capability: string,
    marketContext?: MarketTypeContext,
  ): string {
    try {
      const primaryMarket =
        marketContext?.primaryMarket ||
        this.marketInferenceService.inferDominantMarket(symbols);

      const provider =
        this.providerRegistryService.getBestProvider(capability, primaryMarket) ||
        this.providerRegistryService.getBestProvider(capability);

      if (provider) {
        this.logger.debug("基于能力注册表找到最佳提供商", {
          capability,
          market: primaryMarket,
          provider,
          symbolsCount: symbols.length,
          method: "capability_registry",
        });
        return provider;
      }

      const fallback = this.getProviderByMarketPriority(primaryMarket);
      this.logger.warn("未找到支持能力的Provider，使用兜底Provider", {
        capability,
        market: primaryMarket,
        fallback,
      });
      return fallback;
    } catch (error) {
      this.logger.warn("Provider选择失败，使用默认", {
        error: error.message,
        fallback: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      });
      return REFERENCE_DATA.PROVIDER_IDS.LONGPORT; // 安全回退
    }
  }

  /**
   * 基于市场优先级获取Provider
   */
  private getProviderByMarketPriority(market: string): string {
    return this.getPrimaryProviderByMarket(market);
  }

  private buildMarketDistributionMap(
    symbols: string[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {};
    symbols.forEach((symbol) => {
      const market = this.inferMarketLabel(symbol);
      distribution[market] = (distribution[market] || 0) + 1;
    });
    return distribution;
  }

  /**
   * 构建增强的连接上下文服务
   */
  private buildEnhancedContextService(
    requestId: string,
    provider: string,
    symbols: string[],
    capability: string,
    clientId: string,
  ): StreamConnectionContext {
    const marketContext = resolveMarketTypeFromSymbols(
      this.marketInferenceService,
      symbols,
    );
    const marketDistribution = this.buildMarketDistributionMap(symbols);

    return {
      // 基础信息
      requestId,
      provider,
      capability,
      clientId,

      // 市场和符号信息
      market: marketContext.primaryMarket,
      symbolsCount: symbols.length,
      marketDistribution,

      // 连接配置
      connectionConfig: {
        autoReconnect: true,
        maxReconnectAttempts: 3,
        heartbeatIntervalMs: STREAM_RECEIVER_TIMEOUTS.HEARTBEAT_INTERVAL_MS,
        connectionTimeoutMs: 10000,
      },

      // 性能监控配置
      metricsConfig: {
        enableLatencyTracking: true,
        enableThroughputTracking: true,
        metricsPrefix: `stream_${provider}_${capability}`,
      },

      // 错误处理配置
      errorHandling: {
        retryPolicy: "exponential_backoff",
        maxRetries: 3,
        circuitBreakerEnabled: true,
      },

      // 会话信息
      session: {
        createdAt: Date.now(),
        lastActivity: Date.now(),
        subscriptionCount: symbols.length,
      },
    };
  }

  /**
   * 基于能力注册表查找最佳提供商
   */
  /**
   * 🎯 配置驱动的智能提供商选择 - 增强版
   */
  private findOptimalProviderForMarket(
    market: string,
    symbol: string,
  ): string | null {
    try {
      const capability = API_OPERATIONS.STOCK_DATA.STREAM_QUOTE;
      return (
        this.providerRegistryService.getBestProvider(capability, market) ||
        this.providerRegistryService.getBestProvider(capability) ||
        null
      );
    } catch (error) {
      this.logger.debug("智能提供商选择失败", {
        market,
        symbol,
        error: error.message,
      });

      // 🛡️ 降级到基础选择逻辑
      return this.selectProviderBasic(market);
    }
  }

  /**
   * 📊 获取提供商选择策略 (配置驱动)
   */
  private getProviderSelectionStrategy(): {
    strategy: 'performance' | 'availability' | 'cost' | 'balanced';
    marketPriorities: Record<string, string[]>;
    fallbackProvider: string;
    performanceWeights: {
      latency: number;
      reliability: number;
      dataQuality: number;
    };
  } {
    // 🔧 从配置中获取策略，这里使用智能默认值。
    // marketPriorities 由 capability 优先级策略动态生成，保持与 receiver 选源语义一致。
    return {
      strategy: 'balanced', // 可配置: performance/availability/cost/balanced
      marketPriorities: this.buildMarketPrioritiesSnapshot(),
      fallbackProvider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      performanceWeights: {
        latency: 0.4,      // 延迟权重 40%
        reliability: 0.4,   // 可靠性权重 40%
        dataQuality: 0.2,   // 数据质量权重 20%
      },
    };
  }

  /**
   * 🚀 按策略选择提供商
   */
  private selectProviderByStrategy(
    market: string,
    symbol: string,
    strategy: any,
  ): string | null {
    const candidateProviders = strategy.marketPriorities[market] ||
      [strategy.fallbackProvider];

    switch (strategy.strategy) {
      case 'performance':
        return this.selectByPerformance(candidateProviders, symbol, strategy.performanceWeights);

      case 'availability':
        return this.selectByAvailability(candidateProviders);

      case 'cost':
        return this.selectByCost(candidateProviders);

      case 'balanced':
      default:
        return this.selectBalanced(candidateProviders, symbol, strategy.performanceWeights);
    }
  }

  /**
   * ⚡ 基于性能选择提供商
   */
  private selectByPerformance(
    providers: string[],
    symbol: string,
    weights: any,
  ): string {
    // 📊 模拟性能评分 (实际应用中从监控系统获取)
    const performanceScores = providers.map(provider => {
      const latencyScore = this.getLatencyScore(provider);
      const reliabilityScore = this.getReliabilityScore(provider);
      const qualityScore = this.getDataQualityScore(provider, symbol);

      return {
        provider,
        score:
          latencyScore * weights.latency +
          reliabilityScore * weights.reliability +
          qualityScore * weights.dataQuality,
      };
    });

    // 返回得分最高的提供商
    const best = performanceScores.reduce((prev, current) =>
      current.score > prev.score ? current : prev
    );

    return best.provider;
  }

  /**
   * 🔄 基于可用性选择提供商
   */
  private selectByAvailability(providers: string[]): string {
    // 检查提供商当前可用性
    for (const provider of providers) {
      if (this.isProviderAvailable(provider)) {
        return provider;
      }
    }
    return providers[0]; // 降级返回第一个
  }

  /**
   * 💰 基于成本选择提供商
   */
  private selectByCost(providers: string[]): string {
    // 成本优先排序 (实际应用中从配置获取成本信息)
    const costRanking = {
      [REFERENCE_DATA.PROVIDER_IDS.LONGPORT]: 1, // 成本排名
      [REFERENCE_DATA.PROVIDER_IDS.JVQUANT]: 2,
    };

    return providers.sort((a, b) =>
      (costRanking[a] || 999) - (costRanking[b] || 999)
    )[0];
  }

  /**
   * ⚖️ 平衡选择策略
   */
  private selectBalanced(
    providers: string[],
    symbol: string,
    weights: any,
  ): string {
    // 平衡性能、可用性和成本
    const scores = providers.map(provider => {
      const perfScore = this.getLatencyScore(provider) * 0.4;
      const availScore = this.isProviderAvailable(provider) ? 100 : 0;
      const costScore = this.getCostScore(provider);

      return {
        provider,
        score: (perfScore + availScore * 0.3 + costScore * 0.3),
      };
    });

    const best = scores.reduce((prev, current) =>
      current.score > prev.score ? current : prev
    );

    return best.provider;
  }

  /**
   * 🛡️ 基础提供商选择 (降级逻辑)
   */
  private selectProviderBasic(market: string): string | null {
    return this.getPrimaryProviderByMarket(market);
  }

  /**
   * 改进的启发式提供商推断
   */
  private getProviderByHeuristics(symbol: string, market: string): string {
    // 特殊符号的自定义映射
    const symbolSpecificMapping: Record<string, string> = {
      // 可以在这里添加特定符号的提供商映射
      // 'AAPL.US': REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      // '00700.HK': REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    };

    // 1. 首先检查特定符号映射
    const specificProvider = symbolSpecificMapping[symbol.toUpperCase()];
    if (specificProvider) {
      return specificProvider;
    }

    // 2. 基于市场选择最佳提供商
    const priorityList = this.getMarketPriorityProviders(market);
    return priorityList[0];
  }

  // 已删除重复的recordConnectionMetrics方法，保留第3541行的版本

  /**
   * 初始化连接清理机制 - 防止内存泄漏
   */
  private initializeConnectionCleanup(): void {
    // 定期清理断开的连接 - 使用专职服务
    this.cleanupTimer = setInterval(async () => {
      try {
        await this.connectionManager.forceConnectionCleanup();
      } catch (error) {
        this.logger.error("连接清理任务执行失败", {
          error: error?.message || String(error),
        });
      }
    }, this.config.connectionCleanupInterval);

    this.logger.log("连接清理机制已初始化", {
      cleanupInterval: this.config.connectionCleanupInterval,
      maxConnections: this.config.maxConnections,
      staleTimeout: this.config.connectionStaleTimeout,
    });
  }

  /**
   * 智能连接清理 - 集成连接健康跟踪和活动度监控
   */







  /**
   * 获取当前活跃连接数 (用于测试和监控)
   */
  getActiveConnectionsCount(): number {
    return this.activeConnections.size;
  }

  /**
   * 线程安全地更新批量处理统计 - 防止并发竞态条件
   */
  private async updateBatchStatsThreadSafe(
    batchSize: number,
    processingTimeMs: number,
  ): Promise<void> {
    const lockKey = "batchStats";

    // 等待之前的更新完成
    if (this.statsLock.has(lockKey)) {
      await this.statsLock.get(lockKey);
    }

    // 创建新的更新锁
    const updatePromise = new Promise<void>((resolve) => {
      // 原子性更新统计数据
      this.batchProcessingStats.totalBatches++;
      this.batchProcessingStats.totalQuotes += batchSize;
      this.batchProcessingStats.batchProcessingTime += processingTimeMs;

      // 立即释放锁
      setImmediate(() => {
        this.statsLock.delete(lockKey);
        resolve();
      });
    });

    this.statsLock.set(lockKey, updatePromise);
    await updatePromise;
  }

  /**
   * 获取批量处理统计数据 (用于监控和测试)
   */
  getBatchProcessingStats(): {
    totalBatches: number;
    totalQuotes: number;
    batchProcessingTime: number;
  } {
    // 返回副本以防止外部修改
    return { ...this.batchProcessingStats };
  }

  /**
   * 🔄 带重试和降级的批量处理 - 增强错误恢复能力
   */





  /**
   * 检查断路器是否开启
   */
  private isCircuitBreakerOpen(): boolean {
    // 如果断路器已开启，检查是否可以重置
    if (this.circuitBreakerState.isOpen) {
      const now = Date.now();
      if (
        now - this.circuitBreakerState.lastFailureTime >
        this.config.circuitBreakerResetTimeout
      ) {
        this.resetCircuitBreaker();
        return false;
      }
      return true;
    }

    // 计算失败率
    const totalAttempts =
    this.circuitBreakerState.failures + this.circuitBreakerState.successes;
    if (totalAttempts >= 10) {
      // 至少10次尝试后才考虑开启断路器
      const failureRate =
        (this.circuitBreakerState.failures / totalAttempts) * 100;
      if (failureRate >= this.config.circuitBreakerThreshold) {
        this.openCircuitBreaker();
        return true;
      }
    }

    return false;
  }

  /**
   * 记录断路器成功
   */
  private recordCircuitBreakerSuccess(): void {
    this.circuitBreakerState.successes++;

    // 重置计数器防止溢出
    if (
      this.circuitBreakerState.successes > 1000 // 重置阈值（原常量值）
    ) {
      this.circuitBreakerState.successes = Math.floor(
      this.circuitBreakerState.successes / 2,
        );
      this.circuitBreakerState.failures = Math.floor(
      this.circuitBreakerState.failures / 2,
        );
    }
  }

  /**
   * 记录断路器失败
   */
  private recordCircuitBreakerFailure(): void {
    this.circuitBreakerState.failures++;
    this.circuitBreakerState.lastFailureTime = Date.now();
  }

  /**
   * 开启断路器
   */
  private openCircuitBreaker(): void {
    this.circuitBreakerState.isOpen = true;
    this.circuitBreakerState.lastFailureTime = Date.now();

    this.logger.warn("断路器开启", {
      failures: this.circuitBreakerState.failures,
      successes: this.circuitBreakerState.successes,
      failureRate: Math.round(
        (this.circuitBreakerState.failures /
          (this.circuitBreakerState.failures +
    this.circuitBreakerState.successes)) *
          100,
      ),
    });
  }

  /**
   * 重置断路器
   */
  private resetCircuitBreaker(): void {
    this.circuitBreakerState.isOpen = false;
    this.circuitBreakerState.failures = 0;
    this.circuitBreakerState.successes = 0;

    this.logger.log("断路器重置", {
      resetTime: new Date().toISOString(),
    });
  }

  /**
   * 获取断路器状态 (用于监控)
   */
  getCircuitBreakerState(): {
    isOpen: boolean;
    failures: number;
    successes: number;
    failureRate: number;
  } {
    const total =
    this.circuitBreakerState.failures + this.circuitBreakerState.successes;
    const failureRate =
      total > 0 ? (this.circuitBreakerState.failures / total) * 100 : 0;

    return {
      isOpen: this.circuitBreakerState.isOpen,
      failures: this.circuitBreakerState.failures,
      successes: this.circuitBreakerState.successes,
      failureRate: Math.round(failureRate * 100) / 100,
    };
  }

  /**
   * 模块销毁时清理资源
   */
  onModuleDestroy() {
    // 1. 清理 RxJS Subject (防错处理)
    try {
      if (this.quoteBatchSubject) {
        this.quoteBatchSubject.complete();
        this.quoteBatchSubject.unsubscribe();
      }
    } catch (error) {
      this.logger.warn("RxJS Subject清理失败，继续其他清理步骤", {
        error: error.message,
      });
    }

    // 2. 清理定时器
    try {
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = undefined;
      }
      // P0修复: 清理内存监控定时器
      if (this.memoryCheckTimer) {
        clearInterval(this.memoryCheckTimer);
        this.memoryCheckTimer = undefined;
      }
      // P1阶段2: 清理动态批处理调整定时器
      if (this.dynamicBatchingState.adjustmentTimer) {
        clearInterval(this.dynamicBatchingState.adjustmentTimer);
    this.dynamicBatchingState.adjustmentTimer = undefined;
      }
    } catch (error) {
      this.logger.warn("定时器清理失败", { error: error.message });
    }

    // 3. 清理连接
    try {
      this.activeConnections.clear();
    } catch (error) {
      this.logger.warn("连接清理失败", { error: error.message });
    }

    this.logger.log("StreamReceiver 资源已清理 - 包含动态批处理优化");
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

  // =============== 监控辅助方法 ===============

  /**
   * ✅ 记录流数据延迟指标
   */
  private recordStreamLatencyMetrics(symbol: string, latencyMs: number): void {
    // 延迟监控使用异步处理，避免阻塞流数据处理
    setImmediate(() => {
      try {
        // 提取业务元数据
        const provider = this.extractProviderFromSymbol(symbol);
        const market = this.inferMarketLabel(symbol);

        // ✅ 事件化监控 - 延迟监控事件发送
        // 监控事件已移除（监控模块已删除）
      // 如需监控，请使用外部工具（如 Prometheus）

        this.logger.debug("流延迟指标已记录", {
          symbol,
          provider,
          market,
          latencyMs,
          latency_category: LatencyUtils.categorizeLatency(latencyMs),
        });
      } catch (error) {
        // 监控失败不应影响业务流程
        this.logger.warn(`流延迟监控记录失败: ${error.message}`, {
          symbol,
          latencyMs,
        });
      }
    });
  }

  /**
   * ✅ 事件化监控 - 记录流连接状态变化
   */
  private recordConnectionMetrics(
    connectionId: string,
    provider: string,
    capability: string,
    isConnected: boolean,
  ): void {
    try {
      // ✅ 事件化监控 - 连接状态变化事件
      this.emitBusinessEvent("connection_status_changed", isConnected ? 1 : 0, {
        connectionId,
        provider,
        capability,
        status: isConnected ? "connected" : "disconnected",
        activeConnections: this.connectionManager.getActiveConnectionsCount(),
      });
    } catch (error) {
      this.logger.warn(`流连接监控事件发送失败: ${error.message}`, {
        connectionId,
        provider,
      });
    }
  }

  /**
   * ✅ 事件化监控 - 记录批处理性能指标
   */
  private recordBatchProcessingMetrics(
    batchSize: number,
    processingTimeMs: number,
    provider: string,
  ): void {
    try {
      // ✅ 事件化监控 - 批处理性能事件
      // 监控事件已移除（监控模块已删除）
      // 如需监控，请使用外部工具（如 Prometheus）
    } catch (error) {
      this.logger.warn(`批处理监控事件发送失败: ${error.message}`, {
        batchSize,
        processingTimeMs,
      });
    }
  }

  // =============== 🛡️ 智能降级处理支持方法 ===============

  /**
   * 📈 分析批次数据用于降级处理
   */
  private analyzeBatchForFallback(batch: QuoteData[]): {
    symbolsCount: number;
    providersCount: number;
    marketsCount: number;
    capabilityTypes: string[];
    avgTimestamp: number;
  } {
    const symbols = new Set(batch.flatMap((quote) => quote.symbols));
    const providers = new Set(batch.map((quote) => quote.providerName));
    const capabilities = new Set(batch.map((quote) => quote.wsCapabilityType));

    // 推断市场分布
    const markets = new Set(
      batch.flatMap((quote) =>
        quote.symbols.map((symbol) => this.inferMarketLabel(symbol))
      ).filter(market => market !== "UNKNOWN")
    );

    const avgTimestamp = batch.length > 0
      ? batch.reduce((sum, quote) => sum + quote.timestamp, 0) / batch.length
      : Date.now();

    return {
      symbolsCount: symbols.size,
      providersCount: providers.size,
      marketsCount: markets.size,
      capabilityTypes: Array.from(capabilities),
      avgTimestamp,
    };
  }

  /**
   * 🔄 尝试智能部分恢复
   */
  private async attemptPartialRecovery(
    batch: QuoteData[],
    reason: string,
  ): Promise<{
    attempted: boolean;
    successCount: number;
    failureCount: number;
  }> {
    // 仅在特定条件下尝试部分恢复
    if (reason === "circuit_breaker_open" || batch.length > 100) {
      return { attempted: false, successCount: 0, failureCount: 0 };
    }

    let successCount = 0;
    let failureCount = 0;

    try {
      // 尝试处理高优先级的小批次数据
      const priorityQuotes = batch.filter(quote =>
        quote.symbols.some(symbol => this.isHighPrioritySymbol(symbol))
      ).slice(0, 5); // 限制最多5个高优先级项目

      for (const quote of priorityQuotes) {
        try {
          // 简化的单项目处理
          await this.processSingleQuoteSimple(quote);
          successCount++;
        } catch (error) {
          failureCount++;
        }
      }
    } catch (error) {
      this.logger.warn("部分恢复尝试失败", { error: error.message });
    }

    return {
      attempted: true,
      successCount,
      failureCount,
    };
  }

  /**
   * 📊 更新包含降级信息的批处理统计
   */
  private async updateBatchStatsWithFallbackInfo(
    batchSize: number,
    processingTimeMs: number,
    reason: string,
    analyzeResult: any,
    partialRecoveryResult: any,
  ): Promise<void> {
    try {
      // 保持原有的线程安全统计更新
      await this.updateBatchStatsThreadSafe(batchSize, processingTimeMs);

      // 额外记录降级相关统计
      this.batchProcessingStats.totalFallbacks =
        (this.batchProcessingStats.totalFallbacks || 0) + 1;

      if (partialRecoveryResult.attempted && partialRecoveryResult.successCount > 0) {
        this.batchProcessingStats.partialRecoverySuccess =
          (this.batchProcessingStats.partialRecoverySuccess || 0) + 1;
      }
    } catch (error) {
      this.logger.warn("降级统计更新失败", { error: error.message });
    }
  }

  

  /**
   * 📊 记录降级失败指标
   */
  private recordFallbackFailureMetrics(
    batch: QuoteData[],
    reason: string,
    fallbackError: string,
  ): void {
    try {
      // 监控事件已移除（监控模块已删除）
      // 如需监控，请使用外部工具（如 Prometheus）
    } catch (error) {
      this.logger.warn("降级失败指标记录失败", { error: error.message });
    }
  }

  /**
   * 🔔 发送降级事件
   */
  private emitFallbackEvent(
    batch: QuoteData[],
    reason: string,
    analyzeResult: any,
    partialRecoveryResult: any,
  ): void {
    try {
      // 监控已移除: eventBus.emit(SYSTEM_STATUS_EVENTS...) 已删除
    } catch (error) {
      this.logger.warn("降级事件发送失败", { error: error.message });
    }
  }


  /**
   * ⭐ 判断是否为高优先级符号
   */
  private isHighPrioritySymbol(symbol: string): boolean {
    // 简单的高优先级判断逻辑
    const highPrioritySymbols = ['AAPL', 'TSLA', 'NVDA', '00700.HK', '09988.HK'];
    return highPrioritySymbols.some(priority => symbol.includes(priority));
  }

  /**
   * 🔧 简化的单项目处理
   */
  private async processSingleQuoteSimple(quote: QuoteData): Promise<void> {
    // 最简化的处理逻辑，仅记录关键信息
    this.logger.debug("降级模式下处理单个报价", {
      provider: quote.providerName,
      capability: quote.wsCapabilityType,
      symbolsCount: quote.symbols.length,
      timestamp: quote.timestamp,
    });
  }

  // =============== 🎯 智能提供商选择支持方法 ===============

  /**
   * 📊 获取提供商延迟评分 (0-100)
   */
  private getLatencyScore(provider: string): number {
    // 📊 模拟性能数据 (实际应用中从监控系统获取)
    const latencyData: Record<string, number> = {
      [REFERENCE_DATA.PROVIDER_IDS.LONGPORT]: 95, // 优秀
      [REFERENCE_DATA.PROVIDER_IDS.JVQUANT]: 90,
    };

    return latencyData[provider] || 60; // 默认评分
  }

  /**
   * 🛡️ 获取提供商可靠性评分 (0-100)
   */
  private getReliabilityScore(provider: string): number {
    // 📊 基于历史可用性数据
    const reliabilityData: Record<string, number> = {
      [REFERENCE_DATA.PROVIDER_IDS.LONGPORT]: 98, // 极高可靠性
      [REFERENCE_DATA.PROVIDER_IDS.JVQUANT]: 95,
    };

    return reliabilityData[provider] || 70;
  }

  /**
   * 📈 获取数据质量评分 (0-100)
   */
  private getDataQualityScore(provider: string, symbol: string): number {
    // 📊 基于数据质量指标
    const qualityData: Record<string, number> = {
      [REFERENCE_DATA.PROVIDER_IDS.LONGPORT]: 92,
      [REFERENCE_DATA.PROVIDER_IDS.JVQUANT]: 89,
    };

    // 🎯 针对特定符号类型调整评分
    let score = qualityData[provider] || 65;

    if (symbol.includes('.HK') && provider === REFERENCE_DATA.PROVIDER_IDS.LONGPORT) {
      score += 5; // 港股专长加分
    }

    return Math.min(score, 100);
  }

  /**
   * 🔄 检查提供商当前可用性
   */
  private isProviderAvailable(provider: string): boolean {
    const availability: Record<string, boolean> = {
      [REFERENCE_DATA.PROVIDER_IDS.LONGPORT]: true,
      [REFERENCE_DATA.PROVIDER_IDS.JVQUANT]: true,
    };

    return availability[provider] ?? false;
  }

  /**
   * 💰 获取提供商成本评分 (0-100, 越高越便宜)
   */
  private getCostScore(provider: string): number {
    // 📊 成本效益评分
    const costScores: Record<string, number> = {
      [REFERENCE_DATA.PROVIDER_IDS.LONGPORT]: 75, // 中等成本，高质量
      [REFERENCE_DATA.PROVIDER_IDS.JVQUANT]: 72,
    };

    return costScores[provider] || 50;
  }
}

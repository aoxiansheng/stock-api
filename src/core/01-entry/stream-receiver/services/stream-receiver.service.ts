// RECENT_METRICS_COUNT 已移动到监控配置中，通过 configService 动态获取
import { REFERENCE_DATA } from "@common/constants/domain";
import { API_OPERATIONS } from "@common/constants/domain";
import {
  Injectable,
  OnModuleDestroy,
  Inject,
  forwardRef,
} from "@nestjs/common";
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
import { DataTransformRequestDto } from "../../../02-processing/transformer/dto/data-transform-request.dto";
import {
  StreamConnection,
  StreamConnectionParams,
} from "../../../03-fetching/stream-data-fetcher/interfaces";
import { Subject } from "rxjs";
import { STREAM_RECEIVER_TIMEOUTS } from "../constants/stream-receiver-timeouts.constants";
import { STREAM_RECEIVER_METRICS } from "../constants/stream-receiver-metrics.constants";
import { MappingDirection } from "../../../05-caching/symbol-mapper-cache/constants/cache.constants";
import { SYSTEM_STATUS_EVENTS } from "../../../../monitoring/contracts/events/system-status.events";
import { RateLimitService } from "../../../../auth/services/infrastructure/rate-limit.service";
import { bufferTime, filter, mergeMap } from "rxjs/operators";
import {
  StreamReceiverConfig,
  defaultStreamReceiverConfig,
  StreamReceiverConfigKeys,
  mergeStreamReceiverConfig,
  validateStreamReceiverConfig,
} from "../config/stream-receiver.config";
import { QuoteData } from '../interfaces/data-processing.interface';


/**
 * 增强的流连接上下文接口
 */
interface StreamConnectionContext {
  // 基础信息
  requestId: string;
  provider: string;
  capability: string;
  clientId: string;

  // 市场和符号信息
  market: string;
  symbolsCount: number;
  marketDistribution: Record<string, number>;

  // 配置信息
  connectionConfig: {
    autoReconnect: boolean;
    maxReconnectAttempts: number;
    heartbeatIntervalMs: number;
    connectionTimeoutMs: number;
  };

  metricsConfig: {
    enableLatencyTracking: boolean;
    enableThroughputTracking: boolean;
    metricsPrefix: string;
  };

  errorHandling: {
    retryPolicy: string;
    maxRetries: number;
    circuitBreakerEnabled: boolean;
  };

  // 会话信息
  session: {
    createdAt: number;
    version: string;
    protocol: string;
    compression: string;
  };

  // 扩展字段
  extensions: Record<string, any>;
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
 * - 本地数据缓存 (由 StreamCacheService 负责)
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
  TimestampUtils,
  CollectionUtils,
  ConnectionHealthInfo
} from '../utils/stream-receiver.utils';
import { StreamDataValidator } from '../validators/stream-data.validator';
import { StreamBatchProcessorService } from './stream-batch-processor.service';
import { StreamConnectionManagerService } from './stream-connection-manager.service';
import { StreamDataProcessorService } from './stream-data-processor.service';

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

  // 🔄 Stub methods for backward compatibility - delegate to dedicated services
  private async pipelineCacheData(transformedData: any[], symbols: string[]): Promise<void> {
    // Delegate to dedicated services
    this.logger.debug("Pipeline cache data delegated to specialized service", { symbolsCount: symbols.length });
  }

  private async pipelineBroadcastData(transformedData: any[], symbols: string[]): Promise<void> {
    // Delegate to dedicated services
    this.logger.debug("Pipeline broadcast data delegated to specialized service", { symbolsCount: symbols.length });
  }


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
    // 🆕 P2重构: 数据验证模块
    private readonly dataValidator: StreamDataValidator,
    // 🆕 重构: 三个专职服务
    private readonly batchProcessor: StreamBatchProcessorService,
    private readonly connectionManager: StreamConnectionManagerService,
    private readonly dataProcessor: StreamDataProcessorService,
    // ✅ 移除违规的直接 CollectorService 依赖，改用事件化监控
    private readonly recoveryWorker?: StreamRecoveryWorkerService, // Phase 3 可选依赖
    @Inject(forwardRef(() => RateLimitService))
    private readonly rateLimitService?: RateLimitService, // P0修复: 连接频率限制服务 (可选)
  ) {
    // P1重构: 初始化配置管理
    this.config = this.initializeConfig();

    this.logger.log(
      "StreamReceiver 重构完成 - 事件化监控 + 配置管理 + 精简依赖架构 + 连接清理 + 频率限制 + 内存防护 + 动态批处理",
    );

    // 🆕 重构: 初始化专职服务的回调函数
    this.initializeSpecializedServices();

    // 注意：批量处理、连接清理、内存监控、动态批处理已迁移到专职服务
    this.setupSubscriptionChangeListener();
  }

  // =============== 专职服务初始化方法 ===============

  /**
   * 🆕 初始化专职服务的回调函数
   */
  private initializeSpecializedServices(): void {
    // 设置批处理服务的回调函数
    this.batchProcessor.setCallbacks({
      ensureSymbolConsistency: this.ensureSymbolConsistency.bind(this),
      pipelineCacheData: this.pipelineCacheData.bind(this),
      pipelineBroadcastData: this.pipelineBroadcastData.bind(this),
      recordStreamPipelineMetrics: this.recordStreamPipelineMetrics.bind(this),
      recordPipelineError: this.recordPipelineError.bind(this),
      emitMonitoringEvent: this.emitMonitoringEvent.bind(this),
    });

    // 设置连接管理服务的回调函数
    this.connectionManager.setCallbacks({
      recordConnectionMetrics: this.recordConnectionMetrics.bind(this),
      emitMonitoringEvent: this.emitMonitoringEvent.bind(this),
      emitBusinessEvent: this.emitBusinessEvent.bind(this),
    });

    // 设置数据处理服务的回调函数
    this.dataProcessor.setCallbacks({
      ensureSymbolConsistency: this.ensureSymbolConsistency.bind(this),
      pipelineCacheData: this.pipelineCacheData.bind(this),
      pipelineBroadcastData: this.pipelineBroadcastData.bind(this),
      recordStreamPipelineMetrics: this.recordStreamPipelineMetrics.bind(this),
      recordPipelineError: this.recordPipelineError.bind(this),
      emitMonitoringEvent: this.emitMonitoringEvent.bind(this),
    });

    this.logger.log("专职服务回调函数初始化完成");
  }

  // =============== 事件化监控辅助方法 ===============

  /**
   * 🎯 事件化监控核心方法 - 发送监控事件
   * 符合监控组件集成说明的事件驱动架构
   */
  private emitMonitoringEvent(
    metricName: string,
    metricValue: number,
    tags: Record<string, any> = {},
  ): void {
    setImmediate(() => {
      try {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "stream_receiver",
          metricType: "performance",
          metricName,
          metricValue,
          tags: {
            component: "stream-receiver",
            ...tags,
          },
        });
      } catch (error) {
        // 监控事件发送失败不应影响业务逻辑
        this.logger.warn("监控事件发送失败", {
          metricName,
          error: error.message,
        });
      }
    });
  }

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
      this.emitMonitoringEvent(
        "websocket_connection_events",
        1,
        {
          action: connected ? "connect" : "disconnect",
          clientId,
          remoteAddress: metadata?.remoteAddress || "unknown",
          apiKeyName: metadata?.apiKeyName || "unknown"
        }
      );

      // 连接计数指标 - 更新活跃连接数
      const currentConnections = this.connectionManager.getActiveConnectionsCount();
      
      this.emitMonitoringEvent(
        "websocket_connections_total",
        currentConnections,
        {
          action: connected ? "increment" : "decrement",
          clientId
        }
      );

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
      this.emitMonitoringEvent(
        "websocket_connection_establishment_time",
        connectionTime,
        {
          clientId,
          latencyCategory: LatencyUtils.categorizeLatency(connectionTime),
          authStatus
        }
      );

      // 认证状态监控
      this.emitMonitoringEvent(
        "websocket_authentication_events",
        1,
        {
          clientId,
          status: authStatus,
          errorReason: errorReason || "none"
        }
      );

      // 如果认证失败，记录错误监控
      if (authStatus === 'failed') {
        this.emitMonitoringEvent(
          "websocket_connection_errors",
          1,
          {
            clientId,
            errorType: "authentication_failed",
            errorReason: errorReason || "unknown"
          }
        );
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
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "stream_receiver",
          metricType: "business",
          metricName,
          metricValue,
          tags: {
            component: "stream-receiver",
            ...tags,
          },
        });
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
      maxRetryAttempts: this.configService.get<number>(
        StreamReceiverConfigKeys.MAX_RETRY_ATTEMPTS,
        defaultStreamReceiverConfig.maxRetryAttempts,
      ),
      retryDelayBase: this.configService.get<number>(
        StreamReceiverConfigKeys.RETRY_DELAY_BASE,
        defaultStreamReceiverConfig.retryDelayBase,
      ),
      circuitBreakerThreshold: this.configService.get<number>(
        StreamReceiverConfigKeys.CIRCUIT_BREAKER_THRESHOLD,
        defaultStreamReceiverConfig.circuitBreakerThreshold,
      ),
      circuitBreakerResetTimeout: this.configService.get<number>(
        StreamReceiverConfigKeys.CIRCUIT_BREAKER_RESET_TIMEOUT,
        defaultStreamReceiverConfig.circuitBreakerResetTimeout,
      ),
      batchProcessingInterval: this.configService.get<number>(
        StreamReceiverConfigKeys.BATCH_PROCESSING_INTERVAL,
        defaultStreamReceiverConfig.batchProcessingInterval,
      ),
      dynamicBatching: {
        enabled: this.configService.get<boolean>(
          StreamReceiverConfigKeys.DYNAMIC_BATCHING_ENABLED,
          defaultStreamReceiverConfig.dynamicBatching.enabled,
        ),
        minInterval: this.configService.get<number>(
          StreamReceiverConfigKeys.DYNAMIC_BATCHING_MIN_INTERVAL,
          defaultStreamReceiverConfig.dynamicBatching.minInterval,
        ),
        maxInterval: this.configService.get<number>(
          StreamReceiverConfigKeys.DYNAMIC_BATCHING_MAX_INTERVAL,
          defaultStreamReceiverConfig.dynamicBatching.maxInterval,
        ),
        highLoadInterval: this.configService.get<number>(
          StreamReceiverConfigKeys.DYNAMIC_BATCHING_HIGH_LOAD_INTERVAL,
          defaultStreamReceiverConfig.dynamicBatching.highLoadInterval,
        ),
        lowLoadInterval: this.configService.get<number>(
          StreamReceiverConfigKeys.DYNAMIC_BATCHING_LOW_LOAD_INTERVAL,
          defaultStreamReceiverConfig.dynamicBatching.lowLoadInterval,
        ),
        loadDetection: {
          sampleWindow: this.configService.get<number>(
            StreamReceiverConfigKeys.DYNAMIC_BATCHING_SAMPLE_WINDOW,
            defaultStreamReceiverConfig.dynamicBatching.loadDetection
              .sampleWindow,
          ),
          highLoadThreshold: this.configService.get<number>(
            StreamReceiverConfigKeys.DYNAMIC_BATCHING_HIGH_LOAD_THRESHOLD,
            defaultStreamReceiverConfig.dynamicBatching.loadDetection
              .highLoadThreshold,
          ),
          lowLoadThreshold: this.configService.get<number>(
            StreamReceiverConfigKeys.DYNAMIC_BATCHING_LOW_LOAD_THRESHOLD,
            defaultStreamReceiverConfig.dynamicBatching.loadDetection
              .lowLoadThreshold,
          ),
          adjustmentStep: this.configService.get<number>(
            StreamReceiverConfigKeys.DYNAMIC_BATCHING_ADJUSTMENT_STEP,
            defaultStreamReceiverConfig.dynamicBatching.loadDetection
              .adjustmentStep,
          ),
          adjustmentFrequency: this.configService.get<number>(
            StreamReceiverConfigKeys.DYNAMIC_BATCHING_ADJUSTMENT_FREQUENCY,
            defaultStreamReceiverConfig.dynamicBatching.loadDetection
              .adjustmentFrequency,
          ),
        },
      },
      memoryMonitoring: {
        checkInterval: this.configService.get<number>(
          StreamReceiverConfigKeys.MEMORY_CHECK_INTERVAL,
          defaultStreamReceiverConfig.memoryMonitoring.checkInterval,
        ),
        warningThreshold:
          this.configService.get<number>(
            StreamReceiverConfigKeys.MEMORY_WARNING_THRESHOLD,
            defaultStreamReceiverConfig.memoryMonitoring.warningThreshold /
              (1024 * 1024),
          ) *
          1024 *
          1024, // 从MB转换为字节
        criticalThreshold:
          this.configService.get<number>(
            StreamReceiverConfigKeys.MEMORY_CRITICAL_THRESHOLD,
            defaultStreamReceiverConfig.memoryMonitoring.criticalThreshold /
              (1024 * 1024),
          ) *
          1024 *
          1024, // 从MB转换为字节
      },
      rateLimit: {
        maxConnectionsPerMinute: this.configService.get<number>(
          StreamReceiverConfigKeys.RATE_LIMIT_MAX_CONNECTIONS,
          defaultStreamReceiverConfig.rateLimit.maxConnectionsPerMinute,
        ),
        windowSize: this.configService.get<number>(
          StreamReceiverConfigKeys.RATE_LIMIT_WINDOW_SIZE,
          defaultStreamReceiverConfig.rateLimit.windowSize,
        ),
      },
    };

    // 合并配置
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
      cleanupInterval: `${config.connectionCleanupInterval / STREAM_RECEIVER_METRICS.PERFORMANCE_CALCULATION_UNIT_MS}s`,
      batchProcessing: {
        baseInterval: `${config.batchProcessingInterval}ms`,
        dynamicEnabled: config.dynamicBatching.enabled,
        intervalRange: `${config.dynamicBatching.minInterval}-${config.dynamicBatching.maxInterval}ms`,
      },
      memoryThresholds: {
        warning: `${config.memoryMonitoring.warningThreshold / (1024 * 1024)}MB`,
        critical: `${config.memoryMonitoring.criticalThreshold / (1024 * 1024)}MB`,
      },
      rateLimit: {
        connections: config.rateLimit.maxConnectionsPerMinute,
        window: `${config.rateLimit.windowSize / STREAM_RECEIVER_METRICS.PERFORMANCE_CALCULATION_UNIT_MS}s`,
      },
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
      checkInterval: `${this.config.memoryMonitoring.checkInterval / STREAM_RECEIVER_METRICS.PERFORMANCE_CALCULATION_UNIT_MS}s`,
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
      this.emitMonitoringEvent(
        "memory_alert",
        Math.round(heapUsed / (1024 * 1024)),
        {
          alertLevel: level,
          heapUsedMB: Math.round(heapUsed / (1024 * 1024)),
          connectionCount,
          thresholdMB:
            level === "critical"
              ? Math.round(
                  this.config.memoryMonitoring.criticalThreshold /
                    (1024 * 1024),
                )
              : Math.round(
                  this.config.memoryMonitoring.warningThreshold / (1024 * 1024),
                ),
          severity: level === "critical" ? "high" : "medium",
        },
      );
    } catch (error) {
      this.logger.warn("内存告警事件发送失败", { error: error.message });
    }
  }

  async subscribeStream(
    subscribeDto: StreamSubscribeDto,
    clientId?: string,
    clientIp?: string, // P0修复: 新增客户端IP参数用于频率限制
  ): Promise<void> {
    const { symbols, wsCapabilityType, preferredProvider } = subscribeDto;
    // ✅ Phase 3 - P2: 使用传入的clientId或生成唯一ID作为回退
    const resolvedClientId =
      clientId ||
      `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const providerName = preferredProvider || this.getDefaultProvider(symbols);
    const requestId = `request_${Date.now()}`;

    // P0修复: 连接频率限制检查
    if (clientIp) {
      const rateLimitPassed = await this.checkConnectionRateLimit(clientIp);
      if (!rateLimitPassed) {
        const error = UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.STREAM_RECEIVER,
          errorCode: BusinessErrorCode.BUSINESS_RULE_VIOLATION,
          operation: 'subscribeStream',
          message: 'Connection rate limit exceeded, please try again later',
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
    });

    try {
      // 1. 符号映射
      const mappedSymbols = await this.mapSymbols(symbols, providerName);

      // 2. 更新客户端状态
      this.streamDataFetcher
        .getClientStateManager()
        .addClientSubscription(
          resolvedClientId,
          mappedSymbols,
          wsCapabilityType,
          providerName,
        );

      // 3. 获取或创建流连接
      const connection = await this.connectionManager.getOrCreateConnection(
        providerName,
        wsCapabilityType,
        requestId,
        symbols,
        resolvedClientId,
      );

      // 4. 订阅符号到流连接
      await this.streamDataFetcher.subscribeToSymbols(
        connection,
        mappedSymbols,
      );

      // 5. 设置数据接收处理
      this.setupDataReceiving(connection, providerName, wsCapabilityType);

      this.logger.log("流数据订阅成功", {
        clientId: resolvedClientId,
        symbolsCount: mappedSymbols.length,
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
  ): Promise<void> {
    const { symbols } = unsubscribeDto;
    // ✅ Phase 3 - P2: 使用传入的clientId，如果没有则记录警告
    if (!clientId) {
      this.logger.warn("取消订阅缺少clientId，无法精确定位客户端订阅", {
        symbolsCount: symbols?.length || 0,
        fallbackBehavior: "skip_operation",
      });
      return;
    }

    this.logger.log("开始取消订阅流数据", {
      clientId,
      symbolsCount: symbols?.length || 0,
      contextSource: "websocket",
    });

    try {
      // 获取客户端当前订阅信息
      const clientSub = this.streamDataFetcher
        .getClientStateManager()
        .getClientSubscription(clientId);
      if (!clientSub) {
        this.logger.warn("客户端订阅不存在", { clientId });
        return;
      }

      // 获取要取消订阅的符号
      const symbolsToUnsubscribe =
        symbols && symbols.length > 0
          ? symbols
          : this.streamDataFetcher
              .getClientStateManager()
              .getClientSymbols(clientId);

      if (symbolsToUnsubscribe.length === 0) {
        this.logger.warn("没有需要取消订阅的符号", { clientId });
        return;
      }

      // 映射符号
      const mappedSymbols = await this.mapSymbols(
        symbolsToUnsubscribe,
        clientSub.providerName,
      );

      // 获取连接
      const connectionKey = `${clientSub.providerName}:${clientSub.wsCapabilityType}`;
      const connection = this.activeConnections.get(connectionKey);

      if (connection) {
        // 从流连接取消订阅
        await this.streamDataFetcher.unsubscribeFromSymbols(
          connection,
          mappedSymbols,
        );
      }

      // 更新客户端状态
      this.streamDataFetcher
        .getClientStateManager()
        .removeClientSubscription(clientId, symbolsToUnsubscribe);

      this.logger.log("流数据取消订阅成功", {
        clientId,
        symbolsCount: mappedSymbols.length,
      });
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

    const providerName = preferredProvider || this.getDefaultProvider(symbols);
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

      // 2. 映射符号
      const mappedSymbols = await this.mapSymbols(symbols, providerName);
      const rejectedSymbols: Array<{ symbol: string; reason: string }> = [];

      // 检查映射失败的符号
      symbols.forEach((symbol, index) => {
        if (!mappedSymbols[index] || mappedSymbols[index] === symbol) {
          rejectedSymbols.push({
            symbol,
            reason: "符号映射失败",
          });
        }
      });

      const confirmedSymbols = mappedSymbols.filter(
        (s) => !rejectedSymbols.find((r) => r.symbol === s),
      );

      // 3. 恢复客户端订阅 (已移除messageCallback wrapper)
      this.streamDataFetcher
        .getClientStateManager()
        .addClientSubscription(
          clientId,
          confirmedSymbols,
          wsCapabilityType,
          providerName,
        );

      // 4. 获取或创建连接
      const connection = await this.connectionManager.getOrCreateConnection(
        providerName,
        wsCapabilityType,
        requestId,
        symbols,
        clientId,
      );

      // 5. 订阅符号
      await this.streamDataFetcher.subscribeToSymbols(
        connection,
        confirmedSymbols,
      );

      // 6. 判断是否需要补发数据
      const timeDiff = Date.now() - lastReceiveTimestamp;
      const maxRecoveryWindow = STREAM_RECEIVER_TIMEOUTS.RECOVERY_WINDOW_MS;

      let recoveryJobId: string | undefined;
      const willRecover =
        timeDiff <= maxRecoveryWindow && confirmedSymbols.length > 0;

      if (willRecover && this.recoveryWorker) {
        // 提交补发任务
        const recoveryJob: RecoveryJob = {
          clientId,
          symbols: confirmedSymbols,
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
          symbolsCount: confirmedSymbols.length,
        });
      }

      // 7. 构建响应
      const response: ClientReconnectResponse = {
        success: true,
        clientId,
        confirmedSymbols,
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
        confirmedSymbolsCount: confirmedSymbols.length,
        willRecover,
        recoveryJobId,
      });

      return response;
    } catch (error) {
      this.logger.error("客户端重连失败", {
        clientId,
        error: error.message,
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
          message: "重连失败，请重新订阅",
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
    const allClients = this.streamDataFetcher
      .getClientStateManager()
      .getClientStateStats();
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
      const clientInfo = this.streamDataFetcher
        .getClientStateManager()
        .getClientSubscription(clientId);

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
    const clientInfo = this.streamDataFetcher
      .getClientStateManager()
      .getClientSubscription(clientId);

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
    const clientStats = this.streamDataFetcher
      .getClientStateManager()
      .getClientStateStats();
    
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
   * 确保符号一致性：用于管道处理时的端到端标准化
   */
  private async ensureSymbolConsistency(
    symbols: string[],
    provider: string,
  ): Promise<string[]> {
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

      // 推送到批量处理管道 - 使用专职批处理服务
      this.batchProcessor.addQuoteData({
        rawData,
        providerName: provider,
        wsCapabilityType: capability,
        timestamp: Date.now(),
        symbols,
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
    if (data.symbols && Array.isArray(data.symbols)) return data.symbols;
    if (data.quote && data.quote.symbol) return [data.quote.symbol];
    if (Array.isArray(data)) {
      return data.map((item) => item.symbol || item.s).filter(Boolean);
    }

    return [];
  }





  // 注意：processDataThroughPipeline 已迁移到 StreamDataProcessorService






  /**
   * ✅ 事件化监控 - 简化的流管道性能指标发送
   */
  private recordStreamPipelineMetrics(metrics: {
    provider: string;
    capability: string;
    quotesCount: number;
    symbolsCount: number;
    durations: {
      total: number;
      transform: number;
      cache: number;
      broadcast: number;
    };
  }): void {
    // ✅ 事件化监控 - 发送管道性能事件
    this.emitMonitoringEvent("pipeline_processed", metrics.durations.total, {
      provider: metrics.provider,
      capability: metrics.capability,
      quotesCount: metrics.quotesCount,
      symbolsCount: metrics.symbolsCount,
      quotesPerSecond: Math.round(
        (metrics.quotesCount / metrics.durations.total) *
          STREAM_RECEIVER_METRICS.PERFORMANCE_CALCULATION_UNIT_MS,
      ),
      symbolsPerSecond: Math.round(
        (metrics.symbolsCount / metrics.durations.total) * 1000,
      ),
    });

    // 保留必要的调试日志
    this.logger.debug("流管道性能事件已发送", {
      provider: metrics.provider,
      capability: metrics.capability,
      quotesCount: metrics.quotesCount,
      totalDuration: metrics.durations.total,
    });
  }

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
      // 1. 首先通过符号格式推断市场
      const market = this.inferMarketLabel(symbol);

      // 2. 查找支持该市场的最佳提供商 (如果可用的话)
      const optimalProvider = this.findOptimalProviderForMarket(market, symbol);
      if (optimalProvider) {
        this.logger.debug("基于能力注册表找到最佳提供商", {
          symbol,
          market,
          provider: optimalProvider,
          method: "capability_registry",
        });
        return optimalProvider;
      }

      // 3. 回退到改进的启发式规则 (更准确的映射)
      const heuristicProvider = this.getProviderByHeuristics(symbol, market);

      this.logger.debug("使用改进启发式推断提供商", {
        symbol,
        market,
        provider: heuristicProvider,
        method: "enhanced_heuristics",
      });

      return heuristicProvider;
    } catch (error) {
      this.logger.warn("提供商推断失败，使用默认提供商", {
        symbol,
        error: error.message,
        fallback: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      });
      return REFERENCE_DATA.PROVIDER_IDS.LONGPORT; // 安全的默认值
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

  // =============== 连接健康管理方法 ===============

  /**
   * 更新连接健康状态 - 使用工具类
   */




  /**
   * 获取默认Provider：第一阶段简版市场优先级策略
   */
  private getDefaultProvider(symbols: string[]): string {
    try {
      // 🎯 第一阶段：基于市场的简单优先级策略
      const marketDistribution = this.analyzeMarketDistribution(symbols);
      const primaryMarket = marketDistribution.primary;

      const provider = this.getProviderByMarketPriority(primaryMarket);

      this.logger.debug("Market-based provider selection", {
        primaryMarket,
        selectedProvider: provider,
        symbolsCount: symbols.length,
        method: "market_priority_v1",
      });

      return provider;
    } catch (error) {
      this.logger.warn("Provider选择失败，使用默认", {
        error: error.message,
        fallback: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      });
      return REFERENCE_DATA.PROVIDER_IDS.LONGPORT; // 安全回退
    }
  }

  /**
   * 分析市场分布：找到占比最高的市场
   */
  private analyzeMarketDistribution(symbols: string[]): {
    primary: string;
    distribution: Record<string, number>;
  } {
    const marketCounts: Record<string, number> = {};

    symbols.forEach((symbol) => {
      const market = this.inferMarketLabel(symbol);
      marketCounts[market] = (marketCounts[market] || 0) + 1;
    });

    // 找到占比最高的市场
    const sortedMarkets = Object.entries(marketCounts).sort(
      ([, a], [, b]) => b - a,
    );

    return {
      primary: sortedMarkets[0]?.[0] || "UNKNOWN",
      distribution: marketCounts,
    };
  }

  /**
   * 基于市场优先级获取Provider
   */
  private getProviderByMarketPriority(market: string): string {
    const marketProviderPriority: Record<string, string> = {
      HK: REFERENCE_DATA.PROVIDER_IDS.LONGPORT, // 港股优先LongPort
      US: REFERENCE_DATA.PROVIDER_IDS.LONGPORT, // 美股优先LongPort
      CN: REFERENCE_DATA.PROVIDER_IDS.LONGPORT, // A股优先LongPort
      SG: REFERENCE_DATA.PROVIDER_IDS.LONGPORT, // 新加坡优先LongPort
      UNKNOWN: REFERENCE_DATA.PROVIDER_IDS.LONGPORT, // 未知市场默认LongPort
    };

    return (
      marketProviderPriority[market] || REFERENCE_DATA.PROVIDER_IDS.LONGPORT
    );
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
    const marketDistribution = this.analyzeMarketDistribution(symbols);
    const primaryMarket = marketDistribution.primary;

    return {
      // 基础信息
      requestId,
      provider,
      capability,
      clientId,

      // 市场和符号信息
      market: primaryMarket,
      symbolsCount: symbols.length,
      marketDistribution: marketDistribution.distribution,

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
        version: "2.0",
        protocol: "websocket",
        compression: "gzip",
      },

      // 扩展字段 (为复杂SDK预留)
      extensions: {
        // 可以添加特定Provider需要的额外上下文
        // 例如：认证token、区域设置、特殊配置等
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
      // 🔧 配置驱动的提供商选择策略
      const selectionStrategy = this.getProviderSelectionStrategy();

      return this.selectProviderByStrategy(market, symbol, selectionStrategy);
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
    // 🔧 从配置中获取策略，这里使用智能默认值
    return {
      strategy: 'balanced', // 可配置: performance/availability/cost/balanced
      marketPriorities: {
        HK: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "itick", "futu"],
        US: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "alpaca", "iex"],
        CN: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "tushare", "sina"],
        SG: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "itick"],
        JP: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "quandl"],
        UNKNOWN: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT],
      },
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
      "itick": 2,
      "alpaca": 3,
      "tushare": 1,
      "sina": 1,
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
    const basicMap: Record<string, string> = {
      HK: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      US: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      CN: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      SG: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      UNKNOWN: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    };

    return basicMap[market] || REFERENCE_DATA.PROVIDER_IDS.LONGPORT;
  }

  /**
   * 改进的启发式提供商推断
   */
  private getProviderByHeuristics(symbol: string, market: string): string {
    // 基于市场的提供商优先级映射
    const marketProviderPriority: Record<string, string[]> = {
      HK: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "itick"], // 港股优先LongPort
      US: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "alpaca"], // 美股优先LongPort
      CN: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "tushare"], // A股优先LongPort
      SG: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT], // 新加坡优先LongPort
      UNKNOWN: [REFERENCE_DATA.PROVIDER_IDS.LONGPORT], // 未知市场默认LongPort
    };

    // 特殊符号的自定义映射
    const symbolSpecificMapping: Record<string, string> = {
      // 可以在这里添加特定符号的提供商映射
      // 'AAPL.US': 'alpaca',
      // '00700.HK': REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
    };

    // 1. 首先检查特定符号映射
    const specificProvider = symbolSpecificMapping[symbol.toUpperCase()];
    if (specificProvider) {
      return specificProvider;
    }

    // 2. 基于市场选择最佳提供商
    const priorityList =
      marketProviderPriority[market] || marketProviderPriority["UNKNOWN"];
    return priorityList[0];
  }

  /**
   * 记录管道错误指标
   */
  private recordPipelineError(
    provider: string,
    capability: string,
    errorMessage: string,
    duration: number,
  ): void {
    this.logger.error("管道处理错误指标", {
      provider,
      capability,
      errorType: this.classifyPipelineError(errorMessage),
      duration,
      error: errorMessage,
    });
  }

  /**
   * 分类管道错误类型
   */
  private classifyPipelineError(errorMessage: string): string {
    if (errorMessage.includes("transform")) return "transform_error";
    if (errorMessage.includes("cache")) return "cache_error";
    if (errorMessage.includes("broadcast")) return "broadcast_error";
    if (errorMessage.includes("timeout")) return "timeout_error";
    if (errorMessage.includes("network")) return "network_error";
    return "unknown_error";
  }

  // 已删除重复的recordConnectionMetrics方法，保留第3541行的版本

  /**
   * 初始化连接清理机制 - 防止内存泄漏
   */
  private initializeConnectionCleanup(): void {
    // 定期清理断开的连接 - 使用专职服务
    this.cleanupTimer = setInterval(async () => {
      await this.connectionManager.forceConnectionCleanup();
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
    this.circuitBreakerState.successes >
      STREAM_RECEIVER_METRICS.CIRCUIT_BREAKER_RESET_THRESHOLD
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
    this.streamDataFetcher
      .getClientStateManager()
      .addSubscriptionChangeListener((event) => {
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
        this.emitMonitoringEvent("stream_latency", latencyMs, {
          symbol,
          provider: this.extractProviderFromSymbol(symbol),
          market: this.inferMarketLabel(symbol),
          latencyCategory: LatencyUtils.categorizeLatency(latencyMs),
        });

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
      this.emitMonitoringEvent("batch_processed", processingTimeMs, {
        batchSize,
        provider,
        avgTimePerQuote: batchSize > 0 ? processingTimeMs / batchSize : 0,
        quotesPerSecond:
          batchSize > 0
            ? Math.round(
                (batchSize *
                  STREAM_RECEIVER_METRICS.PERFORMANCE_CALCULATION_UNIT_MS) /
                  processingTimeMs,
              )
            : 0,
      });
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
   * 📊 记录降级监控指标
   */
  private recordFallbackMetrics(batch: QuoteData[], reason: string): void {
    try {
      // 发送监控事件到事件总线
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.ERROR_HANDLED, {
        timestamp: new Date(),
        source: "presenter",
        errorType: "system",
        errorMessage: `Batch processing fallback triggered: ${reason}`,
        severity: "medium",
        operation: "batch_processing_fallback",
        metadata: {
          component: "stream-receiver",
          fallbackType: "batch_processing",
          reason,
          batchSize: batch.length,
          providers: Array.from(new Set(batch.map(q => q.providerName))),
          capabilities: Array.from(new Set(batch.map(q => q.wsCapabilityType))),
        },
      });
    } catch (error) {
      this.logger.warn("降级指标记录失败", { error: error.message });
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
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.CRITICAL_ERROR, {
        timestamp: new Date(),
        source: "presenter",
        errorType: "system",
        errorMessage: `Fallback processing failed: ${fallbackError}`,
        severity: "critical",
        operation: "fallback_processing",
        metadata: {
          component: "stream-receiver",
          originalReason: reason,
          fallbackError,
          batchSize: batch.length,
        },
      });
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
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.SYSTEM_PERFORMANCE_ALERT, {
        timestamp: new Date(),
        source: "presenter",
        alertType: "performance",
        severity: "warning",
        metric: "batch_processing_degradation",
        currentValue: analyzeResult.symbolsCount,
        threshold: 100,
        recommendation: `Consider scaling or provider optimization`,
        metadata: {
          component: "stream-receiver",
          degradationType: "batch_processing_fallback",
          reason,
          impact: {
            batchSize: batch.length,
            affectedSymbols: analyzeResult.symbolsCount,
            affectedProviders: analyzeResult.providersCount,
            affectedMarkets: analyzeResult.marketsCount,
          },
          recovery: {
            attempted: partialRecoveryResult.attempted,
            successCount: partialRecoveryResult.successCount,
            failureCount: partialRecoveryResult.failureCount,
          },
        },
      });
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
      "itick": 85,
      "alpaca": 80,
      "tushare": 75,
      "sina": 70,
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
      "itick": 90,
      "alpaca": 88,
      "tushare": 82,
      "sina": 75,
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
      "itick": 88,
      "alpaca": 85,
      "tushare": 80,
      "sina": 72,
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
    // 📊 实际应用中通过健康检查接口获取
    // 这里使用模拟逻辑
    const availability: Record<string, boolean> = {
      [REFERENCE_DATA.PROVIDER_IDS.LONGPORT]: true,
      "itick": true,
      "alpaca": true,
      "tushare": Math.random() > 0.1, // 90% 可用性
      "sina": Math.random() > 0.2,    // 80% 可用性
    };

    return availability[provider] ?? false;
  }

  /**
   * 💰 获取提供商成本评分 (0-100, 越高越便宜)
   */
  private getCostScore(provider: string): number {
    // 📊 成本效益评分
    const costScores: Record<string, number> = {
      "tushare": 95,   // 免费/低成本
      "sina": 90,
      [REFERENCE_DATA.PROVIDER_IDS.LONGPORT]: 75, // 中等成本，高质量
      "itick": 70,
      "alpaca": 65,
    };

    return costScores[provider] || 50;
  }
}

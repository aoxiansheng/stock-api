import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from "@nestjs/common";
import { Queue, Worker, Job, QueueEvents, JobsOptions } from "bullmq";
import { AsyncLocalStorage } from "async_hooks";
import { Server } from "socket.io";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createLogger } from "@common/logging/index";

import { StreamCacheStandardizedService } from "../../../05-caching/module/stream-cache/services/stream-cache-standardized.service";
import { StreamDataPoint } from "../../../05-caching/module/stream-cache/interfaces/stream-cache.interface";
import { StreamClientStateManager } from "./stream-client-state-manager.service";
import { StreamDataFetcherService } from "./stream-data-fetcher.service";
import {
  StreamRecoveryConfigService,
  StreamRecoveryConfig,
} from "../config/stream-recovery.config";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
import {
  ProviderRegistryService,
  normalizeProviderName,
  type HistoryExecutionContextResolution,
} from "@providersv2/provider-registry.service";
import {
  WebSocketServerProvider,
  WEBSOCKET_SERVER_TOKEN,
} from "../providers/websocket-server.provider";
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";
import { UniversalRetryHandler } from "@common/core/exceptions";
import { STREAM_DATA_FETCHER_ERROR_CODES } from "../constants/stream-data-fetcher-error-codes.constants";

/**
 * StreamRecoveryWorkerService - Phase 3 Worker线程池实现
 *
 * 职责边界：
 * - 使用 BullMQ 管理Worker线程池，隔离CPU密集型补发任务
 * - 实现优先级调度和QPS限流
 * - 处理客户端重连和数据补发
 * - 维护AsyncLocalStorage上下文隔离
 *
 * 不负责：
 * - 实时流数据处理（由StreamReceiver负责）
 * - 连接管理（由StreamDataFetcher负责）
 * - 缓存管理（由StreamCacheStandardizedService负责）
 */

export interface RecoveryJob {
  clientId: string;
  symbols: string[];
  lastReceiveTimestamp: number;
  provider: string;
  capability: string;
  priority: "high" | "normal" | "low";
  retryCount?: number;
  maxRetries?: number;
}

export interface RecoveryResult {
  clientId: string;
  recoveredDataPoints: number;
  symbols: string[];
  timeRange: {
    from: number;
    to: number;
  };
  success: boolean;
  error?: string;
  degraded?: boolean;
  retryable?: boolean;
  reasonCode?: string;
}

export interface RecoveryMetrics {
  totalJobs: number;
  pendingJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageRecoveryTime: number;
  qps: number;
}

export interface ClientRecoveryStatus {
  recoveryActive: boolean;
  pendingJobs: number;
  lastRecoveryTime: number | null;
  lastJobId: string | null;
}

interface ClientRecoveryStatusInternal extends ClientRecoveryStatus {
  activeJobs: number;
  updatedAt: number;
}

type RecoveryDataSource = "cache" | "history" | "mixed";

interface RecoveryDataMetadata {
  source: RecoveryDataSource;
  cachePoints: number;
  historyPoints: number;
}

interface RecoveryHistoryFallbackConfig {
  enabled: boolean;
  gapThresholdMs: number;
  minCoverageRatio: number;
  maxHistoryPoints: number;
  preferredProvider: string;
  klineType: number;
  crossProviderFailoverEnabled: boolean;
  crossProviderAllowlist: string[];
}

interface HistoryFallbackAttemptResult {
  points: StreamDataPoint[];
  exhausted: boolean;
  retryable: boolean;
  reasonCode: string;
}

interface HistoryFallbackFailure {
  symbol: string;
  reasonCode: string;
  retryable: boolean;
}

interface HistoryFallbackErrorClassification {
  reasonCode: string;
  retryable: boolean;
}

interface MergedRecoveryDataResult {
  points: StreamDataPoint[];
  cachePoints: number;
  historyPoints: number;
}

interface SingleSymbolRecoveryResult {
  mergedData: MergedRecoveryDataResult;
  historyFallbackFailure: HistoryFallbackFailure | null;
  degradedReasonCode: string | null;
}

const ONE_MINUTE_MS = 60 * 1000;
const SUPPORTED_HISTORY_KLINE_TYPES = new Set([1, 5, 15, 30, 60]);
const RETRYABLE_HISTORY_FALLBACK_REASONS = new Set([
  "history_rate_limit_exceeded",
  "history_query_timeout",
  "history_query_unavailable",
  "history_query_temporary_failure",
]);
const DEFAULT_RECOVERY_HISTORY_FALLBACK: RecoveryHistoryFallbackConfig = {
  enabled: true,
  gapThresholdMs: 90 * 1000,
  minCoverageRatio: 0.6,
  maxHistoryPoints: 240,
  preferredProvider: "",
  klineType: 1,
  crossProviderFailoverEnabled: false,
  crossProviderAllowlist: [],
};

@Injectable()
export class StreamRecoveryWorkerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = createLogger(this.constructor.name);

  // BullMQ队列和Worker
  private recoveryQueue: Queue<RecoveryJob>;
  private recoveryWorker: Worker<RecoveryJob, RecoveryResult>;
  private queueEvents: QueueEvents;

  // AsyncLocalStorage for context isolation
  private readonly asyncLocalStorage = new AsyncLocalStorage<{
    jobId: string;
    clientId: string;
    requestId: string;
  }>();

  // QPS限流
  private readonly rateLimiter = new Map<
    string,
    {
      tokens: number;
      lastRefill: number;
    }
  >();

  // 客户端维度的补发状态（内存态，MVP 可接受重启丢失）
  private readonly clientRecoveryStatus = new Map<
    string,
    ClientRecoveryStatusInternal
  >();
  private readonly clientStatusIdleTtlMs = 10 * 60 * 1000;
  private readonly clientStatusCleanupIntervalMs = 60 * 1000;
  private lastClientStatusCleanupAt = 0;

  // 配置 - 从配置服务获取
  private config: StreamRecoveryConfig;

  // === ✅ 事件化驱动监控方法 ===

  /**
   * 发送恢复任务相关监控事件
   * @param metricName 指标名称
   * @param data 事件数据
   */
  private emitRecoveryEvent(
    metricName: string,
    data: {
      operation?: string;
      duration?: number;
      count?: number;
      status?: "success" | "error";
      error_type?: string;
      client_id?: string;
      provider?: string;
      job_id?: string;
      data_points?: number;
      batch_size?: number;
      bytes?: number;
      tokens?: number;
      qps?: number;
    },
  ): void {
    setImmediate(() => {
      // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
    });
  }

  /**
   * 发送性能相关监控事件
   * @param metricName 指标名称
   * @param data 事件数据
   */
  private emitPerformanceEvent(
    metricName: string,
    data: {
      operation?: string;
      duration?: number;
      qps?: number;
      rate_limit_hit?: boolean;
      tokens_consumed?: number;
      status?: "success" | "error" | "warning";
    },
  ): void {
    setImmediate(() => {
      // 性能指标事件已移除（监控模块已删除）
      // 如需性能监控，请使用外部工具（如 Prometheus）
    });
  }

  constructor(
    private readonly streamCache: StreamCacheStandardizedService,
    private readonly clientStateManager: StreamClientStateManager,
    private readonly streamDataFetcher: StreamDataFetcherService,
    private readonly configService: StreamRecoveryConfigService,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly eventBus: EventEmitter2,
    @Inject(WEBSOCKET_SERVER_TOKEN)
    private readonly webSocketProvider: WebSocketServerProvider,
  ) {
    this.config = this.configService.getConfig();
  }

  async onModuleInit() {
    await this.initializeQueue();
    await this.initializeWorker();
    await this.initializeEventListener();

    this.logger.log("StreamRecoveryWorker 初始化完成", {
      concurrency: this.config.worker.concurrency,
      queueName: this.config.queue.name,
    });
  }

  async onModuleDestroy() {
    await this.recoveryWorker?.close();
    await this.recoveryQueue?.close();
    await this.queueEvents?.close();

    this.logger.log("StreamRecoveryWorker 已关闭");
  }


  /**
   * 获取WebSocket服务器实例
   */
  getWebSocketServer(): Server | null {
    return this.webSocketProvider.getServer();
  }

  /**
   * 初始化BullMQ队列
   */
  private async initializeQueue() {
    this.recoveryQueue = new Queue<RecoveryJob>(this.config.queue.name, {
      connection: this.config.queue.redis,
      defaultJobOptions: {
        removeOnComplete: this.config.cleanup.removeOnComplete,
        removeOnFail: this.config.cleanup.removeOnFail,
        attempts: this.config.worker.maxRetries,
        backoff: {
          type: "exponential",
          delay: this.config.worker.retryDelay,
        },
      },
    });

    // 环境保护机制 - 仅在开发环境或明确配置时清空队列
    await this.initializeQueueWithProtection();
  }

  /**
   * 队列初始化环境保护机制
   */
  private async initializeQueueWithProtection(): Promise<void> {
    const shouldObliterate =
      process.env.NODE_ENV !== "production" &&
      process.env.RECOVERY_OBLITERATE === "true";

    if (shouldObliterate) {
      this.logger.warn("开发环境：清空恢复队列", {
        environment: process.env.NODE_ENV,
        obliterateEnabled: process.env.RECOVERY_OBLITERATE,
      });
      await this.recoveryQueue.obliterate({ force: true });
    } else {
      const queueLength = await this.recoveryQueue.count();
      this.logger.log("生产环境：保留现有队列任务", {
        environment: process.env.NODE_ENV,
        queueLength,
        obliterateDisabled: true,
      });
    }

    // 队列健康检查
    await this.validateQueueHealth();
  }

  /**
   * 队列健康检查
   */
  private async validateQueueHealth(): Promise<void> {
    try {
      const queueStats = await this.recoveryQueue.getJobCounts();

      this.logger.log("队列健康状态", {
        waiting: queueStats.waiting,
        active: queueStats.active,
        completed: queueStats.completed,
        failed: queueStats.failed,
        delayed: queueStats.delayed,
        paused: queueStats.paused,
      });

      // 如果失败任务过多，记录警告
      if (queueStats.failed > 100) {
        this.logger.warn("队列中失败任务过多", {
          failedJobs: queueStats.failed,
          recommendedAction: "consider_cleanup",
        });
      }
    } catch (error) {
      this.logger.error("队列健康检查失败", {
        error: error.message,
        queueName: this.config.queue.name,
      });
    }
  }

  /**
   * 初始化Worker线程池
   */
  private async initializeWorker() {
    this.recoveryWorker = new Worker<RecoveryJob, RecoveryResult>(
      this.config.queue.name,
      async (job: Job<RecoveryJob>) => {
        // 使用AsyncLocalStorage维护上下文
        return await this.asyncLocalStorage.run(
          {
            jobId: job.id!,
            clientId: job.data.clientId,
            requestId: `recovery_${job.id}_${Date.now()}`,
          },
          async () => {
            return await this.processRecoveryJob(job);
          },
        );
      },
      {
        connection: this.config.queue.redis,
        concurrency: this.config.worker.concurrency,
        limiter: {
          max: this.config.rateLimit.default.maxQPS,
          duration: this.config.rateLimit.default.window,
        },
      },
    );

    // Worker错误处理
    this.recoveryWorker.on("failed", (job, err) => {
      this.logger.error("补发任务失败", {
        jobId: job?.id,
        clientId: job?.data.clientId,
        error: err.message,
      });
      this.emitRecoveryEvent("job_failed", {
        operation: "recovery_job",
        status: "error",
        error_type: "otherErrors",
        client_id: job?.data.clientId,
        job_id: job?.id,
      });
    });

    this.recoveryWorker.on("completed", (job, result) => {
      this.logger.debug("补发任务完成", {
        jobId: job.id,
        clientId: job.data.clientId,
        recoveredPoints: result.recoveredDataPoints,
      });
      // 在 processRecoveryJob 中会调用 metricsService.incrementJobCompleted
    });
  }

  /**
   * 初始化事件监听器
   */
  private async initializeEventListener() {
    this.queueEvents = new QueueEvents(this.config.queue.name, {
      connection: this.config.queue.redis,
    });

    // 监听队列事件用于指标收集
    this.queueEvents.on("completed", () => {
      this.emitPerformanceEvent("qps_recorded", {
        operation: "queue_completion",
        status: "success",
        qps: 1,
      });
    });
  }

  /**
   * 处理补发任务
   */
  private async processRecoveryJob(
    job: Job<RecoveryJob>,
  ): Promise<RecoveryResult> {
    const startTime = Date.now();
    const { clientId, symbols, lastReceiveTimestamp, provider } = job.data;
    const currentTime = Date.now();
    const fallbackConfig = this.getHistoryFallbackConfig();

    this.markRecoveryStarted(clientId, job.id);

    try {
      const recoveredData: StreamDataPoint[] = [];
      let cachePoints = 0;
      let historyPoints = 0;
      let historyFallbackFailure: HistoryFallbackFailure | null = null;
      let degradedReasonCode: string | null = null;

      for (const symbol of symbols) {
        const symbolRecoveryResult = await this.processSingleSymbolRecovery({
          jobId: job.id,
          clientId,
          provider,
          symbol,
          lastReceiveTimestamp,
          currentTime,
          fallbackConfig,
        });

        if (symbolRecoveryResult.historyFallbackFailure) {
          historyFallbackFailure = symbolRecoveryResult.historyFallbackFailure;
          break;
        }
        if (!degradedReasonCode && symbolRecoveryResult.degradedReasonCode) {
          degradedReasonCode = symbolRecoveryResult.degradedReasonCode;
        }

        cachePoints += symbolRecoveryResult.mergedData.cachePoints;
        historyPoints += symbolRecoveryResult.mergedData.historyPoints;
        recoveredData.push(...symbolRecoveryResult.mergedData.points);
      }

      if (historyFallbackFailure) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.STREAM_DATA_FETCHER,
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          operation: "processRecoveryJob",
          message: "历史兜底耗尽，补发任务进入可重试失败状态",
          context: {
            clientId,
            provider: this.normalizeProviderName(provider),
            symbol: historyFallbackFailure.symbol,
            reasonCode: historyFallbackFailure.reasonCode,
            customErrorCode:
              STREAM_DATA_FETCHER_ERROR_CODES.PROVIDER_CONNECTION_FAILED,
          },
          retryable: historyFallbackFailure.retryable,
        });
      }

      const finalRecoveredData = this.sortRecoveryData(recoveredData);
      return this.finalizeRecoveryJobSuccess({
        startTime,
        clientId,
        symbols,
        lastReceiveTimestamp,
        currentTime,
        finalRecoveredData,
        cachePoints,
        historyPoints,
        degradedReasonCode,
      });
    } catch (error) {
      return this.finalizeRecoveryJobFailure({
        error,
        job,
        clientId,
        symbols,
        lastReceiveTimestamp,
      });
    } finally {
      this.markRecoveryFinished(clientId, job.id);
    }
  }

  private async processSingleSymbolRecovery(params: {
    jobId: string | number | undefined;
    clientId: string;
    provider: string;
    symbol: string;
    lastReceiveTimestamp: number;
    currentTime: number;
    fallbackConfig: RecoveryHistoryFallbackConfig;
  }): Promise<SingleSymbolRecoveryResult> {
    const {
      jobId,
      clientId,
      provider,
      symbol,
      lastReceiveTimestamp,
      currentTime,
      fallbackConfig,
    } = params;
    const emptyMergedData: MergedRecoveryDataResult = {
      points: [],
      cachePoints: 0,
      historyPoints: 0,
    };
    const cacheDataPoints = await this.streamCache.getDataSince(
      symbol,
      lastReceiveTimestamp,
    );
    const normalizedCacheData = this.normalizeStreamDataPoints(
      cacheDataPoints || [],
      symbol,
      lastReceiveTimestamp,
      currentTime,
    );

    let normalizedHistoryData: StreamDataPoint[] = [];
    let degradedReasonCode: string | null = null;

    if (
      this.shouldTriggerHistoryFallback(
        normalizedCacheData,
        lastReceiveTimestamp,
        currentTime,
        fallbackConfig,
      )
    ) {
      const historyFallbackResult = await this.fetchHistoryFallbackPoints({
        provider,
        symbol,
        lastReceiveTimestamp,
        currentTime,
        fallbackConfig,
      });
      normalizedHistoryData = historyFallbackResult.points;

      if (historyFallbackResult.exhausted) {
        if (historyFallbackResult.retryable) {
          return {
            mergedData: emptyMergedData,
            historyFallbackFailure: {
              symbol,
              reasonCode: historyFallbackResult.reasonCode,
              retryable: historyFallbackResult.retryable,
            },
            degradedReasonCode: null,
          };
        }
        degradedReasonCode = historyFallbackResult.reasonCode;
        this.logger.warn("历史兜底耗尽，降级为仅发送可用缓存数据", {
          jobId,
          clientId,
          symbol,
          provider: this.normalizeProviderName(provider),
          reasonCode: historyFallbackResult.reasonCode,
        });
      }
    }

    const mergedData = this.mergeRecoveryData(
      normalizedCacheData,
      normalizedHistoryData,
    );
    return {
      mergedData,
      historyFallbackFailure: null,
      degradedReasonCode,
    };
  }

  private async finalizeRecoveryJobSuccess(params: {
    startTime: number;
    clientId: string;
    symbols: string[];
    lastReceiveTimestamp: number;
    currentTime: number;
    finalRecoveredData: StreamDataPoint[];
    cachePoints: number;
    historyPoints: number;
    degradedReasonCode: string | null;
  }): Promise<RecoveryResult> {
    const {
      startTime,
      clientId,
      symbols,
      lastReceiveTimestamp,
      currentTime,
      finalRecoveredData,
      cachePoints,
      historyPoints,
      degradedReasonCode,
    } = params;
    const metadata = this.buildRecoveryDataMetadata(cachePoints, historyPoints);

    if (finalRecoveredData.length > 0) {
      await this.sendRecoveryDataToClient(clientId, finalRecoveredData, metadata);
    }

    const recoveryTime = Date.now() - startTime;
    const degraded = degradedReasonCode !== null;
    if (degraded) {
      this.emitRecoveryEvent("job_degraded", {
        operation: "recovery_job",
        duration: recoveryTime,
        data_points: finalRecoveredData.length,
        status: "error",
        error_type: degradedReasonCode || "recovery_degraded",
        client_id: clientId,
      });
    } else {
      this.emitRecoveryEvent("job_completed", {
        operation: "recovery_job",
        duration: recoveryTime,
        data_points: finalRecoveredData.length,
        status: "success",
        client_id: clientId,
      });
    }

    if (degraded && finalRecoveredData.length === 0) {
      await this.handleRecoveryFailure(clientId, symbols);
    }

    return {
      clientId,
      recoveredDataPoints: finalRecoveredData.length,
      symbols,
      timeRange: {
        from: lastReceiveTimestamp,
        to: currentTime,
      },
      success: true,
      degraded,
      retryable: degradedReasonCode ? false : undefined,
      reasonCode: degradedReasonCode || undefined,
    };
  }

  private async finalizeRecoveryJobFailure(params: {
    error: unknown;
    job: Job<RecoveryJob>;
    clientId: string;
    symbols: string[];
    lastReceiveTimestamp: number;
  }): Promise<RecoveryResult> {
    const { error, job, clientId, symbols, lastReceiveTimestamp } = params;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const reasonCode =
      typeof (error as any)?.context?.reasonCode === "string" &&
      (error as any).context.reasonCode.trim().length > 0
        ? (error as any).context.reasonCode
        : "recovery_job_failed";
    const retryable = Boolean((error as any)?.retryable);
    const isBullWorkerJob = typeof (job as any)?.moveToFailed === "function";
    const isFinalAttempt =
      Number.isFinite(job.attemptsMade) &&
      job.attemptsMade + 1 >= this.config.worker.maxRetries;

    this.logger.error("补发任务处理失败", {
      jobId: job.id,
      clientId,
      error: errorMessage,
      reasonCode,
      retryable,
      retryCount: job.attemptsMade,
    });

    if (retryable && isBullWorkerJob && !isFinalAttempt) {
      throw error;
    }

    if (isFinalAttempt) {
      await this.handleRecoveryFailure(clientId, symbols);
    }

    return {
      clientId,
      recoveredDataPoints: 0,
      symbols,
      timeRange: {
        from: lastReceiveTimestamp,
        to: Date.now(),
      },
      success: false,
      error: errorMessage,
      retryable,
      reasonCode,
    };
  }

  /**
   * QPS限流检查
   */
  private checkRateLimit(provider: string): boolean {
    const normalizedProvider = this.normalizeProviderName(provider) || "default";
    const now = Date.now();
    let limiter = this.rateLimiter.get(normalizedProvider);

    const rateLimitConfig = this.configService.getRateLimitConfig(normalizedProvider);

    if (!limiter) {
      limiter = {
        tokens: rateLimitConfig.burstSize,
        lastRefill: now,
      };
      this.rateLimiter.set(normalizedProvider, limiter);
    }

    // Token bucket算法
    const timePassed = now - limiter.lastRefill;
    const tokensToAdd =
      (timePassed / rateLimitConfig.window) * rateLimitConfig.maxQPS;

    limiter.tokens = Math.min(
      rateLimitConfig.burstSize,
      limiter.tokens + tokensToAdd,
    );
    limiter.lastRefill = now;

    if (limiter.tokens >= 1) {
      limiter.tokens--;
      this.emitPerformanceEvent("rate_limit_passed", {
        operation: "rate_limit_check",
        status: "success",
        rate_limit_hit: false,
        tokens_consumed: 1,
      });
      return true;
    }

    this.emitPerformanceEvent("rate_limit_hit", {
      operation: "rate_limit_check",
      status: "warning",
      rate_limit_hit: true,
    });
    return false;
  }

  /**
   * 向客户端发送补发数据
   */
  private async sendRecoveryDataToClient(
    clientId: string,
    data: StreamDataPoint[],
    metadata: RecoveryDataMetadata = this.buildRecoveryDataMetadata(data.length, 0),
  ): Promise<void> {
    try {
      await UniversalRetryHandler.networkRetry(
        async () => {
          // Phase 3 Critical Fix: 使用强类型WebSocket提供者
          if (!this.webSocketProvider.isServerAvailable()) {
            this.logger.error("WebSocket server is not available, cannot send recovery data", {
              clientId,
              serverStats: this.webSocketProvider.getServerStats(),
            });
            this.emitRecoveryEvent("error_occurred", {
              operation: "send_recovery_data",
              status: "error",
              error_type: "networkErrors",
              client_id: clientId,
            });
            throw UniversalExceptionFactory.createBusinessException({
              component: ComponentIdentifier.STREAM_DATA_FETCHER,
              errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
              operation: 'sendRecoveryDataToClient',
              message: 'WebSocket server is not available',
              context: {
                clientId,
                serverStats: this.webSocketProvider.getServerStats()
              }
            });
          }

          const webSocketServer = this.webSocketProvider.getServer()!;

          // 获取客户端Socket连接
          const clientSocket = webSocketServer.sockets.sockets.get(clientId);
          if (!clientSocket) {
            this.logger.warn("Client socket connection not found, cannot send recovery data", {
              clientId,
            });
            this.emitRecoveryEvent("error_occurred", {
              operation: "send_recovery_data",
              status: "error",
              error_type: "networkErrors",
              client_id: clientId,
            });
            throw UniversalExceptionFactory.createBusinessException({
              component: ComponentIdentifier.STREAM_DATA_FETCHER,
              errorCode: BusinessErrorCode.DATA_NOT_FOUND,
              operation: 'sendRecoveryDataToClient',
              message: 'Client socket connection not found',
              context: { clientId }
            });
          }

          // 验证客户端连接状态
          if (!clientSocket.connected) {
            this.logger.warn("Client socket is disconnected, skipping recovery data sending", { clientId });
            this.emitRecoveryEvent("error_occurred", {
              operation: "send_recovery_data",
              status: "error",
              error_type: "connectionErrors",
              client_id: clientId,
            });
            throw UniversalExceptionFactory.createBusinessException({
              component: ComponentIdentifier.STREAM_DATA_FETCHER,
              errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
              operation: 'sendRecoveryDataToClient',
              message: 'Client socket is disconnected',
              context: { clientId }
            });
          }

          // 按时间戳排序
          const sortedData = data.sort((a, b) => a.t - b.t);

          // 批量发送，避免一次性发送过多数据
          const batchSize = this.config.recovery.batchSize;
          const totalBatches = Math.ceil(sortedData.length / batchSize);

          for (let i = 0; i < sortedData.length; i += batchSize) {
            const batch = sortedData.slice(i, i + batchSize);
            const batchIndex = Math.floor(i / batchSize) + 1;
            const isLastBatch = i + batchSize >= sortedData.length;

            // Phase 3 Critical Fix: 发送recovery专用消息类型到WebSocket客户端
            const recoveryMessage = {
              type: "recovery",
              data: batch,
              metadata: {
                recoveryBatch: batchIndex,
                totalBatches,
                timestamp: Date.now(),
                isLastBatch,
                clientId, // 添加clientId便于客户端校验
                dataPointsCount: batch.length,
                source: metadata.source,
                cachePoints: metadata.cachePoints,
                historyPoints: metadata.historyPoints,
              },
            };

            // 使用WebSocket服务器直接发送消息
            clientSocket.emit("recovery-data", recoveryMessage);

            // 记录批量发送指标
            const batchBytes = JSON.stringify(recoveryMessage).length;
            this.emitRecoveryEvent("batch_sent", {
              operation: "send_batch",
              status: "success",
              data_points: batch.length,
              bytes: batchBytes,
              client_id: clientId,
            });

            this.logger.debug("Recovery data batch sent successfully", {
              clientId,
              batchIndex,
              totalBatches,
              dataPointsCount: batch.length,
              batchBytes,
              isLastBatch,
            });
          }

          return true;
        },
        'sendRecoveryDataToClient',
        ComponentIdentifier.STREAM_DATA_FETCHER
      );
    } catch (error) {
      this.logger.error("Failed to send recovery data", {
        clientId,
        dataPointsCount: data.length,
        error: error.message,
      });
      
      this.emitRecoveryEvent("error_occurred", {
        operation: "send_recovery_data",
        status: "error",
        error_type: "sendErrors",
        client_id: clientId
      });
    }
  }

  private getHistoryFallbackConfig(): RecoveryHistoryFallbackConfig {
    const fallbackConfig: Partial<RecoveryHistoryFallbackConfig> =
      this.config?.recovery?.historyFallback || {};

    return {
      enabled:
        typeof fallbackConfig.enabled === "boolean"
          ? fallbackConfig.enabled
          : DEFAULT_RECOVERY_HISTORY_FALLBACK.enabled,
      gapThresholdMs:
        typeof fallbackConfig.gapThresholdMs === "number" &&
        Number.isFinite(fallbackConfig.gapThresholdMs) &&
        fallbackConfig.gapThresholdMs > 0
          ? fallbackConfig.gapThresholdMs
          : DEFAULT_RECOVERY_HISTORY_FALLBACK.gapThresholdMs,
      minCoverageRatio:
        typeof fallbackConfig.minCoverageRatio === "number" &&
        Number.isFinite(fallbackConfig.minCoverageRatio) &&
        fallbackConfig.minCoverageRatio >= 0 &&
        fallbackConfig.minCoverageRatio <= 1
          ? fallbackConfig.minCoverageRatio
          : DEFAULT_RECOVERY_HISTORY_FALLBACK.minCoverageRatio,
      maxHistoryPoints:
        typeof fallbackConfig.maxHistoryPoints === "number" &&
        Number.isFinite(fallbackConfig.maxHistoryPoints) &&
        fallbackConfig.maxHistoryPoints > 0
          ? Math.floor(fallbackConfig.maxHistoryPoints)
          : DEFAULT_RECOVERY_HISTORY_FALLBACK.maxHistoryPoints,
      preferredProvider:
        typeof fallbackConfig.preferredProvider === "string" &&
        fallbackConfig.preferredProvider.trim().length > 0
          ? fallbackConfig.preferredProvider.trim()
          : DEFAULT_RECOVERY_HISTORY_FALLBACK.preferredProvider,
      klineType: this.normalizeHistoryKlineType(fallbackConfig.klineType),
      crossProviderFailoverEnabled:
        typeof fallbackConfig.crossProviderFailoverEnabled === "boolean"
          ? fallbackConfig.crossProviderFailoverEnabled
          : DEFAULT_RECOVERY_HISTORY_FALLBACK.crossProviderFailoverEnabled,
      crossProviderAllowlist: Array.isArray(fallbackConfig.crossProviderAllowlist)
        ? Array.from(
            new Set(
              fallbackConfig.crossProviderAllowlist
                .map((item) => this.normalizeProviderName(item))
                .filter((item) => item.length > 0),
            ),
          )
        : [...DEFAULT_RECOVERY_HISTORY_FALLBACK.crossProviderAllowlist],
    };
  }

  private normalizeProviderName(provider: unknown): string {
    return normalizeProviderName(String(provider || ""));
  }

  private normalizeRecoverySymbol(symbol: unknown): string {
    return String(symbol || "")
      .trim()
      .toUpperCase();
  }

  private normalizeHistoryKlineType(klineType: unknown): number {
    const normalizedKlineType = Math.trunc(Number(klineType));
    if (SUPPORTED_HISTORY_KLINE_TYPES.has(normalizedKlineType)) {
      return normalizedKlineType;
    }
    return DEFAULT_RECOVERY_HISTORY_FALLBACK.klineType;
  }

  private buildHistoryFallbackProviders(
    primaryProvider: string,
    fallbackConfig: RecoveryHistoryFallbackConfig,
  ): string[] {
    const normalizedPrimary = this.normalizeProviderName(primaryProvider);
    const normalizedPreferred = this.normalizeProviderName(
      fallbackConfig.preferredProvider,
    );
    const resolvedPrimary = normalizedPrimary || normalizedPreferred;

    if (!resolvedPrimary) {
      return [];
    }

    const candidates = [resolvedPrimary];
    if (!fallbackConfig.crossProviderFailoverEnabled) {
      return candidates;
    }

    const allowlistedProviders: string[] = [];
    for (const allowlistedProvider of fallbackConfig.crossProviderAllowlist) {
      const normalizedAllowlistedProvider = this.normalizeProviderName(
        allowlistedProvider,
      );
      if (normalizedAllowlistedProvider) {
        allowlistedProviders.push(normalizedAllowlistedProvider);
      }
    }

    const dedupedAllowlistedProviders = Array.from(new Set(allowlistedProviders));
    const preferredInAllowlist =
      normalizedPreferred.length > 0 &&
      dedupedAllowlistedProviders.includes(normalizedPreferred);
    if (preferredInAllowlist && normalizedPreferred !== resolvedPrimary) {
      candidates.unshift(normalizedPreferred);
    }
    for (const allowlistedProvider of dedupedAllowlistedProviders) {
      if (allowlistedProvider !== resolvedPrimary) {
        candidates.push(allowlistedProvider);
      }
    }

    return Array.from(new Set(candidates));
  }

  private getCoverageBucketIntervalMs(klineType: number): number {
    const normalizedKlineType = Math.trunc(Number(klineType));
    if (!Number.isFinite(normalizedKlineType) || normalizedKlineType <= 0) {
      return ONE_MINUTE_MS;
    }

    if (normalizedKlineType > 24 * 60) {
      return ONE_MINUTE_MS;
    }

    return normalizedKlineType * ONE_MINUTE_MS;
  }

  private shouldTriggerHistoryFallback(
    cacheData: StreamDataPoint[],
    lastReceiveTimestamp: number,
    currentTime: number,
    fallbackConfig: RecoveryHistoryFallbackConfig,
  ): boolean {
    if (
      !Number.isFinite(lastReceiveTimestamp) ||
      !Number.isFinite(currentTime) ||
      currentTime <= lastReceiveTimestamp
    ) {
      return false;
    }

    if (!fallbackConfig.enabled) {
      return false;
    }

    if (!cacheData || cacheData.length === 0) {
      return true;
    }

    const sorted = this.sortRecoveryData(cacheData);
    const firstCacheTimestamp = sorted[0]?.t;
    if (
      Number.isFinite(firstCacheTimestamp) &&
      firstCacheTimestamp - lastReceiveTimestamp > fallbackConfig.gapThresholdMs
    ) {
      return true;
    }

    const lastCacheTimestamp = sorted[sorted.length - 1]?.t;
    if (
      Number.isFinite(lastCacheTimestamp) &&
      currentTime - lastCacheTimestamp > fallbackConfig.gapThresholdMs
    ) {
      return true;
    }

    const bucketIntervalMs = this.getCoverageBucketIntervalMs(
      fallbackConfig.klineType,
    );
    const expectedPoints = this.calculateExpectedPoints(
      lastReceiveTimestamp,
      currentTime,
      bucketIntervalMs,
    );
    const coveredBuckets = new Set(
      sorted.map((point) => Math.floor(point.t / bucketIntervalMs)),
    ).size;
    const coverageRatio =
      expectedPoints <= 0
        ? 1
        : Math.min(1, coveredBuckets / expectedPoints);

    return coverageRatio < fallbackConfig.minCoverageRatio;
  }

  private calculateExpectedPoints(
    windowStart: number,
    windowEnd: number,
    bucketIntervalMs = ONE_MINUTE_MS,
  ): number {
    if (
      !Number.isFinite(windowStart) ||
      !Number.isFinite(windowEnd) ||
      windowEnd <= windowStart
    ) {
      return 1;
    }

    const duration = windowEnd - windowStart;
    const safeBucketIntervalMs =
      Number.isFinite(bucketIntervalMs) && bucketIntervalMs > 0
        ? bucketIntervalMs
        : ONE_MINUTE_MS;
    return Math.max(1, Math.floor(duration / safeBucketIntervalMs) + 1);
  }

  private calculateHistoryPoints(
    windowStart: number,
    windowEnd: number,
    klineType: number,
    maxHistoryPoints: number,
  ): number {
    const expectedPoints = this.calculateExpectedPoints(
      windowStart,
      windowEnd,
      this.getCoverageBucketIntervalMs(klineType),
    );
    return Math.max(1, Math.min(expectedPoints, maxHistoryPoints));
  }

  private async fetchHistoryFallbackPoints(params: {
    provider: string;
    symbol: string;
    lastReceiveTimestamp: number;
    currentTime: number;
    fallbackConfig: RecoveryHistoryFallbackConfig;
  }): Promise<HistoryFallbackAttemptResult> {
    const {
      provider,
      symbol,
      lastReceiveTimestamp,
      currentTime,
      fallbackConfig,
    } = params;
    const candidateProviders = this.buildHistoryFallbackProviders(
      provider,
      fallbackConfig,
    );
    let lastReasonCode = "history_fallback_exhausted";
    let retryableReasonCode: string | null = null;

    if (candidateProviders.length === 0) {
      const reasonCode = "history_provider_missing";
      return {
        points: [],
        exhausted: true,
        retryable: this.isRetryableHistoryFallbackReason(reasonCode),
        reasonCode,
      };
    }

    for (const candidateProvider of candidateProviders) {
      try {
        const capabilityName = CAPABILITY_NAMES.GET_STOCK_HISTORY;
        const executionContext = await this.resolveHistoryExecutionContext(
          candidateProvider,
          capabilityName,
        );
        if (
          !executionContext.capability ||
          !executionContext.contextService
        ) {
          lastReasonCode = executionContext.reasonCode;
          this.logger.warn("历史兜底能力或上下文缺失，跳过 Provider", {
            symbol,
            provider: candidateProvider,
            reasonCode: executionContext.reasonCode,
            hasCapability: Boolean(executionContext.capability),
            hasContextService: Boolean(executionContext.contextService),
          });
          continue;
        }

        if (!this.checkRateLimit(candidateProvider)) {
          lastReasonCode = "history_rate_limit_exceeded";
          retryableReasonCode = "history_rate_limit_exceeded";
          this.logger.warn("历史兜底查询触发限流，跳过 Provider", {
            symbol,
            provider: candidateProvider,
            reasonCode: "history_rate_limit_exceeded",
          });
          continue;
        }

        const historyResponse = await executionContext.capability.execute({
          symbols: [symbol],
          klineType: fallbackConfig.klineType,
          klineNum: this.calculateHistoryPoints(
            lastReceiveTimestamp,
            currentTime,
            fallbackConfig.klineType,
            fallbackConfig.maxHistoryPoints,
          ),
          timestamp: currentTime,
          preferredProvider: candidateProvider,
          options: {
            preferredProvider: candidateProvider,
            klineType: fallbackConfig.klineType,
          },
          contextService: executionContext.contextService,
        });

        const historyPointsLimit = Math.max(1, fallbackConfig.maxHistoryPoints);
        const historyRows = Array.isArray(historyResponse?.quote_data)
          ? historyResponse.quote_data
          : [];
        const truncatedHistoryRows =
          historyRows.length > historyPointsLimit
            ? historyRows.slice(historyRows.length - historyPointsLimit)
            : historyRows;
        if (truncatedHistoryRows.length !== historyRows.length) {
          this.logger.warn("历史兜底数据超出上限，已执行本地截断", {
            symbol,
            provider: candidateProvider,
            configuredLimit: historyPointsLimit,
            originalRows: historyRows.length,
            truncatedRows: truncatedHistoryRows.length,
          });
        }
        const mappedPoints = this.mapHistoryRowsToStreamDataPoints(
          symbol,
          truncatedHistoryRows,
          lastReceiveTimestamp,
          currentTime,
        );
        if (mappedPoints.length === 0) {
          lastReasonCode = "history_mapping_empty";
          this.logger.warn("历史兜底映射为空，尝试下一个 Provider", {
            symbol,
            provider: candidateProvider,
            reasonCode: "history_mapping_empty",
            rawRowsCount: truncatedHistoryRows.length,
          });
          continue;
        }
        return {
          points: mappedPoints,
          exhausted: false,
          retryable: false,
          reasonCode: "success",
        };
      } catch (error) {
        const classifiedError = this.classifyHistoryFallbackError(error);
        lastReasonCode = classifiedError.reasonCode;
        if (classifiedError.retryable) {
          retryableReasonCode = classifiedError.reasonCode;
        }
        this.logger.warn("历史兜底查询失败，尝试下一个 Provider", {
          symbol,
          provider: candidateProvider,
          reasonCode: classifiedError.reasonCode,
          retryable: classifiedError.retryable,
          error: error?.message || String(error),
        });
      }
    }

    return {
      points: [],
      exhausted: true,
      retryable:
        retryableReasonCode !== null ||
        this.isRetryableHistoryFallbackReason(lastReasonCode),
      reasonCode: retryableReasonCode || lastReasonCode,
    };
  }

  private isRetryableHistoryFallbackReason(reasonCode: string): boolean {
    return RETRYABLE_HISTORY_FALLBACK_REASONS.has(reasonCode);
  }

  private classifyHistoryFallbackError(
    error: unknown,
  ): HistoryFallbackErrorClassification {
    const contextReasonCode =
      typeof (error as any)?.context?.reasonCode === "string" &&
      (error as any).context.reasonCode.trim().length > 0
        ? (error as any).context.reasonCode.trim()
        : "";
    const explicitRetryable =
      typeof (error as any)?.retryable === "boolean"
        ? Boolean((error as any).retryable)
        : null;

    if (contextReasonCode) {
      if (explicitRetryable !== null) {
        return {
          reasonCode: contextReasonCode,
          retryable: explicitRetryable,
        };
      }
      return {
        reasonCode: contextReasonCode,
        retryable: this.isRetryableHistoryFallbackReason(contextReasonCode),
      };
    }

    const errorMessage =
      error instanceof Error
        ? error.message.toLowerCase()
        : String(error || "").toLowerCase();
    const errorCode = String((error as any)?.code || "")
      .trim()
      .toLowerCase();
    const errorName = String((error as any)?.name || "")
      .trim()
      .toLowerCase();
    const statusCode = this.resolveErrorStatusCode(error);

    const isRateLimited =
      statusCode === 429 ||
      errorCode === "429" ||
      errorCode.includes("ratelimit") ||
      errorCode.includes("throttle") ||
      errorMessage.includes("429") ||
      errorMessage.includes("rate limit") ||
      errorMessage.includes("too many requests") ||
      errorMessage.includes("throttle");
    if (isRateLimited) {
      return {
        reasonCode: "history_rate_limit_exceeded",
        retryable: true,
      };
    }

    const isTimeout =
      statusCode === 408 ||
      errorCode.includes("timeout") ||
      errorCode.includes("timedout") ||
      errorName.includes("timeout") ||
      errorMessage.includes("timeout") ||
      errorMessage.includes("timed out");
    if (isTimeout) {
      return {
        reasonCode: "history_query_timeout",
        retryable: true,
      };
    }

    const isTemporaryUnavailable =
      statusCode === 502 ||
      statusCode === 503 ||
      statusCode === 504 ||
      errorCode === "econnrefused" ||
      errorCode === "econnreset" ||
      errorCode === "enotfound" ||
      errorCode === "enetunreach" ||
      errorCode === "eai_again" ||
      errorMessage.includes("service unavailable") ||
      errorMessage.includes("temporarily unavailable") ||
      errorMessage.includes("connection reset");
    if (isTemporaryUnavailable) {
      return {
        reasonCode: "history_query_unavailable",
        retryable: true,
      };
    }

    const isRetryableConflict = statusCode === 409 || statusCode === 425;
    if (isRetryableConflict) {
      return {
        reasonCode: "history_query_temporary_failure",
        retryable: true,
      };
    }

    const isContractError =
      (Number.isFinite(statusCode) && statusCode! >= 400 && statusCode! < 500) ||
      errorName.includes("validation") ||
      errorName.includes("typeerror") ||
      errorName.includes("syntaxerror") ||
      errorMessage.includes("invalid") ||
      errorMessage.includes("validation") ||
      errorMessage.includes("schema") ||
      errorMessage.includes("contract") ||
      errorMessage.includes("malformed") ||
      errorMessage.includes("required");
    if (isContractError) {
      return {
        reasonCode: "history_query_contract_invalid",
        retryable: false,
      };
    }

    if (explicitRetryable !== null) {
      return {
        reasonCode: explicitRetryable
          ? "history_query_temporary_failure"
          : "history_query_failed",
        retryable: explicitRetryable,
      };
    }

    return {
      reasonCode: "history_query_failed",
      retryable: false,
    };
  }

  private resolveErrorStatusCode(error: unknown): number | null {
    const directStatusCode = Number(
      (error as any)?.statusCode ?? (error as any)?.status,
    );
    if (Number.isFinite(directStatusCode)) {
      return directStatusCode;
    }

    if (typeof (error as any)?.getStatus === "function") {
      const statusCode = Number((error as any).getStatus());
      if (Number.isFinite(statusCode)) {
        return statusCode;
      }
    }

    return null;
  }

  private async resolveHistoryExecutionContext(
    providerName: string,
    capabilityName: string,
  ): Promise<HistoryExecutionContextResolution> {
    return Promise.resolve(
      this.providerRegistry.resolveHistoryExecutionContext(
        providerName,
        capabilityName,
      ),
    );
  }

  private mapHistoryRowsToStreamDataPoints(
    fallbackSymbol: string,
    rows: any[],
    windowStart: number,
    windowEnd: number,
  ): StreamDataPoint[] {
    const points: StreamDataPoint[] = [];
    const requestedSymbol = this.normalizeRecoverySymbol(fallbackSymbol);

    for (const row of rows || []) {
      const timestamp = this.normalizeTimestampMs(row?.timestamp);
      if (!Number.isFinite(timestamp)) {
        continue;
      }
      if (timestamp < windowStart || timestamp > windowEnd) {
        continue;
      }

      const price = this.toFiniteNumber(row?.lastPrice ?? row?.price ?? row?.p);
      if (!Number.isFinite(price)) {
        continue;
      }

      const rowSymbol = this.normalizeRecoverySymbol(row?.symbol);
      if (rowSymbol && requestedSymbol && rowSymbol !== requestedSymbol) {
        this.logger.warn("历史兜底数据 symbol 不一致，已丢弃", {
          requestedSymbol,
          rowSymbol,
          timestamp,
        });
        continue;
      }
      const symbol = rowSymbol || requestedSymbol;
      if (!symbol) {
        continue;
      }

      const volume = this.toFiniteNumber(row?.volume ?? row?.v) ?? 0;
      const change = this.toFiniteNumber(row?.change ?? row?.c);
      const changePercent = this.toFiniteNumber(row?.changePercent ?? row?.cp);

      const point: StreamDataPoint = {
        s: symbol,
        p: price,
        v: volume,
        t: timestamp,
      };
      if (change !== null) {
        point.c = change;
      }
      if (changePercent !== null) {
        point.cp = changePercent;
      }
      points.push(point);
    }

    return this.sortRecoveryData(points);
  }

  private normalizeStreamDataPoints(
    data: StreamDataPoint[],
    fallbackSymbol: string,
    windowStart: number,
    windowEnd: number,
  ): StreamDataPoint[] {
    const points: StreamDataPoint[] = [];

    for (const item of data || []) {
      const timestamp = this.normalizeTimestampMs((item as any)?.t);
      const price = this.toFiniteNumber((item as any)?.p);
      if (!Number.isFinite(timestamp) || !Number.isFinite(price)) {
        continue;
      }
      if (timestamp < windowStart || timestamp > windowEnd) {
        continue;
      }

      const symbol = this.normalizeRecoverySymbol(
        (item as any)?.s || fallbackSymbol,
      );
      if (!symbol) {
        continue;
      }

      const point: StreamDataPoint = {
        s: symbol,
        p: price,
        v: this.toFiniteNumber((item as any)?.v) ?? 0,
        t: timestamp,
      };
      const change = this.toFiniteNumber((item as any)?.c);
      const changePercent = this.toFiniteNumber((item as any)?.cp);
      if (change !== null) {
        point.c = change;
      }
      if (changePercent !== null) {
        point.cp = changePercent;
      }
      points.push(point);
    }

    return this.sortRecoveryData(points);
  }

  private mergeRecoveryData(
    cachePoints: StreamDataPoint[],
    historyPoints: StreamDataPoint[],
  ): MergedRecoveryDataResult {
    const mergedByTimestamp = new Map<
      string,
      { point: StreamDataPoint; source: "cache" | "history" }
    >();

    for (const point of historyPoints) {
      mergedByTimestamp.set(this.buildRecoveryBucketKey(point), {
        point,
        source: "history",
      });
    }
    // 缓存数据优先，覆盖同毫秒历史点，保留同分钟内不同时间点
    for (const point of cachePoints) {
      mergedByTimestamp.set(this.buildRecoveryBucketKey(point), {
        point,
        source: "cache",
      });
    }

    const mergedValues = Array.from(mergedByTimestamp.values());
    let mergedCachePoints = 0;
    let mergedHistoryPoints = 0;

    for (const entry of mergedValues) {
      if (entry.source === "cache") {
        mergedCachePoints += 1;
        continue;
      }
      mergedHistoryPoints += 1;
    }

    return {
      points: this.sortRecoveryData(mergedValues.map((entry) => entry.point)),
      cachePoints: mergedCachePoints,
      historyPoints: mergedHistoryPoints,
    };
  }

  private buildRecoveryBucketKey(point: StreamDataPoint): string {
    return `${point.s}|${Math.trunc(point.t)}`;
  }

  private sortRecoveryData(points: StreamDataPoint[]): StreamDataPoint[] {
    return [...(points || [])].sort((a, b) => a.t - b.t);
  }

  private buildRecoveryDataMetadata(
    cachePoints: number,
    historyPoints: number,
  ): RecoveryDataMetadata {
    if (cachePoints > 0 && historyPoints > 0) {
      return { source: "mixed", cachePoints, historyPoints };
    }
    if (historyPoints > 0) {
      return { source: "history", cachePoints, historyPoints };
    }
    return { source: "cache", cachePoints, historyPoints };
  }

  private normalizeTimestampMs(rawTimestamp: unknown): number | null {
    if (typeof rawTimestamp === "number" && Number.isFinite(rawTimestamp)) {
      const rounded = Math.trunc(rawTimestamp);
      const digitCount = Math.abs(rounded).toString().length;
      if (digitCount === 10) {
        return rounded * 1000;
      }
      if (digitCount === 13) {
        return rounded;
      }
      return null;
    }

    if (typeof rawTimestamp === "string") {
      const value = rawTimestamp.trim();
      if (!value) {
        return null;
      }

      if (/^\d+$/.test(value)) {
        return this.normalizeTimestampMs(Number(value));
      }

      const parsed = Date.parse(value);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private toFiniteNumber(rawValue: unknown): number | null {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return null;
    }
    const value = Number(rawValue);
    return Number.isFinite(value) ? value : null;
  }

  /**
   * 处理补发失败的降级策略
   */
  private async handleRecoveryFailure(
    clientId: string,
    symbols: string[],
  ): Promise<void> {
    this.logger.warn("Recovery failed, executing fallback strategy", { clientId, symbols });

    try {
      // Phase 3 Critical Fix: 使用强类型WebSocket提供者
      if (!this.webSocketProvider.isServerAvailable()) {
        this.logger.error("WebSocket server is not available, cannot send fallback notification", {
          clientId,
          serverStats: this.webSocketProvider.getServerStats(),
        });
        return;
      }

      const webSocketServer = this.webSocketProvider.getServer()!;

      // 获取客户端Socket连接
      const clientSocket = webSocketServer.sockets.sockets.get(clientId);
      if (!clientSocket) {
        this.logger.warn("Client socket connection not found, cannot send fallback notification", {
          clientId,
        });
        return;
      }

      // 验证客户端连接状态
      if (!clientSocket.connected) {
        this.logger.warn("Client socket is disconnected, skipping fallback notification", { clientId });
        return;
      }

      // 发送降级通知
      const fallbackMessage = {
        type: "recovery_failed",
        message: "Recovery data transmission failed",
        timestamp: Date.now(),
        metadata: {
          symbols,
          clientId,
          suggestion: "Please reconnect or request data through regular API",
        },
      };

      // 使用WebSocket服务器直接发送消息
      clientSocket.emit("recovery-error", fallbackMessage);

      this.logger.log("Recovery failure fallback notification sent", {
        clientId,
        symbolCount: symbols.length,
      });
    } catch (error) {
      this.logger.error("Failed to send fallback notification", {
        clientId,
        error: error.message,
      });

      try {
        // 尝试发送简单错误通知
        const simpleErrorMessage = {
          type: "error",
          message: "Recovery failed",
          timestamp: Date.now(),
        };
        const webSocketServer = this.webSocketProvider.getServer();
        webSocketServer?.sockets.sockets
          .get(clientId)
          ?.emit("error", simpleErrorMessage);
      } catch (notificationError) {
        this.logger.error("Failed to send simple error notification", {
          clientId,
          error: notificationError.message,
        });
      }
    }
  }

  /**
   * 更新QPS指标
   */
  // updateQPSMetrics 方法已移除，由 metricsService.recordQPS() 替代

  // ========== 公开API ==========

  /**
   * 提交补发任务
   */
  async submitRecoveryJob(job: RecoveryJob): Promise<string> {
    // 验证lastReceiveTimestamp
    if (
      !job.lastReceiveTimestamp ||
      job.lastReceiveTimestamp < Date.now() - 86400000
    ) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Invalid lastReceiveTimestamp - timestamp is missing or too old (exceeds 24 hours)",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'submitRecoveryJob',
        component: ComponentIdentifier.STREAM_DATA_FETCHER,
        context: {
          lastReceiveTimestamp: job.lastReceiveTimestamp,
          maxAgeMs: 86400000,
          timeDifference: job.lastReceiveTimestamp ? Date.now() - job.lastReceiveTimestamp : 'missing_timestamp',
          clientId: job.clientId,
          customErrorCode: STREAM_DATA_FETCHER_ERROR_CODES.INVALID_TIMESTAMP_FORMAT,
          reason: 'recovery_job_timestamp_validation_failed'
        },
        retryable: false
      });
    }

    const jobOptions: JobsOptions = {
      priority: this.configService.getPriorityWeight(job.priority || "normal"),
      delay: job.retryCount
        ? this.config.worker.retryDelay * job.retryCount
        : 0,
    };

    const queueJob = await this.recoveryQueue.add(
      `recovery_${job.clientId}`,
      job,
      jobOptions,
    );

    this.emitRecoveryEvent("job_submitted", {
      operation: "submit_job",
      status: "success",
      client_id: job.clientId,
      count: job.symbols.length,
    });

    this.logger.log("补发任务已提交", {
      jobId: queueJob.id,
      clientId: job.clientId,
      priority: job.priority,
      symbolCount: job.symbols.length,
    });

    this.markRecoverySubmitted(job.clientId, queueJob.id);

    return queueJob.id!;
  }

  /**
   * 批量提交补发任务
   */
  async submitBatchRecoveryJobs(jobs: RecoveryJob[]): Promise<string[]> {
    const jobIds: string[] = [];

    for (const job of jobs) {
      try {
        // 使用重试机制提交任务
        const jobId = await UniversalRetryHandler.standardRetry(
          async () => await this.submitRecoveryJob(job),
          'submitRecoveryJob',
          ComponentIdentifier.STREAM_DATA_FETCHER
        );
        jobIds.push(jobId);
      } catch (error) {
        this.logger.error("批量提交任务失败", {
          clientId: job.clientId,
          error: error.message,
        });
      }
    }

    return jobIds;
  }

  /**
   * 调度补发任务 - Phase 3 Critical Fix
   * 智能调度逻辑，支持优先级和延迟策略
   */
  async scheduleRecovery(job: RecoveryJob): Promise<string> {
    // 验证任务参数
    if (!job.clientId || !job.symbols || job.symbols.length === 0) {
      throw UniversalExceptionFactory.createBusinessException({
        message: "Invalid recovery job parameters - clientId or symbols missing or empty",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'scheduleRecovery',
        component: ComponentIdentifier.STREAM_DATA_FETCHER,
        context: {
          clientId: job.clientId,
          symbolsCount: job.symbols?.length || 0,
          symbols: job.symbols,
          priority: job.priority,
          customErrorCode: STREAM_DATA_FETCHER_ERROR_CODES.MISSING_SYMBOLS_PARAM,
          reason: 'recovery_job_parameters_validation_failed'
        },
        retryable: false
      });
    }

    // 验证时间窗口
    const timeDiff = Date.now() - job.lastReceiveTimestamp;
    if (timeDiff > 86400000) {
      // 24小时
      throw UniversalExceptionFactory.createBusinessException({
        message: "Recovery window too large, data may be expired - time difference exceeds 24 hours",
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'scheduleRecovery',
        component: ComponentIdentifier.STREAM_DATA_FETCHER,
        context: {
          timeDifferenceMs: timeDiff,
          maxAllowedMs: 86400000,
          lastReceiveTimestamp: job.lastReceiveTimestamp,
          currentTimestamp: Date.now(),
          clientId: job.clientId,
          customErrorCode: STREAM_DATA_FETCHER_ERROR_CODES.RECOVERY_STATE_MISMATCH,
          reason: 'recovery_window_time_validation_failed'
        },
        retryable: false
      });
    }

    // 检查是否已有相同客户端的任务在处理
    const existingJobId = await this.findExistingJob(job.clientId);
    if (existingJobId) {
      this.logger.warn("客户端已有补发任务在处理", {
        clientId: job.clientId,
        existingJobId,
      });
      return existingJobId;
    }

    // 智能优先级调整
    const adjustedPriority = this.adjustPriorityBasedOnConditions(job);
    const adjustedJob = { ...job, priority: adjustedPriority };

    // 计算延迟时间 (避免系统过载)
    const delay = this.calculateScheduleDelay(adjustedJob);

    const jobOptions = {
      priority: this.configService.getPriorityWeight(adjustedPriority),
      delay,
      jobId: `recovery_${job.clientId}_${Date.now()}`, // 使用固定ID避免重复
    };

    try {
      const queueJob = await this.recoveryQueue.add(
        `schedule_recovery_${job.clientId}`,
        adjustedJob,
        jobOptions,
      );

      this.emitRecoveryEvent("job_submitted", {
        operation: "schedule_recovery",
        status: "success",
        client_id: job.clientId,
        count: job.symbols.length,
      });

      this.logger.log("补发任务调度成功", {
        jobId: queueJob.id,
        clientId: job.clientId,
        originalPriority: job.priority,
        adjustedPriority,
        delay,
        symbolCount: job.symbols.length,
      });

      this.markRecoverySubmitted(job.clientId, queueJob.id);

      return queueJob.id!;
    } catch (error) {
      this.logger.error("补发任务调度失败", {
        clientId: job.clientId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 查找现有任务
   */
  private async findExistingJob(clientId: string): Promise<string | null> {
    try {
      // 检查待处理和活跃的任务
      const jobs = await this.recoveryQueue.getJobs([
        "waiting",
        "active",
        "delayed",
      ]);

      const existingJob = jobs.find((job) => job.data?.clientId === clientId);

      return existingJob?.id || null;
    } catch (error) {
      this.logger.error("查找现有任务失败", {
        clientId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * 智能优先级调整
   */
  private adjustPriorityBasedOnConditions(
    job: RecoveryJob,
  ): "high" | "normal" | "low" {
    const timeDiff = Date.now() - job.lastReceiveTimestamp;
    const symbolCount = job.symbols.length;

    // 时间越短，优先级越高
    if (timeDiff < 30000) {
      // 30秒内
      return "high";
    }

    // 符号数量多的任务降低优先级，避免阻塞
    if (symbolCount > 50) {
      return "low";
    }

    // 网络错误的任务提高优先级
    if (job.priority === "high") {
      return "high";
    }

    return "normal";
  }

  /**
   * 计算调度延迟
   */
  private calculateScheduleDelay(job: RecoveryJob): number {
    const baseDelay = 100; // 基础延迟100ms
    const symbolCount = job.symbols.length;

    // 根据符号数量增加延迟，避免大任务冲击系统
    const symbolDelay = Math.min(symbolCount * 10, 1000); // 最多1秒

    // 根据系统负载调整延迟
    const systemLoadDelay = this.getSystemLoadDelay();

    return baseDelay + symbolDelay + systemLoadDelay;
  }

  /**
   * 获取系统负载延迟
   */
  private getSystemLoadDelay(): number {
    // 简化实现：根据队列状态估算系统负载
    // 原来依赖 metricsService.getMetrics()，现在使用队列状态
    const activeJobs = 0; // 简化处理，或者从队列获取实际状态

    // 活跃任务越多，延迟越大
    if (activeJobs > 100) {
      return 2000; // 2秒延迟
    } else if (activeJobs > 50) {
      return 1000; // 1秒延迟
    } else if (activeJobs > 20) {
      return 500; // 0.5秒延迟
    }

    return 0; // 无延迟
  }

  /**
   * 取消补发任务
   */
  async cancelRecoveryJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.recoveryQueue.getJob(jobId);
      if (job) {
        const clientId = job.data?.clientId;
        await job.remove();
        this.logger.log("补发任务已取消", { jobId });

        if (clientId) {
          this.markRecoveryCancelled(clientId, job.id);
        }
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error("取消任务失败", {
        jobId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 获取任务状态
   */
  async getJobStatus(jobId: string): Promise<any> {
    const job = await this.recoveryQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      failedReason: job.failedReason,
      state: await job.getState(),
    };
  }

  /**
   * 获取客户端补发状态（MVP：事件驱动内存态）
   */
  async getClientRecoveryStatus(clientId: string): Promise<ClientRecoveryStatus> {
    this.cleanupStaleClientStatuses();

    const status = this.ensureClientRecoveryStatus(clientId);
    return {
      recoveryActive: status.recoveryActive,
      pendingJobs: status.pendingJobs,
      lastRecoveryTime: status.lastRecoveryTime,
      lastJobId: status.lastJobId,
    };
  }

  private ensureClientRecoveryStatus(
    clientId: string,
  ): ClientRecoveryStatusInternal {
    let status = this.clientRecoveryStatus.get(clientId);
    if (!status) {
      status = {
        recoveryActive: false,
        pendingJobs: 0,
        activeJobs: 0,
        lastRecoveryTime: null,
        lastJobId: null,
        updatedAt: Date.now(),
      };
      this.clientRecoveryStatus.set(clientId, status);
    }
    return status;
  }

  private markRecoverySubmitted(clientId: string, jobId?: string): void {
    this.cleanupStaleClientStatuses();

    const status = this.ensureClientRecoveryStatus(clientId);
    status.pendingJobs += 1;
    status.lastJobId = jobId ? String(jobId) : status.lastJobId;
    status.updatedAt = Date.now();
  }

  private markRecoveryStarted(clientId: string, jobId?: string): void {
    this.cleanupStaleClientStatuses();

    const status = this.ensureClientRecoveryStatus(clientId);
    status.pendingJobs = Math.max(0, status.pendingJobs - 1);
    status.activeJobs += 1;
    status.recoveryActive = true;
    status.lastJobId = jobId ? String(jobId) : status.lastJobId;
    status.updatedAt = Date.now();
  }

  private markRecoveryFinished(clientId: string, jobId?: string): void {
    this.cleanupStaleClientStatuses();

    const status = this.ensureClientRecoveryStatus(clientId);
    status.activeJobs = Math.max(0, status.activeJobs - 1);
    status.recoveryActive = status.activeJobs > 0;
    status.lastRecoveryTime = Date.now();
    status.lastJobId = jobId ? String(jobId) : status.lastJobId;
    status.updatedAt = Date.now();
  }

  private markRecoveryCancelled(clientId: string, jobId?: string): void {
    this.cleanupStaleClientStatuses();

    const status = this.ensureClientRecoveryStatus(clientId);
    status.pendingJobs = Math.max(0, status.pendingJobs - 1);
    status.recoveryActive = status.activeJobs > 0;
    status.lastRecoveryTime = Date.now();
    status.lastJobId = jobId ? String(jobId) : status.lastJobId;
    status.updatedAt = Date.now();
  }

  private cleanupStaleClientStatuses(now = Date.now()): void {
    if (now - this.lastClientStatusCleanupAt < this.clientStatusCleanupIntervalMs) {
      return;
    }

    for (const [clientId, status] of this.clientRecoveryStatus.entries()) {
      const isIdle = status.pendingJobs === 0 && status.activeJobs === 0;
      const isExpired = now - status.updatedAt > this.clientStatusIdleTtlMs;
      if (isIdle && isExpired) {
        this.clientRecoveryStatus.delete(clientId);
      }
    }

    this.lastClientStatusCleanupAt = now;
  }

  /**
   * 获取Worker指标 - 事件化监控版本
   */
  async getMetrics(): Promise<RecoveryMetrics> {
    // 使用队列API获取实际指标，替代自定义监控服务
    try {
      const jobCounts = await this.recoveryQueue.getJobCounts();

      // 发送指标查询事件
      this.emitRecoveryEvent("metrics_requested", {
        operation: "get_metrics",
        status: "success",
      });

      return {
        totalJobs:
          jobCounts.waiting +
          jobCounts.active +
          jobCounts.completed +
          jobCounts.failed,
        pendingJobs: jobCounts.waiting,
        activeJobs: jobCounts.active,
        completedJobs: jobCounts.completed,
        failedJobs: jobCounts.failed,
        averageRecoveryTime: 0, // 可以从事件化监控系统获取
        qps: 0, // 可以从事件化监控系统获取
      };
    } catch (error) {
      this.emitRecoveryEvent("error_occurred", {
        operation: "get_metrics",
        status: "error",
        error_type: "metricsQueryError",
      });

      // 返回默认值
      return {
        totalJobs: 0,
        pendingJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        averageRecoveryTime: 0,
        qps: 0,
      };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    details: any;
  }> {
    try {
      const queueHealth = await this.recoveryQueue.getJobCounts();
      const workerRunning = this.recoveryWorker?.isRunning();

      const status =
        workerRunning && queueHealth.failed < 100
          ? "healthy"
          : queueHealth.failed < 500
            ? "degraded"
            : "unhealthy";

      return {
        status,
        details: {
          workerRunning,
          queueCounts: queueHealth,
          metrics: await this.getMetrics(),
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        details: {
          error: error.message,
        },
      };
    }
  }
}

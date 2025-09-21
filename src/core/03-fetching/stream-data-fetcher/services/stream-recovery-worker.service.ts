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
import { SYSTEM_STATUS_EVENTS } from "../../../../monitoring/contracts/events/system-status.events";
import { StreamCacheService } from "../../../05-caching/stream-cache/services/stream-cache.service";
import { StreamDataPoint } from "../../../05-caching/stream-cache/interfaces/stream-cache.interface";
import { StreamClientStateManager } from "./stream-client-state-manager.service";
import { StreamDataFetcherService } from "./stream-data-fetcher.service";
import {
  StreamRecoveryConfigService,
  StreamRecoveryConfig,
} from "../config/stream-recovery.config";
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
 * - 缓存管理（由StreamCacheService负责）
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
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "stream_recovery_worker",
        metricType: "business",
        metricName,
        metricValue:
          data.duration ||
          data.count ||
          data.data_points ||
          data.batch_size ||
          data.bytes ||
          data.tokens ||
          data.qps ||
          1,
        tags: {
          operation: data.operation || "recovery",
          status: data.status,
          error_type: data.error_type,
          client_id: data.client_id,
          provider: data.provider,
          job_id: data.job_id,
          data_points: data.data_points,
          batch_size: data.batch_size,
          bytes: data.bytes,
        },
      });
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
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "stream_recovery_worker",
        metricType: "performance",
        metricName,
        metricValue: data.duration || data.qps || data.tokens_consumed || 1,
        tags: {
          operation: data.operation || "rate_limit",
          status: data.status,
          rate_limit_hit: data.rate_limit_hit,
          tokens_consumed: data.tokens_consumed,
        },
      });
    });
  }

  constructor(
    private readonly streamCache: StreamCacheService,
    private readonly clientStateManager: StreamClientStateManager,
    private readonly streamDataFetcher: StreamDataFetcherService,
    private readonly configService: StreamRecoveryConfigService,
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

    try {
      // 检查QPS限流
      if (!this.checkRateLimit(provider)) {
        throw UniversalExceptionFactory.createBusinessException({
          component: ComponentIdentifier.STREAM_DATA_FETCHER,
          errorCode: BusinessErrorCode.RESOURCE_EXHAUSTED,
          operation: 'processRecoveryJob',
          message: 'Rate limit exceeded for recovery operation',
          context: {
            provider,
            clientId,
            symbols,
            operation: 'recovery_job'
          }
        });
      }

      // 获取缓存数据
      const recoveredData: StreamDataPoint[] = [];
      const currentTime = Date.now();

      for (const symbol of symbols) {
        const dataPoints = await this.streamCache.getDataSince(
          symbol,
          lastReceiveTimestamp,
        );

        if (dataPoints && dataPoints.length > 0) {
          recoveredData.push(...dataPoints);
        }
      }

      // 如果有补发数据，发送给客户端
      if (recoveredData.length > 0) {
        await this.sendRecoveryDataToClient(clientId, recoveredData);
      }

      const recoveryTime = Date.now() - startTime;
      this.emitRecoveryEvent("job_completed", {
        operation: "recovery_job",
        duration: recoveryTime,
        data_points: recoveredData.length,
        status: "success",
        client_id: clientId,
      });

      return {
        clientId,
        recoveredDataPoints: recoveredData.length,
        symbols,
        timeRange: {
          from: lastReceiveTimestamp,
          to: currentTime,
        },
        success: true,
      };
    } catch (error) {
      this.logger.error("补发任务处理失败", {
        jobId: job.id,
        clientId,
        error: error.message,
        retryCount: job.attemptsMade,
      });

      // 判断是否需要降级处理
      if (job.attemptsMade >= this.config.worker.maxRetries) {
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
        error: error.message,
      };
    }
  }

  /**
   * QPS限流检查
   */
  private checkRateLimit(provider: string): boolean {
    const now = Date.now();
    let limiter = this.rateLimiter.get(provider);

    const rateLimitConfig = this.configService.getRateLimitConfig(provider);

    if (!limiter) {
      limiter = {
        tokens: rateLimitConfig.burstSize,
        lastRefill: now,
      };
      this.rateLimiter.set(provider, limiter);
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
        await job.remove();
        this.logger.log("补发任务已取消", { jobId });
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

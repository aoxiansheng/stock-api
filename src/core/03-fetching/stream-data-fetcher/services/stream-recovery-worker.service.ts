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
   * 设置WebSocket服务器实例 - Phase 3 Critical Fix
   * 由WebSocket Gateway在初始化时调用
   */
  /**
   * 设置WebSocket服务器实例（Legacy模式已移除）
   * @param server Socket.IO服务器实例
   * @deprecated Legacy模式已移除，WebSocket服务器应通过Gateway自动集成
   */
  setWebSocketServer(server: Server): void {
    this.logger.error("🚫 StreamRecoveryWorker Legacy模式已移除", {
      ignoredServerPath: server.path(),
      recommendation: "WebSocket服务器应通过Gateway模式自动集成",
      migrationInfo: "Gateway模式会自动提供WebSocket服务器实例",
    });
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
        throw new Error("Rate limit exceeded");
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
   * 发送补发数据到客户端
   */
  /**
   * 发送补发数据到客户端 - Phase 3 WebSocket Gateway Integration
   */
  private async sendRecoveryDataToClient(
    clientId: string,
    data: StreamDataPoint[],
  ): Promise<void> {
    // Phase 3 Critical Fix: 使用强类型WebSocket提供者
    if (!this.webSocketProvider.isServerAvailable()) {
      this.logger.error("WebSocket服务器不可用，无法发送补发数据", {
        clientId,
        serverStats: this.webSocketProvider.getServerStats(),
      });
      this.emitRecoveryEvent("error_occurred", {
        operation: "send_recovery_data",
        status: "error",
        error_type: "networkErrors",
        client_id: clientId,
      });
      return;
    }

    const webSocketServer = this.webSocketProvider.getServer()!;

    // 获取客户端Socket连接
    const clientSocket = webSocketServer.sockets.sockets.get(clientId);
    if (!clientSocket) {
      this.logger.warn("客户端Socket连接不存在，无法发送补发数据", {
        clientId,
      });
      this.emitRecoveryEvent("error_occurred", {
        operation: "send_recovery_data",
        status: "error",
        error_type: "networkErrors",
        client_id: clientId,
      });
      return;
    }

    // 验证客户端连接状态
    if (!clientSocket.connected) {
      this.logger.warn("客户端Socket已断开，跳过补发数据发送", { clientId });
      this.emitRecoveryEvent("error_occurred", {
        operation: "send_recovery_data",
        status: "error",
        error_type: "connectionErrors",
        client_id: clientId,
      });
      return;
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

      try {
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

        this.logger.debug("补发数据批次发送成功", {
          clientId,
          batchIndex,
          totalBatches,
          dataPointsCount: batch.length,
          batchBytes,
          isLastBatch,
        });
      } catch (error) {
        this.logger.error("发送补发数据失败", {
          clientId,
          batchIndex,
          totalBatches,
          error: error.message,
        });
        this.emitRecoveryEvent("error_occurred", {
          operation: "send_batch",
          status: "error",
          error_type: "networkErrors",
          client_id: clientId,
        });

        // 如果是最后一个批次失败，也要发送失败通知
        if (isLastBatch) {
          try {
            clientSocket.emit("recovery-error", {
              type: "recovery_failed",
              message: "补发数据传输中断",
              error: error.message,
              timestamp: Date.now(),
            });
          } catch (notificationError) {
            this.logger.error("发送补发失败通知也失败了", {
              clientId,
              error: notificationError.message,
            });
          }
        }

        // 批次失败时停止后续发送，避免连续错误
        break;
      }

      // 在批次间添加小延迟，避免过快发送
      if (!isLastBatch) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    // 发送补发完成通知
    try {
      clientSocket.emit("recovery-complete", {
        type: "recovery_complete",
        message: "数据补发完成",
        totalDataPoints: sortedData.length,
        totalBatches,
        timestamp: Date.now(),
      });

      this.logger.log("补发数据发送完成", {
        clientId,
        totalDataPoints: sortedData.length,
        totalBatches,
      });
    } catch (error) {
      this.logger.error("发送补发完成通知失败", {
        clientId,
        error: error.message,
      });
    }
  }

  /**
   * 处理补发失败降级
   */
  /**
   * 处理补发失败降级 - Phase 3 WebSocket Gateway Integration
   */
  private async handleRecoveryFailure(
    clientId: string,
    symbols: string[],
  ): Promise<void> {
    this.logger.warn("补发失败，执行降级策略", { clientId, symbols });

    // Phase 3 Critical Fix: 使用强类型WebSocket提供者发送降级通知
    if (!this.webSocketProvider.isServerAvailable()) {
      this.logger.error("WebSocket服务器不可用，无法发送降级通知", {
        clientId,
        serverStats: this.webSocketProvider.getServerStats(),
      });
      return;
    }

    const webSocketServer = this.webSocketProvider.getServer()!;

    // 获取客户端Socket连接
    const clientSocket = webSocketServer.sockets.sockets.get(clientId);
    if (!clientSocket) {
      this.logger.warn("客户端Socket连接不存在，无法发送降级通知", {
        clientId,
      });
      return;
    }

    // 验证客户端连接状态
    if (!clientSocket.connected) {
      this.logger.warn("客户端Socket已断开，跳过降级通知", { clientId });
      return;
    }

    try {
      // 发送降级失败通知给WebSocket客户端
      const failureNotification = {
        type: "recovery_failed",
        message: "数据补发失败，请重新订阅获取最新数据",
        symbols,
        action: "resubscribe",
        timestamp: Date.now(),
        severity: "warning",
        retryRecommended: true,
      };

      clientSocket.emit("recovery-failed", failureNotification);

      this.logger.log("补发失败降级通知已发送", {
        clientId,
        symbols: symbols.length,
        action: "resubscribe",
      });
    } catch (error) {
      this.logger.error("发送降级通知失败", {
        clientId,
        symbols,
        error: error.message,
      });

      // 如果连发送降级通知都失败了，尝试发送更简单的错误消息
      try {
        clientSocket.emit("error", {
          message: "系统错误，请重新连接",
          timestamp: Date.now(),
        });
      } catch (simpleErrorSendFailed) {
        this.logger.error("发送简单错误通知也失败了", {
          clientId,
          error: simpleErrorSendFailed.message,
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
      throw new Error("Invalid lastReceiveTimestamp");
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
        const jobId = await this.submitRecoveryJob(job);
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
      throw new Error("Invalid recovery job parameters");
    }

    // 验证时间窗口
    const timeDiff = Date.now() - job.lastReceiveTimestamp;
    if (timeDiff > 86400000) {
      // 24小时
      throw new Error("Recovery window too large, data may be expired");
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

import { Injectable } from "@nestjs/common";
import { RATE_LIMIT_CONFIG } from "@common/constants/domain/rate-limit-domain.constants";

/**
 * StreamRecovery 配置类 - Phase 3 Critical Fix
 *
 * 独立的配置管理，支持环境变量覆盖和动态配置
 */

export interface StreamRecoveryRateLimitConfig {
  maxQPS: number;
  burstSize: number;
  window: number; // 毫秒
}

export interface DelayStrategyConfig {
  type: "fixed" | "exponential" | "linear";
  initialDelay: number;
  maxDelay: number;
  factor?: number; // 用于exponential
}

export interface StreamRecoveryConfig {
  // BullMQ 队列配置
  queue: {
    name: string;
    redis: {
      host: string;
      port: number;
    };
  };

  // Worker 配置
  worker: {
    concurrency: number;
    maxRetries: number;
    retryDelay: number;
  };

  // QPS 限流配置
  rateLimit: {
    default: StreamRecoveryRateLimitConfig;
    providers: Record<string, StreamRecoveryRateLimitConfig>;
  };

  // 优先级权重
  priorityWeights: {
    high: number;
    normal: number;
    low: number;
  };

  // 补发策略
  recovery: {
    maxRecoveryWindow: number; // 最大补发时间窗口(毫秒)
    batchSize: number; // 批量发送大小
    maxDataPoints: number; // 单次补发最大数据点
  };

  // 重连策略
  reconnect: {
    maxAttempts: number;
    delayStrategy: DelayStrategyConfig;
    autoRestoreSubscriptions: boolean;
    autoRecoverData: boolean;
    recoveryPriority: "high" | "normal" | "low";
    heartbeatTimeout: number;
  };

  // 任务清理配置
  cleanup: {
    removeOnComplete: number;
    removeOnFail: number;
  };
}

@Injectable()
export class StreamRecoveryConfigService {
  private readonly config: StreamRecoveryConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): StreamRecoveryConfig {
    return {
      queue: {
        name: process.env.RECOVERY_QUEUE_NAME || "stream-recovery",
        redis: {
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379"),
        },
      },

      worker: {
        concurrency: parseInt(process.env.RECOVERY_WORKER_CONCURRENCY || "4"),
        maxRetries: parseInt(process.env.RECOVERY_MAX_RETRIES || "3"),
        retryDelay: parseInt(process.env.RECOVERY_RETRY_DELAY || "5000"),
      },

      rateLimit: {
        default: {
          maxQPS: parseInt(process.env.RECOVERY_DEFAULT_QPS || "100"),
          burstSize: parseInt(process.env.RECOVERY_DEFAULT_BURST || "150"),
          window: parseInt(process.env.RECOVERY_RATE_WINDOW || "1000"),
        },
        providers: {
          longport: {
            maxQPS: parseInt(process.env.RECOVERY_LONGPORT_QPS || "200"),
            burstSize: parseInt(process.env.RECOVERY_LONGPORT_BURST || "250"),
            window: RATE_LIMIT_CONFIG.GLOBAL_THROTTLE.TTL,
          },
          itick: {
            maxQPS: parseInt(process.env.RECOVERY_ITICK_QPS || "50"),
            burstSize: parseInt(process.env.RECOVERY_ITICK_BURST || "75"),
            window: RATE_LIMIT_CONFIG.GLOBAL_THROTTLE.TTL,
          },
        },
      },

      priorityWeights: {
        high: parseInt(process.env.RECOVERY_PRIORITY_HIGH || "100"),
        normal: parseInt(process.env.RECOVERY_PRIORITY_NORMAL || "50"),
        low: parseInt(process.env.RECOVERY_PRIORITY_LOW || "10"),
      },

      recovery: {
        maxRecoveryWindow: parseInt(
          process.env.RECOVERY_MAX_WINDOW || "300000",
        ), // 5分钟
        batchSize: parseInt(process.env.RECOVERY_BATCH_SIZE || "100"),
        maxDataPoints: parseInt(
          process.env.RECOVERY_MAX_DATA_POINTS || "10000",
        ),
      },

      reconnect: {
        maxAttempts: parseInt(process.env.RECONNECT_MAX_ATTEMPTS || "5"),
        delayStrategy: {
          type: (process.env.RECONNECT_DELAY_TYPE as any) || "exponential",
          initialDelay: parseInt(process.env.RECONNECT_INITIAL_DELAY || "1000"),
          maxDelay: parseInt(process.env.RECONNECT_MAX_DELAY || "30000"),
          factor: parseFloat(process.env.RECONNECT_DELAY_FACTOR || "2"),
        },
        autoRestoreSubscriptions:
          process.env.RECONNECT_AUTO_RESTORE !== "false",
        autoRecoverData: process.env.RECONNECT_AUTO_RECOVER !== "false",
        recoveryPriority:
          (process.env.RECONNECT_RECOVERY_PRIORITY as any) || "normal",
        heartbeatTimeout: parseInt(
          process.env.RECONNECT_HEARTBEAT_TIMEOUT || "60000",
        ),
      },

      cleanup: {
        removeOnComplete: parseInt(
          process.env.RECOVERY_CLEANUP_COMPLETE || "1000",
        ),
        removeOnFail: parseInt(process.env.RECOVERY_CLEANUP_FAIL || "5000"),
      },
    };
  }

  /**
   * 获取完整配置
   */
  getConfig(): StreamRecoveryConfig {
    return this.config;
  }

  /**
   * 获取指定提供商的限流配置
   */
  getRateLimitConfig(provider: string): StreamRecoveryRateLimitConfig {
    return (
      this.config.rateLimit.providers[provider] || this.config.rateLimit.default
    );
  }

  /**
   * 获取优先级权重
   */
  getPriorityWeight(priority: "high" | "normal" | "low"): number {
    return this.config.priorityWeights[priority];
  }

  /**
   * 判断时间差是否在补发窗口内
   */
  isWithinRecoveryWindow(timeDiff: number): boolean {
    return timeDiff <= this.config.recovery.maxRecoveryWindow;
  }

  /**
   * 获取重连延迟
   */
  getReconnectDelay(attempt: number): number {
    const { delayStrategy } = this.config.reconnect;

    switch (delayStrategy.type) {
      case "fixed":
        return Math.min(delayStrategy.initialDelay, delayStrategy.maxDelay);

      case "linear":
        return Math.min(
          delayStrategy.initialDelay * attempt,
          delayStrategy.maxDelay,
        );

      case "exponential":
      default:
        return Math.min(
          delayStrategy.initialDelay *
            Math.pow(delayStrategy.factor || 2, attempt - 1),
          delayStrategy.maxDelay,
        );
    }
  }

  /**
   * 动态更新配置 (用于运行时调整)
   */
  updateRateLimit(provider: string, config: StreamRecoveryRateLimitConfig): void {
    this.config.rateLimit.providers[provider] = config;
  }

  /**
   * 获取配置摘要 (用于监控和调试)
   */
  getConfigSummary(): any {
    return {
      queue: this.config.queue.name,
      workerConcurrency: this.config.worker.concurrency,
      maxRecoveryWindow: this.config.recovery.maxRecoveryWindow,
      providers: Object.keys(this.config.rateLimit.providers),
      rateLimits: Object.fromEntries(
        Object.entries(this.config.rateLimit.providers).map(([key, value]) => [
          key,
          { maxQPS: value.maxQPS, burstSize: value.burstSize },
        ]),
      ),
    };
  }
}

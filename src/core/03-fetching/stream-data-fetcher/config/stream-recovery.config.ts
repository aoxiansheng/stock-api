import { Injectable } from "@nestjs/common";

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

  /**
   * 安全解析整数，如果解析失败则返回默认值
   * @param value 要解析的值
   * @param defaultValue 默认值
   * @returns 解析后的整数或默认值
   */
  private parseIntWithDefault(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * 安全解析浮点数，如果解析失败则返回默认值
   * @param value 要解析的值
   * @param defaultValue 默认值
   * @returns 解析后的浮点数或默认值
   */
  private parseFloatWithDefault(value: string | undefined, defaultValue: number): number {
    if (!value) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private loadConfig(): StreamRecoveryConfig {
    return {
      queue: {
        name: process.env.RECOVERY_QUEUE_NAME || "stream-recovery",
        redis: {
          host: process.env.REDIS_HOST || "localhost",
          port: this.parseIntWithDefault(process.env.REDIS_PORT, 6379),
        },
      },

      worker: {
        concurrency: this.parseIntWithDefault(process.env.RECOVERY_WORKER_CONCURRENCY, 4),
        maxRetries: this.parseIntWithDefault(process.env.RECOVERY_MAX_RETRIES, 3),
        retryDelay: this.parseIntWithDefault(process.env.RECOVERY_RETRY_DELAY, 5000),
      },

      rateLimit: {
        default: {
          maxQPS: this.parseIntWithDefault(process.env.RECOVERY_DEFAULT_QPS, 100),
          burstSize: this.parseIntWithDefault(process.env.RECOVERY_DEFAULT_BURST, 150),
          window: this.parseIntWithDefault(process.env.RECOVERY_RATE_WINDOW, 1000),
        },
        providers: {
          longport: {
            maxQPS: this.parseIntWithDefault(process.env.RECOVERY_LONGPORT_QPS, 200),
            burstSize: this.parseIntWithDefault(process.env.RECOVERY_LONGPORT_BURST, 250),
            window: this.parseIntWithDefault(process.env.STREAM_RATE_WINDOW, 60000),
          },
          itick: {
            maxQPS: this.parseIntWithDefault(process.env.RECOVERY_ITICK_QPS, 50),
            burstSize: this.parseIntWithDefault(process.env.RECOVERY_ITICK_BURST, 75),
            window: this.parseIntWithDefault(process.env.STREAM_RATE_WINDOW, 60000),
          },
        },
      },

      priorityWeights: {
        high: this.parseIntWithDefault(process.env.RECOVERY_PRIORITY_HIGH, 100),
        normal: this.parseIntWithDefault(process.env.RECOVERY_PRIORITY_NORMAL, 50),
        low: this.parseIntWithDefault(process.env.RECOVERY_PRIORITY_LOW, 10),
      },

      recovery: {
        maxRecoveryWindow: this.parseIntWithDefault(
          process.env.RECOVERY_MAX_WINDOW, 
          300000,
        ), // 5分钟
        batchSize: this.parseIntWithDefault(process.env.RECOVERY_BATCH_SIZE, 100),
        maxDataPoints: this.parseIntWithDefault(
          process.env.RECOVERY_MAX_DATA_POINTS, 
          10000,
        ),
      },

      reconnect: {
        maxAttempts: this.parseIntWithDefault(process.env.RECONNECT_MAX_ATTEMPTS, 5),
        delayStrategy: {
          type: this.validateDelayStrategyType(process.env.RECONNECT_DELAY_TYPE),
          initialDelay: this.parseIntWithDefault(process.env.RECONNECT_INITIAL_DELAY, 1000),
          maxDelay: this.parseIntWithDefault(process.env.RECONNECT_MAX_DELAY, 30000),
          factor: this.parseFloatWithDefault(process.env.RECONNECT_DELAY_FACTOR, 2),
        },
        autoRestoreSubscriptions:
          process.env.RECONNECT_AUTO_RESTORE !== "false",
        autoRecoverData: process.env.RECONNECT_AUTO_RECOVER !== "false",
        recoveryPriority:
          this.validatePriorityType(process.env.RECONNECT_RECOVERY_PRIORITY) || "normal",
        heartbeatTimeout: this.parseIntWithDefault(
          process.env.RECONNECT_HEARTBEAT_TIMEOUT, 
          60000,
        ),
      },

      cleanup: {
        removeOnComplete: this.parseIntWithDefault(
          process.env.RECOVERY_CLEANUP_COMPLETE, 
          1000,
        ),
        removeOnFail: this.parseIntWithDefault(process.env.RECOVERY_CLEANUP_FAIL, 5000),
      },
    };
  }

  /**
   * 验证延迟策略类型
   */
  private validateDelayStrategyType(type: string | undefined): "fixed" | "exponential" | "linear" {
    if (type === "fixed" || type === "linear" || type === "exponential") {
      return type;
    }
    return "exponential"; // 默认值
  }

  /**
   * 验证优先级类型
   */
  private validatePriorityType(priority: string | undefined): "high" | "normal" | "low" | undefined {
    if (priority === "high" || priority === "normal" || priority === "low") {
      return priority as "high" | "normal" | "low";
    }
    return undefined; // 使用默认值
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
  updateRateLimit(
    provider: string,
    config: StreamRecoveryRateLimitConfig,
  ): void {
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

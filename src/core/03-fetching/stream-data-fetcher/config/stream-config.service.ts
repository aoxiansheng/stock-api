import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createLogger } from "@common/logging/index";
import { StreamConfigDefaults } from './stream-config-defaults.constants';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";
import { STREAM_DATA_FETCHER_ERROR_CODES } from "../constants/stream-data-fetcher-error-codes.constants";

/**
 * 流数据获取器配置接口
 */
export interface StreamDataFetcherConfig {
  // 连接池配置
  connections: {
    /** 全局最大连接数 */
    maxGlobal: number;
    /** 每个provider:capability的最大连接数 */
    maxPerKey: number;
    /** 每个IP的最大连接数 */
    maxPerIP: number;
    /** 连接超时时间（毫秒） */
    timeoutMs: number;
  };

  // 健康检查配置
  healthCheck: {
    /** 并发度 */
    concurrency: number;
    /** 超时时间（毫秒） */
    timeoutMs: number;
    /** 重试次数 */
    retries: number;
    /** 跳过无响应连接 */
    skipUnresponsive: boolean;
    /** 健康率告警阈值（百分比） */
    healthRateThreshold: number;
  };

  // 性能参数配置
  performance: {
    /** 慢响应阈值（毫秒） */
    slowResponseMs: number;
    /** 每个符号最大处理时间（毫秒） */
    maxTimePerSymbolMs: number;
    /** 批量处理最大符号数 */
    maxSymbolsPerBatch: number;
    /** 日志记录符号数限制 */
    logSymbolsLimit: number;
    /** 批量并发限制 */
    batchConcurrency: number;
    /** 自适应并发控制 */
    concurrency: {
      initial: number;
      min: number;
      max: number;
      adjustmentFactor: number;
      stabilizationPeriodMs: number;
    };
    /** 阈值配置 */
    thresholds: {
      responseTimeMs: { excellent: number; good: number; poor: number };
      successRate: { excellent: number; good: number; poor: number };
    };
    /** 断路器配置 */
    circuitBreaker: {
      recoveryDelayMs: number;
      failureThreshold: number; // 0-1 之间
    };
    /** 自适应并发监控调整周期 */
    concurrencyAdjustmentIntervalMs: number;
  };

  // 轮询配置
  polling: {
    /** 轮询间隔（毫秒） */
    intervalMs: number;
    /** 连接建立轮询间隔（毫秒） */
    connectionIntervalMs: number;
  };

  // DoS防护配置
  security: {
    // HTTP级别
    http: {
      /** 速率限制时间窗口（秒） */
      rateLimitTtl: number;
      /** 速率限制请求数 */
      rateLimitCount: number;
      /** 突发请求限制 */
      burstLimit: number;
    };

    // WebSocket级别
    websocket: {
      /** 每IP最大连接数 */
      maxConnectionsPerIP: number;
      /** 每用户最大连接数 */
      maxConnectionsPerUser: number;
      /** 每分钟消息数限制 */
      messagesPerMinute: number;
      /** 每连接最大订阅数 */
      maxSubscriptionsPerConnection: number;
      /** 突发消息限制（10秒内） */
      burstMessages: number;
    };
  };

  // 监控配置
  monitoring: {
    /** 是否启用详细监控 */
    enableVerboseLogging: boolean;
    /** 指标收集间隔（毫秒） */
    metricsCollectionInterval: number;
    /** 连接池统计报告间隔（毫秒） */
    poolStatsReportInterval: number;
  };
}

/**
 * 流数据获取器配置服务
 *
 * 负责：
 * - 环境变量读取和验证
 * - 配置默认值管理
 * - 配置热更新支持
 * - 配置有效性检查
 */
@Injectable()
export class StreamConfigService {
  private readonly logger = createLogger(StreamConfigService.name);
  private config: StreamDataFetcherConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
    this.logConfiguration();
  }

  /**
   * 获取完整配置
   */
  getConfig(): StreamDataFetcherConfig {
    return { ...this.config }; // 返回副本，防止外部修改
  }

  /**
   * 获取连接配置
   */
  getConnectionConfig() {
    return this.config.connections;
  }

  /**
   * 获取健康检查配置
   */
  getHealthCheckConfig() {
    return this.config.healthCheck;
  }

  /**
   * 获取性能配置
   */
  getPerformanceConfig() {
    return this.config.performance;
  }

  /**
   * 获取轮询配置
   */
  getPollingConfig() {
    return this.config.polling;
  }

  /**
   * 获取安全配置
   */
  getSecurityConfig() {
    return this.config.security;
  }

  /**
   * 获取监控配置
   */
  getMonitoringConfig() {
    return this.config.monitoring;
  }

  /**
   * 更新配置（支持运行时更新部分配置）
   */
  updateConfig(partialConfig: Partial<StreamDataFetcherConfig>): void {
    const oldConfig = { ...this.config };

    // 深度合并配置
    this.config = this.deepMerge(this.config, partialConfig);

    // 验证新配置
    this.validateConfiguration();

    this.logger.log("配置已更新", {
      oldConfig: this.sanitizeConfigForLogging(oldConfig),
      newConfig: this.sanitizeConfigForLogging(this.config),
      updatedFields: this.getUpdatedFields(oldConfig, this.config),
    });
  }

  /**
   * 从环境变量加载配置
   * 完全使用 StreamConfigDefaults 统一管理默认值
   * 简化环境变量处理，消除分散的硬编码默认值
   * @private
   */
  private loadConfiguration(): StreamDataFetcherConfig {
    const fullDefaults = StreamConfigDefaults.getFullConfig();

    return {
      connections: {
        maxGlobal: fullDefaults.connections.maxGlobal,
        maxPerKey: fullDefaults.connections.maxPerKey,
        maxPerIP: fullDefaults.connections.maxPerIP,
        timeoutMs: fullDefaults.connections.timeout,
      },

      healthCheck: {
        concurrency: StreamConfigDefaults.getEnvValue("HEALTHCHECK_CONCURRENCY", 10),
        timeoutMs: StreamConfigDefaults.getEnvValue("HEALTHCHECK_TIMEOUT_MS", 5000),
        retries: StreamConfigDefaults.getEnvValue("HEALTHCHECK_RETRIES", 1),
        skipUnresponsive: StreamConfigDefaults.getEnvValue("HEALTHCHECK_SKIP_UNRESPONSIVE", true),
        healthRateThreshold: StreamConfigDefaults.getEnvValue("HEALTHCHECK_RATE_THRESHOLD", 50),
      },

      performance: {
        slowResponseMs: StreamConfigDefaults.getEnvValue("STREAM_SLOW_RESPONSE_MS", fullDefaults.performance.slowResponseMs),
        maxTimePerSymbolMs: StreamConfigDefaults.getEnvValue("STREAM_MAX_TIME_PER_SYMBOL_MS", fullDefaults.performance.maxTimePerSymbolMs),
        maxSymbolsPerBatch: fullDefaults.performance.maxSymbolsPerBatch,
        logSymbolsLimit: StreamConfigDefaults.getEnvValue("STREAM_LOG_SYMBOLS_LIMIT", fullDefaults.performance.logSymbolsLimit),
        batchConcurrency: StreamConfigDefaults.getEnvValue("STREAM_BATCH_CONCURRENCY", fullDefaults.performance.batchConcurrency),
        concurrency: fullDefaults.performance.concurrency,
        thresholds: fullDefaults.performance.thresholds,
        circuitBreaker: fullDefaults.performance.circuitBreaker,
        concurrencyAdjustmentIntervalMs: fullDefaults.performance.concurrencyAdjustmentIntervalMs,
      },

      polling: {
        intervalMs: StreamConfigDefaults.getEnvValue("STREAM_POLLING_INTERVAL_MS", 100),
        connectionIntervalMs: StreamConfigDefaults.getEnvValue("STREAM_CONNECTION_POLLING_INTERVAL_MS", 100),
      },

      security: {
        http: {
          rateLimitTtl: StreamConfigDefaults.getEnvValue("STREAM_HTTP_RATE_LIMIT_TTL", 60),
          rateLimitCount: StreamConfigDefaults.getEnvValue("STREAM_HTTP_RATE_LIMIT_COUNT", 100),
          burstLimit: StreamConfigDefaults.getEnvValue("STREAM_HTTP_BURST_LIMIT", 20),
        },
        websocket: {
          maxConnectionsPerIP: fullDefaults.connections.maxPerIP,
          maxConnectionsPerUser: fullDefaults.connections.maxPerUser,
          messagesPerMinute: fullDefaults.rateLimiting.messagesPerMinute,
          maxSubscriptionsPerConnection: fullDefaults.rateLimiting.maxSubscriptionsPerConnection,
          burstMessages: fullDefaults.rateLimiting.burstMessages,
        },
      },

      monitoring: {
        enableVerboseLogging: fullDefaults.monitoring.enabled,
        metricsCollectionInterval: fullDefaults.monitoring.interval,
        poolStatsReportInterval: StreamConfigDefaults.getEnvValue("STREAM_POOL_STATS_REPORT_INTERVAL", 300000),
      },
    };
  }


  /**
   * 配置验证
   * @private
   */
  private validateConfiguration(): void {
    const errors: string[] = [];

    // 连接配置验证
    if (this.config.connections.maxGlobal <= 0) {
      errors.push("maxGlobal must be greater than 0");
    }
    if (this.config.connections.maxPerKey <= 0) {
      errors.push("maxPerKey must be greater than 0");
    }
    if (this.config.connections.maxPerKey > this.config.connections.maxGlobal) {
      errors.push("maxPerKey cannot be greater than maxGlobal");
    }
    if (this.config.connections.timeoutMs <= 0) {
      errors.push("connection timeoutMs must be greater than 0");
    }

    // 健康检查配置验证
    if (this.config.healthCheck.concurrency <= 0) {
      errors.push("healthCheck concurrency must be greater than 0");
    }
    if (this.config.healthCheck.timeoutMs <= 0) {
      errors.push("healthCheck timeoutMs must be greater than 0");
    }
    if (this.config.healthCheck.retries < 0) {
      errors.push("healthCheck retries must be non-negative");
    }

    // 性能配置验证
    if (this.config.performance.batchConcurrency <= 0) {
      errors.push("batchConcurrency must be greater than 0");
    }
    if (this.config.performance.maxSymbolsPerBatch <= 0) {
      errors.push("maxSymbolsPerBatch must be greater than 0");
    }

    if (errors.length > 0) {
      throw UniversalExceptionFactory.createBusinessException({
        message: `Stream configuration validation failed: ${errors.join(", ")}`,
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
        operation: 'validateConfiguration',
        component: ComponentIdentifier.STREAM_DATA_FETCHER,
        context: {
          validationErrors: errors,
          configSnapshot: {
            connections: this.config.connections,
            healthCheck: this.config.healthCheck,
            performance: this.config.performance
          },
          customErrorCode: STREAM_DATA_FETCHER_ERROR_CODES.INVALID_STREAM_CONFIG,
          reason: 'stream_configuration_validation_failed'
        },
        retryable: false
      });
    }
  }

  /**
   * 记录配置信息
   * @private
   */
  private logConfiguration(): void {
    this.logger.log(
      "流数据获取器配置已加载",
      this.sanitizeConfigForLogging(this.config),
    );
  }

  /**
   * 深度合并对象
   * @private
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] !== null &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * 脱敏配置用于日志记录
   * @private
   */
  private sanitizeConfigForLogging(config: StreamDataFetcherConfig): any {
    // 创建配置的副本，移除敏感信息或过长的数组
    return {
      ...config,
      // 这里可以添加脱敏逻辑
      _configSummary: {
        totalConnections: config.connections.maxGlobal,
        healthCheckEnabled: true,
        securityEnabled: true,
        monitoringEnabled: config.monitoring.enableVerboseLogging,
      },
    };
  }

  /**
   * 获取配置更新的字段
   * @private
   */
  private getUpdatedFields(
    oldConfig: any,
    newConfig: any,
    path = "",
  ): string[] {
    const updated: string[] = [];

    for (const key in newConfig) {
      const currentPath = path ? `${path}.${key}` : key;

      if (
        typeof newConfig[key] === "object" &&
        newConfig[key] !== null &&
        !Array.isArray(newConfig[key])
      ) {
        updated.push(
          ...this.getUpdatedFields(
            oldConfig[key] || {},
            newConfig[key],
            currentPath,
          ),
        );
      } else if (oldConfig[key] !== newConfig[key]) {
        updated.push(currentPath);
      }
    }

    return updated;
  }

}

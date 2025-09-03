import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createLogger } from "@app/config/logger.config";

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
   * @private
   */
  private loadConfiguration(): StreamDataFetcherConfig {
    return {
      connections: {
        maxGlobal: this.getEnvNumber("STREAM_MAX_CONNECTIONS_GLOBAL", 1000),
        maxPerKey: this.getEnvNumber("STREAM_MAX_CONNECTIONS_PER_KEY", 100),
        maxPerIP: this.getEnvNumber("STREAM_MAX_CONNECTIONS_PER_IP", 50),
        timeoutMs: this.getEnvNumber("STREAM_CONNECTION_TIMEOUT_MS", 10000),
      },

      healthCheck: {
        concurrency: this.getEnvNumber("HEALTHCHECK_CONCURRENCY", 10),
        timeoutMs: this.getEnvNumber("HEALTHCHECK_TIMEOUT_MS", 5000),
        retries: this.getEnvNumber("HEALTHCHECK_RETRIES", 1),
        skipUnresponsive: this.getEnvBoolean(
          "HEALTHCHECK_SKIP_UNRESPONSIVE",
          true,
        ),
        healthRateThreshold: this.getEnvNumber(
          "HEALTHCHECK_RATE_THRESHOLD",
          50,
        ),
      },

      performance: {
        slowResponseMs: this.getEnvNumber("STREAM_SLOW_RESPONSE_MS", 2000),
        maxTimePerSymbolMs: this.getEnvNumber(
          "STREAM_MAX_TIME_PER_SYMBOL_MS",
          500,
        ),
        maxSymbolsPerBatch: this.getEnvNumber(
          "STREAM_MAX_SYMBOLS_PER_BATCH",
          50,
        ),
        logSymbolsLimit: this.getEnvNumber("STREAM_LOG_SYMBOLS_LIMIT", 10),
        batchConcurrency: this.getEnvNumber("STREAM_BATCH_CONCURRENCY", 10),
      },

      polling: {
        intervalMs: this.getEnvNumber("STREAM_POLLING_INTERVAL_MS", 100),
        connectionIntervalMs: this.getEnvNumber(
          "STREAM_CONNECTION_POLLING_INTERVAL_MS",
          100,
        ),
      },

      security: {
        http: {
          rateLimitTtl: this.getEnvNumber("STREAM_HTTP_RATE_LIMIT_TTL", 60),
          rateLimitCount: this.getEnvNumber(
            "STREAM_HTTP_RATE_LIMIT_COUNT",
            100,
          ),
          burstLimit: this.getEnvNumber("STREAM_HTTP_BURST_LIMIT", 20),
        },
        websocket: {
          maxConnectionsPerIP: this.getEnvNumber(
            "WS_MAX_CONNECTIONS_PER_IP",
            10,
          ),
          maxConnectionsPerUser: this.getEnvNumber(
            "WS_MAX_CONNECTIONS_PER_USER",
            5,
          ),
          messagesPerMinute: this.getEnvNumber("WS_MESSAGES_PER_MINUTE", 120),
          maxSubscriptionsPerConnection: this.getEnvNumber(
            "WS_MAX_SUBSCRIPTIONS_PER_CONNECTION",
            50,
          ),
          burstMessages: this.getEnvNumber("WS_BURST_MESSAGES", 20),
        },
      },

      monitoring: {
        enableVerboseLogging: this.getEnvBoolean(
          "STREAM_VERBOSE_LOGGING",
          false,
        ),
        metricsCollectionInterval: this.getEnvNumber(
          "STREAM_METRICS_COLLECTION_INTERVAL",
          30000,
        ),
        poolStatsReportInterval: this.getEnvNumber(
          "STREAM_POOL_STATS_REPORT_INTERVAL",
          300000,
        ),
      },
    };
  }

  /**
   * 从环境变量获取数字值
   * @private
   */
  private getEnvNumber(key: string, defaultValue: number): number {
    const value = this.configService.get<string>(key);
    if (value === undefined || value === null || value === "") {
      return defaultValue;
    }

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      this.logger.warn(`环境变量 ${key} 值无效，使用默认值`, {
        providedValue: value,
        defaultValue,
      });
      return defaultValue;
    }

    return parsed;
  }

  /**
   * 从环境变量获取布尔值
   * @private
   */
  private getEnvBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.configService.get<string>(key);
    if (value === undefined || value === null || value === "") {
      return defaultValue;
    }

    const normalized = value.toLowerCase().trim();
    return normalized === "true" || normalized === "1" || normalized === "yes";
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
      throw new Error(
        `Stream configuration validation failed: ${errors.join(", ")}`,
      );
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

  /**
   * 获取环境特定的配置建议
   */
  getEnvironmentRecommendations(): {
    environment: string;
    recommendations: Array<{
      setting: string;
      currentValue: any;
      recommendedValue: any;
      reason: string;
    }>;
  } {
    const env = this.configService.get<string>("NODE_ENV", "development");
    const recommendations = [];

    if (env === "production") {
      // 生产环境建议
      if (this.config.monitoring.enableVerboseLogging) {
        recommendations.push({
          setting: "monitoring.enableVerboseLogging",
          currentValue: true,
          recommendedValue: false,
          reason: "生产环境应关闭详细日志以提升性能",
        });
      }

      if (this.config.healthCheck.concurrency < 5) {
        recommendations.push({
          setting: "healthCheck.concurrency",
          currentValue: this.config.healthCheck.concurrency,
          recommendedValue: 10,
          reason: "生产环境建议提高健康检查并发度",
        });
      }
    } else if (env === "development") {
      // 开发环境建议
      if (!this.config.monitoring.enableVerboseLogging) {
        recommendations.push({
          setting: "monitoring.enableVerboseLogging",
          currentValue: false,
          recommendedValue: true,
          reason: "开发环境建议启用详细日志便于调试",
        });
      }
    }

    return {
      environment: env,
      recommendations,
    };
  }
}

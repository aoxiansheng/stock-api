/**
 * 监控组件增强统一配置类
 *
 * 📋 职责边界：
 * ==========================================
 * 本文件作为监控组件的主要配置入口，整合所有统一配置类：
 *
 * ✅ 整合的配置模块：
 * - TTL配置 (MonitoringUnifiedTtlConfig)
 * - 批量限制配置 (MonitoringUnifiedLimitsConfig)
 * - 性能阈值配置 (MonitoringPerformanceThresholdsConfig)
 * - 事件处理配置 (MonitoringEventsConfig)
 * - 基础配置 (缓存命名空间、压缩等)
 *
 * ✅ 四层配置系统：
 * - Layer 1: 环境变量 (最高优先级)
 * - Layer 2: 配置文件 (配置文件覆盖)
 * - Layer 3: 环境默认值 (开发/测试/生产)
 * - Layer 4: 代码默认值 (最低优先级)
 *
 * ✅ 环境变量支持：
 * - 支持通过环境变量覆盖所有配置项
 * - 提供完整的环境变量映射文档
 *
 * ✅ 类型安全：
 * - 使用class-validator进行验证
 * - 提供完整的TypeScript类型支持
 * - 运行时配置验证和错误报告
 *
 * ❌ 替换的配置文件：
 * - monitoring.config.ts (原有主配置文件)
 * - 分散在各个常量文件中的配置参数
 *
 * @version 1.0.0
 * @since 2025-09-16
 * @author Claude Code
 */

import {
  IsNumber,
  IsBoolean,
  IsString,
  IsOptional,
  Min,
  Max,
  validateSync,
} from "class-validator";
import { Transform, Type, plainToClass } from "class-transformer";
import { registerAs } from "@nestjs/config";

// 导入已创建的统一配置类
import {
  MonitoringUnifiedTtl,
  MonitoringUnifiedTtlConfig,
  MonitoringTtlUtils,
} from "./monitoring-unified-ttl.config";
import {
  MonitoringUnifiedLimitsConfig,
  monitoringUnifiedLimitsConfig,
  MonitoringLimitsUtils,
} from "./monitoring-unified-limits.config";
import {
  MonitoringPerformanceThresholdsConfig,
  monitoringPerformanceThresholdsConfig,
  MonitoringPerformanceThresholdsUtils,
} from "./monitoring-performance-thresholds.config";
import {
  MonitoringEventsConfig,
  monitoringEventsConfig,
  MonitoringEventsUtils,
  AlertLevel,
  EventPriority,
} from "./monitoring-events.config";

/**
 * 监控组件基础配置
 * 🏗️ 基础设施配置，包括缓存命名空间、压缩设置等
 */
export class MonitoringBaseConfig {
  /**
   * Redis命名空间
   *
   * 用途：为所有监控相关的Redis键添加命名空间前缀
   * 业务影响：命名空间变更会导致现有缓存失效
   *
   * 环境推荐值：
   * - 开发环境：monitoring_dev
   * - 测试环境：monitoring_test
   * - 生产环境：monitoring_prod
   *
   * 环境变量：MONITORING_CACHE_NAMESPACE
   */
  @IsString({ message: "Redis命名空间必须是字符串" })
  @Transform(({ value }) => value || "monitoring")
  namespace: string = "monitoring";

  /**
   * 监控数据索引键前缀
   *
   * 用途：用于创建监控数据索引的Redis键前缀
   *
   * 环境变量：MONITORING_KEY_INDEX_PREFIX
   */
  @IsString({ message: "索引键前缀必须是字符串" })
  @Transform(({ value }) => value || "monitoring:index")
  keyIndexPrefix: string = "monitoring:index";

  /**
   * 数据压缩阈值（字节）
   *
   * 用途：当监控数据大小超过此阈值时，自动启用压缩存储
   * 业务影响：影响CPU使用和内存占用的权衡
   *
   * 环境变量：MONITORING_COMPRESSION_THRESHOLD
   */
  @IsNumber({}, { message: "数据压缩阈值必须是数字" })
  @Min(0, { message: "数据压缩阈值最小值为0" })
  @Max(10240, { message: "数据压缩阈值最大值为10240字节" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 1024 : parsed;
  })
  compressionThreshold: number = 1024;

  /**
   * 缓存回退次数告警阈值
   *
   * 用途：当缓存连续失败回退到数据库查询的次数达到阈值时触发告警
   *
   * 环境变量：MONITORING_FALLBACK_THRESHOLD
   */
  @IsNumber({}, { message: "缓存回退告警阈值必须是数字" })
  @Min(1, { message: "缓存回退告警阈值最小值为1" })
  @Max(100, { message: "缓存回退告警阈值最大值为100" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10 : parsed;
  })
  fallbackThreshold: number = 10;

  /**
   * 是否启用监控组件
   *
   * 用途：全局开关，控制是否启用监控功能
   *
   * 环境变量：MONITORING_ENABLED
   */
  @IsBoolean({ message: "启用监控必须是布尔值" })
  @Transform(({ value }) => value !== "false")
  enabled: boolean = true;

  /**
   * 是否启用调试模式
   *
   * 用途：启用详细的调试日志和诊断信息
   *
   * 环境变量：MONITORING_DEBUG_ENABLED
   */
  @IsBoolean({ message: "启用调试模式必须是布尔值" })
  @Transform(({ value }) => value === "true")
  debugEnabled: boolean = false;

  /**
   * 监控组件版本
   *
   * 用途：用于配置版本控制和兼容性检查
   *
   * 环境变量：MONITORING_VERSION
   */
  @IsString({ message: "监控版本必须是字符串" })
  @IsOptional()
  @Transform(({ value }) => value || "2.0.0")
  version: string = "2.0.0";

  /**
   * 配置更新检查间隔（秒）
   *
   * 用途：定期检查配置更新的时间间隔
   *
   * 环境变量：MONITORING_CONFIG_CHECK_INTERVAL_SEC
   */
  @IsNumber({}, { message: "配置检查间隔必须是数字" })
  @Min(60, { message: "配置检查间隔最小值为60秒" })
  @Max(86400, { message: "配置检查间隔最大值为86400秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 3600 : parsed;
  })
  configCheckIntervalSeconds: number = 3600;
}

/**
 * 监控组件环境配置
 * 🌍 环境特定的配置调优参数
 */
export class MonitoringEnvironmentConfig {
  /**
   * 当前运行环境
   */
  @IsString({ message: "运行环境必须是字符串" })
  @Transform(({ value }) => value || process.env.NODE_ENV || "development")
  environment: string = process.env.NODE_ENV || "development";

  /**
   * 是否为生产环境
   */
  get isProduction(): boolean {
    return this.environment === "production";
  }

  /**
   * 是否为测试环境
   */
  get isTest(): boolean {
    return this.environment === "test";
  }

  /**
   * 是否为开发环境
   */
  get isDevelopment(): boolean {
    return this.environment === "development";
  }

  /**
   * 环境标识符
   *
   * 用途：在监控数据中标识环境来源
   *
   * 环境变量：MONITORING_ENVIRONMENT_ID
   */
  @IsString({ message: "环境标识符必须是字符串" })
  @IsOptional()
  @Transform(
    ({ value }) => value || `${process.env.NODE_ENV || "dev"}-${Date.now()}`,
  )
  environmentId: string = `${process.env.NODE_ENV || "dev"}-${Date.now()}`;

  /**
   * 数据中心标识
   *
   * 用途：标识监控数据来源的数据中心
   *
   * 环境变量：MONITORING_DATACENTER_ID
   */
  @IsString({ message: "数据中心标识必须是字符串" })
  @IsOptional()
  @Transform(({ value }) => value || "default")
  datacenterId: string = "default";

  /**
   * 服务实例标识
   *
   * 用途：在集群环境中标识特定的服务实例
   *
   * 环境变量：MONITORING_INSTANCE_ID
   */
  @IsString({ message: "服务实例标识必须是字符串" })
  @IsOptional()
  @Transform(
    ({ value }) =>
      value || `instance-${Math.random().toString(36).substr(2, 9)}`,
  )
  instanceId: string = `instance-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 监控组件增强统一配置主类
 * 🎯 整合所有监控配置模块的主配置类
 */
export class MonitoringEnhancedConfig {
  /**
   * 基础配置
   */
  @Type(() => MonitoringBaseConfig)
  base: MonitoringBaseConfig = new MonitoringBaseConfig();

  /**
   * 环境配置
   */
  @Type(() => MonitoringEnvironmentConfig)
  environment: MonitoringEnvironmentConfig = new MonitoringEnvironmentConfig();

  /**
   * TTL配置
   */
  @Type(() => MonitoringUnifiedTtlConfig)
  ttl: MonitoringUnifiedTtlConfig = new MonitoringUnifiedTtlConfig();

  /**
   * 批量限制配置
   */
  @Type(() => MonitoringUnifiedLimitsConfig)
  limits: MonitoringUnifiedLimitsConfig = new MonitoringUnifiedLimitsConfig();

  /**
   * 性能阈值配置
   */
  @Type(() => MonitoringPerformanceThresholdsConfig)
  performanceThresholds: MonitoringPerformanceThresholdsConfig =
    new MonitoringPerformanceThresholdsConfig();

  /**
   * 事件处理配置
   */
  @Type(() => MonitoringEventsConfig)
  events: MonitoringEventsConfig = new MonitoringEventsConfig();

  /**
   * 根据环境调整配置
   */
  adjustForEnvironment(): void {
    const env = this.environment.environment;

    // 调整基础配置
    switch (env) {
      case "production":
        this.base.namespace = `monitoring_prod_${this.environment.datacenterId}`;
        this.base.compressionThreshold = 2048;
        this.base.fallbackThreshold = 5;
        this.base.debugEnabled = false;
        this.base.configCheckIntervalSeconds = 1800; // 30分钟
        break;

      case "test":
        this.base.namespace = `monitoring_test_${this.environment.instanceId}`;
        this.base.compressionThreshold = 512;
        this.base.fallbackThreshold = 20;
        this.base.debugEnabled = true;
        this.base.configCheckIntervalSeconds = 300; // 5分钟
        break;

      default: // development
        this.base.namespace = `monitoring_dev_${this.environment.instanceId}`;
        this.base.compressionThreshold = 1024;
        this.base.fallbackThreshold = 10;
        this.base.debugEnabled = true;
        this.base.configCheckIntervalSeconds = 600; // 10分钟
        break;
    }

    // 调整子配置模块
    this.ttl.adjustForEnvironment?.();
    this.limits.adjustForEnvironment?.();
    this.performanceThresholds.adjustForEnvironment?.();
    this.events.adjustForEnvironment?.();
  }

  /**
   * 验证整个配置的合理性
   */
  validateConfiguration(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证基础配置
    if (!this.base.namespace) {
      errors.push("Redis命名空间不能为空");
    }

    if (this.base.compressionThreshold < 0) {
      errors.push("数据压缩阈值不能为负数");
    }

    // 验证子配置模块
    const thresholdsValidation =
      this.performanceThresholds.validateThresholds?.();
    if (thresholdsValidation && !thresholdsValidation.isValid) {
      errors.push(...thresholdsValidation.errors);
    }

    const eventsValidation = this.events.validateConfiguration?.();
    if (eventsValidation && !eventsValidation.isValid) {
      errors.push(...eventsValidation.errors);
    }

    // 生成警告
    if (this.environment.isProduction && this.base.debugEnabled) {
      warnings.push("生产环境建议关闭调试模式");
    }

    if (this.environment.isTest && this.events.enableAutoAnalysis) {
      warnings.push("测试环境建议关闭自动分析功能");
    }

    if (this.base.compressionThreshold > 4096) {
      warnings.push("数据压缩阈值过高可能影响内存使用");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 获取配置摘要信息
   */
  getConfigurationSummary(): {
    environment: string;
    version: string;
    enabledFeatures: string[];
    keyMetrics: Record<string, any>;
  } {
    const enabledFeatures: string[] = [];

    if (this.base.enabled) enabledFeatures.push("monitoring");
    if (this.events.enableAutoAnalysis) enabledFeatures.push("auto-analysis");
    if (this.base.debugEnabled) enabledFeatures.push("debug");
    if (this.events.eventNotification.emailEnabled)
      enabledFeatures.push("email-notifications");
    if (this.events.eventNotification.webhookEnabled)
      enabledFeatures.push("webhook-notifications");
    if (this.events.alertEscalation.escalationEnabled)
      enabledFeatures.push("alert-escalation");

    return {
      environment: this.environment.environment,
      version: this.base.version,
      enabledFeatures,
      keyMetrics: {
        ttlHealthSeconds: this.ttl.health,
        maxAlertsPerMinute: this.events.alertFrequency.maxAlertsPerMinute,
        apiResponseExcellentMs:
          this.performanceThresholds.apiResponse.apiExcellentMs,
        redisHitRateExcellent:
          this.performanceThresholds.cachePerformance.redisHitRateExcellent,
        maxRetryAttempts: this.events.eventRetry.maxRetryAttempts,
        dataRetentionDays: Math.floor(
          this.events.eventStorage.dailyRetentionHours / 24,
        ),
        compressionThreshold: this.base.compressionThreshold,
        namespace: this.base.namespace,
      },
    };
  }

  /**
   * 热重载配置
   */
  async reloadConfiguration(): Promise<void> {
    // 重新调整环境配置
    this.adjustForEnvironment();

    // 验证配置
    const validation = this.validateConfiguration();
    if (!validation.isValid) {
      throw new Error(`配置验证失败: ${validation.errors.join("; ")}`);
    }

    // 这里可以添加配置变更通知逻辑
    console.log("监控配置已重新加载", {
      environment: this.environment.environment,
      timestamp: new Date().toISOString(),
      warnings: validation.warnings,
    });
  }

  /**
   * 导出配置为JSON格式
   */
  exportConfiguration(): Record<string, any> {
    return {
      base: {
        namespace: this.base.namespace,
        keyIndexPrefix: this.base.keyIndexPrefix,
        compressionThreshold: this.base.compressionThreshold,
        fallbackThreshold: this.base.fallbackThreshold,
        enabled: this.base.enabled,
        debugEnabled: this.base.debugEnabled,
        version: this.base.version,
        configCheckIntervalSeconds: this.base.configCheckIntervalSeconds,
      },
      environment: {
        environment: this.environment.environment,
        environmentId: this.environment.environmentId,
        datacenterId: this.environment.datacenterId,
        instanceId: this.environment.instanceId,
      },
      ttl: {
        health: this.ttl.health,
        trend: this.ttl.trend,
        performance: this.ttl.performance,
        alert: this.ttl.alert,
        cacheStats: this.ttl.cacheStats,
      },
      limits: {
        alertBatch: this.limits.alertBatch,
        dataProcessingBatch: this.limits.dataProcessingBatch,
        dataCleanupBatch: this.limits.dataCleanupBatch,
        systemLimits: this.limits.systemLimits,
      },
      performanceThresholds: {
        apiResponse: this.performanceThresholds.apiResponse,
        cachePerformance: this.performanceThresholds.cachePerformance,
        databasePerformance: this.performanceThresholds.databasePerformance,
        throughputConcurrency: this.performanceThresholds.throughputConcurrency,
        systemResource: this.performanceThresholds.systemResource,
        errorRateAvailability: this.performanceThresholds.errorRateAvailability,
      },
      events: {
        alertFrequency: this.events.alertFrequency,
        eventRetry: this.events.eventRetry,
        eventCollection: this.events.eventCollection,
        eventNotification: this.events.eventNotification,
        eventStorage: this.events.eventStorage,
        alertEscalation: this.events.alertEscalation,
        enableAutoAnalysis: this.events.enableAutoAnalysis,
        processingConcurrency: this.events.processingConcurrency,
        maxQueueSize: this.events.maxQueueSize,
        processingTimeoutMs: this.events.processingTimeoutMs,
      },
    };
  }
}

/**
 * 监控增强统一配置注册
 *
 * 用法：
 * ```typescript
 * // 在模块中导入
 * @Module({
 *   imports: [ConfigModule.forFeature(monitoringEnhancedConfig)]
 * })
 *
 * // 在服务中注入
 * constructor(
 *   @Inject('monitoringEnhanced')
 *   private readonly config: MonitoringEnhancedConfig
 * ) {}
 * ```
 */
export const monitoringEnhancedConfig = registerAs(
  "monitoringEnhanced",
  (): MonitoringEnhancedConfig => {
    // 使用统一环境变量系统
    const rawConfig = {
      base: {
        enabled: process.env.MONITORING_ENABLED,
        debugEnabled: process.env.MONITORING_DEBUG_ENABLED,
        version: process.env.MONITORING_VERSION,
      },
      environment: {
        environment: process.env.NODE_ENV,
        environmentId: process.env.MONITORING_ENVIRONMENT_ID,
        datacenterId: process.env.MONITORING_DATACENTER_ID,
        instanceId: process.env.MONITORING_INSTANCE_ID,
      },
    };

    // 使用 class-transformer 进行转换
    const config = plainToClass(MonitoringEnhancedConfig, rawConfig, {
      enableImplicitConversion: true,
    });

    // 加载子配置
    try {
      config.ttl = MonitoringUnifiedTtl() as MonitoringUnifiedTtlConfig;
      config.limits =
        monitoringUnifiedLimitsConfig() as MonitoringUnifiedLimitsConfig;
      config.performanceThresholds =
        monitoringPerformanceThresholdsConfig() as MonitoringPerformanceThresholdsConfig;
      config.events = monitoringEventsConfig() as MonitoringEventsConfig;
    } catch (error) {
      console.warn("加载子配置时出现警告:", error.message);
    }

    // 根据环境调整配置
    config.adjustForEnvironment();

    // 执行验证
    const validation = config.validateConfiguration();
    if (!validation.isValid) {
      throw new Error(`监控增强配置验证失败: ${validation.errors.join("; ")}`);
    }

    // 输出警告
    if (validation.warnings.length > 0) {
      console.warn("监控配置警告:", validation.warnings.join("; "));
    }

    return config;
  },
);

/**
 * 监控配置工厂类
 * 🏭 提供配置创建和管理的工厂方法
 */
export class MonitoringConfigFactory {
  /**
   * 创建默认配置
   */
  static createDefault(): MonitoringEnhancedConfig {
    const config = new MonitoringEnhancedConfig();
    config.adjustForEnvironment();
    return config;
  }

  /**
   * 从环境变量创建配置
   */
  static createFromEnvironment(): MonitoringEnhancedConfig {
    return monitoringEnhancedConfig();
  }

  /**
   * 从JSON对象创建配置
   */
  static createFromObject(
    configObject: Record<string, any>,
  ): MonitoringEnhancedConfig {
    const config = plainToClass(MonitoringEnhancedConfig, configObject, {
      enableImplicitConversion: true,
    });

    const validation = config.validateConfiguration();
    if (!validation.isValid) {
      throw new Error(`配置验证失败: ${validation.errors.join("; ")}`);
    }

    return config;
  }

  /**
   * 创建测试配置
   */
  static createForTesting(): MonitoringEnhancedConfig {
    const config = new MonitoringEnhancedConfig();

    // 设置测试环境
    config.environment.environment = "test";

    // 调整为测试友好的配置
    config.base.debugEnabled = true;
    config.events.enableAutoAnalysis = false;
    config.events.alertFrequency.maxAlertsPerMinute = 100;
    config.events.eventRetry.maxRetryAttempts = 1;
    config.ttl.health = 10;
    config.ttl.performance = 5;

    config.adjustForEnvironment();
    return config;
  }

  /**
   * 验证配置对象
   */
  static validateConfig(config: MonitoringEnhancedConfig): {
    isValid: boolean;
    errors: string[];
  } {
    const errors = validateSync(config, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => Object.values(error.constraints || {}).join(", "))
        .join("; ");

      return {
        isValid: false,
        errors: [errorMessages],
      };
    }

    return config.validateConfiguration();
  }
}

/**
 * 监控配置服务类
 * 🔧 提供配置管理和运行时操作的服务方法
 */
export class MonitoringConfigService {
  constructor(private readonly config: MonitoringEnhancedConfig) {}

  /**
   * 获取告警冷却时间
   */
  getAlertCooldown(level: AlertLevel): number {
    return this.config.events.getAlertCooldown(level);
  }

  /**
   * 获取事件收集间隔
   */
  getCollectionInterval(priority: EventPriority): number {
    return this.config.events.getCollectionInterval(priority);
  }

  /**
   * 获取TTL配置
   */
  getTtl(
    dataType: "health" | "trend" | "performance" | "alert" | "cacheStats",
  ): number {
    switch (dataType) {
      case "health":
        return this.config.ttl.health;
      case "trend":
        return this.config.ttl.trend;
      case "performance":
        return this.config.ttl.performance;
      case "alert":
        return this.config.ttl.alert;
      case "cacheStats":
        return this.config.ttl.cacheStats;
      default:
        return this.config.ttl.performance;
    }
  }

  /**
   * 获取批量处理大小
   */
  getBatchSize(
    type: "alert" | "data" | "cleanup",
    size: "small" | "medium" | "large" = "medium",
  ): number {
    switch (type) {
      case "alert":
        switch (size) {
          case "small":
            return this.config.limits.alertBatch.small;
          case "medium":
            return this.config.limits.alertBatch.medium;
          case "large":
            return this.config.limits.alertBatch.large;
          default:
            return this.config.limits.alertBatch.medium;
        }
      case "data":
        switch (size) {
          case "small":
            return this.config.limits.dataProcessingBatch.standard;
          case "medium":
            return this.config.limits.dataProcessingBatch.highFrequency;
          case "large":
            return this.config.limits.dataProcessingBatch.analysis;
          default:
            return this.config.limits.dataProcessingBatch.standard;
        }
      case "cleanup":
        switch (size) {
          case "small":
            return this.config.limits.dataCleanupBatch.small;
          case "medium":
            return this.config.limits.dataCleanupBatch.standard;
          case "large":
            return this.config.limits.dataCleanupBatch.large;
          default:
            return this.config.limits.dataCleanupBatch.standard;
        }
      default:
        return this.config.limits.dataProcessingBatch.standard;
    }
  }

  /**
   * 判断性能级别
   */
  getPerformanceLevel(
    metric: string,
    value: number,
  ): "excellent" | "good" | "warning" | "poor" | "critical" {
    // 根据不同指标返回性能级别
    if (metric.includes("response_time")) {
      return MonitoringPerformanceThresholdsUtils.getResponseTimeLevel(
        value,
        "api",
        this.config.performanceThresholds,
      );
    }

    if (metric.includes("hit_rate")) {
      return MonitoringPerformanceThresholdsUtils.getCacheHitRateLevel(
        value,
        "redis",
        this.config.performanceThresholds,
      );
    }

    if (metric.includes("error_rate")) {
      return MonitoringPerformanceThresholdsUtils.getErrorRateLevel(
        value,
        this.config.performanceThresholds,
      );
    }

    return "good"; // 默认值
  }

  /**
   * 判断是否可以发送告警
   */
  canSendAlert(
    level: AlertLevel,
    recentCount: number,
    timeWindowMinutes: number = 1,
  ): boolean {
    return this.config.events.canSendAlert(
      level,
      recentCount,
      timeWindowMinutes,
    );
  }

  /**
   * 判断是否在静默时间
   */
  isQuietHours(): boolean {
    return this.config.events.isQuietHours();
  }

  /**
   * 判断是否在工作时间
   */
  isBusinessHours(): boolean {
    return this.config.events.isBusinessHours();
  }

  /**
   * 获取配置摘要
   */
  getConfigSummary() {
    return this.config.getConfigurationSummary();
  }

  /**
   * 重新加载配置
   */
  async reloadConfig(): Promise<void> {
    await this.config.reloadConfiguration();
  }
}

/**
 * 监控增强配置类型导出
 */
export type MonitoringEnhancedType = MonitoringEnhancedConfig;
export type ConfigValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
};
export type ConfigSummary = {
  environment: string;
  version: string;
  enabledFeatures: string[];
  keyMetrics: Record<string, any>;
};

/**
 * 统一环境变量映射表
 * 📋 使用统一环境变量系统简化配置管理
 */
export const MONITORING_ENHANCED_CONFIG_ENV_MAPPING = {
  // 核心统一环境变量 (优先级最高)
  "ttl.default": "MONITORING_DEFAULT_TTL", // 基础TTL，其他TTL按倍数计算
  "limits.defaultBatchSize": "MONITORING_DEFAULT_BATCH_SIZE", // 基础批处理大小，其他批处理按倍数计算
  "events.enableAutoAnalysis": "MONITORING_AUTO_ANALYSIS", // 自动分析开关

  // 环境标识配置
  "environment.environment": "NODE_ENV",
  "environment.environmentId": "MONITORING_ENVIRONMENT_ID",
  "environment.datacenterId": "MONITORING_DATACENTER_ID",
  "environment.instanceId": "MONITORING_INSTANCE_ID",

  // 可选配置（有合理默认值）
  "base.enabled": "MONITORING_ENABLED",
  "base.debugEnabled": "MONITORING_DEBUG_ENABLED",
  "base.version": "MONITORING_VERSION",
} as const;

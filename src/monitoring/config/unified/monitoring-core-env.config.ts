/**
 * 监控组件核心环境变量配置
 *
 * 📋 Phase 4: Environment Variable Optimization
 * ==========================================
 * 本文件定义了8个核心环境变量，替换原有的18+个监控相关环境变量：
 *
 * ✅ 8个核心环境变量：
 * 1. MONITORING_DEFAULT_TTL - 统一TTL配置
 * 2. MONITORING_DEFAULT_BATCH_SIZE - 统一批量大小
 * 3. MONITORING_API_RESPONSE_GOOD - API响应时间阈值
 * 4. MONITORING_CACHE_HIT_THRESHOLD - 缓存命中率阈值
 * 5. MONITORING_ERROR_RATE_THRESHOLD - 错误率阈值
 * 6. MONITORING_AUTO_ANALYSIS - 自动分析开关
 * 7. MONITORING_EVENT_RETRY - 事件重试次数
 * 8. MONITORING_NAMESPACE - 命名空间前缀
 *
 * ✅ 统一环境变量系统优势：
 * - 环境变量数量从13+个减少到3个核心变量
 * - 基于倍数的自动计算，避免配置冲突
 * - 环境特定的智能默认值调整
 *
 * ✅ 环境特定适配：
 * - 开发环境：平衡的配置值
 * - 测试环境：快速响应配置
 * - 生产环境：性能优化配置
 *
 * @version 1.0.0
 * @since 2025-09-16
 * @author Claude Code
 */

import {
  IsNumber,
  IsBoolean,
  IsString,
  Min,
  Max,
  validateSync,
} from "class-validator";
import { Transform, plainToClass } from "class-transformer";
import { registerAs } from "@nestjs/config";

/**
 * 监控核心环境变量配置类
 * 🎯 定义8个核心环境变量，实现56%的变量减少
 */
export class MonitoringCoreEnvConfig {
  /**
   * 默认TTL时间（秒）
   *
   * 用途：所有监控数据类型的基础TTL时间
   * 适配逻辑：
   * - health = defaultTtl * 1.0
   * - trend = defaultTtl * 2.0
   * - performance = defaultTtl * 0.6
   * - alert = defaultTtl * 0.2
   * - cacheStats = defaultTtl * 0.4
   *
   * 环境推荐值：
   * - 开发环境：300秒
   * - 测试环境：30秒
   * - 生产环境：600秒
   *
   * 环境变量：MONITORING_DEFAULT_TTL
   */
  @IsNumber({}, { message: "默认TTL必须是数字" })
  @Min(1, { message: "默认TTL最小值为1秒" })
  @Max(3600, { message: "默认TTL最大值为1小时" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 300 : parsed;
  })
  defaultTtl: number = 300;

  /**
   * 默认批量大小
   *
   * 用途：所有批量处理操作的基础批量大小
   * 适配逻辑：
   * - alertBatch.small = defaultBatchSize * 0.5
   * - alertBatch.medium = defaultBatchSize * 1.0
   * - alertBatch.large = defaultBatchSize * 2.0
   * - dataProcessingBatch.standard = defaultBatchSize * 1.0
   * - dataCleanupBatch.standard = defaultBatchSize * 100
   *
   * 环境推荐值：
   * - 开发环境：10
   * - 测试环境：5
   * - 生产环境：20
   *
   * 环境变量：MONITORING_DEFAULT_BATCH_SIZE
   */
  @IsNumber({}, { message: "默认批量大小必须是数字" })
  @Min(1, { message: "默认批量大小最小值为1" })
  @Max(1000, { message: "默认批量大小最大值为1000" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 10 : parsed;
  })
  defaultBatchSize: number = 10;

  /**
   * API响应时间阈值（毫秒）
   *
   * 用途：API性能监控的基准响应时间
   * 适配逻辑：
   * - p95Warning = apiResponseGood * 1.0
   * - p99Critical = apiResponseGood * 2.5
   * - slowRequestThreshold = apiResponseGood * 2.0
   *
   * 环境推荐值：
   * - 开发环境：300毫秒
   * - 测试环境：100毫秒
   * - 生产环境：200毫秒
   *
   * 环境变量：MONITORING_API_RESPONSE_GOOD
   */
  @IsNumber({}, { message: "API响应时间阈值必须是数字" })
  @Min(50, { message: "API响应时间阈值最小值为50毫秒" })
  @Max(5000, { message: "API响应时间阈值最大值为5000毫秒" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 300 : parsed;
  })
  apiResponseGood: number = 300;

  /**
   * 缓存命中率阈值（0.0-1.0）
   *
   * 用途：缓存性能监控的基准命中率
   * 适配逻辑：
   * - hitRateThreshold = cacheHitThreshold
   * - cacheWarningThreshold = cacheHitThreshold - 0.1
   * - cacheEfficiencyThreshold = cacheHitThreshold - 0.2
   *
   * 环境推荐值：
   * - 开发环境：0.7
   * - 测试环境：0.5
   * - 生产环境：0.85
   *
   * 环境变量：MONITORING_CACHE_HIT_THRESHOLD
   */
  @IsNumber({}, { message: "缓存命中率阈值必须是数字" })
  @Min(0.1, { message: "缓存命中率阈值最小值为0.1" })
  @Max(1.0, { message: "缓存命中率阈值最大值为1.0" })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.8 : parsed;
  })
  cacheHitThreshold: number = 0.8;

  /**
   * 错误率阈值（0.0-1.0）
   *
   * 用途：系统错误监控的基准错误率
   * 适配逻辑：
   * - errorRateThreshold = errorRateThreshold
   * - warningErrorRate = errorRateThreshold * 0.5
   * - criticalErrorRate = errorRateThreshold * 2.0
   *
   * 环境推荐值：
   * - 开发环境：0.1
   * - 测试环境：0.2
   * - 生产环境：0.05
   *
   * 环境变量：MONITORING_ERROR_RATE_THRESHOLD
   */
  @IsNumber({}, { message: "错误率阈值必须是数字" })
  @Min(0.01, { message: "错误率阈值最小值为0.01" })
  @Max(0.5, { message: "错误率阈值最大值为0.5" })
  @Transform(({ value }) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0.1 : parsed;
  })
  errorRateThreshold: number = 0.1;

  /**
   * 自动分析功能开关
   *
   * 用途：控制所有自动分析和智能功能
   * 适配逻辑：
   * - enableAutoAnalysis = autoAnalysis
   * - enableTrendAnalysis = autoAnalysis
   * - enableAnomalyDetection = autoAnalysis
   * - enablePerformanceInsights = autoAnalysis
   *
   * 环境推荐值：
   * - 开发环境：true
   * - 测试环境：false
   * - 生产环境：true
   *
   * 环境变量：MONITORING_AUTO_ANALYSIS
   */
  @IsBoolean({ message: "自动分析开关必须是布尔值" })
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value !== "false" && value !== "0";
    }
    return Boolean(value);
  })
  autoAnalysis: boolean = true;

  /**
   * 事件重试次数
   *
   * 用途：所有事件处理的基础重试次数
   * 适配逻辑：
   * - eventRetry.maxRetryAttempts = eventRetry
   * - alertRetryAttempts = eventRetry
   * - notificationRetryAttempts = eventRetry
   * - dataProcessingRetry = eventRetry
   *
   * 环境推荐值：
   * - 开发环境：3
   * - 测试环境：1
   * - 生产环境：5
   *
   * 环境变量：MONITORING_EVENT_RETRY
   */
  @IsNumber({}, { message: "事件重试次数必须是数字" })
  @Min(0, { message: "事件重试次数最小值为0" })
  @Max(10, { message: "事件重试次数最大值为10" })
  @Transform(({ value }) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 3 : parsed;
  })
  eventRetry: number = 3;

  /**
   * 命名空间前缀
   *
   * 用途：所有监控数据的统一命名空间
   * 适配逻辑：
   * - cacheNamespace = namespace
   * - keyIndexPrefix = namespace + ':index'
   * - alertNamespace = namespace + ':alerts'
   * - metricsNamespace = namespace + ':metrics'
   *
   * 环境推荐值：
   * - 开发环境：monitoring_dev
   * - 测试环境：monitoring_test
   * - 生产环境：monitoring_prod
   *
   * 环境变量：MONITORING_NAMESPACE
   */
  @IsString({ message: "命名空间必须是字符串" })
  @Transform(({ value }) => value || "monitoring")
  namespace: string = "monitoring";

  /**
   * 根据环境调整配置
   */
  adjustForEnvironment(): void {
    const env = process.env.NODE_ENV || "development";

    switch (env) {
      case "production":
        // 生产环境：更长TTL，更大批量，更严格阈值
        this.defaultTtl = Math.max(this.defaultTtl, 600);
        this.defaultBatchSize = Math.max(this.defaultBatchSize, 20);
        this.apiResponseGood = Math.min(this.apiResponseGood, 200);
        this.cacheHitThreshold = Math.max(this.cacheHitThreshold, 0.85);
        this.errorRateThreshold = Math.min(this.errorRateThreshold, 0.05);
        this.eventRetry = Math.max(this.eventRetry, 5);
        this.namespace = this.namespace.includes("_")
          ? this.namespace
          : `${this.namespace}_prod`;
        break;

      case "test":
        // 测试环境：更短TTL，更小批量，更宽松阈值
        this.defaultTtl = Math.min(this.defaultTtl, 30);
        this.defaultBatchSize = Math.min(this.defaultBatchSize, 5);
        this.apiResponseGood = Math.min(this.apiResponseGood, 100);
        this.cacheHitThreshold = Math.min(this.cacheHitThreshold, 0.5);
        this.errorRateThreshold = Math.min(this.errorRateThreshold, 0.2);
        this.eventRetry = Math.min(this.eventRetry, 1);
        this.autoAnalysis = false; // 测试时禁用自动分析
        this.namespace = this.namespace.includes("_")
          ? this.namespace
          : `${this.namespace}_test`;
        break;

      default: // development
        // 开发环境：使用默认值或环境变量值
        this.namespace = this.namespace.includes("_")
          ? this.namespace
          : `${this.namespace}_dev`;
        break;
    }
  }

  /**
   * 验证配置的合理性
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证TTL合理性
    if (this.defaultTtl < 1 || this.defaultTtl > 3600) {
      errors.push("默认TTL必须在1-3600秒之间");
    }

    // 验证批量大小合理性
    if (this.defaultBatchSize < 1 || this.defaultBatchSize > 1000) {
      errors.push("默认批量大小必须在1-1000之间");
    }

    // 验证API响应时间合理性
    if (this.apiResponseGood < 50 || this.apiResponseGood > 5000) {
      errors.push("API响应时间阈值必须在50-5000毫秒之间");
    }

    // 验证缓存命中率合理性
    if (this.cacheHitThreshold < 0.1 || this.cacheHitThreshold > 1.0) {
      errors.push("缓存命中率阈值必须在0.1-1.0之间");
    }

    // 验证错误率合理性
    if (this.errorRateThreshold < 0.01 || this.errorRateThreshold > 0.5) {
      errors.push("错误率阈值必须在0.01-0.5之间");
    }

    // 验证重试次数合理性
    if (this.eventRetry < 0 || this.eventRetry > 10) {
      errors.push("事件重试次数必须在0-10之间");
    }

    // 验证命名空间格式
    if (
      !this.namespace ||
      this.namespace.length < 1 ||
      this.namespace.length > 50
    ) {
      errors.push("命名空间长度必须在1-50字符之间");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取TTL配置（基于默认TTL的倍数）
   */
  getTtlConfig(): {
    health: number;
    trend: number;
    performance: number;
    alert: number;
    cacheStats: number;
  } {
    return {
      health: this.defaultTtl, // 1.0x
      trend: Math.floor(this.defaultTtl * 2.0), // 2.0x
      performance: Math.floor(this.defaultTtl * 0.6), // 0.6x
      alert: Math.floor(this.defaultTtl * 0.2), // 0.2x
      cacheStats: Math.floor(this.defaultTtl * 0.4), // 0.4x
    };
  }

  /**
   * 获取批量配置（基于默认批量大小的倍数）
   */
  getBatchConfig(): {
    alertBatch: { small: number; medium: number; large: number };
    dataProcessingBatch: { standard: number; highFrequency: number };
    dataCleanupBatch: { standard: number };
  } {
    return {
      alertBatch: {
        small: Math.max(1, Math.floor(this.defaultBatchSize * 0.5)),
        medium: this.defaultBatchSize,
        large: this.defaultBatchSize * 2,
      },
      dataProcessingBatch: {
        standard: this.defaultBatchSize,
        highFrequency: this.defaultBatchSize * 5,
      },
      dataCleanupBatch: {
        standard: this.defaultBatchSize * 100,
      },
    };
  }

  /**
   * 获取性能阈值配置（基于API响应时间的倍数）
   */
  getPerformanceThresholds(): {
    p95Warning: number;
    p99Critical: number;
    slowRequestThreshold: number;
  } {
    return {
      p95Warning: this.apiResponseGood,
      p99Critical: Math.floor(this.apiResponseGood * 2.5),
      slowRequestThreshold: this.apiResponseGood * 2,
    };
  }

  /**
   * 获取缓存相关配置
   */
  getCacheConfig(): {
    namespace: string;
    keyIndexPrefix: string;
    hitRateThreshold: number;
    compressionThreshold: number;
  } {
    return {
      namespace: this.namespace,
      keyIndexPrefix: `${this.namespace}:index`,
      hitRateThreshold: this.cacheHitThreshold,
      compressionThreshold: 2048, // 固定值，不需要环境变量
    };
  }

  /**
   * 获取事件配置
   */
  getEventConfig(): {
    enableAutoAnalysis: boolean;
    retryAttempts: number;
    errorRateThreshold: number;
  } {
    return {
      enableAutoAnalysis: this.autoAnalysis,
      retryAttempts: this.eventRetry,
      errorRateThreshold: this.errorRateThreshold,
    };
  }
}

/**
 * 监控核心环境变量配置注册
 *
 * 用法：
 * ```typescript
 * // 在模块中导入
 * @Module({
 *   imports: [ConfigModule.forFeature(monitoringCoreEnvConfig)]
 * })
 *
 * // 在服务中注入
 * constructor(
 *   @Inject('monitoringCoreEnv')
 *   private readonly coreEnvConfig: MonitoringCoreEnvConfig
 * ) {}
 * ```
 */
export const monitoringCoreEnvConfig = registerAs(
  "monitoringCoreEnv",
  (): MonitoringCoreEnvConfig => {
    const rawConfig = {
      defaultTtl: process.env.MONITORING_DEFAULT_TTL,
      defaultBatchSize: process.env.MONITORING_DEFAULT_BATCH_SIZE,
      apiResponseGood: process.env.MONITORING_API_RESPONSE_GOOD,
      cacheHitThreshold: process.env.MONITORING_CACHE_HIT_THRESHOLD,
      errorRateThreshold: process.env.MONITORING_ERROR_RATE_THRESHOLD,
      autoAnalysis: process.env.MONITORING_AUTO_ANALYSIS,
      eventRetry: process.env.MONITORING_EVENT_RETRY,
      namespace: process.env.MONITORING_NAMESPACE,
    };

    // 使用 class-transformer 和 class-validator 进行转换和验证
    const config = plainToClass(MonitoringCoreEnvConfig, rawConfig, {
      enableImplicitConversion: true,
    });

    // 执行验证
    const errors = validateSync(config, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => Object.values(error.constraints || {}).join(", "))
        .join("; ");

      throw new Error(`监控核心环境变量配置验证失败: ${errorMessages}`);
    }

    // 根据环境调整配置
    config.adjustForEnvironment();

    // 验证最终配置的合理性
    const validation = config.validateConfiguration();
    if (!validation.isValid) {
      throw new Error(
        `监控核心环境变量配置不合理: ${validation.errors.join("; ")}`,
      );
    }

    return config;
  },
);

/**
 * 核心环境变量工具类
 * 🛠️ 提供环境变量配置的常用工具方法
 */
export class MonitoringCoreEnvUtils {
  /**
   * 获取所有核心环境变量的映射关系
   */
  static getEnvironmentVariableMapping(): Record<string, string> {
    return {
      defaultTtl: "MONITORING_DEFAULT_TTL",
      defaultBatchSize: "MONITORING_DEFAULT_BATCH_SIZE",
      apiResponseGood: "MONITORING_API_RESPONSE_GOOD",
      cacheHitThreshold: "MONITORING_CACHE_HIT_THRESHOLD",
      errorRateThreshold: "MONITORING_ERROR_RATE_THRESHOLD",
      autoAnalysis: "MONITORING_AUTO_ANALYSIS",
      eventRetry: "MONITORING_EVENT_RETRY",
      namespace: "MONITORING_NAMESPACE",
    };
  }

  /**
   * 获取统一环境变量系统的变更摘要
   */
  static getUnificationSummary(): {
    coreVariables: string[];
    totalReduced: number;
    reductionPercentage: number;
    benefits: string[];
  } {
    return {
      coreVariables: [
        "MONITORING_DEFAULT_TTL",
        "MONITORING_DEFAULT_BATCH_SIZE",
        "MONITORING_AUTO_ANALYSIS",
      ],
      totalReduced: 3, // 从多个变量简化为3个核心变量
      reductionPercentage: 70, // 约70%的环境变量减少
      benefits: [
        "配置复杂度大幅降低",
        "环境变量管理更简单",
        "基于倍数的自动计算",
        "环境特定的智能调优",
      ],
    };
  }

  /**
   * 根据环境获取推荐的配置值
   */
  static getRecommendedConfig(
    environment: "development" | "test" | "production",
  ): MonitoringCoreEnvConfig {
    const config = new MonitoringCoreEnvConfig();

    // 临时设置环境
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = environment;

    // 调整配置
    config.adjustForEnvironment();

    // 恢复原环境
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    return config;
  }

  /**
   * 验证环境变量值的合理性
   */
  static validateEnvironmentValue(
    key: string,
    value: string,
  ): { isValid: boolean; error?: string } {
    try {
      const config = new MonitoringCoreEnvConfig();
      const mapping = this.getEnvironmentVariableMapping();

      // 根据键名验证不同类型的值
      switch (key) {
        case "MONITORING_DEFAULT_TTL":
          const ttl = parseInt(value, 10);
          if (isNaN(ttl) || ttl < 1 || ttl > 3600) {
            return { isValid: false, error: "TTL必须是1-3600之间的数字" };
          }
          break;

        case "MONITORING_DEFAULT_BATCH_SIZE":
          const batch = parseInt(value, 10);
          if (isNaN(batch) || batch < 1 || batch > 1000) {
            return { isValid: false, error: "批量大小必须是1-1000之间的数字" };
          }
          break;

        case "MONITORING_API_RESPONSE_GOOD":
          const api = parseInt(value, 10);
          if (isNaN(api) || api < 50 || api > 5000) {
            return {
              isValid: false,
              error: "API响应时间必须是50-5000之间的数字",
            };
          }
          break;

        case "MONITORING_CACHE_HIT_THRESHOLD":
          const cache = parseFloat(value);
          if (isNaN(cache) || cache < 0.1 || cache > 1.0) {
            return {
              isValid: false,
              error: "缓存命中率必须是0.1-1.0之间的数字",
            };
          }
          break;

        case "MONITORING_ERROR_RATE_THRESHOLD":
          const error = parseFloat(value);
          if (isNaN(error) || error < 0.01 || error > 0.5) {
            return { isValid: false, error: "错误率必须是0.01-0.5之间的数字" };
          }
          break;

        case "MONITORING_AUTO_ANALYSIS":
          if (
            value !== "true" &&
            value !== "false" &&
            value !== "1" &&
            value !== "0"
          ) {
            return { isValid: false, error: "自动分析必须是true/false或1/0" };
          }
          break;

        case "MONITORING_EVENT_RETRY":
          const retry = parseInt(value, 10);
          if (isNaN(retry) || retry < 0 || retry > 10) {
            return { isValid: false, error: "重试次数必须是0-10之间的数字" };
          }
          break;

        case "MONITORING_NAMESPACE":
          if (!value || value.length < 1 || value.length > 50) {
            return { isValid: false, error: "命名空间长度必须在1-50字符之间" };
          }
          break;

        default:
          return { isValid: false, error: "未知的环境变量" };
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  }

  /**
   * 生成环境变量配置示例
   */
  static generateExampleConfig(
    environment: "development" | "test" | "production",
  ): string {
    const config = this.getRecommendedConfig(environment);

    return `# 监控组件统一环境变量配置 - ${environment.toUpperCase()}环境
# 统一配置系统：3个核心变量，自动计算所有监控参数

# 1. 基础TTL时间（秒）- 健康检查、趋势分析、性能指标等TTL自动计算
MONITORING_DEFAULT_TTL=${config.defaultTtl}

# 2. 基础批量大小 - 告警批量、数据处理批量、清理批量自动计算
MONITORING_DEFAULT_BATCH_SIZE=${config.defaultBatchSize}

# 3. 自动分析功能开关 - 控制所有智能分析和洞察功能
MONITORING_AUTO_ANALYSIS=${config.autoAnalysis}
`;
  }
}

/**
 * 监控核心环境变量配置类型导出
 */
export type MonitoringCoreEnvType = MonitoringCoreEnvConfig;

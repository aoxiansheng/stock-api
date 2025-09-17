/**
 * Common模块配置
 * 🏛️ Common层 - 通用可配置参数管理
 * 🎯 接收从constants文件中迁移出的可调节参数
 *
 * @description
 * 管理从core-values.constants.ts和validation.constants.ts中
 * 迁移出来的可配置参数，遵循四层配置体系标准
 *
 * @author Claude Code Assistant
 * @date 2025-01-16
 */

import { registerAs } from "@nestjs/config";
import {
  IsNumber,
  IsString,
  Min,
  Max,
  validateSync,
  IsOptional,
} from "class-validator";
import { plainToClass } from "class-transformer";

/**
 * Common模块配置验证类
 * 🔒 运行时类型安全和数值验证
 */
export class CommonConstantsConfigValidation {
  /**
   * 批量处理配置
   * 替换core-values.constants.ts中的BATCH_LIMITS
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "默认批量大小必须是有效数字" },
  )
  @Min(1, { message: "默认批量大小不能少于1" })
  @Max(10000, { message: "默认批量大小不能超过10000" })
  defaultBatchSize: number =
    parseInt(process.env.COMMON_DEFAULT_BATCH_SIZE, 10) || 100;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "最大批量大小必须是有效数字" },
  )
  @Min(100, { message: "最大批量大小不能少于100" })
  @Max(50000, { message: "最大批量大小不能超过50000" })
  maxBatchSize: number =
    parseInt(process.env.COMMON_MAX_BATCH_SIZE, 10) || 1000;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "默认分页大小必须是有效数字" },
  )
  @Min(1, { message: "默认分页大小不能少于1" })
  @Max(1000, { message: "默认分页大小不能超过1000" })
  defaultPageSize: number =
    parseInt(process.env.COMMON_DEFAULT_PAGE_SIZE, 10) || 10;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "最大分页大小必须是有效数字" },
  )
  @Min(10, { message: "最大分页大小不能少于10" })
  @Max(5000, { message: "最大分页大小不能超过5000" })
  maxPageSize: number = parseInt(process.env.COMMON_MAX_PAGE_SIZE, 10) || 100;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "最大并发数必须是有效数字" },
  )
  @Min(1, { message: "最大并发数不能少于1" })
  @Max(100, { message: "最大并发数不能超过100" })
  maxConcurrent: number = parseInt(process.env.COMMON_MAX_CONCURRENT, 10) || 10;

  /**
   * 超时配置
   * 替换core-values.constants.ts中的TIMEOUT_MS
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "快速超时必须是有效数字" },
  )
  @Min(1000, { message: "快速超时不能少于1000毫秒" })
  @Max(30000, { message: "快速超时不能超过30000毫秒" })
  quickTimeoutMs: number =
    parseInt(process.env.COMMON_QUICK_TIMEOUT_MS, 10) || 5000;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "默认超时必须是有效数字" },
  )
  @Min(5000, { message: "默认超时不能少于5000毫秒" })
  @Max(300000, { message: "默认超时不能超过300000毫秒" })
  defaultTimeoutMs: number =
    parseInt(process.env.COMMON_DEFAULT_TIMEOUT_MS, 10) || 30000;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "长超时必须是有效数字" },
  )
  @Min(30000, { message: "长超时不能少于30000毫秒" })
  @Max(600000, { message: "长超时不能超过600000毫秒" })
  longTimeoutMs: number =
    parseInt(process.env.COMMON_LONG_TIMEOUT_MS, 10) || 60000;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "连接超时必须是有效数字" },
  )
  @Min(1000, { message: "连接超时不能少于1000毫秒" })
  @Max(60000, { message: "连接超时不能超过60000毫秒" })
  connectionTimeoutMs: number =
    parseInt(process.env.COMMON_CONNECTION_TIMEOUT_MS, 10) || 5000;

  /**
   * 重试配置
   * 替换core-values.constants.ts中的RETRY
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "最大重试次数必须是有效数字" },
  )
  @Min(1, { message: "最大重试次数不能少于1" })
  @Max(20, { message: "最大重试次数不能超过20" })
  maxRetryAttempts: number =
    parseInt(process.env.COMMON_MAX_RETRY_ATTEMPTS, 10) || 3;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "退避基数必须是有效数字" },
  )
  @Min(1, { message: "退避基数不能少于1" })
  @Max(10, { message: "退避基数不能超过10" })
  backoffBase: number = parseInt(process.env.COMMON_BACKOFF_BASE, 10) || 2;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "最大重试延迟必须是有效数字" },
  )
  @Min(1000, { message: "最大重试延迟不能少于1000毫秒" })
  @Max(300000, { message: "最大重试延迟不能超过300000毫秒" })
  maxRetryDelayMs: number =
    parseInt(process.env.COMMON_MAX_RETRY_DELAY_MS, 10) || 10000;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "关键操作最大重试次数必须是有效数字" },
  )
  @Min(1, { message: "关键操作最大重试次数不能少于1" })
  @Max(10, { message: "关键操作最大重试次数不能超过10" })
  criticalMaxAttempts: number =
    parseInt(process.env.COMMON_CRITICAL_MAX_ATTEMPTS, 10) || 5;

  /**
   * 性能阈值配置
   * 替换core-values.constants.ts中的PERFORMANCE_MS
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "快速操作阈值必须是有效数字" },
  )
  @Min(10, { message: "快速操作阈值不能少于10毫秒" })
  @Max(1000, { message: "快速操作阈值不能超过1000毫秒" })
  fastOperationThresholdMs: number =
    parseInt(process.env.COMMON_FAST_OPERATION_THRESHOLD_MS, 10) || 100;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "正常操作阈值必须是有效数字" },
  )
  @Min(100, { message: "正常操作阈值不能少于100毫秒" })
  @Max(5000, { message: "正常操作阈值不能超过5000毫秒" })
  normalOperationThresholdMs: number =
    parseInt(process.env.COMMON_NORMAL_OPERATION_THRESHOLD_MS, 10) || 500;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "慢操作阈值必须是有效数字" },
  )
  @Min(500, { message: "慢操作阈值不能少于500毫秒" })
  @Max(30000, { message: "慢操作阈值不能超过30000毫秒" })
  slowOperationThresholdMs: number =
    parseInt(process.env.COMMON_SLOW_OPERATION_THRESHOLD_MS, 10) || 1000;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "非常慢操作阈值必须是有效数字" },
  )
  @Min(1000, { message: "非常慢操作阈值不能少于1000毫秒" })
  @Max(60000, { message: "非常慢操作阈值不能超过60000毫秒" })
  verySlowOperationThresholdMs: number =
    parseInt(process.env.COMMON_VERY_SLOW_OPERATION_THRESHOLD_MS, 10) || 5000;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "关键操作阈值必须是有效数字" },
  )
  @Min(5000, { message: "关键操作阈值不能少于5000毫秒" })
  @Max(300000, { message: "关键操作阈值不能超过300000毫秒" })
  criticalOperationThresholdMs: number =
    parseInt(process.env.COMMON_CRITICAL_OPERATION_THRESHOLD_MS, 10) || 10000;

  /**
   * 内存使用阈值配置
   * 替换core-values.constants.ts中的MEMORY_MB
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "低内存阈值必须是有效数字" },
  )
  @Min(10, { message: "低内存阈值不能少于10MB" })
  @Max(1000, { message: "低内存阈值不能超过1000MB" })
  lowMemoryThresholdMb: number =
    parseInt(process.env.COMMON_LOW_MEMORY_THRESHOLD_MB, 10) || 50;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "正常内存阈值必须是有效数字" },
  )
  @Min(50, { message: "正常内存阈值不能少于50MB" })
  @Max(2000, { message: "正常内存阈值不能超过2000MB" })
  normalMemoryThresholdMb: number =
    parseInt(process.env.COMMON_NORMAL_MEMORY_THRESHOLD_MB, 10) || 100;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "高内存阈值必须是有效数字" },
  )
  @Min(100, { message: "高内存阈值不能少于100MB" })
  @Max(8000, { message: "高内存阈值不能超过8000MB" })
  highMemoryThresholdMb: number =
    parseInt(process.env.COMMON_HIGH_MEMORY_THRESHOLD_MB, 10) || 200;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "严重内存阈值必须是有效数字" },
  )
  @Min(200, { message: "严重内存阈值不能少于200MB" })
  @Max(16000, { message: "严重内存阈值不能超过16000MB" })
  criticalMemoryThresholdMb: number =
    parseInt(process.env.COMMON_CRITICAL_MEMORY_THRESHOLD_MB, 10) || 500;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "最大对象大小必须是有效数字" },
  )
  @Min(1, { message: "最大对象大小不能少于1MB" })
  @Max(100, { message: "最大对象大小不能超过100MB" })
  maxObjectSizeMb: number =
    parseInt(process.env.COMMON_MAX_OBJECT_SIZE_MB, 10) || 10;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "最大请求大小必须是有效数字" },
  )
  @Min(1, { message: "最大请求大小不能少于1MB" })
  @Max(500, { message: "最大请求大小不能超过500MB" })
  maxRequestSizeMb: number =
    parseInt(process.env.COMMON_MAX_REQUEST_SIZE_MB, 10) || 50;

  /**
   * 连接池配置
   * 替换core-values.constants.ts中的CONNECTION_POOL
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "最小连接池大小必须是有效数字" },
  )
  @Min(1, { message: "最小连接池大小不能少于1" })
  @Max(50, { message: "最小连接池大小不能超过50" })
  minConnectionPoolSize: number =
    parseInt(process.env.COMMON_MIN_CONNECTION_POOL_SIZE, 10) || 5;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "最大连接池大小必须是有效数字" },
  )
  @Min(5, { message: "最大连接池大小不能少于5" })
  @Max(500, { message: "最大连接池大小不能超过500" })
  maxConnectionPoolSize: number =
    parseInt(process.env.COMMON_MAX_CONNECTION_POOL_SIZE, 10) || 20;

  /**
   * 大小限制配置
   * 替换core-values.constants.ts中的SIZES (除了协议标准)
   */
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "小尺寸限制必须是有效数字" },
  )
  @Min(10, { message: "小尺寸限制不能少于10" })
  @Max(200, { message: "小尺寸限制不能超过200" })
  smallSizeLimit: number =
    parseInt(process.env.COMMON_SMALL_SIZE_LIMIT, 10) || 50;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "中等尺寸限制必须是有效数字" },
  )
  @Min(50, { message: "中等尺寸限制不能少于50" })
  @Max(1000, { message: "中等尺寸限制不能超过1000" })
  mediumSizeLimit: number =
    parseInt(process.env.COMMON_MEDIUM_SIZE_LIMIT, 10) || 100;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "大尺寸限制必须是有效数字" },
  )
  @Min(100, { message: "大尺寸限制不能少于100" })
  @Max(5000, { message: "大尺寸限制不能超过5000" })
  largeSizeLimit: number =
    parseInt(process.env.COMMON_LARGE_SIZE_LIMIT, 10) || 500;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "巨大尺寸限制必须是有效数字" },
  )
  @Min(500, { message: "巨大尺寸限制不能少于500" })
  @Max(50000, { message: "巨大尺寸限制不能超过50000" })
  hugeSizeLimit: number =
    parseInt(process.env.COMMON_HUGE_SIZE_LIMIT, 10) || 1000;

  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "海量尺寸限制必须是有效数字" },
  )
  @Min(1000, { message: "海量尺寸限制不能少于1000" })
  @Max(500000, { message: "海量尺寸限制不能超过500000" })
  massiveSizeLimit: number =
    parseInt(process.env.COMMON_MASSIVE_SIZE_LIMIT, 10) || 10000;
}

/**
 * Common配置注册
 * 🎯 NestJS标准配置模式，支持依赖注入
 */
export default registerAs(
  "commonConstants",
  (): CommonConstantsConfigValidation => {
    const rawConfig = {
      // 批量处理配置
      defaultBatchSize:
        parseInt(process.env.COMMON_DEFAULT_BATCH_SIZE, 10) || 100,
      maxBatchSize: parseInt(process.env.COMMON_MAX_BATCH_SIZE, 10) || 1000,
      defaultPageSize: parseInt(process.env.COMMON_DEFAULT_PAGE_SIZE, 10) || 10,
      maxPageSize: parseInt(process.env.COMMON_MAX_PAGE_SIZE, 10) || 100,
      maxConcurrent: parseInt(process.env.COMMON_MAX_CONCURRENT, 10) || 10,

      // 超时配置
      quickTimeoutMs: parseInt(process.env.COMMON_QUICK_TIMEOUT_MS, 10) || 5000,
      defaultTimeoutMs:
        parseInt(process.env.COMMON_DEFAULT_TIMEOUT_MS, 10) || 30000,
      longTimeoutMs: parseInt(process.env.COMMON_LONG_TIMEOUT_MS, 10) || 60000,
      connectionTimeoutMs:
        parseInt(process.env.COMMON_CONNECTION_TIMEOUT_MS, 10) || 5000,

      // 重试配置
      maxRetryAttempts:
        parseInt(process.env.COMMON_MAX_RETRY_ATTEMPTS, 10) || 3,
      backoffBase: parseInt(process.env.COMMON_BACKOFF_BASE, 10) || 2,
      maxRetryDelayMs:
        parseInt(process.env.COMMON_MAX_RETRY_DELAY_MS, 10) || 10000,
      criticalMaxAttempts:
        parseInt(process.env.COMMON_CRITICAL_MAX_ATTEMPTS, 10) || 5,

      // 性能阈值配置
      fastOperationThresholdMs:
        parseInt(process.env.COMMON_FAST_OPERATION_THRESHOLD_MS, 10) || 100,
      normalOperationThresholdMs:
        parseInt(process.env.COMMON_NORMAL_OPERATION_THRESHOLD_MS, 10) || 500,
      slowOperationThresholdMs:
        parseInt(process.env.COMMON_SLOW_OPERATION_THRESHOLD_MS, 10) || 1000,
      verySlowOperationThresholdMs:
        parseInt(process.env.COMMON_VERY_SLOW_OPERATION_THRESHOLD_MS, 10) ||
        5000,
      criticalOperationThresholdMs:
        parseInt(process.env.COMMON_CRITICAL_OPERATION_THRESHOLD_MS, 10) ||
        10000,

      // 内存阈值配置
      lowMemoryThresholdMb:
        parseInt(process.env.COMMON_LOW_MEMORY_THRESHOLD_MB, 10) || 50,
      normalMemoryThresholdMb:
        parseInt(process.env.COMMON_NORMAL_MEMORY_THRESHOLD_MB, 10) || 100,
      highMemoryThresholdMb:
        parseInt(process.env.COMMON_HIGH_MEMORY_THRESHOLD_MB, 10) || 200,
      criticalMemoryThresholdMb:
        parseInt(process.env.COMMON_CRITICAL_MEMORY_THRESHOLD_MB, 10) || 500,
      maxObjectSizeMb:
        parseInt(process.env.COMMON_MAX_OBJECT_SIZE_MB, 10) || 10,
      maxRequestSizeMb:
        parseInt(process.env.COMMON_MAX_REQUEST_SIZE_MB, 10) || 50,

      // 连接池配置
      minConnectionPoolSize:
        parseInt(process.env.COMMON_MIN_CONNECTION_POOL_SIZE, 10) || 5,
      maxConnectionPoolSize:
        parseInt(process.env.COMMON_MAX_CONNECTION_POOL_SIZE, 10) || 20,

      // 大小限制配置
      smallSizeLimit: parseInt(process.env.COMMON_SMALL_SIZE_LIMIT, 10) || 50,
      mediumSizeLimit:
        parseInt(process.env.COMMON_MEDIUM_SIZE_LIMIT, 10) || 100,
      largeSizeLimit: parseInt(process.env.COMMON_LARGE_SIZE_LIMIT, 10) || 500,
      hugeSizeLimit: parseInt(process.env.COMMON_HUGE_SIZE_LIMIT, 10) || 1000,
      massiveSizeLimit:
        parseInt(process.env.COMMON_MASSIVE_SIZE_LIMIT, 10) || 10000,
    };

    const config = plainToClass(CommonConstantsConfigValidation, rawConfig);
    const errors = validateSync(config, { whitelist: true });

    if (errors.length > 0) {
      const errorMessages = errors
        .map((error) => Object.values(error.constraints || {}).join(", "))
        .join("; ");
      throw new Error(`Common配置验证失败: ${errorMessages}`);
    }

    return config;
  },
);

/**
 * 类型导出
 */
export type CommonConstantsConfig = CommonConstantsConfigValidation;

/**
 * Common配置助手类
 * 🛠️ 提供便捷的配置访问和建议方法
 */
export class CommonConfigHelper {
  /**
   * 根据数据大小获取推荐批量大小
   */
  static getRecommendedBatchSize(dataSize: number): number {
    const config = new CommonConstantsConfigValidation();

    if (dataSize < 1000) {
      return Math.min(config.defaultBatchSize, dataSize);
    } else if (dataSize < 10000) {
      return Math.min(config.maxBatchSize / 2, dataSize);
    } else {
      return config.maxBatchSize;
    }
  }

  /**
   * 根据操作类型获取推荐超时时间
   */
  static getRecommendedTimeout(
    operationType: "quick" | "normal" | "long" | "connection",
  ): number {
    const config = new CommonConstantsConfigValidation();

    switch (operationType) {
      case "quick":
        return config.quickTimeoutMs;
      case "normal":
        return config.defaultTimeoutMs;
      case "long":
        return config.longTimeoutMs;
      case "connection":
        return config.connectionTimeoutMs;
      default:
        return config.defaultTimeoutMs;
    }
  }

  /**
   * 根据内存使用量获取建议
   */
  static getMemoryUsageAdvice(currentMemoryMb: number): {
    level: string;
    advice: string;
  } {
    const config = new CommonConstantsConfigValidation();

    if (currentMemoryMb <= config.lowMemoryThresholdMb) {
      return { level: "normal", advice: "内存使用正常" };
    } else if (currentMemoryMb <= config.normalMemoryThresholdMb) {
      return { level: "moderate", advice: "内存使用适中，建议监控" };
    } else if (currentMemoryMb <= config.highMemoryThresholdMb) {
      return { level: "high", advice: "内存使用较高，建议优化" };
    } else if (currentMemoryMb <= config.criticalMemoryThresholdMb) {
      return { level: "critical", advice: "内存使用严重，需要立即处理" };
    } else {
      return { level: "emergency", advice: "内存使用超出阈值，系统可能不稳定" };
    }
  }

  /**
   * 验证配置合理性
   */
  static validateConfiguration(): { valid: boolean; issues: string[] } {
    const config = new CommonConstantsConfigValidation();
    const issues: string[] = [];

    // 检查批量配置合理性
    if (config.defaultBatchSize > config.maxBatchSize) {
      issues.push("默认批量大小不能大于最大批量大小");
    }

    if (config.defaultPageSize > config.maxPageSize) {
      issues.push("默认分页大小不能大于最大分页大小");
    }

    // 检查超时配置合理性
    if (config.quickTimeoutMs >= config.defaultTimeoutMs) {
      issues.push("快速超时应该小于默认超时");
    }

    if (config.defaultTimeoutMs >= config.longTimeoutMs) {
      issues.push("默认超时应该小于长超时");
    }

    // 检查内存阈值合理性
    if (config.lowMemoryThresholdMb >= config.normalMemoryThresholdMb) {
      issues.push("低内存阈值应该小于正常内存阈值");
    }

    if (config.normalMemoryThresholdMb >= config.highMemoryThresholdMb) {
      issues.push("正常内存阈值应该小于高内存阈值");
    }

    if (config.highMemoryThresholdMb >= config.criticalMemoryThresholdMb) {
      issues.push("高内存阈值应该小于严重内存阈值");
    }

    // 检查连接池配置合理性
    if (config.minConnectionPoolSize >= config.maxConnectionPoolSize) {
      issues.push("最小连接池大小应该小于最大连接池大小");
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}

/**
 * 配置文档和使用说明
 *
 * @example
 * ```typescript
 * // 在服务中注入使用
 * import { ConfigType } from '@nestjs/config';
 * import commonConstantsConfig from '@common/config/common-constants.config';
 *
 * @Injectable()
 * export class BatchService {
 *   constructor(
 *     @Inject(commonConstantsConfig.KEY)
 *     private readonly config: ConfigType<typeof commonConstantsConfig>,
 *   ) {}
 *
 *   async processBatch(data: any[]) {
 *     const batchSize = this.config.defaultBatchSize;
 *     const timeout = this.config.defaultTimeoutMs;
 *
 *     // 使用配置进行批处理
 *   }
 * }
 * ```
 *
 * @environment
 * ```bash
 * # .env文件配置 - Common模块统一使用COMMON_前缀
 * COMMON_DEFAULT_BATCH_SIZE=100                    # 默认批量大小
 * COMMON_MAX_BATCH_SIZE=1000                      # 最大批量大小
 * COMMON_DEFAULT_TIMEOUT_MS=30000                 # 默认超时(毫秒)
 * COMMON_MAX_RETRY_ATTEMPTS=3                     # 最大重试次数
 * COMMON_SLOW_OPERATION_THRESHOLD_MS=1000         # 慢操作阈值(毫秒)
 * COMMON_HIGH_MEMORY_THRESHOLD_MB=200             # 高内存阈值(MB)
 * COMMON_MAX_CONNECTION_POOL_SIZE=20              # 最大连接池大小
 * ```
 */

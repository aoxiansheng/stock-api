/**
 * 监控组件统一批量限制配置类
 *
 * 📋 职责边界：
 * ==========================================
 * 本文件统一管理所有监控组件的批量处理和限制配置，消除重复定义：
 *
 * ✅ 统一批量处理配置：
 * - 告警批量处理大小
 * - 数据收集批量大小
 * - 数据清理批量大小
 * - 事件处理批量大小
 * - 缓存操作批量大小
 *
 * ✅ 统一限制配置：
 * - 队列大小限制
 * - 缓冲区大小限制
 * - 处理频率限制
 * - 重试次数限制
 *
 * ✅ 环境变量支持：
 * - 支持通过环境变量覆盖默认值
 * - 提供生产/开发/测试环境的不同默认值
 *
 * ✅ 重构前后对比：
 * - 重构前：分散在多个文件的批量配置
 * - 重构后：1个基础批量变量，统一倍数计算
 *
 * @version 1.0.0
 * @since 2025-09-16
 * @author Claude Code
 */

import { IsNumber, Min, Max } from "class-validator";
import { Transform, Type } from "class-transformer";
import { registerAs } from "@nestjs/config";

/**
 * 告警批量处理配置
 * 🚨 统一管理告警相关的批量处理参数
 */
export class AlertBatchConfig {
  /**
   * 小批量告警大小
   * 用途：轻量级告警批量处理，减少延迟
   * 环境变量：MONITORING_DEFAULT_BATCH_SIZE (small = base ÷ 10)
   */
  @IsNumber({}, { message: "告警小批量大小必须是数字" })
  @Min(1, { message: "告警小批量大小最小值为1" })
  @Max(20, { message: "告警小批量大小最大值为20" })
  @Transform(({ value }) => parseInt(value, 10) || 5)
  small: number = 5;

  /**
   * 中等批量告警大小
   * 用途：常规告警批量处理，平衡效率和延迟
   * 环境变量：MONITORING_DEFAULT_BATCH_SIZE (medium = base ÷ 5)
   */
  @IsNumber({}, { message: "告警中批量大小必须是数字" })
  @Min(5, { message: "告警中批量大小最小值为5" })
  @Max(50, { message: "告警中批量大小最大值为50" })
  @Transform(({ value }) => parseInt(value, 10) || 10)
  medium: number = 10;

  /**
   * 大批量告警大小
   * 用途：高吞吐量告警处理，优化系统效率
   * 环境变量：MONITORING_DEFAULT_BATCH_SIZE (large = base ÷ 2.5)
   */
  @IsNumber({}, { message: "告警大批量大小必须是数字" })
  @Min(10, { message: "告警大批量大小最小值为10" })
  @Max(100, { message: "告警大批量大小最大值为100" })
  @Transform(({ value }) => parseInt(value, 10) || 20)
  large: number = 20;

  /**
   * 最大批量告警大小
   * 用途：系统负载高时的最大批量处理能力
   * 环境变量：MONITORING_DEFAULT_BATCH_SIZE (max = base × 1.0)
   */
  @IsNumber({}, { message: "告警最大批量大小必须是数字" })
  @Min(20, { message: "告警最大批量大小最小值为20" })
  @Max(200, { message: "告警最大批量大小最大值为200" })
  @Transform(({ value }) => parseInt(value, 10) || 50)
  max: number = 50;
}

/**
 * 数据处理批量配置
 * 📊 统一管理数据收集和处理的批量参数
 */
export class DataProcessingBatchConfig {
  /**
   * 数据收集标准批量大小
   * 用途：常规监控数据的批量收集
   * 环境变量：MONITORING_DEFAULT_BATCH_SIZE (standard = base ÷ 5)
   */
  @IsNumber({}, { message: "数据收集批量大小必须是数字" })
  @Min(1, { message: "数据收集批量大小最小值为1" })
  @Max(100, { message: "数据收集批量大小最大值为100" })
  @Transform(({ value }) => parseInt(value, 10) || 10)
  standard: number = 10;

  /**
   * 数据收集高频批量大小
   * 用途：高频监控数据的批量收集，提高吞吐量
   * 环境变量：MONITORING_DEFAULT_BATCH_SIZE (highFrequency = base × 2.0)
   */
  @IsNumber({}, { message: "高频数据批量大小必须是数字" })
  @Min(5, { message: "高频数据批量大小最小值为5" })
  @Max(200, { message: "高频数据批量大小最大值为200" })
  @Transform(({ value }) => parseInt(value, 10) || 50)
  highFrequency: number = 50;

  /**
   * 数据分析批量大小
   * 用途：趋势分析和复杂计算的批量处理
   * 环境变量：MONITORING_DEFAULT_BATCH_SIZE (analysis = base × 4.0)
   */
  @IsNumber({}, { message: "数据分析批量大小必须是数字" })
  @Min(10, { message: "数据分析批量大小最小值为10" })
  @Max(500, { message: "数据分析批量大小最大值为500" })
  @Transform(({ value }) => parseInt(value, 10) || 100)
  analysis: number = 100;

  /**
   * 最近指标采样数量
   * 用途：动态批处理统计中保留的最近指标样本数量
   * 环境变量：MONITORING_RECENT_METRICS_COUNT
   */
  @IsNumber({}, { message: "最近指标采样数量必须是数字" })
  @Min(1, { message: "最近指标采样数量最小值为1" })
  @Max(20, { message: "最近指标采样数量最大值为20" })
  @Transform(({ value }) => parseInt(value, 10) || 5)
  recentMetrics: number = 5;
}

/**
 * 数据清理批量配置
 * 🗑️ 统一管理数据清理和维护的批量参数
 */
export class DataCleanupBatchConfig {
  /**
   * 标准清理批量大小
   * 用途：常规数据清理操作
   * 环境变量：MONITORING_CLEANUP_BATCH_STANDARD
   */
  @IsNumber({}, { message: "标准清理批量大小必须是数字" })
  @Min(100, { message: "标准清理批量大小最小值为100" })
  @Max(5000, { message: "标准清理批量大小最大值为5000" })
  @Transform(({ value }) => parseInt(value, 10) || 1000)
  standard: number = 1000;

  /**
   * 大量清理批量大小
   * 用途：大规模数据清理，如历史数据归档
   * 环境变量：MONITORING_CLEANUP_BATCH_LARGE
   */
  @IsNumber({}, { message: "大量清理批量大小必须是数字" })
  @Min(1000, { message: "大量清理批量大小最小值为1000" })
  @Max(20000, { message: "大量清理批量大小最大值为20000" })
  @Transform(({ value }) => parseInt(value, 10) || 10000)
  large: number = 10000;

  /**
   * 小量清理批量大小
   * 用途：精确清理操作，减少对系统的影响
   * 环境变量：MONITORING_CLEANUP_BATCH_SMALL
   */
  @IsNumber({}, { message: "小量清理批量大小必须是数字" })
  @Min(10, { message: "小量清理批量大小最小值为10" })
  @Max(500, { message: "小量清理批量大小最大值为500" })
  @Transform(({ value }) => parseInt(value, 10) || 100)
  small: number = 100;
}

/**
 * 系统限制配置
 * ⚡ 统一管理系统性能和容量限制
 */
export class SystemLimitsConfig {
  /**
   * 最大队列大小
   * 用途：事件处理队列的最大容量
   * 环境变量：MONITORING_MAX_QUEUE_SIZE
   */
  @IsNumber({}, { message: "最大队列大小必须是数字" })
  @Min(1000, { message: "最大队列大小最小值为1000" })
  @Max(50000, { message: "最大队列大小最大值为50000" })
  @Transform(({ value }) => parseInt(value, 10) || 10000)
  maxQueueSize: number = 10000;

  /**
   * 最大缓冲区大小
   * 用途：事件收集器的最大缓冲区容量
   * 环境变量：MONITORING_MAX_BUFFER_SIZE
   */
  @IsNumber({}, { message: "最大缓冲区大小必须是数字" })
  @Min(100, { message: "最大缓冲区大小最小值为100" })
  @Max(5000, { message: "最大缓冲区大小最大值为5000" })
  @Transform(({ value }) => parseInt(value, 10) || 1000)
  maxBufferSize: number = 1000;

  /**
   * 最大重试次数
   * 用途：操作失败时的最大重试次数
   * 环境变量：MONITORING_MAX_RETRY_ATTEMPTS
   */
  @IsNumber({}, { message: "最大重试次数必须是数字" })
  @Min(1, { message: "最大重试次数最小值为1" })
  @Max(10, { message: "最大重试次数最大值为10" })
  @Transform(({ value }) => parseInt(value, 10) || 3)
  maxRetryAttempts: number = 3;

  /**
   * 最大并发处理数
   * 用途：同时处理的最大任务数量
   * 环境变量：MONITORING_MAX_CONCURRENT_PROCESSING
   */
  @IsNumber({}, { message: "最大并发处理数必须是数字" })
  @Min(1, { message: "最大并发处理数最小值为1" })
  @Max(100, { message: "最大并发处理数最大值为100" })
  @Transform(({ value }) => parseInt(value, 10) || 10)
  maxConcurrentProcessing: number = 10;
}

/**
 * 监控组件统一批量限制配置主类
 * 🎯 整合所有批量处理和限制配置
 */
export class MonitoringUnifiedLimitsConfig {
  /**
   * 告警批量处理配置
   */
  @Type(() => AlertBatchConfig)
  alertBatch: AlertBatchConfig = new AlertBatchConfig();

  /**
   * 数据处理批量配置
   */
  @Type(() => DataProcessingBatchConfig)
  dataProcessingBatch: DataProcessingBatchConfig =
    new DataProcessingBatchConfig();

  /**
   * 数据清理批量配置
   */
  @Type(() => DataCleanupBatchConfig)
  dataCleanupBatch: DataCleanupBatchConfig = new DataCleanupBatchConfig();

  /**
   * 系统限制配置
   */
  @Type(() => SystemLimitsConfig)
  systemLimits: SystemLimitsConfig = new SystemLimitsConfig();

  /**
   * 根据环境调整配置
   */
  adjustForEnvironment(): void {
    const env = process.env.NODE_ENV || "development";

    switch (env) {
      case "production":
        // 生产环境：增大批量大小，提高吞吐量
        this.alertBatch.medium = 15;
        this.alertBatch.large = 30;
        this.alertBatch.max = 100;
        this.dataProcessingBatch.standard = 20;
        this.dataProcessingBatch.highFrequency = 100;
        this.dataProcessingBatch.analysis = 200;
        this.systemLimits.maxQueueSize = 20000;
        this.systemLimits.maxBufferSize = 2000;
        this.systemLimits.maxConcurrentProcessing = 20;
        break;

      case "test":
        // 测试环境：减小批量大小，加快测试速度
        this.alertBatch.small = 2;
        this.alertBatch.medium = 5;
        this.alertBatch.large = 10;
        this.alertBatch.max = 20;
        this.dataProcessingBatch.standard = 3;
        this.dataProcessingBatch.highFrequency = 10;
        this.dataProcessingBatch.analysis = 20;
        this.dataCleanupBatch.standard = 100;
        this.dataCleanupBatch.large = 500;
        this.dataCleanupBatch.small = 10;
        this.systemLimits.maxQueueSize = 1000;
        this.systemLimits.maxBufferSize = 100;
        this.systemLimits.maxConcurrentProcessing = 3;
        break;

      default: // development
        // 开发环境：使用默认配置
        break;
    }
  }
}

/**
 * 监控统一批量限制配置注册
 *
 * 用法：
 * ```typescript
 * // 在模块中导入
 * @Module({
 *   imports: [ConfigModule.forFeature(monitoringUnifiedLimitsConfig)]
 * })
 *
 * // 在服务中注入
 * constructor(
 *   @Inject('monitoringUnifiedLimits')
 *   private readonly limitsConfig: MonitoringUnifiedLimitsConfig
 * ) {}
 * ```
 */
export const monitoringUnifiedLimitsConfig = registerAs(
  "monitoringUnifiedLimits",
  (): MonitoringUnifiedLimitsConfig => {
    // Phase 4: Environment Variable Optimization
    // 使用新的核心环境变量系统：MONITORING_DEFAULT_BATCH_SIZE 替代多个批量变量

    const config = new MonitoringUnifiedLimitsConfig();

    // 1. 优先检查新的核心环境变量
    const defaultBatchSize = process.env.MONITORING_DEFAULT_BATCH_SIZE
      ? parseInt(process.env.MONITORING_DEFAULT_BATCH_SIZE, 10)
      : 10;

    // 2. 应用核心环境变量的倍数逻辑
    if (!isNaN(defaultBatchSize)) {
      config.alertBatch.small = Math.max(1, Math.floor(defaultBatchSize * 0.5)); // 0.5x
      config.alertBatch.medium = defaultBatchSize; // 1.0x
      config.alertBatch.large = defaultBatchSize * 2; // 2.0x
      config.alertBatch.max = defaultBatchSize * 5; // 5.0x

      config.dataProcessingBatch.standard = defaultBatchSize; // 1.0x
      config.dataProcessingBatch.highFrequency = defaultBatchSize * 5; // 5.0x
      config.dataProcessingBatch.analysis = defaultBatchSize * 10; // 10.0x

      config.dataCleanupBatch.standard = defaultBatchSize * 100; // 100.0x
      config.dataCleanupBatch.large = defaultBatchSize * 1000; // 1000.0x
      config.dataCleanupBatch.small = Math.max(10, defaultBatchSize * 10); // 10.0x
    }

    // 根据环境调整配置
    config.adjustForEnvironment();

    return config;
  },
);

/**
 * 批量配置工具类
 * 🛠️ 提供批量配置的常用工具方法
 */
export class MonitoringLimitsUtils {
  /**
   * 根据数据量选择合适的批量大小
   */
  static selectBatchSize(
    dataCount: number,
    batchConfig: { small: number; medium: number; large: number; max?: number },
  ): number {
    if (dataCount <= batchConfig.small * 2) return batchConfig.small;
    if (dataCount <= batchConfig.medium * 5) return batchConfig.medium;
    if (dataCount <= batchConfig.large * 10) return batchConfig.large;
    return batchConfig.max || batchConfig.large;
  }

  /**
   * 计算批次数量
   */
  static calculateBatchCount(totalItems: number, batchSize: number): number {
    return Math.ceil(totalItems / batchSize);
  }

  /**
   * 验证批量大小是否在合理范围内
   */
  static isValidBatchSize(
    batchSize: number,
    min: number = 1,
    max: number = 1000,
  ): boolean {
    return batchSize >= min && batchSize <= max;
  }

  /**
   * 根据系统负载动态调整批量大小
   */
  static adjustBatchSizeForLoad(
    baseBatchSize: number,
    systemLoad: number, // 0-1 之间，1表示满负载
  ): number {
    const loadFactor = 1 - systemLoad * 0.5; // 负载越高，批量越小
    return Math.max(1, Math.floor(baseBatchSize * loadFactor));
  }

  /**
   * 获取推荐的批量处理间隔（毫秒）
   */
  static getRecommendedBatchInterval(batchSize: number): number {
    // 批量越大，间隔越长，避免系统过载
    if (batchSize <= 10) return 100;
    if (batchSize <= 50) return 200;
    if (batchSize <= 100) return 500;
    return 1000;
  }
}

/**
 * 监控批量限制配置类型导出
 */
export type MonitoringUnifiedLimitsType = MonitoringUnifiedLimitsConfig;
export type BatchSizeType = "small" | "medium" | "large" | "max";
export type ProcessingType = "alert" | "data" | "cleanup" | "analysis";

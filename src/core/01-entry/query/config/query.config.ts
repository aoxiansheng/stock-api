import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QUERY_TIMEOUT_CONFIG } from "../constants/query.constants";

// 统一错误处理基础设施
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";

/**
 * Query组件配置服务
 *
 * 负责管理Query组件的所有可配置参数，包括：
 * - 批量处理相关配置
 * - 超时控制配置
 * - 内存监控阈值配置
 * - 配置参数验证
 */
@Injectable()
export class QueryConfigService {
  constructor(private readonly configService: ConfigService) {
    // 初始化时进行配置验证
    this.validate();
  }

  // =============== 批量处理配置 ===============

  /** 单次Receiver请求的最大符号数 */
  get maxBatchSize(): number {
    return Number(this.configService.get("QUERY_MAX_BATCH_SIZE", 30));
  }

  /** 单个市场处理的最大符号数 */
  get maxMarketBatchSize(): number {
    return Number(this.configService.get("QUERY_MAX_MARKET_BATCH_SIZE", 100));
  }

  // =============== 超时控制配置 ===============

  /** 市场级并行处理超时时间（毫秒） */
  get marketParallelTimeout(): number {
    return Number(
      this.configService.get(
        "QUERY_MARKET_TIMEOUT",
        QUERY_TIMEOUT_CONFIG.QUERY_MS,
      ),
    );
  }

  /** Receiver批次超时时间（毫秒） */
  get receiverBatchTimeout(): number {
    return Number(
      this.configService.get(
        "QUERY_RECEIVER_TIMEOUT",
        QUERY_TIMEOUT_CONFIG.REALTIME_FETCH_MS,
      ),
    );
  }

  // =============== 内存监控配置 ===============

  /** 内存使用率警告阈值 (0.0-1.0) */
  get memoryWarningThreshold(): number {
    return Number(
      this.configService.get("QUERY_MEMORY_WARNING_THRESHOLD", 0.7),
    );
  }

  /** 内存使用率临界阈值 (0.0-1.0) */
  get memoryCriticalThreshold(): number {
    return Number(
      this.configService.get("QUERY_MEMORY_CRITICAL_THRESHOLD", 0.9),
    );
  }

  /** 内存压力下的批量大小降级比例 (0.0-1.0) */
  get memoryPressureReductionRatio(): number {
    return Number(this.configService.get("QUERY_MEMORY_REDUCTION_RATIO", 0.5));
  }

  // =============== 性能调优配置 ===============

  /** 是否启用内存垃圾回收优化 */
  get enableMemoryOptimization(): boolean {
    return this.configService.get("QUERY_ENABLE_MEMORY_OPTIMIZATION", false);
  }

  /** 垃圾回收触发间隔（处理符号数） */
  get gcTriggerInterval(): number {
    return Number(this.configService.get("QUERY_GC_TRIGGER_INTERVAL", 1000));
  }

  /**
   * 配置参数验证
   * 在服务初始化时调用，确保所有配置参数在合理范围内
   *
   * @throws Error 当配置参数不合理时抛出错误
   */
  validate(): void {
    // 批量大小验证
    if (this.maxBatchSize <= 0 || this.maxBatchSize > 1000) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'validate',
        message: `Invalid QUERY_MAX_BATCH_SIZE: ${this.maxBatchSize}. Must be between 1 and 1000.`,
        context: { configKey: 'QUERY_MAX_BATCH_SIZE', value: this.maxBatchSize, validRange: '1-1000' }
      });
    }

    if (this.maxMarketBatchSize <= 0 || this.maxMarketBatchSize > 2000) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'validate',
        message: `Invalid QUERY_MAX_MARKET_BATCH_SIZE: ${this.maxMarketBatchSize}. Must be between 1 and 2000.`,
        context: { configKey: 'QUERY_MAX_MARKET_BATCH_SIZE', value: this.maxMarketBatchSize, validRange: '1-2000' }
      });
    }

    if (this.maxMarketBatchSize < this.maxBatchSize) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'validate',
        message: `Invalid configuration: maxMarketBatchSize (${this.maxMarketBatchSize}) must be >= maxBatchSize (${this.maxBatchSize}).`,
        context: { configKey: 'batch_size_relationship', maxMarketBatchSize: this.maxMarketBatchSize, maxBatchSize: this.maxBatchSize }
      });
    }

    // 超时时间验证
    if (
      this.marketParallelTimeout <= 0 ||
      this.marketParallelTimeout > 300000
    ) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'validate',
        message: `Invalid QUERY_MARKET_TIMEOUT: ${this.marketParallelTimeout}. Must be between 1 and 300000ms (5 minutes).`,
        context: { configKey: 'QUERY_MARKET_TIMEOUT', value: this.marketParallelTimeout, validRange: '1-300000ms' }
      });
    }

    if (this.receiverBatchTimeout <= 0 || this.receiverBatchTimeout > 120000) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'validate',
        message: `Invalid QUERY_RECEIVER_TIMEOUT: ${this.receiverBatchTimeout}. Must be between 1 and 120000ms (2 minutes).`,
        context: { configKey: 'QUERY_RECEIVER_TIMEOUT', value: this.receiverBatchTimeout, validRange: '1-120000ms' }
      });
    }

    if (this.receiverBatchTimeout >= this.marketParallelTimeout) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'validate',
        message: `Invalid configuration: receiverBatchTimeout (${this.receiverBatchTimeout}) must be < marketParallelTimeout (${this.marketParallelTimeout}).`,
        context: { configKey: 'timeout_relationship', receiverBatchTimeout: this.receiverBatchTimeout, marketParallelTimeout: this.marketParallelTimeout }
      });
    }

    // 内存阈值验证
    if (
      this.memoryWarningThreshold < 0.1 ||
      this.memoryWarningThreshold > 0.95
    ) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'validate',
        message: `Invalid QUERY_MEMORY_WARNING_THRESHOLD: ${this.memoryWarningThreshold}. Must be between 0.1 and 0.95.`,
        context: { configKey: 'QUERY_MEMORY_WARNING_THRESHOLD', value: this.memoryWarningThreshold, validRange: '0.1-0.95' }
      });
    }

    if (
      this.memoryCriticalThreshold < 0.5 ||
      this.memoryCriticalThreshold > 0.99
    ) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'validate',
        message: `Invalid QUERY_MEMORY_CRITICAL_THRESHOLD: ${this.memoryCriticalThreshold}. Must be between 0.5 and 0.99.`,
        context: { configKey: 'QUERY_MEMORY_CRITICAL_THRESHOLD', value: this.memoryCriticalThreshold, validRange: '0.5-0.99' }
      });
    }

    if (this.memoryCriticalThreshold <= this.memoryWarningThreshold) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'validate',
        message: `Invalid configuration: memoryCriticalThreshold (${this.memoryCriticalThreshold}) must be > memoryWarningThreshold (${this.memoryWarningThreshold}).`,
        context: { configKey: 'memory_threshold_relationship', memoryCriticalThreshold: this.memoryCriticalThreshold, memoryWarningThreshold: this.memoryWarningThreshold }
      });
    }

    if (
      this.memoryPressureReductionRatio < 0.1 ||
      this.memoryPressureReductionRatio > 1.0
    ) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'validate',
        message: `Invalid QUERY_MEMORY_REDUCTION_RATIO: ${this.memoryPressureReductionRatio}. Must be between 0.1 and 1.0.`,
        context: { configKey: 'QUERY_MEMORY_REDUCTION_RATIO', value: this.memoryPressureReductionRatio, validRange: '0.1-1.0' }
      });
    }

    // 性能调优参数验证
    if (this.gcTriggerInterval <= 0 || this.gcTriggerInterval > 10000) {
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.QUERY,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'validate',
        message: `Invalid QUERY_GC_TRIGGER_INTERVAL: ${this.gcTriggerInterval}. Must be between 1 and 10000.`,
        context: { configKey: 'QUERY_GC_TRIGGER_INTERVAL', value: this.gcTriggerInterval, validRange: '1-10000' }
      });
    }
  }

  /**
   * 获取配置摘要（用于日志记录）
   * @returns 配置摘要对象
   */
  getConfigSummary(): object {
    return {
      batch: {
        maxBatchSize: this.maxBatchSize,
        maxMarketBatchSize: this.maxMarketBatchSize,
      },
      timeout: {
        marketParallelTimeout: this.marketParallelTimeout,
        receiverBatchTimeout: this.receiverBatchTimeout,
      },
      memory: {
        warningThreshold: this.memoryWarningThreshold,
        criticalThreshold: this.memoryCriticalThreshold,
        reductionRatio: this.memoryPressureReductionRatio,
      },
      optimization: {
        enableMemoryOptimization: this.enableMemoryOptimization,
        gcTriggerInterval: this.gcTriggerInterval,
      },
    };
  }
}

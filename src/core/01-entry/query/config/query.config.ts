import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  readonly maxBatchSize = this.configService.get('QUERY_MAX_BATCH_SIZE', 50);

  /** 单个市场处理的最大符号数 */
  readonly maxMarketBatchSize = this.configService.get('QUERY_MAX_MARKET_BATCH_SIZE', 100);

  // =============== 超时控制配置 ===============
  
  /** 市场级并行处理超时时间（毫秒） */
  readonly marketParallelTimeout = this.configService.get('QUERY_MARKET_TIMEOUT', 30000);

  /** Receiver批次超时时间（毫秒） */
  readonly receiverBatchTimeout = this.configService.get('QUERY_RECEIVER_TIMEOUT', 15000);

  // =============== 内存监控配置 ===============
  
  /** 内存使用率警告阈值 (0.0-1.0) */
  readonly memoryWarningThreshold = this.configService.get('QUERY_MEMORY_WARNING_THRESHOLD', 0.7);

  /** 内存使用率临界阈值 (0.0-1.0) */
  readonly memoryCriticalThreshold = this.configService.get('QUERY_MEMORY_CRITICAL_THRESHOLD', 0.9);

  /** 内存压力下的批量大小降级比例 (0.0-1.0) */
  readonly memoryPressureReductionRatio = this.configService.get('QUERY_MEMORY_REDUCTION_RATIO', 0.5);

  // =============== 性能调优配置 ===============
  
  /** 是否启用内存垃圾回收优化 */
  readonly enableMemoryOptimization = this.configService.get('QUERY_ENABLE_MEMORY_OPTIMIZATION', false);

  /** 垃圾回收触发间隔（处理符号数） */
  readonly gcTriggerInterval = this.configService.get('QUERY_GC_TRIGGER_INTERVAL', 1000);

  /**
   * 配置参数验证
   * 在服务初始化时调用，确保所有配置参数在合理范围内
   * 
   * @throws Error 当配置参数不合理时抛出错误
   */
  validate(): void {
    // 批量大小验证
    if (this.maxBatchSize <= 0 || this.maxBatchSize > 1000) {
      throw new Error(`Invalid QUERY_MAX_BATCH_SIZE: ${this.maxBatchSize}. Must be between 1 and 1000.`);
    }

    if (this.maxMarketBatchSize <= 0 || this.maxMarketBatchSize > 2000) {
      throw new Error(`Invalid QUERY_MAX_MARKET_BATCH_SIZE: ${this.maxMarketBatchSize}. Must be between 1 and 2000.`);
    }

    if (this.maxMarketBatchSize < this.maxBatchSize) {
      throw new Error(`Invalid configuration: maxMarketBatchSize (${this.maxMarketBatchSize}) must be >= maxBatchSize (${this.maxBatchSize}).`);
    }

    // 超时时间验证
    if (this.marketParallelTimeout <= 0 || this.marketParallelTimeout > 300000) {
      throw new Error(`Invalid QUERY_MARKET_TIMEOUT: ${this.marketParallelTimeout}. Must be between 1 and 300000ms (5 minutes).`);
    }

    if (this.receiverBatchTimeout <= 0 || this.receiverBatchTimeout > 120000) {
      throw new Error(`Invalid QUERY_RECEIVER_TIMEOUT: ${this.receiverBatchTimeout}. Must be between 1 and 120000ms (2 minutes).`);
    }

    if (this.receiverBatchTimeout >= this.marketParallelTimeout) {
      throw new Error(`Invalid configuration: receiverBatchTimeout (${this.receiverBatchTimeout}) must be < marketParallelTimeout (${this.marketParallelTimeout}).`);
    }

    // 内存阈值验证
    if (this.memoryWarningThreshold < 0.1 || this.memoryWarningThreshold > 0.95) {
      throw new Error(`Invalid QUERY_MEMORY_WARNING_THRESHOLD: ${this.memoryWarningThreshold}. Must be between 0.1 and 0.95.`);
    }

    if (this.memoryCriticalThreshold < 0.5 || this.memoryCriticalThreshold > 0.99) {
      throw new Error(`Invalid QUERY_MEMORY_CRITICAL_THRESHOLD: ${this.memoryCriticalThreshold}. Must be between 0.5 and 0.99.`);
    }

    if (this.memoryCriticalThreshold <= this.memoryWarningThreshold) {
      throw new Error(`Invalid configuration: memoryCriticalThreshold (${this.memoryCriticalThreshold}) must be > memoryWarningThreshold (${this.memoryWarningThreshold}).`);
    }

    if (this.memoryPressureReductionRatio < 0.1 || this.memoryPressureReductionRatio > 1.0) {
      throw new Error(`Invalid QUERY_MEMORY_REDUCTION_RATIO: ${this.memoryPressureReductionRatio}. Must be between 0.1 and 1.0.`);
    }

    // 性能调优参数验证
    if (this.gcTriggerInterval <= 0 || this.gcTriggerInterval > 10000) {
      throw new Error(`Invalid QUERY_GC_TRIGGER_INTERVAL: ${this.gcTriggerInterval}. Must be between 1 and 10000.`);
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
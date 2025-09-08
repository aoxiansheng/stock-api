/**
 * 批处理应用层常量
 * 🏢 Application层 - 批处理相关的具体业务应用配置
 * 📋 基于Domain/Semantic层构建，专注于具体批处理业务场景
 * 🆕 从Unified层迁移，解决批处理配置重复定义问题
 */

import {
  BATCH_SIZE_SEMANTICS,
  BATCH_TIMEOUT_SEMANTICS,
  CONCURRENCY_SEMANTICS,
  HTTP_TIMEOUTS,
} from '../semantic';
import { CORE_VALUES } from '../foundation';

/**
 * 批处理应用配置
 * 🎯 整合Unified层BATCH_CONSTANTS，解决重复配置问题
 */
export const BATCH_APPLICATION_CONFIG = Object.freeze({
  // 默认批量配置 - 基于Semantic层
  DEFAULT_SETTINGS: {
    BATCH_SIZE: BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE, // 50 - 最优批量大小
    TIMEOUT_MS: BATCH_TIMEOUT_SEMANTICS.BASIC.STANDARD_BATCH_MS, // 正常处理超时
    CONCURRENCY: CONCURRENCY_SEMANTICS.BASIC.DEFAULT_WORKERS, // 默认并发
    PROCESSOR_CONCURRENCY: CORE_VALUES.QUANTITIES.THREE,        // 处理器并发数
    CHUNK_PROCESSING_DELAY_MS: CORE_VALUES.QUANTITIES.HUNDRED,  // 块处理延迟
  },

  // 业务场景特定批量配置 - 基于Foundation层数值
  BUSINESS_SCENARIOS: {
    // 数据获取场景
    DATA_FETCHER: {
      DEFAULT_BATCH_SIZE: CORE_VALUES.QUANTITIES.TWENTY,        // 20 - 数据获取批量
      MAX_BATCH_SIZE: CORE_VALUES.QUANTITIES.FIFTY,             // 50 - 最大批量
      MAX_CONCURRENT_REQUESTS: CORE_VALUES.QUANTITIES.TEN,      // 10 - 最大并发请求
      TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS,                // 快速请求超时
      EXPLANATION: "数据获取场景使用较小批量，避免API限流",
    },

    // 接收器场景
    RECEIVER: {
      DEFAULT_BATCH_SIZE: CORE_VALUES.QUANTITIES.HUNDRED,       // 100 - 接收器标准批量
      MAX_BATCH_SIZE: CORE_VALUES.QUANTITIES.FIVE_HUNDRED,      // 500 - 接收器最大批量
      MAX_CONCURRENT_OPERATIONS: CORE_VALUES.QUANTITIES.TEN,    // 10 - 最大并发操作
      TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS,              // 普通请求超时
      EXPLANATION: "接收器场景需要平衡吞吐量和响应时间",
    },

    // 存储操作场景
    STORAGE: {
      BULK_INSERT_SIZE: CORE_VALUES.QUANTITIES.FIVE_HUNDRED,    // 500 - 批量插入大小
      BULK_UPDATE_SIZE: CORE_VALUES.QUANTITIES.TWO_HUNDRED,     // 200 - 批量更新大小
      BULK_DELETE_SIZE: CORE_VALUES.QUANTITIES.HUNDRED,         // 100 - 批量删除大小
      MAX_TRANSACTION_SIZE: CORE_VALUES.QUANTITIES.THOUSAND,    // 1000 - 最大事务大小
      TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.SLOW_MS,                // 慢速请求超时
      EXPLANATION: "存储操作需要平衡性能和事务安全",
    },

    // 符号映射场景
    SYMBOL_MAPPER: {
      DEFAULT_BATCH_SIZE: CORE_VALUES.QUANTITIES.HUNDRED,       // 100 - 符号批量映射
      MAX_BATCH_SIZE: CORE_VALUES.QUANTITIES.THOUSAND,          // 1000 - 最大批量
      CACHE_BATCH_SIZE: CORE_VALUES.QUANTITIES.TWO_HUNDRED,     // 200 - 缓存批量操作大小
      TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS,              // 普通请求超时
      EXPLANATION: "符号映射需要考虑缓存命中率和内存使用",
    },

    // 转换器场景
    TRANSFORMER: {
      DEFAULT_BATCH_SIZE: CORE_VALUES.QUANTITIES.HUNDRED,       // 100 - 转换器标准批量
      MAX_BATCH_SIZE: CORE_VALUES.QUANTITIES.FIVE_HUNDRED,      // 500 - 转换器最大批量
      PARALLEL_PROCESSING: CORE_VALUES.QUANTITIES.FIVE,         // 5 - 并行处理数
      TIMEOUT_MS: BATCH_TIMEOUT_SEMANTICS.BASIC.STANDARD_BATCH_MS, // 正常处理超时
      EXPLANATION: "数据转换需要考虑CPU密集型操作的特点",
    },

    // 查询场景
    QUERY: {
      DEFAULT_BATCH_SIZE: CORE_VALUES.QUANTITIES.FIFTY,         // 50 - 查询标准批量
      MAX_BATCH_SIZE: CORE_VALUES.QUANTITIES.TWO_HUNDRED,       // 200 - 查询最大批量
      PARALLEL_QUERIES: CORE_VALUES.QUANTITIES.THREE,           // 3 - 并行查询数
      TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS,              // 普通请求超时
      EXPLANATION: "查询场景需要平衡数据库负载和响应时间",
    },

    // 流处理场景
    STREAM: {
      BUFFER_SIZE: CORE_VALUES.QUANTITIES.TWO_HUNDRED,          // 200 - 流缓冲大小
      MAX_BUFFER_SIZE: CORE_VALUES.QUANTITIES.THOUSAND,         // 1000 - 最大缓冲大小
      FLUSH_INTERVAL_MS: CORE_VALUES.TIME_MS.FIVE_SECONDS,      // 5秒 - 刷新间隔
      TIMEOUT_MS: HTTP_TIMEOUTS.CONNECTION.ESTABLISH_MS,        // 流连接超时
      EXPLANATION: "流处理需要考虑实时性和缓冲策略",
    },

    // 缓存场景
    CACHE: {
      PRELOAD_BATCH_SIZE: CORE_VALUES.QUANTITIES.FIFTY,         // 50 - 预加载批量大小
      EVICTION_BATCH_SIZE: CORE_VALUES.QUANTITIES.HUNDRED,      // 100 - 驱逐批量大小
      SYNC_BATCH_SIZE: CORE_VALUES.QUANTITIES.TWO_HUNDRED,      // 200 - 同步批量大小
      TIMEOUT_MS: BATCH_TIMEOUT_SEMANTICS.BASIC.QUICK_BATCH_MS,  // 快速处理超时
      EXPLANATION: "缓存操作需要优化内存使用和访问速度",
    },

    // 监控场景  
    MONITORING: {
      METRICS_BATCH_SIZE: CORE_VALUES.QUANTITIES.HUNDRED,       // 100 - 指标批量大小
      LOG_BATCH_SIZE: CORE_VALUES.QUANTITIES.FIFTY,             // 50 - 日志批量大小
      EVENT_BATCH_SIZE: CORE_VALUES.QUANTITIES.TWENTY,          // 20 - 事件批量大小
      TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS,                // 快速请求超时
      EXPLANATION: "监控数据需要快速处理，避免影响业务性能",
    },

    // 导入导出场景
    IMPORT_EXPORT: {
      IMPORT_BATCH_SIZE: CORE_VALUES.QUANTITIES.THOUSAND,       // 1000 - 导入批量大小
      EXPORT_BATCH_SIZE: CORE_VALUES.QUANTITIES.FIVE_THOUSAND,  // 5000 - 导出批量大小
      CHUNK_SIZE: CORE_VALUES.QUANTITIES.TEN_THOUSAND,          // 10000 - 块大小
      TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.SLOW_MS,                // 慢速请求超时
      EXPLANATION: "导入导出需要考虑大数据量处理和用户体验",
    },

    // 清理场景
    CLEANUP: {
      DELETE_BATCH_SIZE: CORE_VALUES.QUANTITIES.HUNDRED,        // 100 - 删除批量大小
      ARCHIVE_BATCH_SIZE: CORE_VALUES.QUANTITIES.FIVE_HUNDRED,  // 500 - 归档批量大小
      VACUUM_BATCH_SIZE: CORE_VALUES.QUANTITIES.THOUSAND,       // 1000 - 清理批量大小
      TIMEOUT_MS: BATCH_TIMEOUT_SEMANTICS.BASIC.LONG_BATCH_MS,   // 慢速处理超时
      EXPLANATION: "清理操作在非业务高峰期进行，可以使用较大批量",
    },
  },

  // 性能优化配置
  PERFORMANCE: {
    // 内存使用优化
    MEMORY_OPTIMIZATION: {
      MAX_MEMORY_USAGE_MB: CORE_VALUES.FILE_SIZE_BYTES.FIVE_HUNDRED_MB / (1024 * 1024), // 500MB
      GC_TRIGGER_THRESHOLD: CORE_VALUES.PERCENTAGES.THREE_QUARTERS, // 75% - GC触发阈值
      BUFFER_POOL_SIZE: CORE_VALUES.QUANTITIES.TEN,                 // 10 - 缓冲池大小
    },

    // CPU使用优化
    CPU_OPTIMIZATION: {
      MAX_CPU_USAGE_PERCENTAGE: CORE_VALUES.PERCENTAGES.THREE_QUARTERS, // 75% - 最大CPU使用率
      WORKER_THREADS: CONCURRENCY_SEMANTICS.RESOURCE_LIMITS.HIGH_RESOURCE.WORKERS,    // 高并发级别
      TASK_QUEUE_SIZE: CORE_VALUES.QUANTITIES.THOUSAND,                 // 1000 - 任务队列大小
    },

    // 网络优化
    NETWORK_OPTIMIZATION: {
      CONNECTION_POOL_SIZE: CONCURRENCY_SEMANTICS.RESOURCE_LIMITS.MEDIUM_RESOURCE.WORKERS, // 中等并发连接池
      KEEP_ALIVE_TIMEOUT_MS: HTTP_TIMEOUTS.CONNECTION.KEEP_ALIVE_MS,          // 保持连接超时
      REQUEST_BATCH_SIZE: CORE_VALUES.QUANTITIES.FIFTY,                      // 50 - 请求批量大小
    },
  },

  // 错误处理配置
  ERROR_HANDLING: {
    MAX_RETRY_ATTEMPTS: CORE_VALUES.QUANTITIES.THREE,           // 3 - 最大重试次数
    RETRY_DELAY_MS: CORE_VALUES.TIME_MS.ONE_SECOND,            // 1秒 - 重试延迟
    CIRCUIT_BREAKER_THRESHOLD: CORE_VALUES.QUANTITIES.FIVE,    // 5 - 熔断器阈值
    FALLBACK_BATCH_SIZE: CORE_VALUES.QUANTITIES.TEN,           // 10 - 降级批量大小
  },

  // 监控和度量配置
  MONITORING: {
    METRICS_COLLECTION_INTERVAL_MS: CORE_VALUES.TIME_MS.TEN_SECONDS, // 10秒 - 指标收集间隔
    PERFORMANCE_SAMPLE_RATE: CORE_VALUES.PERCENTAGES.QUARTER / 2.5,  // 10% - 性能采样率
    ERROR_REPORT_BATCH_SIZE: CORE_VALUES.QUANTITIES.TWENTY,         // 20 - 错误报告批量
    LOG_BUFFER_SIZE: CORE_VALUES.QUANTITIES.HUNDRED,                // 100 - 日志缓冲大小
  },
});

/**
 * 批处理应用工具函数
 * 🎯 Application层专用批处理工具
 */
export class BatchApplicationUtil {
  /**
   * 根据场景获取推荐的批处理配置
   */
  static getScenarioConfig(scenario: keyof typeof BATCH_APPLICATION_CONFIG.BUSINESS_SCENARIOS) {
    return BATCH_APPLICATION_CONFIG.BUSINESS_SCENARIOS[scenario];
  }

  /**
   * 根据数据量动态调整批量大小
   */
  static calculateOptimalBatchSize(
    totalItems: number,
    memoryLimitMB: number,
    targetProcessingTimeMs: number
  ): number {
    // 基于内存限制计算
    const memoryBasedSize = Math.floor(memoryLimitMB * CORE_VALUES.QUANTITIES.TEN);
    
    // 基于处理时间计算
    const timeBasedSize = Math.floor(targetProcessingTimeMs / CORE_VALUES.QUANTITIES.HUNDRED);
    
    // 基于总数据量计算
    const volumeBasedSize = Math.min(totalItems / CORE_VALUES.QUANTITIES.TEN, CORE_VALUES.QUANTITIES.THOUSAND);
    
    // 取最小值作为最优批量大小
    return Math.max(
      CORE_VALUES.QUANTITIES.ONE,
      Math.min(memoryBasedSize, timeBasedSize, volumeBasedSize)
    );
  }

  /**
   * 验证批处理配置
   */
  static validateBatchConfig(config: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!config.DEFAULT_BATCH_SIZE || config.DEFAULT_BATCH_SIZE < 1) {
      errors.push('默认批量大小必须大于0');
    }
    
    if (!config.MAX_BATCH_SIZE || config.MAX_BATCH_SIZE < config.DEFAULT_BATCH_SIZE) {
      errors.push('最大批量大小不能小于默认批量大小');
    }
    
    if (!config.TIMEOUT_MS || config.TIMEOUT_MS < CORE_VALUES.QUANTITIES.HUNDRED) {
      errors.push('超时时间必须至少100毫秒');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取场景推荐配置
   */
  static getRecommendationForDataVolume(itemCount: number) {
    if (itemCount <= CORE_VALUES.QUANTITIES.HUNDRED) {
      return BATCH_APPLICATION_CONFIG.BUSINESS_SCENARIOS.DATA_FETCHER;
    } else if (itemCount <= CORE_VALUES.QUANTITIES.THOUSAND) {
      return BATCH_APPLICATION_CONFIG.BUSINESS_SCENARIOS.RECEIVER;
    } else if (itemCount <= CORE_VALUES.QUANTITIES.TEN_THOUSAND) {
      return BATCH_APPLICATION_CONFIG.BUSINESS_SCENARIOS.STORAGE;
    } else {
      return BATCH_APPLICATION_CONFIG.BUSINESS_SCENARIOS.IMPORT_EXPORT;
    }
  }

  /**
   * 计算预估处理时间
   */
  static estimateProcessingTime(
    totalItems: number,
    batchSize: number,
    itemProcessingTimeMs: number
  ): number {
    const batches = Math.ceil(totalItems / batchSize);
    return batches * itemProcessingTimeMs;
  }
}

/**
 * 类型定义
 */
export type BatchApplicationConfig = typeof BATCH_APPLICATION_CONFIG;
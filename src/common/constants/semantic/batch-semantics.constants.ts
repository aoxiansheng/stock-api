/**
 * 批量处理语义常量
 * 🎯 Semantic层 - 批量处理相关的业务无关语义分类
 * 📦 基于Foundation层构建，解决MAX_BATCH_SIZE等重复定义问题
 */

import { CORE_VALUES, CORE_LIMITS, CORE_TIMEOUTS } from '../foundation';

/**
 * 批量大小语义配置
 * 🎯 解决MAX_BATCH_SIZE重复定义问题，统一批量大小配置
 */
export const BATCH_SIZE_SEMANTICS = Object.freeze({
  // 基础批量大小配置
  BASIC: {
    MIN_SIZE: CORE_LIMITS.BATCH_LIMITS.MIN_BATCH_SIZE,          // 1 - 最小批量大小
    DEFAULT_SIZE: CORE_LIMITS.BATCH_LIMITS.DEFAULT_BATCH_SIZE,  // 100 - 默认批量大小
    OPTIMAL_SIZE: CORE_LIMITS.BATCH_LIMITS.OPTIMAL_BATCH_SIZE,  // 50 - 最优批量大小
    MAX_SIZE: CORE_LIMITS.BATCH_LIMITS.MAX_BATCH_SIZE,          // 1000 - 最大批量大小 🎯
  },

  // 场景特定批量大小
  SCENARIO: {
    // 数据库操作
    DATABASE_INSERT: CORE_LIMITS.BATCH_LIMITS.OPTIMAL_BATCH_SIZE,     // 50 - 数据库插入
    DATABASE_UPDATE: CORE_VALUES.SIZES.SMALL / 2,                     // 25 - 数据库更新
    DATABASE_DELETE: CORE_VALUES.SIZES.SMALL / 5,                     // 10 - 数据库删除
    
    // API请求处理
    API_REQUEST_PROCESSING: CORE_LIMITS.BATCH_LIMITS.DEFAULT_BATCH_SIZE, // 100 - API请求处理
    API_RESPONSE_BATCH: CORE_LIMITS.BATCH_LIMITS.OPTIMAL_BATCH_SIZE,   // 50 - API响应批量
    
    // 文件操作
    FILE_READING: CORE_VALUES.SIZES.LARGE,                            // 500 - 文件读取
    FILE_WRITING: CORE_VALUES.SIZES.MEDIUM,                           // 100 - 文件写入
    FILE_PROCESSING: CORE_LIMITS.BATCH_LIMITS.OPTIMAL_BATCH_SIZE,     // 50 - 文件处理
    
    // 缓存操作
    CACHE_BATCH_GET: CORE_VALUES.SIZES.MEDIUM,                        // 100 - 缓存批量读取
    CACHE_BATCH_SET: CORE_LIMITS.BATCH_LIMITS.OPTIMAL_BATCH_SIZE,     // 50 - 缓存批量写入
    
    // 消息处理
    MESSAGE_PROCESSING: CORE_LIMITS.BATCH_LIMITS.DEFAULT_BATCH_SIZE,  // 100 - 消息处理
    NOTIFICATION_BATCH: CORE_VALUES.SIZES.SMALL,                      // 50 - 通知批量发送
  },

  // 性能优化分级批量大小
  PERFORMANCE: {
    MICRO_BATCH: CORE_VALUES.SIZES.TINY,                             // 6 - 微批量（超快处理）
    SMALL_BATCH: CORE_VALUES.SIZES.SMALL / 2,                        // 25 - 小批量（快速处理）
    MEDIUM_BATCH: CORE_LIMITS.BATCH_LIMITS.OPTIMAL_BATCH_SIZE,       // 50 - 中批量（平衡处理）
    LARGE_BATCH: CORE_LIMITS.BATCH_LIMITS.DEFAULT_BATCH_SIZE,        // 100 - 大批量（高吞吐）
    HUGE_BATCH: CORE_VALUES.SIZES.LARGE,                             // 500 - 巨批量（最大吞吐）
  },
});

/**
 * 并发语义配置
 * 🎯 统一并发控制配置，避免重复定义
 */
export const CONCURRENCY_SEMANTICS = Object.freeze({
  // 基础并发配置
  BASIC: {
    MIN_WORKERS: CORE_LIMITS.CONCURRENCY.MIN_WORKERS,          // 1 - 最小工作进程数
    DEFAULT_WORKERS: CORE_LIMITS.CONCURRENCY.DEFAULT_WORKERS,  // 6 - 默认工作进程数
    MAX_WORKERS: CORE_LIMITS.CONCURRENCY.MAX_WORKERS,          // 50 - 最大工作进程数
  },

  // 场景特定并发配置
  SCENARIO: {
    // I/O密集型操作
    IO_INTENSIVE: {
      WORKERS: CORE_VALUES.SIZES.SMALL,                        // 50 - I/O密集型工作进程
      QUEUE_SIZE: CORE_VALUES.SIZES.HUGE,                      // 1000 - I/O队列大小
    },
    
    // CPU密集型操作
    CPU_INTENSIVE: {
      WORKERS: CORE_VALUES.SIZES.TINY,                         // 6 - CPU密集型工作进程
      QUEUE_SIZE: CORE_VALUES.SIZES.MEDIUM,                    // 100 - CPU队列大小
    },
    
    // 网络请求
    NETWORK_REQUEST: {
      WORKERS: CORE_VALUES.SIZES.SMALL / 2,                    // 25 - 网络请求工作进程
      QUEUE_SIZE: CORE_VALUES.SIZES.LARGE,                     // 500 - 网络队列大小
    },
    
    // 数据库连接
    DATABASE_CONNECTION: {
      WORKERS: CORE_VALUES.SIZES.TINY,                         // 6 - 数据库连接工作进程
      QUEUE_SIZE: CORE_VALUES.SIZES.MEDIUM,                    // 100 - 数据库队列大小
    },
  },

  // 资源限制分级
  RESOURCE_LIMITS: {
    LOW_RESOURCE: {
      WORKERS: CORE_VALUES.QUANTITIES.TWO,                     // 2 - 低资源工作进程
      BATCH_SIZE: CORE_VALUES.SIZES.TINY,                      // 6 - 低资源批量大小
    },
    MEDIUM_RESOURCE: {
      WORKERS: CORE_LIMITS.CONCURRENCY.DEFAULT_WORKERS,        // 6 - 中等资源工作进程
      BATCH_SIZE: CORE_LIMITS.BATCH_LIMITS.OPTIMAL_BATCH_SIZE, // 50 - 中等资源批量大小
    },
    HIGH_RESOURCE: {
      WORKERS: CORE_VALUES.SIZES.SMALL / 2,                    // 25 - 高资源工作进程
      BATCH_SIZE: CORE_LIMITS.BATCH_LIMITS.DEFAULT_BATCH_SIZE, // 100 - 高资源批量大小
    },
  },
});

/**
 * 批量处理超时语义配置
 * 🎯 统一批量处理超时配置
 */
export const BATCH_TIMEOUT_SEMANTICS = Object.freeze({
  // 基础超时配置（毫秒）
  BASIC: {
    QUICK_BATCH_MS: CORE_TIMEOUTS.OPERATION.QUICK_MS,          // 1000ms - 快速批量处理
    STANDARD_BATCH_MS: CORE_TIMEOUTS.OPERATION.STANDARD_MS,    // 10000ms - 标准批量处理
    LONG_BATCH_MS: CORE_TIMEOUTS.OPERATION.LONG_RUNNING_MS,    // 60000ms - 长时间批量处理
    BACKGROUND_BATCH_MS: CORE_TIMEOUTS.OPERATION.BACKGROUND_MS, // 600000ms - 后台批量处理
  },

  // 场景特定超时（毫秒）
  SCENARIO: {
    DATABASE_BATCH_MS: CORE_TIMEOUTS.DATABASE.TRANSACTION_MS,  // 30000ms - 数据库批量操作
    API_BATCH_MS: CORE_TIMEOUTS.REQUEST.BATCH_MS,              // 300000ms - API批量请求
    FILE_BATCH_MS: CORE_VALUES.TIME_MS.TEN_MINUTES,            // 600000ms - 文件批量处理
    CACHE_BATCH_MS: CORE_TIMEOUTS.OPERATION.QUICK_MS * 5,      // 5000ms - 缓存批量操作
    NETWORK_BATCH_MS: CORE_TIMEOUTS.REQUEST.SLOW_MS * 2,       // 120000ms - 网络批量请求
  },

  // 批量大小相关超时策略（毫秒）
  SIZE_BASED: {
    MICRO_BATCH_MS: CORE_VALUES.TIME_MS.ONE_SECOND,            // 1000ms - 微批量超时
    SMALL_BATCH_MS: CORE_VALUES.TIME_MS.FIVE_SECONDS,          // 5000ms - 小批量超时
    MEDIUM_BATCH_MS: CORE_TIMEOUTS.OPERATION.STANDARD_MS,      // 10000ms - 中批量超时
    LARGE_BATCH_MS: CORE_VALUES.TIME_MS.THIRTY_SECONDS,        // 30000ms - 大批量超时
    HUGE_BATCH_MS: CORE_VALUES.TIME_MS.ONE_MINUTE,             // 60000ms - 巨批量超时
  },
});

/**
 * 批量处理策略语义
 * 🎯 统一批量处理策略配置
 */
export const BATCH_STRATEGY_SEMANTICS = Object.freeze({
  // 处理策略类型
  PROCESSING_STRATEGIES: {
    SEQUENTIAL: 'sequential',            // 顺序处理
    PARALLEL: 'parallel',               // 并行处理
    PIPELINE: 'pipeline',               // 流水线处理
    ADAPTIVE: 'adaptive',               // 自适应处理
  },

  // 错误处理策略
  ERROR_STRATEGIES: {
    FAIL_FAST: 'fail-fast',            // 快速失败
    FAIL_SAFE: 'fail-safe',            // 安全失败
    BEST_EFFORT: 'best-effort',        // 尽力而为
    RETRY_FAILED: 'retry-failed',      // 重试失败项
  },

  // 内存管理策略
  MEMORY_STRATEGIES: {
    FIXED_SIZE: 'fixed-size',           // 固定大小
    ADAPTIVE_SIZE: 'adaptive-size',     // 自适应大小
    MEMORY_AWARE: 'memory-aware',       // 内存感知
    STREAM_PROCESSING: 'stream-processing', // 流式处理
  },

  // 优先级策略
  PRIORITY_STRATEGIES: {
    FIFO: 'fifo',                      // 先进先出
    LIFO: 'lifo',                      // 后进先出
    PRIORITY_QUEUE: 'priority-queue',   // 优先级队列
    WEIGHTED_ROUND_ROBIN: 'weighted-round-robin', // 加权轮询
  },
});

/**
 * 批量处理配置模板
 * 🎯 提供预定义的批量处理配置模板
 */
export const BATCH_CONFIG_TEMPLATES = Object.freeze({
  // 高性能批量处理
  HIGH_PERFORMANCE: {
    batchSize: BATCH_SIZE_SEMANTICS.PERFORMANCE.LARGE_BATCH,
    concurrency: CONCURRENCY_SEMANTICS.RESOURCE_LIMITS.HIGH_RESOURCE.WORKERS,
    timeoutMs: BATCH_TIMEOUT_SEMANTICS.BASIC.STANDARD_BATCH_MS,
    strategy: BATCH_STRATEGY_SEMANTICS.PROCESSING_STRATEGIES.PARALLEL,
    errorHandling: BATCH_STRATEGY_SEMANTICS.ERROR_STRATEGIES.BEST_EFFORT,
  },

  // 高可靠批量处理
  HIGH_RELIABILITY: {
    batchSize: BATCH_SIZE_SEMANTICS.PERFORMANCE.MEDIUM_BATCH,
    concurrency: CONCURRENCY_SEMANTICS.BASIC.DEFAULT_WORKERS,
    timeoutMs: BATCH_TIMEOUT_SEMANTICS.BASIC.LONG_BATCH_MS,
    strategy: BATCH_STRATEGY_SEMANTICS.PROCESSING_STRATEGIES.SEQUENTIAL,
    errorHandling: BATCH_STRATEGY_SEMANTICS.ERROR_STRATEGIES.RETRY_FAILED,
  },

  // 资源节约批量处理
  RESOURCE_EFFICIENT: {
    batchSize: BATCH_SIZE_SEMANTICS.PERFORMANCE.SMALL_BATCH,
    concurrency: CONCURRENCY_SEMANTICS.RESOURCE_LIMITS.LOW_RESOURCE.WORKERS,
    timeoutMs: BATCH_TIMEOUT_SEMANTICS.BASIC.BACKGROUND_BATCH_MS,
    strategy: BATCH_STRATEGY_SEMANTICS.PROCESSING_STRATEGIES.ADAPTIVE,
    errorHandling: BATCH_STRATEGY_SEMANTICS.ERROR_STRATEGIES.FAIL_SAFE,
  },

  // 数据库批量操作
  DATABASE_BATCH: {
    batchSize: BATCH_SIZE_SEMANTICS.SCENARIO.DATABASE_INSERT,
    concurrency: CONCURRENCY_SEMANTICS.SCENARIO.DATABASE_CONNECTION.WORKERS,
    timeoutMs: BATCH_TIMEOUT_SEMANTICS.SCENARIO.DATABASE_BATCH_MS,
    strategy: BATCH_STRATEGY_SEMANTICS.PROCESSING_STRATEGIES.SEQUENTIAL,
    errorHandling: BATCH_STRATEGY_SEMANTICS.ERROR_STRATEGIES.FAIL_FAST,
  },

  // API批量请求
  API_BATCH: {
    batchSize: BATCH_SIZE_SEMANTICS.SCENARIO.API_REQUEST_PROCESSING,
    concurrency: CONCURRENCY_SEMANTICS.SCENARIO.NETWORK_REQUEST.WORKERS,
    timeoutMs: BATCH_TIMEOUT_SEMANTICS.SCENARIO.API_BATCH_MS,
    strategy: BATCH_STRATEGY_SEMANTICS.PROCESSING_STRATEGIES.PARALLEL,
    errorHandling: BATCH_STRATEGY_SEMANTICS.ERROR_STRATEGIES.BEST_EFFORT,
  },
});

/**
 * 批量处理语义工具函数
 */
export class BatchSemanticsUtil {
  /**
   * 根据数据量推荐批量大小
   */
  static getRecommendedBatchSize(totalItems: number): number {
    if (totalItems <= CORE_VALUES.SIZES.SMALL) {
      return BATCH_SIZE_SEMANTICS.PERFORMANCE.MICRO_BATCH;
    } else if (totalItems <= CORE_VALUES.SIZES.MEDIUM) {
      return BATCH_SIZE_SEMANTICS.PERFORMANCE.SMALL_BATCH;
    } else if (totalItems <= CORE_VALUES.SIZES.LARGE) {
      return BATCH_SIZE_SEMANTICS.PERFORMANCE.MEDIUM_BATCH;
    } else if (totalItems <= CORE_VALUES.SIZES.HUGE) {
      return BATCH_SIZE_SEMANTICS.PERFORMANCE.LARGE_BATCH;
    } else {
      return BATCH_SIZE_SEMANTICS.PERFORMANCE.HUGE_BATCH;
    }
  }

  /**
   * 根据操作类型推荐并发数
   */
  static getRecommendedConcurrency(operationType: 'io' | 'cpu' | 'network' | 'database'): number {
    const scenario = CONCURRENCY_SEMANTICS.SCENARIO;
    switch (operationType) {
      case 'io':
        return scenario.IO_INTENSIVE.WORKERS;
      case 'cpu':
        return scenario.CPU_INTENSIVE.WORKERS;
      case 'network':
        return scenario.NETWORK_REQUEST.WORKERS;
      case 'database':
        return scenario.DATABASE_CONNECTION.WORKERS;
      default:
        return CONCURRENCY_SEMANTICS.BASIC.DEFAULT_WORKERS;
    }
  }

  /**
   * 根据批量大小推荐超时时间
   */
  static getRecommendedTimeout(batchSize: number): number {
    if (batchSize <= BATCH_SIZE_SEMANTICS.PERFORMANCE.MICRO_BATCH) {
      return BATCH_TIMEOUT_SEMANTICS.SIZE_BASED.MICRO_BATCH_MS;
    } else if (batchSize <= BATCH_SIZE_SEMANTICS.PERFORMANCE.SMALL_BATCH) {
      return BATCH_TIMEOUT_SEMANTICS.SIZE_BASED.SMALL_BATCH_MS;
    } else if (batchSize <= BATCH_SIZE_SEMANTICS.PERFORMANCE.MEDIUM_BATCH) {
      return BATCH_TIMEOUT_SEMANTICS.SIZE_BASED.MEDIUM_BATCH_MS;
    } else if (batchSize <= BATCH_SIZE_SEMANTICS.PERFORMANCE.LARGE_BATCH) {
      return BATCH_TIMEOUT_SEMANTICS.SIZE_BASED.LARGE_BATCH_MS;
    } else {
      return BATCH_TIMEOUT_SEMANTICS.SIZE_BASED.HUGE_BATCH_MS;
    }
  }

  /**
   * 计算批次数量
   */
  static calculateBatchCount(totalItems: number, batchSize: number): number {
    return Math.ceil(totalItems / batchSize);
  }

  /**
   * 获取推荐的批量处理配置
   */
  static getRecommendedConfig(template: keyof typeof BATCH_CONFIG_TEMPLATES): typeof BATCH_CONFIG_TEMPLATES.HIGH_PERFORMANCE {
    return BATCH_CONFIG_TEMPLATES[template];
  }

  /**
   * 判断批量大小是否合理
   */
  static isValidBatchSize(batchSize: number): boolean {
    return batchSize >= BATCH_SIZE_SEMANTICS.BASIC.MIN_SIZE && 
           batchSize <= BATCH_SIZE_SEMANTICS.BASIC.MAX_SIZE;
  }
}

/**
 * 类型定义
 */
export type BatchSizeSemantics = typeof BATCH_SIZE_SEMANTICS;
export type ConcurrencySemantics = typeof CONCURRENCY_SEMANTICS;
export type BatchTimeoutSemantics = typeof BATCH_TIMEOUT_SEMANTICS;
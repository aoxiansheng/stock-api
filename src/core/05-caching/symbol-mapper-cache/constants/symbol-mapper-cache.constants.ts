import {
  CACHE_SHARED_TTL,
  CACHE_SHARED_INTERVALS,
  CACHE_SHARED_BATCH_SIZES
} from '../../common-cache';

/**
 * Symbol Mapper Cache 常量配置
 * 使用Common-cache的共享常量作为基础
 */
export const SYMBOL_MAPPER_CACHE_CONSTANTS = {
  // TTL配置 - 使用共享常量
  TTL: {
    PROVIDER_RULES_TTL_S: CACHE_SHARED_TTL.BATCH_QUERY_TTL_SECONDS, // 符号映射批次查询TTL
    SYMBOL_MAPPING_TTL_S: CACHE_SHARED_TTL.BATCH_QUERY_TTL_SECONDS, // 符号映射批次查询TTL
    BATCH_RESULT_TTL_S: CACHE_SHARED_TTL.NEAR_REAL_TIME_TTL_SECONDS, // 批量结果准实时
  },

  // 批次配置 - 使用共享批次大小
  BATCH: {
    DEFAULT_BATCH_SIZE: CACHE_SHARED_BATCH_SIZES.SYMBOL_MAPPING_BATCH_SIZE, // 符号映射批次
    LRU_SORT_BATCH_SIZE: 1000, // LRU排序批次（特有配置）
    MAX_CONCURRENT_OPERATIONS: CACHE_SHARED_BATCH_SIZES.MAX_CONCURRENT_OPERATIONS,
  },

  // 连接和重试配置 - 使用共享间隔
  CONNECTION: {
    MAX_RECONNECT_DELAY_MS: CACHE_SHARED_INTERVALS.GRACEFUL_SHUTDOWN_TIMEOUT_MS, // 最大重连延迟
    BASE_RETRY_DELAY_MS: 1000, // 基础重试延迟（特有配置）
    CONNECTION_TIMEOUT_MS: CACHE_SHARED_INTERVALS.CONNECTION_TIMEOUT_MS,
  },

  // 内存监控配置 - 使用共享间隔
  MEMORY: {
    CHECK_INTERVAL_MS: CACHE_SHARED_INTERVALS.HEALTH_CHECK_INTERVAL_MS, // 内存检查间隔
    CLEANUP_INTERVAL_MS: CACHE_SHARED_INTERVALS.CLEANUP_INTERVAL_MS, // 清理间隔
  },

  // 缓存键前缀
  KEYS: {
    PROVIDER_RULES: "sm:provider_rules",
    SYMBOL_MAPPING: "sm:symbol_mapping",
    BATCH_RESULT: "sm:batch_result",
  },

  // 事件类型
  EVENTS: {
    CACHE_HIT: "cache_hit",
    CACHE_MISS: "cache_miss",
    OPERATION_START: "operation_start",
    OPERATION_COMPLETE: "operation_complete",
    OPERATION_ERROR: "operation_error",
    CACHE_DISABLED: "cache_disabled",
  },
} as const;
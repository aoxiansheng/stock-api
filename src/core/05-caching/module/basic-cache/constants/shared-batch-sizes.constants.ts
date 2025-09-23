import { CACHE_BASE_VALUES } from './shared-base-values.constants';

/**
 * 缓存系统批处理大小配置常量
 * 基于性能考虑的批处理标准
 */
export const CACHE_SHARED_BATCH_SIZES = {
  // 通用批处理大小
  DEFAULT_BATCH_SIZE: CACHE_BASE_VALUES.SMALL_COUNT,               // 默认批次大小（10）
  SMALL_BATCH_SIZE: CACHE_BASE_VALUES.SMALL_COUNT,                 // 小批次（10）
  MEDIUM_BATCH_SIZE: CACHE_BASE_VALUES.MEDIUM_COUNT,               // 中批次（50）
  LARGE_BATCH_SIZE: CACHE_BASE_VALUES.LARGE_COUNT,                 // 大批次（100）

  // 专用场景批处理
  STREAM_BATCH_SIZE: CACHE_BASE_VALUES.EXTRA_LARGE_COUNT,          // 流数据批次（200）
  SYMBOL_MAPPING_BATCH_SIZE: CACHE_BASE_VALUES.MEDIUM_COUNT,       // 符号映射批次（50）
  DATA_MAPPING_BATCH_SIZE: CACHE_BASE_VALUES.LARGE_COUNT,          // 数据映射批次（100）

  // Redis操作批次
  REDIS_SCAN_COUNT: CACHE_BASE_VALUES.LARGE_COUNT,                 // Redis SCAN操作批次
  REDIS_DELETE_BATCH_SIZE: CACHE_BASE_VALUES.LARGE_COUNT,          // Redis批量删除大小

  // 并发控制
  MIN_CONCURRENT_OPERATIONS: 2,                                    // 最小并发操作数
  MAX_CONCURRENT_OPERATIONS: 16,                                   // 最大并发操作数
  DEFAULT_CONCURRENCY_LIMIT: CACHE_BASE_VALUES.SMALL_COUNT,        // 默认并发限制
} as const;
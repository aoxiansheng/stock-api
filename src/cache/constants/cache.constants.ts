/**
 * 缓存服务常量
 * 🎯 统一定义缓存相关的常量，确保系统一致性
 */

import { CACHE_CONSTANTS } from "../../common/constants/unified/unified-cache-config.constants";

/**
 * 缓存错误消息常量
 */
export const CACHE_ERROR_MESSAGES = Object.freeze({
  SET_FAILED: "缓存设置失败",
  GET_FAILED: "缓存获取失败",
  GET_OR_SET_FAILED: "带回调的缓存获取或设置失败",
  DELETE_FAILED: "缓存删除失败",
  PATTERN_DELETE_FAILED: "模式删除缓存失败",
  BATCH_GET_FAILED: "批量缓存获取失败",
  BATCH_SET_FAILED: "批量缓存设置失败",
  WARMUP_FAILED: "缓存预热失败",
  LOCK_RELEASE_FAILED: "释放锁失败",
  COMPRESSION_FAILED: "数据压缩失败",
  DECOMPRESSION_FAILED: "数据解压失败",
  SERIALIZATION_FAILED: "数据序列化失败",
  DESERIALIZATION_FAILED: "数据反序列化失败",
  HEALTH_CHECK_FAILED: "缓存健康检查失败",
  REDIS_CONNECTION_FAILED: "Redis连接失败",
  REDIS_PING_FAILED: "Redis PING 命令失败",
  MEMORY_USAGE_HIGH: "Redis 内存使用率超过90%",
  STATS_RETRIEVAL_FAILED: "获取缓存统计信息失败",
  INVALID_KEY_LENGTH: "缓存键长度无效",
} as const);

/**
 * 缓存警告消息常量
 */
export const CACHE_WARNING_MESSAGES = Object.freeze({
  CACHE_MISS: "缓存未命中",
  LOCK_ACQUISITION_FAILED: "获取锁失败",
  COMPRESSION_SKIPPED: "跳过数据压缩",
  MEMORY_USAGE_WARNING: "内存使用率较高",
  SLOW_OPERATION: "缓存操作响应较慢",
  HEALTH_CHECK_WARNING: "缓存健康检查异常",
  STATS_CLEANUP_WARNING: "缓存统计清理异常",
  LARGE_VALUE_WARNING: "缓存值较大",
  HIGH_MISS_RATE: "缓存未命中率较高",
  LOCK_TIMEOUT: "锁等待超时",
} as const);

/**
 * 缓存成功消息常量
 */
export const CACHE_SUCCESS_MESSAGES = Object.freeze({
  SET_SUCCESS: "缓存设置成功",
  GET_SUCCESS: "缓存获取成功",
  DELETE_SUCCESS: "缓存删除成功",
  BATCH_OPERATION_SUCCESS: "批量缓存操作成功",
  WARMUP_STARTED: "开始缓存预热",
  WARMUP_COMPLETED: "缓存预热完成",
  LOCK_ACQUIRED: "获取锁成功",
  LOCK_RELEASED: "释放锁成功",
  HEALTH_CHECK_PASSED: "缓存健康检查通过",
  STATS_CLEANUP_COMPLETED: "缓存统计清理完成",
  OPTIMIZATION_TASKS_STARTED: "缓存优化任务启动",
} as const);

/**
 * 缓存键常量
 * 注：更多通用键前缀请使用 CACHE_CONSTANTS.KEY_PREFIXES
 */
export const CACHE_KEYS = Object.freeze({
  STOCK_QUOTE: "stock:quote:",
  STOCK_BASIC_INFO: "stock:basic:",
  INDEX_QUOTE: "index:quote:",
  MARKET_STATUS: "market:status:",
  SYMBOL_MAPPING: "symbol:mapping:",
  DATA_MAPPING: "data:mapping:",
  LOCK_PREFIX: CACHE_CONSTANTS.KEY_PREFIXES.LOCK,
  HEALTH_CHECK_PREFIX: CACHE_CONSTANTS.KEY_PREFIXES.HEALTH,
} as const);

/**
 * 缓存TTL常量 - 模块特定TTL设置
 * 注：通用TTL设置请使用 CACHE_CONSTANTS.TTL_SETTINGS
 */
export const CACHE_TTL = Object.freeze({
  REALTIME_DATA: CACHE_CONSTANTS.TTL_SETTINGS.REALTIME_DATA_TTL,
  BASIC_INFO: CACHE_CONSTANTS.TTL_SETTINGS.BASIC_INFO_TTL,
  MARKET_STATUS: 60, // 1分钟
  MAPPING_RULES: CACHE_CONSTANTS.TTL_SETTINGS.MAPPING_CONFIG_TTL,
  DEFAULT: CACHE_CONSTANTS.TTL_SETTINGS.DEFAULT_TTL,
  LOCK_TTL: 30, // 30秒锁
  HEALTH_CHECK_TTL: CACHE_CONSTANTS.TTL_SETTINGS.HEALTH_CHECK_TTL,
} as const);

/**
 * 缓存操作常量
 */
export const CACHE_OPERATIONS = Object.freeze({
  SET: "set",
  GET: "get",
  GET_OR_SET: "getOrSet",
  MGET: "mget",
  MSET: "mset",
  DELETE: "del",
  PATTERN_DELETE: "delByPattern",
  WARMUP: "warmup",
  HEALTH_CHECK: "healthCheck",
  GET_STATS: "getStats",
  ACQUIRE_LOCK: "acquireLock",
  RELEASE_LOCK: "releaseLock",
  COMPRESS: "compress",
  DECOMPRESS: "decompress",
  SERIALIZE: "serialize",
  DESERIALIZE: "deserialize",
  UPDATE_METRICS: "updateCacheMetrics",
  CLEANUP_STATS: "cleanupStats",
  CHECK_AND_LOG_HEALTH: "checkAndLogHealth",
} as const);

/**
 * 缓存状态常量
 */
export const CACHE_STATUS = Object.freeze({
  HEALTHY: "healthy",
  WARNING: "warning",
  UNHEALTHY: "unhealthy",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  DEGRADED: "degraded",
} as const);

/**
 * 缓存性能指标常量
 */
export const CACHE_METRICS = Object.freeze({
  HITS: "cache_hits",
  MISSES: "cache_misses",
  HIT_RATE: "cache_hit_rate",
  MISS_RATE: "cache_miss_rate",
  MEMORY_USAGE: "cache_memory_usage",
  KEY_COUNT: "cache_key_count",
  AVERAGE_TTL: "cache_avg_ttl",
  OPERATION_DURATION: "cache_operation_duration",
  COMPRESSION_RATIO: "cache_compression_ratio",
  LOCK_WAIT_TIME: "cache_lock_wait_time",
  BATCH_SIZE: "cache_batch_size",
  ERROR_COUNT: "cache_error_count",
  SLOW_OPERATIONS: "cache_slow_operations",
} as const);

// 移除以下重复的常量，改为导出通用配置
export { CACHE_CONSTANTS };

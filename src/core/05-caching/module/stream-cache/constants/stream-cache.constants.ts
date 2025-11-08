import {
  CACHE_CORE_TTL,
  CACHE_CORE_INTERVALS,
  CACHE_CORE_BATCH_SIZES,
  CACHE_CORE_VALUES,
} from '@core/05-caching/foundation';

/**
 * 依赖注入 Token
 */
export const STREAM_CACHE_CONFIG_TOKEN = "STREAM_CACHE_CONFIG";
/**
 * 流缓存专用 Redis 客户端 Token（避免与basic-cache的客户端冲突）
 */
export const STREAM_CACHE_REDIS_CLIENT_TOKEN = "STREAM_CACHE_REDIS_CLIENT";

/**
 * 流缓存常量配置
 * 使用Common-cache的共享常量作为基础
 */

export const STREAM_CACHE_CONFIG = Object.freeze({
  // 缓存键前缀 - 使用统一命名规范（保持兼容）
  KEYS: Object.freeze({
    WARM_CACHE_PREFIX: "stream_cache_warm",
  }),
});

/**
 * 流缓存默认配置
 */
export const DEFAULT_STREAM_CACHE_CONFIG = {
  // 流缓存特有配置（统一：hot 毫秒、warm 秒）
  hotCacheTTL: CACHE_CORE_TTL.REAL_TIME_TTL_SECONDS * 1000,
  warmCacheTTL: CACHE_CORE_TTL.BATCH_QUERY_TTL_SECONDS,
  maxHotCacheSize: 1000,
  streamBatchSize: CACHE_CORE_BATCH_SIZES.STREAM_BATCH_SIZE,
  connectionTimeout: CACHE_CORE_INTERVALS.CONNECTION_TIMEOUT_MS,
  heartbeatInterval: CACHE_CORE_INTERVALS.HEARTBEAT_INTERVAL_MS,

  // 基础配置（与 ExtendedBaseCacheConfig 命名对齐）
  maxCacheSize: 1000,
  maxBatchSize: CACHE_CORE_BATCH_SIZES.STREAM_BATCH_SIZE,
  cleanupIntervalMs: CACHE_CORE_INTERVALS.CLEANUP_INTERVAL_MS,
  maxCleanupItems: CACHE_CORE_BATCH_SIZES.LARGE_BATCH_SIZE,
  memoryCleanupThreshold: CACHE_CORE_VALUES.DEFAULT_MEMORY_THRESHOLD,

  // 压缩配置
  compressionThreshold: CACHE_CORE_VALUES.DEFAULT_COMPRESSION_THRESHOLD,
  compressionEnabled: true,
  compressionDataType: "stream" as const,

  // 重试/阈值配置（最小化）
  slowOperationThresholdMs: 100,
  statsLogIntervalMs: CACHE_CORE_INTERVALS.STATS_LOG_INTERVAL_MS,
  maxRetryAttempts: 3,
  baseRetryDelayMs: 100,
  retryDelayMultiplier: 2,
  enableFallback: true,
};

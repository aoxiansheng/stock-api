import {
  CACHE_SHARED_TTL,
  CACHE_SHARED_INTERVALS,
  CACHE_SHARED_BATCH_SIZES
} from '../../common-cache';

/**
 * 流缓存常量配置
 * 使用Common-cache的共享常量作为基础
 */

export const STREAM_CACHE_CONFIG = {
  // TTL配置 - 使用共享常量
  TTL: {
    HOT_CACHE_TTL_S: CACHE_SHARED_TTL.REAL_TIME_TTL_SECONDS,
    WARM_CACHE_TTL_S: CACHE_SHARED_TTL.BATCH_QUERY_TTL_SECONDS,
  },

  // 容量配置 - 使用共享批次大小
  CAPACITY: {
    MAX_HOT_CACHE_SIZE: 1000,                                    // 流缓存特有
    MAX_BATCH_SIZE: CACHE_SHARED_BATCH_SIZES.STREAM_BATCH_SIZE,  // 使用流数据专用批次
  },

  // 清理配置 - 使用共享间隔
  CLEANUP: {
    INTERVAL_MS: CACHE_SHARED_INTERVALS.CLEANUP_INTERVAL_MS,
    MAX_CLEANUP_ITEMS: CACHE_SHARED_BATCH_SIZES.LARGE_BATCH_SIZE,
  },

  // 流缓存特有配置
  STREAM_SPECIFIC: {
    COMPRESSION_THRESHOLD_BYTES: 1024,        // 流数据压缩阈值
    CONNECTION_TIMEOUT_MS: CACHE_SHARED_INTERVALS.CONNECTION_TIMEOUT_MS,
    HEARTBEAT_INTERVAL_MS: CACHE_SHARED_INTERVALS.HEARTBEAT_INTERVAL_MS,
  },

  // 缓存键前缀 - 使用统一命名规范
  KEYS: {
    WARM_CACHE_PREFIX: "stream_cache_warm", // 统一命名: 模块_功能_类型
  },
} as const;

/**
 * 流缓存默认配置
 */
export const DEFAULT_STREAM_CACHE_CONFIG = {
  // 流缓存特有配置
  hotCacheTTL: STREAM_CACHE_CONFIG.TTL.HOT_CACHE_TTL_S,
  warmCacheTTL: STREAM_CACHE_CONFIG.TTL.WARM_CACHE_TTL_S,
  maxHotCacheSize: STREAM_CACHE_CONFIG.CAPACITY.MAX_HOT_CACHE_SIZE,
  streamBatchSize: STREAM_CACHE_CONFIG.CAPACITY.MAX_BATCH_SIZE,
  connectionTimeout: STREAM_CACHE_CONFIG.STREAM_SPECIFIC.CONNECTION_TIMEOUT_MS,
  heartbeatInterval: STREAM_CACHE_CONFIG.STREAM_SPECIFIC.HEARTBEAT_INTERVAL_MS,

  // 基础配置 - 使用共享常量
  defaultTTL: CACHE_SHARED_TTL.DEFAULT_TTL_SECONDS,
  minTTL: CACHE_SHARED_TTL.MIN_TTL_SECONDS,
  maxTTL: CACHE_SHARED_TTL.MAX_TTL_SECONDS,
  maxCacheSize: STREAM_CACHE_CONFIG.CAPACITY.MAX_HOT_CACHE_SIZE,
  maxBatchSize: STREAM_CACHE_CONFIG.CAPACITY.MAX_BATCH_SIZE,
  cleanupInterval: STREAM_CACHE_CONFIG.CLEANUP.INTERVAL_MS,
  maxCleanupItems: STREAM_CACHE_CONFIG.CLEANUP.MAX_CLEANUP_ITEMS,
  memoryCleanupThreshold: 0.85,

  // 压缩配置
  compressionThreshold: STREAM_CACHE_CONFIG.STREAM_SPECIFIC.COMPRESSION_THRESHOLD_BYTES,
  compressionEnabled: true,
  compressionDataType: "stream" as const,

  // 性能监控配置 - 使用共享间隔
  slowOperationThreshold: 100, // 慢操作阈值: 100ms
  statsLogInterval: CACHE_SHARED_INTERVALS.STATS_LOG_INTERVAL_MS,
  performanceMonitoring: true,
  verboseLogging: false,

  // 错误处理配置
  maxRetryAttempts: 3,
  retryBaseDelay: 100,
  retryDelayMultiplier: 2,
  enableFallback: true,
};

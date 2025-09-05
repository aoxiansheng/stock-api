/**
 * 流缓存常量配置
 */

export const STREAM_CACHE_CONFIG = {
  // TTL 配置 (毫秒/秒)
  TTL: {
    HOT_CACHE_MS: 5000, // Hot Cache: 5秒
    WARM_CACHE_SECONDS: 300, // Warm Cache: 5分钟
  },

  // 容量配置
  CAPACITY: {
    MAX_HOT_CACHE_SIZE: 1000, // Hot Cache 最大条目数
    MAX_BATCH_SIZE: 200, // 批量操作最大条目数
  },

  // 清理配置
  CLEANUP: {
    INTERVAL_MS: 30000, // 清理间隔: 30秒
    MAX_CLEANUP_ITEMS: 100, // 单次清理最大条目数
  },

  // 压缩配置 - 使用分级压缩策略
  COMPRESSION: {
    THRESHOLD_BYTES: 1024, // 流数据压缩阈值: 1KB (优先实时性)
    ENABLED: true, // 是否启用压缩
    STRATEGY: 'REALTIME', // 使用实时数据压缩策略
  },

  // 性能监控
  MONITORING: {
    SLOW_OPERATION_MS: 100, // 慢操作阈值: 100ms
    STATS_LOG_INTERVAL_MS: 60000, // 统计日志间隔: 1分钟
  },

  // 缓存键前缀 - 使用统一命名规范
  KEYS: {
    WARM_CACHE_PREFIX: "stream_cache_warm", // 统一命名: 模块_功能_类型
    HOT_CACHE_PREFIX: "stream_cache_hot",   // 优化: 去除冗余冒号
    LOCK_PREFIX: "stream_cache_lock",       // 一致性: 下划线分隔
  },
} as const;

/**
 * 流缓存默认配置
 */
export const DEFAULT_STREAM_CACHE_CONFIG = {
  hotCacheTTL: STREAM_CACHE_CONFIG.TTL.HOT_CACHE_MS,
  warmCacheTTL: STREAM_CACHE_CONFIG.TTL.WARM_CACHE_SECONDS,
  maxHotCacheSize: STREAM_CACHE_CONFIG.CAPACITY.MAX_HOT_CACHE_SIZE,
  cleanupInterval: STREAM_CACHE_CONFIG.CLEANUP.INTERVAL_MS,
  compressionThreshold: STREAM_CACHE_CONFIG.COMPRESSION.THRESHOLD_BYTES,
};

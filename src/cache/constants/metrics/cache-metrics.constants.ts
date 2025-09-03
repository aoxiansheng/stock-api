/**
 * 缓存指标常量
 * 🎯 符合开发规范指南 - 统一指标名称和标签定义
 * 提供Prometheus指标的标准化命名和配置
 */

export const CACHE_METRICS = Object.freeze({
  /**
   * 指标名称定义
   */
  NAMES: {
    HIT_RATE: "cache_hit_rate",
    MISS_RATE: "cache_miss_rate", 
    OPERATION_DURATION: "cache_operation_duration_seconds",
    OPERATION_COUNT: "cache_operation_total",
    ERROR_COUNT: "cache_error_total",
    CONNECTION_COUNT: "cache_connection_count",
    MEMORY_USAGE: "cache_memory_usage_bytes",
    KEY_COUNT: "cache_key_count",
    TTL_DISTRIBUTION: "cache_ttl_distribution_seconds",
  },
  
  /**
   * 指标标签
   */
  LABELS: {
    OPERATION: "operation",
    STATUS: "status", 
    ERROR_TYPE: "error_type",
    CACHE_TYPE: "cache_type",
    INSTANCE: "instance",
    PROVIDER: "provider",
  },
  
  /**
   * 指标值枚举
   */
  VALUES: {
    OPERATIONS: {
      GET: "get",
      SET: "set", 
      DELETE: "delete",
      MGET: "mget",
      MSET: "mset",
      HEALTH_CHECK: "health_check",
      COMPRESS: "compress",
      DECOMPRESS: "decompress",
    },
    
    STATUSES: {
      SUCCESS: "success",
      FAILED: "failed",
      TIMEOUT: "timeout",
    },
    
    ERROR_TYPES: {
      CONNECTION: "connection",
      TIMEOUT: "timeout",
      SERIALIZATION: "serialization",
      COMPRESSION: "compression",
      INVALID_KEY: "invalid_key",
    },
    
    CACHE_TYPES: {
      REDIS: "redis",
      MEMORY: "memory",
      HYBRID: "hybrid",
    }
  },
  
  /**
   * 指标配置
   */
  CONFIG: {
    HISTOGRAM_BUCKETS: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10],
    COLLECTION_INTERVAL: 30000, // 30 seconds
    RETENTION_PERIOD: 86400, // 24 hours
  }
} as const);

/**
 * 指标帮助信息
 */
export const CACHE_METRICS_HELP = Object.freeze({
  [CACHE_METRICS.NAMES.HIT_RATE]: "缓存命中率，表示缓存命中请求占总请求的百分比",
  [CACHE_METRICS.NAMES.MISS_RATE]: "缓存未命中率，表示缓存未命中请求占总请求的百分比", 
  [CACHE_METRICS.NAMES.OPERATION_DURATION]: "缓存操作执行时间分布，单位为秒",
  [CACHE_METRICS.NAMES.OPERATION_COUNT]: "缓存操作总数，按操作类型和状态分组",
  [CACHE_METRICS.NAMES.ERROR_COUNT]: "缓存错误总数，按错误类型分组",
  [CACHE_METRICS.NAMES.CONNECTION_COUNT]: "缓存连接数，表示当前活跃连接数量",
  [CACHE_METRICS.NAMES.MEMORY_USAGE]: "缓存内存使用量，单位为字节",
  [CACHE_METRICS.NAMES.KEY_COUNT]: "缓存键值总数，表示当前存储的键值对数量", 
  [CACHE_METRICS.NAMES.TTL_DISTRIBUTION]: "缓存TTL分布，表示不同TTL范围的键值数量",
} as const);
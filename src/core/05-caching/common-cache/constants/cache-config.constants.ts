/**
 * 统一缓存配置常量
 * 避免硬编码散落在各处，集中管理所有阈值和限制
 */
export const CACHE_CONFIG = {
  // ✅ 超时配置（ms毫秒）
  TIMEOUTS: {
    SINGLE_FLIGHT_TIMEOUT: 30000,        // 30s (ms) - single-flight超时
    REDIS_OPERATION_TIMEOUT: 5000,       // 5s (ms) - Redis操作超时
    FETCH_TIMEOUT: 30000,                // 30s (ms) - 回源超时
    CONNECTION_TIMEOUT: 3000,            // 3s (ms) - 连接超时
  },
  
  // ✅ 批量操作限制（条数）
  BATCH_LIMITS: {
    MAX_BATCH_SIZE: 100,                 // 100条 - API层批量上限
    PIPELINE_MAX_SIZE: 50,               // 50条 - Pipeline分段大小
    SINGLE_FLIGHT_MAX_SIZE: 1000,        // 1000条 - single-flight Map最大缓存
    MGET_OPTIMAL_SIZE: 20,               // 20条 - mget最佳批量大小
  },
  
  // ✅ 后台刷新配置（s秒）
  BACKGROUND_REFRESH: {
    THRESHOLD_SECONDS: 300,              // 300s (5分钟) - 后台刷新阈值
    DEDUP_WINDOW_MS: 60000,              // 60000ms (1分钟) - 去重窗口
    MAX_CONCURRENT: 10,                  // 10个 - 最大并发后台刷新数
    RETRY_DELAY_MS: 5000,                // 5000ms (5秒) - 重试延迟
  },
  
  // ✅ TTL配置（s秒）
  TTL: {
    DEFAULT_SECONDS: 3600,               // 3600s (1小时) - 默认TTL
    MIN_SECONDS: 30,                     // 30s - 最小TTL
    MAX_SECONDS: 86400,                  // 86400s (24小时) - 最大TTL
    NO_EXPIRE_DEFAULT: 31536000,         // 31536000s (365天) - pttl=-1时的默认值
    MARKET_OPEN_SECONDS: 300,            // 300s (5分钟) - 开市时TTL
    MARKET_CLOSED_SECONDS: 3600,         // 3600s (1小时) - 闭市时TTL
  },
  
  // ✅ 压缩配置（bytes字节）
  COMPRESSION: {
    THRESHOLD_BYTES: 10240,              // 10240bytes (10KB) - 压缩阈值
    SAVING_RATIO: 0.8,                   // 0.8 - 压缩节省比例
    ALGORITHM: 'gzip',                   // 压缩算法
    LEVEL: 6,                            // 压缩级别 (1-9)
  },

  // ✅ 内存管理配置
  MEMORY: {
    MAX_KEY_LENGTH: 512,                 // 512字符 - 最大键长度
    MAX_VALUE_SIZE_MB: 100,              // 100MB - 单个值最大大小
    CLEANUP_INTERVAL_MS: 300000,         // 300000ms (5分钟) - 清理间隔
    GC_THRESHOLD: 0.8,                   // 0.8 - 内存使用率阈值
  },

  // ✅ 连接池配置
  CONNECTION: {
    MAX_CONNECTIONS: 50,                 // 50个 - 最大连接数
    MIN_IDLE: 5,                         // 5个 - 最小空闲连接
    ACQUIRE_TIMEOUT_MS: 10000,           // 10000ms (10秒) - 获取连接超时
    IDLE_TIMEOUT_MS: 300000,             // 300000ms (5分钟) - 空闲超时
  },

  // ✅ 监控配置
  METRICS: {
    HISTOGRAM_BUCKETS: {
      // 缓存操作耗时分布（ms毫秒）
      CACHE_DURATION: [0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
      // TTL剩余时间分布（s秒）
      TTL_REMAINING: [30, 60, 120, 300, 600, 1200, 1800, 3600, 7200, 14400, 28800, 86400],
      // 批量操作大小分布（条数）
      BATCH_SIZE: [1, 5, 10, 20, 30, 50, 70, 100],
    },
    ALERT_THRESHOLDS: {
      ERROR_RATE: 0.01,                  // 1% - 错误率告警阈值
      LATENCY_P95_MS: 50,                // 50ms - P95延迟告警阈值
      HIT_RATE: 0.85,                    // 85% - 命中率告警阈值
      MEMORY_USAGE: 0.9,                 // 90% - 内存使用告警阈值
    },
  },

  // ✅ 重试配置
  RETRY: {
    MAX_ATTEMPTS: 3,                     // 3次 - 最大重试次数
    BASE_DELAY_MS: 1000,                 // 1000ms (1秒) - 基础延迟
    MAX_DELAY_MS: 10000,                 // 10000ms (10秒) - 最大延迟
    BACKOFF_MULTIPLIER: 2,               // 2倍 - 退避倍数
  },
} as const;

/**
 * 缓存策略配置
 */
export const CACHE_STRATEGIES = {
  // 实时数据策略
  REAL_TIME: {
    ttl: CACHE_CONFIG.TTL.MARKET_OPEN_SECONDS,
    backgroundRefreshThreshold: 60,       // 60s
    compression: false,
    priority: 'high',
  },
  
  // 近实时数据策略  
  NEAR_REAL_TIME: {
    ttl: CACHE_CONFIG.TTL.DEFAULT_SECONDS,
    backgroundRefreshThreshold: 300,      // 300s (5分钟)
    compression: true,
    priority: 'normal',
  },
  
  // 延迟数据策略
  DELAYED: {
    ttl: CACHE_CONFIG.TTL.MARKET_CLOSED_SECONDS,
    backgroundRefreshThreshold: 1800,     // 1800s (30分钟)
    compression: true,
    priority: 'low',
  },
  
  // 静态数据策略
  STATIC: {
    ttl: CACHE_CONFIG.TTL.MAX_SECONDS,
    backgroundRefreshThreshold: 43200,    // 43200s (12小时)
    compression: true,
    priority: 'low',
  },
} as const;

/**
 * 类型定义
 */
export type CacheStrategy = keyof typeof CACHE_STRATEGIES;
export type CacheOperation = keyof typeof CACHE_CONFIG.TIMEOUTS;
export type CompressionAlgorithm = typeof CACHE_CONFIG.COMPRESSION.ALGORITHM;
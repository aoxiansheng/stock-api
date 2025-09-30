/**
 * 缓存系统核心数值常量
 * 作为整个缓存体系的数值标准，消除魔法数字重复
 * 基于现有shared-base-values.constants.ts的统一整合
 */
export const CACHE_CORE_VALUES = {
  // === 基础时间单位（毫秒）===
  ONE_SECOND_MS: 1000,
  FIVE_SECONDS_MS: 5000,           // 统一 5秒标准
  TEN_SECONDS_MS: 10000,
  FIFTEEN_SECONDS_MS: 15000,       // 统一 15秒标准
  THIRTY_SECONDS_MS: 30000,        // 统一 30秒标准
  ONE_MINUTE_MS: 60000,
  FIVE_MINUTES_MS: 300000,         // 统一 5分钟标准

  // === 基础时间单位（秒）===
  FIVE_SECONDS: 5,
  THIRTY_SECONDS: 30,              // 统一 30秒标准
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,               // 统一 5分钟标准
  THIRTY_MINUTES: 1800,            // 统一 30分钟标准
  ONE_HOUR: 3600,
  ONE_DAY: 86400,

  // === 基础数量标准 ===
  SMALL_COUNT: 10,                 // 小批次标准
  MEDIUM_COUNT: 50,                // 中批次标准
  LARGE_COUNT: 100,                // 大批次标准
  EXTRA_LARGE_COUNT: 200,          // 特大批次标准

  // === 基础比例标准 ===
  LOW_THRESHOLD: 0.2,              // 低阈值标准
  MEDIUM_THRESHOLD: 0.5,           // 中等阈值标准
  HIGH_THRESHOLD: 0.8,             // 高阈值标准
  CRITICAL_THRESHOLD: 0.9,         // 严重阈值标准

  // === 缓存配置标准 ===
  DEFAULT_MAX_CACHE_SIZE: 1000,    // 默认最大缓存条目数
  DEFAULT_CLEANUP_PERCENTAGE: 0.25, // 默认清理百分比
  DEFAULT_MEMORY_THRESHOLD: 0.8,   // 默认内存阈值

  // === 重试和并发控制 ===
  MIN_CONCURRENT_OPERATIONS: 2,    // 最小并发操作数
  MAX_CONCURRENT_OPERATIONS: 16,   // 最大并发操作数
  DEFAULT_RETRY_ATTEMPTS: 3,       // 默认重试次数
  EXPONENTIAL_BACKOFF_BASE: 2,     // 指数退避基数

  // === 数据限制 ===
  MAX_KEY_LENGTH: 250,             // Redis键名长度限制
  MAX_VALUE_SIZE_BYTES: 512 * 1024 * 1024, // 最大值大小（512MB）
  DEFAULT_COMPRESSION_THRESHOLD: 1024, // 压缩阈值（1KB）

  // === 性能配置 ===
  PERFORMANCE_SAMPLE_SIZE: 100,    // 性能采样大小
  SLOW_OPERATION_THRESHOLD_MS: 1000, // 慢操作阈值（1秒）
  ERROR_RATE_ALERT_THRESHOLD: 0.01, // 错误率告警阈值（1%）
} as const;

/**
 * 缓存系统TTL配置常量
 * 基于业务场景的TTL标准化配置
 */
export const CACHE_CORE_TTL = {
  // === 业务场景TTL ===
  REAL_TIME_TTL_SECONDS: CACHE_CORE_VALUES.FIVE_SECONDS,           // 实时数据TTL
  NEAR_REAL_TIME_TTL_SECONDS: CACHE_CORE_VALUES.THIRTY_SECONDS,    // 准实时数据TTL
  BATCH_QUERY_TTL_SECONDS: CACHE_CORE_VALUES.FIVE_MINUTES,         // 批量查询TTL
  ARCHIVE_TTL_SECONDS: CACHE_CORE_VALUES.ONE_HOUR,                 // 归档数据TTL

  // === 市场状态相关TTL ===
  TRADING_HOURS_TTL_SECONDS: CACHE_CORE_VALUES.THIRTY_SECONDS,     // 交易时段TTL
  OFF_HOURS_TTL_SECONDS: CACHE_CORE_VALUES.THIRTY_MINUTES,         // 非交易时段TTL（30分钟）
  WEEKEND_TTL_SECONDS: CACHE_CORE_VALUES.ONE_HOUR,                 // 周末TTL

  // === 边界值TTL ===
  MIN_TTL_SECONDS: CACHE_CORE_VALUES.THIRTY_SECONDS,               // 最小TTL
  MAX_TTL_SECONDS: CACHE_CORE_VALUES.ONE_DAY,                      // 最大TTL
  DEFAULT_TTL_SECONDS: CACHE_CORE_VALUES.FIVE_MINUTES,             // 默认TTL
} as const;

/**
 * 缓存系统批处理配置常量
 * 基于性能考虑的批处理标准
 */
export const CACHE_CORE_BATCH_SIZES = {
  // === 通用批处理大小 ===
  DEFAULT_BATCH_SIZE: CACHE_CORE_VALUES.SMALL_COUNT,               // 默认批次大小（10）
  SMALL_BATCH_SIZE: CACHE_CORE_VALUES.SMALL_COUNT,                 // 小批次（10）
  MEDIUM_BATCH_SIZE: CACHE_CORE_VALUES.MEDIUM_COUNT,               // 中批次（50）
  LARGE_BATCH_SIZE: CACHE_CORE_VALUES.LARGE_COUNT,                 // 大批次（100）

  // === 专用场景批处理 ===
  STREAM_BATCH_SIZE: CACHE_CORE_VALUES.EXTRA_LARGE_COUNT,          // 流数据批次（200）
  SYMBOL_MAPPING_BATCH_SIZE: CACHE_CORE_VALUES.MEDIUM_COUNT,       // 符号映射批次（50）
  DATA_MAPPING_BATCH_SIZE: CACHE_CORE_VALUES.LARGE_COUNT,          // 数据映射批次（100）

  // === Redis操作批次 ===
  REDIS_SCAN_COUNT: CACHE_CORE_VALUES.LARGE_COUNT,                 // Redis SCAN操作批次
  REDIS_DELETE_BATCH_SIZE: CACHE_CORE_VALUES.LARGE_COUNT,          // Redis批量删除大小

  // === 并发控制 ===
  DEFAULT_CONCURRENCY_LIMIT: CACHE_CORE_VALUES.SMALL_COUNT,        // 默认并发限制
} as const;

/**
 * 缓存系统间隔时间配置常量
 * 统一系统运维相关的时间间隔配置
 */
export const CACHE_CORE_INTERVALS = {
  // === 清理操作间隔 ===
  CLEANUP_INTERVAL_MS: CACHE_CORE_VALUES.THIRTY_SECONDS_MS,        // 标准清理间隔
  MEMORY_CLEANUP_INTERVAL_MS: CACHE_CORE_VALUES.THIRTY_SECONDS_MS, // 内存清理间隔

  // === 健康检查间隔 ===
  HEALTH_CHECK_INTERVAL_MS: CACHE_CORE_VALUES.TEN_SECONDS_MS,      // 健康检查间隔
  HEARTBEAT_INTERVAL_MS: CACHE_CORE_VALUES.FIFTEEN_SECONDS_MS,     // 心跳间隔 (调整为15秒)

  // === 监控数据收集间隔 ===
  METRICS_COLLECTION_INTERVAL_MS: CACHE_CORE_VALUES.FIFTEEN_SECONDS_MS, // 监控指标收集（15秒）
  STATS_LOG_INTERVAL_MS: CACHE_CORE_VALUES.ONE_MINUTE_MS,          // 统计日志间隔

  // === 超时配置 ===
  OPERATION_TIMEOUT_MS: CACHE_CORE_VALUES.FIVE_SECONDS_MS,         // 通用操作超时
  CONNECTION_TIMEOUT_MS: 25000,                                    // 连接超时 (25秒，满足 < 30秒的测试要求)
  GRACEFUL_SHUTDOWN_TIMEOUT_MS: CACHE_CORE_VALUES.THIRTY_SECONDS_MS, // 优雅关闭超时
} as const;
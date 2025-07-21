/**
 * 性能监控常量
 * 🎯 统一定义性能监控相关的常量，确保系统一致性
 */

// 导入统一常量系统，避免重复定义
import { PERFORMANCE_CONSTANTS, CACHE_CONSTANTS } from '@common/constants/unified';

/**
 * Redis 键前缀常量
 */
export const PERFORMANCE_REDIS_KEYS = Object.freeze({
  METRICS_PREFIX: "metrics",
  ENDPOINT_STATS_PREFIX: "metrics:endpoint_stats",
  DB_QUERY_TIMES_KEY: "metrics:db_query_times",
  SYSTEM_METRICS_PREFIX: "metrics:system",
  CACHE_METRICS_PREFIX: "metrics:cache",
  AUTH_METRICS_PREFIX: "metrics:auth",
  RATE_LIMIT_METRICS_PREFIX: "metrics:rate_limit",
} as const);

/**
 * 时间间隔常量（毫秒）
 */
export const PERFORMANCE_INTERVALS = Object.freeze({
  FLUSH_INTERVAL: 10 * 1000,           // 10秒 - 指标刷新间隔
  CLEANUP_INTERVAL: 60 * 60 * 1000,    // 1小时 - 清理过期数据间隔
  SYSTEM_METRICS_INTERVAL: 30 * 1000,  // 30秒 - 系统指标收集间隔
  HEALTH_CHECK_INTERVAL: 60 * 1000,    // 1分钟 - 健康检查间隔
} as const);

/**
 * 缓冲区和限制常量
 */
export const PERFORMANCE_LIMITS = Object.freeze({
  MAX_METRIC_BUFFER_SIZE: 2000,              // 指标缓冲区最大大小
  MAX_DB_QUERY_TIMES: 1000,                  // 数据库查询时间记录最大数量
  MAX_RESPONSE_TIMES_PER_ENDPOINT: 500,      // 每个端点响应时间记录最大数量
  MAX_REDIS_KEY_SCAN_COUNT: 1000,            // Redis键扫描最大数量
  MAX_ALERT_BUFFER_SIZE: 100,                // 告警缓冲区最大大小
} as const);

/**
 * 性能阈值常量 - 使用统一常量系统
 * @deprecated 请直接使用 PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS 等
 */
export const PERFORMANCE_THRESHOLDS = PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS;

/**
 * TTL 常量（秒）- 使用统一常量系统
 */
export const PERFORMANCE_TTL = Object.freeze({
  ENDPOINT_STATS: CACHE_CONSTANTS.TTL_SETTINGS.STATS_TTL * 12,  // 1小时
  DB_QUERY_TIMES: CACHE_CONSTANTS.TTL_SETTINGS.LONG_TTL,        // 2小时
  SYSTEM_METRICS: CACHE_CONSTANTS.TTL_SETTINGS.DEFAULT_TTL,     // 1小时
  ALERT_HISTORY: 7 * 24 * 3600,              // 7天 - 告警历史TTL
  PERFORMANCE_SUMMARY: CACHE_CONSTANTS.TTL_SETTINGS.MEDIUM_TTL, // 30分钟
  HEALTH_STATUS: CACHE_CONSTANTS.TTL_SETTINGS.SHORT_TTL,        // 5分钟
} as const);

/**
 * 指标名称常量
 */
export const METRIC_NAMES = Object.freeze({
  // API 请求指标
  API_REQUEST_DURATION: "api_request_duration",
  API_REQUEST_TOTAL: "api_request_total",
  
  // 数据库指标
  DB_QUERY_DURATION: "db_query_duration",
  DB_CONNECTION_POOL_SIZE: "db_connection_pool_size",
  DB_ACTIVE_CONNECTIONS: "db_active_connections",
  
  // 缓存指标
  CACHE_OPERATION_TOTAL: "cache_operation_total",
  CACHE_OPERATION_DURATION: "cache_operation_duration",
  CACHE_HIT_RATE: "cache_hit_rate",
  
  // 认证指标
  AUTH_DURATION: "auth_duration",
  AUTH_TOTAL: "auth_total",
  
  // 频率限制指标
  RATE_LIMIT_CHECK: "rate_limit_check",
  RATE_LIMIT_REMAINING: "rate_limit_remaining",
  
  // 系统指标
  SYSTEM_CPU_USAGE: "system_cpu_usage",
  SYSTEM_MEMORY_USAGE: "system_memory_usage",
  SYSTEM_HEAP_USED: "system_heap_used",
  SYSTEM_UPTIME: "system_uptime",
  SYSTEM_EVENT_LOOP_LAG: "system_event_loop_lag",
  
  // 健康检查指标
  HEALTH_SCORE: "health_score",
  HEALTH_STATUS: "health_status",
} as const);

/**
 * 指标单位常量
 */
export const METRIC_UNITS = Object.freeze({
  MILLISECONDS: 'ms',
  SECONDS: 'seconds',
  BYTES: 'bytes',
  PERCENT: 'percent',
  COUNT: 'count',
  RATE: 'rate',
} as const);

/**
 * 健康评分配置模型
 * 定义了每个性能指标的评分规则，包括权重和多级扣分策略。
 * tiers 数组中的阈值应该从高到低排序。
 */
export const HEALTH_SCORE_CONFIG = {
  errorRate: {
    weight: 30, // 错误率最大扣30分
    // 此指标是直接按比例扣分，不使用 tiers
  },
  responseTime: {
    weight: 25, // 响应时间最大扣25分
    tiers: [
      { threshold: PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.SLOW_REQUEST_MS, penalty: 1.0 }, // 超过慢请求阈值，扣除全部权重分
      { threshold: PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.SLOW_REQUEST_MS / 2, penalty: 0.6 }, // 超过阈值的一半，扣60%
      { threshold: PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.SLOW_REQUEST_MS / 5, penalty: 0.4 }, // 超过阈值的1/5，扣40%
    ],
  },
  cpuUsage: {
    weight: 20, // CPU使用率最大扣20分
    tiers: [
      { threshold: PERFORMANCE_CONSTANTS.MEMORY_THRESHOLDS.HIGH_MEMORY_USAGE_MB / 1000 + 0.1, penalty: 1.0 }, // 超过高CPU阈值10%，扣100%
      { threshold: PERFORMANCE_CONSTANTS.MEMORY_THRESHOLDS.HIGH_MEMORY_USAGE_MB / 1000, penalty: 0.75 },
      { threshold: PERFORMANCE_CONSTANTS.MEMORY_THRESHOLDS.HIGH_MEMORY_USAGE_MB / 1000 - 0.2, penalty: 0.5 }, // 超过高CPU阈值-20%，扣50%
    ],
  },
  memoryUsage: {
    weight: 15, // 内存使用率最大扣15分
    tiers: [
      { threshold: PERFORMANCE_CONSTANTS.MEMORY_THRESHOLDS.HIGH_MEMORY_USAGE_MB / 1000, penalty: 1.0 },
      { threshold: PERFORMANCE_CONSTANTS.MEMORY_THRESHOLDS.HIGH_MEMORY_USAGE_MB / 1000 - 0.1, penalty: 0.67 },
      { threshold: PERFORMANCE_CONSTANTS.MEMORY_THRESHOLDS.HIGH_MEMORY_USAGE_MB / 1000 - 0.2, penalty: 0.33 },
    ],
  },
  dbPerformance: {
    weight: 10, // 数据库性能最大扣10分
    tiers: [
      { threshold: PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.SLOW_QUERY_MS, penalty: 1.0 },
      { threshold: PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.SLOW_QUERY_MS / 2, penalty: 0.5 },
    ],
  },
} as const;

/**
 * 默认配置值
 */
export const PERFORMANCE_DEFAULTS = Object.freeze({
  DB_POOL_SIZE: 50,                          // 默认数据库连接池大小
  REDIS_MEMORY_USAGE: 0,                     // 默认Redis内存使用量
  SYSTEM_CPU_USAGE: 0,                       // 默认系统CPU使用率
  SYSTEM_MEMORY_USAGE: 0,                    // 默认系统内存使用量
  CACHE_HIT_RATE: 0,                         // 默认缓存命中率
  HEALTH_SCORE: 100,                         // 默认健康评分
} as const);

/**
 * 事件名称常量
 */
export const PERFORMANCE_EVENTS = Object.freeze({
  METRIC_RECORDED: "performance.metric",      // 指标记录事件
  SLOW_REQUEST_DETECTED: "performance.slow_request", // 慢请求检测事件
  HIGH_ERROR_RATE: "performance.high_error_rate",    // 高错误率事件
  SYSTEM_OVERLOAD: "performance.system_overload",    // 系统过载事件
  HEALTH_SCORE_LOW: "performance.health_score_low",  // 健康评分低事件
} as const);

/**
 * API Key 相关常量
 */
export const API_KEY_CONSTANTS = Object.freeze({
  PREFIX_LENGTH: 8, // 用于日志和指标记录的API Key前缀长度
});

/**
 * Redis Info 命令相关常量
 */
export const REDIS_INFO = Object.freeze({
  SECTIONS: {
    MEMORY: "memory",
    STATS: "stats",
    CLIENTS: "clients",
  },
  KEYS: {
    USED_MEMORY: "used_memory",
    CONNECTED_CLIENTS: "connected_clients",
    TOTAL_COMMANDS_PROCESSED: "total_commands_processed",
    KEYSPACE_HITS: "keyspace_hits",
    KEYSPACE_MISSES: "keyspace_misses",
    EVICTED_KEYS: "evicted_keys",
    EXPIRED_KEYS: "expired_keys",
  }
});

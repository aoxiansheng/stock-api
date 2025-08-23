/**
 * 🎯 监控系统常量定义
 */

// 监控指标类型
export const MONITORING_METRIC_TYPES = {
  COUNTER: 'counter',
  GAUGE: 'gauge', 
  HISTOGRAM: 'histogram',
  SUMMARY: 'summary',
} as const;

// 监控组件层级
export const MONITORING_LAYERS = {
  INFRASTRUCTURE: 'infrastructure',
  COLLECTOR: 'collector',
  ANALYZER: 'analyzer',
  PRESENTER: 'presenter',
} as const;

// 性能阈值
export const PERFORMANCE_THRESHOLDS = {
  API_RESPONSE_TIME_MS: 100,
  DB_QUERY_TIME_MS: 50,
  CACHE_HIT_RATE_MIN: 0.8,
  ERROR_RATE_MAX: 0.01,
  MEMORY_USAGE_MAX_MB: 512,
} as const;

// 健康状态
export const HEALTH_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded', 
  UNHEALTHY: 'unhealthy',
} as const;

// 指标标签
export const METRIC_LABELS = {
  COMPONENT: 'component',
  OPERATION: 'operation',
  STATUS: 'status',
  ERROR_TYPE: 'error_type',
  PROVIDER: 'provider',
} as const;
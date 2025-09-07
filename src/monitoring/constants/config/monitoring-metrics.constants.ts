/**
 * 监控系统性能指标常量
 * 🎯 标准化性能指标定义，确保指标收集一致性
 * 提供分类管理和类型安全的指标定义
 */

import { MONITORING_SYSTEM_LIMITS } from "./monitoring-system.constants";

/**
 * 核心性能指标常量
 * 定义系统监控的基础指标类型
 */
export const MONITORING_METRICS = Object.freeze({
  // 响应性能指标
  RESPONSE_TIME: "response_time",
  THROUGHPUT: "throughput", 
  REQUEST_COUNT: "request_count",
  CONCURRENT_REQUESTS: "concurrent_requests",
  
  // 系统资源指标  
  CPU_USAGE: "cpu_usage",
  MEMORY_USAGE: "memory_usage",
  DISK_USAGE: "disk_usage",
  NETWORK_IO: "network_io",
  
  // 错误率指标
  ERROR_RATE: "error_rate",
  ERROR_COUNT: "error_count",
  SUCCESS_RATE: "success_rate",
  FAILURE_COUNT: "failure_count",
  
  // 业务指标
  ACTIVE_CONNECTIONS: "active_connections",
  QUEUE_SIZE: "queue_size",
  PROCESSED_ITEMS: "processed_items",
  PENDING_TASKS: "pending_tasks",
  
  // 缓存指标
  CACHE_HIT_RATE: "cache_hit_rate",
  CACHE_MISS_RATE: "cache_miss_rate",
  CACHE_SIZE: "cache_size",
  CACHE_EVICTIONS: "cache_evictions",
  
  // 数据库指标
  DB_CONNECTIONS: "db_connections",
  DB_QUERY_TIME: "db_query_time", 
  DB_SLOW_QUERIES: "db_slow_queries",
  DB_DEADLOCKS: "db_deadlocks"
} as const);

/**
 * 性能指标类型
 * 基于指标常量的类型定义，确保类型安全
 */
export type PerformanceMetricType = typeof MONITORING_METRICS[keyof typeof MONITORING_METRICS];

/**
 * 指标分类管理
 * 🎯 按用途分类指标，便于组织和查询
 */
export const MONITORING_METRIC_CATEGORIES = Object.freeze({
  /**
   * 性能类指标 - 关注系统响应和吞吐能力
   */
  PERFORMANCE: [
    MONITORING_METRICS.RESPONSE_TIME,
    MONITORING_METRICS.THROUGHPUT,
    MONITORING_METRICS.REQUEST_COUNT,
    MONITORING_METRICS.CONCURRENT_REQUESTS
  ] as const,
  
  /**
   * 资源类指标 - 关注系统资源利用率
   */
  SYSTEM: [
    MONITORING_METRICS.CPU_USAGE,
    MONITORING_METRICS.MEMORY_USAGE,
    MONITORING_METRICS.DISK_USAGE,
    MONITORING_METRICS.NETWORK_IO
  ] as const,
  
  /**
   * 错误类指标 - 关注系统健康状态
   */
  ERROR: [
    MONITORING_METRICS.ERROR_RATE,
    MONITORING_METRICS.ERROR_COUNT,
    MONITORING_METRICS.SUCCESS_RATE,
    MONITORING_METRICS.FAILURE_COUNT
  ] as const,
  
  /**
   * 业务类指标 - 关注业务处理能力
   */
  BUSINESS: [
    MONITORING_METRICS.ACTIVE_CONNECTIONS,
    MONITORING_METRICS.QUEUE_SIZE,
    MONITORING_METRICS.PROCESSED_ITEMS,
    MONITORING_METRICS.PENDING_TASKS
  ] as const,
  
  /**
   * 缓存类指标 - 关注缓存系统表现
   */
  CACHE: [
    MONITORING_METRICS.CACHE_HIT_RATE,
    MONITORING_METRICS.CACHE_MISS_RATE,
    MONITORING_METRICS.CACHE_SIZE,
    MONITORING_METRICS.CACHE_EVICTIONS
  ] as const,
  
  /**
   * 数据库类指标 - 关注数据库性能
   */
  DATABASE: [
    MONITORING_METRICS.DB_CONNECTIONS,
    MONITORING_METRICS.DB_QUERY_TIME,
    MONITORING_METRICS.DB_SLOW_QUERIES,
    MONITORING_METRICS.DB_DEADLOCKS
  ] as const
} as const);

/**
 * 指标单位定义
 * 🎯 标准化指标单位，便于展示和理解
 */
export const MONITORING_METRIC_UNITS = Object.freeze({
  [MONITORING_METRICS.RESPONSE_TIME]: 'ms',
  [MONITORING_METRICS.THROUGHPUT]: 'rps',
  [MONITORING_METRICS.REQUEST_COUNT]: 'count',
  [MONITORING_METRICS.CONCURRENT_REQUESTS]: 'count',
  
  [MONITORING_METRICS.CPU_USAGE]: '%',
  [MONITORING_METRICS.MEMORY_USAGE]: 'MB',
  [MONITORING_METRICS.DISK_USAGE]: 'GB',
  [MONITORING_METRICS.NETWORK_IO]: 'KB/s',
  
  [MONITORING_METRICS.ERROR_RATE]: '%',
  [MONITORING_METRICS.ERROR_COUNT]: 'count',
  [MONITORING_METRICS.SUCCESS_RATE]: '%',
  [MONITORING_METRICS.FAILURE_COUNT]: 'count',
  
  [MONITORING_METRICS.ACTIVE_CONNECTIONS]: 'count',
  [MONITORING_METRICS.QUEUE_SIZE]: 'count',
  [MONITORING_METRICS.PROCESSED_ITEMS]: 'count',
  [MONITORING_METRICS.PENDING_TASKS]: 'count',
  
  [MONITORING_METRICS.CACHE_HIT_RATE]: '%',
  [MONITORING_METRICS.CACHE_MISS_RATE]: '%',
  [MONITORING_METRICS.CACHE_SIZE]: 'KB',
  [MONITORING_METRICS.CACHE_EVICTIONS]: 'count',
  
  [MONITORING_METRICS.DB_CONNECTIONS]: 'count',
  [MONITORING_METRICS.DB_QUERY_TIME]: 'ms',
  [MONITORING_METRICS.DB_SLOW_QUERIES]: 'count',
  [MONITORING_METRICS.DB_DEADLOCKS]: 'count'
} as const);

/**
 * 指标阈值配置
 * 🎯 定义各指标的警告和严重阈值
 */
export const MONITORING_METRIC_THRESHOLDS = Object.freeze({
  [MONITORING_METRICS.RESPONSE_TIME]: {
    warning: MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS,  // 1秒
    critical: 5000  // 5秒
  },
  [MONITORING_METRICS.CPU_USAGE]: {
    warning: 70,    // 70%
    critical: 90    // 90%
  },
  [MONITORING_METRICS.MEMORY_USAGE]: {
    warning: 80,    // 80%
    critical: 95    // 95%
  },
  [MONITORING_METRICS.ERROR_RATE]: {
    warning: 1,     // 1%
    critical: 5     // 5%
  },
  [MONITORING_METRICS.CACHE_HIT_RATE]: {
    warning: 80,    // 低于80%警告
    critical: 60    // 低于60%严重
  }
} as const);

/**
 * 指标聚合类型
 * 🎯 定义指标的聚合计算方式
 */
export const MONITORING_AGGREGATION_TYPES = Object.freeze({
  AVG: 'average',
  SUM: 'sum', 
  MAX: 'maximum',
  MIN: 'minimum',
  COUNT: 'count',
  RATE: 'rate',
  P50: 'percentile_50',
  P95: 'percentile_95',
  P99: 'percentile_99'
} as const);

/**
 * 时间窗口定义
 * 🎯 标准化时间窗口，用于指标聚合
 */
export const MONITORING_TIME_WINDOWS = Object.freeze({
  REAL_TIME: 0,      // 实时
  ONE_MINUTE: 60,    // 1分钟
  FIVE_MINUTES: 300, // 5分钟
  FIFTEEN_MINUTES: 900, // 15分钟
  ONE_HOUR: 3600,    // 1小时
  ONE_DAY: 86400     // 1天
} as const);

/**
 * 指标优先级定义
 * 🎯 定义指标的监控优先级
 */
export const MONITORING_METRIC_PRIORITIES = Object.freeze({
  CRITICAL: 1,  // 关键指标，必须监控
  HIGH: 2,      // 高优先级指标
  MEDIUM: 3,    // 中等优先级指标
  LOW: 4        // 低优先级指标，可选监控
} as const);

/**
 * 获取指标分类的辅助函数
 */
export function getMetricCategory(metric: PerformanceMetricType): string | null {
  for (const [category, metrics] of Object.entries(MONITORING_METRIC_CATEGORIES)) {
    if ((metrics as readonly string[]).includes(metric)) {
      return category.toLowerCase();
    }
  }
  return null;
}

/**
 * 获取指标单位的辅助函数
 */
export function getMetricUnit(metric: PerformanceMetricType): string {
  return MONITORING_METRIC_UNITS[metric] || 'unknown';
}

/**
 * 检查指标是否超过阈值的辅助函数
 */
export function checkMetricThreshold(metric: PerformanceMetricType, value: number): {
  status: 'normal' | 'warning' | 'critical';
  threshold?: number;
} {
  const thresholds = MONITORING_METRIC_THRESHOLDS[metric];
  
  if (!thresholds) {
    return { status: 'normal' };
  }
  
  if (value >= thresholds.critical) {
    return { status: 'critical', threshold: thresholds.critical };
  }
  
  if (value >= thresholds.warning) {
    return { status: 'warning', threshold: thresholds.warning };
  }
  
  return { status: 'normal' };
}
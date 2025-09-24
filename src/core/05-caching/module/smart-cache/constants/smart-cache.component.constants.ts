/**
 * Smart Cache 组件相关常量
 * 使用联合类型和类型推导提供编译时类型检查
 */
export const SMART_CACHE_COMPONENT = Object.freeze({
  // 组件标识信息
  IDENTIFIERS: {
    NAME: "smart_cache_orchestrator",
    DISPLAY_NAME: "Smart Cache Orchestrator",
    VERSION: "2.0.0",
    NAMESPACE: "smart-cache",
  },

  // 指标类型定义
  METRIC_TYPES: {
    CACHE_OPERATIONS: "cache_operations",
    PERFORMANCE_METRICS: "performance_metrics",
    BACKGROUND_TASKS: "background_tasks",
    MEMORY_USAGE: "memory_usage",
    ERROR_TRACKING: "error_tracking",
  },

  // 操作类型定义
  OPERATION_TYPES: {
    BACKGROUND_TASK_COMPLETED: "background_task_completed",
    BACKGROUND_TASK_FAILED: "background_task_failed",
    BACKGROUND_TASK_STARTED: "background_task_started",
    ACTIVE_TASKS_COUNT: "active_tasks_count",
    CACHE_HIT: "cache_hit",
    CACHE_MISS: "cache_miss",
    CACHE_SET: "cache_set",
    CACHE_DELETE: "cache_delete",
    CACHE_EXPIRED: "cache_expired",
  },

  // 日志上下文定义
  LOG_CONTEXTS: {
    STANDARDIZED_SERVICE: "SmartCacheStandardizedService",
    PERFORMANCE_OPTIMIZER: "SmartCachePerformanceOptimizer",
    CONFIG_FACTORY: "SmartCacheConfigFactory",
    CONFIG_VALIDATOR: "SmartCacheConfigValidator",
    METRICS_COLLECTOR: "SmartCacheMetricsCollector",
  },

  // 事件类型定义
  EVENT_TYPES: {
    CACHE_UPDATED: "smart_cache.updated",
    PERFORMANCE_ALERT: "smart_cache.performance_alert",
    CONFIG_CHANGED: "smart_cache.config_changed",
    HEALTH_CHECK_FAILED: "smart_cache.health_check_failed",
    MEMORY_PRESSURE: "smart_cache.memory_pressure",
  },

  // 状态定义
  STATUS_TYPES: {
    ACTIVE: "active",
    INACTIVE: "inactive",
    DEGRADED: "degraded",
    MAINTENANCE: "maintenance",
    ERROR: "error",
  },
} as const);

// 类型推导：从常量对象推导出联合类型
export type SmartCacheComponentType = typeof SMART_CACHE_COMPONENT;

export type MetricType =
  (typeof SMART_CACHE_COMPONENT.METRIC_TYPES)[keyof typeof SMART_CACHE_COMPONENT.METRIC_TYPES];

export type OperationType =
  (typeof SMART_CACHE_COMPONENT.OPERATION_TYPES)[keyof typeof SMART_CACHE_COMPONENT.OPERATION_TYPES];

export type LogContext =
  (typeof SMART_CACHE_COMPONENT.LOG_CONTEXTS)[keyof typeof SMART_CACHE_COMPONENT.LOG_CONTEXTS];

export type EventType =
  (typeof SMART_CACHE_COMPONENT.EVENT_TYPES)[keyof typeof SMART_CACHE_COMPONENT.EVENT_TYPES];

export type StatusType =
  (typeof SMART_CACHE_COMPONENT.STATUS_TYPES)[keyof typeof SMART_CACHE_COMPONENT.STATUS_TYPES];

// 类型安全的工具函数
export const isValidMetricType = (value: string): value is MetricType => {
  return Object.values(SMART_CACHE_COMPONENT.METRIC_TYPES).includes(
    value as MetricType,
  );
};

export const isValidOperationType = (value: string): value is OperationType => {
  return Object.values(SMART_CACHE_COMPONENT.OPERATION_TYPES).includes(
    value as OperationType,
  );
};

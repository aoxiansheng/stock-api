/**
 * 统一事件定义（复用现有EventEmitter2）
 * 系统状态组件的所有事件定义
 */

export const SYSTEM_STATUS_EVENTS = {
  // 数据收集层事件（Collector Layer）
  METRIC_COLLECTED: "system-status.metric.collected",
  COLLECTION_STARTED: "system-status.collection.started",
  COLLECTION_COMPLETED: "system-status.collection.completed",
  COLLECTION_ERROR: "system-status.collection.error",
  COLLECTION_BUFFER_FULL: "system-status.collection.buffer.full",
  COLLECTION_CLEANUP: "system-status.collection.cleanup",

  // 数据分析层事件（Analyzer Layer）
  ANALYSIS_STARTED: "system-status.analysis.started",
  ANALYSIS_COMPLETED: "system-status.analysis.completed",
  ANALYSIS_ERROR: "system-status.analysis.error",
  ANALYSIS_CACHE_HIT: "system-status.analysis.cache.hit",
  ANALYSIS_CACHE_MISS: "system-status.analysis.cache.miss",
  CALCULATION_COMPLETED: "system-status.calculation.completed",

  // 数据请求/响应事件（Data Request/Response）
  DATA_REQUEST: "system-status.data.request",
  DATA_RESPONSE: "system-status.data.response",
  DATA_NOT_AVAILABLE: "system-status.data.not-available",

  // 缓存相关事件
  CACHE_HIT: "system-status.cache.hit",
  CACHE_MISS: "system-status.cache.miss",
  CACHE_SET: "system-status.cache.set",
  CACHE_INVALIDATED: "system-status.cache.invalidated",
  CACHE_EXPIRED: "system-status.cache.expired",
  CACHE_ERROR: "system-status.cache.error",

  // 健康检查事件
  HEALTH_SCORE_UPDATED: "system-status.health.score.updated",
  HEALTH_CHECK_STARTED: "system-status.health.check.started",
  HEALTH_CHECK_COMPLETED: "system-status.health.check.completed",
  HEALTH_CHECK_FAILED: "system-status.health.check.failed",
  HEALTH_THRESHOLD_BREACHED: "system-status.health.threshold.breached",

  // 趋势分析事件
  TREND_ANALYSIS_STARTED: "system-status.trend.analysis.started",
  TREND_ANALYSIS_COMPLETED: "system-status.trend.analysis.completed",
  TREND_DETECTED: "system-status.trend.detected",
  TREND_ALERT: "system-status.trend.alert",

  // 展示层事件（Presenter Layer）
  API_REQUEST_STARTED: "system-status.api.request.started",
  API_REQUEST_COMPLETED: "system-status.api.request.completed",
  API_REQUEST_ERROR: "system-status.api.request.error",

  // 系统级事件
  SYSTEM_PERFORMANCE_ALERT: "system-status.system.performance.alert",
  SYSTEM_RESOURCE_WARNING: "system-status.system.resource.warning",
  SYSTEM_OPTIMIZATION_SUGGESTION:
    "system-status.system.optimization.suggestion",

  // 错误处理事件
  ERROR_OCCURRED: "system-status.error.occurred",
  ERROR_HANDLED: "system-status.error.handled",
  WARNING_LOGGED: "system-status.warning.logged",
  CRITICAL_ERROR: "system-status.error.critical",
  CRITICAL_ERROR_DETECTED: "system-status.error.critical.detected",
  BUSINESS_ERROR_OCCURRED: "system-status.error.business.occurred",
  ANOMALY_DETECTED: "system-status.anomaly.detected",

  // 跨层性能事件
  CROSS_LAYER_OPERATION_STARTED: "system-status.cross-layer.operation.started",
  CROSS_LAYER_OPERATION_COMPLETED:
    "system-status.cross-layer.operation.completed",
  LAYER_PERFORMANCE_MEASURED: "system-status.layer.performance.measured",
} as const;

// 事件数据基础接口
export interface SystemStatusEventData {
  timestamp: Date;
  source: "collector" | "analyzer" | "presenter";
  metadata?: Record<string, any>;
}

// 指标收集事件数据
export interface MetricCollectedEvent extends SystemStatusEventData {
  metricType: "request" | "database" | "cache" | "system";
  metricName: string;
  metricValue: number;
  tags?: Record<string, string>;
}

// 分析完成事件数据
export interface AnalysisCompletedEvent extends SystemStatusEventData {
  analysisType: string;
  duration: number;
  dataPoints: number;
  results?: Record<string, any>;
}

// 数据请求事件数据
export interface DataRequestEvent extends SystemStatusEventData {
  requestId: string;
  requestType: "raw_metrics" | "health_report" | "performance_data";
  startTime?: Date;
  endTime?: Date;
  filters?: Record<string, any>;
}

// 数据响应事件数据
export interface DataResponseEvent extends SystemStatusEventData {
  requestId: string;
  responseType: "raw_metrics" | "health_report" | "performance_data";
  data: any;
  dataSize: number;
}

// 缓存操作事件数据
export interface CacheOperationEvent extends SystemStatusEventData {
  operation: "hit" | "miss" | "set" | "invalidate" | "expire";
  key?: string;
  pattern?: string;
  ttl?: number;
  size?: number;
}

// 健康检查事件数据
export interface HealthCheckEvent extends SystemStatusEventData {
  component: "api" | "database" | "cache" | "system" | "overall";
  score: number;
  status: "healthy" | "warning" | "critical";
  previousScore?: number;
  threshold?: number;
}

// 趋势检测事件数据
export interface TrendDetectedEvent extends SystemStatusEventData {
  metric: string;
  trendType: "up" | "down" | "stable";
  changePercentage: number;
  severity: "low" | "medium" | "high";
  period: string;
}

// API请求事件数据
export interface ApiRequestEvent extends SystemStatusEventData {
  endpoint: string;
  method: string;
  statusCode?: number;
  duration?: number;
  requestId?: string;
}

// 错误处理事件数据
export interface ErrorHandledEvent extends SystemStatusEventData {
  errorType: "business" | "system" | "validation" | "network";
  errorCode?: string;
  errorMessage: string;
  severity: "low" | "medium" | "high" | "critical";
  operation?: string;
}

// 跨层操作事件数据
export interface CrossLayerOperationEvent extends SystemStatusEventData {
  sourceLayer: "collector" | "analyzer" | "presenter";
  targetLayer: "collector" | "analyzer" | "presenter";
  operation: string;
  duration?: number;
  dataSize?: number;
  operationId: string;
}

// 系统性能告警事件数据
export interface SystemPerformanceAlertEvent extends SystemStatusEventData {
  alertType: "performance" | "resource" | "availability";
  severity: "warning" | "critical";
  metric: string;
  currentValue: number;
  threshold: number;
  recommendation?: string;
}

// 事件类型映射
export type SystemStatusEventMap = {
  [SYSTEM_STATUS_EVENTS.METRIC_COLLECTED]: MetricCollectedEvent;
  [SYSTEM_STATUS_EVENTS.ANALYSIS_COMPLETED]: AnalysisCompletedEvent;
  [SYSTEM_STATUS_EVENTS.DATA_REQUEST]: DataRequestEvent;
  [SYSTEM_STATUS_EVENTS.DATA_RESPONSE]: DataResponseEvent;
  [SYSTEM_STATUS_EVENTS.CACHE_HIT]: CacheOperationEvent;
  [SYSTEM_STATUS_EVENTS.CACHE_MISS]: CacheOperationEvent;
  [SYSTEM_STATUS_EVENTS.CACHE_INVALIDATED]: CacheOperationEvent;
  [SYSTEM_STATUS_EVENTS.HEALTH_SCORE_UPDATED]: HealthCheckEvent;
  [SYSTEM_STATUS_EVENTS.HEALTH_THRESHOLD_BREACHED]: HealthCheckEvent;
  [SYSTEM_STATUS_EVENTS.TREND_DETECTED]: TrendDetectedEvent;
  [SYSTEM_STATUS_EVENTS.API_REQUEST_STARTED]: ApiRequestEvent;
  [SYSTEM_STATUS_EVENTS.API_REQUEST_COMPLETED]: ApiRequestEvent;
  [SYSTEM_STATUS_EVENTS.ERROR_HANDLED]: ErrorHandledEvent;
  [SYSTEM_STATUS_EVENTS.CRITICAL_ERROR]: ErrorHandledEvent;
  [SYSTEM_STATUS_EVENTS.CROSS_LAYER_OPERATION_COMPLETED]: CrossLayerOperationEvent;
  [SYSTEM_STATUS_EVENTS.SYSTEM_PERFORMANCE_ALERT]: SystemPerformanceAlertEvent;
};

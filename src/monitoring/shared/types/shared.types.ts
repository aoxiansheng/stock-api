/**
 * 🎯 监控系统类型定义
 * 🎯 集成监控常量架构，确保类型定义与常量定义一致
 */

import { 
  BasicHealthStatus, 
  ExtendedHealthStatus, 
  PerformanceMetricType,
  MONITORING_AGGREGATION_TYPES 
} from "../../constants";

// 监控指标类型
export type MonitoringMetricType =
  | "counter"
  | "gauge"
  | "histogram"
  | "summary";

// 健康状态类型 - 复用常量架构中的类型定义
export type HealthStatus = BasicHealthStatus;
export type DetailedHealthStatus = ExtendedHealthStatus;

// 性能指标类型 - 复用常量架构中的指标定义
export type StandardMetricType = PerformanceMetricType;

// 聚合类型 - 复用常量架构中的聚合类型
export type AggregationType = typeof MONITORING_AGGREGATION_TYPES[keyof typeof MONITORING_AGGREGATION_TYPES];

// 监控组件层级类型
export type MonitoringLayer =
  | "infrastructure"
  | "collector"
  | "analyzer"
  | "presenter";

// 性能指标 - 基于标准化的指标定义
export interface PerformanceMetrics {
  responseTime: number;        // 对应 MONITORING_METRICS.RESPONSE_TIME
  throughput: number;          // 对应 MONITORING_METRICS.THROUGHPUT
  errorRate: number;           // 对应 MONITORING_METRICS.ERROR_RATE
  memoryUsage: number;         // 对应 MONITORING_METRICS.MEMORY_USAGE
  cpuUsage: number;            // 对应 MONITORING_METRICS.CPU_USAGE
  requestCount?: number;       // 对应 MONITORING_METRICS.REQUEST_COUNT
  successRate?: number;        // 对应 MONITORING_METRICS.SUCCESS_RATE
  diskUsage?: number;          // 对应 MONITORING_METRICS.DISK_USAGE
  networkIO?: number;          // 对应 MONITORING_METRICS.NETWORK_IO
}

// 扩展的性能指标接口
export interface DetailedPerformanceMetrics extends PerformanceMetrics {
  cacheHitRate?: number;       // 对应 MONITORING_METRICS.CACHE_HIT_RATE
  cacheMissRate?: number;      // 对应 MONITORING_METRICS.CACHE_MISS_RATE
  dbConnections?: number;      // 对应 MONITORING_METRICS.DB_CONNECTIONS
  dbQueryTime?: number;        // 对应 MONITORING_METRICS.DB_QUERY_TIME
  activeConnections?: number;  // 对应 MONITORING_METRICS.ACTIVE_CONNECTIONS
  queueSize?: number;          // 对应 MONITORING_METRICS.QUEUE_SIZE
}

// 健康检查结果
export interface HealthCheckResult {
  status: HealthStatus;
  component: string;
  timestamp: Date;
  metrics: PerformanceMetrics;
  errors?: string[];
}

// 监控错误
export class MonitoringError extends Error {
  constructor(
    public readonly code: string,
    public readonly component: MonitoringLayer,
    message: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = "MonitoringError";
  }
}

// 指标标签
export interface MetricLabels {
  [key: string]: string;
}

// 指标数据点
export interface MetricDataPoint {
  name: string;
  value: number;
  labels: MetricLabels;
  timestamp: Date;
}

// 监控配置接口
export interface MonitoringConfiguration {
  metrics: {
    enabled: StandardMetricType[];
    thresholds: Record<string, { warning: number; critical: number }>;
    aggregationTypes: AggregationType[];
  };
  health: {
    checkInterval: number;
    components: string[];
    statusMapping: Record<string, HealthStatus>;
  };
  serialization: {
    sortKeys: boolean;
    compact: boolean;
    handleSpecialValues: boolean;
    maxDepth: number;
  };
}

// 监控事件接口
export interface MonitoringEvent {
  id: string;
  timestamp: Date;
  type: string;
  component: MonitoringLayer;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metadata?: Record<string, any>;
  tags?: MetricLabels;
}

// 监控报告接口
export interface MonitoringReport {
  reportId: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalMetrics: number;
    healthStatus: HealthStatus;
    alertCount: number;
    errorCount: number;
  };
  metrics: DetailedPerformanceMetrics;
  events: MonitoringEvent[];
  recommendations?: string[];
}

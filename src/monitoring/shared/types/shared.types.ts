/**
 * 🎯 监控系统类型定义
 */

// 监控指标类型
export type MonitoringMetricType =
  | "counter"
  | "gauge"
  | "histogram"
  | "summary";

// 健康状态类型
export type HealthStatus = "healthy" | "degraded" | "unhealthy";

// 监控组件层级类型
export type MonitoringLayer =
  | "infrastructure"
  | "collector"
  | "analyzer"
  | "presenter";

// 性能指标
export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
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

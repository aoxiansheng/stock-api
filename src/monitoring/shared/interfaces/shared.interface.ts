/**
 * 🎯 监控系统核心接口定义
 * 🎯 集成监控常量架构，提供标准化的接口定义
 */

import { 
  HealthStatus, 
  PerformanceMetrics, 
  DetailedPerformanceMetrics,
  MonitoringConfiguration,
  MonitoringEvent,
  MonitoringReport,
  MetricLabels 
} from "../types/shared.types";

// 监控组件基础接口
export interface IMonitoringComponent {
  getHealthStatus(): Promise<{ status: HealthStatus; details?: any }>;
  getMetrics(): Promise<PerformanceMetrics>;
  configure?(config: Partial<MonitoringConfiguration>): Promise<void>;
  reset?(): Promise<void>;
}

// 扩展监控组件接口
export interface IAdvancedMonitoringComponent extends IMonitoringComponent {
  getDetailedMetrics(): Promise<DetailedPerformanceMetrics>;
  generateReport(period?: { start: Date; end: Date }): Promise<MonitoringReport>;
  subscribeToEvents(callback: (event: MonitoringEvent) => void): void;
  unsubscribeFromEvents(): void;
}

// 基础设施层接口
export interface IInfrastructure extends IAdvancedMonitoringComponent {
  registerMetric(
    name: string,
    type: string,
    labels?: MetricLabels,
  ): void;
  updateMetric(
    name: string,
    value: number,
    labels?: MetricLabels,
  ): void;
  getPrometheusMetrics(): Promise<string>;
  exportMetrics(format: 'prometheus' | 'json' | 'csv'): Promise<string>;
}

// 收集器接口
export interface ICollector extends IAdvancedMonitoringComponent {
  collect(source: string, data: any): Promise<void>;
  flush(): Promise<void>;
  cleanup(olderThan?: Date): Promise<void>;
  setBatchSize?(size: number): void;
  setFlushInterval?(interval: number): void;
}

// 分析器接口
export interface IAnalyzer extends IAdvancedMonitoringComponent {
  analyze(data: any): Promise<any>;
  calculateHealth(metrics: PerformanceMetrics): HealthStatus;
  generateTrendReport(period: { start: Date; end: Date }): Promise<MonitoringReport>;
  predictTrends?(metrics: PerformanceMetrics[]): Promise<any>;
}

// 展示器接口
export interface IPresenter extends IMonitoringComponent {
  formatData(data: any, format?: 'json' | 'table' | 'chart'): any;
  generateResponse(data: any): any;
  handleError(error: Error): any;
  setTemplate?(template: string): void;
}

// 序列化器接口
export interface ISerializer {
  serialize(data: any, options?: { sortKeys?: boolean; compact?: boolean }): string;
  deserialize<T = any>(data: string): T;
  generateKey(name: string, tags: MetricLabels): string;
  validateSerialization(obj1: any, obj2: any): boolean;
}

// 消息格式化器接口
export interface IMessageFormatter {
  formatOperationMessage(operation: string, component: string): string;
  formatErrorMessage(error: Error, component: string): string;
  formatNotificationMessage(
    type: 'email' | 'slack' | 'wechat',
    severity: string,
    component: string,
    message: string
  ): string;
  formatWithTimestamp(message: string): string;
}

/**
 * 🎯 监控系统核心接口定义
 */

import { HealthStatus, PerformanceMetrics } from '../types/shared.types';

// 监控组件基础接口
export interface IMonitoringComponent {
  getHealthStatus(): Promise<{ status: HealthStatus; details?: any }>;
  getMetrics(): Promise<PerformanceMetrics>;
}

// 基础设施层接口
export interface IInfrastructure extends IMonitoringComponent {
  registerMetric(name: string, type: string, labels?: Record<string, string>): void;
  updateMetric(name: string, value: number, labels?: Record<string, string>): void;
  getPrometheusMetrics(): Promise<string>;
}

// 收集器接口
export interface ICollector extends IMonitoringComponent {
  collect(source: string, data: any): Promise<void>;
  flush(): Promise<void>;
  cleanup(olderThan?: Date): Promise<void>;
}

// 分析器接口  
export interface IAnalyzer extends IMonitoringComponent {
  analyze(data: any): Promise<any>;
  calculateHealth(metrics: PerformanceMetrics): HealthStatus;
  generateReport(): Promise<any>;
}

// 展示器接口
export interface IPresenter extends IMonitoringComponent {
  formatData(data: any): any;
  generateResponse(data: any): any;
  handleError(error: Error): any;
}
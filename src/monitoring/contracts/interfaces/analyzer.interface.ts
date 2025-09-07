/**
 * 数据分析层接口定义
 * 职责：所有计算和分析逻辑，统一缓存管理，事件发射中心
 */

import type { ExtendedHealthStatus } from "../../constants/status/monitoring-status.constants";
import { BaseTrendMetric } from "./base.interface";

export interface AnalysisOptions {
  startTime?: Date;
  endTime?: Date;
  includeDetails?: boolean;
  cacheEnabled?: boolean;
}

export interface PerformanceSummary {
  totalOperations: number;
  successfulRequests: number;
  failedRequests: number;
  responseTimeMs: number;
  errorRate: number;
}

export interface PerformanceAnalysisDto {
  timestamp: Date;
  summary: PerformanceSummary;
  responseTimeMs: number;
  errorRate: number;
  throughput: number;
  healthScore: number;
  trends?: TrendsDto;
  endpointMetrics?: EndpointMetricsDto[];
  databaseMetrics?: DatabaseMetricsDto;
  cacheMetrics?: CacheMetricsDto;
}

export interface HealthReportDto {
  overall: {
    healthScore: number;
    status: ExtendedHealthStatus;
    timestamp: Date;
  };
  components: {
    api: {
      healthScore: number;
      responseTimeMs: number;
      errorRate: number;
    };
    database: {
      healthScore: number;
      responseTimeMs: number;
      errorRate: number;
    };
    cache: {
      healthScore: number;
      hitRate: number;
      responseTimeMs: number;
    };
    system: {
      healthScore: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  };
  recommendations?: string[];
}

export interface TrendsDto {
  responseTimeMs: BaseTrendMetric<number>;
  errorRate: BaseTrendMetric<number>;
  throughput: BaseTrendMetric<number>;
}

export interface EndpointMetricsDto {
  endpoint: string;
  method: string;
  totalOperations: number;
  responseTimeMs: number;
  errorRate: number;
  lastUsed: Date;
}

export interface DatabaseMetricsDto {
  totalOperations: number;
  responseTimeMs: number;
  slowQueries: number;
  failedOperations: number;
  errorRate: number;
}

export interface CacheMetricsDto {
  totalOperations: number;
  hits: number;
  misses: number;
  hitRate: number;
  responseTimeMs: number;
}

export interface SuggestionDto {
  category: "performance" | "security" | "resource" | "optimization";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action?: string;
  impact?: string;
}

/**
 * 数据分析器接口
 * 负责所有计算、分析、缓存管理和事件发布
 */
export interface IAnalyzer {
  /**
   * 获取性能分析数据
   */
  getPerformanceAnalysis(
    options?: AnalysisOptions,
  ): Promise<PerformanceAnalysisDto>;

  /**
   * 获取健康评分
   */
  getHealthScore(): Promise<number>;

  /**
   * 获取健康报告
   */
  getHealthReport(): Promise<HealthReportDto>;

  /**
   * 计算趋势分析
   */
  calculateTrends(period: string): Promise<TrendsDto>;

  /**
   * 获取端点指标
   */
  getEndpointMetrics(limit?: number): Promise<EndpointMetricsDto[]>;

  /**
   * 获取数据库指标
   */
  getDatabaseMetrics(): Promise<DatabaseMetricsDto>;

  /**
   * 获取缓存指标
   */
  getCacheMetrics(): Promise<CacheMetricsDto>;

  /**
   * 获取优化建议
   */
  getOptimizationSuggestions(): Promise<SuggestionDto[]>;

  /**
   * 缓存失效
   */
  invalidateCache(pattern?: string): Promise<void>;

  /**
   * 获取缓存统计
   */
  getCacheStats(): Promise<{
    hitRate: number;
    totalOperations: number;
    totalHits: number;
    totalMisses: number;
  }>;
}

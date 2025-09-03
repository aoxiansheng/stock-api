/**
 * 数据分析层接口定义
 * 职责：所有计算和分析逻辑，统一缓存管理，事件发射中心
 */

import { ExtendedHealthStatus } from "../../constants";

export interface AnalysisOptions {
  startTime?: Date;
  endTime?: Date;
  includeDetails?: boolean;
  cacheEnabled?: boolean;
}

export interface PerformanceSummary {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  errorRate: number;
}

export interface PerformanceAnalysisDto {
  timestamp: string;
  summary: PerformanceSummary;
  averageResponseTime: number;
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
    score: number;
    status: ExtendedHealthStatus;
    timestamp: Date;
  };
  components: {
    api: {
      score: number;
      responseTime: number;
      errorRate: number;
    };
    database: {
      score: number;
      averageQueryTime: number;
      failureRate: number;
    };
    cache: {
      score: number;
      hitRate: number;
      averageResponseTime: number;
    };
    system: {
      score: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  };
  recommendations?: string[];
}

export interface TrendsDto {
  responseTime: {
    current: number;
    previous: number;
    trend: "up" | "down" | "stable";
    changePercentage: number;
  };
  errorRate: {
    current: number;
    previous: number;
    trend: "up" | "down" | "stable";
    changePercentage: number;
  };
  throughput: {
    current: number;
    previous: number;
    trend: "up" | "down" | "stable";
    changePercentage: number;
  };
}

export interface EndpointMetricsDto {
  endpoint: string;
  method: string;
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  lastUsed: Date;
}

export interface DatabaseMetricsDto {
  totalOperations: number;
  averageQueryTime: number;
  slowQueries: number;
  failedOperations: number;
  failureRate: number;
}

export interface CacheMetricsDto {
  totalOperations: number;
  hits: number;
  misses: number;
  hitRate: number;
  averageResponseTime: number;
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
    totalRequests: number;
    totalHits: number;
    totalMisses: number;
  }>;
}

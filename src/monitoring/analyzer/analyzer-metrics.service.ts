import { Injectable } from "@nestjs/common";
import { createLogger } from "../../appcore/config/logger.config";
import { RawMetricsDto } from "../contracts/interfaces/collector.interface";
import {
  PerformanceSummary,
  EndpointMetricsDto,
  DatabaseMetricsDto,
  CacheMetricsDto,
  TrendsDto,
} from "../contracts/interfaces/analyzer.interface";
import { MONITORING_KEY_TEMPLATES } from "../constants";
import { MONITORING_SYSTEM_LIMITS } from "../constants/config/monitoring-system.constants";

/**
 * 指标计算器
 * 职责：集中所有指标计算逻辑
 */
@Injectable()
export class AnalyzerMetricsCalculator {
  private readonly logger = createLogger(AnalyzerMetricsCalculator.name);

  /**
   * 计算性能摘要
   */
  calculatePerformanceSummary(rawMetrics: RawMetricsDto): PerformanceSummary {
    try {
      const requests = rawMetrics.requests || [];

      if (requests.length === 0) {
        return {
          totalOperations: 0,
          successfulRequests: 0,
          failedRequests: 0,
          responseTimeMs: 0,
          errorRate: 0,
        };
      }

      const totalRequests = requests.length;
      const successfulRequests = requests.filter(
        (r) => r.statusCode < MONITORING_SYSTEM_LIMITS.HTTP_SUCCESS_THRESHOLD,
      ).length;
      const failedRequests = totalRequests - successfulRequests;
      const responseTimeMs = this.calculateAverageResponseTime(rawMetrics);
      const errorRate = this.calculateErrorRate(rawMetrics);

      this.logger.debug("性能摘要计算完成", {
        totalRequests,
        responseTimeMs,
        errorRate,
      });

      return {
        totalOperations: totalRequests,
        successfulRequests,
        failedRequests,
        responseTimeMs: responseTimeMs,
        errorRate,
      };
    } catch (error) {
      this.logger.error("性能摘要计算失败", error.stack);
      return {
        totalOperations: 0,
        successfulRequests: 0,
        failedRequests: 0,
        responseTimeMs: 0,
        errorRate: 0,
      };
    }
  }

  /**
   * 计算平均响应时间
   */
  calculateAverageResponseTime(rawMetrics: RawMetricsDto): number {
    const requests = rawMetrics.requests || [];

    if (requests.length === 0) {
      return 0;
    }

    let totalTime = 0;
    let totalRequests = 0;

    for (const request of requests) {
      totalTime += request.responseTimeMs || 0;
      totalRequests++;
    }

    return totalRequests > 0 ? Math.round(totalTime / totalRequests) : 0;
  }

  /**
   * 计算错误率
   */
  calculateErrorRate(rawMetrics: RawMetricsDto): number {
    const requests = rawMetrics.requests || [];

    if (requests.length === 0) {
      return 0;
    }

    const errorRequests = requests.filter((r) => r.statusCode >= MONITORING_SYSTEM_LIMITS.HTTP_SUCCESS_THRESHOLD).length;
    return Math.round((errorRequests / requests.length) * 10000) / 10000; // 保留4位小数
  }

  /**
   * 计算吞吐量（请求/分钟）
   */
  calculateThroughput(rawMetrics: RawMetricsDto): number {
    const requests = rawMetrics.requests || [];

    if (requests.length === 0) {
      return 0;
    }

    // 简化计算：假设数据窗口为1分钟
    const timeWindowMinutes = 1;
    return Math.round(requests.length / timeWindowMinutes);
  }

  /**
   * 计算端点指标
   */
  calculateEndpointMetrics(rawMetrics: RawMetricsDto): EndpointMetricsDto[] {
    try {
      const requests = rawMetrics.requests || [];

      if (requests.length === 0) {
        return [];
      }

      // 按端点分组
      const endpointGroups = new Map<string, typeof requests>();

      for (const request of requests) {
        const key = MONITORING_KEY_TEMPLATES.REQUEST_KEY(request.method, request.endpoint);
        if (!endpointGroups.has(key)) {
          endpointGroups.set(key, []);
        }
        endpointGroups.get(key)!.push(request);
      }

      // 计算每个端点的指标
      const metrics: EndpointMetricsDto[] = [];

      for (const [key, endpointRequests] of endpointGroups) {
        const [method, endpoint] = key.split(":");
        const requestCount = endpointRequests.length;
        const errorCount = endpointRequests.filter(
          (r) => r.statusCode >= MONITORING_SYSTEM_LIMITS.HTTP_SUCCESS_THRESHOLD,
        ).length;
        const totalResponseTime = endpointRequests.reduce(
          (sum, r) => sum + (r.responseTimeMs || 0),
          0,
        );
        const lastUsed = new Date(
          Math.max(...endpointRequests.map((r) => r.timestamp.getTime())),
        );

        metrics.push({
          endpoint,
          method,
          totalOperations: requestCount,
          responseTimeMs: Math.round(totalResponseTime / requestCount),
          errorRate: Math.round((errorCount / requestCount) * 10000) / 10000,
          lastUsed,
        });
      }

      // 按请求数量排序
      metrics.sort((a, b) => b.totalOperations - a.totalOperations);

      this.logger.debug(`端点指标计算完成: ${metrics.length} 个端点`);
      return metrics;
    } catch (error) {
      this.logger.error("端点指标计算失败", error.stack);
      return [];
    }
  }

  /**
   * 计算数据库指标
   */
  calculateDatabaseMetrics(rawMetrics: RawMetricsDto): DatabaseMetricsDto {
    try {
      const dbOps = rawMetrics.database || [];

      if (dbOps.length === 0) {
        return {
          totalOperations: 0,
          responseTimeMs: 0,
          slowQueries: 0,
          failedOperations: 0,
          errorRate: 0,
        };
      }

      const totalOperations = dbOps.length;
      const totalTime = dbOps.reduce((sum, op) => sum + op.responseTimeMs, 0);
      const responseTimeMs = Math.round(totalTime / totalOperations);
      const slowQueries = dbOps.filter((op) => op.responseTimeMs > MONITORING_SYSTEM_LIMITS.SLOW_QUERY_THRESHOLD_MS).length; // >SLOW_QUERY_THRESHOLD_MS认为是慢查询
      const failedOperations = dbOps.filter((op) => !op.success).length;
      const errorRate =
        Math.round((failedOperations / totalOperations) * 10000) / 10000;

      this.logger.debug('MetricsCalculator: 数据库指标计算完成', {
        component: 'AnalyzerMetricsCalculator',
        operation: 'calculateDatabaseMetrics',
        totalOperations,
        responseTimeMs,
        slowQueries,
        errorRate,
        success: true
      });

      return {
        totalOperations,
        responseTimeMs,
        slowQueries,
        failedOperations,
        errorRate,
      };
    } catch (error) {
      this.logger.error("数据库指标计算失败", error.stack);
      return {
        totalOperations: 0,
        responseTimeMs: 0,
        slowQueries: 0,
        failedOperations: 0,
        errorRate: 0,
      };
    }
  }

  /**
   * 计算缓存指标
   */
  calculateCacheMetrics(rawMetrics: RawMetricsDto): CacheMetricsDto {
    try {
      const cacheOps = rawMetrics.cache || [];

      if (cacheOps.length === 0) {
        return {
          totalOperations: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          responseTimeMs: 0,
        };
      }

      const totalOperations = cacheOps.length;
      const hits = cacheOps.filter((op) => op.hit).length;
      const misses = totalOperations - hits;
      const hitRate = Math.round((hits / totalOperations) * 10000) / 10000;
      const totalTime = cacheOps.reduce((sum, op) => sum + op.responseTimeMs, 0);
      const responseTimeMs = Math.round(totalTime / totalOperations);

      this.logger.debug("缓存指标计算完成", {
        totalOperations,
        hits,
        hitRate,
        responseTimeMs,
      });

      return {
        totalOperations,
        hits,
        misses,
        hitRate,
        responseTimeMs,
      };
    } catch (error) {
      this.logger.error("缓存指标计算失败", error.stack);
      return {
        totalOperations: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        responseTimeMs: 0,
      };
    }
  }

  /**
   * 计算趋势分析
   */
  calculateTrends(
    currentMetrics: RawMetricsDto,
    previousMetrics?: RawMetricsDto,
  ): TrendsDto {
    try {
      if (!previousMetrics) {
        // 没有历史数据，返回稳定趋势
        return {
          responseTimeMs: {
            current: 0,
            previous: 0,
            trend: "stable",
            changePercentage: 0,
          },
          errorRate: {
            current: 0,
            previous: 0,
            trend: "stable",
            changePercentage: 0,
          },
          throughput: {
            current: 0,
            previous: 0,
            trend: "stable",
            changePercentage: 0,
          },
        };
      }

      const currentAvgResponse =
        this.calculateAverageResponseTime(currentMetrics);
      const previousAvgResponse =
        this.calculateAverageResponseTime(previousMetrics);
      const responseChange = this.calculateChangePercentage(
        currentAvgResponse,
        previousAvgResponse,
      );

      const currentErrorRate = this.calculateErrorRate(currentMetrics);
      const previousErrorRate = this.calculateErrorRate(previousMetrics);
      const errorChange = this.calculateChangePercentage(
        currentErrorRate,
        previousErrorRate,
      );

      const currentThroughput = this.calculateThroughput(currentMetrics);
      const previousThroughput = this.calculateThroughput(previousMetrics);
      const throughputChange = this.calculateChangePercentage(
        currentThroughput,
        previousThroughput,
      );

      this.logger.debug("趋势分析计算完成", {
        responseChange,
        errorChange,
        throughputChange,
      });

      return {
        responseTimeMs: {
          current: currentAvgResponse,
          previous: previousAvgResponse,
          trend: this.getTrend(responseChange),
          changePercentage: responseChange,
        },
        errorRate: {
          current: currentErrorRate,
          previous: previousErrorRate,
          trend: this.getTrend(errorChange),
          changePercentage: errorChange,
        },
        throughput: {
          current: currentThroughput,
          previous: previousThroughput,
          trend: this.getTrend(throughputChange),
          changePercentage: throughputChange,
        },
      };
    } catch (error) {
      this.logger.error("趋势分析计算失败", error.stack);
      return {
        responseTimeMs: {
          current: 0,
          previous: 0,
          trend: "stable",
          changePercentage: 0,
        },
        errorRate: {
          current: 0,
          previous: 0,
          trend: "stable",
          changePercentage: 0,
        },
        throughput: {
          current: 0,
          previous: 0,
          trend: "stable",
          changePercentage: 0,
        },
      };
    }
  }

  /**
   * 计算变化百分比
   */
  private calculateChangePercentage(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER : 0;
    }
    return Math.round(((current - previous) / previous) * 10000) / 100; // 保留2位小数的百分比
  }

  /**
   * 获取趋势方向
   */
  private getTrend(changePercentage: number): "up" | "down" | "stable" {
    if (Math.abs(changePercentage) < 5) {
      // 变化小于5%认为稳定
      return "stable";
    }
    return changePercentage > 0 ? "up" : "down";
  }

  /**
   * 计算百分位数
   */
  calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor((percentile / MONITORING_SYSTEM_LIMITS.PERCENTAGE_MULTIPLIER) * sorted.length);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  /**
   * 计算统计信息
   */
  calculateStatistics(values: number[]): {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(sum / values.length),
      p50: this.calculatePercentile(values, 50),
      p95: this.calculatePercentile(values, 95),
      p99: this.calculatePercentile(values, 99),
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { EndpointMetricsDto, PerformanceSummaryDto } from '../../collect-metrics/dto';
import { ANALYTICS_CALCULATION_CONFIG, ANALYTICS_PERFORMANCE_THRESHOLDS } from '../constants';
import { HealthScoreCalculator } from '../utils/health-score-calculator.util';

/**
 * 原始端点数据接口
 */
interface RawEndpointData {
  endpoint: string;
  method: string;
  responseTime: number;
  success: boolean;
  timestamp: number;
}

/**
 * 指标计算服务
 * 负责性能指标的优化计算和批处理
 */
@Injectable()
export class MetricsCalculatorService {
  private readonly logger = new Logger(MetricsCalculatorService.name);
  
  /**
   * 批量端点指标计算（向量化优化）
   */
  calculateEndpointMetrics(rawData: RawEndpointData[]): EndpointMetricsDto[] {
    if (!rawData?.length) {
      this.logger.debug('无原始数据，返回空指标');
      return [];
    }

    const startTime = performance.now();
    
    try {
      // 按端点分组以便批量处理
      const groupedData = this.groupByEndpoint(rawData);
      
      const results = Object.entries(groupedData).map(([endpointKey, data]) => {
        const [method, endpoint] = endpointKey.split(':');
        const responseTimes = data.map(d => d.responseTime).sort((a, b) => a - b);
        const totalRequests = data.length;
        const failedRequests = data.filter(d => !d.success).length;
        const successfulRequests = totalRequests - failedRequests;

        // 🧮 优化的百分位数计算
        const percentiles = this.calculatePercentilesOptimized(responseTimes);

        return {
          endpoint,
          method,
          totalRequests,
          successfulRequests,
          failedRequests,
          averageResponseTime: responseTimes.length > 0 
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
            : 0,
          p95ResponseTime: percentiles.p95,
          p99ResponseTime: percentiles.p99,
          lastMinuteRequests: totalRequests, // 简化实现，实际应根据时间戳过滤
          errorRate: totalRequests > 0 ? failedRequests / totalRequests : 0,
        } as EndpointMetricsDto;
      }).sort((a, b) => b.totalRequests - a.totalRequests); // 按请求数降序排列

      const duration = performance.now() - startTime;
      this.logger.debug('端点指标计算完成', { 
        endpointCount: results.length,
        totalDataPoints: rawData.length,
        duration: `${duration.toFixed(2)}ms`
      });

      return results;

    } catch (error) {
      this.logger.error('端点指标计算失败', { 
        error: error.message,
        dataPointCount: rawData.length
      });
      return [];
    }
  }

  /**
   * 优化的百分位数计算（避免重复排序）
   */
  private calculatePercentilesOptimized(sortedTimes: number[]): { p95: number; p99: number } {
    if (sortedTimes.length === 0) {
      return { p95: 0, p99: 0 };
    }
    
    const config = ANALYTICS_CALCULATION_CONFIG.PERCENTILES;
    const p95Index = Math.max(0, Math.floor(sortedTimes.length * config.P95) - 1);
    const p99Index = Math.max(0, Math.floor(sortedTimes.length * config.P99) - 1);
    
    return {
      p95: sortedTimes[p95Index] || 0,
      p99: sortedTimes[p99Index] || 0
    };
  }

  /**
   * 流式计算支持（大数据集优化）
   */
  async calculatePerformanceSummaryStream(
    dataStream: AsyncIterable<any>
  ): Promise<PerformanceSummaryDto | null> {
    const startTime = performance.now();
    
    const accumulator = {
      totalRequests: 0,
      totalErrors: 0,
      responseTimeSum: 0,
      responseTimes: [] as number[],
      endpointData: [] as RawEndpointData[],
      systemMetrics: null as any,
      dbMetrics: null as any,
      redisMetrics: null as any
    };

    try {
      // 流式处理避免内存溢出
      for await (const batch of dataStream) {
        this.updateAccumulator(accumulator, batch);
        
        // 限制内存使用，定期清理旧数据
        if (accumulator.endpointData.length > ANALYTICS_CALCULATION_CONFIG.BATCH_SIZE) {
          accumulator.endpointData = accumulator.endpointData.slice(-ANALYTICS_CALCULATION_CONFIG.BATCH_SIZE / 2);
        }
      }

      const summary = this.finalizePerformanceSummary(accumulator);
      
      this.logger.debug('流式性能摘要计算完成', {
        totalRequests: accumulator.totalRequests,
        duration: `${(performance.now() - startTime).toFixed(2)}ms`
      });

      return summary;

    } catch (error) {
      this.logger.error('流式性能摘要计算失败', { error: error.message });
      return null;
    }
  }

  /**
   * 计算性能趋势指标
   */
  calculateTrendMetrics(
    currentMetrics: PerformanceSummaryDto,
    previousMetrics: PerformanceSummaryDto
  ): {
    responseTimeTrend: number;
    errorRateTrend: number;
    throughputTrend: number;
    healthScoreTrend: number;
  } {
    try {
      const responseTimeTrend = this.calculatePercentageChange(
        previousMetrics.summary.averageResponseTime,
        currentMetrics.summary.averageResponseTime
      );

      const errorRateTrend = this.calculatePercentageChange(
        previousMetrics.summary.errorRate,
        currentMetrics.summary.errorRate
      );

      const throughputTrend = this.calculatePercentageChange(
        previousMetrics.summary.totalRequests,
        currentMetrics.summary.totalRequests
      );

      const healthScoreTrend = this.calculatePercentageChange(
        previousMetrics.healthScore,
        currentMetrics.healthScore
      );

      return {
        responseTimeTrend,
        errorRateTrend,
        throughputTrend,
        healthScoreTrend
      };

    } catch (error) {
      this.logger.error('趋势指标计算失败', { error: error.message });
      return {
        responseTimeTrend: 0,
        errorRateTrend: 0,
        throughputTrend: 0,
        healthScoreTrend: 0
      };
    }
  }

  /**
   * 检测异常指标
   */
  detectAnomalies(metrics: EndpointMetricsDto[]): {
    anomalies: Array<{
      endpoint: string;
      type: 'high_response_time' | 'high_error_rate' | 'low_throughput';
      value: number;
      threshold: number;
      severity: 'warning' | 'critical';
    }>;
    summary: {
      totalAnomalies: number;
      criticalCount: number;
      warningCount: number;
    };
  } {
    const anomalies: any[] = [];

    try {
      metrics.forEach(metric => {
        // 检测高响应时间
        if (metric.averageResponseTime > ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS) {
          anomalies.push({
            endpoint: `${metric.method} ${metric.endpoint}`,
            type: 'high_response_time',
            value: metric.averageResponseTime,
            threshold: ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS,
            severity: metric.averageResponseTime > (ANALYTICS_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS * 2) ? 'critical' : 'warning'
          });
        }

        // 检测高错误率
        if (metric.errorRate > ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE) {
          anomalies.push({
            endpoint: `${metric.method} ${metric.endpoint}`,
            type: 'high_error_rate',
            value: metric.errorRate,
            threshold: ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE,
            severity: metric.errorRate > (ANALYTICS_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE * 2) ? 'critical' : 'warning'
          });
        }

        // 检测低吞吐量（可选，基于请求数判断）
        const avgRequestsPerMinute = metric.lastMinuteRequests;
        if (avgRequestsPerMinute > 0 && avgRequestsPerMinute < 5) { // 阈值可配置
          anomalies.push({
            endpoint: `${metric.method} ${metric.endpoint}`,
            type: 'low_throughput',
            value: avgRequestsPerMinute,
            threshold: 5,
            severity: 'warning'
          });
        }
      });

      const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
      const warningCount = anomalies.filter(a => a.severity === 'warning').length;

      this.logger.debug('异常检测完成', { 
        totalAnomalies: anomalies.length,
        criticalCount,
        warningCount
      });

      return {
        anomalies,
        summary: {
          totalAnomalies: anomalies.length,
          criticalCount,
          warningCount
        }
      };

    } catch (error) {
      this.logger.error('异常检测失败', { error: error.message });
      return {
        anomalies: [],
        summary: { totalAnomalies: 0, criticalCount: 0, warningCount: 0 }
      };
    }
  }

  /**
   * 按端点分组数据
   */
  private groupByEndpoint(data: RawEndpointData[]): Record<string, RawEndpointData[]> {
    return data.reduce((groups, item) => {
      const key = `${item.method}:${item.endpoint}`;
      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {} as Record<string, RawEndpointData[]>);
  }

  /**
   * 更新累加器
   */
  private updateAccumulator(accumulator: any, batch: any): void {
    if (batch.requests) {
      accumulator.totalRequests += batch.requests.length;
      accumulator.totalErrors += batch.requests.filter((r: any) => !r.success).length;
      
      const responseTimes = batch.requests.map((r: any) => r.responseTime);
      accumulator.responseTimeSum += responseTimes.reduce((a: number, b: number) => a + b, 0);
      accumulator.responseTimes.push(...responseTimes);
      accumulator.endpointData.push(...batch.requests);
    }

    if (batch.systemMetrics) {
      accumulator.systemMetrics = batch.systemMetrics;
    }

    if (batch.dbMetrics) {
      accumulator.dbMetrics = batch.dbMetrics;
    }

    if (batch.redisMetrics) {
      accumulator.redisMetrics = batch.redisMetrics;
    }
  }

  /**
   * 完成性能摘要计算
   */
  private finalizePerformanceSummary(accumulator: any): PerformanceSummaryDto {
    const endpointMetrics = this.calculateEndpointMetrics(accumulator.endpointData);
    const averageResponseTime = accumulator.totalRequests > 0 
      ? accumulator.responseTimeSum / accumulator.totalRequests 
      : 0;
    const errorRate = accumulator.totalRequests > 0 
      ? accumulator.totalErrors / accumulator.totalRequests 
      : 0;

    return {
      timestamp: new Date().toISOString(),
      healthScore: this.calculateSimpleHealthScore(errorRate, averageResponseTime),
      processingTime: 0, // 可根据需要实现
      summary: {
        totalRequests: accumulator.totalRequests,
        averageResponseTime,
        errorRate,
        systemLoad: accumulator.systemMetrics?.cpuUsage || 0,
        memoryUsage: accumulator.systemMetrics?.memoryUsage || 0,
        cacheHitRate: accumulator.redisMetrics?.hitRate || 0
      },
      endpoints: endpointMetrics,
      database: accumulator.dbMetrics || this.getDefaultDbMetrics(),
      redis: accumulator.redisMetrics || this.getDefaultRedisMetrics(),
      system: accumulator.systemMetrics || this.getDefaultSystemMetrics()
    };
  }

  /**
   * 计算百分比变化
   */
  private calculatePercentageChange(previous: number, current: number): number {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / previous) * 100;
  }

  /**
   * 简化的健康评分计算
   */
  private calculateSimpleHealthScore(errorRate: number, avgResponseTime: number): number {
    // 使用统一的健康分计算器
    return HealthScoreCalculator.calculateSimpleHealthScore(errorRate, avgResponseTime);
  }

  /**
   * 获取默认数据库指标
   */
  private getDefaultDbMetrics(): any {
    return {
      connectionPoolSize: 0,
      activeConnections: 0,
      waitingConnections: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      totalQueries: 0
    };
  }

  /**
   * 获取默认Redis指标
   */
  private getDefaultRedisMetrics(): any {
    return {
      memoryUsage: 0,
      connectedClients: 0,
      opsPerSecond: 0,
      hitRate: 0,
      evictedKeys: 0,
      expiredKeys: 0
    };
  }

  /**
   * 获取默认系统指标
   */
  private getDefaultSystemMetrics(): any {
    return {
      cpuUsage: 0,
      memoryUsage: 0,
      heapUsed: 0,
      heapTotal: 1073741824, // 1GB默认值
      uptime: 0,
      eventLoopLag: 0
    };
  }
}
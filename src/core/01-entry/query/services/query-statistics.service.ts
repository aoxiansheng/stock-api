import { Injectable } from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";
import { InfrastructureMetricsRegistryService } from '../../../../monitoring/infrastructure/metrics/infrastructure-metrics-registry.service';
import { MetricsHelper } from "../../../../monitoring/infrastructure/helper/metrics-helper";

import {
  QUERY_WARNING_MESSAGES,
  QUERY_PERFORMANCE_CONFIG,
  QUERY_OPERATIONS,
} from "../constants/query.constants";
import { QueryStatsDto } from "../dto/query-response.dto";
import { QueryType } from "../dto/query-types.dto";

/**
 * 查询统计服务
 *
 * 负责收集、计算和提供所有与查询相关的性能和使用统计数据。
 */
@Injectable()
export class QueryStatisticsService {
  private readonly logger = createLogger(QueryStatisticsService.name);
  
  constructor(private readonly metricsRegistry: InfrastructureMetricsRegistryService) {}

  // 旧版内存统计已废弃，所有数据直接从 Prometheus 获取

  /**
   * 记录一次查询的性能指标
   * @param queryType 查询类型
   * @param executionTime 执行时间（毫秒）
   * @param success 是否成功
   * @param cacheUsed 是否使用了缓存
   */
  public recordQueryPerformance(
    queryType: QueryType,
    executionTime: number,
    success: boolean,
    cacheUsed: boolean,
  ): void {
    // 使用 Metrics 助手记录查询总数
    MetricsHelper.inc(
      this.metricsRegistry,
      'streamThroughputPerSecond',
      { stream_type: 'query' },
      1
    );
    
    // 使用 Metrics 助手记录执行时间
    MetricsHelper.observe(
      this.metricsRegistry,
      'streamProcessingTimeMs',
      executionTime,
      { operation_type: 'query' }
    );

    if (cacheUsed) {
      // 使用 Metrics 助手记录缓存命中
      MetricsHelper.inc(
        this.metricsRegistry,
        'streamCacheHitRate',
        { cache_type: 'query' },
        100
      );
    } else {
      // 使用 Metrics 助手记录缓存未命中
      MetricsHelper.inc(
        this.metricsRegistry,
        'streamCacheHitRate',
        { cache_type: 'query' },
        0
      );
    }

    if (!success) {
      // 使用 Metrics 助手记录错误
      MetricsHelper.inc(
        this.metricsRegistry,
        'streamErrorRate',
        { error_type: 'query' },
        100
      );
    } else {
      // 使用 Metrics 助手记录成功
      MetricsHelper.inc(
        this.metricsRegistry,
        'streamErrorRate',
        { error_type: 'query' },
        0
      );
    }

    // 记录慢查询警告
    if (executionTime > QUERY_PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD_MS) {
      this.logger.warn(
        QUERY_WARNING_MESSAGES.SLOW_QUERY_DETECTED,
        sanitizeLogData({
          queryType,
          executionTime,
          threshold: QUERY_PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD_MS,
          operation: QUERY_OPERATIONS.RECORD_QUERY_PERFORMANCE,
        }),
      );
    }

    // 不再维护本地 query type 统计，改由 Prometheus label 分析
  }

  /**
   * 增加缓存命中计数
   */
  public incrementCacheHits(): void {
    // 使用 Metrics 助手记录缓存命中
    MetricsHelper.inc(
      this.metricsRegistry,
      'streamCacheHitRate',
      { cache_type: 'query' },
      100
    );
  }

  /**
   * 获取当前的查询统计信息
   */
  public async getQueryStats(): Promise<QueryStatsDto> {
    const stats = new QueryStatsDto();

    try {
      const [
        avgExecTime,
        cacheHitRate,
        errorRate,
        qps,
      ] = await Promise.all([
        this.metricsRegistry.getMetricValue('newstock_stream_processing_time_ms'),
        this.metricsRegistry.getMetricValue('newstock_stream_cache_hit_rate'),
        this.metricsRegistry.getMetricValue('newstock_stream_error_rate'),
        this.metricsRegistry.getMetricValue('newstock_stream_throughput_per_second'),
      ]);

      stats.performance = {
        totalQueries: 0,
        averageExecutionTime: Number(avgExecTime ?? 0),
        cacheHitRate: Number(cacheHitRate ?? 0),
        errorRate: Number(errorRate ?? 0),
        queriesPerSecond: Number(qps ?? 0),
      };
    } catch (error) {
      this.logger.error('获取查询指标失败', { error: error.message });
      stats.performance = {
        totalQueries: 0,
        averageExecutionTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        queriesPerSecond: 0,
      };
    }

    // 其余字段保持空结构或默认值
    stats.queryTypes = {};
    stats.dataSources = {
      cache: { queries: 0, avgTime: 0, successRate: 1 },
      persistent: { queries: 0, avgTime: 0, successRate: 1 },
      realtime: { queries: 0, avgTime: 0, successRate: 1 },
    };
    stats.popularQueries = [];

    return stats;
  }

  // 已弃用 calculateQueriesPerSecond - 由 Prometheus 直取
  
  /**
   * 重置查询统计
   */
  public resetQueryStats(): void {
    // 仅重置 Prometheus 指标
    MetricsHelper.setGauge(
      this.metricsRegistry,
      'streamThroughputPerSecond',
      0,
      { stream_type: 'query' }
    );
    
    MetricsHelper.setGauge(
      this.metricsRegistry,
      'streamCacheHitRate',
      0,
      { cache_type: 'query' }
    );
    
    MetricsHelper.setGauge(
      this.metricsRegistry,
      'streamErrorRate',
      0,
      { error_type: 'query' }
    );
    
    this.logger.log('查询统计已重置');
  }
}

import { Injectable } from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@app/config/logger.config";
import { CollectorService } from '../../../../monitoring/collector/collector.service';

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
  
  constructor(private readonly collectorService: CollectorService) {} // ✅ 替换为CollectorService

  // 旧版内存统计已废弃，所有数据直接从 Prometheus 获取

  /**
   * ✅ 记录一次查询的性能指标 - 使用CollectorService
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
    try {
      // 使用CollectorService记录查询性能
      this.collectorService.recordRequest(
        '/internal/query-performance',     // endpoint
        'POST',                           // method
        success ? 200 : 500,             // statusCode
        executionTime,                   // duration
        {                                // metadata
          queryType,
          cacheUsed,
          success,
          operation: 'query_performance',
          componentType: 'query_statistics'
        }
      );

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
    } catch (error) {
      this.logger.warn(`查询性能监控记录失败: ${error.message}`, { queryType, executionTime });
    }
  }

  /**
   * ✅ 增加缓存命中计数 - 使用CollectorService
   */
  public incrementCacheHits(): void {
    try {
      // 使用CollectorService记录缓存命中
      this.collectorService.recordCacheOperation(
        'cache_hit',                     // operation
        true,                           // hit
        0,                             // duration (不适用)
        {                              // metadata
          cache_type: 'query',
          operation: 'increment_cache_hits',
          componentType: 'query_statistics'
        }
      );
    } catch (error) {
      this.logger.warn(`缓存命中计数监控记录失败: ${error.message}`);
    }
  }

  /**
   * ✅ 获取当前的查询统计信息 - 简化版本
   * 注意：详细指标现在由CollectorService统一管理，这里返回基本结构
   */
  public async getQueryStats(): Promise<QueryStatsDto> {
    const stats = new QueryStatsDto();

    try {
      // 基本性能统计 - 设置合理默认值
      // 实际监控数据由Prometheus/CollectorService管理
      stats.performance = {
        totalQueries: 0, // 从CollectorService获取或计算
        averageExecutionTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        queriesPerSecond: 0,
      };

      this.logger.debug('查询统计信息获取成功', {
        hasPerformanceData: !!stats.performance,
        operation: 'get_query_stats'
      });

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
   * ✅ 重置查询统计 - 简化版本
   * 注意：实际指标重置由监控系统统一管理
   */
  public resetQueryStats(): void {
    try {
      // 记录重置操作到监控系统
      this.collectorService.recordRequest(
        '/internal/query-stats-reset',   // endpoint
        'POST',                         // method
        200,                           // statusCode
        0,                            // duration
        {                             // metadata
          operation: 'reset_query_stats',
          componentType: 'query_statistics',
          resetTimestamp: new Date().toISOString()
        }
      );
      
      this.logger.log('查询统计重置请求已记录');
    } catch (error) {
      this.logger.warn(`查询统计重置监控记录失败: ${error.message}`);
    }
  }
}

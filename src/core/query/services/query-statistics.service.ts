import { Injectable } from "@nestjs/common";

import { createLogger, sanitizeLogData } from "@common/config/logger.config";

import {
  QUERY_WARNING_MESSAGES,
  QUERY_SUCCESS_MESSAGES,
  QUERY_PERFORMANCE_CONFIG,
  QUERY_OPERATIONS,
} from "../constants/query.constants";
import { QueryStatsRecordDto } from "../dto/query-internal.dto";
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

  private readonly queryStats = {
    totalQueries: 0,
    totalExecutionTime: 0,
    cacheHits: 0,
    errors: 0,
    queryTypeStats: new Map<string, QueryStatsRecordDto>(),
    // 启动时间，用于计算QPS
    startTime: Date.now(),
  };

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
    this.queryStats.totalQueries++;
    this.queryStats.totalExecutionTime += executionTime;

    if (cacheUsed) {
      this.queryStats.cacheHits++;
    }

    if (!success) {
      this.queryStats.errors++;
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

    // 更新按查询类型统计
    const typeKey = queryType.toString();
    if (!this.queryStats.queryTypeStats.has(typeKey)) {
      this.queryStats.queryTypeStats.set(typeKey, {
        count: 0,
        totalTime: 0,
        errors: 0,
      });
    }

    const typeStats = this.queryStats.queryTypeStats.get(typeKey)!;
    typeStats.count++;
    typeStats.totalTime += executionTime;
    if (!success) {
      typeStats.errors++;
    }
  }

  /**
   * 增加缓存命中计数
   */
  public incrementCacheHits(): void {
    this.queryStats.cacheHits++;
  }

  /**
   * 获取当前的查询统计信息
   */
  public async getQueryStats(): Promise<QueryStatsDto> {
    this.logger.debug(
      QUERY_SUCCESS_MESSAGES.QUERY_STATS_RETRIEVED,
      sanitizeLogData({
        totalQueries: this.queryStats.totalQueries,
        operation: QUERY_OPERATIONS.GET_QUERY_STATS,
      }),
    );

    const stats = new QueryStatsDto();

    stats.performance = {
      totalQueries: this.queryStats.totalQueries,
      averageExecutionTime:
        this.queryStats.totalQueries > 0
          ? this.queryStats.totalExecutionTime / this.queryStats.totalQueries
          : 0,
      cacheHitRate:
        this.queryStats.totalQueries > 0
          ? this.queryStats.cacheHits / this.queryStats.totalQueries
          : 0,
      errorRate:
        this.queryStats.totalQueries > 0
          ? this.queryStats.errors / this.queryStats.totalQueries
          : 0,
      queriesPerSecond: this.calculateQueriesPerSecond(),
    };

    stats.queryTypes = {};
    for (const [type, typeStats] of this.queryStats.queryTypeStats) {
      stats.queryTypes[type] = {
        count: typeStats.count,
        averageTime:
          typeStats.count > 0 ? typeStats.totalTime / typeStats.count : 0,
        successRate:
          typeStats.count > 0 ? 1 - typeStats.errors / typeStats.count : 0,
      };
    }

    stats.dataSources = {
      cache: { queries: this.queryStats.cacheHits, avgTime: 0, successRate: 1 },
      persistent: { queries: 0, avgTime: 0, successRate: 1 },
      realtime: {
        queries: this.queryStats.totalQueries - this.queryStats.cacheHits,
        avgTime: 0,
        successRate: 1,
      },
    };

    stats.popularQueries = []; // 实际实现中需要跟踪热门查询

    return stats;
  }

  /**
   * 计算每秒查询数（QPS）
   */
  private calculateQueriesPerSecond(): number {
    const uptimeSeconds = (Date.now() - this.queryStats.startTime) / 1000;
    if (uptimeSeconds < 1) {
      return this.queryStats.totalQueries; // 运行时间太短，直接返回总数
    }
    return this.queryStats.totalQueries / uptimeSeconds;
  }
}

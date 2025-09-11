import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { createLogger, sanitizeLogData } from "@appcore/config/logger.config";
import { SYSTEM_STATUS_EVENTS } from "../../../../monitoring/contracts/events/system-status.events";

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

  constructor(private readonly eventBus: EventEmitter2) {} // ✅ 事件驱动监控

  // 旧版内存统计已废弃，所有数据直接从 Prometheus 获取

  /**
   * ✅ 记录一次查询的性能指标 - 使用事件驱动
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
    // ✅ 事件驱动监控：查询性能指标
    setImmediate(() => {
      try {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "query_statistics",
          metricType: "performance",
          metricName: "query_performance",
          metricValue: executionTime,
          tags: {
            queryType,
            success,
            cacheUsed,
            operation: "query_performance",
            componentType: "query_statistics",
          },
        });
      } catch (error) {
        this.logger.warn(`查询性能监控事件发送失败: ${error.message}`, {
          queryType,
          executionTime,
        });
      }
    });

    // 慢查询警告事件
    if (executionTime > QUERY_PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD_MS) {
      setImmediate(() => {
        try {
          this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
            timestamp: new Date(),
            source: "query_statistics",
            metricType: "alert",
            metricName: "slow_query_detected",
            metricValue: executionTime,
            tags: {
              queryType,
              threshold: QUERY_PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD_MS,
              severity: "warning",
              operation: "slow_query_alert",
              componentType: "query_statistics",
            },
          });
        } catch (error) {
          this.logger.warn(`慢查询警告事件发送失败: ${error.message}`, {
            queryType,
            executionTime,
          });
        }
      });

      // 保留日志记录
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
  }

  /**
   * ✅ 增加缓存命中计数 - 使用事件驱动
   */
  public incrementCacheHits(): void {
    setImmediate(() => {
      try {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "query_statistics",
          metricType: "cache",
          metricName: "cache_hit",
          metricValue: 1,
          tags: {
            cache_type: "query",
            hit: true,
            operation: "increment_cache_hits",
            componentType: "query_statistics",
          },
        });
      } catch (error) {
        this.logger.warn(`缓存命中事件发送失败: ${error.message}`);
      }
    });
  }

  /**
   * ✅ 获取当前的查询统计信息 - 简化版本
   * 注意：详细指标现在由事件驱动监控系统统一管理，这里返回基本结构
   */
  public async getQueryStats(): Promise<QueryStatsDto> {
    const stats = new QueryStatsDto();

    try {
      // 基本性能统计 - 设置合理默认值
      // 实际监控数据由事件驱动监控系统/Prometheus管理
      stats.performance = {
        totalQueries: 0, // 从事件驱动监控系统获取或计算
        averageExecutionTime: 0,
        cacheHitRate: 0,
        errorRate: 0,
        queriesPerSecond: 0,
      };

      this.logger.debug("查询统计信息获取成功", {
        hasPerformanceData: !!stats.performance,
        operation: "get_query_stats",
      });
    } catch (error) {
      this.logger.error("获取查询指标失败", { error: error.message });
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
   * ✅ 重置查询统计 - 事件驱动版本
   * 注意：实际指标重置由监控系统统一管理
   */
  public resetQueryStats(): void {
    setImmediate(() => {
      try {
        this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
          timestamp: new Date(),
          source: "query_statistics",
          metricType: "system",
          metricName: "stats_reset",
          metricValue: 1,
          tags: {
            operation: "reset_query_stats",
            componentType: "query_statistics",
            resetTimestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        this.logger.warn(`查询统计重置事件发送失败: ${error.message}`);
      }
    });

    this.logger.log("查询统计重置事件已发送");
  }
}

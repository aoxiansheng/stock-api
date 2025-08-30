import { Injectable } from '@nestjs/common';
import { createLogger } from '@app/config/logger.config';
import { CollectorService } from '../../../../monitoring/collector/collector.service';

/**
 * StreamMetricsService - 流数据获取器语义明确的指标服务
 * 
 * 🎯 解决指标语义混乱问题：
 * - 连接事件 vs 连接状态 vs 符号处理分离
 * - Counter vs Gauge 语义明确
 * - 指标命名规范化
 * - 支持过渡期双发指标策略
 */
@Injectable()
export class StreamMetricsService {
  private readonly logger = createLogger('StreamMetrics');

  constructor(
    private readonly collectorService: CollectorService,
  ) {}

  /**
   * 记录连接事件 (Counter)
   * @param event 连接事件类型
   * @param provider 提供商名称
   */
  recordConnectionEvent(event: 'connected' | 'disconnected' | 'failed', provider: string): void {
    try {
      this.collectorService.recordRequest(
        `/stream/connection/${provider}`,
        'WEBSOCKET',
        event === 'failed' ? 500 : 200,
        0, // duration
        { 
          event, 
          provider,
          operation: 'stream_connection'
        }
      );
      
    } catch (error) {
      this.logger.warn('连接事件指标记录失败', { error: error.message, event, provider });
    }
  }

  /**
   * 更新活跃连接数 (Gauge)
   * @param count 连接数量
   * @param provider 提供商名称
   */
  updateActiveConnectionsCount(count: number, provider: string): void {
    try {
      this.collectorService.recordRequest(
        `/stream/active-connections/${provider}`,
        'GAUGE',
        200,
        count, // use count as duration for gauge metrics
        { 
          provider,
          operation: 'stream_active_connections',
          metric_type: 'gauge',
          metric_value: count
        }
      );
      
    } catch (error) {
      this.logger.warn('活跃连接数指标记录失败', { error: error.message, count, provider });
    }
  }

  /**
   * 记录符号处理操作 (Counter)
   * @param symbols 符号列表
   * @param provider 提供商名称
   * @param action 操作类型
   */
  recordSymbolProcessing(symbols: string[], provider: string, action: 'subscribe' | 'unsubscribe'): void {
    try {
      this.collectorService.recordRequest(
        `/stream/symbols/${provider}/${action}`,
        'POST',
        200,
        0, // duration
        { 
          provider, 
          action,
          symbol_count: symbols.length,
          operation: 'stream_symbols_processing'
        }
      );
      
    } catch (error) {
      this.logger.warn('符号处理指标记录失败', { 
        error: error.message, 
        symbolCount: symbols.length, 
        provider, 
        action 
      });
    }
  }

  /**
   * 记录操作延迟 (Histogram)
   * @param operation 操作类型
   * @param duration 持续时间(毫秒)
   * @param provider 提供商名称
   */
  recordLatency(operation: string, duration: number, provider: string): void {
    try {
      this.collectorService.recordRequest(
        `/stream/latency/${provider}/${operation}`,
        'METRIC',
        200,
        duration,
        { 
          operation, 
          provider,
          metric_type: 'histogram'
        }
      );
      
    } catch (error) {
      this.logger.warn('操作延迟指标记录失败', { 
        error: error.message, 
        operation, 
        duration, 
        provider 
      });
    }
  }

  /**
   * 记录连接状态变化 (专用指标)
   * @param provider 提供商名称
   * @param oldStatus 旧状态
   * @param newStatus 新状态
   */
  recordConnectionStatusChange(provider: string, oldStatus: string, newStatus: string): void {
    try {
      this.collectorService.recordRequest(
        `/stream/status-change/${provider}`,
        'POST',
        200,
        0, // duration
        { 
          provider, 
          old_status: oldStatus,
          new_status: newStatus,
          operation: 'stream_connection_status_change'
        }
      );
      
    } catch (error) {
      this.logger.warn('连接状态变化指标记录失败', { 
        error: error.message, 
        provider, 
        oldStatus, 
        newStatus 
      });
    }
  }

  /**
   * 更新队列统计 (Gauge)
   * @param stats 队列统计信息
   */
  updateQueueStats(stats: { waiting: number; active: number; completed: number; failed: number }): void {
    try {
      Object.entries(stats).forEach(([status, count]) => {
        this.collectorService.recordRequest(
          `/stream/queue/${status}`,
          'GAUGE',
          200,
          count, // use count as duration for gauge metrics
          { 
            status,
            metric_type: 'gauge',
            metric_value: count,
            operation: 'stream_recovery_queue'
          }
        );
      });
      
    } catch (error) {
      this.logger.warn('队列统计指标记录失败', { error: error.message, stats });
    }
  }

  /**
   * 记录连接池统计 (Gauge)
   * @param stats 连接池统计信息
   */
  recordConnectionPoolStats(stats: { 
    total: number; 
    active: number; 
    idle: number; 
    pending: number; 
  }): void {
    try {
      Object.entries(stats).forEach(([type, count]) => {
        this.collectorService.recordRequest(
          `/stream/connection-pool/${type}`,
          'GAUGE',
          200,
          count, // use count as duration for gauge metrics
          { 
            type,
            metric_type: 'gauge',
            metric_value: count,
            operation: 'stream_connection_pool'
          }
        );
      });
      
    } catch (error) {
      this.logger.warn('连接池统计指标记录失败', { error: error.message, stats });
    }
  }

  /**
   * 记录错误事件 (Counter)
   * @param errorType 错误类型
   * @param provider 提供商名称
   */
  recordErrorEvent(errorType: string, provider: string): void {
    try {
      this.collectorService.recordRequest(
        `/stream/error/${provider}`,
        'POST',
        500, // error status code
        0, // duration
        { 
          error_type: errorType,
          provider,
          operation: 'stream_error_event'
        }
      );
      
    } catch (error) {
      this.logger.warn('错误事件指标记录失败', { error: error.message, errorType, provider });
    }
  }

  /**
   * 获取指标摘要
   * @returns 指标摘要信息
   */
  getMetricsSummary(): { metrics: string[]; }  {
    return {
      metrics: [
        'stream_connection_events_total',
        'stream_active_connections_gauge',
        'stream_symbols_processed_total',
        'stream_operation_duration_ms',
        'stream_connection_status_changes_total',
        'stream_recovery_queue_jobs_gauge',
        'stream_connection_pool_gauge',
        'stream_error_events_total'
      ]
    };
  }
}
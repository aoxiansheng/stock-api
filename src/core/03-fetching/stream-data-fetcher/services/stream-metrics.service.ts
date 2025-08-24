import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { MetricsRegistryService } from '../../../../monitoring/infrastructure/metrics/metrics-registry.service';
import { MetricsHelper } from '../../../../monitoring/infrastructure/helper/infrastructure-helper';

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
    private readonly metricsRegistry: MetricsRegistryService,
  ) {}

  /**
   * 记录连接事件 (Counter)
   * @param event 连接事件类型
   * @param provider 提供商名称
   */
  recordConnectionEvent(event: 'connected' | 'disconnected' | 'failed', provider: string): void {
    try {
      MetricsHelper.inc(
        this.metricsRegistry,
        'stream_connection_events_total',
        { 
          event, 
          provider 
        }
      );
      
      // 过渡期双发策略
      this.recordTransitionMetrics('streamConcurrentConnections', 1, { provider, action: event });
      
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
      MetricsHelper.setGauge(
        this.metricsRegistry,
        'stream_active_connections_gauge',
        count,
        { provider }
      );
      
      // 过渡期双发策略
      this.recordTransitionMetrics('streamConcurrentConnections', count, { provider });
      
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
      MetricsHelper.inc(
        this.metricsRegistry,
        'stream_symbols_processed_total',
        { 
          provider, 
          action 
        },
        symbols.length
      );
      
      // TODO: Use correct histogram method when available
      // MetricsHelper.addToHistogram(
      //   this.metricsRegistry,
      //   'stream_symbols_batch_size',
      //   symbols.length,
      //   { 
      //     provider, 
      //     action 
      //   }
      // );
      
      // 过渡期：避免误用旧指标记录符号操作
      // 旧指标 streamSymbolsProcessedTotal 被误用于记录状态变化，这里不再双发
      
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
      // TODO: Use correct histogram method when available
      // MetricsHelper.recordHistogram(
      //   this.metricsRegistry,
      //   'stream_operation_duration_ms',
      //   duration,
      //   {
      //     operation,
      //     provider
      //   }
      // );
      
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
      MetricsHelper.inc(
        this.metricsRegistry,
        'stream_connection_status_changes_total',
        { 
          provider, 
          old_status: oldStatus,
          new_status: newStatus
        }
      );
      
      // 这里修复了旧代码的问题：用专用指标记录状态变化，而不是复用符号处理指标
      // 旧代码错误: streamSymbolsProcessedTotal 被误用于记录状态变化
      
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
        MetricsHelper.setGauge(
          this.metricsRegistry,
          'stream_recovery_queue_jobs_gauge',
          count,
          { status }
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
        MetricsHelper.setGauge(
          this.metricsRegistry,
          'stream_connection_pool_gauge',
          count,
          { type }
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
      MetricsHelper.inc(
        this.metricsRegistry,
        'stream_error_events_total',
        { 
          error_type: errorType,
          provider
        }
      );
      
      // 过渡期双发策略 - 旧指标使用 Gauge 语义不准确
      this.recordTransitionMetrics('streamErrorRate', 1, { error_type: errorType });
      
    } catch (error) {
      this.logger.warn('错误事件指标记录失败', { error: error.message, errorType, provider });
    }
  }

  /**
   * 过渡期双发指标策略
   * @param legacyMetricName 旧指标名称
   * @param value 指标值
   * @param labels 标签
   */
  private recordTransitionMetrics(
    legacyMetricName: string, 
    value: number, 
    labels: Record<string, string>
  ): void {
    // 仅在环境变量允许时发送旧指标
    if (process.env.LEGACY_METRICS_ENABLED !== 'false') {
      try {
        MetricsHelper.setGauge(
          this.metricsRegistry,
          legacyMetricName,
          value,
          { 
            ...labels, 
            deprecated: 'true' 
          }
        );
      } catch (error) {
        // 旧指标失败不影响新指标
        this.logger.debug('旧指标记录失败', { 
          error: error.message, 
          legacyMetricName 
        });
      }
    }
  }

  /**
   * 获取指标摘要
   * @returns 指标摘要信息
   */
  getMetricsSummary(): { newMetrics: string[]; legacyMetrics: string[]; transitionMode: boolean } {
    return {
      newMetrics: [
        'stream_connection_events_total',
        'stream_active_connections_gauge',
        'stream_symbols_processed_total',
        'stream_symbols_batch_size',
        'stream_operation_duration_ms',
        'stream_connection_status_changes_total',
        'stream_recovery_queue_jobs_gauge',
        'stream_connection_pool_gauge',
        'stream_error_events_total'
      ],
      legacyMetrics: [
        'streamConcurrentConnections',
        'streamSymbolsProcessedTotal',
        'streamProcessingTimeMs',
        'streamErrorRate'
      ],
      transitionMode: process.env.LEGACY_METRICS_ENABLED !== 'false'
    };
  }
}
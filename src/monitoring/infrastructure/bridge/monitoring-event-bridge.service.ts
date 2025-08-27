import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { MetricsRegistryService } from '../metrics/metrics-registry.service';
import { SYSTEM_STATUS_EVENTS } from '../../contracts/events/system-status.events';
import { createLogger } from '../../../common/config/logger.config';
import { EventBatcher, BatchResult } from './event-batcher';

/**
 * 🎯 监控事件桥接层服务
 * 
 * 职责：将系统事件转换为 Prometheus 指标
 * 设计理念：最小化、高性能、错误隔离
 */
@Injectable()
export class MonitoringEventBridgeService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(MonitoringEventBridgeService.name);
  private eventCounter = 0;
  private lastFlush = Date.now();
  private readonly batcher = new EventBatcher(100, 100, 10000); // 100ms间隔，100个批次大小，10000最大队列
  
  constructor(
    private readonly eventBus: EventEmitter2,
    private readonly metricsRegistry: MetricsRegistryService,
  ) {}

  async onModuleDestroy() {
    this.logger.log('监控事件桥接层正在关闭...');
    await this.batcher.shutdown();
    this.logger.log('事件批处理器已关闭');
  }

  onModuleInit() {
    this.logger.log('监控事件桥接层已启动', {
      eventsSupported: [
        'METRIC_COLLECTED',
        'CACHE_HIT/MISS',
        'ANALYSIS_COMPLETED',
        'API_REQUEST_*'
      ]
    });
  }

  /**
   * 处理指标收集事件 - 使用批处理优化
   */
  @OnEvent(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED)
  handleMetricCollected(event: any) {
    try {
      const { metricType, metricName, metricValue, tags } = event;
      
      // 高频事件使用批处理
      const batchResult = this.batcher.add(metricType || 'unknown', event);
      
      if (!batchResult.accepted) {
        this.logger.warn('事件批处理队列已满，事件被丢弃', {
          reason: batchResult.reason,
          droppedCount: batchResult.droppedCount
        });
        return;
      }
      
      // 如果需要立即刷新，处理该类型的批次
      if (batchResult.shouldFlush) {
        this.processBatch(metricType || 'unknown');
      }
      
      this.eventCounter++;
      
      // 定期刷新所有批次
      if (this.eventCounter >= 1000 || Date.now() - this.lastFlush > 5000) {
        this.flushAllBatches();
      }
    } catch (error) {
      // 静默处理，不影响主流程
      this.logger.debug('事件处理失败', { 
        eventType: 'METRIC_COLLECTED',
        error: error.message 
      });
    }
  }

  /**
   * 处理单个批次
   */
  private processBatch(eventType: string) {
    const batch = this.batcher.flushType(eventType);
    if (!batch) return;
    
    try {
      // 聚合相同类型的事件并批量更新指标
      const aggregatedMetrics = this.aggregateEvents(batch.events);
      this.updateMetricsBatch(eventType, aggregatedMetrics);
      
      this.logger.debug(`批次处理完成: ${eventType}`, {
        eventCount: batch.count,
        duration: batch.lastTimestamp - batch.firstTimestamp
      });
    } catch (error) {
      this.logger.debug(`批处理失败: ${eventType}`, { 
        error: error.message,
        eventCount: batch.count
      });
    }
  }

  /**
   * 聚合事件数据
   */
  private aggregateEvents(events: any[]): Map<string, { count: number; value: number; tags: any }> {
    const aggregated = new Map();
    
    events.forEach(event => {
      const { metricName, metricValue, tags } = event;
      const key = JSON.stringify({ metricName, tags });
      
      if (aggregated.has(key)) {
        const existing = aggregated.get(key);
        existing.count += 1;
        existing.value += (metricValue || 0);
      } else {
        aggregated.set(key, {
          count: 1,
          value: metricValue || 0,
          tags: tags || {},
          metricName
        });
      }
    });
    
    return aggregated;
  }

  /**
   * 批量更新指标
   */
  private updateMetricsBatch(eventType: string, aggregatedMetrics: Map<string, any>) {
    aggregatedMetrics.forEach(({ count, value, tags, metricName }) => {
      try {
        switch (eventType) {
          case 'request':
            // 对于计数器类型，使用聚合的count
            this.metricsRegistry.receiverRequestsTotal.inc(tags, count);
            break;
          case 'cache':
            // 对于gauge类型，使用平均值
            this.metricsRegistry.storageCacheEfficiency.set(tags, value / count);
            break;
          case 'database':
            this.metricsRegistry.storageOperationsTotal.inc(tags, count);
            break;
          case 'stream':
            this.metricsRegistry.streamSymbolsProcessedTotal.inc(tags, count);
            break;
          case 'query':
            this.metricsRegistry.querySymbolsProcessedTotal.inc(tags, count);
            break;
          default:
            this.metricsRegistry.receiverRequestsTotal.inc({
              ...tags,
              metric_type: eventType
            }, count);
        }
      } catch (error) {
        this.logger.debug('批量指标更新失败', {
          eventType,
          metricName,
          error: error.message
        });
      }
    });
  }

  /**
   * 刷新所有批次
   */
  private flushAllBatches() {
    const allBatches = this.batcher.flushAll();
    
    allBatches.forEach(batch => {
      try {
        const aggregatedMetrics = this.aggregateEvents(batch.events);
        this.updateMetricsBatch(batch.type, aggregatedMetrics);
      } catch (error) {
        this.logger.debug(`批量刷新失败: ${batch.type}`, {
          error: error.message,
          eventCount: batch.count
        });
      }
    });
    
    this.eventCounter = 0;
    this.lastFlush = Date.now();
    
    this.logger.debug('所有批次已刷新', {
      batchCount: allBatches.length,
      totalEvents: allBatches.reduce((sum, batch) => sum + batch.count, 0)
    });
  }

  /**
   * 处理缓存事件
   */
  @OnEvent(SYSTEM_STATUS_EVENTS.CACHE_HIT)
  @OnEvent(SYSTEM_STATUS_EVENTS.CACHE_MISS)
  handleCacheEvent(event: any) {
    try {
      const isHit = event.type === SYSTEM_STATUS_EVENTS.CACHE_HIT;
      const cacheType = event.metadata?.cache_type || 'monitoring';
      
      this.metricsRegistry.storageCacheEfficiency.set(
        { 
          cache_type: cacheType, 
          operation: event.key || 'unknown'
        },
        isHit ? 1 : 0
      );
      
      // 记录缓存操作总数
      this.metricsRegistry.storageOperationsTotal.inc({
        operation: isHit ? 'cache_hit' : 'cache_miss',
        storage_type: 'redis'
      });
      
    } catch (error) {
      this.logger.debug('缓存事件处理失败', {
        eventType: 'CACHE_EVENT',
        error: error.message
      });
    }
  }

  /**
   * 处理缓存设置事件
   */
  @OnEvent(SYSTEM_STATUS_EVENTS.CACHE_SET)
  handleCacheSetEvent(event: any) {
    try {
      this.metricsRegistry.storageOperationsTotal.inc({
        operation: 'cache_set',
        storage_type: 'redis'
      });
      
      // 记录缓存数据量
      if (event.metadata?.size) {
        this.metricsRegistry.storageDataVolume.set(
          {
            data_type: 'cache',
            storage_type: 'redis'
          },
          event.metadata.size
        );
      }
    } catch (error) {
      this.logger.debug('缓存设置事件处理失败', {
        eventType: 'CACHE_SET',
        error: error.message
      });
    }
  }

  /**
   * 处理缓存失效事件
   */
  @OnEvent(SYSTEM_STATUS_EVENTS.CACHE_INVALIDATED)
  handleCacheInvalidatedEvent(event: any) {
    try {
      this.metricsRegistry.storageOperationsTotal.inc({
        operation: 'cache_invalidated',
        storage_type: 'redis'
      });
    } catch (error) {
      this.logger.debug('缓存失效事件处理失败', {
        eventType: 'CACHE_INVALIDATED', 
        error: error.message
      });
    }
  }

  /**
   * 处理缓存错误事件
   */
  @OnEvent(SYSTEM_STATUS_EVENTS.CACHE_ERROR)
  handleCacheErrorEvent(event: any) {
    try {
      this.metricsRegistry.storageOperationsTotal.inc({
        operation: 'cache_error',
        storage_type: 'redis'
      });
      
      // 更新错误率
      this.metricsRegistry.receiverErrorRate.set(
        { error_type: 'cache' },
        1 // 表示有错误发生
      );
    } catch (error) {
      this.logger.debug('缓存错误事件处理失败', {
        eventType: 'CACHE_ERROR',
        error: error.message
      });
    }
  }

  /**
   * 处理分析完成事件
   */
  @OnEvent(SYSTEM_STATUS_EVENTS.ANALYSIS_COMPLETED)
  handleAnalysisCompleted(event: any) {
    try {
      const { duration, dataPoints, analysisType } = event;
      
      // 使用现有的通用处理时间指标
      this.metricsRegistry.receiverProcessingDuration.observe(
        { 
          method: 'analysis',
          provider: 'internal',
          operation: analysisType || 'general',
          status: 'success',
          attempt: '1'
        },
        duration / 1000
      );
      
      // 记录数据分析操作
      this.metricsRegistry.transformerOperationsTotal.inc({
        operation_type: `analysis_${analysisType || 'general'}`,
        provider: 'internal'
      });
      
      // 记录处理的数据点数量
      if (dataPoints) {
        this.metricsRegistry.transformerBatchSize.observe(
          { operation_type: 'analysis' },
          dataPoints
        );
      }
      
    } catch (error) {
      this.logger.debug('分析事件处理失败', {
        eventType: 'ANALYSIS_COMPLETED',
        error: error.message
      });
    }
  }

  /**
   * 处理API请求开始事件
   */
  @OnEvent(SYSTEM_STATUS_EVENTS.API_REQUEST_STARTED)
  handleApiRequestStarted(event: any) {
    try {
      this.metricsRegistry.receiverActiveConnections.inc({
        connection_type: 'api'
      });
      
      this.metricsRegistry.receiverRequestsTotal.inc({
        method: event.method || 'unknown',
        status: 'started',
        provider: 'api',
        operation: event.endpoint || 'unknown'
      });
    } catch (error) {
      this.logger.debug('API请求开始事件处理失败', {
        eventType: 'API_REQUEST_STARTED',
        error: error.message
      });
    }
  }

  /**
   * 处理API请求完成事件
   */
  @OnEvent(SYSTEM_STATUS_EVENTS.API_REQUEST_COMPLETED)
  handleApiRequestCompleted(event: any) {
    try {
      const { duration, statusCode, method, endpoint } = event;
      
      this.metricsRegistry.receiverActiveConnections.dec({
        connection_type: 'api'
      });
      
      this.metricsRegistry.receiverRequestsTotal.inc({
        method: method || 'unknown',
        status: `${statusCode}` || 'unknown',
        provider: 'api',
        operation: endpoint || 'unknown'
      });
      
      if (duration) {
        this.metricsRegistry.receiverProcessingDuration.observe(
          {
            method: method || 'unknown',
            provider: 'api',
            operation: endpoint || 'unknown',
            status: statusCode >= 400 ? 'error' : 'success',
            attempt: '1'
          },
          duration / 1000
        );
      }
    } catch (error) {
      this.logger.debug('API请求完成事件处理失败', {
        eventType: 'API_REQUEST_COMPLETED',
        error: error.message
      });
    }
  }

  /**
   * 处理API请求错误事件
   */
  @OnEvent(SYSTEM_STATUS_EVENTS.API_REQUEST_ERROR)
  handleApiRequestError(event: any) {
    try {
      const { duration, statusCode, method, endpoint } = event;
      
      this.metricsRegistry.receiverActiveConnections.dec({
        connection_type: 'api'
      });
      
      this.metricsRegistry.receiverRequestsTotal.inc({
        method: method || 'unknown',
        status: 'error',
        provider: 'api',
        operation: endpoint || 'unknown',
        error_type: event.metadata?.errorType || 'unknown'
      });
      
      if (duration) {
        this.metricsRegistry.receiverProcessingDuration.observe(
          {
            method: method || 'unknown',
            provider: 'api',
            operation: endpoint || 'unknown',
            status: 'error',
            attempt: '1'
          },
          duration / 1000
        );
      }
      
      // 更新错误率
      this.metricsRegistry.receiverErrorRate.set(
        { error_type: 'api' },
        1
      );
    } catch (error) {
      this.logger.debug('API请求错误事件处理失败', {
        eventType: 'API_REQUEST_ERROR',
        error: error.message
      });
    }
  }

  /**
   * 处理健康检查事件
   */
  @OnEvent(SYSTEM_STATUS_EVENTS.HEALTH_SCORE_UPDATED)
  handleHealthScoreUpdated(event: any) {
    try {
      const { component, score, status } = event;
      
      // 将健康分数映射到系统CPU使用率指标（作为健康度表示）
      this.metricsRegistry.systemCpuUsagePercent.set(
        score / 100 // 归一化到0-1
      );
      
      // 记录健康检查操作
      this.metricsRegistry.storageOperationsTotal.inc({
        operation: 'health_check',
        storage_type: component || 'system'
      });
      
    } catch (error) {
      this.logger.debug('健康检查事件处理失败', {
        eventType: 'HEALTH_SCORE_UPDATED',
        error: error.message
      });
    }
  }

  /**
   * 处理趋势检测事件
   */
  @OnEvent(SYSTEM_STATUS_EVENTS.TREND_DETECTED)
  handleTrendDetected(event: any) {
    try {
      const { metric, trendType, changePercentage, severity } = event;
      
      // 记录趋势分析操作
      this.metricsRegistry.transformerOperationsTotal.inc({
        operation_type: 'trend_analysis',
        provider: 'internal'
      });
      
      // 使用流处理错误率来表示趋势异常程度
      if (severity === 'high') {
        this.metricsRegistry.streamErrorRate.set(
          { error_category: 'trend_anomaly' },
          Math.abs(changePercentage) / 100
        );
      }
      
    } catch (error) {
      this.logger.debug('趋势检测事件处理失败', {
        eventType: 'TREND_DETECTED',
        error: error.message
      });
    }
  }


  /**
   * 获取事件桥接统计信息
   */
  getEventBridgeMetrics() {
    const batcherMetrics = this.batcher.getMetrics();
    const batcherStatus = this.batcher.getStatus();
    
    return {
      totalEventsProcessed: this.eventCounter,
      lastFlushTime: new Date(this.lastFlush).toISOString(),
      status: 'active',
      batcher: {
        metrics: batcherMetrics,
        status: batcherStatus.status,
        reason: batcherStatus.reason
      }
    };
  }

  /**
   * 获取事件批处理器状态
   */
  getBatcherStatus() {
    return this.batcher.getStatus();
  }

  /**
   * 强制刷新批次（用于测试或紧急情况）
   */
  forceFlushBatches() {
    this.flushAllBatches();
  }
}
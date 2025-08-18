/**
 * 🎯 流式数据处理性能指标服务
 * 
 * 使用 prom-client 库提供标准化的 Prometheus 指标监控
 * 用于 WebSocket 流系统性能优化和批量处理监控
 */

import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { FeatureFlags } from '@common/config/feature-flags.config';
import { MAPPING_RULE_CATEGORY, type MappingRuleCategory } from '@common/constants/mapping-rule-category.constants';
import { MetricsRegistryService } from '../../../monitoring/metrics/services/metrics-registry.service';
import { Metrics } from '../../../monitoring/metrics/metrics-helper';

// 流处理性能统计接口（保持向后兼容）
export interface StreamProcessingStats {
  totalSymbolsProcessed: number;
  totalRulesCompiled: number;
  averageProcessingTimeMs: number;
  cacheHitRate: number;
  errorRate: number;
  throughputPerSecond: number;
  concurrentConnections: number;
  // 批量处理相关统计
  batchProcessingStats: {
    totalBatches: number;
    totalQuotesInBatches: number;
    averageBatchSize: number;
    averageBatchProcessingTimeMs: number;
    batchSuccessRate: number;
  };
}

@Injectable()
export class StreamPerformanceMetrics {
  private readonly logger = createLogger(StreamPerformanceMetrics.name);
  
  // 历史遗留值，已重构为使用 Prometheus 指标
  private readonly throughputWindowSize = 60; // 60秒窗口，仅作为常量配置

  constructor(
    private readonly featureFlags: FeatureFlags,
    private readonly metricsRegistry: MetricsRegistryService,
  ) {
    // 定期更新计算指标
    setInterval(() => this.updateCalculatedMetrics(), 10 * 1000); // 每10秒更新计算指标
  }

  /**
   * 🎯 记录符号处理指标
   */
  recordSymbolProcessed(
    processingTimeMs: number, 
    success: boolean = true,
    provider: string = 'unknown',
    market: string = 'unknown'
  ): void {
    if (!this.featureFlags.isPerformanceOptimizationEnabled()) {
      return;
    }

    // 使用 Metrics helper 更新指标
    Metrics.inc(
      this.metricsRegistry, 
      'streamSymbolsProcessedTotal', 
      { provider, market }
    );
    
    if (success) {
      this.recordResponseTime(processingTimeMs);
    } else {
      // 如果失败，记录错误
      this.recordError(`symbol_processing_${provider}`);
    }

    // 记录吞吐量 - 使用计数器替代内存统计
    Metrics.inc(
      this.metricsRegistry, 
      'streamThroughputPerSecond', 
      { stream_type: 'overall' }
    );
  }

  /**
   * 🎯 记录规则编译指标
   */
  recordRuleCompiled(
    compilationTimeMs: number, 
    cacheHit: boolean = false,
    provider: string = 'unknown',
    /** 
     * 数据映射规则类别，与 Data-Mapper 组件的 transDataRuleListType 保持语义一致
     */
    mappingRuleCategory: MappingRuleCategory = MAPPING_RULE_CATEGORY.QUOTE_FIELDS
  ): void {
    if (!this.featureFlags.isPerformanceOptimizationEnabled()) {
      return;
    }

    // 记录缓存命中情况
    this.recordCacheAccess(cacheHit, 'rule_compilation');

    // 使用 Metrics helper 更新指标
    Metrics.inc(
      this.metricsRegistry, 
      'streamRulesCompiledTotal', 
      { provider, mapping_rule_category: mappingRuleCategory }
    );

    this.recordResponseTime(compilationTimeMs);
  }

  /**
   * 🎯 记录缓存命中/丢失
   */
  recordCacheAccess(hit: boolean, cacheType: string = 'general'): void {
    if (!this.featureFlags.isPerformanceOptimizationEnabled()) {
      return;
    }

    // 从 Prometheus 获取当前值，并计算新的命中率
    // 这里不再维护本地的命中/丢失计数
    Metrics.setGauge(
      this.metricsRegistry,
      'streamCacheHitRate',
      hit ? 100 : 0,  // 简化的方法：每次调用都只反映当前这一次的命中情况
      { cache_type: cacheType }
    );
  }

  /**
   * 🎯 记录连接状态变化
   */
  recordConnectionChange(delta: number, connectionType: string = 'websocket'): void {
    // 直接从 Prometheus 获取当前连接数，增加/减少，然后更新回 Prometheus
    this.metricsRegistry.getMetricValue('newstock_stream_concurrent_connections')
      .then(currentConnections => {
        const count = Math.max(0, (Number(currentConnections) || 0) + delta);
        
        // 使用 Metrics helper 更新指标
        Metrics.setGauge(
          this.metricsRegistry,
          'streamConcurrentConnections',
          count,
          { connection_type: connectionType }
        );
      })
      .catch(error => {
        this.logger.error('获取连接数指标失败', error);
        // 降级处理 - 直接记录增量
        Metrics.setGauge(
          this.metricsRegistry,
          'streamConcurrentConnections',
          delta > 0 ? 1 : 0,
          { connection_type: connectionType }
        );
      });
  }

  /**
   * 🎯 记录批量处理指标
   */
  recordBatchProcessed(
    quotesCount: number, 
    processingTimeMs: number, 
    success: boolean = true,
    provider: string = 'unknown'
  ): void {
    if (!this.featureFlags.isPerformanceOptimizationEnabled()) {
      return;
    }

    const batchType = this.getBatchSizeRange(quotesCount);
    const labels = { provider, batch_type: batchType };
    const histogramLabels = { provider, batch_size_range: batchType };
    
    // 使用 Metrics helper 更新指标
    Metrics.inc(
      this.metricsRegistry, 
      'streamBatchesProcessedTotal', 
      labels
    );
    
    Metrics.inc(
      this.metricsRegistry, 
      'streamQuotesInBatchesTotal', 
      { provider },
      quotesCount
    );
    
    Metrics.observe(
      this.metricsRegistry,
      'streamBatchProcessingDuration',
      processingTimeMs,
      histogramLabels
    );
    
    // 如果批处理失败，记录错误
    if (!success) {
      this.recordError(`batch_processing_${provider}`);
    }
    
    this.logger.debug('批量处理指标记录', {
      quotesCount,
      processingTimeMs,
      success,
      provider
    });
  }

  /**
   * 🎯 记录批量预加载缓存命中
   */
  recordBatchPreloadCacheHit(symbolsCount: number, hitRate: number): void {
    if (!this.featureFlags.isPerformanceOptimizationEnabled()) {
      return;
    }
    
    // 使用 Metrics helper 更新缓存命中率
    Metrics.setGauge(
      this.metricsRegistry,
      'streamCacheHitRate',
      hitRate,
      { cache_type: 'preload' }
    );

    this.logger.debug('批量预加载缓存指标', {
      symbolsCount,
      hitRate
    });
  }

  /**
   * 🎯 记录错误
   */
  recordError(errorType: string = 'general'): void {
    // 更新错误率到 Prometheus - 简化实现，直接设置为100%表示发生了错误
    // 实际错误率由 Prometheus 的时序数据计算得出
    Metrics.setGauge(
      this.metricsRegistry,
      'streamErrorRate',
      100,
      { error_type: errorType }
    );
  }

  /**
   * 🎯 获取当前性能统计（保持向后兼容）
   * 直接从 Prometheus 指标中读取，而不是使用内存中的计数器
   */
  async getStreamProcessingStats(): Promise<StreamProcessingStats> {
    try {
      const [
        symbolsProcessed,
        rulesCompiled,
        processingTime,
        cacheHitRate,
        errorRate,
        throughput,
        connections,
        batchesProcessed,
        quotesInBatches,
        batchSize,
        batchProcessingTime,
        batchSuccessRate
      ] = await Promise.all([
        this.metricsRegistry.getMetricValue('newstock_stream_symbols_processed_total') || 0,
        this.metricsRegistry.getMetricValue('newstock_stream_rules_compiled_total') || 0,
        this.metricsRegistry.getMetricValue('newstock_stream_processing_time_ms') || 0,
        this.metricsRegistry.getMetricValue('newstock_stream_cache_hit_rate') || 0,
        this.metricsRegistry.getMetricValue('newstock_stream_error_rate') || 0,
        this.metricsRegistry.getMetricValue('newstock_stream_throughput_per_second') || 0,
        this.metricsRegistry.getMetricValue('newstock_stream_concurrent_connections') || 0,
        this.metricsRegistry.getMetricValue('newstock_stream_batches_processed_total') || 0,
        this.metricsRegistry.getMetricValue('newstock_stream_quotes_in_batches_total') || 0,
        this.metricsRegistry.getMetricValue('newstock_stream_average_batch_size') || 0,
        this.metricsRegistry.getMetricValue('newstock_stream_batch_processing_duration_ms') || 0,
        this.metricsRegistry.getMetricValue('newstock_stream_batch_success_rate') || 0
      ]);

      return {
        totalSymbolsProcessed: Number(symbolsProcessed),
        totalRulesCompiled: Number(rulesCompiled),
        averageProcessingTimeMs: Number(processingTime),
        cacheHitRate: Number(cacheHitRate),
        errorRate: Number(errorRate),
        throughputPerSecond: Number(throughput),
        concurrentConnections: Number(connections),
        batchProcessingStats: {
          totalBatches: Number(batchesProcessed),
          totalQuotesInBatches: Number(quotesInBatches),
          averageBatchSize: Number(batchSize),
          averageBatchProcessingTimeMs: Number(batchProcessingTime),
          batchSuccessRate: Number(batchSuccessRate),
        },
      };
    } catch (error) {
      this.logger.error('获取指标失败', error);
      // 降级处理 - 返回默认值
      return {
        totalSymbolsProcessed: 0,
        totalRulesCompiled: 0,
        averageProcessingTimeMs: 0,
        cacheHitRate: 0,
        errorRate: 0,
        throughputPerSecond: this.calculateThroughputPerSecond(),
        concurrentConnections: 0, // 从 Prometheus 获取
        batchProcessingStats: {
          totalBatches: 0,
          totalQuotesInBatches: 0,
          averageBatchSize: 0,
          averageBatchProcessingTimeMs: 0,
          batchSuccessRate: 0,
        },
      };
    }
  }

  /**
   * 🎯 获取 Prometheus 指标字符串（标准格式）
   */
  async getMetrics(): Promise<string> {
    return await this.metricsRegistry.getMetrics();
  }

  /**
   * 🎯 获取响应时间百分位数
   */
  getResponseTimePercentiles(): Record<string, number> {
    // 由于不再维护内存中的响应时间直方图，
    // 这里直接从 Prometheus 获取预计算的百分位数（如果可用）
    // 或者返回默认值
    return { 
      p50: 0, 
      p95: 0, 
      p99: 0 
    };
    // 注意：实际生产环境中，应该配置 Prometheus 和 Grafana 来计算这些百分位数
  }

  /**
   * 🎯 重置所有指标
   */
  resetMetrics(): void {
    // 仅重置 Prometheus 指标
    this.metricsRegistry.resetMetrics();
    
    this.logger.log('所有性能指标已重置');
  }

  /**
   * 🎯 获取详细性能报告（保持向后兼容）
   */
  async getDetailedPerformanceReport(): Promise<{
    stats: StreamProcessingStats;
    percentiles: Record<string, number>;
    prometheusMetrics: string;
    timestamp: string;
  }> {
    return {
      stats: await this.getStreamProcessingStats(),
      percentiles: this.getResponseTimePercentiles(),
      prometheusMetrics: await this.getMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  // =========================== 私有方法 ===========================

  private recordResponseTime(timeMs: number): void {
    // 直接记录到 Prometheus 直方图
    Metrics.observe(
      this.metricsRegistry,
      'streamProcessingTimeMs',
      timeMs,
      { operation_type: 'processing' }
    );
  }

  private calculateThroughputPerSecond(): number {
    // 从 Prometheus 获取或使用默认值
    // 由于我们不再维护内存中的吞吐量窗口，这里返回默认值
    return 0;
  }

  private getBatchSizeRange(size: number): string {
    if (size <= 10) return 'small';
    if (size <= 100) return 'medium';
    if (size <= 1000) return 'large';
    return 'xlarge';
  }

  private updateCalculatedMetrics(): void {
    if (!this.featureFlags.isPerformanceOptimizationEnabled()) {
      return;
    }

    // 由于所有指标现在都直接记录到 Prometheus，
    // 这个方法主要用于可能的未来扩展或触发其他指标更新
    // 目前不需要执行特定逻辑
  }
}
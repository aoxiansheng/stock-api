/**
 * 🎯 批量处理优化服务
 * 
 * 跨组件协同优化，提供批量符号映射、规则编译等功能
 */

import { Injectable } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { FeatureFlags } from '@common/config/feature-flags.config';
import { SymbolMapperService } from '../../00-prepare/symbol-mapper/services/symbol-mapper.service';
import { FlexibleMappingRuleService } from '../../00-prepare/data-mapper/services/flexible-mapping-rule.service';
import { MetricsRegistryService } from '../../../monitoring/metrics/services/metrics-registry.service';
import { Metrics } from '../../../monitoring/metrics/metrics-helper';

interface BatchSymbolMappingRequest {
  symbols: string[];
  fromProvider: string;
  toProvider: string;
}

interface BatchRuleCompilationRequest {
  ruleIds: string[];
  provider?: string;
}

// BatchProcessingStats 接口已废弃，迁移到 Prometheus 指标

@Injectable()
export class BatchOptimizationService {
  private readonly logger = createLogger(BatchOptimizationService.name);
  
  // 旧版内存统计逻辑已废弃

  // 批量处理队列
  private symbolMappingQueue: BatchSymbolMappingRequest[] = [];
  private ruleCompilationQueue: BatchRuleCompilationRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly symbolMapperService: SymbolMapperService,
    private readonly flexibleMappingRuleService: FlexibleMappingRuleService,
    private readonly featureFlags: FeatureFlags,
    private readonly metricsRegistry: MetricsRegistryService,
  ) {}

  /**
   * 🎯 批量符号映射预热
   */
  async preloadSymbolMappings(
    symbols: string[],
    fromProvider: string,
    toProvider: string,
  ): Promise<Map<string, string>> {
    if (!this.featureFlags.batchProcessingEnabled) {
      // 批量处理禁用，逐个处理
      const results = new Map<string, string>();
      for (const symbol of symbols) {
        try {
          const mapped = await this.symbolMapperService.mapSymbol(symbol, fromProvider, toProvider);
          results.set(symbol, mapped);
        } catch (error) {
          this.logger.warn(`符号映射失败: ${symbol}`, { error: error.message });
          results.set(symbol, symbol); // 使用原符号作为备用
        }
      }
      return results;
    }

    const startTime = Date.now();
    const results = new Map<string, string>();

    // 🎯 批量处理优化
    try {
      // 使用Promise.allSettled确保部分失败不影响其他符号
      const mappingPromises = symbols.map(async symbol => {
        try {
          const mapped = await this.symbolMapperService.mapSymbol(symbol, fromProvider, toProvider);
          return { symbol, mapped, success: true };
        } catch (error) {
          return { symbol, error, success: false };
        }
      });

      const mappingResults = await Promise.allSettled(mappingPromises);
      
      for (const result of mappingResults) {
        if (result.status === 'fulfilled') {
          const value = result.value;
          if (value.success) {
            results.set(value.symbol, value.mapped);
            // 使用 Metrics 助手记录命中
            Metrics.inc(
              this.metricsRegistry,
              'streamCacheHitRate',
              { cache_type: 'symbol_mapping' },
              100
            );
          } else {
            results.set(value.symbol, value.symbol); // 使用原符号作为备用
            // 使用 Metrics 助手记录未命中
            Metrics.inc(
              this.metricsRegistry,
              'streamCacheHitRate',
              { cache_type: 'symbol_mapping' },
              0
            );
          }
        } else {
          // 使用 Metrics 助手记录未命中
          Metrics.inc(
            this.metricsRegistry,
            'streamCacheHitRate',
            { cache_type: 'symbol_mapping' },
            0
          );
        }
      }

      const processingTime = Date.now() - startTime;
      
      // 使用 Metrics 助手记录处理时间
      Metrics.observe(
        this.metricsRegistry,
        'streamBatchProcessingDuration',
        processingTime,
        { provider: fromProvider, batch_size_range: this.getBatchSizeForMetrics(symbols.length) }
      );
      
      // 更新批处理计数
      Metrics.inc(
        this.metricsRegistry,
        'streamBatchesProcessedTotal',
        { provider: fromProvider, batch_type: 'symbol_mapping' }
      );
      
      // 更新批处理平均大小
      Metrics.setGauge(
        this.metricsRegistry,
        'streamAverageBatchSize',
        symbols.length,
        { provider: fromProvider }
      );

      this.logger.debug('批量符号映射完成', {
        symbolsCount: symbols.length,
        successCount: results.size,
        processingTime,
      });

    } catch (error) {
      this.logger.error('批量符号映射失败', { error: error.message });
      
      // 降级处理：逐个映射
      for (const symbol of symbols) {
        try {
          const mapped = await this.symbolMapperService.mapSymbol(symbol, fromProvider, toProvider);
          results.set(symbol, mapped);
        } catch {
          results.set(symbol, symbol); // 使用原符号作为备用
        }
      }
    }

    return results;
  }

  /**
   * 🎯 批量规则预编译
   */
  async precompileRules(ruleIds: string[], provider?: string): Promise<Map<string, any>> {
    if (!this.featureFlags.batchProcessingEnabled) {
      return new Map();
    }

    const startTime = Date.now();
    const results = new Map<string, any>();

    try {
      // 批量预编译规则（通过内部API）
      const compilationPromises = ruleIds.map(async ruleId => {
        try {
          // 通过 FlexibleMappingRuleService 获取规则
          const rule = await this.flexibleMappingRuleService.findRuleById(ruleId);
          return { ruleId, rule, status: 'fulfilled' };
        } catch (error) {
          return { ruleId, error, status: 'rejected' };
        }
      });

      const compilationResults = await Promise.allSettled(compilationPromises);
      
      for (const result of compilationResults) {
        if (result.status === 'fulfilled') {
          const { ruleId, rule } = result.value;
          results.set(ruleId, rule);
          // 使用 Metrics 助手记录命中
          Metrics.inc(
            this.metricsRegistry,
            'streamCacheHitRate',
            { cache_type: 'rule_compilation' },
            100
          );
        } else {
          // 使用 Metrics 助手记录未命中
          Metrics.inc(
            this.metricsRegistry,
            'streamCacheHitRate',
            { cache_type: 'rule_compilation' },
            0
          );
        }
      }

      const processingTime = Date.now() - startTime;
      
      // 使用 Metrics 助手记录处理时间
      Metrics.observe(
        this.metricsRegistry,
        'streamBatchProcessingDuration',
        processingTime,
        { provider: provider || 'unknown', batch_size_range: this.getBatchSizeForMetrics(ruleIds.length) }
      );
      
      // 更新批处理计数
      Metrics.inc(
        this.metricsRegistry,
        'streamBatchesProcessedTotal',
        { provider: provider || 'unknown', batch_type: 'rule_compilation' }
      );
      
      // 更新规则编译成功率
      Metrics.setGauge(
        this.metricsRegistry,
        'streamBatchSuccessRate',
        results.size / ruleIds.length * 100,
        { provider: provider || 'unknown' }
      );

      this.logger.debug('批量规则预编译完成', {
        rulesCount: ruleIds.length,
        successCount: results.size,
        processingTime,
      });

    } catch (error) {
      this.logger.error('批量规则预编译失败', { error: error.message });
    }

    return results;
  }

  /**
   * 🎯 智能批量处理调度
   */
  scheduleSymbolMappingBatch(
    symbols: string[],
    fromProvider: string,
    toProvider: string,
  ): Promise<Map<string, string>> {
    return new Promise((resolve) => {
      // 添加到批量队列
      this.symbolMappingQueue.push({ symbols, fromProvider, toProvider });

      // 如果队列达到阈值或者时间窗口到达，立即处理
      if (this.symbolMappingQueue.length >= this.featureFlags.batchSizeThreshold) {
        this.processBatchedSymbolMappings();
        resolve(new Map());
      } else {
        // 设置时间窗口
        if (!this.batchTimer) {
          this.batchTimer = setTimeout(() => {
            this.processBatchedSymbolMappings();
            this.batchTimer = null;
          }, this.featureFlags.batchTimeWindowMs);
        }
        resolve(new Map());
      }
    });
  }

  /**
   * 🎯 处理批量符号映射队列
   */
  private async processBatchedSymbolMappings(): Promise<void> {
    if (this.symbolMappingQueue.length === 0) {
      return;
    }

    const batch = [...this.symbolMappingQueue];
    this.symbolMappingQueue = [];

    // 按provider分组批量处理
    const providerGroups = new Map<string, string[]>();
    
    for (const { symbols, fromProvider, toProvider } of batch) {
      const key = `${fromProvider}->${toProvider}`;
      if (!providerGroups.has(key)) {
        providerGroups.set(key, []);
      }
      providerGroups.get(key)!.push(...symbols);
    }

    // 并行处理不同provider组
    const groupProcessingPromises = Array.from(providerGroups.entries()).map(
      async ([key, symbols]) => {
        const [fromProvider, toProvider] = key.split('->');
        return this.preloadSymbolMappings(symbols, fromProvider, toProvider);
      }
    );

    await Promise.allSettled(groupProcessingPromises);

    this.logger.debug('批量符号映射队列处理完成', {
      batchSize: batch.length,
      providerGroups: providerGroups.size,
    });
  }

  /**
   * 🎯 获取批量处理统计信息
   */
  async getBatchProcessingStats(): Promise<{
    totalBatches: number;
    totalQuotesInBatches: number;
    averageBatchSize: number;
    averageBatchProcessingTimeMs: number;
    batchSuccessRate: number;
  }> {
    const [
      totalBatches,
      totalQuotes,
      avgBatchSize,
      avgProcessingTime,
      successRate,
    ] = await Promise.all([
      this.metricsRegistry.getMetricValue('newstock_stream_batches_processed_total'),
      this.metricsRegistry.getMetricValue('newstock_stream_quotes_in_batches_total'),
      this.metricsRegistry.getMetricValue('newstock_stream_average_batch_size'),
      this.metricsRegistry.getMetricValue('newstock_stream_batch_processing_duration_ms'),
      this.metricsRegistry.getMetricValue('newstock_stream_batch_success_rate'),
    ]);

    return {
      totalBatches: Number(totalBatches ?? 0),
      totalQuotesInBatches: Number(totalQuotes ?? 0),
      averageBatchSize: Number(avgBatchSize ?? 0),
      averageBatchProcessingTimeMs: Number(avgProcessingTime ?? 0),
      batchSuccessRate: Number(successRate ?? 0),
    };
  }

  // 旧命中率计算方法已废弃（数据由 Prometheus 负责）
  
  /**
   * 获取批量大小范围（用于指标标签）
   */
  private getBatchSizeForMetrics(size: number): string {
    if (size <= 10) return '0-10';
    if (size <= 100) return '11-100';
    if (size <= 1000) return '101-1000';
    return '1000+';
  }

  /**
   * 🎯 清理所有批量处理缓存和统计
   */
  clearBatchProcessingCache(): void {
    this.symbolMappingQueue = [];
    this.ruleCompilationQueue = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    // 旧内存统计已废弃，无需重置
    
    // 重置相关 Prometheus 指标
    // 清空缓存命中率
    Metrics.setGauge(
      this.metricsRegistry,
      'streamCacheHitRate',
      0,
      { cache_type: 'symbol_mapping' }
    );
    
    Metrics.setGauge(
      this.metricsRegistry,
      'streamCacheHitRate',
      0,
      { cache_type: 'rule_compilation' }
    );
    
    // 清空批处理成功率
    Metrics.setGauge(
      this.metricsRegistry,
      'streamBatchSuccessRate',
      0,
      { provider: 'unknown' }
    );

    this.logger.log('批量处理缓存和统计已清理');
  }
}
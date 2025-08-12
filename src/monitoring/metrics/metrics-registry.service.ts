/**
 * 🎯 Prometheus 指标注册中心服务
 * 
 * 统一管理所有 Prometheus 指标的注册、配置和导出
 * 提供标准化的指标命名和标签规范
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createLogger } from '@common/config/logger.config';
import { FeatureFlags } from '@common/config/feature-flags.config';
import { 
  Counter, 
  Gauge, 
  Histogram, 
  collectDefaultMetrics,
  Registry 
} from 'prom-client';

@Injectable()
export class MetricsRegistryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = createLogger(MetricsRegistryService.name);
  private readonly registry: Registry;
  
  // 🎯 流处理性能指标
  public readonly streamSymbolsProcessedTotal: Counter<string>;
  public readonly streamRulesCompiledTotal: Counter<string>;
  public readonly streamProcessingTimeMs: Gauge<string>;
  public readonly streamCacheHitRate: Gauge<string>;
  public readonly streamErrorRate: Gauge<string>;
  public readonly streamThroughputPerSecond: Gauge<string>;
  public readonly streamConcurrentConnections: Gauge<string>;
  
  // 🎯 批量处理指标
  public readonly streamBatchesProcessedTotal: Counter<string>;
  public readonly streamQuotesInBatchesTotal: Counter<string>;
  public readonly streamAverageBatchSize: Gauge<string>;
  public readonly streamBatchProcessingDuration: Histogram<string>;
  public readonly streamBatchSuccessRate: Gauge<string>;
  
  // 🎯 系统性能指标
  public readonly logLevelSwitchesTotal: Counter<string>;
  public readonly systemCpuUsagePercent: Gauge<string>;
  public readonly highLoadDurationSecondsTotal: Counter<string>;
  
  // 🎯 核心组件指标
  // Receiver 指标
  public readonly receiverRequestsTotal: Counter<string>;
  public readonly receiverProcessingDuration: Histogram<string>;
  public readonly receiverErrorRate: Gauge<string>;
  public readonly receiverActiveConnections: Gauge<string>;
  
  // Data Mapper 指标
  public readonly dataMapperRulesAppliedTotal: Counter<string>;
  public readonly dataMapperTransformationDuration: Histogram<string>;
  public readonly dataMapperCacheHitRate: Gauge<string>;
  public readonly dataMapperValidationErrors: Counter<string>;
  
  // Transformer 指标
  public readonly transformerOperationsTotal: Counter<string>;
  public readonly transformerBatchSize: Histogram<string>;
  public readonly transformerSuccessRate: Gauge<string>;
  public readonly transformerPreviewGeneratedTotal: Counter<string>;
  
  // Storage 指标
  public readonly storageOperationsTotal: Counter<string>;
  public readonly storageQueryDuration: Histogram<string>;
  public readonly storageCacheEfficiency: Gauge<string>;
  public readonly storageDataVolume: Gauge<string>;
  
  constructor(private readonly featureFlags: FeatureFlags) {
    // 创建专用的指标注册表
    this.registry = new Registry();
    
    // 🎯 初始化流处理指标
    this.streamSymbolsProcessedTotal = new Counter({
      name: 'newstock_stream_symbols_processed_total',
      help: 'Total number of symbols processed in stream',
      labelNames: ['provider', 'market'],
      registers: [this.registry]
    });
    
    this.streamRulesCompiledTotal = new Counter({
      name: 'newstock_stream_rules_compiled_total',
      help: 'Total number of mapping rules compiled',
      labelNames: ['provider', 'rule_type'],
      registers: [this.registry]
    });
    
    this.streamProcessingTimeMs = new Gauge({
      name: 'newstock_stream_processing_time_ms',
      help: 'Average processing time in milliseconds',
      labelNames: ['operation_type'],
      registers: [this.registry]
    });
    
    this.streamCacheHitRate = new Gauge({
      name: 'newstock_stream_cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['cache_type'],
      registers: [this.registry]
    });
    
    this.streamErrorRate = new Gauge({
      name: 'newstock_stream_error_rate',
      help: 'Error rate percentage',
      labelNames: ['error_type'],
      registers: [this.registry]
    });
    
    this.streamThroughputPerSecond = new Gauge({
      name: 'newstock_stream_throughput_per_second',
      help: 'Throughput requests per second',
      labelNames: ['stream_type'],
      registers: [this.registry]
    });
    
    this.streamConcurrentConnections = new Gauge({
      name: 'newstock_stream_concurrent_connections',
      help: 'Number of concurrent WebSocket connections',
      labelNames: ['connection_type'],
      registers: [this.registry]
    });
    
    // 🎯 初始化批量处理指标
    this.streamBatchesProcessedTotal = new Counter({
      name: 'newstock_stream_batches_processed_total',
      help: 'Total number of batches processed via RxJS bufferTime',
      labelNames: ['provider', 'batch_type'],
      registers: [this.registry]
    });
    
    this.streamQuotesInBatchesTotal = new Counter({
      name: 'newstock_stream_quotes_in_batches_total',
      help: 'Total number of quotes processed in batches',
      labelNames: ['provider'],
      registers: [this.registry]
    });
    
    this.streamAverageBatchSize = new Gauge({
      name: 'newstock_stream_average_batch_size',
      help: 'Average number of quotes per batch',
      labelNames: ['provider'],
      registers: [this.registry]
    });
    
    this.streamBatchProcessingDuration = new Histogram({
      name: 'newstock_stream_batch_processing_duration_ms',
      help: 'Batch processing duration in milliseconds',
      labelNames: ['provider', 'batch_size_range'],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
      registers: [this.registry]
    });
    
    this.streamBatchSuccessRate = new Gauge({
      name: 'newstock_stream_batch_success_rate',
      help: 'Batch processing success rate percentage',
      labelNames: ['provider'],
      registers: [this.registry]
    });
    
    // 🎯 初始化系统指标
    this.logLevelSwitchesTotal = new Counter({
      name: 'newstock_log_level_switches_total',
      help: '日志级别动态切换次数',
      labelNames: ['from_level', 'to_level', 'reason'],
      registers: [this.registry]
    });
    
    this.systemCpuUsagePercent = new Gauge({
      name: 'newstock_system_cpu_usage_percent',
      help: '系统 CPU 使用率百分比',
      registers: [this.registry]
    });
    
    this.highLoadDurationSecondsTotal = new Counter({
      name: 'newstock_high_load_duration_seconds_total',
      help: '高负载持续时间累计（秒）',
      registers: [this.registry]
    });
    
    // 🎯 初始化核心组件指标
    // Receiver 指标
    this.receiverRequestsTotal = new Counter({
      name: 'newstock_receiver_requests_total',
      help: 'Total number of requests processed by receiver',
      labelNames: ['method', 'provider', 'status'],
      registers: [this.registry]
    });
    
    this.receiverProcessingDuration = new Histogram({
      name: 'newstock_receiver_processing_duration_ms',
      help: 'Request processing duration in milliseconds',
      labelNames: ['method', 'provider'],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
      registers: [this.registry]
    });
    
    this.receiverErrorRate = new Gauge({
      name: 'newstock_receiver_error_rate',
      help: 'Error rate percentage for receiver operations',
      labelNames: ['error_type', 'provider'],
      registers: [this.registry]
    });
    
    this.receiverActiveConnections = new Gauge({
      name: 'newstock_receiver_active_connections',
      help: 'Number of active connections to receiver',
      labelNames: ['connection_type'],
      registers: [this.registry]
    });
    
    // Data Mapper 指标
    this.dataMapperRulesAppliedTotal = new Counter({
      name: 'newstock_data_mapper_rules_applied_total',
      help: 'Total number of mapping rules applied',
      labelNames: ['rule_type', 'provider', 'success'],
      registers: [this.registry]
    });
    
    this.dataMapperTransformationDuration = new Histogram({
      name: 'newstock_data_mapper_transformation_duration_ms',
      help: 'Data transformation duration in milliseconds',
      labelNames: ['rule_type', 'complexity'],
      buckets: [1, 2, 5, 10, 25, 50, 100, 250],
      registers: [this.registry]
    });
    
    this.dataMapperCacheHitRate = new Gauge({
      name: 'newstock_data_mapper_cache_hit_rate',
      help: 'Cache hit rate for mapping rules',
      labelNames: ['cache_type'],
      registers: [this.registry]
    });
    
    this.dataMapperValidationErrors = new Counter({
      name: 'newstock_data_mapper_validation_errors_total',
      help: 'Total number of validation errors in data mapping',
      labelNames: ['error_type', 'field'],
      registers: [this.registry]
    });
    
    // Transformer 指标
    this.transformerOperationsTotal = new Counter({
      name: 'newstock_transformer_operations_total',
      help: 'Total number of transformation operations',
      labelNames: ['operation_type', 'provider'],
      registers: [this.registry]
    });
    
    this.transformerBatchSize = new Histogram({
      name: 'newstock_transformer_batch_size',
      help: 'Distribution of transformation batch sizes',
      labelNames: ['operation_type'],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500],
      registers: [this.registry]
    });
    
    this.transformerSuccessRate = new Gauge({
      name: 'newstock_transformer_success_rate',
      help: 'Transformation success rate percentage',
      labelNames: ['operation_type'],
      registers: [this.registry]
    });
    
    this.transformerPreviewGeneratedTotal = new Counter({
      name: 'newstock_transformer_preview_generated_total',
      help: 'Total number of transformation previews generated',
      labelNames: ['preview_type'],
      registers: [this.registry]
    });
    
    // Storage 指标
    this.storageOperationsTotal = new Counter({
      name: 'newstock_storage_operations_total',
      help: 'Total number of storage operations',
      labelNames: ['operation', 'storage_type'],
      registers: [this.registry]
    });
    
    this.storageQueryDuration = new Histogram({
      name: 'newstock_storage_query_duration_ms',
      help: 'Storage query duration in milliseconds',
      labelNames: ['query_type', 'storage_type'],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
      registers: [this.registry]
    });
    
    this.storageCacheEfficiency = new Gauge({
      name: 'newstock_storage_cache_efficiency',
      help: 'Storage cache efficiency percentage',
      labelNames: ['cache_layer'],
      registers: [this.registry]
    });
    
    this.storageDataVolume = new Gauge({
      name: 'newstock_storage_data_volume_bytes',
      help: 'Volume of data stored in bytes',
      labelNames: ['data_type', 'storage_type'],
      registers: [this.registry]
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.featureFlags.isPerformanceOptimizationEnabled()) {
      this.logger.log('性能指标被禁用，跳过 Prometheus 指标注册');
      return;
    }

    // 启用系统默认指标收集
    collectDefaultMetrics({ 
      register: this.registry,
      prefix: 'newstock_',
      labels: { app: 'newstock-api', version: process.env.npm_package_version || '1.0.0' }
    });

    this.logger.log('Prometheus 指标注册中心初始化完成', {
      totalMetrics: this.registry.getMetricsAsArray().length,
      customMetrics: 31, // 自定义指标数量: 15 (流处理) + 16 (核心组件)
      coreComponentMetrics: 16, // 新增核心组件指标
      defaultMetrics: 'enabled'
    });
  }

  async onModuleDestroy(): Promise<void> {
    // 清理所有指标
    this.registry.clear();
    this.logger.log('Prometheus 指标注册中心已清理');
  }

  /**
   * 🎯 获取所有指标的 Prometheus 格式输出
   */
  async getMetrics(): Promise<string> {
    try {
      return await this.registry.metrics();
    } catch (error) {
      this.logger.error('获取 Prometheus 指标失败', { error: error.message });
      return '# 指标获取失败\n';
    }
  }

  /**
   * 🎯 获取指标摘要信息
   */
  getMetricsSummary(): {
    totalMetrics: number;
    customMetrics: number;
    coreComponentMetrics: number;
    registryStatus: string;
    lastUpdate: string;
  } {
    const metrics = this.registry.getMetricsAsArray();
    
    return {
      totalMetrics: metrics.length,
      customMetrics: 31, // StreamPerformanceMetrics (12) + DynamicLogLevel (3) + CoreComponents (16)
      coreComponentMetrics: 16, // 新增核心组件指标
      registryStatus: 'active',
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * 🎯 重置所有指标（测试用）
   */
  resetMetrics(): void {
    this.registry.resetMetrics();
    this.logger.log('所有 Prometheus 指标已重置');
  }

  /**
   * 🎯 获取特定指标的当前值
   */
  async getMetricValue(metricName: string): Promise<number | null> {
    try {
      const metrics = await this.registry.getMetricsAsJSON();
      const metric = metrics.find(m => m.name === metricName);
      
      if (metric && metric.values && metric.values.length > 0) {
        return metric.values[0].value;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`获取指标 ${metricName} 失败`, { error: error.message });
      return null;
    }
  }

  /**
   * 🎯 健康检查
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metricsCount: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    try {
      const metricsCount = this.registry.getMetricsAsArray().length;
      
      if (metricsCount === 0) {
        errors.push('No metrics registered');
        status = 'unhealthy';
      } else if (metricsCount < 10) {
        errors.push('Low metrics count');
        status = 'degraded';
      }
      
      return {
        status,
        metricsCount,
        errors
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        metricsCount: 0,
        errors: [`Registry error: ${error.message}`]
      };
    }
  }
}
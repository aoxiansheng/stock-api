/**
 * 🎯 Prometheus 指标注册中心服务
 *
 * 统一管理所有 Prometheus 指标的注册、配置和导出
 * 提供标准化的指标命名和标签规范
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { createLogger } from "@common/logging";;
import { FeatureFlags } from "@appcore/config/feature-flags.config";
import {
  Counter,
  Gauge,
  Histogram,
  collectDefaultMetrics,
  Registry,
} from "prom-client";
import { MONITORING_HEALTH_STATUS } from "../../constants";
import type { ExtendedHealthStatus } from "../../constants/status/monitoring-status.constants";
import { MONITORING_SYSTEM_LIMITS } from "../../constants/config/monitoring-system.constants";

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

  // 🎯 Phase 4: 端到端延迟监控指标
  public readonly streamPushLatencyMs: Histogram<string>;

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
  public readonly dataMapperRuleInitializationTotal: Counter<string>;
  public readonly dataMapperRulesCreatedTotal: Gauge<string>;
  public readonly dataMapperRulesSkippedTotal: Gauge<string>;

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

  // 🎯 Query 架构重构监控指标 - Milestone 6.3
  public readonly queryPipelineDuration: Histogram<string>;
  public readonly queryCacheHitRatio: Gauge<string>;
  public readonly queryBatchEfficiency: Gauge<string>;
  public readonly queryBackgroundTasksActive: Gauge<string>;
  public readonly queryBackgroundTasksCompleted: Counter<string>;
  public readonly queryBackgroundTasksFailed: Counter<string>;
  public readonly querySymbolsProcessedTotal: Counter<string>;
  public readonly queryReceiverCallsTotal: Counter<string>;
  public readonly queryReceiverCallDuration: Histogram<string>;
  public readonly queryMarketProcessingTime: Histogram<string>;
  public readonly queryBatchShardingEfficiency: Gauge<string>;
  public readonly queryConcurrentRequestsActive: Gauge<string>;

  // 🎯 Query内存监控指标 - Phase 2.2
  public readonly queryMemoryUsageBytes: Gauge<string>;
  public readonly queryMemoryPressureLevel: Gauge<string>;
  public readonly queryMemoryTriggeredDegradations: Counter<string>;

  // 🎯 Stream Recovery 指标 - Phase 3 Critical Fix
  public readonly streamRecoveryJobsTotal: Counter<string>;
  public readonly streamRecoveryJobsPending: Gauge<string>;
  public readonly streamRecoveryJobsActive: Gauge<string>;
  public readonly streamRecoveryJobsCompleted: Counter<string>;
  public readonly streamRecoveryJobsFailed: Counter<string>;
  public readonly streamRecoveryLatencySeconds: Histogram<string>;
  public readonly streamRecoveryDataPointsTotal: Counter<string>;
  public readonly streamRecoveryBatchesSentTotal: Counter<string>;
  public readonly streamRecoveryBatchSize: Histogram<string>;
  public readonly streamRecoveryCompressionRatio: Gauge<string>;
  public readonly streamRecoveryQps: Gauge<string>;
  public readonly streamRecoveryRateLimitHitsTotal: Counter<string>;
  public readonly streamRecoveryTokensConsumedTotal: Counter<string>;
  public readonly streamRecoveryErrorsTotal: Counter<string>;
  public readonly streamRecoveryConnectionErrorsTotal: Counter<string>;
  public readonly streamRecoveryTimeoutErrorsTotal: Counter<string>;
  public readonly streamRecoveryHealthStatus: Gauge<string>;
  public readonly streamRecoveryWorkerStatus: Gauge<string>;

  constructor(private readonly featureFlags: FeatureFlags) {
    // 创建专用的指标注册表
    this.registry = new Registry();

    // 🎯 初始化流处理指标
    this.streamRecoveryJobsTotal = new Counter({
      name: "newstock_stream_recovery_jobs_total",
      help: "Total number of recovery jobs submitted",
      labelNames: ["client_id", "provider", "priority"],
      registers: [this.registry],
    });

    this.streamRecoveryJobsPending = new Gauge({
      name: "newstock_stream_recovery_jobs_pending",
      help: "Number of pending recovery jobs in queue",
      labelNames: ["provider"],
      registers: [this.registry],
    });

    this.streamRecoveryJobsActive = new Gauge({
      name: "newstock_stream_recovery_jobs_active",
      help: "Number of active recovery jobs being processed",
      labelNames: ["provider"],
      registers: [this.registry],
    });

    this.streamRecoveryJobsCompleted = new Counter({
      name: "newstock_stream_recovery_jobs_completed_total",
      help: "Total number of successfully completed recovery jobs",
      labelNames: ["provider", "priority"],
      registers: [this.registry],
    });

    this.streamRecoveryJobsFailed = new Counter({
      name: "newstock_stream_recovery_jobs_failed_total",
      help: "Total number of failed recovery jobs",
      labelNames: ["provider", "error_type", "retry_count"],
      registers: [this.registry],
    });

    this.streamRecoveryLatencySeconds = new Histogram({
      name: "newstock_stream_recovery_latency_seconds",
      help: "Recovery job processing latency in seconds",
      labelNames: ["provider", "priority", "data_size_range"],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    });

    this.streamRecoveryDataPointsTotal = new Counter({
      name: "newstock_stream_recovery_data_points_total",
      help: "Total number of data points recovered",
      labelNames: ["provider", "symbol_market"],
      registers: [this.registry],
    });

    this.streamRecoveryBatchesSentTotal = new Counter({
      name: "newstock_stream_recovery_batches_sent_total",
      help: "Total number of recovery data batches sent to clients",
      labelNames: ["provider", "batch_size_range"],
      registers: [this.registry],
    });

    this.streamRecoveryBatchSize = new Histogram({
      name: "newstock_stream_recovery_batch_size",
      help: "Distribution of recovery batch sizes",
      labelNames: ["provider"],
      buckets: [10, 25, 50, 100, 250, 500, MONITORING_SYSTEM_LIMITS.MAX_BUFFER_SIZE, 2500],
      registers: [this.registry],
    });

    this.streamRecoveryCompressionRatio = new Gauge({
      name: "newstock_stream_recovery_compression_ratio",
      help: "Data compression ratio for recovery batches",
      labelNames: ["compression_type"],
      registers: [this.registry],
    });

    this.streamRecoveryQps = new Gauge({
      name: "newstock_stream_recovery_qps",
      help: "Current queries per second for recovery operations",
      labelNames: ["provider"],
      registers: [this.registry],
    });

    this.streamRecoveryRateLimitHitsTotal = new Counter({
      name: "newstock_stream_recovery_rate_limit_hits_total",
      help: "Total number of rate limit hits during recovery",
      labelNames: ["provider", "limit_type"],
      registers: [this.registry],
    });

    this.streamRecoveryTokensConsumedTotal = new Counter({
      name: "newstock_stream_recovery_tokens_consumed_total",
      help: "Total number of rate limiting tokens consumed",
      labelNames: ["provider"],
      registers: [this.registry],
    });

    this.streamRecoveryErrorsTotal = new Counter({
      name: "newstock_stream_recovery_errors_total",
      help: "Total number of recovery errors by type",
      labelNames: ["error_type", "provider", "recoverable"],
      registers: [this.registry],
    });

    this.streamRecoveryConnectionErrorsTotal = new Counter({
      name: "newstock_stream_recovery_connection_errors_total",
      help: "Total number of connection errors during recovery",
      labelNames: ["provider", "connection_type"],
      registers: [this.registry],
    });

    this.streamRecoveryTimeoutErrorsTotal = new Counter({
      name: "newstock_stream_recovery_timeout_errors_total",
      help: "Total number of timeout errors during recovery",
      labelNames: ["provider", "timeout_type"],
      registers: [this.registry],
    });

    this.streamRecoveryHealthStatus = new Gauge({
      name: "newstock_stream_recovery_health_status",
      help: "Recovery system health status (0=unhealthy, 1=degraded, 2=healthy)",
      labelNames: ["component"],
      registers: [this.registry],
    });

    this.streamRecoveryWorkerStatus = new Gauge({
      name: "newstock_stream_recovery_worker_status",
      help: "Recovery worker status (0=stopped, 1=running)",
      labelNames: ["worker_id"],
      registers: [this.registry],
    });

    // 🎯 流处理性能指标初始化
    this.streamSymbolsProcessedTotal = new Counter({
      name: "newstock_stream_symbols_processed_total",
      help: "Total number of symbols processed in streaming mode",
      labelNames: ["provider", "symbol_type"],
      registers: [this.registry],
    });

    this.streamRulesCompiledTotal = new Counter({
      name: "newstock_stream_rules_compiled_total",
      help: "Total number of stream processing rules compiled",
      labelNames: ["mapping_rule_category"],
      registers: [this.registry],
    });

    this.streamProcessingTimeMs = new Gauge({
      name: "newstock_stream_processing_time_ms",
      help: "Current stream processing time in milliseconds",
      labelNames: ["operation_type"],
      registers: [this.registry],
    });

    this.streamCacheHitRate = new Gauge({
      name: "newstock_stream_cache_hit_rate",
      help: "Stream cache hit rate percentage",
      labelNames: ["cache_type"],
      registers: [this.registry],
    });

    this.streamErrorRate = new Gauge({
      name: "newstock_stream_error_rate",
      help: "Stream error rate percentage",
      labelNames: ["error_category"],
      registers: [this.registry],
    });

    this.streamThroughputPerSecond = new Gauge({
      name: "newstock_stream_throughput_per_second",
      help: "Current stream throughput per second",
      labelNames: ["data_type", "stream_type"],
      registers: [this.registry],
    });

    this.streamConcurrentConnections = new Gauge({
      name: "newstock_stream_concurrent_connections",
      help: "Number of concurrent stream connections",
      labelNames: ["connection_type"],
      registers: [this.registry],
    });

    // 🎯 Phase 4: 端到端延迟监控指标初始化
    this.streamPushLatencyMs = new Histogram({
      name: "newstock_stream_push_latency_ms",
      help: "End-to-end latency for stream data push operations in milliseconds",
      labelNames: ["symbol", "provider", "latency_category"],
      buckets: [1, 5, 10, 20, 50, 100, 200, 500, MONITORING_SYSTEM_LIMITS.SLOW_REQUEST_THRESHOLD_MS, 2000], // 延迟分桶：1ms 到 2秒
      registers: [this.registry],
    });

    // 🎯 批量处理指标初始化
    this.streamBatchesProcessedTotal = new Counter({
      name: "newstock_stream_batches_processed_total",
      help: "Total number of stream batches processed",
      labelNames: ["batch_type"],
      registers: [this.registry],
    });

    this.streamQuotesInBatchesTotal = new Counter({
      name: "newstock_stream_quotes_in_batches_total",
      help: "Total number of quotes processed in stream batches",
      labelNames: ["quote_type"],
      registers: [this.registry],
    });

    this.streamAverageBatchSize = new Gauge({
      name: "newstock_stream_average_batch_size",
      help: "Average size of stream processing batches",
      labelNames: ["provider"],
      registers: [this.registry],
    });

    this.streamBatchProcessingDuration = new Histogram({
      name: "newstock_stream_batch_processing_duration_seconds",
      help: "Duration of stream batch processing in seconds",
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.streamBatchSuccessRate = new Gauge({
      name: "newstock_stream_batch_success_rate",
      help: "Success rate of stream batch processing",
      labelNames: ["provider"],
      registers: [this.registry],
    });

    // 🎯 系统性能指标初始化
    this.logLevelSwitchesTotal = new Counter({
      name: "newstock_log_level_switches_total",
      help: "Total number of dynamic log level switches",
      labelNames: ["from_level", "to_level"],
      registers: [this.registry],
    });

    this.systemCpuUsagePercent = new Gauge({
      name: "newstock_system_cpu_usage_percent",
      help: "System CPU usage percentage",
      registers: [this.registry],
    });

    this.highLoadDurationSecondsTotal = new Counter({
      name: "newstock_high_load_duration_seconds_total",
      help: "Total seconds spent in high load state",
      labelNames: ["load_category"],
      registers: [this.registry],
    });

    // 🎯 核心组件指标初始化
    // Receiver 指标
    this.receiverRequestsTotal = new Counter({
      name: "newstock_receiver_requests_total",
      help: "Total number of receiver requests",
      labelNames: ["method", "status", "provider", "operation", "error_type"],
      registers: [this.registry],
    });

    this.receiverProcessingDuration = new Histogram({
      name: "newstock_receiver_processing_duration_seconds",
      help: "Receiver processing duration in seconds",
      labelNames: ["method", "provider", "operation", "status", "attempt"],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.receiverErrorRate = new Gauge({
      name: "newstock_receiver_error_rate",
      help: "Receiver error rate percentage",
      labelNames: ["error_type"],
      registers: [this.registry],
    });

    this.receiverActiveConnections = new Gauge({
      name: "newstock_receiver_active_connections",
      help: "Number of active receiver connections",
      labelNames: ["connection_type"],
      registers: [this.registry],
    });

    // Data Mapper 指标
    this.dataMapperRulesAppliedTotal = new Counter({
      name: "newstock_data_mapper_rules_applied_total",
      help: "Total number of data mapper rules applied",
      labelNames: ["mapping_rule_category"],
      registers: [this.registry],
    });

    this.dataMapperTransformationDuration = new Histogram({
      name: "newstock_data_mapper_transformation_duration_seconds",
      help: "Data mapper transformation duration in seconds",
      labelNames: ["transformation_type"],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.25, 0.5],
      registers: [this.registry],
    });

    this.dataMapperCacheHitRate = new Gauge({
      name: "newstock_data_mapper_cache_hit_rate",
      help: "Data mapper cache hit rate percentage",
      registers: [this.registry],
    });

    this.dataMapperValidationErrors = new Counter({
      name: "newstock_data_mapper_validation_errors_total",
      help: "Total number of data mapper validation errors",
      labelNames: ["validation_type"],
      registers: [this.registry],
    });
    this.dataMapperRuleInitializationTotal = new Counter({
      name: "newstock_data_mapper_rule_initialization_total",
      help: "Total number of data mapper rule initialization attempts",
      labelNames: ["action", "provider", "apiType"],
      registers: [this.registry],
    });
    this.dataMapperRulesCreatedTotal = new Gauge({
      name: "newstock_data_mapper_rules_created_total",
      help: "Total number of data mapper rules created during initialization",
      registers: [this.registry],
    });
    this.dataMapperRulesSkippedTotal = new Gauge({
      name: "newstock_data_mapper_rules_skipped_total",
      help: "Total number of data mapper rules skipped during initialization",
      registers: [this.registry],
    });

    // Transformer 指标
    this.transformerOperationsTotal = new Counter({
      name: "newstock_transformer_operations_total",
      help: "Total number of transformer operations",
      labelNames: ["operation_type", "provider"],
      registers: [this.registry],
    });

    this.transformerBatchSize = new Histogram({
      name: "newstock_transformer_batch_size",
      help: "Transformer batch size distribution",
      labelNames: ["operation_type"],
      buckets: [1, 5, 10, 25, 50, 100, 250, 500],
      registers: [this.registry],
    });

    this.transformerSuccessRate = new Gauge({
      name: "newstock_transformer_success_rate",
      help: "Transformer operation success rate",
      labelNames: ["operation_type"],
      registers: [this.registry],
    });

    this.transformerPreviewGeneratedTotal = new Counter({
      name: "newstock_transformer_preview_generated_total",
      help: "Total number of transformer previews generated",
      labelNames: ["preview_type"],
      registers: [this.registry],
    });

    // Storage 指标
    this.storageOperationsTotal = new Counter({
      name: "newstock_storage_operations_total",
      help: "Total number of storage operations",
      labelNames: ["operation", "storage_type"],
      registers: [this.registry],
    });

    this.storageQueryDuration = new Histogram({
      name: "newstock_storage_query_duration_seconds",
      help: "Storage query duration in seconds",
      labelNames: ["query_type", "storage_type"],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.storageCacheEfficiency = new Gauge({
      name: "newstock_storage_cache_efficiency",
      help: "Storage cache efficiency percentage",
      labelNames: ["cache_type", "operation"], // 🔧 修正：统一标签名称，与事件桥接层保持一致
      registers: [this.registry],
    });

    this.storageDataVolume = new Gauge({
      name: "newstock_storage_data_volume_bytes",
      help: "Storage data volume in bytes",
      labelNames: ["data_type", "storage_type"],
      registers: [this.registry],
    });

    // 🎯 Query 架构重构监控指标初始化 - Milestone 6.3
    this.queryPipelineDuration = new Histogram({
      name: "newstock_query_pipeline_duration_seconds",
      help: "Query pipeline execution duration in seconds",
      labelNames: [
        "query_type",
        "market",
        "has_cache_hit",
        "symbols_count_range",
      ],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0],
      registers: [this.registry],
    });

    this.queryCacheHitRatio = new Gauge({
      name: "newstock_query_cache_hit_ratio",
      help: "Query cache hit ratio percentage",
      labelNames: ["query_type", "market"],
      registers: [this.registry],
    });

    this.queryBatchEfficiency = new Gauge({
      name: "newstock_query_batch_efficiency",
      help: "Query batch processing efficiency (symbols per second)",
      labelNames: ["market", "batch_size_range"],
      registers: [this.registry],
    });

    this.queryBackgroundTasksActive = new Gauge({
      name: "newstock_query_background_tasks_active",
      help: "Number of active background update tasks",
      labelNames: ["task_type"],
      registers: [this.registry],
    });

    this.queryBackgroundTasksCompleted = new Counter({
      name: "newstock_query_background_tasks_completed_total",
      help: "Total number of completed background update tasks",
      labelNames: ["task_type", "has_significant_change"],
      registers: [this.registry],
    });

    this.queryBackgroundTasksFailed = new Counter({
      name: "newstock_query_background_tasks_failed_total",
      help: "Total number of failed background update tasks",
      labelNames: ["task_type", "error_type"],
      registers: [this.registry],
    });

    this.querySymbolsProcessedTotal = new Counter({
      name: "newstock_query_symbols_processed_total",
      help: "Total number of symbols processed in queries",
      labelNames: ["query_type", "market", "processing_mode"],
      registers: [this.registry],
    });

    this.queryReceiverCallsTotal = new Counter({
      name: "newstock_query_receiver_calls_total",
      help: "Total number of calls to ReceiverService from Query",
      labelNames: ["market", "batch_size_range", "receiver_type"],
      registers: [this.registry],
    });

    this.queryReceiverCallDuration = new Histogram({
      name: "newstock_query_receiver_call_duration_seconds",
      help: "Duration of ReceiverService calls from Query in seconds",
      labelNames: ["market", "symbols_count_range"],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0],
      registers: [this.registry],
    });

    this.queryMarketProcessingTime = new Histogram({
      name: "newstock_query_market_processing_time_seconds",
      help: "Market-level parallel processing time in seconds",
      labelNames: ["market", "processing_mode"],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0],
      registers: [this.registry],
    });

    this.queryBatchShardingEfficiency = new Gauge({
      name: "newstock_query_batch_sharding_efficiency",
      help: "Query batch sharding efficiency (avg symbols per shard)",
      labelNames: ["market", "total_symbols_range"],
      registers: [this.registry],
    });

    this.queryConcurrentRequestsActive = new Gauge({
      name: "newstock_query_concurrent_requests_active",
      help: "Number of active concurrent query requests",
      registers: [this.registry],
    });

    // 🎯 Query内存监控指标初始化 - Phase 2.2
    this.queryMemoryUsageBytes = new Gauge({
      name: "newstock_query_memory_usage_bytes",
      help: "Query component memory usage in bytes",
      labelNames: ["component", "type"],
      registers: [this.registry],
    });

    this.queryMemoryPressureLevel = new Gauge({
      name: "newstock_query_memory_pressure_level",
      help: "Query component memory pressure level (0=normal, 1=warning, 2=critical)",
      labelNames: ["pressure_level", "symbols_count_range"],
      registers: [this.registry],
    });

    this.queryMemoryTriggeredDegradations = new Counter({
      name: "newstock_query_memory_triggered_degradations_total",
      help: "Total number of memory-triggered degradations in Query processing",
      labelNames: ["degradation_type", "symbols_count_range"],
      registers: [this.registry],
    });
  }

  async onModuleInit(): Promise<void> {
    if (!this.featureFlags.isPerformanceOptimizationEnabled()) {
      this.logger.log("性能指标被禁用，跳过 Prometheus 指标注册");
      return;
    }

    // 启用系统默认指标收集
    collectDefaultMetrics({
      register: this.registry,
      prefix: "newstock_",
      labels: {
        app: "newstock-api",
        version: process.env.npm_package_version || "1.0.0",
      },
    });

    this.logger.log("Prometheus 指标注册中心初始化完成", {
      totalMetrics: this.registry.getMetricsAsArray().length,
      customMetrics: 71, // 自定义指标数量: 18 (Stream Recovery) + 13 (流处理性能,含Phase4延迟) + 5 (批量处理) + 3 (系统性能) + 16 (核心组件) + 13 (原有其他指标) + 3 (Query内存监控)
      streamRecoveryMetrics: 18, // Phase 3 Stream Recovery指标
      streamPerformanceMetrics: 13, // 流处理性能指标 (含Phase4延迟)
      batchProcessingMetrics: 5, // 批量处理指标
      systemPerformanceMetrics: 3, // 系统性能指标
      coreComponentMetrics: 16, // 核心组件指标
      defaultMetrics: "enabled",
    });
  }

  async onModuleDestroy(): Promise<void> {
    // 清理所有指标
    this.registry.clear();
    this.logger.log("Prometheus 指标注册中心已清理");
  }

  /**
   * 🎯 获取所有指标的 Prometheus 格式输出
   */
  async getMetrics(): Promise<string> {
    try {
      return await this.registry.metrics();
    } catch (error) {
      this.logger.error("获取 Prometheus 指标失败", { error: error.message });
      return "# 指标获取失败\n";
    }
  }

  /**
   * 🎯 获取指标摘要信息
   */
  getMetricsSummary(): {
    totalMetrics: number;
    customMetrics: number;
    streamRecoveryMetrics: number;
    streamPerformanceMetrics: number;
    batchProcessingMetrics: number;
    systemPerformanceMetrics: number;
    coreComponentMetrics: number;
    registryStatus: string;
    lastUpdate: string;
  } {
    const metrics = this.registry.getMetricsAsArray();

    return {
      totalMetrics: metrics.length,
      customMetrics: 71, // StreamRecovery (18) + StreamPerformance (13,含Phase4延迟) + BatchProcessing (5) + SystemPerformance (3) + CoreComponents (16) + Others (13) + QueryMemory (3)
      streamRecoveryMetrics: 18, // Phase 3 Stream Recovery指标
      streamPerformanceMetrics: 13, // 流处理性能指标 (含Phase4延迟)
      batchProcessingMetrics: 5, // 批量处理指标
      systemPerformanceMetrics: 3, // 系统性能指标
      coreComponentMetrics: 16, // 核心组件指标
      registryStatus: "active",
      lastUpdate: new Date().toISOString(),
    };
  }

  /**
   * 🎯 重置所有指标（测试用）
   */
  resetMetrics(): void {
    this.registry.resetMetrics();
    this.logger.log("所有 Prometheus 指标已重置");
  }

  /**
   * 🎯 获取特定指标的当前值
   */
  async getMetricValue(metricName: string): Promise<number | null> {
    try {
      const metrics = await this.registry.getMetricsAsJSON();
      const metric = metrics.find((m) => m.name === metricName);

      if (metric && metric.values && metric.values.length > 0) {
        return metric.values[0].value;
      }

      return null;
    } catch (error) {
      this.logger.error(`获取指标 ${metricName} 失败`, {
        error: error.message,
      });
      return null;
    }
  }

  /**
   * 🎯 健康检查
   */
  getHealthStatus(): {
    status: ExtendedHealthStatus;
    metricsCount: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let status: ExtendedHealthStatus = MONITORING_HEALTH_STATUS.HEALTHY;

    try {
      const metricsCount = this.registry.getMetricsAsArray().length;

      if (metricsCount === 0) {
        errors.push("No metrics registered");
        status = MONITORING_HEALTH_STATUS.UNHEALTHY;
      } else if (metricsCount < 10) {
        errors.push("Low metrics count");
        status = MONITORING_HEALTH_STATUS.DEGRADED;
      }

      return {
        status,
        metricsCount,
        errors,
      };
    } catch (error) {
      return {
        status: MONITORING_HEALTH_STATUS.UNHEALTHY,
        metricsCount: 0,
        errors: [`Registry error: ${error.message}`],
      };
    }
  }
}

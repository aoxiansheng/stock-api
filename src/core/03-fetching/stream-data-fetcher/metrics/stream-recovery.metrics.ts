import { Injectable } from '@nestjs/common';

/**
 * StreamRecovery 指标类 - Phase 3 Critical Fix
 * 
 * 独立的指标收集和统计，支持 Prometheus 导出
 */

export interface RecoveryJobMetrics {
  totalJobs: number;
  pendingJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  retryJobs: number;
}

export interface RecoveryPerformanceMetrics {
  averageRecoveryTime: number;
  medianRecoveryTime: number;
  p95RecoveryTime: number;
  p99RecoveryTime: number;
  totalRecoveryTime: number;
  minRecoveryTime: number;
  maxRecoveryTime: number;
}

export interface RecoveryDataMetrics {
  totalDataPointsRecovered: number;
  totalBatchesSent: number;
  averageBatchSize: number;
  dataCompressionRatio: number;
  networkBytesTransferred: number;
}

export interface RecoveryRateLimitMetrics {
  qps: number;
  recentQPS: number[];
  rateLimitHits: number;
  rateLimitMisses: number;
  tokensConsumed: number;
  tokensRefilled: number;
}

export interface RecoveryErrorMetrics {
  connectionErrors: number;
  timeoutErrors: number;
  dataCorruptionErrors: number;
  rateLimitErrors: number;
  cacheErrors: number;
  transformErrors: number;
  networkErrors: number;
  otherErrors: number;
}

export interface StreamRecoveryMetrics {
  // 任务指标
  jobs: RecoveryJobMetrics;
  
  // 性能指标
  performance: RecoveryPerformanceMetrics;
  
  // 数据指标
  data: RecoveryDataMetrics;
  
  // 限流指标
  rateLimit: RecoveryRateLimitMetrics;
  
  // 错误指标
  errors: RecoveryErrorMetrics;
  
  // 时间戳
  lastUpdated: number;
  startTime: number;
}

@Injectable()
export class StreamRecoveryMetricsService {
  private metrics: StreamRecoveryMetrics;
  private recoveryTimes: number[] = [];
  private recentQPS: number[] = [];
  
  // Prometheus 指标常量
  static readonly PROMETHEUS_METRICS = {
    // 任务相关
    RECOVERY_JOBS_TOTAL: 'stream_recovery_jobs_total',
    RECOVERY_JOBS_PENDING: 'stream_recovery_jobs_pending',
    RECOVERY_JOBS_ACTIVE: 'stream_recovery_jobs_active',
    RECOVERY_JOBS_COMPLETED: 'stream_recovery_jobs_completed_total',
    RECOVERY_JOBS_FAILED: 'stream_recovery_jobs_failed_total',
    
    // 性能相关  
    RECOVERY_LATENCY_SECONDS: 'stream_recovery_latency_seconds',
    RECOVERY_DURATION_HISTOGRAM: 'stream_recovery_duration_histogram',
    
    // 数据相关
    RECOVERY_DATA_POINTS: 'stream_recovery_data_points_total',
    RECOVERY_BATCHES_SENT: 'stream_recovery_batches_sent_total',
    RECOVERY_BATCH_SIZE: 'stream_recovery_batch_size',
    RECOVERY_COMPRESSION_RATIO: 'stream_recovery_compression_ratio',
    
    // 限流相关
    RECOVERY_QPS: 'stream_recovery_qps',
    RECOVERY_RATE_LIMIT_HITS: 'stream_recovery_rate_limit_hits_total',
    RECOVERY_TOKENS_CONSUMED: 'stream_recovery_tokens_consumed_total',
    
    // 错误相关
    RECOVERY_ERRORS_TOTAL: 'stream_recovery_errors_total',
    RECOVERY_CONNECTION_ERRORS: 'stream_recovery_connection_errors_total',
    RECOVERY_TIMEOUT_ERRORS: 'stream_recovery_timeout_errors_total',
    
    // 健康状态
    RECOVERY_HEALTH_STATUS: 'stream_recovery_health_status',
    RECOVERY_WORKER_STATUS: 'stream_recovery_worker_status',
  };
  
  constructor() {
    this.initializeMetrics();
  }
  
  private initializeMetrics(): void {
    const now = Date.now();
    
    this.metrics = {
      jobs: {
        totalJobs: 0,
        pendingJobs: 0,
        activeJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        retryJobs: 0,
      },
      
      performance: {
        averageRecoveryTime: 0,
        medianRecoveryTime: 0,
        p95RecoveryTime: 0,
        p99RecoveryTime: 0,
        totalRecoveryTime: 0,
        minRecoveryTime: Infinity,
        maxRecoveryTime: 0,
      },
      
      data: {
        totalDataPointsRecovered: 0,
        totalBatchesSent: 0,
        averageBatchSize: 0,
        dataCompressionRatio: 0,
        networkBytesTransferred: 0,
      },
      
      rateLimit: {
        qps: 0,
        recentQPS: [],
        rateLimitHits: 0,
        rateLimitMisses: 0,
        tokensConsumed: 0,
        tokensRefilled: 0,
      },
      
      errors: {
        connectionErrors: 0,
        timeoutErrors: 0,
        dataCorruptionErrors: 0,
        rateLimitErrors: 0,
        cacheErrors: 0,
        transformErrors: 0,
        networkErrors: 0,
        otherErrors: 0,
      },
      
      lastUpdated: now,
      startTime: now,
    };
  }
  
  /**
   * 记录任务提交
   */
  incrementJobSubmitted(): void {
    this.metrics.jobs.totalJobs++;
    this.updateTimestamp();
  }
  
  /**
   * 记录任务完成
   */
  incrementJobCompleted(recoveryTimeMs: number, dataPointsRecovered: number): void {
    this.metrics.jobs.completedJobs++;
    this.recordRecoveryTime(recoveryTimeMs);
    this.metrics.data.totalDataPointsRecovered += dataPointsRecovered;
    this.updateTimestamp();
  }
  
  /**
   * 记录任务失败
   */
  incrementJobFailed(errorType: keyof RecoveryErrorMetrics): void {
    this.metrics.jobs.failedJobs++;
    this.incrementError(errorType);
    this.updateTimestamp();
  }
  
  /**
   * 记录补发时间
   */
  private recordRecoveryTime(timeMs: number): void {
    this.recoveryTimes.push(timeMs);
    
    // 保留最近1000个样本
    if (this.recoveryTimes.length > 1000) {
      this.recoveryTimes = this.recoveryTimes.slice(-1000);
    }
    
    // 更新性能指标
    this.updatePerformanceMetrics();
  }
  
  /**
   * 更新性能指标
   */
  private updatePerformanceMetrics(): void {
    if (this.recoveryTimes.length === 0) return;
    
    const sorted = [...this.recoveryTimes].sort((a, b) => a - b);
    const total = sorted.reduce((sum, time) => sum + time, 0);
    
    this.metrics.performance = {
      averageRecoveryTime: total / sorted.length,
      medianRecoveryTime: this.getPercentile(sorted, 50),
      p95RecoveryTime: this.getPercentile(sorted, 95),
      p99RecoveryTime: this.getPercentile(sorted, 99),
      totalRecoveryTime: total,
      minRecoveryTime: sorted[0],
      maxRecoveryTime: sorted[sorted.length - 1],
    };
  }
  
  /**
   * 计算百分位数
   */
  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)] || 0;
  }
  
  /**
   * 记录批量发送
   */
  recordBatchSent(batchSize: number, networkBytes: number): void {
    this.metrics.data.totalBatchesSent++;
    this.metrics.data.networkBytesTransferred += networkBytes;
    
    // 更新平均批次大小
    const totalDataPoints = this.metrics.data.totalDataPointsRecovered;
    const totalBatches = this.metrics.data.totalBatchesSent;
    this.metrics.data.averageBatchSize = totalBatches > 0 ? totalDataPoints / totalBatches : 0;
    
    this.updateTimestamp();
  }
  
  /**
   * 记录QPS
   */
  recordQPS(): void {
    const now = Date.now();
    this.recentQPS.push(now);
    
    // 保留最近1秒的数据
    const oneSecondAgo = now - 1000;
    this.recentQPS = this.recentQPS.filter(timestamp => timestamp > oneSecondAgo);
    
    this.metrics.rateLimit.qps = this.recentQPS.length;
    this.metrics.rateLimit.recentQPS = [...this.recentQPS];
  }
  
  /**
   * 记录限流命中
   */
  recordRateLimitHit(): void {
    this.metrics.rateLimit.rateLimitHits++;
    this.updateTimestamp();
  }
  
  /**
   * 记录限流未命中
   */
  recordRateLimitMiss(): void {
    this.metrics.rateLimit.rateLimitMisses++;
    this.updateTimestamp();
  }
  
  /**
   * 记录令牌消耗
   */
  recordTokensConsumed(tokens: number): void {
    this.metrics.rateLimit.tokensConsumed += tokens;
    this.updateTimestamp();
  }
  
  /**
   * 增加错误计数
   */
  incrementError(errorType: keyof RecoveryErrorMetrics): void {
    this.metrics.errors[errorType]++;
    this.updateTimestamp();
  }
  
  /**
   * 更新任务队列状态
   */
  updateJobCounts(pending: number, active: number): void {
    this.metrics.jobs.pendingJobs = pending;
    this.metrics.jobs.activeJobs = active;
    this.updateTimestamp();
  }
  
  /**
   * 获取所有指标
   */
  getMetrics(): StreamRecoveryMetrics {
    return { ...this.metrics };
  }
  
  /**
   * 获取指标摘要 (用于健康检查)
   */
  getMetricsSummary(): any {
    return {
      totalJobs: this.metrics.jobs.totalJobs,
      completedJobs: this.metrics.jobs.completedJobs,
      failedJobs: this.metrics.jobs.failedJobs,
      successRate: this.getSuccessRate(),
      averageRecoveryTime: this.metrics.performance.averageRecoveryTime,
      currentQPS: this.metrics.rateLimit.qps,
      totalErrors: this.getTotalErrors(),
      uptime: Date.now() - this.metrics.startTime,
    };
  }
  
  /**
   * 计算成功率
   */
  getSuccessRate(): number {
    const total = this.metrics.jobs.completedJobs + this.metrics.jobs.failedJobs;
    return total > 0 ? this.metrics.jobs.completedJobs / total : 1;
  }
  
  /**
   * 计算总错误数
   */
  getTotalErrors(): number {
    return Object.values(this.metrics.errors).reduce((sum, count) => sum + count, 0);
  }
  
  /**
   * 重置指标
   */
  reset(): void {
    this.initializeMetrics();
    this.recoveryTimes = [];
    this.recentQPS = [];
  }
  
  /**
   * 导出 Prometheus 格式指标 (供监控系统调用)
   */
  getPrometheusMetrics(): Record<string, number> {
    const metrics = this.getMetrics();
    
    return {
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_JOBS_TOTAL]: metrics.jobs.totalJobs,
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_JOBS_PENDING]: metrics.jobs.pendingJobs,
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_JOBS_ACTIVE]: metrics.jobs.activeJobs,
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_JOBS_COMPLETED]: metrics.jobs.completedJobs,
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_JOBS_FAILED]: metrics.jobs.failedJobs,
      
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_LATENCY_SECONDS]: metrics.performance.averageRecoveryTime / 1000,
      
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_DATA_POINTS]: metrics.data.totalDataPointsRecovered,
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_BATCHES_SENT]: metrics.data.totalBatchesSent,
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_BATCH_SIZE]: metrics.data.averageBatchSize,
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_COMPRESSION_RATIO]: metrics.data.dataCompressionRatio,
      
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_QPS]: metrics.rateLimit.qps,
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_RATE_LIMIT_HITS]: metrics.rateLimit.rateLimitHits,
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_TOKENS_CONSUMED]: metrics.rateLimit.tokensConsumed,
      
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_ERRORS_TOTAL]: this.getTotalErrors(),
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_CONNECTION_ERRORS]: metrics.errors.connectionErrors,
      [StreamRecoveryMetricsService.PROMETHEUS_METRICS.RECOVERY_TIMEOUT_ERRORS]: metrics.errors.timeoutErrors,
    };
  }
  
  /**
   * 更新时间戳
   */
  private updateTimestamp(): void {
    this.metrics.lastUpdated = Date.now();
  }
}
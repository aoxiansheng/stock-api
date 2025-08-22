import { Injectable } from '@nestjs/common';
import { createLogger, sanitizeLogData } from '@common/config/logger.config';
import { MonitoringRegistryService } from '../../../system-status/monitoring/services/monitoring-registry.service';
import { MetricsHelper } from '../../../system-status/monitoring/helper/metrics-helper';
import { NotFoundException } from '@nestjs/common';

/**
 * BaseFetcherService 抽象基类 - 🚫 不可直接实例化
 * 
 * 🎯 设计目的：
 * - 为 DataFetcher 和 StreamDataFetcher 提供通用功能复用
 * - 统一错误处理、重试机制和指标收集逻辑
 * - 确保代码复用和一致性
 * 
 * 🔧 核心功能：
 * - executeWithRetry: 通用重试机制，支持指数退避
 * - recordOperationSuccess/Failure: 标准化指标记录
 * - checkPerformanceThreshold: 性能监控和慢响应检测
 * - standardizeError: 错误标准化处理
 * 
 * ⚠️ 使用约束：
 * - 必须通过子类继承使用，不能直接实例化
 * - 子类必须实现 executeCore 抽象方法
 * - 子类负责具体的业务逻辑实现
 * 
 * 📋 继承树：
 * - BaseFetcherService (抽象基类)
 *   └── StreamDataFetcherService (流数据获取器)
 *   └── DataFetcherService (待实现 - 普通数据获取器)
 */
@Injectable()
export abstract class BaseFetcherService {
  protected readonly logger = createLogger(this.constructor.name);

  constructor(
    protected readonly metricsRegistry: MonitoringRegistryService,
  ) {}

  /**
   * 通用重试机制执行包装器
   * @param operation 要执行的操作
   * @param context 操作上下文标识
   * @param maxRetries 最大重试次数
   * @param retryDelayMs 重试间隔时间
   * @returns 操作结果
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = 2,
    retryDelayMs: number = 1000,
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await operation();
        const duration = Date.now() - startTime;
        
        // 记录成功指标
        this.recordOperationSuccess(context, duration, attempt);
        
        if (attempt > 0) {
          this.logger.log(`操作重试成功`, {
            context,
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            duration,
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          // 最后一次重试失败，记录指标
          this.recordOperationFailure(context, error, attempt + 1);
          break;
        }
        
        this.logger.warn(`操作失败，将在 ${retryDelayMs}ms 后重试`, {
          context,
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          error: error.message,
          nextRetryIn: retryDelayMs,
        });
        
        // 等待重试间隔
        await this.sleep(retryDelayMs);
        
        // 递增重试间隔 (指数退避)
        retryDelayMs *= 1.5;
      }
    }
    
    throw lastError;
  }

  /**
   * 记录操作指标 - 成功情况
   * @param operation 操作名称
   * @param processingTime 处理时间
   * @param attempt 尝试次数
   */
  protected recordOperationSuccess(
    operation: string,
    processingTime: number,
    attempt: number = 0,
  ): void {
    try {
      // 记录处理时间分布 - 使用已有的指标
      MetricsHelper.observe(
        this.metricsRegistry,
        'receiverProcessingDuration',
        processingTime / 1000, // 转换为秒
        { method: operation, provider: 'base-fetcher', operation, status: 'success', attempt: attempt.toString() }
      );

      // 记录成功计数 - 使用已有的指标
      MetricsHelper.inc(
        this.metricsRegistry,
        'receiverRequestsTotal',
        { method: operation, status: 'success', operation, provider: 'base-fetcher' }
      );

      // 记录重试指标
      if (attempt > 0) {
        MetricsHelper.inc(
          this.metricsRegistry,
          'receiverRequestsTotal',
          { method: operation, status: 'retry_success', operation, provider: 'base-fetcher' }
        );
      }
    } catch (error) {
      this.logger.warn(`指标记录失败`, { error: error.message });
    }
  }

  /**
   * 记录操作指标 - 失败情况  
   * @param operation 操作名称
   * @param error 错误对象
   * @param totalAttempts 总尝试次数
   */
  protected recordOperationFailure(
    operation: string,
    error: Error,
    totalAttempts: number,
  ): void {
    try {
      // 记录失败计数
      MetricsHelper.inc(
        this.metricsRegistry,
        'receiverRequestsTotal',
        { 
          method: operation,
          operation, 
          status: 'failure',
          provider: 'base-fetcher',
          error_type: error.constructor.name
        }
      );

      // 记录重试指标
      if (totalAttempts > 1) {
        MetricsHelper.inc(
          this.metricsRegistry,
          'receiverRequestsTotal',
          { method: operation, operation, status: 'retry_failure', provider: 'base-fetcher' }
        );
      }
    } catch (metricError) {
      this.logger.warn(`指标记录失败`, { error: metricError.message });
    }
  }

  /**
   * 检查性能阈值并记录警告
   * @param processingTime 处理时间
   * @param symbolsCount 符号数量  
   * @param requestId 请求ID
   * @param operation 操作名称
   * @param slowThresholdMs 慢响应阈值
   */
  protected checkPerformanceThreshold(
    processingTime: number,
    symbolsCount: number,
    requestId: string,
    operation: string,
    slowThresholdMs: number = 5000,
  ): void {
    const timePerSymbol = symbolsCount > 0 ? processingTime / symbolsCount : 0;

    if (processingTime > slowThresholdMs) {
      this.logger.warn(`检测到慢响应`, sanitizeLogData({
        requestId,
        operation,
        processingTime,
        symbolsCount,
        timePerSymbol: Math.round(timePerSymbol * 100) / 100,
        threshold: slowThresholdMs,
      }));

      // 记录慢响应指标
      try {
        MetricsHelper.inc(
          this.metricsRegistry,
          'receiverRequestsTotal',
          { method: operation, operation, status: 'slow_response', provider: 'base-fetcher' }
        );
      } catch (error) {
        this.logger.warn(`慢响应指标记录失败`, { error: error.message });
      }
    }
  }

  /**
   * 标准化错误处理
   * @param error 原始错误
   * @param operation 操作名称
   * @param context 额外上下文
   * @returns 标准化的错误
   */
  protected standardizeError(
    error: any,
    operation: string,
    context: Record<string, any> = {},
  ): Error {
    const errorMessage = error?.message || '未知错误';
    
    this.logger.error(`${operation}失败`, sanitizeLogData({
      ...context,
      error: errorMessage,
      errorType: error?.constructor?.name || 'Unknown',
      operation,
    }));

    if (error instanceof NotFoundException) {
      return error;
    }

    throw new Error(
      `${operation}失败: ${errorMessage}`
    );
  }

  /**
   * 休眠工具方法
   * @param ms 休眠时间(毫秒)
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 抽象方法：子类必须实现的核心功能
   * @param params 特定的参数类型
   */
  abstract executeCore(params: any): Promise<any>;
}
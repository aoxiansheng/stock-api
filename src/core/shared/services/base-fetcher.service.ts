import { Injectable } from '@nestjs/common';
import { createLogger, sanitizeLogData } from '@app/config/logger.config';
import { CollectorService } from '../../../monitoring/collector/collector.service';
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

  /**
   * 🎯 Phase 1: 使用 CollectorService 作为统一监控接口
   * 遵循四层监控架构，shared组件只使用Collector层
   */
  constructor(
    protected readonly collectorService: CollectorService,
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
    const startTime = Date.now();
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        const duration = Date.now() - startTime;
        
        // ✅ 成功监控 - 使用外部API调用监控
        this.safeRecordExternalCall(
          context,
          'POST', // 假设大多数操作是POST
          200,
          duration,
          {
            operation: context,
            provider: 'external_api',
            attempt_count: attempt + 1,
            max_retries: maxRetries + 1,
            call_type: 'data_fetch'
          }
        );
        
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
          // ✅ 最终失败监控
          this.safeRecordExternalCall(
            context,
            'POST',
            500,
            Date.now() - startTime,
            {
              operation: context,
              provider: 'external_api',
              attempt_count: attempt + 1,
              max_retries: maxRetries + 1,
              call_type: 'data_fetch',
              error: error.message,
              error_type: error.constructor.name
            }
          );
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

      // ✅ 慢响应监控 - 使用HTTP请求监控记录
      this.safeRecordExternalCall(
        `/performance/${operation}`,
        'GET',
        200,
        processingTime,
        {
          operation: operation,
          provider: 'external_api',
          call_type: 'slow_response_detection',
          symbols_count: symbolsCount,
          time_per_symbol: timePerSymbol,
          threshold: slowThresholdMs
        }
      );
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

  // ✅ 使用HTTP请求监控记录外部API调用
  private safeRecordExternalCall(endpoint: string, method: string, statusCode: number, duration: number, metadata: any) {
    setImmediate(() => {
      try {
        this.collectorService.recordRequest(`/external/${endpoint}`, method, statusCode, duration, metadata);
      } catch (error) {
        this.logger.warn('外部调用监控记录失败', { error: error.message, endpoint });
      }
    });
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
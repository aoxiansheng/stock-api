import { Logger } from '@nestjs/common';
import {
  BusinessException,
  BusinessErrorCode,
  ComponentIdentifier
} from './business.exception';
import { UniversalExceptionFactory } from './universal-exception.factory';

/**
 * 重试配置接口
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxAttempts: number;
  /** 初始延迟时间（毫秒） */
  baseDelay: number;
  /** 最大延迟时间（毫秒） */
  maxDelay: number;
  /** 指数退避因子 */
  backoffFactor: number;
  /** 是否启用抖动 */
  enableJitter: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * 重试结果接口
 */
export interface RetryResult<T> {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  result?: T;
  /** 异常信息 */
  error?: BusinessException;
  /** 重试次数 */
  attempts: number;
  /** 总耗时（毫秒） */
  totalDuration: number;
  /** 每次尝试的耗时 */
  attemptDurations: number[];
}

/**
 * 通用重试处理器
 *
 * 提供智能重试机制：
 * - 指数退避算法
 * - 基于错误类型的重试判断
 * - 抖动防止雷群效应
 * - 详细的重试统计
 */
export class UniversalRetryHandler {
  private readonly logger = new Logger(UniversalRetryHandler.name);

  /**
   * 默认重试配置
   */
  static readonly DEFAULT_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1秒
    maxDelay: 10000, // 10秒
    backoffFactor: 2,
    enableJitter: true,
    timeout: 30000, // 30秒
  };

  /**
   * 执行带重试的操作
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    component: ComponentIdentifier,
    config: Partial<RetryConfig> = {}
  ): Promise<RetryResult<T>> {
    const finalConfig: RetryConfig = { ...this.DEFAULT_CONFIG, ...config };
    const logger = new Logger(`${UniversalRetryHandler.name}:${component}`);

    const startTime = Date.now();
    const attemptDurations: number[] = [];
    let lastError: BusinessException | undefined;

    logger.log(`开始执行重试操作: ${operationName}`, {
      config: finalConfig,
      component,
    });

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      const attemptStartTime = Date.now();

      try {
        logger.debug(`执行第 ${attempt} 次尝试: ${operationName}`);

        // 设置超时
        const result = finalConfig.timeout
          ? await this.withTimeout(operation(), finalConfig.timeout)
          : await operation();

        const attemptDuration = Date.now() - attemptStartTime;
        attemptDurations.push(attemptDuration);

        const totalDuration = Date.now() - startTime;

        logger.log(`操作成功: ${operationName}`, {
          attempt,
          attemptDuration,
          totalDuration,
          component,
        });

        return {
          success: true,
          result,
          attempts: attempt,
          totalDuration,
          attemptDurations,
        };
      } catch (error) {
        const attemptDuration = Date.now() - attemptStartTime;
        attemptDurations.push(attemptDuration);

        // 转换为BusinessException
        const businessError = BusinessException.isBusinessException(error)
          ? error
          : UniversalExceptionFactory.createFromError(
              error,
              operationName,
              component
            );

        lastError = businessError;

        logger.warn(`第 ${attempt} 次尝试失败: ${operationName}`, {
          attempt,
          error: businessError.getDetailedInfo(),
          attemptDuration,
          retryable: businessError.retryable,
        });

        // 检查是否应该重试
        const shouldRetry = this.shouldRetry(
          businessError,
          attempt,
          finalConfig.maxAttempts
        );

        if (!shouldRetry) {
          logger.error(`操作最终失败，不再重试: ${operationName}`, {
            reason: attempt >= finalConfig.maxAttempts
              ? '已达到最大重试次数'
              : '错误不可重试',
            error: businessError.getDetailedInfo(),
            totalAttempts: attempt,
          });
          break;
        }

        // 如果不是最后一次尝试，等待后重试
        if (attempt < finalConfig.maxAttempts) {
          const delay = this.calculateDelay(
            attempt,
            finalConfig.baseDelay,
            finalConfig.maxDelay,
            finalConfig.backoffFactor,
            finalConfig.enableJitter
          );

          logger.debug(`等待 ${delay}ms 后进行第 ${attempt + 1} 次重试`);
          await this.sleep(delay);
        }
      }
    }

    const totalDuration = Date.now() - startTime;

    return {
      success: false,
      error: lastError,
      attempts: finalConfig.maxAttempts,
      totalDuration,
      attemptDurations,
    };
  }

  /**
   * 判断是否应该重试
   */
  private static shouldRetry(
    error: BusinessException,
    currentAttempt: number,
    maxAttempts: number
  ): boolean {
    // 已达到最大重试次数
    if (currentAttempt >= maxAttempts) {
      return false;
    }

    // 检查错误是否可重试
    if (!error.retryable) {
      return false;
    }

    // 特定错误代码的重试策略
    const neverRetryErrorCodes = [
      BusinessErrorCode.DATA_VALIDATION_FAILED,
      BusinessErrorCode.BUSINESS_RULE_VIOLATION,
      BusinessErrorCode.INVALID_OPERATION,
      BusinessErrorCode.OPERATION_NOT_ALLOWED,
      BusinessErrorCode.CONFIGURATION_ERROR,
      BusinessErrorCode.ENVIRONMENT_ERROR,
    ];

    return !neverRetryErrorCodes.includes(error.errorCode as BusinessErrorCode);
  }

  /**
   * 计算重试延迟时间（指数退避 + 抖动）
   */
  private static calculateDelay(
    attempt: number,
    baseDelay: number,
    maxDelay: number,
    backoffFactor: number,
    enableJitter: boolean
  ): number {
    // 计算指数退避延迟
    const exponentialDelay = baseDelay * Math.pow(backoffFactor, attempt - 1);

    // 限制最大延迟
    let delay = Math.min(exponentialDelay, maxDelay);

    // 添加抖动防止雷群效应
    if (enableJitter) {
      // 使用 ±20% 的抖动
      const jitterRange = delay * 0.2;
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay = Math.max(0, delay + jitter);
    }

    return Math.round(delay);
  }

  /**
   * 睡眠指定毫秒数
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 为操作添加超时限制
   */
  private static withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          UniversalExceptionFactory.createBusinessException({
            message: `操作超时 (${timeoutMs}ms)`,
            errorCode: BusinessErrorCode.EXTERNAL_SERVICE_TIMEOUT,
            operation: 'timeout',
            component: ComponentIdentifier.COMMON,
            retryable: true,
          })
        );
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 创建重试配置
   */
  static createConfig(overrides: Partial<RetryConfig>): RetryConfig {
    return { ...this.DEFAULT_CONFIG, ...overrides };
  }

  /**
   * 快速配置：快速重试（适用于轻量级操作）
   */
  static readonly QUICK_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffFactor: 2,
    enableJitter: true,
    timeout: 10000,
  };

  /**
   * 快速配置：标准重试（适用于一般操作）
   */
  static readonly STANDARD_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    enableJitter: true,
    timeout: 30000,
  };

  /**
   * 快速配置：持久重试（适用于关键操作）
   */
  static readonly PERSISTENT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffFactor: 2,
    enableJitter: true,
    timeout: 60000,
  };

  /**
   * 快速配置：网络重试（适用于网络操作）
   */
  static readonly NETWORK_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 4,
    baseDelay: 1500,
    maxDelay: 15000,
    backoffFactor: 2.5,
    enableJitter: true,
    timeout: 45000,
  };

  /**
   * 简化的重试执行方法（使用预设配置）
   */
  static async quickRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    component: ComponentIdentifier
  ): Promise<T> {
    const result = await this.executeWithRetry(
      operation,
      operationName,
      component,
      this.QUICK_RETRY_CONFIG
    );

    if (result.success) {
      return result.result!;
    }

    throw result.error!;
  }

  /**
   * 简化的标准重试执行方法
   */
  static async standardRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    component: ComponentIdentifier
  ): Promise<T> {
    const result = await this.executeWithRetry(
      operation,
      operationName,
      component,
      this.STANDARD_RETRY_CONFIG
    );

    if (result.success) {
      return result.result!;
    }

    throw result.error!;
  }

  /**
   * 简化的持久重试执行方法
   */
  static async persistentRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    component: ComponentIdentifier
  ): Promise<T> {
    const result = await this.executeWithRetry(
      operation,
      operationName,
      component,
      this.PERSISTENT_RETRY_CONFIG
    );

    if (result.success) {
      return result.result!;
    }

    throw result.error!;
  }

  /**
   * 简化的网络重试执行方法
   */
  static async networkRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    component: ComponentIdentifier
  ): Promise<T> {
    const result = await this.executeWithRetry(
      operation,
      operationName,
      component,
      this.NETWORK_RETRY_CONFIG
    );

    if (result.success) {
      return result.result!;
    }

    throw result.error!;
  }
}
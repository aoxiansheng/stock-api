import { RETRY_CONFIG } from '../constants/symbol-transformer.constants';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT', 
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  VALIDATION = 'VALIDATION',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN',
}

/**
 * 重试配置接口
 */
export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  backoffFactor?: number;
  maxDelay?: number;
  jitterFactor?: number;
  retryableErrors?: ErrorType[];
}

/**
 * 重试结果接口
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDelay: number;
}

/**
 * 断路器状态枚举
 */
export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN', 
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * 断路器配置接口
 */
export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

/**
 * 重试和断路器工具类
 */
export class RetryUtils {
  private static circuitBreakers = new Map<string, CircuitBreakerState>();

  /**
   * 带指数退避的重试机制
   * @param fn 要重试的异步函数
   * @param options 重试配置
   * @returns 重试结果
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const config = {
      maxAttempts: options.maxAttempts ?? RETRY_CONFIG.MAX_ATTEMPTS,
      baseDelay: options.baseDelay ?? RETRY_CONFIG.BASE_DELAY,
      backoffFactor: options.backoffFactor ?? RETRY_CONFIG.BACKOFF_FACTOR,
      maxDelay: options.maxDelay ?? RETRY_CONFIG.MAX_DELAY,
      jitterFactor: options.jitterFactor ?? RETRY_CONFIG.JITTER_FACTOR,
      retryableErrors: options.retryableErrors ?? [
        ErrorType.NETWORK,
        ErrorType.TIMEOUT,
        ErrorType.SERVICE_UNAVAILABLE,
      ],
    };

    let lastError: Error;
    let totalDelay = 0;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await fn();
        return {
          success: true,
          result,
          attempts: attempt,
          totalDelay,
        };
      } catch (error) {
        lastError = error as Error;
        
        const errorType = this.classifyError(error as Error);
        
        // 检查是否为可重试错误
        if (!config.retryableErrors.includes(errorType)) {
          return {
            success: false,
            error: lastError,
            attempts: attempt,
            totalDelay,
          };
        }

        // 最后一次尝试失败
        if (attempt === config.maxAttempts) {
          break;
        }

        // 计算延迟时间（指数退避 + 抖动）
        const delay = this.calculateDelay(
          config.baseDelay,
          attempt,
          config.backoffFactor,
          config.maxDelay,
          config.jitterFactor
        );

        totalDelay += delay;
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError!,
      attempts: config.maxAttempts,
      totalDelay,
    };
  }

  /**
   * 断路器模式包装
   * @param key 断路器标识
   * @param fn 要执行的函数
   * @param options 断路器配置
   * @returns 执行结果
   */
  static async withCircuitBreaker<T>(
    key: string,
    fn: () => Promise<T>,
    options: CircuitBreakerOptions = {
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 10000,
      resetTimeout: 60000,
    }
  ): Promise<T> {
    let breaker = this.circuitBreakers.get(key);
    
    if (!breaker) {
      breaker = new CircuitBreakerState(options);
      this.circuitBreakers.set(key, breaker);
    }

    return breaker.execute(fn);
  }

  /**
   * 组合重试和断路器模式
   * @param key 断路器标识
   * @param fn 要执行的函数
   * @param retryOptions 重试配置
   * @param circuitOptions 断路器配置
   * @returns 执行结果
   */
  static async withRetryAndCircuitBreaker<T>(
    key: string,
    fn: () => Promise<T>,
    retryOptions?: RetryOptions,
    circuitOptions?: CircuitBreakerOptions
  ): Promise<RetryResult<T>> {
    return this.withRetry(
      () => this.withCircuitBreaker(key, fn, circuitOptions),
      retryOptions
    );
  }

  /**
   * 错误分类
   * @param error 错误对象
   * @returns 错误类型
   */
  private static classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('connect')) {
      return ErrorType.NETWORK;
    }
    
    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT;
    }
    
    if (message.includes('service unavailable') || message.includes('503')) {
      return ErrorType.SERVICE_UNAVAILABLE;
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION;
    }
    
    if (error.name === 'SystemError') {
      return ErrorType.SYSTEM;
    }
    
    return ErrorType.UNKNOWN;
  }

  /**
   * 计算延迟时间（指数退避 + 抖动）
   */
  private static calculateDelay(
    baseDelay: number,
    attempt: number,
    backoffFactor: number,
    maxDelay: number,
    jitterFactor: number
  ): number {
    // 指数退避
    const exponentialDelay = baseDelay * Math.pow(backoffFactor, attempt - 1);
    
    // 应用最大延迟限制
    const clampedDelay = Math.min(exponentialDelay, maxDelay);
    
    // 添加抖动
    const jitter = clampedDelay * jitterFactor * Math.random();
    
    return Math.floor(clampedDelay + jitter);
  }

  /**
   * 异步睡眠
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理断路器状态（测试用）
   */
  static clearCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }

  /**
   * 获取断路器状态（调试用）
   */
  static getCircuitBreakerState(key: string): CircuitState | undefined {
    return this.circuitBreakers.get(key)?.getState();
  }
}

/**
 * 断路器状态管理类
 */
class CircuitBreakerState {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime < this.options.resetTimeout) {
        throw new Error('Circuit breaker is OPEN');
      } else {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      }
    }

    try {
      const result = await this.executeWithTimeout(fn);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private async executeWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Operation timeout')), this.options.timeout)
      ),
    ]);
  }

  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = CircuitState.CLOSED;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.options.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}
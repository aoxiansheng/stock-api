/**
 * Cache 异常模块导出（简化版）
 *
 * 基于通用组件库优化，仅导出Cache业务特定的异常类型
 */

import {
  CacheException,
  CacheConnectionException,
  CacheOperationException,
  CacheSerializationException,
  CacheValidationException,
  CacheConfigurationException,
  CacheTimeoutException,
  CacheLockException,
  CacheBatchException,
} from "./cache.exceptions";

export {
  // Cache业务特定异常类
  CacheException,
  CacheConnectionException,
  CacheOperationException,
  CacheSerializationException,
  CacheValidationException,
  CacheConfigurationException,
  CacheTimeoutException,
  CacheLockException,
  CacheBatchException,
};

// 类型检查工具
export const isCacheException = (error: unknown): boolean => {
  return (
    error instanceof Error && error.constructor.name.includes("CacheException")
  );
};

// 异常信息提取工具
export const getCacheExceptionOperation = (
  error: unknown,
): string | undefined => {
  if (isCacheException(error)) {
    return (error as any).operation;
  }
  return undefined;
};

export const getCacheExceptionKey = (error: unknown): string | undefined => {
  if (isCacheException(error)) {
    return (error as any).cacheKey;
  }
  return undefined;
};

// 异常工厂类
export class CacheExceptionFactory {
  static connection(
    operation: string,
    cacheKey?: string,
    originalError?: Error,
  ): CacheConnectionException {
    return new CacheConnectionException(operation, cacheKey, originalError);
  }

  static operation(
    operation: string,
    cacheKey?: string,
    originalError?: Error,
  ): CacheOperationException {
    return new CacheOperationException(operation, cacheKey, originalError);
  }

  static serialization(
    operation: string,
    serializationType: string,
    cacheKey?: string,
    originalError?: Error,
  ): CacheSerializationException {
    return new CacheSerializationException(
      operation,
      serializationType,
      cacheKey,
      originalError,
    );
  }

  static validation(
    operation: string,
    validationType: string,
    validationMessage: string,
    cacheKey?: string,
    originalError?: Error,
  ): CacheValidationException {
    return new CacheValidationException(
      operation,
      validationType,
      validationMessage,
      cacheKey,
      originalError,
    );
  }

  static timeout(
    operation: string,
    timeoutMs: number,
    cacheKey?: string,
    originalError?: Error,
  ): CacheTimeoutException {
    return new CacheTimeoutException(
      operation,
      timeoutMs,
      cacheKey,
      originalError,
    );
  }

  static lock(
    operation: string,
    lockKey: string,
    originalError?: Error,
  ): CacheLockException {
    return new CacheLockException(operation, lockKey, originalError);
  }

  static batch(
    operation: string,
    batchSize: number,
    message: string,
    status: any,
    maxAllowed?: number,
    originalError?: Error,
  ): CacheBatchException {
    return new CacheBatchException(
      operation,
      batchSize,
      message,
      status,
      maxAllowed,
      originalError,
    );
  }

  static fromError(
    operation: string,
    error: Error,
    cacheKey?: string,
  ): CacheException {
    const errorMessage = error.message.toLowerCase();

    // 检测连接错误
    if (
      errorMessage.includes("connection") ||
      errorMessage.includes("econnrefused")
    ) {
      return this.connection(operation, cacheKey, error);
    }

    // 检测超时错误
    if (errorMessage.includes("timeout")) {
      return this.timeout(operation, 5000, cacheKey, error);
    }

    // 检测序列化错误
    if (
      errorMessage.includes("json") ||
      errorMessage.includes("parse") ||
      errorMessage.includes("serialize")
    ) {
      return this.serialization(operation, "json", cacheKey, error);
    }

    // 检测锁错误
    if (errorMessage.includes("lock")) {
      return this.lock(operation, cacheKey || "unknown", error);
    }

    // 默认返回操作异常
    return this.operation(operation, cacheKey, error);
  }
}

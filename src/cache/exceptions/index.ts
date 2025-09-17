/**
 * Cache 异常模块导出
 *
 * 统一导出所有 Cache 相关异常类，便于其他模块使用
 */

import { CacheException } from "./cache.exceptions";

export {
  // 基础异常类
  CacheException,

  // 具体异常类
  CacheConnectionException,
  CacheOperationException,
  CacheSerializationException,
  CacheValidationException,
  CacheConfigurationException,
  CacheTimeoutException,
  CacheLockException,
  CacheBatchException,

  // 异常工厂
  CacheExceptionFactory,
} from "./cache.exceptions";

// 异常类型检查工具
export const isCacheException = (error: unknown): error is CacheException => {
  return (
    error instanceof Error &&
    "operation" in error &&
    error.constructor.name.includes("Cache")
  );
};

// 获取异常操作类型
export const getCacheExceptionOperation = (error: CacheException): string => {
  return error.operation;
};

// 获取异常缓存键
export const getCacheExceptionKey = (
  error: CacheException,
): string | undefined => {
  return error.cacheKey;
};

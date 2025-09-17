/**
 * Cache 模块专用异常类
 *
 * 提供标准化的 Cache 异常处理，支持 GlobalExceptionFilter 统一处理
 * 替代手动 try-catch 异常处理，提高代码复用性和维护性
 */

import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Cache 操作基础异常类
 * 所有 Cache 异常的基类，便于 GlobalExceptionFilter 识别
 */
export abstract class CacheException extends HttpException {
  public readonly operation: string;
  public readonly cacheKey?: string;
  public readonly originalError?: Error;

  constructor(
    message: string,
    status: HttpStatus,
    operation: string,
    cacheKey?: string,
    originalError?: Error,
  ) {
    super(
      {
        message,
        error: "CacheException",
        operation,
        cacheKey,
        originalError: originalError?.message,
        timestamp: new Date().toISOString(),
      },
      status,
    );

    this.operation = operation;
    this.cacheKey = cacheKey;
    this.originalError = originalError;
  }
}

/**
 * Cache 连接异常 - Redis 连接失败
 * 对应 HTTP 503 Service Unavailable
 */
export class CacheConnectionException extends CacheException {
  constructor(operation: string, cacheKey?: string, originalError?: Error) {
    super(
      `缓存连接失败: ${operation}${cacheKey ? ` (key: ${cacheKey})` : ""}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      operation,
      cacheKey,
      originalError,
    );
  }
}

/**
 * Cache 操作异常 - Redis 操作失败
 * 对应 HTTP 503 Service Unavailable
 */
export class CacheOperationException extends CacheException {
  constructor(operation: string, cacheKey?: string, originalError?: Error) {
    super(
      `缓存操作失败: ${operation}${cacheKey ? ` (key: ${cacheKey})` : ""}`,
      HttpStatus.SERVICE_UNAVAILABLE,
      operation,
      cacheKey,
      originalError,
    );
  }
}

/**
 * Cache 序列化异常 - 数据序列化/反序列化失败
 * 对应 HTTP 400 Bad Request
 */
export class CacheSerializationException extends CacheException {
  public readonly serializationType: string;

  constructor(
    operation: string,
    serializationType: string,
    cacheKey?: string,
    originalError?: Error,
  ) {
    super(
      `缓存序列化失败: ${operation} (type: ${serializationType})${cacheKey ? ` (key: ${cacheKey})` : ""}`,
      HttpStatus.BAD_REQUEST,
      operation,
      cacheKey,
      originalError,
    );
    this.serializationType = serializationType;
  }
}

/**
 * Cache 参数异常 - 参数验证失败
 * 对应 HTTP 400 Bad Request
 */
export class CacheValidationException extends CacheException {
  public readonly validationType: string;

  constructor(
    operation: string,
    validationType: string,
    message: string,
    cacheKey?: string,
    originalError?: Error,
  ) {
    super(
      `缓存参数验证失败: ${message} (operation: ${operation}, validation: ${validationType})${cacheKey ? ` (key: ${cacheKey})` : ""}`,
      HttpStatus.BAD_REQUEST,
      operation,
      cacheKey,
      originalError,
    );
    this.validationType = validationType;
  }
}

/**
 * Cache 配置异常 - 配置错误或缺失
 * 对应 HTTP 500 Internal Server Error
 */
export class CacheConfigurationException extends CacheException {
  public readonly configKey: string;

  constructor(configKey: string, message: string, originalError?: Error) {
    super(
      `缓存配置异常: ${message} (config: ${configKey})`,
      HttpStatus.INTERNAL_SERVER_ERROR,
      "configuration",
      undefined,
      originalError,
    );
    this.configKey = configKey;
  }
}

/**
 * Cache 超时异常 - 操作超时
 * 对应 HTTP 408 Request Timeout
 */
export class CacheTimeoutException extends CacheException {
  public readonly timeoutMs: number;

  constructor(
    operation: string,
    timeoutMs: number,
    cacheKey?: string,
    originalError?: Error,
  ) {
    super(
      `缓存操作超时: ${operation} (timeout: ${timeoutMs}ms)${cacheKey ? ` (key: ${cacheKey})` : ""}`,
      HttpStatus.REQUEST_TIMEOUT,
      operation,
      cacheKey,
      originalError,
    );
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Cache 锁异常 - 分布式锁获取失败
 * 对应 HTTP 409 Conflict
 */
export class CacheLockException extends CacheException {
  public readonly lockKey: string;

  constructor(operation: string, lockKey: string, originalError?: Error) {
    super(
      `缓存锁操作失败: ${operation} (lock: ${lockKey})`,
      HttpStatus.CONFLICT,
      operation,
      lockKey,
      originalError,
    );
    this.lockKey = lockKey;
  }
}

/**
 * Cache 批量操作异常 - 批量操作超限或失败
 * 对应 HTTP 400 Bad Request (参数问题) 或 503 Service Unavailable (操作失败)
 */
export class CacheBatchException extends CacheException {
  public readonly batchSize: number;
  public readonly maxAllowed?: number;

  constructor(
    operation: string,
    batchSize: number,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    maxAllowed?: number,
    originalError?: Error,
  ) {
    super(
      `缓存批量操作异常: ${message} (operation: ${operation}, size: ${batchSize}${maxAllowed ? `, max: ${maxAllowed}` : ""})`,
      status,
      operation,
      undefined,
      originalError,
    );
    this.batchSize = batchSize;
    this.maxAllowed = maxAllowed;
  }
}

/**
 * Cache 异常工厂 - 便捷创建各类 Cache 异常
 */
export class CacheExceptionFactory {
  /**
   * 创建连接异常
   */
  static connection(
    operation: string,
    cacheKey?: string,
    originalError?: Error,
  ): CacheConnectionException {
    return new CacheConnectionException(operation, cacheKey, originalError);
  }

  /**
   * 创建操作异常
   */
  static operation(
    operation: string,
    cacheKey?: string,
    originalError?: Error,
  ): CacheOperationException {
    return new CacheOperationException(operation, cacheKey, originalError);
  }

  /**
   * 创建序列化异常
   */
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

  /**
   * 创建参数验证异常
   */
  static validation(
    operation: string,
    validationType: string,
    message: string,
    cacheKey?: string,
    originalError?: Error,
  ): CacheValidationException {
    return new CacheValidationException(
      operation,
      validationType,
      message,
      cacheKey,
      originalError,
    );
  }

  /**
   * 创建配置异常
   */
  static configuration(
    configKey: string,
    message: string,
    originalError?: Error,
  ): CacheConfigurationException {
    return new CacheConfigurationException(configKey, message, originalError);
  }

  /**
   * 创建超时异常
   */
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

  /**
   * 创建锁异常
   */
  static lock(
    operation: string,
    lockKey: string,
    originalError?: Error,
  ): CacheLockException {
    return new CacheLockException(operation, lockKey, originalError);
  }

  /**
   * 创建批量操作异常
   */
  static batch(
    operation: string,
    batchSize: number,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
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

  /**
   * 从原始错误创建合适的 Cache 异常
   * 智能判断错误类型并创建对应异常
   */
  static fromError(
    operation: string,
    error: Error,
    cacheKey?: string,
  ): CacheException {
    const errorMessage = error.message.toLowerCase();

    // 连接相关错误
    if (
      errorMessage.includes("connection") ||
      errorMessage.includes("econnrefused") ||
      errorMessage.includes("enotfound") ||
      errorMessage.includes("redis")
    ) {
      return new CacheConnectionException(operation, cacheKey, error);
    }

    // 超时相关错误
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("etimedout")
    ) {
      return new CacheTimeoutException(operation, 5000, cacheKey, error); // 默认 5秒超时
    }

    // 序列化相关错误
    if (
      errorMessage.includes("json") ||
      errorMessage.includes("serialize") ||
      errorMessage.includes("parse") ||
      errorMessage.includes("msgpack")
    ) {
      return new CacheSerializationException(
        operation,
        "unknown",
        cacheKey,
        error,
      );
    }

    // 锁相关错误
    if (errorMessage.includes("lock")) {
      return new CacheLockException(operation, cacheKey || "unknown", error);
    }

    // 默认为操作异常
    return new CacheOperationException(operation, cacheKey, error);
  }
}

/**
 * Cache 模块简化异常类
 * 
 * 基于通用组件库优化，移除重复实现，保留Cache业务特定的异常类型
 * 与 GlobalExceptionFilter 无缝集成，减少维护成本
 */

import { 
  BadRequestException, 
  ServiceUnavailableException, 
  RequestTimeoutException,
  ConflictException,
  HttpException,
  HttpStatus
} from "@nestjs/common";

/**
 * Cache 基础异常类
 */
export abstract class CacheException extends HttpException {
  public readonly operation: string;
  public readonly cacheKey?: string;

  constructor(
    message: string,
    status: HttpStatus,
    operation: string,
    cacheKey?: string,
    public readonly originalError?: Error
  ) {
    super(message, status);
    this.operation = operation;
    this.cacheKey = cacheKey;
  }

  getResponse(): string | object {
    return {
      message: this.message,
      error: 'CacheException',
      operation: this.operation,
      cacheKey: this.cacheKey,
      originalError: this.originalError?.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Cache 连接异常 - Redis 连接失败
 * 对应 HTTP 503 Service Unavailable
 */
export class CacheConnectionException extends CacheException {
  constructor(operation: string, cacheKey?: string, originalError?: Error) {
    const message = `缓存连接失败: ${operation}${cacheKey ? ` (key: ${cacheKey})` : ""}`;
    super(message, HttpStatus.SERVICE_UNAVAILABLE, operation, cacheKey, originalError);
  }
}

/**
 * Cache 操作异常 - 通用操作失败
 * 对应 HTTP 503 Service Unavailable
 */
export class CacheOperationException extends CacheException {
  constructor(operation: string, cacheKey?: string, originalError?: Error) {
    const message = `缓存操作失败: ${operation}${cacheKey ? ` (key: ${cacheKey})` : ""}`;
    super(message, HttpStatus.SERVICE_UNAVAILABLE, operation, cacheKey, originalError);
  }
}

/**
 * Cache 序列化异常 - 数据序列化/反序列化失败
 * 对应 HTTP 400 Bad Request
 */
export class CacheSerializationException extends CacheException {
  public readonly serializationType: string;

  constructor(operation: string, serializationType: string, cacheKey?: string, originalError?: Error) {
    const message = `缓存序列化失败: ${operation} (type: ${serializationType})${cacheKey ? ` (key: ${cacheKey})` : ""}`;
    super(message, HttpStatus.BAD_REQUEST, operation, cacheKey, originalError);
    this.serializationType = serializationType;
  }
}

/**
 * Cache 验证异常 - 参数验证失败
 * 对应 HTTP 400 Bad Request  
 */
export class CacheValidationException extends CacheException {
  public readonly validationType: string;

  constructor(
    operation: string, 
    validationType: string, 
    validationMessage: string,
    cacheKey?: string, 
    originalError?: Error
  ) {
    const message = `缓存参数验证失败: ${validationMessage}`;
    super(message, HttpStatus.BAD_REQUEST, operation, cacheKey, originalError);
    this.validationType = validationType;
  }
}

/**
 * Cache 配置异常 - 配置错误
 * 对应 HTTP 500 Internal Server Error
 */
export class CacheConfigurationException extends CacheException {
  constructor(operation: string, configKey: string, originalError?: Error) {
    const message = `缓存配置错误: ${operation} (config: ${configKey})`;
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, operation, configKey, originalError);
  }
}

/**
 * Cache 超时异常 - 操作超时
 * 对应 HTTP 408 Request Timeout
 */
export class CacheTimeoutException extends CacheException {
  public readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number, cacheKey?: string, originalError?: Error) {
    const message = `缓存操作超时: ${operation} (timeout: ${timeoutMs}ms)${cacheKey ? ` (key: ${cacheKey})` : ""}`;
    super(message, HttpStatus.REQUEST_TIMEOUT, operation, cacheKey, originalError);
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Cache 锁异常 - 分布式锁操作失败
 * 对应 HTTP 409 Conflict
 */
export class CacheLockException extends CacheException {
  public readonly lockKey: string;

  constructor(operation: string, lockKey: string, originalError?: Error) {
    const message = `缓存锁操作失败: ${operation} (lock: ${lockKey})`;
    super(message, HttpStatus.CONFLICT, operation, lockKey, originalError);
    this.lockKey = lockKey;
  }
}

/**
 * Cache 批量操作异常 - 批量操作失败
 * 对应 HTTP 400 Bad Request 或 413 Payload Too Large
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
    originalError?: Error
  ) {
    const fullMessage = `缓存批量操作异常: ${message} (operation: ${operation}, size: ${batchSize}${maxAllowed ? `, max: ${maxAllowed}` : ""})`;
    super(fullMessage, status, operation, undefined, originalError);
    this.batchSize = batchSize;
    this.maxAllowed = maxAllowed;
  }
}


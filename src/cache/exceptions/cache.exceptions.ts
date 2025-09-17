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
  InternalServerErrorException,
  PayloadTooLargeException,
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

}

/**
 * Cache 连接异常 - Redis 连接失败
 * 对应 HTTP 503 Service Unavailable
 */
export class CacheConnectionException extends ServiceUnavailableException {
  public readonly operation: string;
  public readonly cacheKey?: string;
  public readonly originalError?: Error;

  constructor(operation: string, cacheKey?: string, originalError?: Error) {
    const message = `缓存连接失败: ${operation}${cacheKey ? ` (key: ${cacheKey})` : ""}`;
    super(message);
    this.operation = operation;
    this.cacheKey = cacheKey;
    this.originalError = originalError;
  }
}

/**
 * Cache 操作异常 - 通用操作失败
 * 对应 HTTP 503 Service Unavailable
 */
export class CacheOperationException extends ServiceUnavailableException {
  public readonly operation: string;
  public readonly cacheKey?: string;
  public readonly originalError?: Error;

  constructor(operation: string, cacheKey?: string, originalError?: Error) {
    const message = `缓存操作失败: ${operation}${cacheKey ? ` (key: ${cacheKey})` : ""}`;
    super(message);
    this.operation = operation;
    this.cacheKey = cacheKey;
    this.originalError = originalError;
  }
}

/**
 * Cache 序列化异常 - 数据序列化/反序列化失败
 * 对应 HTTP 400 Bad Request
 */
export class CacheSerializationException extends BadRequestException {
  public readonly operation: string;
  public readonly cacheKey?: string;
  public readonly originalError?: Error;
  public readonly serializationType: string;

  constructor(operation: string, serializationType: string, cacheKey?: string, originalError?: Error) {
    const message = `缓存序列化失败: ${operation} (type: ${serializationType})${cacheKey ? ` (key: ${cacheKey})` : ""}`;
    super(message);
    this.operation = operation;
    this.cacheKey = cacheKey;
    this.originalError = originalError;
    this.serializationType = serializationType;
  }
}

/**
 * Cache 验证异常 - 参数验证失败
 * 对应 HTTP 400 Bad Request  
 */
export class CacheValidationException extends BadRequestException {
  public readonly operation: string;
  public readonly cacheKey?: string;
  public readonly originalError?: Error;
  public readonly validationType: string;

  constructor(
    operation: string, 
    validationType: string, 
    validationMessage: string,
    cacheKey?: string, 
    originalError?: Error
  ) {
    const message = `缓存参数验证失败: ${validationMessage}`;
    super(message);
    this.operation = operation;
    this.cacheKey = cacheKey;
    this.originalError = originalError;
    this.validationType = validationType;
  }
}

/**
 * Cache 配置异常 - 配置错误
 * 对应 HTTP 500 Internal Server Error
 */
export class CacheConfigurationException extends InternalServerErrorException {
  public readonly operation: string;
  public readonly cacheKey?: string;
  public readonly originalError?: Error;

  constructor(operation: string, configKey: string, originalError?: Error) {
    const message = `缓存配置错误: ${operation} (config: ${configKey})`;
    super(message);
    this.operation = operation;
    this.cacheKey = configKey;
    this.originalError = originalError;
  }
}

/**
 * Cache 超时异常 - 操作超时
 * 对应 HTTP 408 Request Timeout
 */
export class CacheTimeoutException extends RequestTimeoutException {
  public readonly operation: string;
  public readonly cacheKey?: string;
  public readonly originalError?: Error;
  public readonly timeoutMs: number;

  constructor(operation: string, timeoutMs: number, cacheKey?: string, originalError?: Error) {
    const message = `缓存操作超时: ${operation} (timeout: ${timeoutMs}ms)${cacheKey ? ` (key: ${cacheKey})` : ""}`;
    super(message);
    this.operation = operation;
    this.cacheKey = cacheKey;
    this.originalError = originalError;
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Cache 锁异常 - 分布式锁操作失败
 * 对应 HTTP 409 Conflict
 */
export class CacheLockException extends ConflictException {
  public readonly operation: string;
  public readonly cacheKey?: string;
  public readonly originalError?: Error;
  public readonly lockKey: string;

  constructor(operation: string, lockKey: string, originalError?: Error) {
    const message = `缓存锁操作失败: ${operation} (lock: ${lockKey})`;
    super(message);
    this.operation = operation;
    this.cacheKey = lockKey;
    this.originalError = originalError;
    this.lockKey = lockKey;
  }
}

/**
 * Cache 批量操作异常 - 批量操作失败
 * 对应 HTTP 400 Bad Request 或 413 Payload Too Large
 */
export class CacheBatchException extends BadRequestException {
  public readonly operation: string;
  public readonly cacheKey?: string;
  public readonly originalError?: Error;
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
    super(fullMessage);
    this.operation = operation;
    this.cacheKey = undefined;
    this.originalError = originalError;
    this.batchSize = batchSize;
    this.maxAllowed = maxAllowed;
  }

  /**
   * 创建PayloadTooLarge类型的批量异常
   */
  static createPayloadTooLarge(
    operation: string,
    batchSize: number,
    maxAllowed: number,
    originalError?: Error
  ): PayloadTooLargeException {
    const message = `缓存批量操作数据过大: ${operation} (size: ${batchSize}, max: ${maxAllowed})`;
    return new PayloadTooLargeException(message);
  }
}


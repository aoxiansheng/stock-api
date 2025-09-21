import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 业务异常基类
 *
 * 提供统一的业务异常处理框架，包含：
 * - 错误代码和操作上下文
 * - 组件和错误详情
 * - 重试性判断
 * - 恢复建议
 */
export class BusinessException extends HttpException {
  public readonly errorCode: string;
  public readonly operation: string;
  public readonly component: string;
  public readonly context: Record<string, any>;
  public readonly retryable: boolean;
  public readonly originalError?: Error;

  constructor(options: {
    message: string;
    errorCode: string;
    operation: string;
    component: string;
    statusCode?: HttpStatus;
    context?: Record<string, any>;
    retryable?: boolean;
    originalError?: Error;
  }) {
    const {
      message,
      errorCode,
      operation,
      component,
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
      context = {},
      retryable = false,
      originalError,
    } = options;

    super(message, statusCode);

    this.errorCode = errorCode;
    this.operation = operation;
    this.component = component;
    this.context = context;
    this.retryable = retryable;
    this.originalError = originalError;

    // 设置异常名称
    this.name = 'BusinessException';
  }

  /**
   * 获取恢复操作建议
   */
  getRecoveryAction(): string {
    if (this.retryable) {
      return '请稍后重试，如果问题持续存在请联系技术支持';
    }

    // 根据错误类型提供不同的恢复建议
    switch (this.getStatus()) {
      case HttpStatus.BAD_REQUEST:
        return '请检查请求参数是否正确';
      case HttpStatus.UNAUTHORIZED:
        return '请检查认证信息是否有效';
      case HttpStatus.FORBIDDEN:
        return '请联系管理员获取相应权限';
      case HttpStatus.NOT_FOUND:
        return '请确认资源是否存在';
      case HttpStatus.CONFLICT:
        return '请解决资源冲突后重试';
      case HttpStatus.TOO_MANY_REQUESTS:
        return '请降低请求频率后重试';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return '服务暂时不可用，请稍后重试';
      default:
        return '请联系技术支持获取帮助';
    }
  }

  /**
   * 获取详细的错误信息
   */
  getDetailedInfo(): Record<string, any> {
    return {
      errorCode: this.errorCode,
      message: this.message,
      operation: this.operation,
      component: this.component,
      statusCode: this.getStatus(),
      retryable: this.retryable,
      context: this.context,
      recoveryAction: this.getRecoveryAction(),
      timestamp: new Date().toISOString(),
      ...(this.originalError && {
        originalError: {
          name: this.originalError.name,
          message: this.originalError.message,
        },
      }),
    };
  }

  /**
   * 转换为JSON序列化格式
   */
  toJSON(): Record<string, any> {
    return this.getDetailedInfo();
  }

  /**
   * 判断是否为特定错误类型
   */
  isErrorType(errorCode: string): boolean {
    return this.errorCode === errorCode;
  }

  /**
   * 判断是否为特定组件的错误
   */
  isFromComponent(component: string): boolean {
    return this.component === component;
  }

  /**
   * 静态方法：检查是否为BusinessException
   */
  static isBusinessException(error: unknown): error is BusinessException {
    return error instanceof BusinessException;
  }
}

/**
 * 预定义的业务异常类型
 */
export enum BusinessErrorCode {
  // 数据相关错误
  DATA_NOT_FOUND = 'DATA_NOT_FOUND',
  DATA_VALIDATION_FAILED = 'DATA_VALIDATION_FAILED',
  DATA_PROCESSING_FAILED = 'DATA_PROCESSING_FAILED',
  DATA_SERIALIZATION_FAILED = 'DATA_SERIALIZATION_FAILED',

  // 外部服务错误
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXTERNAL_SERVICE_UNAVAILABLE',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  EXTERNAL_SERVICE_TIMEOUT = 'EXTERNAL_SERVICE_TIMEOUT',

  // 缓存错误
  CACHE_ERROR = 'CACHE_ERROR',
  CACHE_MISS = 'CACHE_MISS',
  CACHE_SERIALIZATION_ERROR = 'CACHE_SERIALIZATION_ERROR',

  // 数据库错误
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT',

  // 配置错误
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  ENVIRONMENT_ERROR = 'ENVIRONMENT_ERROR',

  // 业务规则错误
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INVALID_OPERATION = 'INVALID_OPERATION',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',

  // 资源错误
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',

  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * 组件标识符
 */
export enum ComponentIdentifier {
  // 运营服务组件
  ALERT = 'alert',
  AUTH = 'auth',
  CACHE = 'cache',
  MONITORING = 'monitoring',
  NOTIFICATION = 'notification',

  // 准备层组件
  SYMBOL_MAPPER = 'symbol-mapper',
  DATA_MAPPER = 'data-mapper',

  // 入口层组件
  QUERY = 'query',
  RECEIVER = 'receiver',
  STREAM_RECEIVER = 'stream-receiver',

  // 数据获取组件
  DATA_FETCHER = 'data-fetcher',
  STREAM_DATA_FETCHER = 'stream-data-fetcher',

  // 转换层组件
  TRANSFORMER = 'transformer',
  SYMBOL_TRANSFORMER = 'symbol-transformer',

  // 缓存层组件
  SMART_CACHE = 'smart-cache',
  COMMON_CACHE = 'common-cache',
  SYMBOL_MAPPER_CACHE = 'symbol-mapper-cache',
  DATA_MAPPER_CACHE = 'data-mapper-cache',
  STREAM_CACHE = 'stream-cache',

  // 存储层组件
  STORAGE = 'storage',

  // 共享组件
  SHARED = 'shared',

  // 外部服务
  PROVIDER = 'provider',
  DATABASE = 'database',
  REDIS = 'redis',
  SECURITY = 'security',

  // 通用
  COMMON = 'common',
  UNKNOWN = 'unknown',
}
import { HttpStatus } from '@nestjs/common';
import { MongoError } from 'mongodb';
import {
  BusinessException,
  BusinessErrorCode,
  ComponentIdentifier
} from './business.exception';

/**
 * 通用异常工厂类
 *
 * 提供智能异常创建功能：
 * - 自动判断错误类型和HTTP状态码
 * - 自动判断重试性
 * - 创建标准化的BusinessException
 * - 从原始错误转换为业务异常
 */
export class UniversalExceptionFactory {
  /**
   * 创建业务异常
   */
  static createBusinessException(options: {
    message: string;
    errorCode: BusinessErrorCode;
    operation: string;
    component: ComponentIdentifier;
    statusCode?: HttpStatus;
    context?: Record<string, any>;
    retryable?: boolean;
    originalError?: Error;
  }): BusinessException {
    const {
      message,
      errorCode,
      operation,
      component,
      context = {},
      originalError,
    } = options;

    // 自动判断HTTP状态码
    const statusCode = options.statusCode || this.determineHttpStatus(errorCode);

    // 自动判断重试性
    const retryable = options.retryable !== undefined
      ? options.retryable
      : this.determineRetryability(errorCode, statusCode);

    return new BusinessException({
      message,
      errorCode,
      operation,
      component,
      statusCode,
      context,
      retryable,
      originalError,
    });
  }

  /**
   * 从原始错误创建业务异常（智能分类）
   */
  static createFromError(
    error: Error | unknown,
    operation: string,
    component: ComponentIdentifier,
    context: Record<string, any> = {}
  ): BusinessException {
    if (BusinessException.isBusinessException(error)) {
      // 如果已经是BusinessException，直接返回或包装
      return error;
    }

    const analysis = this.analyzeError(error);

    return this.createBusinessException({
      message: analysis.message,
      errorCode: analysis.errorCode,
      operation,
      component,
      statusCode: analysis.statusCode,
      context: {
        ...context,
        ...analysis.context,
      },
      retryable: analysis.retryable,
      originalError: error instanceof Error ? error : undefined,
    });
  }

  /**
   * 分析原始错误，提取关键信息
   */
  private static analyzeError(error: unknown): {
    message: string;
    errorCode: BusinessErrorCode;
    statusCode: HttpStatus;
    retryable: boolean;
    context: Record<string, any>;
  } {
    if (error instanceof Error) {
      // MongoDB错误分析
      if (this.isMongoError(error)) {
        return this.analyzeMongoError(error as any);
      }

      // 网络超时错误
      if (this.isTimeoutError(error)) {
        return {
          message: error.message || '操作超时',
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_TIMEOUT,
          statusCode: HttpStatus.REQUEST_TIMEOUT,
          retryable: true,
          context: { errorName: error.name },
        };
      }

      // 连接错误
      if (this.isConnectionError(error)) {
        return {
          message: error.message || '连接失败',
          errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          retryable: true,
          context: { errorName: error.name },
        };
      }

      // 验证错误
      if (this.isValidationError(error)) {
        return {
          message: error.message || '数据验证失败',
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          statusCode: HttpStatus.BAD_REQUEST,
          retryable: false,
          context: { errorName: error.name },
        };
      }

      // JSON解析错误
      if (this.isJsonError(error)) {
        return {
          message: error.message || 'JSON格式错误',
          errorCode: BusinessErrorCode.DATA_SERIALIZATION_FAILED,
          statusCode: HttpStatus.BAD_REQUEST,
          retryable: false,
          context: { errorName: error.name },
        };
      }

      // 通用Error
      return {
        message: error.message || '未知错误',
        errorCode: BusinessErrorCode.UNKNOWN_ERROR,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        retryable: false,
        context: {
          errorName: error.name,
          stack: error.stack?.slice(0, 500), // 限制stack长度
        },
      };
    }

    // 非Error类型的异常
    return {
      message: typeof error === 'string' ? error : '未知异常',
      errorCode: BusinessErrorCode.UNKNOWN_ERROR,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      retryable: false,
      context: {
        originalType: typeof error,
        value: typeof error === 'object' ? JSON.stringify(error).slice(0, 200) : String(error).slice(0, 200),
      },
    };
  }

  /**
   * 分析MongoDB错误
   */
  private static analyzeMongoError(error: MongoError & { code?: number }): {
    message: string;
    errorCode: BusinessErrorCode;
    statusCode: HttpStatus;
    retryable: boolean;
    context: Record<string, any>;
  } {
    const context = {
      mongoCode: error.code,
      mongoName: error.name,
    };

    switch (error.code) {
      case 11000: // 重复键错误
        return {
          message: '数据已存在，无法重复创建',
          errorCode: BusinessErrorCode.RESOURCE_CONFLICT,
          statusCode: HttpStatus.CONFLICT,
          retryable: false,
          context,
        };

      case 121: // 文档验证失败
        return {
          message: '数据格式不符合要求',
          errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
          statusCode: HttpStatus.BAD_REQUEST,
          retryable: false,
          context,
        };

      case 2: // 查询语法错误
        return {
          message: '数据库查询条件错误',
          errorCode: BusinessErrorCode.DATABASE_ERROR,
          statusCode: HttpStatus.BAD_REQUEST,
          retryable: false,
          context,
        };

      case 13: // 权限不足
        return {
          message: '数据库操作权限不足',
          errorCode: BusinessErrorCode.DATABASE_ERROR,
          statusCode: HttpStatus.FORBIDDEN,
          retryable: false,
          context,
        };

      default:
        // 连接相关错误通常可重试
        const isRetryable = this.isConnectionRelatedMongoError(error);
        return {
          message: isRetryable ? '数据库连接异常' : '数据库操作失败',
          errorCode: isRetryable
            ? BusinessErrorCode.DATABASE_CONNECTION_ERROR
            : BusinessErrorCode.DATABASE_ERROR,
          statusCode: isRetryable
            ? HttpStatus.SERVICE_UNAVAILABLE
            : HttpStatus.INTERNAL_SERVER_ERROR,
          retryable: isRetryable,
          context,
        };
    }
  }

  /**
   * 根据错误代码确定HTTP状态码
   */
  private static determineHttpStatus(errorCode: BusinessErrorCode): HttpStatus {
    switch (errorCode) {
      case BusinessErrorCode.DATA_NOT_FOUND:
        return HttpStatus.NOT_FOUND;

      case BusinessErrorCode.DATA_VALIDATION_FAILED:
      case BusinessErrorCode.DATA_SERIALIZATION_FAILED:
        return HttpStatus.BAD_REQUEST;

      case BusinessErrorCode.BUSINESS_RULE_VIOLATION:
      case BusinessErrorCode.INVALID_OPERATION:
      case BusinessErrorCode.OPERATION_NOT_ALLOWED:
        return HttpStatus.BAD_REQUEST;

      case BusinessErrorCode.RESOURCE_CONFLICT:
        return HttpStatus.CONFLICT;

      case BusinessErrorCode.RESOURCE_EXHAUSTED:
        return HttpStatus.TOO_MANY_REQUESTS;

      case BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE:
      case BusinessErrorCode.DATABASE_CONNECTION_ERROR:
        return HttpStatus.SERVICE_UNAVAILABLE;

      case BusinessErrorCode.EXTERNAL_SERVICE_TIMEOUT:
      case BusinessErrorCode.DATABASE_TIMEOUT:
        return HttpStatus.REQUEST_TIMEOUT;

      case BusinessErrorCode.CONFIGURATION_ERROR:
      case BusinessErrorCode.ENVIRONMENT_ERROR:
        return HttpStatus.INTERNAL_SERVER_ERROR;

      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  /**
   * 判断错误是否可重试
   */
  private static determineRetryability(
    errorCode: BusinessErrorCode,
    statusCode: HttpStatus
  ): boolean {
    // 基于错误代码的重试性判断
    const retryableErrorCodes = [
      BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
      BusinessErrorCode.EXTERNAL_SERVICE_TIMEOUT,
      BusinessErrorCode.DATABASE_CONNECTION_ERROR,
      BusinessErrorCode.DATABASE_TIMEOUT,
      BusinessErrorCode.CACHE_ERROR,
      BusinessErrorCode.RESOURCE_EXHAUSTED,
    ];

    if (retryableErrorCodes.includes(errorCode)) {
      return true;
    }

    // 基于HTTP状态码的重试性判断
    const retryableStatusCodes = [
      HttpStatus.REQUEST_TIMEOUT,
      HttpStatus.TOO_MANY_REQUESTS,
      HttpStatus.INTERNAL_SERVER_ERROR,
      HttpStatus.BAD_GATEWAY,
      HttpStatus.SERVICE_UNAVAILABLE,
      HttpStatus.GATEWAY_TIMEOUT,
    ];

    return retryableStatusCodes.includes(statusCode);
  }

  /**
   * 判断是否为MongoDB错误
   */
  private static isMongoError(error: Error): boolean {
    return error.name === 'MongoError' ||
           error.name === 'MongoServerError' ||
           'code' in error && typeof (error as any).code === 'number';
  }

  /**
   * 判断是否为超时错误
   */
  private static isTimeoutError(error: Error): boolean {
    const timeoutNames = ['TimeoutError', 'RequestTimeoutError'];
    const timeoutCodes = ['ETIMEDOUT', 'TIMEOUT'];

    return timeoutNames.includes(error.name) ||
           timeoutCodes.includes((error as any).code) ||
           error.message?.toLowerCase().includes('timeout');
  }

  /**
   * 判断是否为连接错误
   */
  private static isConnectionError(error: Error): boolean {
    const connectionCodes = ['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'ENETUNREACH'];
    const connectionNames = ['ConnectionError', 'NetworkError'];

    return connectionNames.includes(error.name) ||
           connectionCodes.includes((error as any).code) ||
           error.message?.toLowerCase().includes('connection');
  }

  /**
   * 判断是否为验证错误
   */
  private static isValidationError(error: Error): boolean {
    const validationNames = ['ValidationError', 'ValidatorError'];

    return validationNames.includes(error.name) ||
           error.message?.toLowerCase().includes('validation');
  }

  /**
   * 判断是否为JSON解析错误
   */
  private static isJsonError(error: Error): boolean {
    return error.name === 'SyntaxError' &&
           error.message?.includes('JSON');
  }

  /**
   * 判断是否为连接相关的MongoDB错误
   */
  private static isConnectionRelatedMongoError(error: MongoError): boolean {
    const connectionErrorCodes = [
      6,    // HostUnreachable
      7,    // HostNotFound
      89,   // NetworkTimeout
      91,   // ShutdownInProgress
      227,  // WouldChangeOwningShard
    ];

    return connectionErrorCodes.includes((error as any).code) ||
           error.message?.toLowerCase().includes('connection') ||
           error.message?.toLowerCase().includes('network');
  }

  /**
   * 创建数据未找到异常
   */
  static createNotFoundError(
    resource: string,
    operation: string,
    component: ComponentIdentifier,
    context: Record<string, any> = {}
  ): BusinessException {
    return this.createBusinessException({
      message: `${resource}未找到`,
      errorCode: BusinessErrorCode.DATA_NOT_FOUND,
      operation,
      component,
      statusCode: HttpStatus.NOT_FOUND,
      context: { resource, ...context },
      retryable: false,
    });
  }

  /**
   * 创建验证失败异常
   */
  static createValidationError(
    message: string,
    operation: string,
    component: ComponentIdentifier,
    validationDetails: Record<string, any> = {}
  ): BusinessException {
    return this.createBusinessException({
      message,
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation,
      component,
      statusCode: HttpStatus.BAD_REQUEST,
      context: { validationDetails },
      retryable: false,
    });
  }

  /**
   * 创建外部服务不可用异常
   */
  static createServiceUnavailableError(
    serviceName: string,
    operation: string,
    component: ComponentIdentifier,
    context: Record<string, any> = {}
  ): BusinessException {
    return this.createBusinessException({
      message: `${serviceName}服务不可用`,
      errorCode: BusinessErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
      operation,
      component,
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      context: { serviceName, ...context },
      retryable: true,
    });
  }
}
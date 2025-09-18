/**
 * Auth模块安全异常类
 *
 * 设计理念：
 * - 继承标准NestJS HttpException，与GlobalExceptionFilter无缝集成
 * - 提供丰富的上下文信息用于日志记录和调试
 * - 遵循统一的错误码和消息规范
 * - 支持原始错误链式传递
 */

import {
  HttpException,
  HttpStatus,
  BadRequestException,
  PayloadTooLargeException as NestPayloadTooLargeException,
  UnsupportedMediaTypeException as NestUnsupportedMediaTypeException,
  InternalServerErrorException,
} from "@nestjs/common";

/**
 * 安全异常基类
 * 为所有安全相关异常提供通用功能
 */
export abstract class SecurityException extends HttpException {
  public readonly securityType: string;
  public readonly requestPath?: string;
  public readonly clientIp?: string;
  public readonly userAgent?: string;

  constructor(
    message: string,
    status: HttpStatus,
    securityType: string,
    requestPath?: string,
    clientIp?: string,
    userAgent?: string,
    public readonly originalError?: Error,
  ) {
    super(message, status);
    this.securityType = securityType;
    this.requestPath = requestPath;
    this.clientIp = clientIp;
    this.userAgent = userAgent;
  }

  getResponse(): string | object {
    const response = super.getResponse();

    // 如果已经是对象格式，增强其内容
    if (typeof response === "object" && response !== null) {
      const responseObj = response as Record<string, any>;
      return {
        ...responseObj,
        error: {
          code: this.getErrorCode(),
          details: {
            type: this.securityType,
            ...(this.requestPath && { path: this.requestPath }),
            ...(this.clientIp && { clientIp: this.clientIp }),
            ...(this.userAgent && { userAgent: this.userAgent }),
            ...(this.originalError && {
              originalError: this.originalError.message,
            }),
          },
        },
      };
    }

    // 支持字符串格式响应
    return response;
  }

  /**
   * 获取错误代码
   * 子类可以重写此方法提供特定的错误代码
   */
  protected getErrorCode(): string {
    return "SECURITY_VIOLATION";
  }
}

/**
 * 增强的负载过大异常
 * 用于替代SecurityMiddleware中的手动响应构造
 */
export class EnhancedPayloadTooLargeException extends SecurityException {
  public readonly actualSize: number;
  public readonly maxAllowedSize: number;

  constructor(
    actualSize: number,
    maxAllowedSize: number,
    maxAllowedSizeString: string,
    requestPath?: string,
    clientIp?: string,
    userAgent?: string,
    originalError?: Error,
  ) {
    const message = `请求体过大，实际大小: ${actualSize} bytes，最大允许: ${maxAllowedSizeString}`;

    super(
      message,
      HttpStatus.PAYLOAD_TOO_LARGE,
      "PayloadSizeViolation",
      requestPath,
      clientIp,
      userAgent,
      originalError,
    );

    this.actualSize = actualSize;
    this.maxAllowedSize = maxAllowedSize;
  }

  protected getErrorCode(): string {
    return "PAYLOAD_TOO_LARGE";
  }

  getResponse(): string | object {
    const baseResponse = super.getResponse();

    if (typeof baseResponse === "object" && baseResponse !== null) {
      const responseObj = baseResponse as Record<string, any>;
      const errorObj = responseObj.error as Record<string, any>;
      const detailsObj = errorObj?.details as Record<string, any>;

      return {
        ...responseObj,
        error: {
          ...errorObj,
          details: {
            ...detailsObj,
            actualSize: this.actualSize,
            maxAllowedSize: this.maxAllowedSize,
            suggestion: "请减小请求体大小或联系管理员调整限制",
          },
        },
      };
    }

    return baseResponse;
  }
}

/**
 * 增强的不支持媒体类型异常
 * 用于替代SecurityMiddleware中的手动响应构造
 */
export class EnhancedUnsupportedMediaTypeException extends SecurityException {
  public readonly contentType: string;
  public readonly reason: string;

  constructor(
    contentType: string,
    reason: string,
    requestPath?: string,
    clientIp?: string,
    userAgent?: string,
    originalError?: Error,
  ) {
    const message = `不支持的媒体类型: ${contentType} (原因: ${reason})`;

    super(
      message,
      HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      "ContentTypeSecurityViolation",
      requestPath,
      clientIp,
      userAgent,
      originalError,
    );

    this.contentType = contentType;
    this.reason = reason;
  }

  protected getErrorCode(): string {
    return "UNSUPPORTED_MEDIA_TYPE";
  }

  getResponse(): string | object {
    const baseResponse = super.getResponse();

    if (typeof baseResponse === "object" && baseResponse !== null) {
      const responseObj = baseResponse as Record<string, any>;
      const errorObj = responseObj.error as Record<string, any>;
      const detailsObj = errorObj?.details as Record<string, any>;

      return {
        ...responseObj,
        error: {
          ...errorObj,
          details: {
            ...detailsObj,
            contentType: this.contentType,
            reason: this.reason,
            suggestion: "请使用支持的媒体类型，如 application/json",
          },
        },
      };
    }

    return baseResponse;
  }
}

/**
 * 增强的输入安全违规异常
 * 用于替代SecurityMiddleware中的恶意输入检测
 */
export class InputSecurityViolationException extends SecurityException {
  public readonly violationType: string;
  public readonly violationDetails: any;

  constructor(
    violationType: string,
    violationDetails: any,
    requestPath?: string,
    clientIp?: string,
    userAgent?: string,
    originalError?: Error,
  ) {
    const message = `检测到恶意输入: ${violationType}`;

    super(
      message,
      HttpStatus.BAD_REQUEST,
      "InputSecurityViolation",
      requestPath,
      clientIp,
      userAgent,
      originalError,
    );

    this.violationType = violationType;
    this.violationDetails = violationDetails;
  }

  protected getErrorCode(): string {
    return "INPUT_SECURITY_VIOLATION";
  }

  getResponse(): string | object {
    const baseResponse = super.getResponse();

    if (typeof baseResponse === "object" && baseResponse !== null) {
      const responseObj = baseResponse as Record<string, any>;
      const errorObj = responseObj.error as Record<string, any>;
      const detailsObj = errorObj?.details as Record<string, any>;

      return {
        ...responseObj,
        error: {
          ...errorObj,
          details: {
            ...detailsObj,
            violationType: this.violationType,
            violationDetails: this.violationDetails,
            suggestion: "请检查输入内容，确保不包含恶意代码或特殊字符",
          },
        },
      };
    }

    return baseResponse;
  }
}

/**
 * 增强的安全中间件异常
 * 用于SecurityMiddleware中的内部错误
 */
export class SecurityMiddlewareException extends SecurityException {
  public readonly middlewareComponent: string;

  constructor(
    middlewareComponent: string,
    message: string,
    requestPath?: string,
    clientIp?: string,
    userAgent?: string,
    originalError?: Error,
  ) {
    const fullMessage = `安全中间件处理失败 [${middlewareComponent}]: ${message}`;

    super(
      fullMessage,
      HttpStatus.INTERNAL_SERVER_ERROR,
      "SecurityMiddlewareError",
      requestPath,
      clientIp,
      userAgent,
      originalError,
    );

    this.middlewareComponent = middlewareComponent;
  }

  protected getErrorCode(): string {
    return "SECURITY_MIDDLEWARE_ERROR";
  }

  getResponse(): string | object {
    const baseResponse = super.getResponse();

    if (typeof baseResponse === "object" && baseResponse !== null) {
      const responseObj = baseResponse as Record<string, any>;
      const errorObj = responseObj.error as Record<string, any>;
      const detailsObj = errorObj?.details as Record<string, any>;

      return {
        ...responseObj,
        error: {
          ...errorObj,
          details: {
            ...detailsObj,
            component: this.middlewareComponent,
            suggestion: "系统内部错误，请稍后重试或联系技术支持",
          },
        },
      };
    }

    return baseResponse;
  }
}

/**
 * 增强的速率限制异常
 * 用于RateLimitExceptionFilter增强模式
 */
export class EnhancedRateLimitException extends SecurityException {
  public readonly limit: number;
  public readonly current: number;
  public readonly remaining: number;
  public readonly resetTime: number;
  public readonly retryAfter: number;

  constructor(
    limit: number,
    current: number,
    remaining: number,
    resetTime: number,
    retryAfter: number,
    requestPath?: string,
    clientIp?: string,
    userAgent?: string,
    appKey?: string,
    originalError?: Error,
  ) {
    const message = "请求过于频繁，请稍后再试";

    super(
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      "RateLimitError",
      requestPath,
      clientIp,
      userAgent,
      originalError,
    );

    this.limit = limit;
    this.current = current;
    this.remaining = remaining;
    this.resetTime = resetTime;
    this.retryAfter = retryAfter;
  }

  protected getErrorCode(): string {
    return "RATE_LIMIT_EXCEEDED";
  }

  getResponse(): string | object {
    const baseResponse = super.getResponse();

    if (typeof baseResponse === "object" && baseResponse !== null) {
      const responseObj = baseResponse as Record<string, any>;
      const errorObj = responseObj.error as Record<string, any>;
      const detailsObj = errorObj?.details as Record<string, any>;

      return {
        ...responseObj,
        error: {
          ...errorObj,
          details: {
            ...detailsObj,
            limit: this.limit,
            current: this.current,
            remaining: this.remaining,
            resetTime: this.resetTime,
            retryAfter: this.retryAfter,
            suggestion: "请降低请求频率或联系管理员升级您的API配额",
          },
        },
      };
    }

    return baseResponse;
  }
}

/**
 * 工厂函数：从请求对象创建安全异常
 * 提供便捷的异常创建方法
 */
export class SecurityExceptionFactory {
  /**
   * 从Express Request对象提取安全上下文信息
   */
  static extractSecurityContext(request: any): {
    requestPath?: string;
    clientIp?: string;
    userAgent?: string;
  } {
    return {
      requestPath: request?.url || request?.originalUrl,
      clientIp: request?.ip || request?.connection?.remoteAddress,
      userAgent: request?.headers?.["user-agent"],
    };
  }

  /**
   * 创建负载过大异常
   */
  static createPayloadTooLargeException(
    actualSize: number,
    maxAllowedSize: number,
    maxAllowedSizeString: string,
    request?: any,
    originalError?: Error,
  ): EnhancedPayloadTooLargeException {
    const context = request ? this.extractSecurityContext(request) : {};

    return new EnhancedPayloadTooLargeException(
      actualSize,
      maxAllowedSize,
      maxAllowedSizeString,
      context.requestPath,
      context.clientIp,
      context.userAgent,
      originalError,
    );
  }

  /**
   * 创建不支持媒体类型异常
   */
  static createUnsupportedMediaTypeException(
    contentType: string,
    reason: string,
    request?: any,
    originalError?: Error,
  ): EnhancedUnsupportedMediaTypeException {
    const context = request ? this.extractSecurityContext(request) : {};

    return new EnhancedUnsupportedMediaTypeException(
      contentType,
      reason,
      context.requestPath,
      context.clientIp,
      context.userAgent,
      originalError,
    );
  }

  /**
   * 创建输入安全违规异常
   */
  static createInputSecurityViolationException(
    violationType: string,
    violationDetails: any,
    request?: any,
    originalError?: Error,
  ): InputSecurityViolationException {
    const context = request ? this.extractSecurityContext(request) : {};

    return new InputSecurityViolationException(
      violationType,
      violationDetails,
      context.requestPath,
      context.clientIp,
      context.userAgent,
      originalError,
    );
  }

  /**
   * 创建安全中间件异常
   */
  static createSecurityMiddlewareException(
    middlewareComponent: string,
    message: string,
    request?: any,
    originalError?: Error,
  ): SecurityMiddlewareException {
    const context = request ? this.extractSecurityContext(request) : {};

    return new SecurityMiddlewareException(
      middlewareComponent,
      message,
      context.requestPath,
      context.clientIp,
      context.userAgent,
      originalError,
    );
  }

  /**
   * 创建速率限制异常
   */
  static createRateLimitException(
    limit: number,
    current: number,
    remaining: number,
    resetTime: number,
    retryAfter: number,
    request?: any,
    appKey?: string,
    originalError?: Error,
  ): EnhancedRateLimitException {
    const context = request ? this.extractSecurityContext(request) : {};

    return new EnhancedRateLimitException(
      limit,
      current,
      remaining,
      resetTime,
      retryAfter,
      context.requestPath,
      context.clientIp,
      context.userAgent,
      appKey,
      originalError,
    );
  }
}

/**
 * 异常类型检查工具
 * 用于GlobalExceptionFilter中识别安全异常
 */
export function isSecurityException(
  exception: unknown,
): exception is SecurityException {
  return exception instanceof SecurityException;
}

/**
 * 导出通用异常类型别名
 */
export {
  NestPayloadTooLargeException as PayloadTooLargeException,
  NestUnsupportedMediaTypeException as UnsupportedMediaTypeException,
};

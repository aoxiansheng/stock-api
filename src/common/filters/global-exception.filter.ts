import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ValidationError } from "class-validator";
import { Request, Response } from "express";
import { MongoError } from "mongodb";

import { createLogger } from "@common/config/logger.config";
import {
  AUTH_ERROR_MESSAGES,
  HTTP_ERROR_MESSAGES,
} from "@common/constants/error-messages.constants";

import { HttpHeadersUtil } from "../utils/http-headers.util";

/**
 * 全局异常过滤器
 * 统一处理所有未捕获的异常，确保一致的错误响应格式
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = createLogger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let errorType: string;
    let details: any;

    // 处理不同类型的异常
    if (exception instanceof HttpException) {
      // HTTP异常（包括NestJS内置异常）
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
        errorType = exception.constructor.name;
      } else {
        const responseObj = exceptionResponse as any;
        const rawMessage =
          responseObj.message || responseObj.error || "HTTP异常";

        // 特殊处理验证错误 - 当消息是数组且状态码是400时
        if (status === HttpStatus.BAD_REQUEST && Array.isArray(rawMessage)) {
          // 对于测试，我们返回包含"验证失败"的消息，但保留详细信息到details
          message = "验证失败: " + rawMessage.join(", ");
          errorType = "ValidationError";
          // 提供简化的验证错误信息
          details = this.parseValidationErrors(rawMessage);
        } else {
          message = rawMessage;
          errorType = responseObj.error || exception.constructor.name;
          details = responseObj.details;
        }
      }

      // 特殊处理401 UnauthorizedException的消息
      if (status === HttpStatus.UNAUTHORIZED) {
        message = this.translateUnauthorizedMessage(message as string);
        errorType = "AuthenticationError";
      }
    } else if (this.isMongoError(exception)) {
      // MongoDB异常
      const mongoError = exception as any;
      if (mongoError.code === 11000) {
        status = HttpStatus.CONFLICT; // 409
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
      }
      message = this.getMongoErrorMessage(mongoError);
      errorType = "DatabaseError";

      // 记录数据库异常详情
      this.logger.error("数据库异常", {
        code: mongoError.code,
        message: mongoError.message,
        stack: mongoError.stack,
      });
    } else if (this.isJWTError(exception)) {
      // JWT异常
      status = HttpStatus.UNAUTHORIZED;
      message = this.getJWTErrorMessage(exception as any);
      errorType = "AuthenticationError";

      // 设置JWT错误详情
      const jwtError = exception as any;
      details = {
        tokenType: "JWT",
        errorName: jwtError.name,
        ...details,
      };
    } else if (this.isDatabaseConnectionError(exception)) {
      // 数据库连接错误
      status = HttpStatus.SERVICE_UNAVAILABLE; // 503
      message = "数据库服务暂时不可用，请稍后重试";
      errorType = "DatabaseConnectionError";
    } else if (this.isTimeoutError(exception)) {
      // 超时错误
      status = HttpStatus.REQUEST_TIMEOUT; // 408
      message = "请求超时，请稍后重试";
      errorType = "TimeoutError";
    } else if (this.isValidationError(exception)) {
      // 验证异常
      status = HttpStatus.BAD_REQUEST;
      message =
        Array.isArray(exception) && exception.length > 0
          ? exception
              .map((err) => Object.values(err.constraints || {}).join(", "))
              .join(", ")
          : "数据验证失败";
      errorType = "ValidationError";
      details = this.formatValidationErrors(exception);
    } else if (this.hasCustomStatusCode(exception)) {
      // 自定义状态码错误
      const customError = exception as any;
      status = customError.statusCode;
      message = customError.message || "业务处理失败";
      errorType = customError.name || "CustomError";
    } else if (exception instanceof Error) {
      // 检查是否是JSON解析错误
      if (
        exception.name === "SyntaxError" &&
        exception.message.includes("JSON")
      ) {
        status = HttpStatus.BAD_REQUEST;
        message = "JSON格式错误";
        errorType = "InvalidJSON";
        details = {
          originalMessage: exception.message,
          position: this.extractJsonErrorPosition(exception.message),
        };
      } else {
        // 普通Error异常
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message =
          process.env.NODE_ENV === "production"
            ? "服务器内部错误"
            : exception.message;
        errorType = "InternalServerError";

        // 记录未知异常
        this.logger.error("未知异常", {
          name: exception.name,
          message: exception.message,
          stack: exception.stack,
        });
      }
    } else {
      // 未知异常类型
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "服务器内部错误";
      errorType = "UnknownError";

      this.logger.error("未知异常类型", { exception });
    }

    // 记录异常信息（业务异常使用warn，系统异常使用error）
    const logLevel = status >= 500 ? "error" : "warn";
    if (request) {
      this.logger[logLevel](`${request.method} ${request.url} - ${status}`, {
        ip: request.ip,
        userAgent: HttpHeadersUtil.getUserAgent(request),
        userId: (request as any).user?.id,
        apiKeyId: (request as any).apiKey?.id,
        statusCode: status,
        error: errorType,
        message: message,
        timestamp: new Date().toISOString(),
      });
    } else {
      this.logger[logLevel](`Unknown request - ${status}`, {
        statusCode: status,
        error: errorType,
        message: message,
        timestamp: new Date().toISOString(),
      });
    }

    // 获取correlation ID和request ID
    const correlationId =
      request?.headers?.["x-correlation-id"] || (request as any)?.correlationId;
    const requestId =
      request?.headers?.["x-request-id"] || (request as any)?.requestId;

    // 确保错误响应也包含追踪头
    if (requestId && response) {
      try {
        response.setHeader("x-request-id", requestId);
      } catch {
        // 忽略设置头部失败的错误
      }
    }

    // 构造标准化的错误响应 - 与ResponseInterceptor保持一致的格式
    const errorResponse = {
      statusCode: status,
      message: this.translateMessage(message, errorType),
      data: null, // 与ResponseInterceptor保持一致，错误时data为null
      timestamp: new Date().toISOString(),
      error: {
        code: this.getErrorCode(errorType, status, exception),
        details: {
          type: errorType,
          ...(details &&
            (Array.isArray(details) ? { fields: details } : details)),
          ...(request?.url && { path: this.sanitizePath(request.url) }),
          ...(correlationId && { correlationId }),
          ...(requestId && { requestId }),
          // 为API Key错误添加额外信息
          ...(status === 401 &&
            request?.headers?.["x-app-key"] && {
              providedKey: request.headers["x-app-key"],
            }),
        },
      },
    };

    try {
      response.status(status).json(errorResponse);
    } catch (responseError) {
      // 如果响应写入失败，记录错误但不抛出异常
      this.logger.error("响应写入失败", {
        originalError: message,
        responseError: responseError.message,
        statusCode: status,
      });
    }
  }

  /**
   * 生成标准化的错误代码
   */
  private getErrorCode(
    errorType: string,
    status: number,
    exception: unknown,
  ): string {
    // JWT相关错误
    if (this.isJWTError(exception)) {
      const jwtError = exception as any;
      switch (jwtError.name) {
        case "JsonWebTokenError":
          return "INVALID_TOKEN";
        case "TokenExpiredError":
          return "TOKEN_EXPIRED";
        case "NotBeforeError":
          return "TOKEN_NOT_ACTIVE";
        default:
          return "AUTHENTICATION_FAILED";
      }
    }

    // HTTP状态码相关错误
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        if (errorType === "ValidationError") {
          return "VALIDATION_ERROR";
        }
        return "BAD_REQUEST";
      case HttpStatus.UNAUTHORIZED:
        // 根据错误消息内容判断具体的认证错误类型
        const exceptionMessage = (exception as any)?.message || "";
        if (
          exceptionMessage.includes("API") ||
          exceptionMessage.includes("凭证")
        ) {
          return "INVALID_API_KEY";
        }
        // 如果已经通过JWT错误检查到这里，说明不是JWT错误
        return "UNAUTHORIZED";
      case HttpStatus.FORBIDDEN:
        return "FORBIDDEN";
      case HttpStatus.NOT_FOUND:
        return "NOT_FOUND";
      case HttpStatus.CONFLICT:
        return "RESOURCE_CONFLICT";
      case HttpStatus.REQUEST_TIMEOUT:
        return "REQUEST_TIMEOUT";
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return "PAYLOAD_TOO_LARGE";
      case HttpStatus.TOO_MANY_REQUESTS:
        return "RATE_LIMIT_EXCEEDED";
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return "INTERNAL_SERVER_ERROR";
      case HttpStatus.SERVICE_UNAVAILABLE:
        return "SERVICE_UNAVAILABLE";
      case HttpStatus.GATEWAY_TIMEOUT:
        return "GATEWAY_TIMEOUT";
      default:
        return "UNKNOWN_ERROR";
    }
  }

  /**
   * 检查是否为MongoDB异常
   */
  private isMongoError(exception: unknown): exception is MongoError {
    if (!exception || typeof exception !== "object") {
      return false;
    }

    const error = exception as any;
    return (
      (exception instanceof Error &&
        (exception.name === "MongoError" ||
          exception.name === "MongoServerError")) ||
      error.name === "MongoError" ||
      error.name === "MongoServerError" ||
      (typeof error.code === "number" && error.code > 0)
    );
  }

  /**
   * 检查是否为JWT异常
   */
  private isJWTError(exception: unknown): boolean {
    if (!exception || typeof exception !== "object") {
      return false;
    }

    const error = exception as any;
    return (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    );
  }

  /**
   * 检查是否为数据库连接错误
   */
  private isDatabaseConnectionError(exception: unknown): boolean {
    if (!exception || typeof exception !== "object") {
      return false;
    }

    const error = exception as any;
    return (
      error.name === "DatabaseConnectionError" ||
      error.code === "ECONNREFUSED" ||
      error.code === "ENOTFOUND" ||
      (error.message && error.message.includes("connection"))
    );
  }

  /**
   * 检查是否为超时错误
   */
  private isTimeoutError(exception: unknown): boolean {
    if (!exception || typeof exception !== "object") {
      return false;
    }

    const error = exception as any;
    return (
      error.name === "TimeoutError" ||
      error.code === "ETIMEDOUT" ||
      (error.message && error.message.includes("timeout"))
    );
  }

  /**
   * 检查是否有自定义状态码
   */
  private hasCustomStatusCode(exception: unknown): boolean {
    if (!exception || typeof exception !== "object") {
      return false;
    }

    const error = exception as any;
    return (
      typeof error.statusCode === "number" &&
      error.statusCode >= 400 &&
      error.statusCode < 600
    );
  }

  /**
   * 检查是否为验证异常
   */
  private isValidationError(
    exception: unknown,
  ): exception is ValidationError[] {
    return (
      Array.isArray(exception) &&
      exception.length > 0 &&
      exception[0] instanceof ValidationError
    );
  }

  /**
   * 获取JWT异常消息
   */
  private getJWTErrorMessage(error: any): string {
    switch (error.name) {
      case "JsonWebTokenError":
        return AUTH_ERROR_MESSAGES.TOKEN_INVALID;
      case "TokenExpiredError":
        return AUTH_ERROR_MESSAGES.TOKEN_EXPIRED;
      case "NotBeforeError":
        return AUTH_ERROR_MESSAGES.TOKEN_NOT_ACTIVE;
      default:
        return AUTH_ERROR_MESSAGES.JWT_AUTH_FAILED;
    }
  }

  /**
   * 获取MongoDB异常消息
   */
  private getMongoErrorMessage(error: any): string {
    switch (error.code) {
      case 11000:
        return "数据已存在，无法重复创建";
      case 121:
        return "数据格式不符合要求";
      case 2:
        return "数据库查询条件错误";
      case 13:
        return "数据库权限不足";
      default:
        return process.env.NODE_ENV === "production"
          ? "数据库操作失败"
          : error.message;
    }
  }

  /**
   * 解析验证错误消息，提供更结构化的信息
   */
  private parseValidationErrors(messages: string[]): Array<{
    field: string;
    message: string;
    code?: string;
  }> {
    const parsedErrors: Array<{
      field: string;
      message: string;
      code?: string;
    }> = [];

    messages.forEach((msg) => {
      // 尝试解析字段名和消息
      if (msg.includes("不能为空")) {
        const field = this.extractFieldName(msg);
        parsedErrors.push({ field, message: msg, code: "REQUIRED" });
      } else if (msg.includes("不支持的数据类型")) {
        parsedErrors.push({
          field: "dataType",
          message: msg,
          code: "INVALID_TYPE",
        });
      } else if (msg.includes("必须是")) {
        const field = this.extractFieldName(msg);
        parsedErrors.push({ field, message: msg, code: "INVALID_FORMAT" });
      } else {
        // 默认字段错误
        parsedErrors.push({ field: "unknown", message: msg });
      }
    });

    return parsedErrors;
  }

  /**
   * 从错误消息中提取字段名
   */
  private extractFieldName(message: string): string {
    // 简单的字段名提取逻辑
    if (message.includes("股票代码")) return "symbols";
    if (message.includes("数据类型")) return "dataType";
    if (message.includes("提供商")) return "provider";
    return "unknown";
  }

  /**
   * 格式化验证错误
   */
  private formatValidationErrors(errors: ValidationError[]): Array<{
    field: string;
    code: string;
    message: string;
  }> {
    const details: Array<{ field: string; code: string; message: string }> = [];

    const processError = (error: ValidationError, parentField = "") => {
      const field = parentField
        ? `${parentField}.${error.property}`
        : error.property;

      if (error.constraints) {
        Object.entries(error.constraints).forEach(([code, message]) => {
          details.push({
            field,
            code,
            message: this.translateValidationMessage(message),
          });
        });
      }

      if (error.children && error.children.length > 0) {
        error.children.forEach((child) => processError(child, field));
      }
    };

    errors.forEach((error) => processError(error));
    return details;
  }

  /**
   * 翻译验证错误消息为中文
   */
  private translateValidationMessage(message: string): string {
    const translations: Record<string, string> = {
      "must be a string": "必须是字符串",
      "must be a number": "必须是数字",
      "must be a boolean": "必须是布尔值",
      "must be an array": "必须是数组",
      "must be a date": "必须是日期",
      "should not be empty": "不能为空",
      "must be defined": "必须定义",
      "must be an email": "必须是有效的邮箱地址",
      "must be longer than": "长度不能少于",
      "must be shorter than": "长度不能超过",
      "must be a valid": "必须是有效的",
    };

    let translated = message;
    Object.entries(translations).forEach(([en, zh]) => {
      translated = translated.replace(new RegExp(en, "gi"), zh);
    });

    return translated;
  }

  /**
   * 从JSON错误消息中提取错误位置
   */
  private extractJsonErrorPosition(errorMessage: string): number | null {
    const positionMatch = errorMessage.match(/position\s+(\d+)/i);
    return positionMatch ? parseInt(positionMatch[1], 10) : null;
  }

  /**
   * 翻译401未授权错误消息
   */
  private translateUnauthorizedMessage(message: string): string {
    if (!message) return AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS;

    // JWT相关错误消息翻译 - 统一为用户友好消息
    if (message.includes("缺少认证token")) {
      return AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS;
    }
    if (message.includes("JWT认证失败")) {
      return AUTH_ERROR_MESSAGES.JWT_AUTH_FAILED;
    }
    if (message.includes("无效的token")) {
      return AUTH_ERROR_MESSAGES.TOKEN_INVALID;
    }
    if (message.includes("token已过期")) {
      return AUTH_ERROR_MESSAGES.TOKEN_EXPIRED;
    }
    if (message.includes("token尚未生效")) {
      return AUTH_ERROR_MESSAGES.TOKEN_NOT_ACTIVE;
    }

    // API Key相关错误消息翻译
    if (message.includes("缺少API凭证")) {
      return AUTH_ERROR_MESSAGES.API_CREDENTIALS_MISSING;
    }
    if (message.includes("API凭证无效") || message.includes("无效的API凭证")) {
      return AUTH_ERROR_MESSAGES.API_CREDENTIALS_INVALID;
    }
    if (message.includes("API凭证已过期")) {
      return AUTH_ERROR_MESSAGES.API_CREDENTIALS_EXPIRED;
    }

    // 用户登录相关错误消息 - 保持原始消息
    if (message.includes("用户名或密码错误")) {
      return AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
    }

    // 默认返回统一的未授权消息
    return AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS;
  }

  /**
   * 翻译通用错误消息为中文
   */
  private translateMessage(
    message: string | string[],
    errorType?: string,
  ): string | string[] {
    if (Array.isArray(message)) {
      // 对于验证错误，可以选择返回统一消息或详细消息列表
      if (errorType === "ValidationError" && message.length > 0) {
        // 返回详细的验证错误列表
        return message.map((msg) => this.translateSingleMessage(msg));
      }
      return message.map((msg) => this.translateSingleMessage(msg));
    }
    return this.translateSingleMessage(message);
  }

  private translateSingleMessage(message: string): string {
    const translations: Record<string, string> = {
      "Bad Request": HTTP_ERROR_MESSAGES.BAD_REQUEST,
      Unauthorized: HTTP_ERROR_MESSAGES.HTTP_UNAUTHORIZED,
      Forbidden: HTTP_ERROR_MESSAGES.FORBIDDEN,
      "Not Found": HTTP_ERROR_MESSAGES.NOT_FOUND,
      "Method Not Allowed": HTTP_ERROR_MESSAGES.METHOD_NOT_ALLOWED,
      "Internal Server Error": HTTP_ERROR_MESSAGES.HTTP_INTERNAL_SERVER_ERROR,
      "Service Unavailable": HTTP_ERROR_MESSAGES.HTTP_SERVICE_UNAVAILABLE,
      "Gateway Timeout": HTTP_ERROR_MESSAGES.HTTP_GATEWAY_TIMEOUT,
      "Too Many Requests": HTTP_ERROR_MESSAGES.HTTP_TOO_MANY_REQUESTS,
    };

    // 处理路由不存在的错误消息
    if (
      message.startsWith("Cannot GET") ||
      message.startsWith("Cannot POST") ||
      message.startsWith("Cannot PUT") ||
      message.startsWith("Cannot DELETE") ||
      message.startsWith("Cannot PATCH")
    ) {
      return "请求的接口不存在";
    }

    return translations[message] || message;
  }

  /**
   * 过滤路径中的敏感信息
   * 防止在错误响应中泄露潜在的攻击载荷
   */
  private sanitizePath(path: string): string {
    if (!path) return path;

    // 定义需要过滤的敏感字符串模式
    const sensitivePatterns = [
      // XSS攻击模式
      /<script[^>]*>/gi,
      /<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload/gi,
      /onerror/gi,
      /onclick/gi,

      // SQL注入模式
      /union\s+select/gi,
      /drop\s+table/gi,
      /insert\s+into/gi,
      /delete\s+from/gi,

      // LDAP注入和其他注入
      /jndi:/gi,
      /ldap:/gi,

      // 路径遍历
      /\.\.\//g,
      /\.\.\\/g,

      // 命令注入
      /;\s*cat\s/gi,
      /;\s*ls\s/gi,
      /;\s*rm\s/gi,
      /\|\s*cat\s/gi,

      // 其他敏感内容
      /passwd/gi,
      /etc\/passwd/gi,
      /proc\/self/gi,
    ];

    let sanitizedPath = path;

    // 应用所有过滤模式
    sensitivePatterns.forEach((pattern) => {
      sanitizedPath = sanitizedPath.replace(pattern, "[FILTERED]");
    });

    // 如果路径过长，截断并添加提示
    if (sanitizedPath.length > 200) {
      sanitizedPath = sanitizedPath.substring(0, 200) + "[TRUNCATED]";
    }

    return sanitizedPath;
  }
}

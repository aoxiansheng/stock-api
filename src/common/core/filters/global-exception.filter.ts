import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ValidationError } from "class-validator";
import type { Request, Response } from "express";
import { MongoError } from "mongodb";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { createLogger } from "@common/logging/index";
import { isCacheException } from "../../../cache/exceptions";
import { SYSTEM_STATUS_EVENTS } from "../../../monitoring/contracts/events/system-status.events";
import { CONSTANTS } from "@common/constants";

// Extract error messages from semantic layer
const ERROR_MESSAGES = CONSTANTS.SEMANTIC.ERROR_MESSAGES;
const AUTH_ERROR_MESSAGES = CONSTANTS.SEMANTIC.AUTH_ERROR_MESSAGES;
const HTTP_ERROR_MESSAGES = CONSTANTS.SEMANTIC.HTTP_ERROR_MESSAGES;
const DB_ERROR_MESSAGES = CONSTANTS.SEMANTIC.DB_ERROR_MESSAGES;
const VALIDATION_MESSAGES = CONSTANTS.SEMANTIC.VALIDATION_MESSAGES;
const VALIDATION_TRANSLATIONS = CONSTANTS.SEMANTIC.VALIDATION_TRANSLATIONS;
const SYSTEM_ERROR_MESSAGES = CONSTANTS.SEMANTIC.SYSTEM_ERROR_MESSAGES;
const BUSINESS_ERROR_MESSAGES = CONSTANTS.SEMANTIC.BUSINESS_ERROR_MESSAGES;

import { HttpHeadersUtil } from "../../utils/http-headers.util";

/**
 * 全局异常过滤器
 * 统一处理所有未捕获的异常，确保一致的错误响应格式
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = createLogger(GlobalExceptionFilter.name);

  // 预编译的敏感内容过滤模式，避免每次调用时重复编译
  private static readonly SENSITIVE_PATTERNS = [
    // XSS攻击模式
    /<script[^>]*>.*?<\/script>/gi,
    /<script[^>]*>/gi,
    /<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi, // 匹配所有事件处理程序

    // SQL注入模式
    /union\s+select/gi,
    /drop\s+table/gi,
    /insert\s+into/gi,
    /delete\s+from/gi,
    /select\s+.*?\s+from/gi,

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

  constructor(private readonly eventBus: EventEmitter2) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let errorType: string;
    let details: any;

    // ======== 第一部分：异常类型识别和错误信息提取 ========
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
          responseObj.message ||
          responseObj.error ||
          HTTP_ERROR_MESSAGES.DEFAULT_ERROR;

        // 特殊处理验证错误 - 当消息是数组且状态码是400时
        if (status === HttpStatus.BAD_REQUEST && Array.isArray(rawMessage)) {
          // 对于测试，我们返回包含"验证失败"的消息，但保留详细信息到details
          message =
            VALIDATION_MESSAGES.VALIDATION_PREFIX + rawMessage.join(", ");
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
      // 特殊处理403 ForbiddenException的消息
      else if (status === HttpStatus.FORBIDDEN) {
        message = HTTP_ERROR_MESSAGES.FORBIDDEN;
        errorType = "ForbiddenException";
      }
      // 特殊处理400 BadRequestException的消息
      else if (status === HttpStatus.BAD_REQUEST) {
        // 检查是否为标准HTTP错误消息
        const standardMessage = this.translateSingleMessage(message as string);
        if (standardMessage !== message) {
          message = standardMessage;
        }
      }
    } else if (this.isValidationError(exception)) {
      // 验证异常 - 确保设置正确的状态码
      status = HttpStatus.BAD_REQUEST; // 设置为400
      message =
        Array.isArray(exception) && exception.length > 0
          ? exception
              .map((err) => Object.values(err.constraints || {}).join(", "))
              .join(", ")
          : VALIDATION_MESSAGES.VALIDATION_FAILED;
      errorType = "ValidationError";
      details = this.formatValidationErrors(exception);
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
    } else if (isCacheException(exception)) {
      // 🔧 简化: Cache异常处理 - 使用标准HttpException处理逻辑
      const cacheError = exception as HttpException;
      status = cacheError.getStatus();
      message = cacheError.message;
      errorType = "CacheError";

      // 记录Cache异常详情
      this.logger.warn("缓存异常", {
        type: exception.constructor.name,
        message: cacheError.message,
        status,
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
      message = SYSTEM_ERROR_MESSAGES.DB_UNAVAILABLE;
      errorType = "DatabaseConnectionError";
    } else if (this.isTimeoutError(exception)) {
      // 超时错误
      status = HttpStatus.REQUEST_TIMEOUT; // 408
      message = SYSTEM_ERROR_MESSAGES.REQUEST_TIMEOUT;
      errorType = "TimeoutError";
    } else if (this.hasCustomStatusCode(exception)) {
      // 自定义状态码错误
      const customError = exception as any;
      status = customError.statusCode;
      message =
        customError.message ||
        BUSINESS_ERROR_MESSAGES.OPERATION_DEFAULT_FAILURE;
      errorType = customError.name || "CustomError";
    } else if (exception instanceof Error) {
      // 检查是否是JSON解析错误
      if (
        exception.name === "SyntaxError" &&
        exception.message.includes("JSON")
      ) {
        status = HttpStatus.BAD_REQUEST;
        message = SYSTEM_ERROR_MESSAGES.INVALID_JSON;
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
            ? SYSTEM_ERROR_MESSAGES.INTERNAL_SERVER_ERROR
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
      message = SYSTEM_ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
      errorType = "UnknownError";

      this.logger.error("未知异常类型", { exception });
    }

    // ======== 第二部分：日志记录和追踪处理 ========
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

    // ======== 第三部分：构造错误响应和事件发送 ========
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

    // ✅ 发送异常监控事件
    setImmediate(() => {
      this.eventBus.emit(SYSTEM_STATUS_EVENTS.METRIC_COLLECTED, {
        timestamp: new Date(),
        source: "global_exception_filter",
        metricType: "error",
        metricName: "http_exception",
        metricValue: 1,
        tags: {
          error_type: errorType,
          status_code: status,
          method: request?.method,
          url: request?.url ? this.sanitizePath(request.url) : "unknown",
        },
      });
    });

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
    // 🔧 简化: Cache异常相关错误码
    if (isCacheException(exception)) {
      switch ((exception as any).constructor.name) {
        case "CacheConnectionException":
          return "CACHE_CONNECTION_ERROR";
        case "CacheSerializationException":
          return "CACHE_SERIALIZATION_ERROR";
        default:
          return "CACHE_ERROR";
      }
    }

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
      case HttpStatus.METHOD_NOT_ALLOWED:
        return "METHOD_NOT_ALLOWED";
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
    // 检查是否为数组
    if (!Array.isArray(exception)) {
      return false;
    }

    // 如果数组为空，不是有效的ValidationError数组
    if (exception.length === 0) {
      return false;
    }

    // 检查第一个元素是否具有ValidationError的特征
    const firstItem = exception[0];

    // 检查是否有典型的ValidationError属性
    const hasValidationErrorProps =
      firstItem &&
      typeof firstItem === "object" &&
      // 检查常见的ValidationError属性
      ("property" in firstItem ||
        "constraints" in firstItem ||
        ("children" in firstItem &&
          Array.isArray((firstItem as any).children)));

    // 检查是否为ValidationError实例或具有ValidationError特征的对象
    return hasValidationErrorProps || firstItem instanceof ValidationError;
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
        return DB_ERROR_MESSAGES.DUPLICATE_KEY;
      case 121:
        return DB_ERROR_MESSAGES.VALIDATION_FAILED;
      case 2:
        return DB_ERROR_MESSAGES.BAD_QUERY;
      case 13:
        return DB_ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS;
      default:
        return process.env.NODE_ENV === "production"
          ? DB_ERROR_MESSAGES.OPERATION_FAILED
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
      if (msg.includes(VALIDATION_MESSAGES.IS_NOT_EMPTY)) {
        const field = this.extractFieldName(msg);
        parsedErrors.push({
          field,
          message: VALIDATION_MESSAGES.IS_NOT_EMPTY,
          code: "REQUIRED",
        });
      } else if (msg.includes(VALIDATION_MESSAGES.UNSUPPORTED_DATA_TYPE)) {
        parsedErrors.push({
          field: "dataTypeRelated",
          message: `${VALIDATION_MESSAGES.DATA_TYPE_PREFIX}${VALIDATION_MESSAGES.UNSUPPORTED_DATA_TYPE}`,
          code: "INVALID_TYPE",
        });
      } else if (msg.includes(VALIDATION_MESSAGES.MUST_BE)) {
        const field = this.extractFieldName(msg);
        parsedErrors.push({ field, message: msg, code: "INVALID_FORMAT" });
      } else {
        // 默认字段错误
        parsedErrors.push({
          field: VALIDATION_MESSAGES.UNKNOWN_FIELD,
          message: msg,
        });
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
    if (message.includes("数据类型")) return "dataTypeRelated";
    if (message.includes("提供商")) return "provider";
    return VALIDATION_MESSAGES.UNKNOWN_FIELD;
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
          // 去掉字段名前缀，使消息格式与测试期望一致
          const cleanMessage = message.replace(`${error.property} `, "");
          details.push({
            field,
            code,
            message: this.translateValidationMessage(cleanMessage),
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
    const translations: Record<string, string> = VALIDATION_TRANSLATIONS;

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

    // 精确匹配消息
    const exactMatches: Record<string, string> = {
      Unauthorized: AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
      缺少认证token: AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS,
      JWT认证失败: AUTH_ERROR_MESSAGES.JWT_AUTH_FAILED,
      无效的token: AUTH_ERROR_MESSAGES.TOKEN_INVALID,
      token已过期: AUTH_ERROR_MESSAGES.TOKEN_EXPIRED,
      token尚未生效: AUTH_ERROR_MESSAGES.TOKEN_NOT_ACTIVE,
      缺少API凭证: AUTH_ERROR_MESSAGES.API_CREDENTIALS_MISSING,
      API凭证无效: AUTH_ERROR_MESSAGES.API_CREDENTIALS_INVALID,
      无效的API凭证: AUTH_ERROR_MESSAGES.API_CREDENTIALS_INVALID,
      API凭证已过期: AUTH_ERROR_MESSAGES.API_CREDENTIALS_EXPIRED,
      用户名或密码错误: AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS,
    };

    // 检查精确匹配
    if (exactMatches[message]) {
      return exactMatches[message];
    }

    // 部分匹配检查
    if (
      message.includes("缺少认证token") ||
      message.includes("missing token")
    ) {
      return AUTH_ERROR_MESSAGES.UNAUTHORIZED_ACCESS;
    }
    if (
      message.includes("JWT认证失败") ||
      message.includes("JWT authentication failed")
    ) {
      return AUTH_ERROR_MESSAGES.JWT_AUTH_FAILED;
    }
    if (message.includes("无效的token") || message.includes("invalid token")) {
      return AUTH_ERROR_MESSAGES.TOKEN_INVALID;
    }
    if (message.includes("token已过期") || message.includes("token expired")) {
      return AUTH_ERROR_MESSAGES.TOKEN_EXPIRED;
    }
    if (
      message.includes("token尚未生效") ||
      message.includes("token not active")
    ) {
      return AUTH_ERROR_MESSAGES.TOKEN_NOT_ACTIVE;
    }

    // API Key相关错误消息翻译
    if (
      message.includes("缺少API凭证") ||
      message.includes("missing API credentials")
    ) {
      return AUTH_ERROR_MESSAGES.API_CREDENTIALS_MISSING;
    }
    if (
      message.includes("API凭证无效") ||
      message.includes("invalid API credentials")
    ) {
      return AUTH_ERROR_MESSAGES.API_CREDENTIALS_INVALID;
    }
    if (
      message.includes("API凭证已过期") ||
      message.includes("API credentials expired")
    ) {
      return AUTH_ERROR_MESSAGES.API_CREDENTIALS_EXPIRED;
    }

    // 用户登录相关错误消息 - 保持原始消息
    if (
      message.includes("用户名或密码错误") ||
      message.includes("invalid credentials")
    ) {
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
    // 处理路由不存在的错误消息
    if (
      message.startsWith("Cannot GET") ||
      message.startsWith("Cannot POST") ||
      message.startsWith("Cannot PUT") ||
      message.startsWith("Cannot DELETE") ||
      message.startsWith("Cannot PATCH")
    ) {
      return HTTP_ERROR_MESSAGES.ROUTE_NOT_FOUND;
    }

    // 精确匹配的HTTP错误消息映射
    const translations: Record<string, string> = {
      "Bad Request": HTTP_ERROR_MESSAGES.BAD_REQUEST,
      Unauthorized: HTTP_ERROR_MESSAGES.UNAUTHORIZED,
      Forbidden: HTTP_ERROR_MESSAGES.FORBIDDEN,
      "Not Found": HTTP_ERROR_MESSAGES.NOT_FOUND,
      "Method Not Allowed": HTTP_ERROR_MESSAGES.METHOD_NOT_ALLOWED,
      "Internal Server Error": HTTP_ERROR_MESSAGES.HTTP_INTERNAL_SERVER_ERROR,
      "Service Unavailable": HTTP_ERROR_MESSAGES.HTTP_SERVICE_UNAVAILABLE,
      "Gateway Timeout": HTTP_ERROR_MESSAGES.HTTP_GATEWAY_TIMEOUT,
      "Too Many Requests": HTTP_ERROR_MESSAGES.HTTP_TOO_MANY_REQUESTS,
      // 添加API凭证相关消息的精确匹配
      缺少API凭证: AUTH_ERROR_MESSAGES.API_CREDENTIALS_MISSING,
      API凭证缺失: AUTH_ERROR_MESSAGES.API_CREDENTIALS_MISSING,
      API凭证无效: AUTH_ERROR_MESSAGES.API_CREDENTIALS_INVALID,
      API凭证已过期: AUTH_ERROR_MESSAGES.API_CREDENTIALS_EXPIRED,
    };

    // 先尝试精确匹配
    if (translations[message]) {
      return translations[message];
    }

    // 如果没有精确匹配，返回原始消息
    return message;
  }

  /**
   * 过滤路径中的敏感信息
   * 防止在错误响应中泄露潜在的攻击载荷
   */
  private sanitizePath(path: string): string {
    if (!path) return path;

    // 使用预编译的正则表达式，显著提升性能
    let sanitizedPath = path;

    // 应用所有预编译的过滤模式
    for (const pattern of GlobalExceptionFilter.SENSITIVE_PATTERNS) {
      sanitizedPath = sanitizedPath.replace(pattern, "[FILTERED]");
    }

    // 如果路径过长，截断并添加提示
    if (sanitizedPath.length > 200) {
      sanitizedPath = sanitizedPath.substring(0, 200) + "[TRUNCATED]";
    }

    return sanitizedPath;
  }
}

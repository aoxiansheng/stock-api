import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

import { createLogger } from "@common/logging/index";
import { HttpHeadersUtil } from "@common/utils/http-headers.util";
import { CONSTANTS } from "@common/constants";

/**
 * 频率限制异常过滤器
 * 专门处理429 Too Many Requests异常
 */
@Catch(HttpException)
export class RateLimitExceptionFilter implements ExceptionFilter {
  private readonly logger = createLogger(RateLimitExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // 只处理429错误
    if (status !== HttpStatus.TOO_MANY_REQUESTS) {
      throw exception;
    }

    const exceptionResponse = exception.getResponse() as any;

    // 记录频率限制日志
    this.logger.warn(`频率限制触发: ${request.method} ${request.url}`, {
      ip: request.ip,
      userAgent: HttpHeadersUtil.getUserAgent(request),
      appKey: HttpHeadersUtil.getHeader(request, "x-app-key"),
      timestamp: new Date().toISOString(),
      details: exceptionResponse.details,
    });

    // 使用标准化的错误响应格式（与GlobalExceptionFilter保持一致）
    const correlationId = request?.headers?.["x-correlation-id"] || (request as any)?.correlationId;
    const requestId = request?.headers?.["x-request-id"] || (request as any)?.requestId;
    
    const errorResponse = {
      statusCode: status,
      message: CONSTANTS.SEMANTIC.HTTP_ERROR_MESSAGES.HTTP_TOO_MANY_REQUESTS,
      data: null, // 与ResponseInterceptor保持一致，错误时data为null
      timestamp: new Date().toISOString(),
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        details: {
          type: "RateLimitError",
          path: request.url,
          limit: exceptionResponse.details?.limit,
          current: exceptionResponse.details?.current,
          remaining: exceptionResponse.details?.remaining,
          resetTime: exceptionResponse.details?.resetTime,
          retryAfter: exceptionResponse.details?.retryAfter,
          suggestion: "请降低请求频率或联系管理员升级您的API配额",
          ...(correlationId && { correlationId }),
          ...(requestId && { requestId }),
        },
      },
    };

    // 设置额外的响应头和标准化追踪头
    if (exceptionResponse.details?.retryAfter) {
      response.setHeader("Retry-After", exceptionResponse.details.retryAfter);
    }
    
    // 确保错误响应也包含追踪头（与GlobalExceptionFilter保持一致）
    if (requestId && response) {
      try {
        response.setHeader("x-request-id", requestId);
      } catch {
        // 忽略设置头部失败的错误
      }
    }

    response.status(status).json(errorResponse);
  }
}

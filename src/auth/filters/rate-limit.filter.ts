import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

import { createLogger } from "@app/config/logger.config";
import { HttpHeadersUtil } from "@common/utils/http-headers.util";

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

    // 构造标准化的错误响应
    const errorResponse = {
      statusCode: status,
      message: exceptionResponse.message || "请求频率超出限制",
      error: "Too Many Requests",
      timestamp: new Date().toISOString(),
      path: request.url,
      details: {
        limit: exceptionResponse.details?.limit,
        current: exceptionResponse.details?.current,
        remaining: exceptionResponse.details?.remaining,
        resetTime: exceptionResponse.details?.resetTime,
        retryAfter: exceptionResponse.details?.retryAfter,
        suggestion: "请降低请求频率或联系管理员升级您的API配额",
      },
    };

    // 设置额外的响应头
    if (exceptionResponse.details?.retryAfter) {
      response.setHeader("Retry-After", exceptionResponse.details.retryAfter);
    }

    response.status(status).json(errorResponse);
  }
}

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { createLogger } from "@common/logging/index";
import { HttpHeadersUtil } from "@common/utils/http-headers.util";
import { SecurityExceptionFactory, EnhancedRateLimitException, isSecurityException } from "../exceptions/security.exceptions";

/**
 * 频率限制异常过滤器 - 异常增强模式
 * 
 * 重构策略：
 * - 不再直接构造响应，而是抛出增强的异常
 * - 让GlobalExceptionFilter统一处理所有异常，确保响应格式一致
 * - 保留特殊的速率限制日志记录和Retry-After头设置逻辑
 * - 向后兼容：如果接收到已经是增强异常，直接重新抛出
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

    // 如果已经是增强的安全异常，直接重新抛出让GlobalExceptionFilter处理
    if (isSecurityException(exception)) {
      // 仍然设置Retry-After头，这是速率限制特有的逻辑
      this.setRetryAfterHeader(exception as EnhancedRateLimitException, response);
      throw exception;
    }

    const exceptionResponse = exception.getResponse() as any;

    // 记录频率限制日志（保留原有的详细日志逻辑）
    this.logger.warn(`频率限制触发: ${request.method} ${request.url}`, {
      ip: request.ip,
      userAgent: HttpHeadersUtil.getUserAgent(request),
      appKey: HttpHeadersUtil.getHeader(request, "x-app-key"),
      timestamp: new Date().toISOString(),
      details: exceptionResponse?.details || null,
    });

    // 创建增强的速率限制异常
    const details = exceptionResponse?.details || {};
    const enhancedException = SecurityExceptionFactory.createRateLimitException(
      details.limit || 0,
      details.current || 0, 
      details.remaining || 0,
      details.resetTime || 0,
      details.retryAfter || 0,
      request,
      HttpHeadersUtil.getHeader(request, "x-app-key"),
      exception
    );

    // 设置Retry-After头（速率限制特有的逻辑）
    this.setRetryAfterHeader(enhancedException, response);

    // 抛出增强异常，让GlobalExceptionFilter统一处理响应格式
    throw enhancedException;
  }

  /**
   * 设置Retry-After响应头
   * 这是速率限制特有的逻辑，需要在异常抛出前设置
   */
  private setRetryAfterHeader(exception: EnhancedRateLimitException, response: Response): void {
    try {
      if (exception.retryAfter > 0) {
        response.setHeader("Retry-After", exception.retryAfter);
      }
    } catch (error) {
      // 忽略设置头部失败的错误，不影响主要流程
      this.logger.debug("设置Retry-After头失败", { error: error.message });
    }
  }
}

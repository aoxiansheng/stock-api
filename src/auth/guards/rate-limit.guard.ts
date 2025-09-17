import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Response } from "express";
import { AuthenticatedRequest } from "../interfaces/authenticated-request.interface";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

import { createLogger } from "@common/logging/index";
import { CONSTANTS } from "@common/constants";
import { RateLimitStrategy } from "@auth/constants";

import { HttpHeadersUtil } from "@common/utils/http-headers.util";

import { AuthRateLimitConfig } from "../interfaces/rate-limit.interface";
import { ApiKeyDocument } from "../schemas/apikey.schema";
import { RateLimitService } from "../services/infrastructure/rate-limit.service";

/**
 * 频率限制配置元数据键
 */
export const RATE_LIMIT_KEY = "rate_limit";

/**
 * 频率限制装饰器
 */
export const RateLimit = (config: AuthRateLimitConfig = {}) =>
  Reflector.createDecorator<AuthRateLimitConfig>({
    transform: (opts) => ({ ...opts, ...config }),
  });

/**
 * API Key频率限制守卫
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = createLogger(RateLimitGuard.name);

  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly reflector: Reflector,
  ) {
    this.logger.debug("RateLimitGuard 已实例化");
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否为公开端点，如果是则跳过频率限制检查
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const response = context.switchToHttp().getResponse<Response>();

    // 获取API Key对象（由API Key认证守卫设置）
    const apiKey = request.user;

    // 如果没有API Key，跳过频率限制检查
    if (!apiKey || !apiKey.rateLimit) {
      return true;
    }

    this.logger.debug("执行API Key频率限制检查", {
      appKey: apiKey.appKey,
      endpoint: request.url,
    });

    // 获取控制器和方法级别的频率限制配置
    const config =
      this.reflector.getAllAndOverride<AuthRateLimitConfig>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || {};

    try {
      // 执行频率限制检查
      const result = await this.rateLimitService.checkRateLimit(
        apiKey,
        config.strategy || RateLimitStrategy.SLIDING_WINDOW,
      );

      // 设置响应头
      this.setRateLimitHeaders(response, result);

      if (!result.allowed) {
        this.logger.warn(
          `API Key ${apiKey.appKey} 频率限制超出: ${result.current}/${result.limit}`,
          {
            appKey: apiKey.appKey,
            limit: result.limit,
            current: result.current,
            window: apiKey.rateLimit.window,
            ip: request.ip,
            userAgent: HttpHeadersUtil.getUserAgent(request),
            endpoint: request.url,
          },
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: "API Key请求频率超出限制",
            error: "Too Many Requests",
            details: {
              type: "API_KEY_RATE_LIMIT",
              limit: result.limit,
              current: result.current,
              remaining: result.remaining,
              resetTime: result.resetTime,
              retryAfter: result.retryAfter,
              window: apiKey.rateLimit.window,
              apiKey: apiKey.appKey,
            },
            timestamp: new Date().toISOString(),
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`频率限制检查失败: ${error.message}`, error.stack, {
        appKey: apiKey.appKey,
        ip: request.ip,
      });

      // 频率限制服务出错时，允许请求通过以保证服务可用性
      return true;
    }
  }

  /**
   * 设置频率限制相关的响应头
   */
  private setRateLimitHeaders(response: Response, result: any): void {
    // 使用API Key专用的响应头名称，避免与IP限速冲突
    response.setHeader("X-API-RateLimit-Limit", result.limit);
    response.setHeader("X-API-RateLimit-Remaining", result.remaining);
    response.setHeader(
      "X-API-RateLimit-Reset",
      Math.ceil(result.resetTime / 1000),
    );

    if (result.retryAfter) {
      response.setHeader("X-API-Retry-After", result.retryAfter);
    }

    // 添加限制类型标识
    response.setHeader("X-API-RateLimit-Type", "API_KEY");
  }
}

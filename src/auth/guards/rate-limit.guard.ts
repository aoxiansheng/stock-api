import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";

import { createLogger } from "@common/config/logger.config";
import { RATE_LIMIT_CONFIG } from "@common/constants/rate-limit.constants";
import { HttpHeadersUtil } from "@common/utils/http-headers.util";

import { RateLimitConfig } from "../interfaces/rate-limit.interface";
import { ApiKeyDocument } from "../schemas/apikey.schema";
import { RateLimitService } from "../services/rate-limit.service";

/**
 * 频率限制配置元数据键
 */
export const RATE_LIMIT_KEY = "rate_limit";

/**
 * 频率限制装饰器
 */
export const RateLimit = (config: RateLimitConfig = {}) =>
  Reflector.createDecorator<RateLimitConfig>({
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
    this.logger.debug("RateLimitGuard 构造函数被调用");
    this.logger.log("RateLimitGuard 已实例化");
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    this.logger.debug("RateLimitGuard.canActivate() 被调用");
    this.logger.log("频率限制守卫被调用");

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // 获取API Key对象（由API Key认证守卫设置）
    const apiKey = request.user as ApiKeyDocument;

    this.logger.debug(`API Key 对象:`, {
      appKey: apiKey?.appKey,
      hasRateLimit: !!apiKey?.rateLimit,
      rateLimit: apiKey?.rateLimit,
    });

    this.logger.debug(
      `频率限制守卫 - API Key: ${apiKey?.appKey || "null"}, 有率限制配置: ${!!apiKey?.rateLimit}`,
    );

    // 如果没有API Key，跳过频率限制检查
    if (!apiKey || !apiKey.rateLimit) {
      this.logger.debug("跳过频率限制检查 - 没有API Key或率限制配置");
      return true;
    }

    // 获取控制器和方法级别的频率限制配置
    const config =
      this.reflector.getAllAndOverride<RateLimitConfig>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || {};

    try {
      this.logger.debug(
        `开始执行频率限制检查 - 策略: ${config.strategy || RATE_LIMIT_CONFIG.API_KEY.DEFAULT_STRATEGY}`,
      );

      // 执行频率限制检查
      const result = await this.rateLimitService.checkRateLimit(
        apiKey,
        config.strategy || RATE_LIMIT_CONFIG.API_KEY.DEFAULT_STRATEGY,
      );

      this.logger.debug(`频率限制检查结果: ${JSON.stringify(result)}`);

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

      // 记录成功的请求
      this.logger.debug(
        `API Key ${apiKey.appKey} 请求通过频率限制检查: ${result.current}/${result.limit}`,
      );

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

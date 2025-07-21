import { SetMetadata, UseGuards, applyDecorators } from "@nestjs/common";

import { RateLimitStrategy } from "../../common/constants/rate-limit.constants";
import { ApiKeyAuthGuard } from "../guards/apikey-auth.guard";
import { RateLimitGuard, RATE_LIMIT_KEY } from "../guards/rate-limit.guard";
import { RateLimitConfig } from "../interfaces/rate-limit.interface";

/**
 * API Key认证 + 频率限制装饰器
 * 组合了API Key认证和频率限制功能
 *
 * @param config 频率限制配置
 */
export function ApiKeyAuth(config: RateLimitConfig = {}) {
  return applyDecorators(
    UseGuards(ApiKeyAuthGuard, RateLimitGuard),
    SetMetadata(RATE_LIMIT_KEY, config),
  );
}

/**
 * 频率限制装饰器（独立使用）
 *
 * @param strategy 频率限制策略
 */
export function RateLimit(
  strategy: RateLimitStrategy = RateLimitStrategy.FIXED_WINDOW,
) {
  return applyDecorators(
    UseGuards(RateLimitGuard),
    SetMetadata(RATE_LIMIT_KEY, { strategy }),
  );
}

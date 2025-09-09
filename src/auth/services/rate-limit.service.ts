import { InjectRedis } from "@nestjs-modules/ioredis";
import { Injectable, BadRequestException } from "@nestjs/common";
import { Redis } from "ioredis";

import { createLogger } from "@app/config/logger.config";

import { securityConfig } from "@auth/config/security.config";
import {
  RATE_LIMIT_OPERATIONS,
  RATE_LIMIT_MESSAGES,
  RATE_LIMIT_TIME_MULTIPLIERS,
  RateLimitTemplateUtil,
  RateLimitStrategy,
} from "../../common/constants/domain/rate-limit-domain.constants";
import { RateLimitLuaScriptsService } from "../../common/scripts/lua/rate-limit-lua-scripts.service";
import { RateLimitResult } from "../interfaces/rate-limit.interface";
import { ApiKey } from "../schemas/apikey.schema";

// 🎯 复用 common 模块的日志配置

// 🎯 引入集中化配置

// 🎯 使用 common 模块的接口和枚举
// 🎯 引入频率限制服务常量

/**
 * API Key频率限制服务
 */
@Injectable()
export class RateLimitService {
  private readonly logger = createLogger(RateLimitService.name);
  // 🎯 使用集中化配置
  private readonly config = securityConfig.rateLimit;
  private readonly luaScriptsService = new RateLimitLuaScriptsService();

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * 检查API Key的频率限制
   * @param apiKey API Key对象
   * @param strategy 限制策略
   * @returns 频率限制结果
   */
  async checkRateLimit(
    apiKey: ApiKey,
    strategy: RateLimitStrategy = RateLimitStrategy.FIXED_WINDOW,
  ): Promise<RateLimitResult> {
    const operation = RATE_LIMIT_OPERATIONS.CHECK_RATE_LIMIT;
    const { rateLimit, appKey } = apiKey;
    const windowSeconds = this.parseWindowToSeconds(rateLimit.window);
    const key = this.generateRedisKey(appKey, rateLimit.window);

    this.logger.debug(RATE_LIMIT_MESSAGES.RATE_LIMIT_CHECK_STARTED, {
      operation,
      appKey,
      strategy,
      limit: rateLimit.requestLimit,
      window: rateLimit.window,
      redisKey: key,
    });

    if (
      strategy !== RateLimitStrategy.FIXED_WINDOW &&
      strategy !== RateLimitStrategy.SLIDING_WINDOW
    ) {
      throw new BadRequestException(
        RateLimitTemplateUtil.generateErrorMessage("UNSUPPORTED_STRATEGY", {
          strategy,
        }),
      );
    }

    try {
      switch (strategy) {
        case RateLimitStrategy.FIXED_WINDOW:
          return await this.checkFixedWindow(
            key,
            rateLimit.requestLimit,
            windowSeconds,
          );
        case RateLimitStrategy.SLIDING_WINDOW:
          return await this.checkSlidingWindow(
            key,
            rateLimit.requestLimit,
            windowSeconds,
          );
      }
    } catch (error) {
      this.logger.error(RATE_LIMIT_MESSAGES.RATE_LIMIT_CHECK_FAILED, {
        operation,
        appKey,
        strategy,
        error: error.stack,
      });

      // 🎯 实现故障恢复机制 - fail-open策略
      this.logger.warn("限流服务异常，启用fail-open模式允许请求通过", {
        operation,
        appKey,
        strategy,
        errorType: error.constructor.name,
      });

      return {
        allowed: true,
        limit: rateLimit.requestLimit,
        current: 0,
        remaining: rateLimit.requestLimit,
        resetTime: Date.now() + windowSeconds * 1000,
        retryAfter: undefined,
      };
    }
  }

  /**
   * 固定窗口频率限制算法
   */
  private async checkFixedWindow(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const operation = RATE_LIMIT_OPERATIONS.CHECK_FIXED_WINDOW;
    const currentTime = Date.now();
    const windowStart =
      Math.floor(currentTime / (windowSeconds * 1000)) * windowSeconds * 1000;
    const windowKey = `${key}:fixed:${windowStart}`;
    const resetTime = windowStart + windowSeconds * 1000;

    this.logger.debug(RATE_LIMIT_MESSAGES.FIXED_WINDOW_CHECK, {
      operation,
      windowKey,
      limit,
      windowSeconds,
    });

    const pipeline = this.redis.pipeline();
    pipeline.incr(windowKey);
    // 🎯 使用集中化配置
    pipeline.expire(
      windowKey,
      windowSeconds + this.config.luaExpireBufferSeconds,
    );

    const results = await pipeline.exec();
    const current = results[0][1] as number;
    const remaining = Math.max(0, limit - current);
    const allowed = current <= limit;

    if (!allowed) {
      this.logger.warn(RATE_LIMIT_MESSAGES.FIXED_WINDOW_EXCEEDED, {
        operation,
        key,
        current,
        limit,
      });
    }

    return {
      allowed,
      limit,
      current,
      remaining,
      resetTime,
      retryAfter: allowed
        ? undefined
        : Math.ceil((resetTime - currentTime) / 1000),
    };
  }

  /**
   * 滑动窗口频率限制算法（基于时间戳列表）
   */
  private async checkSlidingWindow(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const operation = RATE_LIMIT_OPERATIONS.CHECK_SLIDING_WINDOW;
    const currentTime = Date.now();
    const slidingKey = `${key}:sliding`;

    this.logger.debug(RATE_LIMIT_MESSAGES.SLIDING_WINDOW_CHECK, {
      operation,
      slidingKey,
      limit,
      windowSeconds,
    });

    const luaScript = this.luaScriptsService.getSlidingWindowScript();

    const result = (await this.redis.eval(
      luaScript,
      1,
      slidingKey,
      currentTime.toString(),
      windowSeconds.toString(),
      limit.toString(),
      this.config.luaExpireBufferSeconds.toString(),
    )) as [number, number, number, number];

    const [allowed, current, remaining, retryAfter] = result;

    if (allowed !== 1) {
      this.logger.warn(RATE_LIMIT_MESSAGES.SLIDING_WINDOW_EXCEEDED, {
        operation,
        key,
        current,
        limit,
      });
    }

    return {
      allowed: allowed === 1,
      limit,
      current,
      remaining,
      resetTime: Date.now() + (retryAfter || windowSeconds) * 1000,
      retryAfter: allowed === 1 ? undefined : retryAfter,
    };
  }

  /**
   * 生成Redis键
   */
  private generateRedisKey(appKey: string, window: string): string {
    return `${this.config.redisPrefix}:${appKey}:${window}`;
  }

  /**
   * 解析时间窗口字符串为秒数
   */
  private parseWindowToSeconds(window: string): number {
    const regex = /^(\d+)([smhd])$/;
    const match = window.match(regex);

    if (!match) {
      throw new BadRequestException(
        RateLimitTemplateUtil.generateErrorMessage("INVALID_WINDOW_FORMAT", {
          window,
        }),
      );
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multiplier = RATE_LIMIT_TIME_MULTIPLIERS[unit];
    if (multiplier === undefined) {
      throw new BadRequestException(
        RateLimitTemplateUtil.generateErrorMessage("UNSUPPORTED_TIME_UNIT", {
          unit,
        }),
      );
    }

    return value * multiplier;
  }

  /**
   * 获取API Key的当前使用统计
   */
  async getCurrentUsage(
    apiKey: ApiKey,
    strategy: RateLimitStrategy,
  ): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetTime: number;
  }> {
    const { rateLimit, appKey } = apiKey;
    const windowSeconds = this.parseWindowToSeconds(rateLimit.window);
    const key = this.generateRedisKey(appKey, rateLimit.window);
    const limit = rateLimit.requestLimit;
    const currentTime = Date.now();

    let current = 0;
    let resetTime = 0;

    if (strategy === RateLimitStrategy.FIXED_WINDOW) {
      const windowStart =
        Math.floor(currentTime / (windowSeconds * 1000)) * windowSeconds * 1000;
      const windowKey = `${key}:fixed:${windowStart}`;
      resetTime = windowStart + windowSeconds * 1000;
      const count = await this.redis.get(windowKey);
      current = count ? parseInt(count, 10) : 0;
    } else {
      const slidingKey = `${key}:sliding`;
      current = await this.redis.zcard(slidingKey);
      const oldest = await this.redis.zrange(slidingKey, 0, 0);
      if (oldest.length > 0) {
        resetTime = parseInt(oldest[0], 10) + windowSeconds * 1000;
      } else {
        resetTime = currentTime;
      }
    }

    return {
      current,
      limit,
      remaining: Math.max(0, limit - current),
      resetTime,
    };
  }

  /**
   * 重置API Key的频率限制计数器
   */
  async resetRateLimit(
    apiKey: ApiKey,
    strategy: RateLimitStrategy,
  ): Promise<void> {
    const operation = RATE_LIMIT_OPERATIONS.RESET_RATE_LIMIT;
    const { rateLimit, appKey } = apiKey;
    const key = this.generateRedisKey(appKey, rateLimit.window);

    let keyToDelete: string | null = null;

    if (strategy === RateLimitStrategy.FIXED_WINDOW) {
      // 对于固定窗口，我们只需删除当前窗口的键即可满足重置需求
      const windowSeconds = this.parseWindowToSeconds(rateLimit.window);
      const windowStart =
        Math.floor(Date.now() / (windowSeconds * 1000)) * windowSeconds * 1000;
      keyToDelete = `${key}:fixed:${windowStart}`;
    } else if (strategy === RateLimitStrategy.SLIDING_WINDOW) {
      keyToDelete = `${key}:sliding`;
    } else {
      this.logger.warn(RATE_LIMIT_MESSAGES.UNSUPPORTED_STRATEGY_RESET, {
        operation,
        appKey,
        strategy,
      });
      return;
    }

    if (keyToDelete) {
      await this.redis.del(keyToDelete);
      this.logger.log(RATE_LIMIT_MESSAGES.RATE_LIMIT_RESET, {
        operation,
        appKey,
        strategy,
        deletedKey: keyToDelete,
      });
    }
  }

  /**
   * 获取API Key的详细使用统计
   */
  async getUsageStatistics(
    apiKey: ApiKey,
    strategy: RateLimitStrategy,
  ): Promise<{
    totalRequestCount: number;
    currentPeriodRequestCount: number;
    lastRequestTime?: Date;
    averageRequestsPerHour: number;
  }> {
    const totalRequestCount = apiKey.totalRequestCount || 0;
    const lastRequestTime = apiKey.lastAccessedAt;

    const currentUsage = await this.getCurrentUsage(apiKey, strategy);
    const currentPeriodRequestCount = currentUsage.current;

    const createdAt = (apiKey as any).createdAt || new Date();
    const hoursElapsed = Math.max(
      1,
      (Date.now() - createdAt.getTime()) / (1000 * 60 * 60),
    );
    const averageRequestsPerHour = totalRequestCount / hoursElapsed;

    return {
      totalRequestCount,
      currentPeriodRequestCount,
      lastRequestTime,
      averageRequestsPerHour: Math.round(averageRequestsPerHour * 100) / 100,
    };
  }
}

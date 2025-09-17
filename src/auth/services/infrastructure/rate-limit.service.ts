import { Injectable, BadRequestException } from "@nestjs/common";

import { createLogger } from "@common/modules/logging";
import { CacheService } from "../../../cache/services/cache.service";

import { securityConfig } from "@auth/config/security.config";
// 🆕 引入新的统一配置系统 - 与现有配置并存
import { AuthConfigCompatibilityWrapper } from "../../config/compatibility-wrapper";
import {
  RateLimitOperation,
  RateLimitMessage,
  TIME_MULTIPLIERS,
  RateLimitStrategy,
} from "@auth/constants";
import { RateLimitTemplateUtil } from "../../utils/rate-limit-template.util";
import { RateLimitLuaScriptsService } from "../../../common/modules/logging/rate-limit-lua-scripts.service";
import { RateLimitResult } from "../../interfaces/rate-limit.interface";
import { ApiKey } from "../../schemas/apikey.schema";

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
  // 🎯 使用集中化的配置 - 保留原有配置作为后备
  private readonly legacyConfig = securityConfig.rateLimit;
  private readonly luaScriptsService = new RateLimitLuaScriptsService();

  constructor(
    private readonly cacheService: CacheService,
    // 🆕 可选注入新配置系统 - 如果可用则使用，否则回退到原配置
    private readonly authConfig?: AuthConfigCompatibilityWrapper,
  ) {}

  // 🆕 统一配置访问方法 - 优先使用新配置，回退到原配置
  private get config() {
    if (this.authConfig) {
      // 使用新的统一配置系统
      const newConfig = {
        luaExpireBufferSeconds: 10, // 固定值，无需配置化
        redisPrefix: "rl", // 固定值，与原配置一致
      };

      // 🔍 调试日志：记录使用新配置系统
      this.logger.debug("RateLimitService: 使用新统一配置系统", {
        configSource: "AuthConfigCompatibilityWrapper",
        luaExpireBufferSeconds: newConfig.luaExpireBufferSeconds,
        redisPrefix: newConfig.redisPrefix,
      });

      return newConfig;
    }

    // 回退到原有配置
    this.logger.debug("RateLimitService: 回退到原有配置系统", {
      configSource: "securityConfig.rateLimit",
      luaExpireBufferSeconds: this.legacyConfig.luaExpireBufferSeconds,
      redisPrefix: this.legacyConfig.redisPrefix,
    });

    return this.legacyConfig;
  }

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
    const operation = RateLimitOperation.CHECK_RATE_LIMIT;
    const { rateLimit, appKey } = apiKey;
    const windowSeconds = this.parseWindowToSeconds(rateLimit.window);
    const key = this.generateRedisKey(appKey, rateLimit.window);

    this.logger.debug(RateLimitMessage.RATE_LIMIT_CHECK_STARTED, {
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
          return await this.checkFixedWindowSafe(
            key,
            rateLimit.requestLimit,
            windowSeconds,
          );
        case RateLimitStrategy.SLIDING_WINDOW:
          return await this.checkSlidingWindowSafe(
            key,
            rateLimit.requestLimit,
            windowSeconds,
          );
      }
    } catch (error) {
      this.logger.error(RateLimitMessage.RATE_LIMIT_CHECK_FAILED, {
        operation,
        appKey,
        strategy,
        error: error.stack,
      });

      // 🎯 增强的故障恢复机制 - fail-open策略
      this.logger.warn("限流服务异常，启用fail-open模式允许请求通过", {
        operation,
        appKey,
        strategy,
        errorType: error.constructor.name,
        failureMode: "cache_service_unavailable",
      });

      return this.createFailOpenResponse(rateLimit.requestLimit, windowSeconds);
    }
  }

  /**
   * 创建失败开放响应 - 缓存服务不可用时的降级处理
   */
  private createFailOpenResponse(
    limit: number,
    windowSeconds: number,
  ): RateLimitResult {
    return {
      allowed: true,
      limit,
      current: 0,
      remaining: limit,
      resetTime: Date.now() + windowSeconds * 1000,
      retryAfter: undefined,
    };
  }

  /**
   * 固定窗口频率限制算法 - 容错版本
   */
  private async checkFixedWindowSafe(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    try {
      return await this.checkFixedWindow(key, limit, windowSeconds);
    } catch (error) {
      this.logger.warn("固定窗口限流检查失败，启用fail-open模式", {
        key,
        limit,
        windowSeconds,
        error: error.message,
      });
      return this.createFailOpenResponse(limit, windowSeconds);
    }
  }

  /**
   * 滑动窗口频率限制算法 - 容错版本
   */
  private async checkSlidingWindowSafe(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    try {
      return await this.checkSlidingWindow(key, limit, windowSeconds);
    } catch (error) {
      this.logger.warn("滑动窗口限流检查失败，启用fail-open模式", {
        key,
        limit,
        windowSeconds,
        error: error.message,
      });
      return this.createFailOpenResponse(limit, windowSeconds);
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
    const operation = RateLimitOperation.CHECK_FIXED_WINDOW;
    const currentTime = Date.now();
    const windowStart =
      Math.floor(currentTime / (windowSeconds * 1000)) * windowSeconds * 1000;
    const windowKey = `${key}:fixed:${windowStart}`;
    const resetTime = windowStart + windowSeconds * 1000;

    this.logger.debug(RateLimitMessage.FIXED_WINDOW_CHECK, {
      operation,
      windowKey,
      limit,
      windowSeconds,
    });

    const pipeline = this.cacheService.multi();
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
      this.logger.warn(RateLimitMessage.FIXED_WINDOW_EXCEEDED, {
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
    const operation = RateLimitOperation.CHECK_SLIDING_WINDOW;
    const currentTime = Date.now();
    const slidingKey = `${key}:sliding`;

    this.logger.debug(RateLimitMessage.SLIDING_WINDOW_CHECK, {
      operation,
      slidingKey,
      limit,
      windowSeconds,
    });

    const luaScript = this.luaScriptsService.getSlidingWindowScript();

    const result = (await this.cacheService.eval(
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
      this.logger.warn(RateLimitMessage.SLIDING_WINDOW_EXCEEDED, {
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

    const multiplier = TIME_MULTIPLIERS[unit];
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
   * 获取API Key的当前使用统计 - 容错版本
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

    try {
      if (strategy === RateLimitStrategy.FIXED_WINDOW) {
        const windowStart =
          Math.floor(currentTime / (windowSeconds * 1000)) *
          windowSeconds *
          1000;
        const windowKey = `${key}:fixed:${windowStart}`;
        resetTime = windowStart + windowSeconds * 1000;
        const count = await this.cacheService.safeGet<string>(windowKey);
        current = count ? parseInt(count, 10) : 0;
      } else {
        const slidingKey = `${key}:sliding`;
        current = await this.cacheService.zcard(slidingKey);
        const oldest = await this.cacheService.zrange(slidingKey, 0, 0);
        if (oldest.length > 0) {
          resetTime = parseInt(oldest[0], 10) + windowSeconds * 1000;
        } else {
          resetTime = currentTime;
        }
      }
    } catch (error) {
      this.logger.warn("获取使用统计失败，返回降级数据", {
        appKey,
        strategy,
        error: error.message,
      });
      // 降级处理：返回保守的统计数据
      current = 0;
      resetTime = currentTime + windowSeconds * 1000;
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
    const operation = RateLimitOperation.RESET_RATE_LIMIT;
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
      this.logger.warn(RateLimitMessage.UNSUPPORTED_STRATEGY_RESET, {
        operation,
        appKey,
        strategy,
      });
      return;
    }

    if (keyToDelete) {
      await this.cacheService.del(keyToDelete);
      this.logger.log(RateLimitMessage.RATE_LIMIT_RESET, {
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


import { OPERATION_LIMITS } from '@common/constants/domain';
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
  OnModuleDestroy,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createLogger } from "@common/logging/index";

/**
 * DoS防护参数配置接口
 */
interface ApiRateLimitConfig {
  /** 时间窗口（秒） */
  ttl: number;
  /** 请求数量限制 */
  limit: number;
  /** 突发请求数量限制 */
  burst?: number;
  /** IP级别限制 */
  perIP?: boolean;
  /** 用户级别限制 */
  perUser?: boolean;
}

/**
 * 速率限制装饰器
 */
import { SetMetadata } from "@nestjs/common";

export const STREAM_RATE_LIMIT_KEY = "streamRateLimit";
export const StreamRateLimit = (config: ApiRateLimitConfig) =>
  SetMetadata(STREAM_RATE_LIMIT_KEY, config);

/**
 * 流数据获取DoS防护Guard
 *
 * 功能：
 * - IP级别速率限制
 * - 用户级别速率限制
 * - 突发请求防护
 * - 连接频率控制
 */
@Injectable()
export class StreamRateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly logger = createLogger(StreamRateLimitGuard.name);

  // 请求计数器 - IP级别
  private readonly ipRequestCounts = new Map<
    string,
    { count: number; lastReset: number; burstCount: number; lastBurst: number }
  >();

  // 请求计数器 - 用户级别
  private readonly userRequestCounts = new Map<
    string,
    { count: number; lastReset: number; burstCount: number; lastBurst: number }
  >();

  // 定时器引用 - 用于清理
  private cleanupTimer: NodeJS.Timeout | null = null;

  // 销毁标志 - 防止在销毁后继续操作
  private isDestroyed = false;

  // 默认配置
  private readonly defaultConfig: ApiRateLimitConfig = {
    ttl: 60, // 1分钟窗口
    limit: OPERATION_LIMITS.BATCH_SIZES.DEFAULT_PAGE_SIZE, // 每分钟100次请求
    burst: 20, // 突发请求上限20次
    perIP: true,
    perUser: true,
  };

  constructor(private readonly reflector: Reflector) {
    // 使用安全的递归定时调度
    this.scheduleNextCleanup();

    this.logger.debug("StreamRateLimitGuard 已初始化", {
      cleanupInterval: "60秒",
      defaultConfig: this.defaultConfig,
    });
  }

  /**
   * 安全的递归定时调度（优于 setInterval）
   */
  private scheduleNextCleanup(): void {
    if (this.isDestroyed) return;

    this.cleanupTimer = setTimeout(() => {
      try {
        this.cleanupExpiredCounters();
      } catch (error) {
        this.logger.error("清理过程异常", error);
      } finally {
        // 递归调度下一次清理
        this.scheduleNextCleanup();
      }
    }, 60 * 1000);
  }

  /**
   * 销毁时清理资源
   * 实现 OnModuleDestroy 接口确保定时器被正确清理
   */
  onModuleDestroy(): void {
    this.isDestroyed = true;

    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
      this.logger.debug("定时器已清理");
    }

    // 清理所有计数器内存
    this.ipRequestCounts.clear();
    this.userRequestCounts.clear();

    this.logger.log("StreamRateLimitGuard 已销毁，资源已清理", {
      ipCountersCleared: this.ipRequestCounts.size,
      userCountersCleared: this.userRequestCounts.size,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 如果已销毁，拒绝请求
    if (this.isDestroyed) {
      this.logger.warn("Guard已销毁，拒绝请求");
      throw new ServiceUnavailableException("服务不可用");
    }

    const request = context.switchToHttp().getRequest();

    // 获取装饰器配置
    const config =
      this.reflector.get(STREAM_RATE_LIMIT_KEY, context.getHandler()) ||
      this.defaultConfig;

    // 获取客户端标识
    const clientIP = this.getClientIP(request);
    const userId = this.getUserId(request);

    try {
      // IP级别限制检查
      if (config.perIP && !this.checkRateLimit("ip", clientIP, config)) {
        this.logger.warn("IP速率限制触发", {
          clientIP,
          userId,
          endpoint: request.url,
          userAgent: request.headers["user-agent"],
        });
        throw new ServiceUnavailableException("请求频率过高，请稍后重试");
      }

      // 用户级别限制检查
      if (
        config.perUser &&
        userId &&
        !this.checkRateLimit("user", userId, config)
      ) {
        this.logger.warn("用户速率限制触发", {
          clientIP,
          userId,
          endpoint: request.url,
        });
        throw new ServiceUnavailableException("请求频率过高，请稍后重试");
      }

      // 突发请求检查
      if (config.burst && !this.checkBurstLimit(clientIP, config)) {
        this.logger.warn("突发请求限制触发", {
          clientIP,
          userId,
          endpoint: request.url,
        });
        throw new ServiceUnavailableException("突发请求过多，请降低请求频率");
      }

      return true;
    } catch (error) {
      // 记录DoS攻击尝试
      this.logger.error("DoS防护触发", {
        clientIP,
        userId,
        endpoint: request.url,
        userAgent: request.headers["user-agent"],
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  }

  /**
   * 检查速率限制
   */
  private checkRateLimit(
    type: "ip" | "user",
    identifier: string,
    config: ApiRateLimitConfig,
  ): boolean {
    if (this.isDestroyed) return false;

    const now = Date.now();
    const counters =
      type === "ip" ? this.ipRequestCounts : this.userRequestCounts;

    let counter = counters.get(identifier);
    if (!counter) {
      counter = { count: 0, lastReset: now, burstCount: 0, lastBurst: now };
      counters.set(identifier, counter);
    }

    // 检查是否需要重置时间窗口
    if (now - counter.lastReset >= config.ttl * 1000) {
      counter.count = 0;
      counter.lastReset = now;
    }

    // 检查是否超过限制
    if (counter.count >= config.limit) {
      return false;
    }

    // 增加计数
    counter.count++;
    return true;
  }

  /**
   * 检查突发请求限制
   */
  private checkBurstLimit(clientIP: string, config: ApiRateLimitConfig): boolean {
    if (!config.burst || this.isDestroyed) return true;

    const now = Date.now();
    const counter = this.ipRequestCounts.get(clientIP);

    if (!counter) return true;

    // 10秒的突发窗口
    const burstWindow = 10 * 1000;

    if (now - counter.lastBurst >= burstWindow) {
      counter.burstCount = 0;
      counter.lastBurst = now;
    }

    if (counter.burstCount >= config.burst) {
      return false;
    }

    counter.burstCount++;
    return true;
  }

  /**
   * 获取客户端IP地址
   */
  private getClientIP(request: any): string {
    // 按优先级获取真实IP
    const forwarded = request.headers["x-forwarded-for"];
    const realIP = request.headers["x-real-ip"];
    const remoteAddr =
      request.connection?.remoteAddress || request.socket?.remoteAddress;

    if (forwarded) {
      // X-Forwarded-For 可能包含多个IP，取第一个
      return forwarded.split(",")[0].trim();
    }

    if (realIP) {
      return realIP.trim();
    }

    return remoteAddr || "unknown";
  }

  /**
   * 获取用户ID（从JWT token或API key中提取）
   */
  private getUserId(request: any): string | null {
    // 从认证信息中提取用户ID
    const user = request.user;
    if (user && user.id) {
      return user.id.toString();
    }

    // 从API Key中提取
    const apiKey = request.headers["x-app-key"];
    if (apiKey) {
      return `api_key_${apiKey.substring(0, 8)}`; // 使用API key前8位作为标识
    }

    return null;
  }

  /**
   * 清理过期的计数器
   */
  private cleanupExpiredCounters(): void {
    const now = Date.now();
    const expiredThreshold = 10 * 60 * 1000; // 10分钟

    // 清理IP计数器
    for (const [key, counter] of this.ipRequestCounts.entries()) {
      if (now - counter.lastReset > expiredThreshold) {
        this.ipRequestCounts.delete(key);
      }
    }

    // 清理用户计数器
    for (const [key, counter] of this.userRequestCounts.entries()) {
      if (now - counter.lastReset > expiredThreshold) {
        this.userRequestCounts.delete(key);
      }
    }

    this.logger.debug("过期计数器已清理", {
      remainingIPCounters: this.ipRequestCounts.size,
      remainingUserCounters: this.userRequestCounts.size,
    });
  }

  /**
   * 获取当前速率限制统计信息
   */
  getStats() {
    const now = Date.now();

    return {
      ipCounters: Array.from(this.ipRequestCounts.entries()).map(
        ([ip, counter]) => ({
          ip,
          count: counter.count,
          burstCount: counter.burstCount,
          lastReset: new Date(counter.lastReset).toISOString(),
          lastBurst: new Date(counter.lastBurst).toISOString(),
          age: now - counter.lastReset,
        }),
      ),
      userCounters: Array.from(this.userRequestCounts.entries()).map(
        ([user, counter]) => ({
          user,
          count: counter.count,
          burstCount: counter.burstCount,
          lastReset: new Date(counter.lastReset).toISOString(),
          lastBurst: new Date(counter.lastBurst).toISOString(),
          age: now - counter.lastReset,
        }),
      ),
      totalActiveIPs: this.ipRequestCounts.size,
      totalActiveUsers: this.userRequestCounts.size,
    };
  }

  /**
   * 重置特定IP或用户的限制（用于管理员解除限制）
   */
  resetLimits(type: "ip" | "user", identifier: string): boolean {
    const counters =
      type === "ip" ? this.ipRequestCounts : this.userRequestCounts;
    const deleted = counters.delete(identifier);

    if (deleted) {
      this.logger.log(`已重置${type}限制`, { type, identifier });
    }

    return deleted;
  }
}

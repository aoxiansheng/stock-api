import { Module, OnModuleDestroy, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { CACHE_REDIS_CLIENT_TOKEN } from "../constants";
import { BasicCacheService } from "../services/basic-cache.service";


// 统一错误处理基础设施
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from "@common/core/exceptions";

/**
 * 通用缓存模块（极简版）
 * 仅提供最小 Redis JSON 缓存能力：get/set/del/incr/expire/mget
 */
@Module({
  providers: [
    // Redis客户端提供者
    {
      provide: CACHE_REDIS_CLIENT_TOKEN,
      useFactory: (configService: ConfigService) => {
        const url = process.env.REDIS_URL;
        if (url) {
          return new Redis(url, {
            connectTimeout: 3000,
            commandTimeout: 5000,
            enableAutoPipelining: true,
            lazyConnect: false,
            enableOfflineQueue: false,
            showFriendlyErrorStack: process.env.NODE_ENV !== "production",
          } as any);
        }

        return new Redis({
          host: configService.get<string>("redis.host", "localhost"),
          port: configService.get<number>("redis.port", 6379),
          password: configService.get<string>("redis.password"),
          db: configService.get<number>("redis.db", 0),
          connectTimeout: 3000,
          commandTimeout: 5000,
          enableAutoPipelining: true,
          lazyConnect: false,
          enableOfflineQueue: false,
          showFriendlyErrorStack: process.env.NODE_ENV !== "production",
        } as any);
      },
      inject: [ConfigService],
    },
    // 🎯 极简缓存服务
    BasicCacheService,
  ],
  exports: [
    BasicCacheService,
    CACHE_REDIS_CLIENT_TOKEN,
  ],
})
export class BasicCacheModule implements OnModuleDestroy {
  constructor(
    @Inject(CACHE_REDIS_CLIENT_TOKEN) private readonly redisClient: Redis,
  ) {}

  async onModuleDestroy() {
    try {
      this.redisClient.removeAllListeners();
      await this.redisClient.quit();
    } catch {
      this.redisClient.disconnect();
    }
  }
}

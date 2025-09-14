import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { CacheService } from "../services/cache.service";
import { CacheLimitsProvider } from "../providers/cache-limits.provider";
import { CacheTtlProvider } from "../providers/cache-ttl.provider";
import cacheConfig from "../config/cache.config";
import cacheLimitsConfig from "../config/cache-limits.config";
import cacheTtlConfig from "../config/cache-ttl.config";

@Module({
  imports: [
    // 注册缓存配置
    ConfigModule.forFeature(cacheConfig),
    // 注册缓存限制配置
    ConfigModule.forFeature(cacheLimitsConfig),
    // 注册TTL配置
    ConfigModule.forFeature(cacheTtlConfig),
  ],
  providers: [
    CacheService,
    // 提供配置值
    {
      provide: 'cacheLimits',
      useFactory: (configService: ConfigService) => configService.get('cacheLimits'),
      inject: [ConfigService],
    },
    {
      provide: 'cacheTtl',
      useFactory: (configService: ConfigService) => configService.get('cacheTtl'),
      inject: [ConfigService],
    },
    CacheLimitsProvider, // 缓存限制Provider
    CacheTtlProvider, // TTL配置Provider
  ],
  exports: [CacheService, CacheLimitsProvider, CacheTtlProvider],
})
export class CacheModule {}

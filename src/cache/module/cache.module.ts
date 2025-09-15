import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { CacheService } from "../services/cache.service";
// CacheLimitsProvider 已移除，限制配置通过统一配置获取
// CacheTtlProvider 已移除，功能整合到 CacheService 和统一配置
import cacheConfig from "../config/cache.config";
import cacheUnifiedConfig from "../config/cache-unified.config";

@Module({
  imports: [
    // 🎯 统一配置（主配置）
    ConfigModule.forFeature(cacheUnifiedConfig),
    // 🎯 向后兼容：保留旧配置，用于渐进迁移
    ConfigModule.forFeature(cacheConfig),
  ],
  providers: [
    CacheService,
    // 提供配置值（向后兼容）
    {
      provide: 'cacheTtl',
      useFactory: (configService: ConfigService) => configService.get('cacheUnified'),
      inject: [ConfigService],
    },
    // CacheLimitsProvider 和 CacheTtlProvider 已移除
    // 所有配置通过统一配置文件和 ConfigService 访问
  ],
  exports: [CacheService],
})
export class CacheModule {}

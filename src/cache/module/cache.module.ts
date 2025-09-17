import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { CacheService } from "../services/cache.service";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";
// 导入统一配置和兼容性模块
import { CacheConfigCompatibilityModule } from "../config/compatibility-registry";
import cacheUnifiedConfig from "../config/cache-unified.config";
// 兼容性配置（保留向后兼容）
import cacheConfig from "../config/cache-legacy.config";
// 🎯 Phase 5: DTO标准化 - 添加分页功能支持
import { CacheStatusController } from "../controllers/cache-status.controller";

@Module({
  imports: [
    // 🆕 统一配置（主配置 - 推荐用于新代码）
    ConfigModule.forFeature(cacheUnifiedConfig),

    // 🔄 兼容性配置（保留向后兼容 - 现有代码继续工作）
    ConfigModule.forFeature(cacheConfig),

    // 🎯 兼容性注册模块
    CacheConfigCompatibilityModule,
  ],
  controllers: [
    // 🎯 Phase 3: 响应格式统一验证控制器
    CacheStatusController,
  ],
  providers: [
    CacheService,
    PaginationService, // 🎯 Phase 5: DTO标准化 - 添加分页服务支持
    // 🎯 Phase 3: ResponseInterceptor在全局级别配置，无需在此模块重复注册

    // 🎯 统一配置提供者（主要）
    {
      provide: "CACHE_UNIFIED_CONFIG",
      useFactory: (configService: ConfigService) =>
        configService.get("cacheUnified"),
      inject: [ConfigService],
    },

    // 🔄 向后兼容配置提供者
    {
      provide: "CACHE_TTL_CONFIG",
      useFactory: (configService: ConfigService) => {
        const unifiedConfig = configService.get("cacheUnified");
        // 映射TTL配置到兼容接口
        return {
          defaultTtl: unifiedConfig.defaultTtl,
          strongTimelinessTtl: unifiedConfig.strongTimelinessTtl,
          authTtl: unifiedConfig.authTtl,
          monitoringTtl: unifiedConfig.monitoringTtl,
          transformerTtl: unifiedConfig.transformerTtl,
          suggestionTtl: unifiedConfig.suggestionTtl,
          longTermTtl: unifiedConfig.longTermTtl,
        };
      },
      inject: [ConfigService],
    },

    {
      provide: "CACHE_LIMITS_CONFIG",
      useFactory: (configService: ConfigService) => {
        const unifiedConfig = configService.get("cacheUnified");
        // 映射限制配置到兼容接口
        return {
          maxBatchSize: unifiedConfig.maxBatchSize,
          maxCacheSize: unifiedConfig.maxCacheSize,
          lruSortBatchSize: unifiedConfig.lruSortBatchSize,
          smartCacheMaxBatch: unifiedConfig.smartCacheMaxBatch,
          maxCacheSizeMB: unifiedConfig.maxCacheSizeMB,
        };
      },
      inject: [ConfigService],
    },

    // Fix: Add cacheTtl provider that CacheService expects
    {
      provide: "cacheTtl",
      useFactory: (configService: ConfigService) => {
        return configService.get("cacheUnified");
      },
      inject: [ConfigService],
    },
  ],
  exports: [
    CacheService,
    PaginationService, // 🎯 Phase 5: DTO标准化 - 导出分页服务
    // 🎯 Phase 1.2: 移除CacheLoggingUtil导出，使用通用日志组件
    "CACHE_UNIFIED_CONFIG",
    "CACHE_TTL_CONFIG",
    "CACHE_LIMITS_CONFIG",
    CacheConfigCompatibilityModule,
  ],
})
export class CacheModule {}

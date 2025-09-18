import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { CacheService } from "../services/cache.service";
import { PaginationService } from "@common/modules/pagination/services/pagination.service";
// 导入统一配置
import cacheUnifiedConfig from "../config/cache-unified.config";
// 🎯 Phase 5: DTO标准化 - 添加分页功能支持
import { CacheStatusController } from "../controllers/cache-status.controller";

@Module({
  imports: [
    // 🆕 统一配置（主配置）
    ConfigModule.forFeature(cacheUnifiedConfig),
  ],
  controllers: [
    // 🎯 Phase 3: 响应格式统一验证控制器
    CacheStatusController,
  ],
  providers: [
    CacheService,
    PaginationService, // 🎯 Phase 5: DTO标准化 - 添加分页服务支持
    // 🎯 Phase 3: ResponseInterceptor在全局级别配置，无需在此模块重复注册

    // 🎯 统一配置提供者
    {
      provide: "cacheUnified",
      useFactory: (configService: ConfigService) =>
        configService.get("cacheUnified"),
      inject: [ConfigService],
    },
  ],
  exports: [
    CacheService,
    PaginationService, // 🎯 Phase 5: DTO标准化 - 导出分页服务
    // 🎯 Phase 1.2: 移除CacheLoggingUtil导出，使用通用日志组件
    "cacheUnified",
  ],
})
export class CacheModule {}

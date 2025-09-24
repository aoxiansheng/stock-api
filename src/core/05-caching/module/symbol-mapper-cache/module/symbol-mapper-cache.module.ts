import { Module } from "@nestjs/common";

import { FeatureFlags } from "@config/feature-flags.config";
// ✅ 事件驱动架构：不再直接依赖监控模块，EventEmitterModule 在 AppModule 中全局配置
import { DatabaseModule } from "../../../../../database/database.module"; // 🆕 统一数据库模块

// 导入 symbol-mapper 相关的 Schema 和 Repository
import { SymbolMappingRepository } from "../../../../00-prepare/symbol-mapper/repositories/symbol-mapping.repository";

// 导入缓存服务
import { SymbolMapperCacheStandardizedService } from "../services/symbol-mapper-cache-standardized.service";

/**
 * Symbol Mapper Cache 独立模块 (简化版本)
 *
 * 功能:
 * - 提供三层缓存架构 (L1规则缓存 + L2符号映射 + L3批量结果)
 * - LRU内存缓存管理
 * - 内存水位监控和自动清理
 * - 标准化缓存模块接口实现
 * - 简化架构，专注核心功能，移除复杂监控
 *
 * 服务架构:
 * - SymbolMapperCacheStandardizedService: 标准化服务 (唯一服务)
 */
@Module({
  imports: [
    // 🎖️ 统一数据库模块 (替代重复的MongooseModule.forFeature)
    DatabaseModule,

    // ✅ 事件驱动架构：不再直接导入 MonitoringModule
    // EventEmitterModule 在 AppModule 中全局配置，此处无需导入
  ],
  providers: [
    // 🆕 标准化服务 (唯一服务)
    SymbolMapperCacheStandardizedService,

    // 🗄️ 数据库访问和配置
    SymbolMappingRepository,            // 数据库访问
    FeatureFlags,                       // 配置参数
  ],
  exports: [
    // 导出标准化服务 (唯一导出)
    SymbolMapperCacheStandardizedService,
  ],
})
export class SymbolMapperCacheModule {}

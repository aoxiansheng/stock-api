import { Module } from "@nestjs/common";

import { FeatureFlags } from "@config/feature-flags.config";
// ✅ 事件驱动架构：不再直接依赖监控模块，EventEmitterModule 在 AppModule 中全局配置
import { DatabaseModule } from "../../../../../database/database.module"; // 🆕 统一数据库模块

// 导入 symbol-mapper 相关的 Schema 和 Repository
import { SymbolMappingRepository } from "../../../../00-prepare/symbol-mapper/repositories/symbol-mapping.repository";

// 导入缓存服务
import { SymbolMapperCacheService } from "../services/symbol-mapper-cache.service";
import { SymbolMapperCacheMonitoringService } from "../services/symbol-mapper-cache-monitoring.service";
import { SymbolMapperCacheStandardizedService } from "../services/symbol-mapper-cache-standardized.service";

/**
 * Symbol Mapper Cache 独立模块 (标准化版本)
 *
 * 功能:
 * - 提供三层缓存架构 (L1规则缓存 + L2符号映射 + L3批量结果)
 * - MongoDB Change Stream 实时数据变更监听
 * - LRU内存缓存管理
 * - 并发控制和防重复查询
 * - 内存水位监控和自动清理
 * - 监听者模式监控数据收集
 * - 标准化缓存模块接口实现
 * - 与 Foundation 层完全集成
 *
 * 双服务模式:
 * - SymbolMapperCacheStandardizedService: 新标准化服务 (主要)
 * - SymbolMapperCacheService: 原有服务 (兼容性保留)
 */
@Module({
  imports: [
    // 🎖️ 统一数据库模块 (替代重复的MongooseModule.forFeature)
    DatabaseModule,

    // ✅ 事件驱动架构：不再直接导入 MonitoringModule
    // EventEmitterModule 在 AppModule 中全局配置，此处无需导入
  ],
  providers: [
    // 🆕 标准化服务 (主要服务)
    SymbolMapperCacheStandardizedService,

    // 🔄 原有服务 (兼容性保留)
    SymbolMapperCacheService,           // 核心缓存服务
    SymbolMapperCacheMonitoringService, // 监控服务

    // 🗄️ 数据库访问和配置
    SymbolMappingRepository,            // 数据库访问
    FeatureFlags,                       // 配置参数
  ],
  exports: [
    // 主要导出标准化服务
    SymbolMapperCacheStandardizedService,

    // 兼容性导出 (保持向后兼容)
    SymbolMapperCacheService,

    // 不导出监控服务，保持监控逻辑内部化
  ],
})
export class SymbolMapperCacheModule {}

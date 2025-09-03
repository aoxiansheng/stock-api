import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { FeatureFlags } from "@config/feature-flags.config";
// ✅ 事件驱动架构：不再直接依赖监控模块，EventEmitterModule 在 AppModule 中全局配置
import { DatabaseModule } from "../../../../database/database.module"; // 🆕 统一数据库模块

// 导入 symbol-mapper 相关的 Schema 和 Repository
import { SymbolMappingRepository } from "../../../00-prepare/symbol-mapper/repositories/symbol-mapping.repository";
import {
  SymbolMappingRuleDocument,
  SymbolMappingRuleDocumentSchema,
} from "../../../00-prepare/symbol-mapper/schemas/symbol-mapping-rule.schema";

// 导入缓存服务
import { SymbolMapperCacheService } from "../services/symbol-mapper-cache.service";

/**
 * Symbol Mapper Cache 独立模块
 *
 * 功能:
 * - 提供三层缓存架构 (L1规则缓存 + L2符号映射 + L3批量结果)
 * - MongoDB Change Stream 实时数据变更监听
 * - LRU内存缓存管理
 * - 并发控制和防重复查询
 * - 内存水位监控和自动清理
 * - 使用事件驱动架构进行监控数据收集
 */
@Module({
  imports: [
    // 🎖️ 统一数据库模块 (替代重复的MongooseModule.forFeature)
    DatabaseModule,

    // ✅ 事件驱动架构：不再直接导入 MonitoringModule
    // EventEmitterModule 在 AppModule 中全局配置，此处无需导入
  ],
  providers: [
    SymbolMapperCacheService,
    SymbolMappingRepository, // 缓存服务需要访问数据库
    FeatureFlags, // 缓存配置参数
    // ✅ 事件驱动架构：不再需要 CollectorService，使用 EventEmitter2 进行事件发送
  ],
  exports: [
    SymbolMapperCacheService, // 导出缓存服务供其他模块使用
  ],
})
export class SymbolMapperCacheModule {}

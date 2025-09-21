import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../../../../auth/module/auth.module";
import { PaginationModule } from "@common/modules/pagination/modules/pagination.module";
import { SharedServicesModule } from "../../../shared/module/shared-services.module";
// EventEmitter2 已在 app.module.ts 中全局配置，无需直接导入监控模块
import { DatabaseModule } from "../../../../database/database.module"; // 🆕 统一数据库模块

// 导入新的独立缓存模块
import { SymbolMapperCacheModule } from "../../../05-caching/symbol-mapper-cache/module/symbol-mapper-cache.module";

import { SymbolMappingRepository } from "../repositories/symbol-mapping.repository";
import {
  SymbolMappingRuleDocument,
  SymbolMappingRuleDocumentSchema,
} from "../schemas/symbol-mapping-rule.schema";
import { SymbolMapperController } from "../controller/symbol-mapper.controller";
import { SymbolMapperService } from "../services/symbol-mapper.service";

@Module({
  imports: [
    // 🆕 统一数据库模块 (替代重复的MongooseModule.forFeature)
    DatabaseModule,

    AuthModule,
    PaginationModule,
    SharedServicesModule, // 🔥 导入SharedServicesModule以获取共享服务支持
    // 事件化监控不需要直接导入 MonitoringModule
    SymbolMapperCacheModule, // 🎯 导入独立的缓存模块

    // ✅ 使用统一DatabaseModule (CoreDatabaseModule包含SymbolMappingRuleDocument schema)
  ],
  controllers: [SymbolMapperController],
  providers: [
    SymbolMapperService,
    SymbolMappingRepository,
    // FeatureFlags 从 SharedServicesModule 获取
    // EventEmitter2 从全局注册获取
  ],
  exports: [SymbolMapperService],
})
export class SymbolMapperModule {}

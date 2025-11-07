import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule as AuthV2Module } from "@authv2/auth.module";
import { PaginationModule } from "@common/modules/pagination/modules/pagination.module";
// 去监控化：不再依赖 SharedServicesModule/EventEmitter
import { DatabaseModule } from "../../../../database/database.module"; // 🆕 统一数据库模块

// 精简：符号映射模块不直接依赖缓存模块

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
    // 本模块自有Schema注册
    MongooseModule.forFeature([
      { name: SymbolMappingRuleDocument.name, schema: SymbolMappingRuleDocumentSchema },
    ]),

    AuthV2Module,
    PaginationModule,

    // ✅ Schema 就近注册，DatabaseModule 仅提供连接
  ],
  controllers: [SymbolMapperController],
  providers: [
    SymbolMapperService,
    SymbolMappingRepository,
    // 精简：删除 FeatureFlags/EventEmitter 直接依赖
  ],
  exports: [SymbolMapperService],
})
export class SymbolMapperModule {}

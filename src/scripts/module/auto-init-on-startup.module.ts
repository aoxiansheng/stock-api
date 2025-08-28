import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  FlexibleMappingRule,
  FlexibleMappingRuleSchema,
} from "../../core/00-prepare/data-mapper/schemas/flexible-mapping-rule.schema";
import {
  SymbolMappingRuleDocument,
  SymbolMappingRuleDocumentSchema,
} from "../../core/00-prepare/symbol-mapper/schemas/symbol-mapping-rule.schema";
import { DatabaseModule } from "../../database/database.module"; // 🆕 统一数据库模块

import { AutoInitOnStartupService } from "../services/auto-init-on-startup.service";

/**
 * 启动时初始化模块
 */
@Module({
  imports: [
    // 🆕 统一数据库模块 (替代重复的MongooseModule.forFeature)
    DatabaseModule,
    
    // 🔄 移除重复的MongooseModule.forFeature (改用DatabaseModule中的CoreDatabaseModule)
    // MongooseModule.forFeature([
    //   // FlexibleMappingRule和SymbolMappingRuleDocument已在CoreDatabaseModule中注册
    //   { name: FlexibleMappingRule.name, schema: FlexibleMappingRuleSchema },
    //   { name: SymbolMappingRuleDocument.name, schema: SymbolMappingRuleDocumentSchema },
    // ]),
  ],
  providers: [AutoInitOnStartupService],
  exports: [AutoInitOnStartupService],
})
export class AutoInitModule {}

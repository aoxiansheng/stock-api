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

import { AutoInitOnStartupService } from "../services/auto-init-on-startup.service";

/**
 * 启动时初始化模块
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FlexibleMappingRule.name, schema: FlexibleMappingRuleSchema },
      { name: SymbolMappingRuleDocument.name, schema: SymbolMappingRuleDocumentSchema },
    ]),
  ],
  providers: [AutoInitOnStartupService],
  exports: [AutoInitOnStartupService],
})
export class AutoInitModule {}

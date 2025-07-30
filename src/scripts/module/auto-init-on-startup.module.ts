import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import {
  DataMappingRule,
  DataMappingRuleSchema,
} from "../../core/data-mapper/schemas/data-mapper.schema";
import {
  SymbolMappingRule,
  SymbolMappingRuleSchema,
} from "../../core/symbol-mapper/schemas/symbol-mapping-rule.schema";

import { AutoInitOnStartupService } from "../services/auto-init-on-startup.service";

/**
 * 启动时初始化模块
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DataMappingRule.name, schema: DataMappingRuleSchema },
      { name: SymbolMappingRule.name, schema: SymbolMappingRuleSchema },
    ]),
  ],
  providers: [AutoInitOnStartupService],
  exports: [AutoInitOnStartupService],
})
export class AutoInitModule {}

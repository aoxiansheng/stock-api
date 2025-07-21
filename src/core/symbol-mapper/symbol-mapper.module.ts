import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../../auth/auth.module";

import { SymbolMappingRepository } from "./repositories/symbol-mapping.repository";
import {
  SymbolMappingRule,
  SymbolMappingRuleSchema,
} from "./schemas/symbol-mapping-rule.schema";
import { SymbolMapperController } from "./symbol-mapper.controller";
import { SymbolMapperService } from "./symbol-mapper.service";


@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: SymbolMappingRule.name, schema: SymbolMappingRuleSchema },
    ]),
  ],
  controllers: [SymbolMapperController],
  providers: [SymbolMapperService, SymbolMappingRepository],
  exports: [SymbolMapperService],
})
export class SymbolMapperModule {}

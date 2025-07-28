import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../../../auth/auth.module";

import { SymbolMappingRepository } from '../repositories/symbol-mapping.repository';
import {
  SymbolMappingRuleDocument,
  SymbolMappingRuleDocumentSchema,
} from '../schemas/symbol-mapping-rule.schema';
import { SymbolMapperController } from "../controller/symbol-mapper.controller";
import { SymbolMapperService } from '../service/symbol-mapper.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: SymbolMappingRuleDocument.name, schema: SymbolMappingRuleDocumentSchema },
    ]),
  ],
  controllers: [SymbolMapperController],
  providers: [SymbolMapperService, SymbolMappingRepository],
  exports: [SymbolMapperService],
})
export class SymbolMapperModule {}

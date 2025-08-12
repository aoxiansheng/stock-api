import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../../../auth/module/auth.module";
import { PaginationModule } from "@common/modules/pagination/modules/pagination.module";
import { SharedServicesModule } from "../../shared/module/shared-services.module";
import { FeatureFlags } from "@common/config/feature-flags.config";

import { SymbolMappingRepository } from '../repositories/symbol-mapping.repository';
import {
  SymbolMappingRuleDocument,
  SymbolMappingRuleDocumentSchema,
} from '../schemas/symbol-mapping-rule.schema';
import { SymbolMapperController } from "../controller/symbol-mapper.controller";
import { SymbolMapperService } from '../services/symbol-mapper.service';

@Module({
  imports: [
    AuthModule,
    PaginationModule,
    SharedServicesModule, // 🔥 导入SharedServicesModule以获取MetricsRegistryService
    MongooseModule.forFeature([
      { name: SymbolMappingRuleDocument.name, schema: SymbolMappingRuleDocumentSchema },
    ]),
  ],
  controllers: [SymbolMapperController],
  providers: [
    SymbolMapperService, 
    SymbolMappingRepository,
    FeatureFlags, // 🎯 添加 FeatureFlags 服务
  ],
  exports: [SymbolMapperService],
})
export class SymbolMapperModule {}

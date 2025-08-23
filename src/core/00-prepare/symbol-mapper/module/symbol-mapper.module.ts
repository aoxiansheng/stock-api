import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../../../../auth/module/auth.module";
import { PaginationModule } from "@common/modules/pagination/modules/pagination.module";
import { SharedServicesModule } from "../../../shared/module/shared-services.module";
import { FeatureFlags } from "@common/config/feature-flags.config";

// 导入新的独立缓存模块
import { SymbolMapperCacheModule } from '../../../05-caching/symbol-mapper-cache/module/symbol-mapper-cache.module';
// 导入 Symbol Transformer 服务模块
import { SymbolTransformerModule } from '../../../02-processing/symbol-transformer/module/symbol-transformer.module';

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
    SharedServicesModule, // 🔥 导入SharedServicesModule以获取InfrastructureMetricsRegistryService
    SymbolMapperCacheModule, // 🎯 导入独立的缓存模块
    SymbolTransformerModule, // 🔄 导入 Symbol Transformer 模块
    MongooseModule.forFeature([
      { name: SymbolMappingRuleDocument.name, schema: SymbolMappingRuleDocumentSchema },
    ]),
  ],
  controllers: [SymbolMapperController],
  providers: [
    SymbolMapperService, 
    SymbolMappingRepository,
    FeatureFlags, // 🎯 保留 FeatureFlags 服务
  ],
  exports: [SymbolMapperService],
})
export class SymbolMapperModule {}

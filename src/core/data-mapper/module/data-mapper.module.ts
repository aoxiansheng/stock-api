import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../../../auth/module/auth.module";
import { PaginationModule } from "@common/modules/pagination/modules/pagination.module";
import { FeatureFlags } from "@common/config/feature-flags.config";

import { DataMapperController } from "../controller/data-mapper.controller";
import { DataMapperService } from "../services/data-mapper.service";
import { DataMappingRepository } from "../repositories/data-mapper.repository";
import {
  DataMappingRule,
  DataMappingRuleSchema,
} from "../schemas/data-mapper.schema";

@Module({
  imports: [
    AuthModule,
    PaginationModule,
    MongooseModule.forFeature([
      { name: DataMappingRule.name, schema: DataMappingRuleSchema },
    ]),
  ],
  controllers: [DataMapperController],
  providers: [
    DataMapperService, 
    DataMappingRepository,
    FeatureFlags, // 🎯 添加 FeatureFlags 服务
  ],
  exports: [DataMapperService],
})
export class DataMapperModule {}

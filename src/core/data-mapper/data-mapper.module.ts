import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthModule } from "../../auth/auth.module";

import { DataMapperController } from "./data-mapper.controller";
import { DataMapperService } from "./data-mapper.service";
import { DataMappingRepository } from "./repositories/data-mapper.repository";
import {
  DataMappingRule,
  DataMappingRuleSchema,
} from "./schemas/data-mapper.schema";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: DataMappingRule.name, schema: DataMappingRuleSchema },
    ]),
  ],
  controllers: [DataMapperController],
  providers: [DataMapperService, DataMappingRepository],
  exports: [DataMapperService],
})
export class DataMapperModule {}

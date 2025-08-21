import { Module } from "@nestjs/common";

import { AuthModule } from "../../../../auth/module/auth.module";
import { DataMapperModule } from "../../../00-prepare/data-mapper/module/data-mapper.module";

import { DataTransformerController } from "../controller/data-transformer.controller";
import { DataTransformerService } from "../services/data-transformer.service";

@Module({
  imports: [AuthModule, DataMapperModule],
  controllers: [DataTransformerController],
  providers: [DataTransformerService],
  exports: [DataTransformerService],
})
export class TransformerModule {}

import { Module } from "@nestjs/common";

import { AuthModule as AuthV2Module } from "@authv2/auth.module";
import { DataMapperModule } from "../../../00-prepare/data-mapper/module/data-mapper.module";

import { DataTransformerController } from "../controller/data-transformer.controller";
import { DataTransformerService } from "../services/data-transformer.service";

@Module({
  imports: [
    AuthV2Module,
    DataMapperModule,
  ],
  controllers: [DataTransformerController],
  providers: [DataTransformerService],
  exports: [DataTransformerService],
})
export class TransformerModule {}

import { Module } from "@nestjs/common";

import { AuthModule as AuthV2Module } from "@authv2/auth.module";
import { readIntEnv } from "@common/utils/env.util";
import { DataMapperModule } from "../../../00-prepare/data-mapper/module/data-mapper.module";
import { SymbolTransformerModule } from "../../symbol-transformer/module/symbol-transformer.module";
import { DATATRANSFORM_CONFIG } from "../constants/data-transformer.constants";

import { DataTransformerController } from "../controller/data-transformer.controller";
import {
  DataTransformerService,
  DATA_TRANSFORMER_RUNTIME_CONFIG,
  DataTransformerRuntimeConfig,
} from "../services/data-transformer.service";

@Module({
  imports: [
    AuthV2Module,
    DataMapperModule,
    SymbolTransformerModule,
  ],
  controllers: [DataTransformerController],
  providers: [
    {
      provide: DATA_TRANSFORMER_RUNTIME_CONFIG,
      useFactory: (): DataTransformerRuntimeConfig => ({
        maxArraySize: readIntEnv(
          "DATATRANSFORM_RESTORE_MAX_ARRAY_SIZE",
          DATATRANSFORM_CONFIG.MAX_ARRAY_LENGTH,
          { min: 0, max: 100000 },
        ),
        maxRestoreConcurrency: readIntEnv(
          "DATATRANSFORM_RESTORE_MAX_CONCURRENCY",
          16,
          { min: 1, max: 256 },
        ),
      }),
    },
    DataTransformerService,
  ],
  exports: [DataTransformerService],
})
export class TransformerModule {}

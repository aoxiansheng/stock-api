import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { AuthModule as AuthV2Module } from "@authv2/auth.module";
import { ConfigurationModule } from "@appcore/configuration/config.module";
import { DataMapperModule } from "../../../00-prepare/data-mapper/module/data-mapper.module";
import { SymbolTransformerModule } from "../../symbol-transformer/module/symbol-transformer.module";
import { DATATRANSFORM_CONFIG } from "../constants/data-transformer.constants";

import { DataTransformerController } from "../controller/data-transformer.controller";
import {
  DataTransformerService,
  DATA_TRANSFORMER_RUNTIME_CONFIG,
  DataTransformerRuntimeConfig,
} from "../services/data-transformer.service";

const parseRuntimeInt = (
  value: string | number | null | undefined,
  defaultValue: number,
  min: number,
  max: number,
): number => {
  if (value === undefined || value === null) {
    return defaultValue;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return defaultValue;
  }

  const parsed =
    typeof value === "number" ? value : Number(String(value).trim());

  if (!Number.isInteger(parsed)) {
    return defaultValue;
  }

  if (parsed < min || parsed > max) {
    return defaultValue;
  }

  return parsed;
};

@Module({
  imports: [
    ConfigurationModule,
    AuthV2Module,
    DataMapperModule,
    SymbolTransformerModule,
  ],
  controllers: [DataTransformerController],
  providers: [
    {
      provide: DATA_TRANSFORMER_RUNTIME_CONFIG,
      useFactory: (configService: ConfigService): DataTransformerRuntimeConfig => ({
        maxArraySize: parseRuntimeInt(
          configService.get<string | number>(
            "DATATRANSFORM_RESTORE_MAX_ARRAY_SIZE",
          ),
          DATATRANSFORM_CONFIG.MAX_ARRAY_LENGTH,
          0,
          100000,
        ),
        maxRestoreConcurrency: parseRuntimeInt(
          configService.get<string | number>(
            "DATATRANSFORM_RESTORE_MAX_CONCURRENCY",
          ),
          16,
          1,
          256,
        ),
      }),
      inject: [ConfigService],
    },
    DataTransformerService,
  ],
  exports: [DataTransformerService],
})
export class TransformerModule {}

import { ConfigService } from "@nestjs/config";

import { DATATRANSFORM_CONFIG } from "@core/02-processing/transformer/constants/data-transformer.constants";
import { TransformerModule } from "@core/02-processing/transformer/module/data-transformer.module";
import {
  DATA_TRANSFORMER_RUNTIME_CONFIG,
  DataTransformerRuntimeConfig,
} from "@core/02-processing/transformer/services/data-transformer.service";

describe("TransformerModule runtime config provider", () => {
  const getRuntimeConfigProvider = () => {
    const providers =
      (Reflect.getMetadata("providers", TransformerModule) as any[]) ?? [];
    return providers.find(
      (provider) =>
        provider && provider.provide === DATA_TRANSFORMER_RUNTIME_CONFIG,
    );
  };

  const runFactory = (
    values: Record<string, string | number | null | undefined>,
  ): DataTransformerRuntimeConfig => {
    const provider = getRuntimeConfigProvider();
    const configService = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;

    return provider.useFactory(configService);
  };

  it("默认值：未配置时使用 MAX_ARRAY_LENGTH 与 16", () => {
    const provider = getRuntimeConfigProvider();
    expect(provider).toBeDefined();
    expect(provider.inject).toEqual([ConfigService]);

    const runtimeConfig = runFactory({});
    expect(runtimeConfig).toEqual({
      maxArraySize: DATATRANSFORM_CONFIG.MAX_ARRAY_LENGTH,
      maxRestoreConcurrency: 16,
    });
  });

  it("边界收敛：非法值回退默认值，合法值按整数解析", () => {
    const invalidRuntimeConfig = runFactory({
      DATATRANSFORM_RESTORE_MAX_ARRAY_SIZE: " ",
      DATATRANSFORM_RESTORE_MAX_CONCURRENCY: "257",
    });
    expect(invalidRuntimeConfig).toEqual({
      maxArraySize: DATATRANSFORM_CONFIG.MAX_ARRAY_LENGTH,
      maxRestoreConcurrency: 16,
    });

    const validRuntimeConfig = runFactory({
      DATATRANSFORM_RESTORE_MAX_ARRAY_SIZE: "99999",
      DATATRANSFORM_RESTORE_MAX_CONCURRENCY: 32,
    });
    expect(validRuntimeConfig).toEqual({
      maxArraySize: 99999,
      maxRestoreConcurrency: 32,
    });
  });
});

import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { getSchemaPath } from "@nestjs/swagger";
import { MODULE_METADATA } from "@nestjs/common/constants";

import { QueryRequestDto } from "@core/01-entry/query/dto/query-request.dto";
import { SupportListQueryController } from "@core/01-entry/query/controller/support-list-query.controller";
import { QueryModule } from "@core/01-entry/query/module/query.module";
import {
  SupportListDeltaResponseDto,
  SupportListFullResponseDto,
  SupportListResyncRequiredResponseDto,
} from "@core/01-entry/query/dto/query-support-list-response.dto";
import { StorageModule } from "@core/04-storage/storage/module/storage.module";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";

function getSwaggerPropertyMetadata(propertyKey: "startTime" | "endTime") {
  return Reflect.getMetadata(
    DECORATORS.API_MODEL_PROPERTIES,
    QueryRequestDto.prototype,
    propertyKey,
  ) as {
    description?: string;
    example?: unknown;
  };
}

describe("QueryRequestDto Swagger 契约", () => {
  it("startTime 文档应声明交易日格式与生效条件", () => {
    const metadata = getSwaggerPropertyMetadata("startTime");

    expect(metadata.description).toContain("YYYYMMDD/YYYY-MM-DD");
    expect(metadata.description).toContain(
      `queryTypeFilter=${CAPABILITY_NAMES.GET_TRADING_DAYS}`,
    );
    expect(metadata.description).not.toContain("by_time_range");
    expect(metadata.example).toBe("20260101");
  });

  it("endTime 文档应声明交易日格式与生效条件", () => {
    const metadata = getSwaggerPropertyMetadata("endTime");

    expect(metadata.description).toContain("YYYYMMDD/YYYY-MM-DD");
    expect(metadata.description).toContain(
      `queryTypeFilter=${CAPABILITY_NAMES.GET_TRADING_DAYS}`,
    );
    expect(metadata.description).not.toContain("by_time_range");
    expect(metadata.example).toBe("20260131");
  });
});

describe("SupportListQueryController Swagger 契约", () => {
  it("getSupportList 应使用单个 200 响应，且 data 为 full/delta oneOf", () => {
    const responses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      SupportListQueryController.prototype.getSupportList,
    ) as Record<string, { schema?: { properties?: { data?: unknown } } }>;

    expect(responses).toBeDefined();
    expect(Object.keys(responses).filter((key) => key === "200")).toHaveLength(1);

    const okResponse = responses["200"];
    const dataSchema = okResponse?.schema?.properties?.data as
      | { oneOf?: Array<{ $ref: string }> }
      | undefined;

    expect(dataSchema?.oneOf).toHaveLength(2);
    expect(dataSchema?.oneOf).toEqual(
      expect.arrayContaining([
        { $ref: getSchemaPath(SupportListFullResponseDto) },
        { $ref: getSchemaPath(SupportListDeltaResponseDto) },
      ]),
    );
  });

  it("getSupportList 应声明 full/delta 额外模型", () => {
    const extraModels = Reflect.getMetadata(
      DECORATORS.API_EXTRA_MODELS,
      SupportListQueryController.prototype.getSupportList,
    ) as unknown[] | undefined;

    expect(extraModels).toEqual(
      expect.arrayContaining([
        SupportListFullResponseDto,
        SupportListDeltaResponseDto,
        SupportListResyncRequiredResponseDto,
      ]),
    );
  });

  it("getSupportList 应声明 409 且错误码为 SUPPORT_LIST_RESYNC_REQUIRED", () => {
    const responses = Reflect.getMetadata(
      DECORATORS.API_RESPONSE,
      SupportListQueryController.prototype.getSupportList,
    ) as Record<string, { schema?: { $ref?: string } }>;

    const conflictResponse = responses?.["409"];
    expect(conflictResponse).toBeDefined();
    expect(conflictResponse?.schema?.$ref).toBe(
      getSchemaPath(SupportListResyncRequiredResponseDto),
    );
  });
});

describe("QueryModule 装配契约", () => {
  it("应显式导入 StorageModule，避免 QueryExecutionEngine DI 断链", () => {
    const imports = Reflect.getMetadata(
      MODULE_METADATA.IMPORTS,
      QueryModule,
    ) as unknown[] | undefined;

    expect(imports).toBeDefined();
    expect(imports).toContain(StorageModule);
  });
});

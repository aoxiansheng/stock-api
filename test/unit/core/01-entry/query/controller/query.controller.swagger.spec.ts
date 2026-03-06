import { DECORATORS } from "@nestjs/swagger/dist/constants";

import { QueryRequestDto } from "@core/01-entry/query/dto/query-request.dto";
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

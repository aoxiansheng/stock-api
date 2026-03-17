import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { API_OPERATIONS } from "@common/constants/domain";
import { StreamSubscribeDto } from "@core/01-entry/stream-receiver/dto";

describe("StreamSubscribeDto", () => {
  it("缺省 wsCapabilityType 时应回填 STREAM_QUOTE，sessionId 可选", async () => {
    const dto = plainToInstance(StreamSubscribeDto, {
      symbols: ["AAPL.US"],
      token: "jwt-token",
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.wsCapabilityType).toBe(API_OPERATIONS.STOCK_DATA.STREAM_QUOTE);
    expect(dto.sessionId).toBeUndefined();
  });

  it("symbols 超出上限时返回校验错误", async () => {
    const dto = plainToInstance(StreamSubscribeDto, {
      symbols: Array.from({ length: 51 }, (_, index) => `SYM${index}.US`),
      token: "jwt-token",
    });

    const errors = await validate(dto);
    const symbolsError = errors.find((error) => error.property === "symbols");

    expect(symbolsError?.constraints).toHaveProperty("arrayMaxSize");
  });

  it("sessionId 为空白字符串时返回校验错误", async () => {
    const dto = plainToInstance(StreamSubscribeDto, {
      symbols: ["AAPL.US"],
      sessionId: "   ",
    });

    const errors = await validate(dto);
    const sessionIdError = errors.find((error) => error.property === "sessionId");

    expect(dto.sessionId).toBe("");
    expect(sessionIdError?.constraints).toHaveProperty("isNotEmpty");
  });
});

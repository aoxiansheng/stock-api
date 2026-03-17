import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { IntradayReleaseRequestDto } from "@core/01-entry/receiver/dto/intraday-release-request.dto";

describe("IntradayReleaseRequestDto", () => {
  it("symbol 为必填，market 会规范化", async () => {
    const dto = plainToInstance(IntradayReleaseRequestDto, {
      symbol: "AAPL.US",
      market: "us",
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.market).toBe("US");
  });

  it("缺少 symbol 时返回校验错误", async () => {
    const dto = plainToInstance(IntradayReleaseRequestDto, {});

    const errors = await validate(dto);
    const symbolError = errors.find((error) => error.property === "symbol");

    expect(symbolError?.constraints).toHaveProperty("isNotEmpty");
  });
});

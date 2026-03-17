import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { IntradayDeltaRequestDto } from "@core/01-entry/receiver/dto/intraday-delta-request.dto";

describe("IntradayDeltaRequestDto", () => {
  it("合法请求应通过校验，并规范化 market", async () => {
    const dto = plainToInstance(IntradayDeltaRequestDto, {
      symbol: "AAPL.US",
      market: "us",
      cursor: "signed-cursor",
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.market).toBe("US");
    expect(dto.limit).toBe(2000);
    expect(dto.strictProviderConsistency).toBe(false);
  });

  it("缺少 cursor 时返回校验错误", async () => {
    const dto = plainToInstance(IntradayDeltaRequestDto, {
      symbol: "AAPL.US",
    });

    const errors = await validate(dto);
    const cursorError = errors.find((error) => error.property === "cursor");

    expect(cursorError?.constraints).toHaveProperty("isNotEmpty");
  });
});

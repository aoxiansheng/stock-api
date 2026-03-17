import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { IntradayDeltaRequestDto } from "@core/01-entry/receiver/dto/intraday-delta-request.dto";

describe("IntradayDeltaRequestDto", () => {
  const VALID_SESSION_ID =
    "chart_session_7b7f3e1c6cb84f1494f8f1b31580aa4a";

  it("合法请求应通过校验，并规范化 sessionId", async () => {
    const dto = plainToInstance(IntradayDeltaRequestDto, {
      symbol: "AAPL.US",
      market: "us",
      cursor: "signed-cursor",
      sessionId: `  ${VALID_SESSION_ID}  `,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.market).toBe("US");
    expect(dto.limit).toBe(2000);
    expect(dto.strictProviderConsistency).toBe(false);
    expect(dto.sessionId).toBe(VALID_SESSION_ID);
  });

  it("缺少 sessionId 时返回校验错误", async () => {
    const dto = plainToInstance(IntradayDeltaRequestDto, {
      symbol: "AAPL.US",
      cursor: "signed-cursor",
    });

    const errors = await validate(dto);
    const sessionIdError = errors.find((error) => error.property === "sessionId");

    expect(sessionIdError?.constraints).toHaveProperty("isNotEmpty");
  });

  it("sessionId 为空白字符串时返回校验错误", async () => {
    const dto = plainToInstance(IntradayDeltaRequestDto, {
      symbol: "AAPL.US",
      cursor: "signed-cursor",
      sessionId: "   ",
    });

    const errors = await validate(dto);
    const sessionIdError = errors.find((error) => error.property === "sessionId");

    expect(dto.sessionId).toBe("");
    expect(sessionIdError?.constraints).toHaveProperty("isNotEmpty");
  });

  it("sessionId 非法格式时返回校验错误", async () => {
    const dto = plainToInstance(IntradayDeltaRequestDto, {
      symbol: "AAPL.US",
      cursor: "signed-cursor",
      sessionId: "bad-session-id",
    });

    const errors = await validate(dto);
    const sessionIdError = errors.find((error) => error.property === "sessionId");

    expect(sessionIdError?.constraints).toHaveProperty("matches");
  });

  it("sessionId 超长时返回校验错误", async () => {
    const dto = plainToInstance(IntradayDeltaRequestDto, {
      symbol: "AAPL.US",
      cursor: "signed-cursor",
      sessionId: `chart_session_${"a".repeat(65)}`,
    });

    const errors = await validate(dto);
    const sessionIdError = errors.find((error) => error.property === "sessionId");

    expect(sessionIdError?.constraints).toHaveProperty("maxLength");
  });
});

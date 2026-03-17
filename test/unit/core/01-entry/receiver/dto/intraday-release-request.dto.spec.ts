import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

import { IntradayReleaseRequestDto } from "@core/01-entry/receiver/dto/intraday-release-request.dto";

describe("IntradayReleaseRequestDto", () => {
  const VALID_SESSION_ID =
    "chart_session_7b7f3e1c6cb84f1494f8f1b31580aa4a";

  it("symbol 与 sessionId 为必填，market 与 sessionId 会规范化", async () => {
    const dto = plainToInstance(IntradayReleaseRequestDto, {
      symbol: "AAPL.US",
      market: "us",
      sessionId: `  ${VALID_SESSION_ID}  `,
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.market).toBe("US");
    expect(dto.sessionId).toBe(VALID_SESSION_ID);
  });

  it("缺少 sessionId 时返回校验错误", async () => {
    const dto = plainToInstance(IntradayReleaseRequestDto, {
      symbol: "AAPL.US",
    });

    const errors = await validate(dto);
    const sessionIdError = errors.find((error) => error.property === "sessionId");

    expect(sessionIdError?.constraints).toHaveProperty("isNotEmpty");
  });

  it("sessionId 为空白字符串时返回校验错误", async () => {
    const dto = plainToInstance(IntradayReleaseRequestDto, {
      symbol: "AAPL.US",
      sessionId: "   ",
    });

    const errors = await validate(dto);
    const sessionIdError = errors.find((error) => error.property === "sessionId");

    expect(dto.sessionId).toBe("");
    expect(sessionIdError?.constraints).toHaveProperty("isNotEmpty");
  });

  it("sessionId 非法格式时返回校验错误", async () => {
    const dto = plainToInstance(IntradayReleaseRequestDto, {
      symbol: "AAPL.US",
      sessionId: "session-123",
    });

    const errors = await validate(dto);
    const sessionIdError = errors.find((error) => error.property === "sessionId");

    expect(sessionIdError?.constraints).toHaveProperty("matches");
  });

  it("sessionId 超长时返回校验错误", async () => {
    const dto = plainToInstance(IntradayReleaseRequestDto, {
      symbol: "AAPL.US",
      sessionId: `chart_session_${"a".repeat(65)}`,
    });

    const errors = await validate(dto);
    const sessionIdError = errors.find((error) => error.property === "sessionId");

    expect(sessionIdError?.constraints).toHaveProperty("maxLength");
  });
});

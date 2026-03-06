import {
  buildInfowayFixedError,
  sanitizeInfowayUpstreamMessage,
} from "@providersv2/providers/infoway/utils/infoway-error.util";

describe("infoway-error.util", () => {
  it("兼容 key=value 与 key:value 形式脱敏", () => {
    const sanitized = sanitizeInfowayUpstreamMessage(
      "apiKey=abc token:xyz authorization : Bearer123 api_key = secret",
    );

    expect(sanitized).toBe(
      "apiKey=[REDACTED] token=[REDACTED] authorization=[REDACTED] api_key=[REDACTED]",
    );
  });

  it.each([
    "Authorization: Bearer header.payload.signature",
    "authorization=Bearer header.payload.signature",
    "AUTHORIZATION : bEaReR header.payload.signature",
  ])("Bearer token 文本会被整段脱敏: %s", (input) => {
    const sanitized = sanitizeInfowayUpstreamMessage(input);

    expect(sanitized.toLowerCase()).toContain("authorization=[redacted]");
    expect(sanitized).not.toContain("header.payload.signature");
    expect(sanitized.toLowerCase()).not.toContain("bearer");
  });

  it("Bearer + 分隔符变体不会泄露 token", () => {
    const sanitized = sanitizeInfowayUpstreamMessage(
      "Authorization=Bearer aaa.bbb.ccc, token:xyz; reason=denied",
    );

    expect(sanitized).toContain("Authorization=[REDACTED]");
    expect(sanitized).toContain("token=[REDACTED]");
    expect(sanitized).not.toContain("aaa.bbb.ccc");
  });

  it("JSON 字符串中的敏感字段会被脱敏", () => {
    const sanitized = sanitizeInfowayUpstreamMessage(
      JSON.stringify({
        message: "upstream failed",
        apiKey: "raw-key",
        nested: {
          token: "raw-token",
          authorization: "Bearer raw-auth",
          api_key: "raw-api-key",
        },
      }),
    );

    expect(sanitized).toBe(
      "{\"message\":\"upstream failed\",\"apiKey\":\"[REDACTED]\",\"nested\":{\"token\":\"[REDACTED]\",\"authorization\":\"[REDACTED]\",\"api_key\":\"[REDACTED]\"}}",
    );
  });

  it("对象入参中的敏感字段会被脱敏", () => {
    const sanitized = sanitizeInfowayUpstreamMessage({
      trace: "test-trace",
      token: "raw-token",
      Authorization: "Bearer raw-auth",
    });

    expect(sanitized).toContain("\"trace\":\"test-trace\"");
    expect(sanitized).toContain("\"token\":\"[REDACTED]\"");
    expect(sanitized).toContain("\"Authorization\":\"[REDACTED]\"");
  });

  it("过长日志会被截断", () => {
    const sanitized = sanitizeInfowayUpstreamMessage(`token=secret ${"x".repeat(260)}`);

    expect(sanitized).toHaveLength(203);
    expect(sanitized.endsWith("...")).toBe(true);
  });

  it("buildInfowayFixedError 会写入脱敏后的上游信息", () => {
    const error = buildInfowayFixedError("quote", {
      ret: 500,
      msg: "{\"token\":\"raw-token\",\"reason\":\"denied\"}",
    });

    expect(error).toMatchObject({
      context: {
        upstream: {
          ret: 500,
          msg: "{\"token\":\"[REDACTED]\",\"reason\":\"denied\"}",
        },
      },
    });
  });
});

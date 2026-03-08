jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  sanitizeLogData: (data: unknown) => data,
}));

import { DataTransformerService } from "@core/02-processing/transformer/services/data-transformer.service";
import { sanitizeInfowayUpstreamMessage } from "@providersv2/providers/infoway/utils/infoway-error.util";

// 该文件用于验证现状行为契约，避免关键行为回归。
describe("Critical group verification", () => {
  const configService = {
    get: jest.fn(() => undefined),
  };

  it.each(["AAPL.US", "600000.SH", "000001.SZ"])(
    "restoreStandardSymbols 对已标准符号 %s 保持不变",
    async (standardSymbol) => {
      const symbolTransformerService = {
        transformSingleSymbol: jest.fn(async () => standardSymbol),
      };

      const service = new DataTransformerService(
        {} as any,
        symbolTransformerService as any,
        {
          maxArraySize: 10,
          maxRestoreConcurrency: 2,
        },
        configService as any,
      );

      await expect(
        (service as any).restoreStandardSymbols("longport", {
          symbol: standardSymbol,
        }),
      ).resolves.toMatchObject({
        symbol: standardSymbol,
      });
    },
  );

  it("sanitizeInfowayUpstreamMessage 会脱敏 Authorization Bearer token", () => {
    const token = "abc.def.ghi";
    const sanitized = sanitizeInfowayUpstreamMessage(
      `Authorization: Bearer ${token}`,
    );

    expect(sanitized).toBe("Authorization=[REDACTED]");
    expect(sanitized).not.toContain(token);
  });
});

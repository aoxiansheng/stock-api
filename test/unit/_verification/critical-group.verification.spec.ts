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

describe("Critical group verification", () => {
  it.each(["AAPL.US", "600000.SH", "000001.SZ"])(
    "restoreStandardSymbols 会把已标准符号 %s 误判为未映射",
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
      );

      await expect(
        (service as any).restoreStandardSymbols("longport", {
          symbol: standardSymbol,
        }),
      ).rejects.toMatchObject({
        message: expect.stringContaining("No standard symbol mapping found"),
        context: expect.objectContaining({
          symbol: standardSymbol,
          restoredSymbol: standardSymbol,
        }),
      });
    },
  );

  it("sanitizeInfowayUpstreamMessage 在 Authorization: Bearer <token> 下会残留 token", () => {
    const token = "abc.def.ghi";
    const sanitized = sanitizeInfowayUpstreamMessage(
      `Authorization: Bearer ${token}`,
    );

    expect(sanitized).toBe(`Authorization=[REDACTED] ${token}`);
    expect(sanitized).toContain(token);
  });
});

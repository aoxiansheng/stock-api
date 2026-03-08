jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

import { MappingDirection } from "@core/shared/constants";
import { SymbolTransformerService } from "@core/02-processing/symbol-transformer/services/symbol-transformer.service";

describe("SymbolTransformerService 标准符号判定", () => {
  const buildService = () => {
    const symbolMapperCacheService = {
      mapSymbols: jest.fn(async (_provider: string, symbols: string[]) => {
        const mappingDetails: Record<string, string> = {};
        for (const symbol of symbols) {
          mappingDetails[symbol] = symbol;
        }
        return {
          mappingDetails,
          failedSymbols: [],
        };
      }),
    };

    const service = new SymbolTransformerService(
      symbolMapperCacheService as any,
    );

    return {
      service,
      symbolMapperCacheService,
    };
  };

  it.each(["AAPL.US", "600519.SH", "000001.SZ", "00700.HK"])(
    "to_standard 未命中映射时，标准符号 %s 允许原样返回",
    async (symbol) => {
      const { service, symbolMapperCacheService } = buildService();

      await expect(
        service.transformSingleSymbol(
          "infoway",
          symbol,
          MappingDirection.TO_STANDARD,
        ),
      ).resolves.toBe(symbol);

      expect(symbolMapperCacheService.mapSymbols).toHaveBeenCalledWith(
        "infoway",
        [symbol],
        MappingDirection.TO_STANDARD,
        expect.any(String),
      );
    },
  );

  it("to_standard 未命中映射时，provider 专有符号仍应被拦截", async () => {
    const { service } = buildService();

    await expect(
      service.transformSingleSymbol(
        "longport",
        "LP_AAPL",
        MappingDirection.TO_STANDARD,
      ),
    ).rejects.toMatchObject({
      message: expect.stringContaining(
        "No symbol mapping found for provider 'longport' and symbol 'LP_AAPL'",
      ),
      context: expect.objectContaining({
        reason: "provider_symbol_silent_fallback_blocked",
      }),
    });
  });
});

import { ConfigService } from "@nestjs/config";

import { BusinessErrorCode } from "@common/core/exceptions";
import { CoinGeckoContextService } from "@providersv2/providers/coingecko/services/coingecko-context.service";

function createConfigService(values: Record<string, any>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as any;
}

function createService(
  configValues: Record<string, any> = {},
): CoinGeckoContextService {
  const service = new CoinGeckoContextService(
    createConfigService({
      COINGECKO_VS_CURRENCY: "usd",
      ...configValues,
    }),
  );
  (service as any).client = {
    get: jest.fn(),
  };
  return service;
}

describe("CoinGeckoContextService", () => {
  it("testConnection: ping 成功时返回 true", async () => {
    const service = createService();
    (service as any).client.get.mockResolvedValue({
      data: {
        gecko_says: "(V3) To the Moon!",
      },
    });

    await expect(service.testConnection()).resolves.toBe(true);
    expect((service as any).client.get).toHaveBeenCalledWith(
      "/ping",
      expect.objectContaining({
        headers: {},
      }),
    );
  });

  it("getCryptoBasicInfo: 调用 coins/markets 并返回标准 symbol 基础信息", async () => {
    const service = createService();
    (service as any).client.get.mockResolvedValue({
      data: [
        {
          id: "bitcoin",
          symbol: "btc",
          name: "Bitcoin",
          current_price: 68000.12,
          market_cap: 1340000000000,
          market_cap_rank: 1,
          fully_diluted_valuation: 1428000000000,
          circulating_supply: 19700000,
          total_supply: 21000000,
          max_supply: 21000000,
        },
      ],
    });

    const result = await service.getCryptoBasicInfo(["BTCUSDT"]);

    expect((service as any).client.get).toHaveBeenCalledWith(
      "/coins/markets",
      expect.objectContaining({
        params: expect.objectContaining({
          vs_currency: "usd",
          symbols: "btc",
          include_tokens: "top",
        }),
      }),
    );
    expect(result).toEqual([
      {
        symbol: "BTCUSDT",
        market: "CRYPTO",
        name_en: "Bitcoin",
        exchange: "COINGECKO",
        currency: "USD",
        board: "CRYPTO",
        current_price: 68000.12,
        market_cap: 1340000000000,
        market_cap_rank: 1,
        circulating_supply: 19700000,
        total_supply: 21000000,
        max_supply: 21000000,
        fully_diluted_valuation: 1428000000000,
        coingecko_id: "bitcoin",
        coingecko_symbol: "BTC",
        quote_symbol: "USDT",
      },
    ]);
  });

  it("getCryptoBasicInfo: bare symbol 也可直接查询", async () => {
    const service = createService();
    (service as any).client.get.mockResolvedValue({
      data: [
        {
          id: "bitcoin",
          symbol: "btc",
          name: "Bitcoin",
          market_cap_rank: 1,
        },
      ],
    });

    const result = await service.getCryptoBasicInfo(["BTC"]);

    expect(result).toEqual([
      expect.objectContaining({
        symbol: "BTC",
        coingecko_symbol: "BTC",
        quote_symbol: null,
      }),
    ]);
  });

  it("getCryptoBasicInfo: 响应非数组时抛结构化业务异常", async () => {
    const service = createService();
    (service as any).client.get.mockResolvedValue({
      data: {
        id: "bitcoin",
      },
    });

    await expect(service.getCryptoBasicInfo(["BTCUSDT"])).rejects.toMatchObject({
      errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
      message: "CoinGecko crypto-basic-info 响应异常",
      operation: "crypto-basic-info",
      context: expect.objectContaining({
        provider: "coingecko",
      }),
    });
  });
});

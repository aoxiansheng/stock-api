import { ConfigService } from "@nestjs/config";

import { InfowayContextService } from "@providersv2/providers/infoway/services/infoway-context.service";

function createConfigService(values: Record<string, any>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as any;
}

describe("InfowayContextService#getTradingDays", () => {
  function createService(): InfowayContextService {
    const service = new InfowayContextService(
      createConfigService({
        INFOWAY_API_KEY: "test-api-key",
      }),
    );
    (service as any).client = {
      get: jest.fn(),
    };
    return service;
  }

  it("symbols 混合市场且未显式传 market 时抛参数错误", async () => {
    const service = createService();

    await expect(
      service.getTradingDays({
        symbols: ["AAPL.US", "00700.HK"],
      }),
    ).rejects.toThrow("symbols 包含多个市场");

    expect((service as any).client.get).not.toHaveBeenCalled();
  });

  it("显式传入非法 market 时直接抛参数错误，不再从 symbols 推断", async () => {
    const service = createService();

    await expect(
      service.getTradingDays({
        market: "INVALID",
        symbols: ["AAPL.US"],
      }),
    ).rejects.toThrow("market 必须是合法市场代码");

    expect((service as any).client.get).not.toHaveBeenCalled();
  });

  it("beginDay 非法时抛参数错误并阻断上游请求", async () => {
    const service = createService();

    await expect(
      service.getTradingDays({
        market: "US",
        beginDay: "2024/13/40",
      }),
    ).rejects.toThrow("beginDay 必须是合法日期");

    expect((service as any).client.get).not.toHaveBeenCalled();
  });

  it("beginDay 大于 endDay 时稳定报错并阻断上游请求", async () => {
    const service = createService();

    await expect(
      service.getTradingDays({
        market: "US",
        beginDay: "2024-03-02",
        endDay: "2024-03-01",
      }),
    ).rejects.toThrow("beginDay 不能晚于 endDay");

    expect((service as any).client.get).not.toHaveBeenCalled();
  });

  it("成功路径：market 缺失时可从 symbols 推断并返回交易日", async () => {
    const service = createService();

    (service as any).client.get.mockResolvedValue({
      data: {
        ret: 200,
        data: {
          trade_days: ["20240301", "20240304"],
          half_trade_days: ["20240305"],
        },
      },
    });

    const result = await service.getTradingDays({
      symbols: ["AAPL.US"],
      beginDay: "2024-03-01",
      endDay: "2024-03-05",
    });

    expect((service as any).client.get).toHaveBeenCalledWith(
      "/common/basic/markets/trading_days",
      expect.objectContaining({
        params: {
          market: "US",
          beginDay: "20240301",
          endDay: "20240305",
        },
      }),
    );
    expect(result).toEqual([
      {
        market: "US",
        beginDay: "20240301",
        endDay: "20240305",
        tradeDays: ["20240301", "20240304"],
        halfTradeDays: ["20240305"],
        sourceProvider: "infoway",
      },
    ]);
  });
});

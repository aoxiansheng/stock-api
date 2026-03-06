import { ConfigService } from "@nestjs/config";

import { BusinessErrorCode } from "@common/core/exceptions";
import { InfowayContextService } from "@providersv2/providers/infoway/services/infoway-context.service";

function createConfigService(values: Record<string, any>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as any;
}

describe("InfowayContextService#getTradingDays", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

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

    await expect(service.getTradingDays({
      symbols: ["AAPL.US", "00700.HK"],
    })).rejects.toMatchObject({
      message: expect.stringContaining("symbols 包含多个市场"),
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
    });

    expect((service as any).client.get).not.toHaveBeenCalled();
  });

  it("显式传入非法 market 时直接抛参数错误，不再从 symbols 推断", async () => {
    const service = createService();

    await expect(service.getTradingDays({
      market: "INVALID",
      symbols: ["AAPL.US"],
    })).rejects.toMatchObject({
      message: expect.stringContaining("market 必须是合法市场代码"),
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
    });

    expect((service as any).client.get).not.toHaveBeenCalled();
  });

  it("beginDay 非法时抛参数错误并阻断上游请求", async () => {
    const service = createService();

    await expect(service.getTradingDays({
      market: "US",
      beginDay: "2024/13/40",
    })).rejects.toMatchObject({
      message: expect.stringContaining("beginDay 必须是合法日期"),
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
    });

    expect((service as any).client.get).not.toHaveBeenCalled();
  });

  it("beginDay 大于 endDay 时稳定报错并阻断上游请求", async () => {
    const service = createService();

    await expect(service.getTradingDays({
      market: "US",
      beginDay: "2024-03-02",
      endDay: "2024-03-01",
    })).rejects.toMatchObject({
      message: expect.stringContaining("beginDay 不能晚于 endDay"),
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
    });

    expect((service as any).client.get).not.toHaveBeenCalled();
  });

  it("日期跨度超过上限时抛参数错误并阻断上游请求", async () => {
    const service = createService();

    await expect(service.getTradingDays({
      market: "US",
      beginDay: "2024-01-01",
      endDay: "2025-02-05",
    })).rejects.toMatchObject({
      message: expect.stringContaining("日期跨度不能超过 366 天"),
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
    });

    expect((service as any).client.get).not.toHaveBeenCalled();
  });

  it("日期跨度等于 366 天时允许请求上游", async () => {
    const service = createService();
    (service as any).client.get.mockResolvedValue({
      data: {
        ret: 200,
        data: {
          trade_days: [],
          half_trade_days: [],
        },
      },
    });

    await expect(
      service.getTradingDays({
        market: "US",
        beginDay: "2024-01-01",
        endDay: "2024-12-31",
      }),
    ).resolves.toEqual([
      {
        market: "US",
        beginDay: "20240101",
        endDay: "20241231",
        tradeDays: [],
        halfTradeDays: [],
        sourceProvider: "infoway",
      },
    ]);

    expect((service as any).client.get).toHaveBeenCalledTimes(1);
  });

  it.each([
    { market: "US", beginDay: "20240130", endDay: "20240229" },
    { market: "HK", beginDay: "20240131", endDay: "20240301" },
    { market: "CN", beginDay: "20240131", endDay: "20240301" },
  ])(
    "未传 begin/end 时按 $market 市场时区计算默认日期",
    async ({ market, beginDay, endDay }) => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date("2024-03-01T01:00:00.000Z"));

      const service = createService();
      (service as any).client.get.mockResolvedValue({
        data: {
          ret: 200,
          data: {
            trade_days: [],
            half_trade_days: [],
          },
        },
      });

      await service.getTradingDays({ market });

      expect((service as any).client.get).toHaveBeenCalledWith(
        "/common/basic/markets/trading_days",
        expect.objectContaining({
          params: {
            market,
            beginDay,
            endDay,
          },
        }),
      );
    },
  );

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

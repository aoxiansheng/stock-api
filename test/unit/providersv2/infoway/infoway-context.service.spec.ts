import { ConfigService } from "@nestjs/config";

import { InfowayContextService } from "@providersv2/providers/infoway/services/infoway-context.service";

function createConfigService(values: Record<string, any>): ConfigService {
  return {
    get: (key: string) => values[key],
  } as any;
}

function createService(configValues: Record<string, any> = {}): InfowayContextService {
  const service = new InfowayContextService(
    createConfigService({
      INFOWAY_API_KEY: "test-api-key",
      ...configValues,
    }),
  );
  (service as any).client = {
    get: jest.fn(),
    post: jest.fn(),
  };
  return service;
}

describe("InfowayContextService", () => {
  it("INFOWAY_API_KEY 缺失时快速失败并阻断请求", async () => {
    const previousApiKey = process.env.INFOWAY_API_KEY;
    delete process.env.INFOWAY_API_KEY;

    try {
      const service = new InfowayContextService(createConfigService({}));
      (service as any).client = {
        get: jest.fn(),
        post: jest.fn(),
      };

      await expect(service.getStockQuote(["AAPL.US"])).rejects.toThrow(
        "INFOWAY_API_KEY 未配置",
      );
      expect((service as any).client.post).not.toHaveBeenCalled();
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.INFOWAY_API_KEY;
      } else {
        process.env.INFOWAY_API_KEY = previousApiKey;
      }
    }
  });

  it("getStockQuote: 上游 ret 异常时抛固定错误", async () => {
    const service = createService();
    (service as any).client.post.mockResolvedValue({
      data: {
        ret: 500,
        msg: "upstream failed",
        data: [],
      },
    });

    await expect(service.getStockQuote(["AAPL.US"])).rejects.toThrow(
      "Infoway quote 响应异常",
    );
  });

  it("getStockQuote: 成功映射并过滤脏数据", async () => {
    const service = createService();
    (service as any).client.post.mockResolvedValue({
      data: {
        ret: 200,
        data: [
          {
            s: "AAPL.US",
            respList: [
              {
                c: "182.31",
                pca: "1.31",
                o: "181.00",
                h: "183.50",
                l: "180.20",
                v: "123456",
                vw: "22500000",
                pc: "0.72",
                t: "1709251200",
              },
            ],
          },
          {
            s: "TSLA.US",
            respList: [
              {
                c: "200.11",
                t: "2024-03-01T09:30:00Z",
              },
            ],
          },
        ],
      },
    });

    const result = await service.getStockQuote(["AAPL.US", "TSLA.US"]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      symbol: "AAPL.US",
      lastPrice: 182.31,
      previousClose: 181,
      sourceProvider: "infoway",
      sourceSymbol: "AAPL.US",
    });
  });

  it("getMarketStatus: data 结构异常时抛固定错误", async () => {
    const service = createService();
    (service as any).client.get.mockResolvedValue({
      data: {
        ret: 200,
        data: {
          market: "US",
        },
      },
    });

    await expect(service.getMarketStatus(["US"])).rejects.toThrow(
      "Infoway market-status 响应异常",
    );
  });

  it("getMarketStatus: 正确映射并按传入市场过滤", async () => {
    const service = createService();
    (service as any).client.get.mockResolvedValue({
      data: {
        ret: 200,
        data: [
          {
            market: "US",
            remark: "open",
            trade_schedules: [
              {
                begin_time: "09:30",
                end_time: "16:00",
                type: "Normal",
              },
              {
                begin_time: "",
                end_time: "12:00",
                type: "Half",
              },
            ],
          },
          {
            market: "BAD",
            remark: "invalid",
          },
        ],
      },
    });

    const result = await service.getMarketStatus(["US"]);

    expect(result).toEqual([
      {
        market: "US",
        remark: "open",
        tradeSchedules: [
          {
            beginTime: "09:30",
            endTime: "16:00",
            type: "Normal",
          },
        ],
        sourceProvider: "infoway",
      },
    ]);
  });

  it("getStockBasicInfo: data 结构异常时抛固定错误", async () => {
    const service = createService();
    (service as any).client.get.mockResolvedValue({
      data: {
        ret: 200,
        data: {
          symbol: "AAPL.US",
        },
      },
    });

    await expect(service.getStockBasicInfo(["AAPL.US"])).rejects.toThrow(
      "Infoway basic-info 响应异常",
    );
  });

  it("getStockBasicInfo: 正确映射核心字段", async () => {
    const service = createService();
    (service as any).client.get.mockResolvedValue({
      data: {
        ret: 200,
        data: [
          {
            symbol: "AAPL.US",
            market: "US",
            name_cn: "苹果",
            name_en: "Apple",
            exchange: "NASDAQ",
            currency: "USD",
            lot_size: 1,
            total_shares: 1000,
            circulating_shares: 900,
            hk_shares: 0,
            stock_derivatives: "WARRANT,OPTION",
          },
        ],
      },
    });

    const result = await service.getStockBasicInfo(["AAPL.US"]);

    expect((service as any).client.get).toHaveBeenCalledWith(
      "/common/basic/symbols/info",
      expect.objectContaining({
        params: {
          type: "STOCK_US",
          symbols: "AAPL.US",
        },
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        symbol: "AAPL.US",
        market: "US",
        nameCn: "苹果",
        nameEn: "Apple",
        exchange: "NASDAQ",
        currency: "USD",
        lotSize: 1,
        totalShares: 1000,
        circulatingShares: 900,
        hkShares: 0,
        stockDerivatives: ["WARRANT", "OPTION"],
        sourceProvider: "infoway",
      }),
    ]);
  });

  it("关键数值配置非法时回退默认值", () => {
    const service = createService({
      INFOWAY_HTTP_TIMEOUT_MS: "bad-timeout",
      INFOWAY_QUOTE_KLINE_TYPE: 0,
      INFOWAY_QUOTE_KLINE_NUM: -2,
    });

    expect((service as any).timeoutMs).toBe(10000);
    expect((service as any).klineType).toBe(1);
    expect((service as any).klineNum).toBe(1);
  });
});

import { ConfigService } from "@nestjs/config";

import { BusinessErrorCode } from "@common/core/exceptions";
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

      await expect(service.getStockQuote(["AAPL.US"])).rejects.toMatchObject({
        message: "INFOWAY_API_KEY 未配置",
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
      });
      expect((service as any).client.post).not.toHaveBeenCalled();
    } finally {
      if (previousApiKey === undefined) {
        delete process.env.INFOWAY_API_KEY;
      } else {
        process.env.INFOWAY_API_KEY = previousApiKey;
      }
    }
  });

  it("testConnection: HTTP 与业务语义都成功时返回 true", async () => {
    const service = createService();
    (service as any).client.get.mockResolvedValue({
      data: {
        ret: 200,
        data: [],
      },
    });

    await expect(service.testConnection()).resolves.toBe(true);
    expect((service as any).client.get).toHaveBeenCalledWith(
      "/common/basic/markets",
      expect.objectContaining({
        headers: {
          apiKey: "test-api-key",
        },
      }),
    );
  });

  it("testConnection: 上游 ret 异常时返回 false（避免假阳性）", async () => {
    const service = createService();
    (service as any).client.get.mockResolvedValue({
      data: {
        ret: 500,
        msg: "maintenance",
        data: [],
      },
    });

    await expect(service.testConnection()).resolves.toBe(false);
  });

  it("getStockQuote: 上游 ret 异常时抛结构化业务异常", async () => {
    const service = createService();
    (service as any).client.post.mockResolvedValue({
      data: {
        ret: 500,
        msg: "upstream failed",
        data: [],
      },
    });

    await expect(service.getStockQuote(["AAPL.US"])).rejects.toMatchObject({
      message: "Infoway quote 响应异常",
      errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
      operation: "quote",
      context: {
        provider: "infoway",
        operation: "quote",
        upstream: {
          ret: 500,
          msg: "upstream failed",
        },
      },
    });
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

  it("getMarketStatus: data 结构异常时抛结构化业务异常", async () => {
    const service = createService();
    (service as any).client.get.mockResolvedValue({
      data: {
        ret: 200,
        data: {
          market: "US",
        },
      },
    });

    await expect(service.getMarketStatus(["US"])).rejects.toMatchObject({
      message: "Infoway market-status 响应异常",
      errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
      operation: "market-status",
      context: {
        provider: "infoway",
        operation: "market-status",
        upstream: {
          ret: 200,
          msg: "",
        },
      },
    });
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

  it("getStockBasicInfo: data 结构异常时抛结构化业务异常", async () => {
    const service = createService();
    (service as any).client.get.mockResolvedValue({
      data: {
        ret: 200,
        data: {
          symbol: "AAPL.US",
        },
      },
    });

    await expect(service.getStockBasicInfo(["AAPL.US"])).rejects.toMatchObject({
      message: "Infoway basic-info 响应异常",
      errorCode: BusinessErrorCode.EXTERNAL_API_ERROR,
      operation: "basic-info",
      context: {
        provider: "infoway",
        operation: "basic-info",
        upstream: {
          ret: 200,
          msg: "",
        },
      },
    });
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

  it("getStockBasicInfo: market hint 非法时抛参数错误并阻断上游请求", async () => {
    const service = createService();

    await expect(
      service.getStockBasicInfo(["AAPL.US"], "INVALID"),
    ).rejects.toMatchObject({
      message: expect.stringContaining("market 仅支持 HK/US/CN/SH/SZ"),
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
    });

    expect((service as any).client.get).not.toHaveBeenCalled();
  });

  it("getStockBasicInfo: market hint 与 symbol 推断冲突时抛参数错误并阻断上游请求", async () => {
    const service = createService();

    await expect(
      service.getStockBasicInfo(["AAPL.US"], "HK"),
    ).rejects.toMatchObject({
      message: expect.stringContaining("market 与 symbol 推断市场冲突"),
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
    });

    expect((service as any).client.get).not.toHaveBeenCalled();
  });

  it("getStockBasicInfo: SH/SZ 在一致性校验后归并到 STOCK_CN 分组请求", async () => {
    const service = createService();
    (service as any).client.get.mockResolvedValue({
      data: {
        ret: 200,
        data: [],
      },
    });

    await service.getStockBasicInfo(["600000.SH", "000001.SZ"], "CN");

    expect((service as any).client.get).toHaveBeenCalledTimes(1);
    expect((service as any).client.get).toHaveBeenCalledWith(
      "/common/basic/symbols/info",
      expect.objectContaining({
        params: {
          type: "STOCK_CN",
          symbols: "600000.SH,000001.SZ",
        },
      }),
    );
  });

  it("getStockHistory: 支持扩展参数并按时间升序输出", async () => {
    const service = createService();
    (service as any).client.post.mockResolvedValue({
      data: {
        ret: 200,
        data: [
          {
            s: "AAPL.US",
            respList: [
              {
                c: "183.11",
                pca: "1.11",
                o: "181.00",
                h: "184.50",
                l: "180.20",
                v: "100",
                vw: "15000",
                pc: "0.61",
                t: "1709251260",
              },
              {
                c: "182.31",
                pca: "0.31",
                o: "181.00",
                h: "183.50",
                l: "180.20",
                v: "120",
                vw: "22000",
                pc: "0.17",
                t: "1709251200",
              },
            ],
          },
        ],
      },
    });

    const result = await service.getStockHistory({
      symbols: ["AAPL.US"],
      klineType: 5,
      klineNum: 2,
      timestamp: 1709251260,
    });

    expect((service as any).client.post).toHaveBeenCalledWith(
      "/stock/v2/batch_kline",
      expect.objectContaining({
        klineType: 5,
        klineNum: 2,
        codes: "AAPL.US",
        timestamp: 1709251260,
      }),
      expect.objectContaining({
        headers: {
          apiKey: "test-api-key",
        },
      }),
    );
    expect(result).toHaveLength(2);
    expect(
      new Date(result[0].timestamp).getTime(),
    ).toBeLessThanOrEqual(new Date(result[1].timestamp).getTime());
  });

  it.each([0, -1, 1.5, "bad-type", 3, 999])(
    "getStockHistory: klineType=%p 非法时回退默认配置值",
    async (klineType) => {
      const service = createService({
        INFOWAY_INTRADAY_KLINE_TYPE: 5,
      });
      (service as any).client.post.mockResolvedValue({
        data: {
          ret: 200,
          data: [],
        },
      });

      await service.getStockHistory({
        symbols: ["AAPL.US"],
        klineType: klineType as any,
      });

      expect((service as any).client.post).toHaveBeenCalledWith(
        "/stock/v2/batch_kline",
        expect.objectContaining({
          klineType: 5,
          codes: "AAPL.US",
        }),
        expect.any(Object),
      );
    },
  );

  it.each([
    {
      title: "10位秒级时间戳",
      input: 1709251260,
      expected: 1709251260,
    },
    {
      title: "13位毫秒时间戳",
      input: 1758553860123,
      expected: 1758553860,
    },
  ])("getStockHistory: $title 应按正确单位转换并透传", async ({ input, expected }) => {
    const service = createService();
    (service as any).client.post.mockResolvedValue({
      data: {
        ret: 200,
        data: [],
      },
    });

    await service.getStockHistory({
      symbols: ["AAPL.US"],
      timestamp: input,
    });

    expect((service as any).client.post).toHaveBeenCalledWith(
      "/stock/v2/batch_kline",
      expect.objectContaining({
        timestamp: expected,
      }),
      expect.any(Object),
    );
  });

  it.each([17092512600, 946684800000])(
    "getStockHistory: 11/12位数字 timestamp=%p 时抛参数错误并阻断上游请求",
    async (timestamp) => {
      const service = createService();

      await expect(
        service.getStockHistory({
          symbols: ["AAPL.US"],
          timestamp,
        } as any),
      ).rejects.toMatchObject({
        message: expect.stringContaining("timestamp 必须是 10/13 位正整数时间戳"),
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      });

      expect((service as any).client.post).not.toHaveBeenCalled();
    },
  );

  it.each([1758553860.123])(
    "getStockHistory: 非整数数字 timestamp=%p 时抛参数错误并阻断上游请求",
    async (timestamp) => {
      const service = createService();

      await expect(
        service.getStockHistory({
          symbols: ["AAPL.US"],
          timestamp,
        } as any),
      ).rejects.toMatchObject({
        message: expect.stringContaining("timestamp 必须是 10/13 位正整数时间戳"),
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      });

      expect((service as any).client.post).not.toHaveBeenCalled();
    },
  );

  it("getStockHistory: timestamp 非法时抛参数错误并阻断上游请求", async () => {
    const service = createService();

    await expect(
      service.getStockHistory({
        symbols: ["AAPL.US"],
        timestamp: "bad-time",
      } as any),
    ).rejects.toMatchObject({
      message: expect.stringContaining("timestamp 必须是 10/13 位正整数时间戳"),
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
    });

    expect((service as any).client.post).not.toHaveBeenCalled();
  });

  it.each(["1758553860", "2024-03-01T09:30:00Z"])(
    "getStockHistory: 字符串 timestamp=%p 时抛参数错误并阻断上游请求",
    async (timestamp) => {
      const service = createService();

      await expect(
        service.getStockHistory({
          symbols: ["AAPL.US"],
          timestamp,
        } as any),
      ).rejects.toMatchObject({
        message: expect.stringContaining("timestamp 必须是 10/13 位正整数时间戳"),
        errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      });

      expect((service as any).client.post).not.toHaveBeenCalled();
    },
  );

  it("getStockHistory: 非严格日期字符串 timestamp 时抛参数错误并阻断上游请求", async () => {
    const service = createService();

    await expect(
      service.getStockHistory({
        symbols: ["AAPL.US"],
        timestamp: "2024/03/01 09:30:00",
      } as any),
    ).rejects.toMatchObject({
      message: expect.stringContaining("timestamp 必须是 10/13 位正整数时间戳"),
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
    });

    expect((service as any).client.post).not.toHaveBeenCalled();
  });

  it("getStockHistory: market 非法时应携带正确 operation", async () => {
    const service = createService();

    await expect(
      service.getStockHistory({
        symbols: ["AAPL.US"],
        market: "INVALID",
      }),
    ).rejects.toMatchObject({
      message: expect.stringContaining("market 仅支持 HK/US/CN/SH/SZ"),
      errorCode: BusinessErrorCode.DATA_VALIDATION_FAILED,
      operation: "getStockHistory",
    });

    expect((service as any).client.post).not.toHaveBeenCalled();
  });

  it("关键数值配置非法或不受支持时回退默认值", () => {
    const service = createService({
      INFOWAY_HTTP_TIMEOUT_MS: "bad-timeout",
      INFOWAY_QUOTE_KLINE_TYPE: 0,
      INFOWAY_QUOTE_KLINE_NUM: -2,
      INFOWAY_INTRADAY_KLINE_TYPE: 3,
      INFOWAY_INTRADAY_KLINE_NUM: -2,
      INFOWAY_INTRADAY_LOOKBACK_DAYS: 0,
    });

    expect((service as any).timeoutMs).toBe(10000);
    expect((service as any).klineType).toBe(1);
    expect((service as any).klineNum).toBe(1);
    expect((service as any).intradayKlineType).toBe(1);
    expect((service as any).intradayKlineNum).toBe(240);
    expect((service as any).intradayLookbackDays).toBe(1);
  });
});

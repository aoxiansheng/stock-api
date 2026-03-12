jest.mock("@common/logging/index", () => ({
  createLogger: () => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
  sanitizeLogData: (data: unknown) => data,
}));

import { DataFetcherService } from "@core/03-fetching/data-fetcher/services/data-fetcher.service";
import {
  BusinessErrorCode,
  BusinessException,
} from "@common/core/exceptions";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";

function createCapability(
  name: string,
  execute?: jest.Mock,
  metadata?: {
    transport?: "rest" | "stream" | "websocket";
    apiType?: "rest" | "stream";
  },
) {
  return {
    name,
    description: `${name} capability`,
    supportedMarkets: ["US"],
    supportedSymbolFormats: ["symbol.market"],
    ...metadata,
    execute: execute || jest.fn().mockResolvedValue({ data: [] }),
  };
}

describe("DataFetcherService stream/rest capability guard", () => {
  const provider = "infoway";
  const symbols = ["AAPL.US"];

  it("stream capability + rest 链路会抛 INVALID_OPERATION", async () => {
    const executeMock = jest.fn().mockResolvedValue([{ symbol: "AAPL.US" }]);
    const registry = {
      getCapability: jest.fn(() =>
        createCapability(CAPABILITY_NAMES.STREAM_STOCK_QUOTE, executeMock),
      ),
      getProvider: jest.fn(),
    };
    const service = new DataFetcherService(registry as any);

    await expect(
      service.fetchRawData({
        provider,
        capability: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        symbols,
        apiType: "rest",
      } as any),
    ).rejects.toThrow("不能通过 REST 执行链调用");

    expect(executeMock).not.toHaveBeenCalled();
  });

  it("stream capability + stream 链路正常放行", async () => {
    const executeMock = jest.fn().mockResolvedValue([{ symbol: "AAPL.US" }]);
    const registry = {
      getCapability: jest.fn(() =>
        createCapability(CAPABILITY_NAMES.STREAM_STOCK_QUOTE, executeMock),
      ),
      getProvider: jest.fn(),
    };
    const service = new DataFetcherService(registry as any);

    const result = await service.fetchRawData({
      provider,
      capability: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
      symbols,
      apiType: "stream",
    } as any);

    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual([{ symbol: "AAPL.US" }]);
  });

  it("stream capability + apiType 含空白时仍按 stream 链路放行", async () => {
    const executeMock = jest.fn().mockResolvedValue([{ symbol: "AAPL.US" }]);
    const registry = {
      getCapability: jest.fn(() =>
        createCapability(CAPABILITY_NAMES.STREAM_STOCK_QUOTE, executeMock),
      ),
      getProvider: jest.fn(),
    };
    const service = new DataFetcherService(registry as any);

    const result = await service.fetchRawData({
      provider,
      capability: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
      symbols,
      apiType: "  STREAM  ",
    } as any);

    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual([{ symbol: "AAPL.US" }]);
  });

  it("non-stream capability + rest 链路正常放行", async () => {
    const executeMock = jest.fn().mockResolvedValue([{ symbol: "AAPL.US" }]);
    const registry = {
      getCapability: jest.fn(() =>
        createCapability(CAPABILITY_NAMES.GET_STOCK_QUOTE, executeMock),
      ),
      getProvider: jest.fn(),
    };
    const service = new DataFetcherService(registry as any);

    const result = await service.fetchRawData({
      provider,
      capability: CAPABILITY_NAMES.GET_STOCK_QUOTE,
      symbols,
      apiType: "rest",
    } as any);

    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual([{ symbol: "AAPL.US" }]);
  });

  it("metadata=stream 时优先判定为流能力（即使名称不在固定集合）", async () => {
    const executeMock = jest.fn().mockResolvedValue([{ symbol: "AAPL.US" }]);
    const registry = {
      getCapability: jest.fn(() =>
        createCapability("custom-live-quote", executeMock, { transport: "stream" }),
      ),
      getProvider: jest.fn(),
    };
    const service = new DataFetcherService(registry as any);

    await expect(
      service.fetchRawData({
        provider,
        capability: "custom-live-quote",
        symbols,
        apiType: "rest",
      } as any),
    ).rejects.toThrow("不能通过 REST 执行链调用");

    expect(executeMock).not.toHaveBeenCalled();
  });

  it("metadata=rest 时优先覆盖固定集合判定", async () => {
    const executeMock = jest.fn().mockResolvedValue([{ symbol: "AAPL.US" }]);
    const registry = {
      getCapability: jest.fn(() =>
        createCapability(CAPABILITY_NAMES.STREAM_STOCK_QUOTE, executeMock, {
          apiType: "rest",
        }),
      ),
      getProvider: jest.fn(),
    };
    const service = new DataFetcherService(registry as any);

    const result = await service.fetchRawData({
      provider,
      capability: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
      symbols,
      apiType: "REST",
    } as any);

    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual([{ symbol: "AAPL.US" }]);
  });

  it("executionParams 始终以 normalized apiType 为准，不允许 options.apiType 覆盖", async () => {
    const executeMock = jest.fn().mockResolvedValue([{ symbol: "AAPL.US" }]);
    const registry = {
      getCapability: jest.fn(() =>
        createCapability(CAPABILITY_NAMES.GET_STOCK_QUOTE, executeMock),
      ),
      getProvider: jest.fn(),
    };
    const service = new DataFetcherService(registry as any);

    await service.fetchRawData({
      provider,
      capability: CAPABILITY_NAMES.GET_STOCK_QUOTE,
      symbols,
      apiType: "rest",
      options: {
        apiType: "stream",
      },
    } as any);

    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        apiType: "rest",
      }),
    );
  });

  it("缺失 transport/apiType 元数据时会触发一次告警并回退到名称集合判定", async () => {
    const executeMock = jest.fn().mockResolvedValue([{ symbol: "AAPL.US" }]);
    const registry = {
      getCapability: jest.fn(() =>
        createCapability(CAPABILITY_NAMES.STREAM_STOCK_QUOTE, executeMock),
      ),
      getProvider: jest.fn(),
    };
    const service = new DataFetcherService(registry as any);

    await expect(
      service.fetchRawData({
        provider,
        capability: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        symbols,
        apiType: "rest",
      } as any),
    ).rejects.toThrow("不能通过 REST 执行链调用");
    await expect(
      service.fetchRawData({
        provider,
        capability: CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
        symbols,
        apiType: "rest",
      } as any),
    ).rejects.toThrow("不能通过 REST 执行链调用");

    const warnMock = (service as any).logger.warn as jest.Mock;
    const missingMetadataWarnCalls = warnMock.mock.calls.filter(
      (call) =>
        call[0] ===
        "Capability metadata missing transport/apiType, fallback to stream name set",
    );
    expect(missingMetadataWarnCalls).toHaveLength(1);
  });
});

describe("DataFetcherService processRawData standard format", () => {
  const registry = {
    getCapability: jest.fn(),
    getProvider: jest.fn(),
  };
  const service = new DataFetcherService(registry as any);

  it("标准数组格式直接返回", () => {
    const rawData = [{ symbol: "AAPL.US" }];
    const result = (service as any).processRawData(rawData);
    expect(result).toEqual(rawData);
  });

  it("标准对象格式 { data: [] } 返回 data", () => {
    const rawData = { data: [{ symbol: "AAPL.US" }] };
    const result = (service as any).processRawData(rawData);
    expect(result).toEqual(rawData.data);
  });

  it("非标准格式会抛出明确错误", () => {
    const rawData = { quote_data: [{ symbol: "AAPL.US" }] };
    expect(() => (service as any).processRawData(rawData)).toThrow(
      "原始数据格式非法，仅接受数组或 { data: [] } 标准格式。",
    );
  });
});


describe("DataFetcherService upstream scheduler integration", () => {
  const provider = "infoway";
  const symbols = ["00700.HK"];

  it("allowlist 命中时通过 scheduler 执行 REST 能力", async () => {
    const executeMock = jest.fn().mockResolvedValue({ data: [{ symbol: "00700.HK" }] });
    const registry = {
      getCapability: jest.fn(() => createCapability(CAPABILITY_NAMES.GET_STOCK_QUOTE, executeMock)),
      getProvider: jest.fn(),
    };
    const scheduler = {
      shouldSchedule: jest.fn().mockReturnValue(true),
      schedule: jest.fn().mockResolvedValue({ data: [{ symbol: "00700.HK" }] }),
    };
    const service = new DataFetcherService(registry as any, scheduler as any);

    const result = await service.fetchRawData({
      provider,
      capability: CAPABILITY_NAMES.GET_STOCK_QUOTE,
      symbols,
      apiType: "rest",
      options: { realtime: true },
    } as any);

    expect(scheduler.shouldSchedule).toHaveBeenCalledWith(
      provider,
      CAPABILITY_NAMES.GET_STOCK_QUOTE,
      "rest",
    );
    expect(scheduler.schedule).toHaveBeenCalledTimes(1);
    expect(executeMock).not.toHaveBeenCalled();
    expect(result.data).toEqual([{ symbol: "00700.HK" }]);
  });

  it("infoway:get-stock-history 命中 scheduler 时注入 single_symbol_only mergeMode", async () => {
    const executeMock = jest.fn().mockResolvedValue({ data: [{ symbol: "00700.HK" }] });
    const registry = {
      getCapability: jest.fn(() =>
        createCapability(CAPABILITY_NAMES.GET_STOCK_HISTORY, executeMock),
      ),
      getProvider: jest.fn(),
    };
    const scheduler = {
      shouldSchedule: jest.fn().mockReturnValue(true),
      schedule: jest.fn(async (request: any) => {
        expect(request.mergeMode).toBe("single_symbol_only");
        return { data: [{ symbol: "00700.HK" }] };
      }),
    };
    const service = new DataFetcherService(registry as any, scheduler as any);

    const result = await service.fetchRawData({
      provider,
      capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
      symbols,
      apiType: "rest",
      options: { market: "HK", klineType: 1, klineNum: 5 },
    } as any);

    expect(scheduler.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        provider,
        capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
        symbols,
        mergeMode: "single_symbol_only",
      }),
    );
    expect(executeMock).not.toHaveBeenCalled();
    expect(result.data).toEqual([{ symbol: "00700.HK" }]);
  });

  it("infoway:get-stock-quote 命中 scheduler 时注入 s 字段 symbolExtractor", async () => {
    const executeMock = jest.fn().mockResolvedValue({ data: [{ symbol: "00700.HK" }] });
    const registry = {
      getCapability: jest.fn(() => createCapability(CAPABILITY_NAMES.GET_STOCK_QUOTE, executeMock)),
      getProvider: jest.fn(),
    };
    const scheduler = {
      shouldSchedule: jest.fn().mockReturnValue(true),
      schedule: jest.fn(async (request: any) => {
        expect(typeof request.symbolExtractor).toBe("function");
        expect(request.symbolExtractor({ s: "00700.HK" })).toBe("00700.HK");
        return { data: [{ s: "00700.HK" }] };
      }),
    };
    const service = new DataFetcherService(registry as any, scheduler as any);

    const result = await service.fetchRawData({
      provider,
      capability: CAPABILITY_NAMES.GET_STOCK_QUOTE,
      symbols,
      apiType: "rest",
      options: { realtime: true },
    } as any);

    expect(scheduler.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        provider,
        capability: CAPABILITY_NAMES.GET_STOCK_QUOTE,
        symbols,
        symbolExtractor: expect.any(Function),
      }),
    );
    expect(executeMock).not.toHaveBeenCalled();
    expect(result.data).toEqual([{ s: "00700.HK" }]);
  });

  it("allowlist 未命中时保持原 executeCapability 路径", async () => {
    const executeMock = jest.fn().mockResolvedValue({ data: [{ symbol: "00700.HK" }] });
    const registry = {
      getCapability: jest.fn(() => createCapability(CAPABILITY_NAMES.GET_STOCK_QUOTE, executeMock)),
      getProvider: jest.fn(),
    };
    const scheduler = {
      shouldSchedule: jest.fn().mockReturnValue(false),
      schedule: jest.fn(),
    };
    const service = new DataFetcherService(registry as any, scheduler as any);

    const result = await service.fetchRawData({
      provider,
      capability: CAPABILITY_NAMES.GET_STOCK_QUOTE,
      symbols,
      apiType: "rest",
    } as any);

    expect(scheduler.shouldSchedule).toHaveBeenCalledWith(
      provider,
      CAPABILITY_NAMES.GET_STOCK_QUOTE,
      "rest",
    );
    expect(scheduler.schedule).not.toHaveBeenCalled();
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual([{ symbol: "00700.HK" }]);
  });
});


describe("DataFetcherService basic-info phase 3 integration", () => {
  const provider = "infoway";
  const symbols = ["00700.HK"];

  it("get-stock-basic-info 命中 allowlist 时通过 scheduler 执行", async () => {
    const executeMock = jest.fn().mockResolvedValue({ data: [{ symbol: "00700.HK", exchange: "HKEX" }] });
    const registry = {
      getCapability: jest.fn(() => createCapability(CAPABILITY_NAMES.GET_STOCK_BASIC_INFO, executeMock)),
      getProvider: jest.fn(),
    };
    const scheduler = {
      shouldSchedule: jest.fn().mockReturnValue(true),
      schedule: jest.fn().mockResolvedValue({ data: [{ symbol: "00700.HK", exchange: "HKEX" }] }),
    };
    const service = new DataFetcherService(registry as any, scheduler as any);

    const result = await service.fetchRawData({
      provider,
      capability: CAPABILITY_NAMES.GET_STOCK_BASIC_INFO,
      symbols,
      apiType: "rest",
      options: { market: "HK" },
    } as any);

    expect(scheduler.shouldSchedule).toHaveBeenCalledWith(
      provider,
      CAPABILITY_NAMES.GET_STOCK_BASIC_INFO,
      "rest",
    );
    expect(scheduler.schedule).toHaveBeenCalledTimes(1);
    expect(executeMock).not.toHaveBeenCalled();
    expect(result.data).toEqual([{ symbol: "00700.HK", exchange: "HKEX" }]);
  });

  it("非 infoway quote 的调度路径使用默认 symbol 提取策略", async () => {
    const executeMock = jest.fn().mockResolvedValue({ data: [{ symbol: "00700.HK", exchange: "HKEX" }] });
    const registry = {
      getCapability: jest.fn(() => createCapability(CAPABILITY_NAMES.GET_STOCK_BASIC_INFO, executeMock)),
      getProvider: jest.fn(),
    };
    const scheduler = {
      shouldSchedule: jest.fn().mockReturnValue(true),
      schedule: jest.fn(async (request: any) => {
        expect(typeof request.symbolExtractor).toBe("function");
        expect(request.symbolExtractor({ symbol: "00700.HK" })).toBe("00700.HK");
        return { data: [{ symbol: "00700.HK", exchange: "HKEX" }] };
      }),
    };
    const service = new DataFetcherService(registry as any, scheduler as any);

    await service.fetchRawData({
      provider,
      capability: CAPABILITY_NAMES.GET_STOCK_BASIC_INFO,
      symbols,
      apiType: "rest",
      options: { market: "HK" },
    } as any);

    expect(scheduler.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        provider,
        capability: CAPABILITY_NAMES.GET_STOCK_BASIC_INFO,
        symbolExtractor: expect.any(Function),
      }),
    );
    expect(executeMock).not.toHaveBeenCalled();
  });

  it("get-stock-basic-info 上游失败时命中 stale fallback", async () => {
    const executeMock = jest
      .fn()
      .mockResolvedValueOnce({ data: [{ symbol: "00700.HK", exchange: "HKEX" }] })
      .mockRejectedValueOnce(new Error("upstream exploded"));
    const registry = {
      getCapability: jest.fn(() => createCapability(CAPABILITY_NAMES.GET_STOCK_BASIC_INFO, executeMock)),
      getProvider: jest.fn(),
    };
    const basicCache = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({
        data: [{ symbol: "00700.HK", exchange: "HKEX" }],
        updatedAt: "2026-03-11T01:00:00.000Z",
      }),
    };
    const service = new DataFetcherService(registry as any, undefined, basicCache as any);

    const successResult = await service.fetchRawData({
      provider,
      capability: CAPABILITY_NAMES.GET_STOCK_BASIC_INFO,
      symbols,
      apiType: "rest",
      options: { market: "HK" },
    } as any);
    expect(successResult.data).toEqual([{ symbol: "00700.HK", exchange: "HKEX" }]);
    expect(basicCache.set).toHaveBeenCalledTimes(1);

    const fallbackResult = await service.fetchRawData({
      provider,
      capability: CAPABILITY_NAMES.GET_STOCK_BASIC_INFO,
      symbols,
      apiType: "rest",
      options: { market: "HK" },
    } as any);

    expect(basicCache.get).toHaveBeenCalledTimes(1);
    expect(fallbackResult.data).toEqual([{ symbol: "00700.HK", exchange: "HKEX" }]);
    expect(fallbackResult.metadata.errors).toEqual(["STALE_FALLBACK_HIT"]);
  });
});


describe("DataFetcherService trading-days phase 3 integration", () => {
  const provider = "infoway";

  it("get-trading-days 上游失败时命中 stale fallback", async () => {
    const executeMock = jest
      .fn()
      .mockResolvedValueOnce({ data: [{ market: "US", tradeDays: ["20250310"], halfTradeDays: [] }] })
      .mockRejectedValueOnce(new Error("trading-days upstream exploded"));
    const registry = {
      getCapability: jest.fn(() => createCapability(CAPABILITY_NAMES.GET_TRADING_DAYS, executeMock)),
      getProvider: jest.fn(),
    };
    const basicCache = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue({
        data: [{ market: "US", tradeDays: ["20250310"], halfTradeDays: [] }],
        updatedAt: "2026-03-11T03:00:00.000Z",
      }),
    };
    const service = new DataFetcherService(registry as any, undefined, basicCache as any);

    const params = {
      provider,
      capability: CAPABILITY_NAMES.GET_TRADING_DAYS,
      symbols: ["AAPL.US"],
      apiType: "rest",
      options: { market: "US", beginDay: "20250310", endDay: "20250314" },
    } as any;

    const successResult = await service.fetchRawData(params);
    expect(successResult.data).toEqual([{ market: "US", tradeDays: ["20250310"], halfTradeDays: [] }]);
    expect(basicCache.set).toHaveBeenCalledTimes(1);
    expect(basicCache.set).toHaveBeenCalledWith(
      expect.stringContaining('get-trading-days'),
      expect.any(Object),
      { ttlSeconds: 86400 },
    );

    const fallbackResult = await service.fetchRawData(params);

    expect(basicCache.get).toHaveBeenCalledTimes(1);
    expect(fallbackResult.data).toEqual([{ market: "US", tradeDays: ["20250310"], halfTradeDays: [] }]);
    expect(fallbackResult.metadata.errors).toEqual(["STALE_FALLBACK_HIT"]);
  });
});

describe("DataFetcherService upstream 429 passthrough", () => {
  it("get-stock-history 上游 429 时应透传为 BusinessException 429", async () => {
    const upstreamError = Object.assign(
      new Error("Request failed with status code 429"),
      {
        response: {
          status: 429,
        },
      },
    );
    const executeMock = jest.fn().mockRejectedValue(upstreamError);
    const registry = {
      getCapability: jest.fn(() =>
        createCapability(CAPABILITY_NAMES.GET_STOCK_HISTORY, executeMock),
      ),
      getProvider: jest.fn(),
    };
    const service = new DataFetcherService(registry as any);

    try {
      await service.fetchRawData({
        provider: "infoway",
        capability: CAPABILITY_NAMES.GET_STOCK_HISTORY,
        symbols: ["00700.HK"],
        apiType: "rest",
        options: { market: "HK", klineType: 1, klineNum: 5 },
      } as any);
      throw new Error("Expected fetchRawData to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException);
      expect((error as BusinessException).getStatus()).toBe(429);
      expect((error as BusinessException).errorCode).toBe(
        BusinessErrorCode.RESOURCE_EXHAUSTED,
      );
    }
  });
});

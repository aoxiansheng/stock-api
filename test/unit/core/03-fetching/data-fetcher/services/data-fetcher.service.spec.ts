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

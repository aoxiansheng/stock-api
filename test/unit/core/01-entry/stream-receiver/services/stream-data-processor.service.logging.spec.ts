const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock("@common/logging/index", () => ({
  createLogger: jest.fn(() => mockLogger),
  shouldLog: jest.fn(),
}));

import { StreamDataProcessorService } from "@core/01-entry/stream-receiver/services/stream-data-processor.service";
import { StreamDataValidator } from "@core/01-entry/stream-receiver/validators/stream-data.validator";
import { shouldLog } from "@common/logging/index";

describe("StreamDataProcessorService logging", () => {
  function createService(options?: { streamCache?: { setData: jest.Mock } }) {
    const configService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === "STREAM_CACHE_ENABLED") return true;
        if (key === "STREAM_BROADCAST_ENABLED") return false;
        if (key === "DATA_PROCESSING_ENABLE_METRICS") return false;
        return defaultValue;
      }),
    };
    const eventBus = { emit: jest.fn() };
    const dataTransformerService = {
      transform: jest.fn().mockResolvedValue({
        transformedData: [
          {
            symbol: "AAPL.US",
            lastPrice: 100.5,
            volume: 10,
            timestamp: 1710000000000,
          },
        ],
      }),
    };
    const symbolTransformerService = {
      transformSymbols: jest.fn().mockResolvedValue({
        mappingDetails: { "AAPL.US": "AAPL.US" },
      }),
    };
    const streamDataFetcher = {
      getStreamDataCache: jest.fn().mockReturnValue(
        options?.streamCache || {
          setData: jest.fn().mockResolvedValue(undefined),
        },
      ),
    };
    const providerRegistryService = {
      getProviderNames: jest.fn().mockReturnValue([]),
      getProvider: jest.fn(),
      getAllCapabilities: jest.fn().mockReturnValue([]),
    };
    const dataValidator = new StreamDataValidator(providerRegistryService as any);

    return {
      service: new StreamDataProcessorService(
        configService as any,
        eventBus as any,
        dataTransformerService as any,
        symbolTransformerService as any,
        streamDataFetcher as any,
        dataValidator,
      ),
      streamCache: streamDataFetcher.getStreamDataCache(),
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stream-stock-quote 且 debug 开启时应启用分时追踪", () => {
    (shouldLog as jest.Mock).mockReturnValue(true);
    const { service } = createService();

    expect(
      (service as any).shouldTraceIntradayCapability("stream-stock-quote"),
    ).toBe(true);
    expect(shouldLog).toHaveBeenCalledWith("StreamDataProcessor", "debug");
  });

  it("非分时能力即使 debug 开启也不应启用分时追踪", () => {
    (shouldLog as jest.Mock).mockReturnValue(true);
    const { service } = createService();

    expect(
      (service as any).shouldTraceIntradayCapability("stream-option-quote"),
    ).toBe(false);
  });

  it("debug 关闭时不应启用分时追踪", () => {
    (shouldLog as jest.Mock).mockReturnValue(false);
    const { service } = createService();

    expect(
      (service as any).shouldTraceIntradayCapability("stream-stock-quote"),
    ).toBe(false);
  });

  it("processDataThroughPipeline: debug 开启时应输出分时诊断日志", async () => {
    (shouldLog as jest.Mock).mockReturnValue(true);
    const { service } = createService();

    await service.processDataThroughPipeline(
      [
        {
          symbols: ["AAPL.US"],
          rawData: { foo: "bar" },
          marketContext: { marketType: "US" },
        },
      ] as any,
      "infoway",
      "stream-stock-quote",
    );

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "分时诊断: 流处理入口",
      expect.objectContaining({
        provider: "infoway",
        capability: "stream-stock-quote",
        quotesCount: 1,
      }),
    );
  });

  it("processDataThroughPipeline: debug 关闭时不应输出分时诊断日志", async () => {
    (shouldLog as jest.Mock).mockReturnValue(false);
    const { service } = createService();

    await service.processDataThroughPipeline(
      [
        {
          symbols: ["AAPL.US"],
          rawData: { foo: "bar" },
          marketContext: { marketType: "US" },
        },
      ] as any,
      "infoway",
      "stream-stock-quote",
    );

    expect(mockLogger.debug).not.toHaveBeenCalledWith(
      "分时诊断: 流处理入口",
      expect.anything(),
    );
  });

  it("executeWithTimeout: 操作成功后应清理超时定时器", async () => {
    jest.useFakeTimers();
    try {
      const { service } = createService();

      const result = await (service as any).executeWithTimeout(
        () => Promise.resolve("ok"),
        1000,
        "测试操作",
      );

      expect(result).toBe("ok");
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it("executeWithTimeout: 操作失败后应清理超时定时器", async () => {
    jest.useFakeTimers();
    try {
      const { service } = createService();

      await expect(
        (service as any).executeWithTimeout(
          () => Promise.reject(new Error("boom")),
          1000,
          "测试操作",
        ),
      ).rejects.toThrow("boom");

      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});

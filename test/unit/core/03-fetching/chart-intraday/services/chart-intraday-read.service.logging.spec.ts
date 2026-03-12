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

import { ChartIntradayCursorService } from "@core/03-fetching/chart-intraday/services/chart-intraday-cursor.service";
import { ChartIntradayReadService } from "@core/03-fetching/chart-intraday/services/chart-intraday-read.service";
import { shouldLog } from "@common/logging/index";

describe("ChartIntradayReadService logging", () => {
  function createService(streamCache?: { getData: jest.Mock }) {
    process.env.CHART_INTRADAY_CURSOR_SECRET = "chart-intraday-test-secret";

    return new ChartIntradayReadService(
      { fetchRawData: jest.fn(), supportsCapability: jest.fn(), getProviderContext: jest.fn() } as any,
      { transformSymbolsForProvider: jest.fn(), transformSingleSymbol: jest.fn() } as any,
      {
        getCandidateProviders: jest.fn().mockReturnValue(["infoway"]),
        rankProvidersForCapability: jest.fn().mockReturnValue(["infoway"]),
        getBestProvider: jest.fn().mockReturnValue("infoway"),
        resolveHistoryExecutionContext: jest.fn().mockReturnValue({
          reasonCode: "success",
          contextService: null,
          capability: { name: "get-stock-history" },
        }),
        getCapability: jest.fn().mockReturnValue({ name: "get-stock-history" }),
      } as any,
      { getStreamDataCache: jest.fn().mockReturnValue(streamCache || { getData: jest.fn().mockResolvedValue([]) }) } as any,
      new ChartIntradayCursorService(),
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debug 开启时应允许输出分时调试日志", () => {
    (shouldLog as jest.Mock).mockReturnValue(true);
    const service = createService();

    expect((service as any).shouldTraceDebug()).toBe(true);
    expect(shouldLog).toHaveBeenCalledWith("ChartIntradayReadService", "debug");
  });

  it("debug 关闭时不应输出分时调试日志", () => {
    (shouldLog as jest.Mock).mockReturnValue(false);
    const service = createService();

    expect((service as any).shouldTraceDebug()).toBe(false);
  });

  it("fetchRealtimePoints: debug 开启时应输出流缓存诊断日志", async () => {
    (shouldLog as jest.Mock).mockReturnValue(true);
    const service = createService({
      getData: jest.fn().mockResolvedValue([
        { s: "AAPL.US", t: Date.parse("2026-03-12T14:30:00.000Z"), p: 101.2, v: 100 },
      ]),
    });

    await (service as any).fetchRealtimePoints("AAPL.US", "US", "2026-03-12");

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "分时诊断: 尝试读取流缓存",
      expect.objectContaining({ key: "quote:AAPL.US", symbol: "AAPL.US" }),
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      "分时诊断: 流缓存读取结果",
      expect.objectContaining({ key: "quote:AAPL.US", rawPointsCount: 1 }),
    );
  });

  it("fetchRealtimePoints: debug 关闭时不应输出流缓存诊断日志", async () => {
    (shouldLog as jest.Mock).mockReturnValue(false);
    const service = createService({
      getData: jest.fn().mockResolvedValue([
        { s: "AAPL.US", t: Date.parse("2026-03-12T14:30:00.000Z"), p: 101.2, v: 100 },
      ]),
    });

    await (service as any).fetchRealtimePoints("AAPL.US", "US", "2026-03-12");

    expect(mockLogger.debug).not.toHaveBeenCalledWith(
      "分时诊断: 尝试读取流缓存",
      expect.anything(),
    );
  });
});

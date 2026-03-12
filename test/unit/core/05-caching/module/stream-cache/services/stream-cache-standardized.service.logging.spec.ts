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

import { StreamCacheStandardizedService } from "@core/05-caching/module/stream-cache/services/stream-cache-standardized.service";
import { shouldLog } from "@common/logging/index";

describe("StreamCacheStandardizedService logging", () => {
  function createService() {
    return new StreamCacheStandardizedService(
      {
        status: "ready",
        on: jest.fn(),
        quit: jest.fn(),
        disconnect: jest.fn(),
      } as any,
      { emit: jest.fn() } as any,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("quote key 且 debug 开启时应启用诊断日志", () => {
    (shouldLog as jest.Mock).mockReturnValue(true);
    const service = createService();

    expect(
      (service as any).shouldLogIntradayDiagnosticForKey("quote:AAPL.US"),
    ).toBe(true);
    expect(shouldLog).toHaveBeenCalledWith(
      "StreamCacheStandardizedService",
      "debug",
    );
  });

  it("非 quote key 不应启用诊断日志", () => {
    (shouldLog as jest.Mock).mockReturnValue(true);
    const service = createService();

    expect(
      (service as any).shouldLogIntradayDiagnosticForKey("subscription:abc"),
    ).toBe(false);
  });

  it("debug 关闭时不应启用诊断日志", () => {
    (shouldLog as jest.Mock).mockReturnValue(false);
    const service = createService();

    expect(
      (service as any).shouldLogIntradayDiagnosticForKey("quote:AAPL.US"),
    ).toBe(false);
  });

  it("get: debug 开启且命中 hot-cache 时应输出诊断日志", async () => {
    (shouldLog as jest.Mock).mockReturnValue(true);
    const service = createService();
    jest
      .spyOn(service as any, "getFromHotCache")
      .mockReturnValue([{ s: "AAPL.US", p: 100, v: 1, t: 1 }]);

    await service.get("quote:AAPL.US");

    expect(mockLogger.debug).toHaveBeenCalledWith(
      "分时诊断: StreamCache 读取命中 hot-cache",
      expect.objectContaining({ key: "quote:AAPL.US", pointsCount: 1 }),
    );
  });

  it("get: debug 关闭时不应输出 hot-cache 诊断日志", async () => {
    (shouldLog as jest.Mock).mockReturnValue(false);
    const service = createService();
    jest
      .spyOn(service as any, "getFromHotCache")
      .mockReturnValue([{ s: "AAPL.US", p: 100, v: 1, t: 1 }]);

    await service.get("quote:AAPL.US");

    expect(mockLogger.debug).not.toHaveBeenCalledWith(
      "分时诊断: StreamCache 读取命中 hot-cache",
      expect.anything(),
    );
  });
});

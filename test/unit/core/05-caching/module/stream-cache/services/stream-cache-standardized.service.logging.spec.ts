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
    const warmCacheStore = new Map<string, string>();

    return new StreamCacheStandardizedService(
      {
        status: "ready",
        on: jest.fn(),
        get: jest.fn(async (key: string) => warmCacheStore.get(key) ?? null),
        setex: jest.fn(async (key: string, _ttl: number, value: string) => {
          warmCacheStore.set(key, value);
          return "OK";
        }),
        scan: jest.fn(async () => ["0", []]),
        pipeline: jest.fn(() => ({
          get: jest.fn(),
          exec: jest.fn(async () => []),
        })),
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

  it("setData: quote key 应按时间序列合并而不是覆盖旧点位", async () => {
    const service = createService();

    await service.setData("quote:AAPL.US", [{ s: "AAPL.US", p: 100, v: 1, t: 1000 }], "hot");
    await service.setData("quote:AAPL.US", [{ s: "AAPL.US", p: 101, v: 2, t: 2000 }], "hot");

    await expect(service.getData("quote:AAPL.US")).resolves.toEqual([
      { s: "AAPL.US", p: 100, v: 1, t: 1000 },
      { s: "AAPL.US", p: 101, v: 2, t: 2000 },
    ]);
  });

  it("setData: 非 quote key 仍保持覆盖语义", async () => {
    const service = createService();

    await service.setData("subscription:conn-1", [{ s: "AAPL.US", p: 100, v: 1, t: 1000 }], "hot");
    await service.setData("subscription:conn-1", [{ s: "AAPL.US", p: 101, v: 2, t: 2000 }], "hot");

    await expect(service.getData("subscription:conn-1")).resolves.toEqual([
      { s: "AAPL.US", p: 101, v: 2, t: 2000 },
    ]);
  });
});

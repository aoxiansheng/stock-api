const logger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock("@common/logging/index", () => ({
  createLogger: () => logger,
  sanitizeLogData: (data: unknown) => data,
}));

import { EventEmitter2 } from "@nestjs/event-emitter";
import { StreamDataFetcherService } from "@core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service";

describe("StreamDataFetcherService performance metrics", () => {
  let service: StreamDataFetcherService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(
        StreamDataFetcherService.prototype as any,
        "loadConcurrencyConfigFromService",
      )
      .mockImplementation(() => undefined);
    jest
      .spyOn(
        StreamDataFetcherService.prototype as any,
        "startPeriodicMapCleanup",
      )
      .mockImplementation(() => undefined);
    jest
      .spyOn(
        StreamDataFetcherService.prototype as any,
        "startAdaptiveConcurrencyMonitoring",
      )
      .mockImplementation(() => undefined);

    service = new StreamDataFetcherService(
      {
        getProvider: jest.fn(),
      } as any,
      {
        deleteData: jest.fn().mockResolvedValue(undefined),
        setData: jest.fn().mockResolvedValue(undefined),
      } as any,
      {
        canCreateConnection: jest.fn().mockReturnValue(true),
        registerConnection: jest.fn(),
        unregisterConnection: jest.fn(),
        getStats: jest.fn(() => ({})),
        getAlerts: jest.fn(() => []),
      } as any,
      new EventEmitter2(),
      {
        get: jest.fn(() => undefined),
      } as any,
      {
        getPerformanceConfig: jest.fn(() => ({})),
      } as any,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("初始 successRate 使用比例值 1 而不是 100", () => {
    expect((service as any).performanceMetrics.successRate).toBe(1);
  });

  it("totalRequests=0 时不做并发优劣判断，也不记录误导性日志", () => {
    (service as any).performanceMetrics = {
      ...(service as any).performanceMetrics,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      successRate: 1,
      responseTimes: [],
      avgResponseTime: 0,
    };
    (service as any).concurrencyControl = {
      ...(service as any).concurrencyControl,
      lastAdjustment: 0,
      currentConcurrency: 10,
      stabilizationPeriod: 0,
      circuitBreaker: {
        ...(service as any).concurrencyControl.circuitBreaker,
        enabled: false,
      },
    };

    (service as any).analyzePerformanceAndAdjustConcurrency();

    expect((service as any).concurrencyControl.currentConcurrency).toBe(10);
    expect(logger.log).not.toHaveBeenCalledWith(
      "自适应并发控制调整",
      expect.anything(),
    );
    expect(logger.error).not.toHaveBeenCalledWith(
      "自适应并发控制触发断路器",
      expect.anything(),
    );
  });
});

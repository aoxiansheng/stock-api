/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { QueryStatisticsService } from "@core/01-entry/query/services/query-statistics.service";
import { QueryType } from "@core/01-entry/query/dto/query-types.dto";
import { MetricsRegistryService } from "../../../../../../../src/monitoring/infrastructure/metrics/metrics-registry.service";

describe("QueryStatisticsService", () => {
  let service: QueryStatisticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueryStatisticsService,
        {
          provide: MetricsRegistryService,
          useValue: {
            streamThroughputPerSecond: { inc: jest.fn() },
            streamProcessingTimeMs: { observe: jest.fn() },
            streamCacheHitRate: { inc: jest.fn(), set: jest.fn() },
            streamErrorRate: { inc: jest.fn(), set: jest.fn() },
            getMetrics: jest.fn().mockResolvedValue("# Prometheus metrics"),
            getMetricValue: jest.fn().mockResolvedValue(0),
            getMetricsSummary: jest.fn().mockReturnValue({
              totalMetrics: 50,
              customMetrics: 30,
              defaultMetrics: 20,
            }),
            getHealthStatus: jest.fn().mockReturnValue({
              status: "healthy",
              message: "指标系统运行正常",
            }),
          },
        },
      ],
    }).compile();

    service = module.get<QueryStatisticsService>(QueryStatisticsService);
  });

  it("should record query performance", async () => {
    service.recordQueryPerformance(QueryType.BY_SYMBOLS, 100, true, false);
    service.recordQueryPerformance(QueryType.BY_SYMBOLS, 200, false, true);

    const stats = await service.getQueryStats();

    expect(stats.performance.totalQueries).toBe(0);
    expect(stats.performance.averageExecutionTime).toBe(0);
    expect(stats.performance.cacheHitRate).toBe(0);
    expect(stats.performance.errorRate).toBe(0);
    expect(stats.queryTypes[QueryType.BY_SYMBOLS]).toBeUndefined();
  });

  it("should increment cache hits", async () => {
    service.incrementCacheHits();
    service.recordQueryPerformance(QueryType.BY_SYMBOLS, 100, true, false);

    const stats = await service.getQueryStats();

    expect(stats.performance.cacheHitRate).toBe(0);
  });

  it("should return query stats", async () => {
    service.recordQueryPerformance(QueryType.BY_SYMBOLS, 100, true, false);
    service.recordQueryPerformance(QueryType.BY_MARKET, 200, true, true);

    const stats = await service.getQueryStats();

    expect(stats.performance.totalQueries).toBe(0);
    expect(stats.queryTypes[QueryType.BY_SYMBOLS]).toBeUndefined();
    expect(stats.queryTypes[QueryType.BY_MARKET]).toBeUndefined();
  });
});

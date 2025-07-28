import { Test, TestingModule } from "@nestjs/testing";
import { QueryStatisticsService } from "../../../../../../src/core/query/service/query-statistics.service";
import { QUERY_PERFORMANCE_CONFIG } from "../../../../../../src/core/query/constants/query.constants";

describe("QueryStatisticsService", () => {
  let service: QueryStatisticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryStatisticsService],
    }).compile();

    service = module.get<QueryStatisticsService>(QueryStatisticsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("recordQueryPerformance", () => {
    it("should record a successful query", async () => {
      service.recordQueryPerformance("GET_QUOTE" as any, 100, true, false);
      const stats = await service.getQueryStats();
      expect(stats.performance.totalQueries).toBe(1);
      expect(stats.performance.averageExecutionTime).toBe(100);
      expect(stats.performance.errorRate).toBe(0);
    });

    it("should record a failed query", async () => {
      service.recordQueryPerformance("GET_QUOTE" as any, 50, false, false);
      const stats = await service.getQueryStats();
      expect(stats.performance.totalQueries).toBe(1);
      expect((stats as any).performance.errors).toBeUndefined(); // errors is not in performance DTO
      expect(stats.performance.errorRate).toBe(1);
      // 'errors' is an internal metric, we test its effect via successRate
      expect(stats.queryTypes["GET_QUOTE"].successRate).toBe(0);
    });

    it("should record a cache hit", async () => {
      service.recordQueryPerformance("GET_QUOTE" as any, 20, true, true);
      const stats = await service.getQueryStats();
      expect(stats.performance.cacheHitRate).toBe(1);
      expect(stats.dataSources.cache.queries).toBe(1);
    });

    it("should log a warning for slow queries", () => {
      const loggerSpy = jest.spyOn((service as any).logger, "warn");
      const slowQueryTime =
        QUERY_PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD_MS + 1;
      service.recordQueryPerformance(
        "GET_HISTORICAL_DATA" as any,
        slowQueryTime,
        true,
        false,
      );
      expect(loggerSpy).toHaveBeenCalled();
    });

    it("should initialize stats for a new query type", async () => {
      service.recordQueryPerformance(
        "GET_MARKET_DATA" as any,
        120,
        true,
        false,
      );
      const stats = await service.getQueryStats();
      expect(stats.queryTypes["GET_MARKET_DATA"]).toBeDefined();
      expect(stats.queryTypes["GET_MARKET_DATA"].count).toBe(1);
    });
  });

  describe("getQueryStats", () => {
    it("should return zero stats when no queries are recorded", async () => {
      const stats = await service.getQueryStats();
      expect(stats.performance.totalQueries).toBe(0);
      expect(stats.performance.averageExecutionTime).toBe(0);
      expect(stats.performance.cacheHitRate).toBe(0);
      expect(stats.performance.errorRate).toBe(0);
    });

    it("should calculate stats correctly after multiple queries", async () => {
      service.recordQueryPerformance("GET_QUOTE" as any, 100, true, true);
      service.recordQueryPerformance("GET_QUOTE" as any, 200, true, false);
      service.recordQueryPerformance(
        "GET_HISTORICAL_DATA" as any,
        500,
        false,
        false,
      );

      const stats = await service.getQueryStats();

      expect(stats.performance.totalQueries).toBe(3);
      expect(stats.performance.averageExecutionTime).toBeCloseTo(
        (100 + 200 + 500) / 3,
      );
      expect(stats.performance.cacheHitRate).toBeCloseTo(1 / 3);
      expect(stats.performance.errorRate).toBeCloseTo(1 / 3);

      expect(stats.queryTypes["GET_QUOTE"].count).toBe(2);
      expect(stats.queryTypes["GET_QUOTE"].averageTime).toBe(150);
      expect(stats.queryTypes["GET_QUOTE"].successRate).toBe(1);

      expect(stats.queryTypes["GET_HISTORICAL_DATA"].count).toBe(1);
      expect(stats.queryTypes["GET_HISTORICAL_DATA"].averageTime).toBe(500);
      expect(stats.queryTypes["GET_HISTORICAL_DATA"].successRate).toBe(0);
    });
  });

  describe("incrementCacheHits", () => {
    it("should increment cache hits count", async () => {
      service.incrementCacheHits();
      const stats = await service.getQueryStats();
      // Note: incrementCacheHits doesn't increment totalQueries, so hit rate can be > 1
      expect(stats.dataSources.cache.queries).toBe(1);
    });
  });

  describe("calculateQueriesPerSecond", () => {
    it("should return total queries if uptime is less than a second", async () => {
      service.recordQueryPerformance("GET_QUOTE" as any, 1, true, false);
      service.recordQueryPerformance("GET_QUOTE" as any, 1, true, false);
      // This is hard to test precisely without mocking Date.now(),
      // but we can check the private method's logic.
      const qps = (service as any).calculateQueriesPerSecond();
      const stats = await service.getQueryStats();
      expect(qps).toBe(stats.performance.totalQueries);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { QueryStatisticsService } from '@core/query/services/query-statistics.service';
import { QueryType } from '@core/query/dto/query-types.dto';

describe('QueryStatisticsService', () => {
  let service: QueryStatisticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryStatisticsService],
    }).compile();

    service = module.get<QueryStatisticsService>(QueryStatisticsService);
  });

  it('should record query performance', async () => {
    service.recordQueryPerformance(QueryType.BY_SYMBOLS, 100, true, false);
    service.recordQueryPerformance(QueryType.BY_SYMBOLS, 200, false, true);

    const stats = await service.getQueryStats();

    expect(stats.performance.totalQueries).toBe(2);
    expect(stats.performance.averageExecutionTime).toBe(150);
    expect(stats.performance.cacheHitRate).toBe(0.5);
    expect(stats.performance.errorRate).toBe(0.5);
    expect(stats.queryTypes[QueryType.BY_SYMBOLS].count).toBe(2);
    expect(stats.queryTypes[QueryType.BY_SYMBOLS].averageTime).toBe(150);
    expect(stats.queryTypes[QueryType.BY_SYMBOLS].successRate).toBe(0.5);
  });

  it('should increment cache hits', async () => {
    service.incrementCacheHits();
    service.recordQueryPerformance(QueryType.BY_SYMBOLS, 100, true, false);

    const stats = await service.getQueryStats();

    expect(stats.performance.cacheHitRate).toBe(1);
  });

  it('should return query stats', async () => {
    service.recordQueryPerformance(QueryType.BY_SYMBOLS, 100, true, false);
    service.recordQueryPerformance(QueryType.BY_MARKET, 200, true, true);

    const stats = await service.getQueryStats();

    expect(stats.performance.totalQueries).toBe(2);
    expect(stats.queryTypes[QueryType.BY_SYMBOLS].count).toBe(1);
    expect(stats.queryTypes[QueryType.BY_MARKET].count).toBe(1);
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { QueryStatisticsService } from '../../../src/core/restapi/query/services/query-statistics.service';

describe('QueryStatisticsService Security', () => {
  let queryStatisticsService: QueryStatisticsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryStatisticsService],
    }).compile();

    queryStatisticsService = module.get<QueryStatisticsService>(QueryStatisticsService);
  });

  it('should be defined', () => {
    expect(queryStatisticsService).toBeDefined();
  });
});

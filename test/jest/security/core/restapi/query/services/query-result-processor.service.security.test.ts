import { Test, TestingModule } from '@nestjs/testing';
import { QueryResultProcessorService } from '../../../src/core/restapi/query/services/query-result-processor.service';

describe('QueryResultProcessorService Security', () => {
  let queryResultProcessorService: QueryResultProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryResultProcessorService],
    }).compile();

    queryResultProcessorService = module.get<QueryResultProcessorService>(QueryResultProcessorService);
  });

  it('should be defined', () => {
    expect(queryResultProcessorService).toBeDefined();
  });
});

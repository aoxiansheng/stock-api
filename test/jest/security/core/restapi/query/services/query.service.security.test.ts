import { Test, TestingModule } from '@nestjs/testing';
import { QueryService } from '../../../src/core/restapi/query/services/query.service';

describe('QueryService Security', () => {
  let queryService: QueryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryService],
    }).compile();

    queryService = module.get<QueryService>(QueryService);
  });

  it('should be defined', () => {
    expect(queryService).toBeDefined();
  });
});

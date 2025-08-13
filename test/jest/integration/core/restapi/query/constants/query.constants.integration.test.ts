import { Test, TestingModule } from '@nestjs/testing';
import { QueryConstants } from '../../../src/core/restapi/query/constants/query.constants';

describe('QueryConstants Integration', () => {
  let queryConstants: QueryConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryConstants],
    }).compile();

    queryConstants = module.get<QueryConstants>(QueryConstants);
  });

  it('should be defined', () => {
    expect(queryConstants).toBeDefined();
  });
});

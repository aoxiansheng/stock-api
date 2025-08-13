import { Test, TestingModule } from '@nestjs/testing';
import { QueryUtil } from '../../../src/core/restapi/query/utils/query.util';

describe('QueryUtil Integration', () => {
  let queryUtil: QueryUtil;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryUtil],
    }).compile();

    queryUtil = module.get<QueryUtil>(QueryUtil);
  });

  it('should be defined', () => {
    expect(queryUtil).toBeDefined();
  });
});

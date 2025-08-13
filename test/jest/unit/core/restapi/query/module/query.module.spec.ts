import { Test, TestingModule } from '@nestjs/testing';
import { QueryModule } from '../../../src/core/restapi/query/module/query.module';

describe('QueryModule', () => {
  let queryModule: QueryModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryModule],
    }).compile();

    queryModule = module.get<QueryModule>(QueryModule);
  });

  it('should be defined', () => {
    expect(queryModule).toBeDefined();
  });
});

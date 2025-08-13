import { Test, TestingModule } from '@nestjs/testing';
import { QueryController } from '../../../src/core/restapi/query/controller/query.controller';

describe('QueryController Security', () => {
  let queryController: QueryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryController],
    }).compile();

    queryController = module.get<QueryController>(QueryController);
  });

  it('should be defined', () => {
    expect(queryController).toBeDefined();
  });
});

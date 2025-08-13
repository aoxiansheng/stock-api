import { Test, TestingModule } from '@nestjs/testing';
import { QueryProcessedResultDto } from '../../../src/core/restapi/query/dto/query-processed-result.dto';

describe('QueryProcessedResultDto Integration', () => {
  let queryProcessedResultDto: QueryProcessedResultDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryProcessedResultDto],
    }).compile();

    queryProcessedResultDto = module.get<QueryProcessedResultDto>(QueryProcessedResultDto);
  });

  it('should be defined', () => {
    expect(queryProcessedResultDto).toBeDefined();
  });
});

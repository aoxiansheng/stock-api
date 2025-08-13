import { Test, TestingModule } from '@nestjs/testing';
import { QueryInternalDto } from '../../../src/core/restapi/query/dto/query-internal.dto';

describe('QueryInternalDto Integration', () => {
  let queryInternalDto: QueryInternalDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryInternalDto],
    }).compile();

    queryInternalDto = module.get<QueryInternalDto>(QueryInternalDto);
  });

  it('should be defined', () => {
    expect(queryInternalDto).toBeDefined();
  });
});

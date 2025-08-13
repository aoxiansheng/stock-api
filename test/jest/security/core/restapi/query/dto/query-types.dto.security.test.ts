import { Test, TestingModule } from '@nestjs/testing';
import { QueryTypesDto } from '../../../src/core/restapi/query/dto/query-types.dto';

describe('QueryTypesDto Security', () => {
  let queryTypesDto: QueryTypesDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryTypesDto],
    }).compile();

    queryTypesDto = module.get<QueryTypesDto>(QueryTypesDto);
  });

  it('should be defined', () => {
    expect(queryTypesDto).toBeDefined();
  });
});

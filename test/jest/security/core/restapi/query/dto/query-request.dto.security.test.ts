import { Test, TestingModule } from '@nestjs/testing';
import { QueryRequestDto } from '../../../src/core/restapi/query/dto/query-request.dto';

describe('QueryRequestDto Security', () => {
  let queryRequestDto: QueryRequestDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryRequestDto],
    }).compile();

    queryRequestDto = module.get<QueryRequestDto>(QueryRequestDto);
  });

  it('should be defined', () => {
    expect(queryRequestDto).toBeDefined();
  });
});

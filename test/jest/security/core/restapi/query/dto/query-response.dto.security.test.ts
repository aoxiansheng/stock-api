import { Test, TestingModule } from '@nestjs/testing';
import { QueryResponseDto } from '../../../src/core/restapi/query/dto/query-response.dto';

describe('QueryResponseDto Security', () => {
  let queryResponseDto: QueryResponseDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueryResponseDto],
    }).compile();

    queryResponseDto = module.get<QueryResponseDto>(QueryResponseDto);
  });

  it('should be defined', () => {
    expect(queryResponseDto).toBeDefined();
  });
});

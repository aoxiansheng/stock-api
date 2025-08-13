import { Test, TestingModule } from '@nestjs/testing';
import { DataFetchResponseDto } from '../../../src/core/restapi/data-fetcher/dto/data-fetch-response.dto';

describe('DataFetchResponseDto Integration', () => {
  let dataFetchResponseDto: DataFetchResponseDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataFetchResponseDto],
    }).compile();

    dataFetchResponseDto = module.get<DataFetchResponseDto>(DataFetchResponseDto);
  });

  it('should be defined', () => {
    expect(dataFetchResponseDto).toBeDefined();
  });
});

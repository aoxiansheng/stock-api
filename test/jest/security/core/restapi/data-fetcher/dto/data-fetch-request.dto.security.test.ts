import { Test, TestingModule } from '@nestjs/testing';
import { DataFetchRequestDto } from '../../../src/core/restapi/data-fetcher/dto/data-fetch-request.dto';

describe('DataFetchRequestDto Security', () => {
  let dataFetchRequestDto: DataFetchRequestDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataFetchRequestDto],
    }).compile();

    dataFetchRequestDto = module.get<DataFetchRequestDto>(DataFetchRequestDto);
  });

  it('should be defined', () => {
    expect(dataFetchRequestDto).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { DataResponseDto } from '../../../src/core/restapi/receiver/dto/data-response.dto';

describe('DataResponseDto Security', () => {
  let dataResponseDto: DataResponseDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataResponseDto],
    }).compile();

    dataResponseDto = module.get<DataResponseDto>(DataResponseDto);
  });

  it('should be defined', () => {
    expect(dataResponseDto).toBeDefined();
  });
});

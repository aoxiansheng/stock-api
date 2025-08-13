import { Test, TestingModule } from '@nestjs/testing';
import { DataRequestDto } from '../../../src/core/restapi/receiver/dto/data-request.dto';

describe('DataRequestDto Security', () => {
  let dataRequestDto: DataRequestDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataRequestDto],
    }).compile();

    dataRequestDto = module.get<DataRequestDto>(DataRequestDto);
  });

  it('should be defined', () => {
    expect(dataRequestDto).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { DataMapperConstants } from '../../../src/core/public/data-mapper/constants/data-mapper.constants';

describe('DataMapperConstants Integration', () => {
  let dataMapperConstants: DataMapperConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataMapperConstants],
    }).compile();

    dataMapperConstants = module.get<DataMapperConstants>(DataMapperConstants);
  });

  it('should be defined', () => {
    expect(dataMapperConstants).toBeDefined();
  });
});

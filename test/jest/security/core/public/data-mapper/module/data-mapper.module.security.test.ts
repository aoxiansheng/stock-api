import { Test, TestingModule } from '@nestjs/testing';
import { DataMapperModule } from '../../../src/core/public/data-mapper/module/data-mapper.module';

describe('DataMapperModule Security', () => {
  let dataMapperModule: DataMapperModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataMapperModule],
    }).compile();

    dataMapperModule = module.get<DataMapperModule>(DataMapperModule);
  });

  it('should be defined', () => {
    expect(dataMapperModule).toBeDefined();
  });
});

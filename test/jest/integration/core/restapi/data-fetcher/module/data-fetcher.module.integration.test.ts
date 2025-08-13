import { Test, TestingModule } from '@nestjs/testing';
import { DataFetcherModule } from '../../../src/core/restapi/data-fetcher/module/data-fetcher.module';

describe('DataFetcherModule Integration', () => {
  let dataFetcherModule: DataFetcherModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataFetcherModule],
    }).compile();

    dataFetcherModule = module.get<DataFetcherModule>(DataFetcherModule);
  });

  it('should be defined', () => {
    expect(dataFetcherModule).toBeDefined();
  });
});

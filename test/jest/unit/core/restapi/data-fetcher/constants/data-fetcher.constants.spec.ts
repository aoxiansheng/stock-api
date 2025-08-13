import { Test, TestingModule } from '@nestjs/testing';
import { DataFetcherConstants } from '../../../src/core/restapi/data-fetcher/constants/data-fetcher.constants';

describe('DataFetcherConstants', () => {
  let dataFetcherConstants: DataFetcherConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataFetcherConstants],
    }).compile();

    dataFetcherConstants = module.get<DataFetcherConstants>(DataFetcherConstants);
  });

  it('should be defined', () => {
    expect(dataFetcherConstants).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { DataFetcherInterface } from '../../../src/core/restapi/data-fetcher/interfaces/data-fetcher.interface';

describe('DataFetcherInterface Security', () => {
  let dataFetcherInterface: DataFetcherInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataFetcherInterface],
    }).compile();

    dataFetcherInterface = module.get<DataFetcherInterface>(DataFetcherInterface);
  });

  it('should be defined', () => {
    expect(dataFetcherInterface).toBeDefined();
  });
});

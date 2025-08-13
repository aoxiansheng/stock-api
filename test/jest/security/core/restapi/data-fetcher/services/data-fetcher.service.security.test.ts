import { Test, TestingModule } from '@nestjs/testing';
import { DataFetcherService } from '../../../src/core/restapi/data-fetcher/services/data-fetcher.service';

describe('DataFetcherService Security', () => {
  let dataFetcherService: DataFetcherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataFetcherService],
    }).compile();

    dataFetcherService = module.get<DataFetcherService>(DataFetcherService);
  });

  it('should be defined', () => {
    expect(dataFetcherService).toBeDefined();
  });
});

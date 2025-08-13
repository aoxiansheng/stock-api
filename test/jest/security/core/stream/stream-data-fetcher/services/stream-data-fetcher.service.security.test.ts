import { Test, TestingModule } from '@nestjs/testing';
import { StreamDataFetcherService } from '../../../src/core/stream/stream-data-fetcher/services/stream-data-fetcher.service';

describe('StreamDataFetcherService Security', () => {
  let streamDataFetcherService: StreamDataFetcherService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamDataFetcherService],
    }).compile();

    streamDataFetcherService = module.get<StreamDataFetcherService>(StreamDataFetcherService);
  });

  it('should be defined', () => {
    expect(streamDataFetcherService).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { StreamDataCacheService } from '../../../src/core/stream/stream-data-fetcher/services/stream-data-cache.service';

describe('StreamDataCacheService Security', () => {
  let streamDataCacheService: StreamDataCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamDataCacheService],
    }).compile();

    streamDataCacheService = module.get<StreamDataCacheService>(StreamDataCacheService);
  });

  it('should be defined', () => {
    expect(streamDataCacheService).toBeDefined();
  });
});

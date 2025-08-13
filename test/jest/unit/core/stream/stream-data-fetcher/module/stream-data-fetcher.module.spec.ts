import { Test, TestingModule } from '@nestjs/testing';
import { StreamDataFetcherModule } from '../../../src/core/stream/stream-data-fetcher/module/stream-data-fetcher.module';

describe('StreamDataFetcherModule', () => {
  let streamDataFetcherModule: StreamDataFetcherModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamDataFetcherModule],
    }).compile();

    streamDataFetcherModule = module.get<StreamDataFetcherModule>(StreamDataFetcherModule);
  });

  it('should be defined', () => {
    expect(streamDataFetcherModule).toBeDefined();
  });
});

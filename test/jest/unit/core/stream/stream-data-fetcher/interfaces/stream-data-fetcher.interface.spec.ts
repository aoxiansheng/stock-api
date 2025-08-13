import { Test, TestingModule } from '@nestjs/testing';
import { StreamDataFetcherInterface } from '../../../src/core/stream/stream-data-fetcher/interfaces/stream-data-fetcher.interface';

describe('StreamDataFetcherInterface', () => {
  let streamDataFetcherInterface: StreamDataFetcherInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamDataFetcherInterface],
    }).compile();

    streamDataFetcherInterface = module.get<StreamDataFetcherInterface>(StreamDataFetcherInterface);
  });

  it('should be defined', () => {
    expect(streamDataFetcherInterface).toBeDefined();
  });
});

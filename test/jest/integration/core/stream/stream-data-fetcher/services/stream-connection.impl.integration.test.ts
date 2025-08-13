import { Test, TestingModule } from '@nestjs/testing';
import { StreamConnectionImpl } from '../../../src/core/stream/stream-data-fetcher/services/stream-connection.impl';

describe('StreamConnectionImpl Integration', () => {
  let streamConnectionImpl: StreamConnectionImpl;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamConnectionImpl],
    }).compile();

    streamConnectionImpl = module.get<StreamConnectionImpl>(StreamConnectionImpl);
  });

  it('should be defined', () => {
    expect(streamConnectionImpl).toBeDefined();
  });
});

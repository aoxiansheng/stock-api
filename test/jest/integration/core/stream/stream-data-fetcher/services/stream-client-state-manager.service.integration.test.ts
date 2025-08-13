import { Test, TestingModule } from '@nestjs/testing';
import { StreamClientStateManagerService } from '../../../src/core/stream/stream-data-fetcher/services/stream-client-state-manager.service';

describe('StreamClientStateManagerService Integration', () => {
  let streamClientStateManagerService: StreamClientStateManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamClientStateManagerService],
    }).compile();

    streamClientStateManagerService = module.get<StreamClientStateManagerService>(StreamClientStateManagerService);
  });

  it('should be defined', () => {
    expect(streamClientStateManagerService).toBeDefined();
  });
});

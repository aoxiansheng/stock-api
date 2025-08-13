import { Test, TestingModule } from '@nestjs/testing';
import { StreamRecoveryWorkerService } from '../../../src/core/stream/stream-data-fetcher/services/stream-recovery-worker.service';

describe('StreamRecoveryWorkerService Integration', () => {
  let streamRecoveryWorkerService: StreamRecoveryWorkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamRecoveryWorkerService],
    }).compile();

    streamRecoveryWorkerService = module.get<StreamRecoveryWorkerService>(StreamRecoveryWorkerService);
  });

  it('should be defined', () => {
    expect(streamRecoveryWorkerService).toBeDefined();
  });
});

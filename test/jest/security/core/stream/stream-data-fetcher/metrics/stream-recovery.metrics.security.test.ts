import { Test, TestingModule } from '@nestjs/testing';
import { StreamRecoveryMetrics } from '../../../src/core/stream/stream-data-fetcher/metrics/stream-recovery.metrics';

describe('StreamRecoveryMetrics Security', () => {
  let streamRecoveryMetrics: StreamRecoveryMetrics;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamRecoveryMetrics],
    }).compile();

    streamRecoveryMetrics = module.get<StreamRecoveryMetrics>(StreamRecoveryMetrics);
  });

  it('should be defined', () => {
    expect(streamRecoveryMetrics).toBeDefined();
  });
});

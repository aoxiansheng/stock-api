import { Test, TestingModule } from '@nestjs/testing';
import { StreamRecoveryConfig } from '../../../src/core/stream/stream-data-fetcher/config/stream-recovery.config';

describe('StreamRecoveryConfig Security', () => {
  let streamRecoveryConfig: StreamRecoveryConfig;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamRecoveryConfig],
    }).compile();

    streamRecoveryConfig = module.get<StreamRecoveryConfig>(StreamRecoveryConfig);
  });

  it('should be defined', () => {
    expect(streamRecoveryConfig).toBeDefined();
  });
});

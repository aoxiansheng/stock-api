import { Test, TestingModule } from '@nestjs/testing';
import { StreamCapabilityInterface } from '../../../src/providers/interfaces/stream-capability.interface';

describe('StreamCapabilityInterface Integration', () => {
  let streamCapabilityInterface: StreamCapabilityInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamCapabilityInterface],
    }).compile();

    streamCapabilityInterface = module.get<StreamCapabilityInterface>(StreamCapabilityInterface);
  });

  it('should be defined', () => {
    expect(streamCapabilityInterface).toBeDefined();
  });
});

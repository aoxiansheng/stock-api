import { Test, TestingModule } from '@nestjs/testing';
import { StreamReceiverModule } from '../../../src/core/stream/stream-receiver/module/stream-receiver.module';

describe('StreamReceiverModule', () => {
  let streamReceiverModule: StreamReceiverModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamReceiverModule],
    }).compile();

    streamReceiverModule = module.get<StreamReceiverModule>(StreamReceiverModule);
  });

  it('should be defined', () => {
    expect(streamReceiverModule).toBeDefined();
  });
});

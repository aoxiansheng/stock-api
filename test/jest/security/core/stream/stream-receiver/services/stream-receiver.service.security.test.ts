import { Test, TestingModule } from '@nestjs/testing';
import { StreamReceiverService } from '../../../src/core/stream/stream-receiver/services/stream-receiver.service';

describe('StreamReceiverService Security', () => {
  let streamReceiverService: StreamReceiverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamReceiverService],
    }).compile();

    streamReceiverService = module.get<StreamReceiverService>(StreamReceiverService);
  });

  it('should be defined', () => {
    expect(streamReceiverService).toBeDefined();
  });
});

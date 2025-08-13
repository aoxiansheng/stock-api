import { Test, TestingModule } from '@nestjs/testing';
import { StreamReceiverGateway } from '../../../src/core/stream/stream-receiver/gateway/stream-receiver.gateway';

describe('StreamReceiverGateway', () => {
  let streamReceiverGateway: StreamReceiverGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamReceiverGateway],
    }).compile();

    streamReceiverGateway = module.get<StreamReceiverGateway>(StreamReceiverGateway);
  });

  it('should be defined', () => {
    expect(streamReceiverGateway).toBeDefined();
  });
});

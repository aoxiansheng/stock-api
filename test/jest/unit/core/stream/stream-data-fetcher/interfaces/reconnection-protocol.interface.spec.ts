import { Test, TestingModule } from '@nestjs/testing';
import { ReconnectionProtocolInterface } from '../../../src/core/stream/stream-data-fetcher/interfaces/reconnection-protocol.interface';

describe('ReconnectionProtocolInterface', () => {
  let reconnectionProtocolInterface: ReconnectionProtocolInterface;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReconnectionProtocolInterface],
    }).compile();

    reconnectionProtocolInterface = module.get<ReconnectionProtocolInterface>(ReconnectionProtocolInterface);
  });

  it('should be defined', () => {
    expect(reconnectionProtocolInterface).toBeDefined();
  });
});

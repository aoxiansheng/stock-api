import { Test, TestingModule } from '@nestjs/testing';
import { WsAuthGuard } from '../../../src/core/stream/stream-receiver/guards/ws-auth.guard';

describe('WsAuthGuard Security', () => {
  let wsAuthGuard: WsAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WsAuthGuard],
    }).compile();

    wsAuthGuard = module.get<WsAuthGuard>(WsAuthGuard);
  });

  it('should be defined', () => {
    expect(wsAuthGuard).toBeDefined();
  });
});

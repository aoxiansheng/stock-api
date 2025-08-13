import { Test, TestingModule } from '@nestjs/testing';
import { WsAuthDecorator } from '../../../src/core/stream/stream-receiver/decorators/ws-auth.decorator';

describe('WsAuthDecorator Integration', () => {
  let wsAuthDecorator: WsAuthDecorator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WsAuthDecorator],
    }).compile();

    wsAuthDecorator = module.get<WsAuthDecorator>(WsAuthDecorator);
  });

  it('should be defined', () => {
    expect(wsAuthDecorator).toBeDefined();
  });
});

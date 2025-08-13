import { Test, TestingModule } from '@nestjs/testing';
import { ReceiverModule } from '../../../src/core/restapi/receiver/module/receiver.module';

describe('ReceiverModule', () => {
  let receiverModule: ReceiverModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReceiverModule],
    }).compile();

    receiverModule = module.get<ReceiverModule>(ReceiverModule);
  });

  it('should be defined', () => {
    expect(receiverModule).toBeDefined();
  });
});

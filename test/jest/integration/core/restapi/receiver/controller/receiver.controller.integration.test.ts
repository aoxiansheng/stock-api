import { Test, TestingModule } from '@nestjs/testing';
import { ReceiverController } from '../../../src/core/restapi/receiver/controller/receiver.controller';

describe('ReceiverController Integration', () => {
  let receiverController: ReceiverController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReceiverController],
    }).compile();

    receiverController = module.get<ReceiverController>(ReceiverController);
  });

  it('should be defined', () => {
    expect(receiverController).toBeDefined();
  });
});

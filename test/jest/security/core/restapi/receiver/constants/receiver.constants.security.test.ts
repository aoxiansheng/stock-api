import { Test, TestingModule } from '@nestjs/testing';
import { ReceiverConstants } from '../../../src/core/restapi/receiver/constants/receiver.constants';

describe('ReceiverConstants Security', () => {
  let receiverConstants: ReceiverConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReceiverConstants],
    }).compile();

    receiverConstants = module.get<ReceiverConstants>(ReceiverConstants);
  });

  it('should be defined', () => {
    expect(receiverConstants).toBeDefined();
  });
});

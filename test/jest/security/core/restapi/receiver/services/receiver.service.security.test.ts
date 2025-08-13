import { Test, TestingModule } from '@nestjs/testing';
import { ReceiverService } from '../../../src/core/restapi/receiver/services/receiver.service';

describe('ReceiverService Security', () => {
  let receiverService: ReceiverService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReceiverService],
    }).compile();

    receiverService = module.get<ReceiverService>(ReceiverService);
  });

  it('should be defined', () => {
    expect(receiverService).toBeDefined();
  });
});

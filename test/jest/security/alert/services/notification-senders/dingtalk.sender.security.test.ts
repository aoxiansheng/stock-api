import { Test, TestingModule } from '@nestjs/testing';
import { DingtalkSender } from '../../../src/alert/services/notification-senders/dingtalk.sender';

describe('DingtalkSender Security', () => {
  let dingtalkSender: DingtalkSender;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DingtalkSender],
    }).compile();

    dingtalkSender = module.get<DingtalkSender>(DingtalkSender);
  });

  it('should be defined', () => {
    expect(dingtalkSender).toBeDefined();
  });
});

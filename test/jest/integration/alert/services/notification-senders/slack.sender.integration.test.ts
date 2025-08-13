import { Test, TestingModule } from '@nestjs/testing';
import { SlackSender } from '../../../src/alert/services/notification-senders/slack.sender';

describe('SlackSender Integration', () => {
  let slackSender: SlackSender;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlackSender],
    }).compile();

    slackSender = module.get<SlackSender>(SlackSender);
  });

  it('should be defined', () => {
    expect(slackSender).toBeDefined();
  });
});

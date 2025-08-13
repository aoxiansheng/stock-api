import { Test, TestingModule } from '@nestjs/testing';
import { WebhookSender } from '../../../src/alert/services/notification-senders/webhook.sender';

describe('WebhookSender Security', () => {
  let webhookSender: WebhookSender;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebhookSender],
    }).compile();

    webhookSender = module.get<WebhookSender>(WebhookSender);
  });

  it('should be defined', () => {
    expect(webhookSender).toBeDefined();
  });
});

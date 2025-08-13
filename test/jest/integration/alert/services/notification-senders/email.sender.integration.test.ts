import { Test, TestingModule } from '@nestjs/testing';
import { EmailSender } from '../../../src/alert/services/notification-senders/email.sender';

describe('EmailSender Integration', () => {
  let emailSender: EmailSender;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailSender],
    }).compile();

    emailSender = module.get<EmailSender>(EmailSender);
  });

  it('should be defined', () => {
    expect(emailSender).toBeDefined();
  });
});

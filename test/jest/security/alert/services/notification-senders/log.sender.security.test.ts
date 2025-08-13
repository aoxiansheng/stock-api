import { Test, TestingModule } from '@nestjs/testing';
import { LogSender } from '../../../src/alert/services/notification-senders/log.sender';

describe('LogSender Security', () => {
  let logSender: LogSender;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LogSender],
    }).compile();

    logSender = module.get<LogSender>(LogSender);
  });

  it('should be defined', () => {
    expect(logSender).toBeDefined();
  });
});

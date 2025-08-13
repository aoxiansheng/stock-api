import { Test, TestingModule } from '@nestjs/testing';
import { NotificationConfig } from '../../../src/common/config/notification.config';

describe('NotificationConfig Integration', () => {
  let notificationConfig: NotificationConfig;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationConfig],
    }).compile();

    notificationConfig = module.get<NotificationConfig>(NotificationConfig);
  });

  it('should be defined', () => {
    expect(notificationConfig).toBeDefined();
  });
});

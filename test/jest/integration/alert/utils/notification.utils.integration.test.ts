import { Test, TestingModule } from '@nestjs/testing';
import { NotificationUtils } from '../../../src/alert/utils/notification.utils';

describe('NotificationUtils Integration', () => {
  let notificationUtils: NotificationUtils;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationUtils],
    }).compile();

    notificationUtils = module.get<NotificationUtils>(NotificationUtils);
  });

  it('should be defined', () => {
    expect(notificationUtils).toBeDefined();
  });
});

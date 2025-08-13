import { Test, TestingModule } from '@nestjs/testing';
import { NotificationConstants } from '../../../src/alert/constants/notification.constants';

describe('NotificationConstants Security', () => {
  let notificationConstants: NotificationConstants;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationConstants],
    }).compile();

    notificationConstants = module.get<NotificationConstants>(NotificationConstants);
  });

  it('should be defined', () => {
    expect(notificationConstants).toBeDefined();
  });
});

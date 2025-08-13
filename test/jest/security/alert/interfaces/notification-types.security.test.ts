import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTypes } from '../../../src/alert/interfaces/notification-types';

describe('NotificationTypes Security', () => {
  let notificationTypes: NotificationTypes;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationTypes],
    }).compile();

    notificationTypes = module.get<NotificationTypes>(NotificationTypes);
  });

  it('should be defined', () => {
    expect(notificationTypes).toBeDefined();
  });
});

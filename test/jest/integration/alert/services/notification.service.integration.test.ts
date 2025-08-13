import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../../../src/alert/services/notification.service';

describe('NotificationService Integration', () => {
  let notificationService: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationService],
    }).compile();

    notificationService = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(notificationService).toBeDefined();
  });
});

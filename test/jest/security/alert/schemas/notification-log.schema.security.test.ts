import { Test, TestingModule } from '@nestjs/testing';
import { NotificationLogSchema } from '../../../src/alert/schemas/notification-log.schema';

describe('NotificationLogSchema Security', () => {
  let notificationLogSchema: NotificationLogSchema;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationLogSchema],
    }).compile();

    notificationLogSchema = module.get<NotificationLogSchema>(NotificationLogSchema);
  });

  it('should be defined', () => {
    expect(notificationLogSchema).toBeDefined();
  });
});

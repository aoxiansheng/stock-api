import { Test, TestingModule } from '@nestjs/testing';
import { NotificationModule } from '@notification/notification.module';
import { NotificationService } from '@notification/services/notification.service';

describe('NotificationModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [NotificationModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should resolve NotificationService', () => {
    const service = module.get<NotificationService>(NotificationService);
    expect(service).toBeDefined();
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationChannelDto } from '../../../src/alert/dto/notification-channel.dto';

describe('NotificationChannelDto Integration', () => {
  let notificationChannelDto: NotificationChannelDto;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationChannelDto],
    }).compile();

    notificationChannelDto = module.get<NotificationChannelDto>(NotificationChannelDto);
  });

  it('should be defined', () => {
    expect(notificationChannelDto).toBeDefined();
  });
});

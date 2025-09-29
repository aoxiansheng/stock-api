import * as NotificationDTOs from '@notification/dto';

describe('Notification DTOs Index', () => {
  it('should export all DTO classes', () => {
    expect(NotificationDTOs.NotificationRequestDto).toBeDefined();
    expect(NotificationDTOs.BatchNotificationRequestDto).toBeDefined();
    expect(NotificationDTOs.NotificationRequestResultDto).toBeDefined();
    expect(NotificationDTOs.NotificationQueryDto).toBeDefined();
    expect(NotificationDTOs.NotificationHistoryDto).toBeDefined();
    expect(NotificationDTOs.NotificationChannelDto).toBeDefined();
    expect(NotificationDTOs.TemplateQueryDto).toBeDefined();
  });

  it('should export channel DTO classes', () => {
    expect(NotificationDTOs.EmailConfigDto).toBeDefined();
    expect(NotificationDTOs.SlackConfigDto).toBeDefined();
    expect(NotificationDTOs.SmsConfigDto).toBeDefined();
    expect(NotificationDTOs.DingTalkConfigDto).toBeDefined();
    expect(NotificationDTOs.WebhookConfigDto).toBeDefined();
    expect(NotificationDTOs.LogConfigDto).toBeDefined();
  });

  it('should export factory and result classes', () => {
    expect(NotificationDTOs.NotificationRequestFactory).toBeDefined();
    expect(NotificationDTOs.NotificationRequestResultDto).toBeDefined();
  });
});

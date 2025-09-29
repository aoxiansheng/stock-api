import * as ChannelDtos from '@notification/dto/channels';

describe('Notification Channels DTOs Index', () => {
  it('should export all channel DTOs', () => {
    expect(ChannelDtos.EmailConfigDto).toBeDefined();
    expect(ChannelDtos.SlackConfigDto).toBeDefined();
    expect(ChannelDtos.SmsConfigDto).toBeDefined();
    expect(ChannelDtos.DingTalkConfigDto).toBeDefined();
    expect(ChannelDtos.WebhookConfigDto).toBeDefined();
    expect(ChannelDtos.LogConfigDto).toBeDefined();
  });
});

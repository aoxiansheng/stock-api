import * as Senders from '@notification/services/senders';

describe('Notification Senders Index', () => {
  it('should export all sender classes', () => {
    expect(Senders.SlackSender).toBeDefined();
    expect(Senders.EmailSender).toBeDefined();
    expect(Senders.DingTalkSender).toBeDefined();
    expect(Senders.WebhookSender).toBeDefined();
    expect(Senders.LogSender).toBeDefined();
  });
});

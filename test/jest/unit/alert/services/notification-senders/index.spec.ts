import * as NotificationSendersIndex from '../../../../../../src/alert/services/notification-senders/index';
import { DingTalkSender } from '../../../../../../src/alert/services/notification-senders/dingtalk.sender';
import { EmailSender } from '../../../../../../src/alert/services/notification-senders/email.sender';
import { LogSender } from '../../../../../../src/alert/services/notification-senders/log.sender';
import { SlackSender } from '../../../../../../src/alert/services/notification-senders/slack.sender';
import { WebhookSender } from '../../../../../../src/alert/services/notification-senders/webhook.sender';

describe('Notification Senders Index', () => {
  it('should export DingTalkSender', () => {
    expect(NotificationSendersIndex.DingTalkSender).toBeDefined();
    expect(NotificationSendersIndex.DingTalkSender).toBe(DingTalkSender);
  });

  it('should export EmailSender', () => {
    expect(NotificationSendersIndex.EmailSender).toBeDefined();
    expect(NotificationSendersIndex.EmailSender).toBe(EmailSender);
  });

  it('should export LogSender', () => {
    expect(NotificationSendersIndex.LogSender).toBeDefined();
    expect(NotificationSendersIndex.LogSender).toBe(LogSender);
  });

  it('should export SlackSender', () => {
    expect(NotificationSendersIndex.SlackSender).toBeDefined();
    expect(NotificationSendersIndex.SlackSender).toBe(SlackSender);
  });

  it('should export WebhookSender', () => {
    expect(NotificationSendersIndex.WebhookSender).toBeDefined();
    expect(NotificationSendersIndex.WebhookSender).toBe(WebhookSender);
  });

  it('should export all expected notification senders', () => {
    const expectedExports = [
      'DingTalkSender',
      'EmailSender', 
      'LogSender',
      'SlackSender',
      'WebhookSender'
    ];
    
    expectedExports.forEach(exportName => {
      expect(NotificationSendersIndex[exportName]).toBeDefined();
    });
  });

  it('should not export undefined values', () => {
    Object.values(NotificationSendersIndex).forEach(exportedValue => {
      expect(exportedValue).toBeDefined();
    });
  });

  it('should have all exports as constructors', () => {
    Object.values(NotificationSendersIndex).forEach(exportedValue => {
      expect(typeof exportedValue).toBe('function');
    });
  });

  it('should support sender class references', () => {
    expect(NotificationSendersIndex.DingTalkSender).toBeInstanceOf(Function);
    expect(NotificationSendersIndex.EmailSender).toBeInstanceOf(Function);
    expect(NotificationSendersIndex.LogSender).toBeInstanceOf(Function);
    expect(NotificationSendersIndex.SlackSender).toBeInstanceOf(Function);
    expect(NotificationSendersIndex.WebhookSender).toBeInstanceOf(Function);
  });

  it('should maintain sender naming consistency', () => {
    // All notification senders should end with 'Sender'
    const senderNames = Object.keys(NotificationSendersIndex);
    senderNames.forEach(name => {
      expect(name.endsWith('Sender')).toBe(true);
    });
  });

  it('should support different notification channels', () => {
    const channels = ['Dingtalk', 'Email', 'Log', 'Slack', 'Webhook'];
    channels.forEach(channel => {
      const senderName = `${channel}Sender`;
      expect(NotificationSendersIndex[senderName]).toBeDefined();
    });
  });
});

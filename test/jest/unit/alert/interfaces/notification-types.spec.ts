
import {
  INotificationChannel,
  INotificationResult,
  IBatchNotificationResult,
  INotificationSender,
  INotificationTemplate,
  INotificationLog,
} from '../../../../../src/alert/interfaces/notification-types';

import {
  NotificationChannel,
  NotificationResult,
  BatchNotificationResult,
  NotificationSender,
  NotificationTemplate,
  NotificationLog,
  NotificationChannelType,
} from '../../../../../src/alert/types/alert.types';

describe('NotificationTypes Interface Re-exports', () => {
  describe('Type Alias Compatibility', () => {
    it('should correctly re-export INotificationChannel type', () => {
      // Arrange & Act - 验证类型别名
      const channel: INotificationChannel = {
        name: 'Email Channel',
        type: NotificationChannelType.EMAIL,
        config: {},
        enabled: true,
      };
      const originalChannel: NotificationChannel = channel;

      // Assert - 验证类型和值
      expect(channel.type).toBe(NotificationChannelType.EMAIL);
      expect(channel).toBe(originalChannel);
    });

    it('should correctly re-export INotificationResult type', () => {
      // Arrange
      const result: INotificationResult = {
        success: true,
        channelId: 'channel-1',
        channelType: NotificationChannelType.EMAIL,
        message: '发送成功',
        sentAt: new Date(),
        duration: 100,
      };

      const originalResult: NotificationResult = result;

      // Assert - 验证结果
      expect(result.success).toBe(true);
      expect(result.channelId).toBe('channel-1');
      expect(result.channelType).toBe(NotificationChannelType.EMAIL);
      expect(result.message).toBe('发送成功');
      expect(result.sentAt).toBeInstanceOf(Date);
      expect(result.duration).toBe(100);
      expect(result).toBe(originalResult);
    });

    it('should correctly re-export IBatchNotificationResult type', () => {
      // Arrange
      const batchResult: IBatchNotificationResult = {
        total: 5,
        successful: 4,
        failed: 1,
        results: [
          {
            success: true,
            channelId: 'channel-1',
            channelType: NotificationChannelType.EMAIL,
            message: '发送成功',
            sentAt: new Date(),
            duration: 50,
          },
          {
            success: false,
            channelId: 'channel-2',
            channelType: NotificationChannelType.WEBHOOK,
            message: '发送失败',
            error: '网络错误',
            sentAt: new Date(),
            duration: 150,
          },
        ],
        duration: 200,
      };

      const originalBatchResult: BatchNotificationResult = batchResult;

      // Assert - 验证批量结果
      expect(batchResult.total).toBe(5);
      expect(batchResult.successful).toBe(4);
      expect(batchResult.failed).toBe(1);
      expect(Array.isArray(batchResult.results)).toBe(true);
      expect(batchResult.results).toHaveLength(2);
      expect(batchResult.duration).toBe(200);
      expect(batchResult).toBe(originalBatchResult);
    });

    it('should correctly re-export INotificationSender type', () => {
      // Arrange
      const sender: INotificationSender = {
        type: NotificationChannelType.EMAIL,
        send: jest.fn(),
        test: jest.fn(),
        validateConfig: jest.fn(() => ({ valid: true, errors: [] })),
      };

      const originalSender: NotificationSender = sender;

      // Assert - 验证发送者
      expect(sender.type).toBe(NotificationChannelType.EMAIL);
      expect(typeof sender.send).toBe('function');
      expect(typeof sender.test).toBe('function');
      expect(typeof sender.validateConfig).toBe('function');
      expect(sender).toBe(originalSender);
    });

    it('should correctly re-export INotificationTemplate type', () => {
      // Arrange
      const template: INotificationTemplate = {
        subject: '测试主题',
        body: '测试内容 {variable}',
        variables: { variable: 'value' },
        format: 'text',
      };

      const originalTemplate: NotificationTemplate = template;

      // Assert - 验证模板
      expect(template.subject).toBe('测试主题');
      expect(template.body).toBe('测试内容 {variable}');
      expect(template.variables).toEqual({ variable: 'value' });
      expect(template.format).toBe('text');
      expect(template).toBe(originalTemplate);
    });

    it('should correctly re-export INotificationLog type', () => {
      // Arrange
      const log: INotificationLog = {
        id: 'log-789',
        alertId: 'alert-123',
        channelId: 'channel-1',
        channelType: NotificationChannelType.EMAIL,
        success: true,
        message: '发送成功',
        sentAt: new Date(),
        duration: 100,
        retryCount: 0,
        metadata: { messageId: 'msg-abc' },
      };

      const originalLog: NotificationLog = log;

      // Assert - 验证日志
      expect(log.id).toBe('log-789');
      expect(log.alertId).toBe('alert-123');
      expect(log.channelId).toBe('channel-1');
      expect(log.channelType).toBe(NotificationChannelType.EMAIL);
      expect(log.success).toBe(true);
      expect(log.message).toBe('发送成功');
      expect(log.sentAt).toBeInstanceOf(Date);
      expect(log.duration).toBe(100);
      expect(log.retryCount).toBe(0);
      expect(log.metadata).toEqual({ messageId: 'msg-abc' });
      expect(log).toBe(originalLog);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain backward compatibility for legacy code using I-prefixed types', () => {
      // Arrange - 模拟使用 I-prefixed 接口的旧代码
      function legacyFunction(
        channel: INotificationChannel,
        result: INotificationResult,
        batchResult: IBatchNotificationResult,
        sender: INotificationSender,
        template: INotificationTemplate,
        log: INotificationLog,
      ) {
        return {
          channel,
          result,
          batchResult,
          sender,
          template,
          log,
        };
      }

      // Act - 模拟传入新类型
      const channel: NotificationChannel = {
        name: 'SMS Channel',
        type: NotificationChannelType.SMS,
        config: {},
        enabled: true,
      };
      const result: NotificationResult = {
        success: true,
        channelId: 'sms-channel',
        channelType: NotificationChannelType.SMS,
        sentAt: new Date(),
        duration: 50,
      };
      const batchResult: BatchNotificationResult = {
        total: 1,
        successful: 1,
        failed: 0,
        results: [result],
        duration: 50,
      };
      const sender: NotificationSender = {
        type: NotificationChannelType.SMS,
        send: jest.fn(),
        test: jest.fn(),
        validateConfig: jest.fn(() => ({ valid: true, errors: [] })),
      };
      const template: NotificationTemplate = {
        subject: 'SMS Subject',
        body: 'SMS Body',
        variables: {},
      };
      const log: NotificationLog = {
        id: 'log-legacy',
        alertId: 'alert-legacy',
        channelId: 'sms-channel',
        channelType: NotificationChannelType.SMS,
        success: true,
        sentAt: new Date(),
        duration: 50,
        retryCount: 0,
      };

      const legacyResult = legacyFunction(
        channel,
        result,
        batchResult,
        sender,
        template,
        log,
      );

      // Assert - 验证兼容性
      expect(legacyResult.channel.type).toBe(NotificationChannelType.SMS);
      expect(legacyResult.result.success).toBe(true);
      expect(legacyResult.batchResult.total).toBe(1);
      expect(legacyResult.sender.type).toBe(NotificationChannelType.SMS);
      expect(legacyResult.template.subject).toBe('SMS Subject');
      expect(legacyResult.log.id).toBe('log-legacy');
    });

    it('should allow type interchangeability between I-prefixed and original types', () => {
      // Arrange & Act - 验证类型互换性
      const originalChannel: NotificationChannel = {
        name: 'Push Channel',
        type: NotificationChannelType.WEBHOOK, // Changed from PUSH to WEBHOOK
        config: {},
        enabled: true,
      };
      const legacyChannel: INotificationChannel = originalChannel;
      const backToOriginal: NotificationChannel = legacyChannel;

      // Assert
      expect(originalChannel).toBe(legacyChannel);
      expect(legacyChannel).toBe(backToOriginal);
      expect(originalChannel).toBe(backToOriginal);
    });
  });

  describe('Type Structure Validation', () => {
    it('should validate NotificationChannel type values', () => {
      // Arrange & Act
      const emailChannel: INotificationChannel = {
        name: 'Email Channel',
        type: NotificationChannelType.EMAIL,
        config: {},
        enabled: true,
      };
      const smsChannel: INotificationChannel = {
        name: 'SMS Channel',
        type: NotificationChannelType.SMS,
        config: {},
        enabled: true,
      };
      const webhookChannel: INotificationChannel = {
        name: 'Webhook Channel',
        type: NotificationChannelType.WEBHOOK,
        config: {},
        enabled: true,
      };

      // Assert - 验证枚举值
      expect(Object.values(NotificationChannelType)).toContain(emailChannel.type);
      expect(Object.values(NotificationChannelType)).toContain(smsChannel.type);
      expect(Object.values(NotificationChannelType)).toContain(webhookChannel.type);
    });

    it('should validate complex nested type structures', () => {
      // Arrange
      const complexResult: IBatchNotificationResult = {
        total: 3,
        successful: 2,
        failed: 1,
        results: [
          {
            success: true,
            channelId: 'c1',
            channelType: NotificationChannelType.EMAIL,
            sentAt: new Date(),
            duration: 10,
          },
          {
            success: true,
            channelId: 'c2',
            channelType: NotificationChannelType.SLACK,
            sentAt: new Date(),
            duration: 20,
          },
          {
            success: false,
            channelId: 'c3',
            channelType: NotificationChannelType.WEBHOOK,
            sentAt: new Date(),
            duration: 30,
            error: 'failed',
          },
        ],
        duration: 60,
      };

      // Assert - 验证复杂结构
      expect(complexResult.total).toBe(
        complexResult.successful + complexResult.failed,
      );
      expect(complexResult.results).toHaveLength(complexResult.total);
      expect(
        complexResult.results.filter(r => r.success),
      ).toHaveLength(complexResult.successful);
      expect(
        complexResult.results.filter(r => !r.success),
      ).toHaveLength(complexResult.failed);
      expect(complexResult.duration).toBe(60);
    });
  });

  describe('File Migration Verification', () => {
    it('should verify that types are correctly imported from the new location', () => {
      // Act - 验证导入
      const testChannel: INotificationChannel = {
        name: 'Test Channel',
        type: NotificationChannelType.EMAIL,
        config: {},
        enabled: true,
      };
      const testResult: INotificationResult = {
        success: true,
        channelId: 'test-channel',
        channelType: NotificationChannelType.EMAIL,
        sentAt: new Date(),
        duration: 1,
      };

      // Assert - 验证类型定义
      expect(testChannel).toBeDefined();
      expect(testResult).toBeDefined();
      expect(testResult.success).toBe(true);
      expect(testResult.channelId).toBe('test-channel');
    });

    it('should maintain all original type properties and methods', () => {
      // Arrange
      const template: INotificationTemplate = {
        subject: 'Original Subject',
        body: 'Original Body',
        variables: { key: 'value' },
        format: 'html',
      };

      // Act & Assert - 验证属性和方法
      expect(typeof template.subject).toBe('string');
      expect(typeof template.body).toBe('string');
      expect(typeof template.variables).toBe('object');
      expect(typeof template.format).toBe('string');
    });
  });
});

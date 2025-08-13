/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { EmailSender } from '../../../../../../src/alert/services/notification-senders/email.sender';
import { NotificationChannelType, AlertSeverity, AlertStatus } from '../../../../../../src/alert/types/alert.types';

describe('EmailSender', () => {
  let sender: EmailSender;

  const mockAlert = {
    id: 'alert123',
    ruleId: 'rule123',
    severity: AlertSeverity.CRITICAL,
    metric: 'CPU Usage',
    value: 95,
    threshold: 90,
    status: AlertStatus.FIRING,
    startTime: new Date('2023-01-_01T10:_00:00Z'),
    endTime: null,
    message: 'CPU usage is too high',
    ruleName: 'Test Rule',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRule = {
    id: 'rule123',
    name: 'High CPU Alert',
    description: 'Alert when CPU usage exceeds 90%',
    metric: 'cpu_usage',
    operator: 'gt' as const,
    threshold: 90,
    duration: 60,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    channels: [],
    cooldown: 300,
    tags: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConfig = {
    id: 'email-channel-1',
    to: 'test@example.com',
    subject: 'Test Subject',
    from: 'sender@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailSender],
    }).compile();

    sender = module.get<EmailSender>(EmailSender);
  });

  it('should be defined', () => {
    expect(sender).toBeDefined();
  });

  it('should have the correct type', () => {
    expect(sender.type).toEqual(NotificationChannelType.EMAIL);
  });

  describe('send', () => {
    it('should return success: true for a simulated successful email send', async () => {
      const result = await sender.send(mockAlert, mockRule, mockConfig);

      expect(result.success).toBe(true);
      expect(result.channelType).toEqual(NotificationChannelType.EMAIL);
      expect(result.message).toEqual(`邮件已发送到 ${mockConfig.to}`);
      expect(result.sentAt).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should return success: false if an _error occurs during send', async () => {
      // 模拟在模拟邮件服务过程中发生异常
      // 通过模拟 logger.log 方法抛出异常来触发 catch 块
      jest.spyOn(sender['logger'], 'log').mockImplementationOnce(() => { 
        throw new Error('邮件发送失败'); 
      });

      const result = await sender.send(mockAlert, mockRule, mockConfig);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toEqual('邮件发送失败');
    });
  });

  describe('test', () => {
    it('should return true if to and subject are provided', async () => {
      const config = { to: 'test@example.com', subject: 'Test' };
      const result = await sender.test(config);
      expect(result).toBe(true);
    });

    it('should return false if to is missing', async () => {
      const config = { subject: 'Test' };
      const result = await sender.test(config);
      expect(result).toBe(false);
    });

    it('should return false if subject is missing', async () => {
      const config = { to: 'test@example.com' };
      const result = await sender.test(config);
      expect(result).toBe(false);
    });

    it('should return false if both to and subject are missing', async () => {
      const config = {};
      const result = await sender.test(config);
      expect(result).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should return valid: true for a valid configuration', () => {
      const config = {
        to: 'test@example.com',
        subject: 'Test Subject',
        from: 'sender@example.com',
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return valid: false if to is missing', () => {
      const config = { subject: 'Test Subject' };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email recipient (to) is required');
    });

    it('should return valid: false if to is not a string', () => {
      const config = { to: 123, subject: 'Test Subject' };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email recipient (to) must be a string');
    });

    it('should return valid: false if to is not a valid email address', () => {
      const config = { to: 'invalid-email', subject: 'Test Subject' };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email recipient (to) must be a valid email address');
    });

    it('should return valid: false if subject is missing', () => {
      const config = { to: 'test@example.com' };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email subject is required');
    });

    it('should return valid: false if subject is not a string', () => {
      const config = { to: 'test@example.com', subject: 123 };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email subject must be a string');
    });

    it('should return valid: false if from is not a string', () => {
      const config = {
        to: 'test@example.com',
        subject: 'Test Subject',
        from: 123,
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email sender (from) must be a string');
    });

    it('should return valid: false if from is not a valid email address', () => {
      const config = {
        to: 'test@example.com',
        subject: 'Test Subject',
        from: 'invalid-from',
      };
      const result = sender.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email sender (from) must be a valid email address');
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { EmailSender } from '../../../../../../src/alert/services/notification-senders/email.sender';
import { Alert, AlertRule, NotificationChannelType } from '../../../../../../src/alert/types/alert.types';

const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
};

jest.mock('../../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

describe('EmailSender', () => {
  let sender: EmailSender;

  const mockRule: AlertRule = {
    id: 'rule-1', name: 'Test Rule', metric: 'cpu', operator: 'gt', threshold: 80, duration: 60, severity: 'critical', enabled: true, channels: [], cooldown: 300, createdAt: new Date(), updatedAt: new Date(),
  };

  const mockAlert: Alert = {
    id: 'alert-1', ruleId: 'rule-1', ruleName: 'Test Rule', message: 'Test alert message', metric: 'cpu', value: 90, threshold: 80, severity: 'critical', status: 'firing', startTime: new Date(), createdAt: new Date(), updatedAt: new Date(),
  };
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailSender],
    }).compile();

    sender = module.get<EmailSender>(EmailSender);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(sender).toBeDefined();
    expect(sender.type).toBe(NotificationChannelType.EMAIL);
  });

  describe('send', () => {
    it('should log the simulated email and return success', async () => {
      const config = { to: 'test@example.com', subject: 'Test Alert' };
      const result = await sender.send(mockAlert, mockRule, config);

      expect(mockLogger.log).toHaveBeenCalledWith(`模拟发送邮件到: ${config.to}`);
      expect(result.success).toBe(true);
      expect(result.message).toContain(config.to);
    });

    it('should handle exceptions gracefully', async () => {
        const error = new Error('SMTP server down');
        mockLogger.log.mockImplementation(() => {
          throw error;
        });
        const config = { to: 'test@example.com', subject: 'Test Alert' };
        const result = await sender.send(mockAlert, mockRule, config);

        expect(result.success).toBe(false);
        expect(result.error).toBe(error.message);
        expect(mockLogger.error).toHaveBeenCalled();
      });
  });

  describe('test', () => {
    it('should return true if to and subject are provided', async () => {
      await expect(sender.test({ to: 'test@example.com', subject: 'Hi' })).resolves.toBe(true);
    });

    it('should return false if to is missing', async () => {
      await expect(sender.test({ subject: 'Hi' })).resolves.toBe(false);
    });

    it('should return false if subject is missing', async () => {
      await expect(sender.test({ to: 'test@example.com' })).resolves.toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should be valid for a correct configuration', () => {
      const { valid, errors } = sender.validateConfig({ to: 'test@example.com', subject: 'Alert' });
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it('should be valid with an optional from address', () => {
        const { valid, errors } = sender.validateConfig({ to: 'test@example.com', from: 'sender@example.com', subject: 'Alert' });
        expect(valid).toBe(true);
        expect(errors).toHaveLength(0);
    });

    it('should be invalid if "to" is missing', () => {
      const { valid, errors } = sender.validateConfig({ subject: 'Alert' });
      expect(valid).toBe(false);
      expect(errors).toContain('Email recipient (to) is required');
    });

    it('should be invalid if "to" is not a valid email', () => {
      const { valid, errors } = sender.validateConfig({ to: 'not-an-email', subject: 'Alert' });
      expect(valid).toBe(false);
      expect(errors).toContain('Email recipient (to) must be a valid email address');
    });

    it('should be invalid if "subject" is missing', () => {
        const { valid, errors } = sender.validateConfig({ to: 'test@example.com' });
        expect(valid).toBe(false);
        expect(errors).toContain('Email subject is required');
    });

    it('should be invalid if "from" is not a valid email', () => {
        const { valid, errors } = sender.validateConfig({ to: 'test@example.com', from: 'invalid', subject: 'Alert' });
        expect(valid).toBe(false);
        expect(errors).toContain('Email sender (from) must be a valid email address');
      });
  });
}); 
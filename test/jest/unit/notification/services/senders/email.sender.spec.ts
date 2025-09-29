import { Test, TestingModule } from '@nestjs/testing';
import { EmailSender } from '@notification/services/senders/email.sender';
import { NotificationChannelType, NotificationPriority, NotificationStatus } from '@notification/types/notification.types';

// Mock logger
const mockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => mockLogger),
}));

describe('EmailSender', () => {
  let sender: EmailSender;

  const mockNotification = {
    id: 'notification-1',
    alertId: 'alert-1',
    channelId: 'email-channel-1',
    title: 'Test Alert',
    content: '<h1>This is a test alert message</h1>',
    severity: 'high',
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    recipient: 'test@example.com',
    channelType: NotificationChannelType.EMAIL,
    createdAt: new Date('2023-01-15T10:00:00Z'),
    updatedAt: new Date('2023-01-15T10:00:00Z'),
    retryCount: 0,
    metadata: {
      source: 'test',
    },
  };

  const mockChannelConfig = {
    to: 'recipient@example.com',
    from: 'sender@example.com',
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'smtp-user',
        pass: 'smtp-password',
      },
    },
    timeout: 30000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailSender],
    }).compile();

    sender = module.get<EmailSender>(EmailSender);

    jest.clearAllMocks();
  });

  describe('send', () => {
    it('should send email notification successfully', async () => {
      const result = await sender.send(mockNotification, mockChannelConfig);

      expect(result).toEqual({
        success: true,
        channelId: mockNotification.channelId,
        channelType: NotificationChannelType.EMAIL,
        message: `邮件已发送到 ${mockNotification.recipient}`,
        sentAt: expect.any(Date),
        duration: expect.any(Number),
        deliveryId: expect.stringMatching(/^email_\d+$/),
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        '发送邮件通知',
        expect.objectContaining({
          notificationId: mockNotification.id,
          recipient: mockNotification.recipient,
          title: mockNotification.title,
          channelConfig: expect.objectContaining({
            to: mockChannelConfig.to,
            from: mockChannelConfig.from,
            smtp: 'configured',
          }),
        }),
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '邮件发送模拟完成',
        expect.objectContaining({
          to: mockNotification.recipient,
          subject: mockNotification.title,
        }),
      );
    });

    it('should handle email sending error', async () => {
      // Mock a potential error in the simulation by mocking the private method
      const originalSimulateEmailSending = (sender as any).simulateEmailSending;
      (sender as any).simulateEmailSending = jest.fn().mockRejectedValue(new Error('SMTP connection failed'));

      const result = await sender.send(mockNotification, mockChannelConfig);

      expect(result).toEqual({
        success: false,
        channelId: mockNotification.channelId,
        channelType: NotificationChannelType.EMAIL,
        error: 'SMTP connection failed',
        sentAt: expect.any(Date),
        duration: expect.any(Number),
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        '邮件发送失败',
        expect.objectContaining({
          notificationId: mockNotification.id,
          error: 'SMTP connection failed',
        }),
      );

      // Restore the original method
      (sender as any).simulateEmailSending = originalSimulateEmailSending;
    });

    it('should log correct channel config when SMTP is not configured', async () => {
      const configWithoutSmtp = {
        to: 'recipient@example.com',
        from: 'sender@example.com',
      };

      await sender.send(mockNotification, configWithoutSmtp);

      expect(mockLogger.log).toHaveBeenCalledWith(
        '发送邮件通知',
        expect.objectContaining({
          channelConfig: expect.objectContaining({
            smtp: 'not configured',
          }),
        }),
      );
    });
  });

  describe('test', () => {
    it('should test email configuration successfully', async () => {
      const result = await sender.test(mockChannelConfig);

      expect(result).toBe(true);
      expect(mockLogger.log).toHaveBeenCalledWith(
        '邮件配置测试通过',
        expect.objectContaining({
          to: mockChannelConfig.to,
          from: mockChannelConfig.from,
          smtp: 'configured',
        }),
      );
    });

    it('should return false for invalid configuration', async () => {
      const invalidConfig = {
        to: 'invalid-email',
        from: 'sender@example.com',
      };

      const result = await sender.test(invalidConfig);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '邮件配置验证失败',
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.stringContaining('收件人地址 (to) 格式无效'),
          ]),
        }),
      );
    });

    it('should return false when test throws error', async () => {
      // Mock validation to throw an error
      const originalValidateConfig = sender.validateConfig;
      sender.validateConfig = jest.fn().mockImplementation(() => {
        throw new Error('Validation error');
      });

      const result = await sender.test(mockChannelConfig);

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '邮件配置测试失败',
        expect.objectContaining({
          error: 'Validation error',
        }),
      );

      // Restore the original method
      sender.validateConfig = originalValidateConfig;
    });
  });

  describe('validateConfig', () => {
    it('should validate email configuration successfully', () => {
      const result = sender.validateConfig(mockChannelConfig);

      expect(result).toEqual({
        valid: true,
        errors: [],
      });
    });

    it('should return validation errors for missing required fields', () => {
      const invalidConfig = {};

      const result = sender.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([
        '收件人地址 (to) 是必填项',
        '发件人地址 (from) 是必填项',
      ]);
    });

    it('should return validation errors for invalid email formats', () => {
      const invalidConfig = {
        to: 'invalid-email-format',
        from: 'another-invalid-email',
      };

      const result = sender.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([
        '收件人地址 (to) 格式无效',
        '发件人地址 (from) 格式无效',
      ]);
    });

    it('should return validation errors for invalid field types', () => {
      const invalidConfig = {
        to: 123, // Should be string
        from: ['test@example.com'], // Should be string
      };

      const result = sender.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([
        '收件人地址 (to) 必须是字符串',
        '发件人地址 (from) 必须是字符串',
      ]);
    });

    it('should validate SMTP configuration when provided', () => {
      const configWithIncompleteSmtp = {
        to: 'test@example.com',
        from: 'sender@example.com',
        smtp: {
          // Missing host and port
          auth: {
            user: 'user',
            // Missing pass
          },
        },
      };

      const result = sender.validateConfig(configWithIncompleteSmtp);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          'SMTP主机地址是必填项',
          'SMTP端口是必填项',
          'SMTP密码是必填项',
        ]),
      );
    });

    it('should validate SMTP auth when provided', () => {
      const configWithIncompleteAuth = {
        to: 'test@example.com',
        from: 'sender@example.com',
        smtp: {
          host: 'smtp.example.com',
          port: 587,
          auth: {
            // Missing user and pass
          },
        },
      };

      const result = sender.validateConfig(configWithIncompleteAuth);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([
        'SMTP用户名是必填项',
        'SMTP密码是必填项',
      ]);
    });

    it('should pass validation for valid config without SMTP auth', () => {
      const configWithoutAuth = {
        to: 'test@example.com',
        from: 'sender@example.com',
        smtp: {
          host: 'smtp.example.com',
          port: 587,
          // No auth required
        },
      };

      const result = sender.validateConfig(configWithoutAuth);

      expect(result).toEqual({
        valid: true,
        errors: [],
      });
    });
  });

  describe('getConfigSchema', () => {
    it('should return valid config schema', () => {
      const schema = sender.getConfigSchema();

      expect(schema).toEqual({
        type: 'object',
        required: ['to', 'from'],
        properties: {
          to: {
            type: 'string',
            format: 'email',
            description: '收件人邮箱地址',
          },
          from: {
            type: 'string',
            format: 'email',
            description: '发件人邮箱地址',
          },
          smtp: {
            type: 'object',
            description: 'SMTP服务器配置',
            properties: {
              host: {
                type: 'string',
                description: 'SMTP服务器地址',
              },
              port: {
                type: 'number',
                description: 'SMTP端口',
                default: 587,
              },
              secure: {
                type: 'boolean',
                description: '是否使用SSL/TLS',
                default: false,
              },
              auth: {
                type: 'object',
                properties: {
                  user: {
                    type: 'string',
                    description: 'SMTP用户名',
                  },
                  pass: {
                    type: 'string',
                    description: 'SMTP密码',
                  },
                },
              },
            },
          },
          timeout: {
            type: 'number',
            description: '发送超时时间(毫秒)',
            default: 30000,
          },
        },
      });
    });
  });

  it('should have correct type property', () => {
    expect(sender.type).toBe(NotificationChannelType.EMAIL);
  });
});
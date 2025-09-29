import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { DingTalkSender } from '@notification/services/senders/dingtalk.sender';
import { NotificationConfigService } from '@notification/services/notification-config.service';
import { NotificationChannelType, NotificationPriority, NotificationStatus } from '@notification/types/notification.types';
import { of, throwError } from 'rxjs';
import { UniversalExceptionFactory } from '@common/core/exceptions';

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

// Mock URL security validator
jest.mock('@common/utils/url-security-validator.util', () => ({
  URLSecurityValidator: {
    validateURL: jest.fn(),
  },
}));

describe('DingTalkSender', () => {
  let sender: DingTalkSender;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<NotificationConfigService>;

  const mockNotification = {
    id: 'notification-1',
    alertId: 'alert-1',
    channelId: 'dingtalk-channel-1',
    title: 'Test Alert',
    content: 'This is a test alert message',
    severity: 'high',
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    recipient: 'test-recipient',
    channelType: NotificationChannelType.DINGTALK,
    createdAt: new Date('2023-01-15T10:00:00Z'),
    updatedAt: new Date('2023-01-15T10:00:00Z'),
    retryCount: 0,
    metadata: {
      source: 'test',
    },
  };

  const mockChannelConfig = {
    webhook: 'https://oapi.dingtalk.com/robot/send?access_token=test123',
    secret: 'test-secret',
    timeout: 5000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DingTalkSender,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
        {
          provide: NotificationConfigService,
          useValue: {
            getDefaultTimeout: jest.fn().mockReturnValue(30000),
          },
        },
      ],
    }).compile();

    sender = module.get<DingTalkSender>(DingTalkSender);
    httpService = module.get(HttpService);
    configService = module.get(NotificationConfigService);

    jest.clearAllMocks();
  });

  describe('send', () => {
    it('should send dingtalk notification successfully', async () => {
      // Mock URL validation
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({ valid: true });

      // Mock HTTP response
      const mockResponse = {
        status: 200,
        data: {
          errcode: 0,
          errmsg: 'ok',
        },
      };
      httpService.post.mockReturnValue(of(mockResponse) as any);

      const result = await sender.send(mockNotification, mockChannelConfig);

      expect(URLSecurityValidator.validateURL).toHaveBeenCalledWith(mockChannelConfig.webhook);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('https://oapi.dingtalk.com/robot/send'),
        expect.objectContaining({
          msgtype: 'markdown',
          markdown: expect.objectContaining({
            title: mockNotification.title,
            text: expect.stringContaining(mockNotification.title),
          }),
        }),
        { timeout: mockChannelConfig.timeout },
      );

      expect(result).toEqual({
        success: true,
        channelId: mockNotification.channelId,
        channelType: NotificationChannelType.DINGTALK,
        message: '钉钉消息发送成功',
        sentAt: expect.any(Date),
        duration: expect.any(Number),
        deliveryId: expect.stringMatching(/^dingtalk_\d+$/),
      });
    });

    it('should throw error for invalid webhook URL', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({
        valid: false,
        error: 'Invalid URL format',
      });

      await expect(sender.send(mockNotification, mockChannelConfig)).rejects.toThrow();

      expect(URLSecurityValidator.validateURL).toHaveBeenCalledWith(mockChannelConfig.webhook);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should handle DingTalk API error response', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({ valid: true });

      const mockResponse = {
        status: 200,
        data: {
          errcode: 310000,
          errmsg: 'Invalid webhook token',
        },
      };
      httpService.post.mockReturnValue(of(mockResponse) as any);

      const result = await sender.send(mockNotification, mockChannelConfig);

      expect(result).toEqual({
        success: false,
        channelId: mockNotification.channelId,
        channelType: NotificationChannelType.DINGTALK,
        message: '钉钉API错误: Invalid webhook token',
        sentAt: expect.any(Date),
        duration: expect.any(Number),
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '钉钉API返回错误',
        expect.objectContaining({
          notificationId: mockNotification.id,
          errcode: 310000,
          errmsg: 'Invalid webhook token',
        }),
      );
    });

    it('should handle HTTP request error', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({ valid: true });

      const error = new Error('Connection timeout');
      httpService.post.mockReturnValue(throwError(() => error) as any);

      const result = await sender.send(mockNotification, mockChannelConfig);

      expect(result).toEqual({
        success: false,
        channelId: mockNotification.channelId,
        channelType: NotificationChannelType.DINGTALK,
        error: 'Connection timeout',
        sentAt: expect.any(Date),
        duration: expect.any(Number),
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        '钉钉发送失败',
        expect.objectContaining({
          notificationId: mockNotification.id,
          error: 'Connection timeout',
        }),
      );
    });

    it('should use default timeout when not specified', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({ valid: true });

      const configWithoutTimeout = { ...mockChannelConfig };
      delete configWithoutTimeout.timeout;

      const mockResponse = { status: 200, data: { errcode: 0, errmsg: 'ok' } };
      httpService.post.mockReturnValue(of(mockResponse) as any);

      await sender.send(mockNotification, configWithoutTimeout);

      expect(configService.getDefaultTimeout).toHaveBeenCalled();
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        { timeout: 30000 }, // Default timeout
      );
    });

    it('should generate signed URL when secret is provided', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({ valid: true });

      const mockResponse = { status: 200, data: { errcode: 0, errmsg: 'ok' } };
      httpService.post.mockReturnValue(of(mockResponse) as any);

      await sender.send(mockNotification, mockChannelConfig);

      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('timestamp='),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('test', () => {
    it('should test dingtalk configuration successfully', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({ valid: true });

      const mockResponse = {
        status: 200,
        data: { errcode: 0, errmsg: 'ok' },
      };
      httpService.post.mockReturnValue(of(mockResponse) as any);

      const result = await sender.test(mockChannelConfig);

      expect(result).toBe(true);
      expect(URLSecurityValidator.validateURL).toHaveBeenCalledWith(mockChannelConfig.webhook);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          msgtype: 'text',
          text: expect.objectContaining({
            content: expect.stringContaining('钉钉通知配置测试'),
          }),
        }),
        { timeout: 30000 },
      );
    });

    it('should throw error for invalid URL during test', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({
        valid: false,
        error: 'Invalid URL',
      });

      await expect(sender.test(mockChannelConfig)).rejects.toThrow();
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should return false when test fails', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({ valid: true });

      const error = new Error('Network error');
      httpService.post.mockReturnValue(throwError(() => error) as any);

      const result = await sender.test(mockChannelConfig);

      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('钉钉测试连接失败'),
      );
    });
  });

  describe('validateConfig', () => {
    it('should validate dingtalk configuration successfully', () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({ valid: true });

      const result = sender.validateConfig(mockChannelConfig);

      expect(result).toEqual({
        valid: true,
        errors: [],
      });
    });

    it('should return validation errors for invalid configuration', () => {
      const invalidConfig = {
        webhook: 'invalid-url',
        secret: 123, // Should be string
        timeout: -1, // Should be positive
      };

      const result = sender.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Webhook URL必须是有效的钉钉机器人地址'),
          expect.stringContaining('密钥必须是字符串'),
          expect.stringContaining('超时时间必须是正数'),
        ]),
      );
    });

    it('should return error for missing webhook', () => {
      const configWithoutWebhook = {
        secret: 'test-secret',
      };

      const result = sender.validateConfig(configWithoutWebhook);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('钉钉 Webhook URL是必填项');
    });

    it('should return error for invalid webhook URL format', () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({
        valid: false,
        error: 'SSRF protection triggered',
      });

      const configWithInvalidUrl = {
        webhook: 'https://oapi.dingtalk.com/robot/send?access_token=test',
      };

      const result = sender.validateConfig(configWithInvalidUrl);

      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Webhook URL安全检查失败'),
        ]),
      );
    });
  });

  describe('getConfigSchema', () => {
    it('should return valid config schema', () => {
      const schema = sender.getConfigSchema();

      expect(schema).toEqual({
        type: 'object',
        required: ['webhook'],
        properties: {
          webhook: {
            type: 'string',
            format: 'uri',
            pattern: '^https://oapi\\.dingtalk\\.com/',
            description: '钉钉机器人Webhook地址',
          },
          secret: {
            type: 'string',
            description: '钉钉机器人签名密钥（可选）',
          },
          timeout: {
            type: 'number',
            description: '请求超时时间(毫秒)',
            minimum: 1000,
            maximum: 30000,
            default: 10000,
          },
        },
      });
    });
  });

  it('should have correct type property', () => {
    expect(sender.type).toBe(NotificationChannelType.DINGTALK);
  });
});
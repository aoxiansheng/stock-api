import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { SlackSender } from '@notification/services/senders/slack.sender';
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

describe('SlackSender', () => {
  let sender: SlackSender;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<NotificationConfigService>;

  const mockNotification = {
    id: 'notification-1',
    alertId: 'alert-1',
    channelId: 'slack-channel-1',
    title: 'Test Alert',
    content: 'This is a test alert message',
    severity: 'high',
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    recipient: 'test-recipient',
    channelType: NotificationChannelType.SLACK,
    createdAt: new Date('2023-01-15T10:00:00Z'),
    updatedAt: new Date('2023-01-15T10:00:00Z'),
    retryCount: 0,
    metadata: {
      source: 'test',
    },
  };

  const mockChannelConfig = {
    webhook_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX',
    channel: '#alerts',
    username: 'AlertBot',
    icon_emoji: ':warning:',
    timeout: 5000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlackSender,
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

    sender = module.get<SlackSender>(SlackSender);
    httpService = module.get(HttpService);
    configService = module.get(NotificationConfigService);

    jest.clearAllMocks();
  });

  describe('send', () => {
    it('should send slack notification successfully', async () => {
      // Mock URL validation
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({ valid: true });

      // Mock HTTP response
      const mockResponse = {
        status: 200,
        data: 'ok',
      };
      httpService.post.mockReturnValue(of(mockResponse) as any);

      const result = await sender.send(mockNotification, mockChannelConfig);

      expect(URLSecurityValidator.validateURL).toHaveBeenCalledWith(mockChannelConfig.webhook_url);
      expect(httpService.post).toHaveBeenCalledWith(
        mockChannelConfig.webhook_url,
        expect.objectContaining({
          channel: mockChannelConfig.channel,
          username: mockChannelConfig.username,
          icon_emoji: mockChannelConfig.icon_emoji,
          text: expect.stringContaining(mockNotification.title),
        }),
        { timeout: mockChannelConfig.timeout },
      );

      expect(result).toEqual({
        success: true,
        channelId: mockNotification.channelId,
        channelType: NotificationChannelType.SLACK,
        message: 'Slack 消息发送成功',
        sentAt: expect.any(Date),
        duration: expect.any(Number),
        deliveryId: expect.stringMatching(/^slack_\d+$/),
      });

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Slack通知发送成功',
        expect.objectContaining({
          notificationId: mockNotification.id,
          channel: mockChannelConfig.channel,
        }),
      );
    });

    it('should throw error for invalid webhook URL', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({
        valid: false,
        error: 'Invalid URL format',
      });

      await expect(sender.send(mockNotification, mockChannelConfig)).rejects.toThrow();

      expect(URLSecurityValidator.validateURL).toHaveBeenCalledWith(mockChannelConfig.webhook_url);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it('should handle non-200 HTTP response', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({ valid: true });

      const mockResponse = {
        status: 400,
        statusText: 'Bad Request',
      };
      httpService.post.mockReturnValue(of(mockResponse) as any);

      const result = await sender.send(mockNotification, mockChannelConfig);

      expect(result).toEqual({
        success: false,
        channelId: mockNotification.channelId,
        channelType: NotificationChannelType.SLACK,
        message: 'Slack API 返回状态码: 400',
        sentAt: expect.any(Date),
        duration: expect.any(Number),
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Slack API返回非成功状态码',
        expect.objectContaining({
          notificationId: mockNotification.id,
          status: 400,
          statusText: 'Bad Request',
        }),
      );
    });

    it('should handle HTTP request error', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({ valid: true });

      const error = new Error('Network error');
      httpService.post.mockReturnValue(throwError(() => error) as any);

      const result = await sender.send(mockNotification, mockChannelConfig);

      expect(result).toEqual({
        success: false,
        channelId: mockNotification.channelId,
        channelType: NotificationChannelType.SLACK,
        message: 'Slack 发送失败: Network error',
        sentAt: expect.any(Date),
        duration: expect.any(Number),
        error: 'Network error',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Slack发送失败',
        expect.objectContaining({
          notificationId: mockNotification.id,
          error: 'Network error',
        }),
      );
    });

    it('should use default timeout when not specified', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({ valid: true });

      const configWithoutTimeout = { ...mockChannelConfig };
      delete configWithoutTimeout.timeout;

      const mockResponse = { status: 200, data: 'ok' };
      httpService.post.mockReturnValue(of(mockResponse) as any);

      await sender.send(mockNotification, configWithoutTimeout);

      expect(configService.getDefaultTimeout).toHaveBeenCalled();
      expect(httpService.post).toHaveBeenCalledWith(
        mockChannelConfig.webhook_url,
        expect.any(Object),
        { timeout: 30000 }, // Default timeout
      );
    });
  });

  describe('validate', () => {
    it('should validate slack configuration successfully', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({ valid: true });

      const result = await sender.validateConfig(mockChannelConfig);

      expect(result).toEqual({
        valid: true,
        errors: [],
      });
    });

    it('should return validation errors for invalid configuration', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({
        valid: false,
        error: 'Invalid URL',
      });

      const invalidConfig = {
        webhook_url: 'invalid-url',
        channel: '',
      };

      const result = await sender.validateConfig(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Invalid URL'));
    });
  });

  it('should have correct type property', () => {
    expect(sender.type).toBe(NotificationChannelType.SLACK);
  });
});

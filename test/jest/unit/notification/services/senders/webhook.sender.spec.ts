import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { WebhookSender } from '@notification/services/senders/webhook.sender';
import { NotificationConfigService } from '@notification/services/notification-config.service';
import { NotificationChannelType, NotificationPriority, NotificationStatus } from '@notification/types/notification.types';
import { of, throwError } from 'rxjs';

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

describe('WebhookSender', () => {
  let sender: WebhookSender;
  let httpService: jest.Mocked<HttpService>;
  let configService: jest.Mocked<NotificationConfigService>;

  const mockNotification = {
    id: 'notification-1',
    alertId: 'alert-1',
    channelId: 'webhook-channel-1',
    title: 'Test Alert',
    content: 'This is a test alert message',
    severity: 'high',
    priority: NotificationPriority.HIGH,
    status: NotificationStatus.PENDING,
    recipient: 'test-recipient',
    channelType: NotificationChannelType.WEBHOOK,
    createdAt: new Date('2023-01-15T10:00:00Z'),
    updatedAt: new Date('2023-01-15T10:00:00Z'),
    retryCount: 0,
    metadata: {
      source: 'test',
    },
  };

  const mockChannelConfig = {
    url: 'https://api.example.com/webhook',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer token123',
    },
    timeout: 5000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookSender,
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
            put: jest.fn(),
            patch: jest.fn(),
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

    sender = module.get<WebhookSender>(WebhookSender);
    httpService = module.get(HttpService);
    configService = module.get(NotificationConfigService);

    jest.clearAllMocks();
  });

  describe('send', () => {
    it('should send webhook notification successfully', async () => {
      // Mock URL validation
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({ valid: true });

      // Mock HTTP response
      const mockResponse = {
        status: 200,
        data: { success: true },
      };
      httpService.post.mockReturnValue(of(mockResponse) as any);

      const result = await sender.send(mockNotification, mockChannelConfig);

      expect(URLSecurityValidator.validateURL).toHaveBeenCalledWith(mockChannelConfig.url);
      expect(httpService.post).toHaveBeenCalledWith(
        mockChannelConfig.url,
        expect.objectContaining({
          id: mockNotification.id,
          title: mockNotification.title,
          message: mockNotification.content,
        }),
        {
          timeout: mockChannelConfig.timeout,
          headers: mockChannelConfig.headers,
        },
      );

      expect(result).toEqual({
        success: true,
        channelId: mockNotification.channelId,
        channelType: NotificationChannelType.WEBHOOK,
        message: 'Webhook 消息发送成功',
        sentAt: expect.any(Date),
        duration: expect.any(Number),
        deliveryId: expect.stringMatching(/^webhook_\d+$/),
      });
    });

    it('should throw error for invalid webhook URL', async () => {
      const { URLSecurityValidator } = require('@common/utils/url-security-validator.util');
      URLSecurityValidator.validateURL.mockReturnValue({
        valid: false,
        error: 'Invalid URL format',
      });

      await expect(sender.send(mockNotification, mockChannelConfig)).rejects.toThrow();

      expect(URLSecurityValidator.validateURL).toHaveBeenCalledWith(mockChannelConfig.url);
      expect(httpService.post).not.toHaveBeenCalled();
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
        channelType: NotificationChannelType.WEBHOOK,
        message: 'Webhook 发送失败: Connection timeout',
        sentAt: expect.any(Date),
        duration: expect.any(Number),
        error: 'Connection timeout',
      });
    });
  });

  it('should have correct type property', () => {
    expect(sender.type).toBe(NotificationChannelType.WEBHOOK);
  });
});

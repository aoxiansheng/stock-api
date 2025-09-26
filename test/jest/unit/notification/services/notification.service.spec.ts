import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationService } from '@notification/services/notification.service';
import { NotificationTemplateService } from '@notification/services/notification-template.service';
import { NotificationConfigService } from '@notification/services/notification-config.service';
import { AlertToNotificationAdapter } from '@notification/adapters/alert-to-notification.adapter';
import {
  EmailSender,
  WebhookSender,
  SlackSender,
  DingTalkSender,
  LogSender
} from '@notification/services/senders';
import {
  NotificationRequestDto,
  BatchNotificationRequestDto,
  NotificationRequestResultDto,
} from '@notification/dto/notification-request.dto';
import {
  NotificationPriority,
  NotificationChannelType,
  NotificationChannel,
  Notification,
} from '@notification/types/notification.types';
import {
  NotificationAlert,
  NotificationAlertRule,
} from '@notification/types/notification-alert.types';

describe('NotificationService', () => {
  let service: NotificationService;
  let emailSender: jest.Mocked<EmailSender>;
  let webhookSender: jest.Mocked<WebhookSender>;
  let slackSender: jest.Mocked<SlackSender>;
  let dingtalkSender: jest.Mocked<DingTalkSender>;
  let logSender: jest.Mocked<LogSender>;
  let templateService: jest.Mocked<NotificationTemplateService>;
  let configService: jest.Mocked<NotificationConfigService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let alertToNotificationAdapter: jest.Mocked<AlertToNotificationAdapter>;

  beforeEach(async () => {
    const mockEmailSender = {
      send: jest.fn(),
      test: jest.fn(),
    };

    const mockWebhookSender = {
      send: jest.fn(),
      test: jest.fn(),
    };

    const mockSlackSender = {
      send: jest.fn(),
      test: jest.fn(),
    };

    const mockDingTalkSender = {
      send: jest.fn(),
      test: jest.fn(),
    };

    const mockLogSender = {
      send: jest.fn(),
      test: jest.fn(),
    };

    const mockTemplateService = {
      getTemplatesByEventType: jest.fn(),
      renderTemplate: jest.fn(),
    };

    const mockConfigService = {
      getDefaultBatchSize: jest.fn().mockReturnValue(10),
      getMaxConcurrency: jest.fn().mockReturnValue(5),
      getMaxRetryAttempts: jest.fn().mockReturnValue(3),
      getChannelTimeout: jest.fn().mockReturnValue(30000),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockAlertToNotificationAdapter = {
      adaptAlert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: EmailSender, useValue: mockEmailSender },
        { provide: WebhookSender, useValue: mockWebhookSender },
        { provide: SlackSender, useValue: mockSlackSender },
        { provide: DingTalkSender, useValue: mockDingTalkSender },
        { provide: LogSender, useValue: mockLogSender },
        { provide: NotificationTemplateService, useValue: mockTemplateService },
        { provide: NotificationConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AlertToNotificationAdapter, useValue: mockAlertToNotificationAdapter },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    emailSender = module.get(EmailSender);
    webhookSender = module.get(WebhookSender);
    slackSender = module.get(SlackSender);
    dingtalkSender = module.get(DingTalkSender);
    logSender = module.get(LogSender);
    templateService = module.get(NotificationTemplateService);
    configService = module.get(NotificationConfigService);
    eventEmitter = module.get(EventEmitter2);
    alertToNotificationAdapter = module.get(AlertToNotificationAdapter);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendNotificationByDto', () => {
    it('should send notification successfully', async () => {
      const request: NotificationRequestDto = {
        alertId: 'alert-123',
        severity: NotificationPriority.HIGH,
        title: 'Test Alert',
        message: 'Test message',
        channelTypes: [NotificationChannelType.EMAIL],
      };

      emailSender.send.mockResolvedValue({
        success: true,
        channelId: 'email-channel-1',
        channelType: NotificationChannelType.EMAIL,
        message: 'Email sent successfully',
        sentAt: new Date(),
        deliveryId: 'delivery-123',
        duration: 100,
      });

      const result = await service.sendNotificationByDto(request);

      expect(result.success).toBe(true);
      expect(result.notificationIds).toHaveLength(1);
      expect(emailSender.send).toHaveBeenCalledWith(
        expect.objectContaining({
          alertId: 'alert-123',
          title: 'Test Alert',
          content: 'Test message',
        }),
        expect.any(Object),
      );
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it('should handle sending to multiple channels', async () => {
      const request: NotificationRequestDto = {
        alertId: 'alert-123',
        severity: NotificationPriority.HIGH,
        title: 'Test Alert',
        message: 'Test message',
        channelTypes: [NotificationChannelType.EMAIL, NotificationChannelType.SLACK],
      };

      emailSender.send.mockResolvedValue({
        success: true,
        channelId: 'email-channel-1',
        channelType: NotificationChannelType.EMAIL,
        message: 'Email sent successfully',
        sentAt: new Date(),
        deliveryId: 'delivery-123',
        duration: 100,
      });

      slackSender.send.mockResolvedValue({
        success: true,
        channelId: 'slack-channel-1',
        channelType: NotificationChannelType.SLACK,
        message: 'Slack message sent successfully',
        sentAt: new Date(),
        deliveryId: 'delivery-456',
        duration: 150,
      });

      const result = await service.sendNotificationByDto(request);

      expect(result.success).toBe(true);
      expect(result.notificationIds).toHaveLength(2);
      expect(emailSender.send).toHaveBeenCalled();
      expect(slackSender.send).toHaveBeenCalled();
    });

    it('should handle channel failure gracefully', async () => {
      const request: NotificationRequestDto = {
        alertId: 'alert-123',
        severity: NotificationPriority.HIGH,
        title: 'Test Alert',
        message: 'Test message',
        channelTypes: [NotificationChannelType.EMAIL],
      };

      emailSender.send.mockRejectedValue(new Error('SMTP connection failed'));

      const result = await service.sendNotificationByDto(request);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('所有渠道发送失败');
      expect(result.channelResults['EMAIL']).toEqual({
        success: false,
        error: 'SMTP connection failed',
        duration: 0,
      });
    });

    it('should use default channels when no channels specified', async () => {
      const request: NotificationRequestDto = {
        alertId: 'alert-123',
        severity: NotificationPriority.HIGH,
        title: 'Test Alert',
        message: 'Test message',
      };

      logSender.send.mockResolvedValue({
        success: true,
        channelId: 'log-channel-1',
        channelType: NotificationChannelType.LOG,
        message: 'Logged successfully',
        sentAt: new Date(),
        deliveryId: 'log-123',
        duration: 50,
      });

      emailSender.send.mockResolvedValue({
        success: true,
        channelId: 'email-channel-1',
        channelType: NotificationChannelType.EMAIL,
        message: 'Email sent successfully',
        sentAt: new Date(),
        deliveryId: 'email-123',
        duration: 200,
      });

      slackSender.send.mockResolvedValue({
        success: true,
        channelId: 'slack-channel-1',
        channelType: NotificationChannelType.SLACK,
        message: 'Slack message sent successfully',
        sentAt: new Date(),
        deliveryId: 'slack-123',
        duration: 120,
      });

      const result = await service.sendNotificationByDto(request);

      expect(result.success).toBe(true);
      // HIGH priority should use LOG, EMAIL, SLACK
      expect(logSender.send).toHaveBeenCalled();
      expect(emailSender.send).toHaveBeenCalled();
      expect(slackSender.send).toHaveBeenCalled();
    });

    it('should handle invalid channel type', async () => {
      const request: NotificationRequestDto = {
        alertId: 'alert-123',
        severity: NotificationPriority.HIGH,
        title: 'Test Alert',
        message: 'Test message',
        channelTypes: ['INVALID_CHANNEL' as NotificationChannelType],
      };

      const result = await service.sendNotificationByDto(request);

      expect(result.success).toBe(false);
      expect(result.channelResults['INVALID_CHANNEL']).toEqual({
        success: false,
        error: expect.stringContaining('Unsupported notification channel type'),
        duration: 0,
      });
    });
  });

  describe('sendNotificationsBatch', () => {
    it('should process batch notifications successfully', async () => {
      const batchRequest: BatchNotificationRequestDto = {
        requests: [
          {
            alertId: 'alert-1',
            severity: NotificationPriority.HIGH,
            title: 'Alert 1',
            message: 'Message 1',
            channelTypes: [NotificationChannelType.LOG],
          },
          {
            alertId: 'alert-2',
            severity: NotificationPriority.NORMAL,
            title: 'Alert 2',
            message: 'Message 2',
            channelTypes: [NotificationChannelType.LOG],
          },
        ],
        concurrency: 2,
        continueOnFailure: true,
      };

      logSender.send.mockResolvedValue({
        success: true,
        channelId: 'log-channel-1',
        channelType: NotificationChannelType.LOG,
        message: 'Logged successfully',
        sentAt: new Date(),
        deliveryId: 'log-123',
        duration: 50,
      });

      const results = await service.sendNotificationsBatch(batchRequest);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(logSender.send).toHaveBeenCalledTimes(2);
    });

    it('should handle batch processing with failures', async () => {
      const batchRequest: BatchNotificationRequestDto = {
        requests: [
          {
            alertId: 'alert-1',
            severity: NotificationPriority.HIGH,
            title: 'Alert 1',
            message: 'Message 1',
            channelTypes: [NotificationChannelType.EMAIL],
          },
          {
            alertId: 'alert-2',
            severity: NotificationPriority.HIGH,
            title: 'Alert 2',
            message: 'Message 2',
            channelTypes: [NotificationChannelType.EMAIL],
          },
        ],
        concurrency: 1,
        continueOnFailure: true,
      };

      emailSender.send
        .mockResolvedValueOnce({
          success: true,
          channelId: 'email-channel-1',
          channelType: NotificationChannelType.EMAIL,
          message: 'Email sent successfully',
          sentAt: new Date(),
          deliveryId: 'email-123',
          duration: 200,
        })
        .mockRejectedValueOnce(new Error('Email service unavailable'));

      const results = await service.sendNotificationsBatch(batchRequest);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
    });

    it('should respect concurrency limits', async () => {
      const batchRequest: BatchNotificationRequestDto = {
        requests: Array(10).fill(null).map((_, i) => ({
          alertId: `alert-${i}`,
          severity: NotificationPriority.LOW,
          title: `Alert ${i}`,
          message: `Message ${i}`,
          channelTypes: [NotificationChannelType.LOG],
        })),
        concurrency: 3,
      };

      logSender.send.mockResolvedValue({
        success: true,
        channelId: 'log-channel-1',
        channelType: NotificationChannelType.LOG,
        message: 'Logged successfully',
        sentAt: new Date(),
        deliveryId: 'log-123',
        duration: 50,
      });

      const results = await service.sendNotificationsBatch(batchRequest);

      expect(results).toHaveLength(10);
      expect(logSender.send).toHaveBeenCalledTimes(10);
    });
  });

  describe('testNotificationChannel', () => {
    it('should test email channel successfully', async () => {
      const config = { host: 'smtp.example.com', port: 587 };
      emailSender.test.mockResolvedValue(true);

      const result = await service.testNotificationChannel(
        NotificationChannelType.EMAIL,
        config,
      );

      expect(result).toBe(true);
      expect(emailSender.test).toHaveBeenCalledWith(config);
    });

    it('should handle test failure', async () => {
      const config = { host: 'invalid.smtp.com', port: 587 };
      emailSender.test.mockResolvedValue(false);

      const result = await service.testNotificationChannel(
        NotificationChannelType.EMAIL,
        config,
      );

      expect(result).toBe(false);
    });

    it('should handle unsupported channel type', async () => {
      const result = await service.testNotificationChannel(
        'UNSUPPORTED_CHANNEL' as NotificationChannelType,
        {},
      );

      expect(result).toBe(false);
    });

    it('should handle test exceptions', async () => {
      emailSender.test.mockRejectedValue(new Error('Connection timeout'));

      const result = await service.testNotificationChannel(
        NotificationChannelType.EMAIL,
        {},
      );

      expect(result).toBe(false);
    });
  });

  describe('getSupportedChannelTypes', () => {
    it('should return all supported channel types', () => {
      const supportedTypes = service.getSupportedChannelTypes();

      expect(supportedTypes).toContain(NotificationChannelType.EMAIL);
      expect(supportedTypes).toContain(NotificationChannelType.WEBHOOK);
      expect(supportedTypes).toContain(NotificationChannelType.SLACK);
      expect(supportedTypes).toContain(NotificationChannelType.DINGTALK);
      expect(supportedTypes).toContain(NotificationChannelType.LOG);
      expect(supportedTypes).toHaveLength(5);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const health = await service.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details.serviceName).toBe('NotificationService');
      expect(health.details.senders.count).toBe(5);
      expect(health.details.senders.types).toEqual(
        expect.arrayContaining([
          NotificationChannelType.EMAIL,
          NotificationChannelType.WEBHOOK,
          NotificationChannelType.SLACK,
          NotificationChannelType.DINGTALK,
          NotificationChannelType.LOG,
        ]),
      );
    });
  });

  describe('Default Channel Selection', () => {
    it('should select correct channels for LOW priority', async () => {
      const request: NotificationRequestDto = {
        alertId: 'alert-123',
        severity: NotificationPriority.LOW,
        title: 'Low Priority Alert',
        message: 'Low priority message',
      };

      logSender.send.mockResolvedValue({
        success: true,
        channelId: 'log-channel-1',
        channelType: NotificationChannelType.LOG,
        message: 'Logged successfully',
        sentAt: new Date(),
        deliveryId: 'log-123',
        duration: 50,
      });

      await service.sendNotificationByDto(request);

      expect(logSender.send).toHaveBeenCalled();
      expect(emailSender.send).not.toHaveBeenCalled();
      expect(slackSender.send).not.toHaveBeenCalled();
    });

    it('should select correct channels for CRITICAL priority', async () => {
      const request: NotificationRequestDto = {
        alertId: 'alert-123',
        severity: NotificationPriority.CRITICAL,
        title: 'Critical Alert',
        message: 'Critical message',
      };

      // Mock all senders to return success
      const mockSuccess = {
        success: true,
        channelId: 'channel-1',
        channelType: NotificationChannelType.LOG,
        message: 'Sent successfully',
        sentAt: new Date(),
        deliveryId: 'delivery-123',
        duration: 100,
      };

      logSender.send.mockResolvedValue({ ...mockSuccess, channelType: NotificationChannelType.LOG });
      emailSender.send.mockResolvedValue({ ...mockSuccess, channelType: NotificationChannelType.EMAIL });
      slackSender.send.mockResolvedValue({ ...mockSuccess, channelType: NotificationChannelType.SLACK });
      webhookSender.send.mockResolvedValue({ ...mockSuccess, channelType: NotificationChannelType.WEBHOOK });

      await service.sendNotificationByDto(request);

      // CRITICAL should use all available channels
      expect(logSender.send).toHaveBeenCalled();
      expect(emailSender.send).toHaveBeenCalled();
      expect(slackSender.send).toHaveBeenCalled();
      expect(webhookSender.send).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should emit failure events on channel errors', async () => {
      const request: NotificationRequestDto = {
        alertId: 'alert-123',
        severity: NotificationPriority.HIGH,
        title: 'Test Alert',
        message: 'Test message',
        channelTypes: [NotificationChannelType.EMAIL],
      };

      emailSender.send.mockRejectedValue(new Error('SMTP error'));

      await service.sendNotificationByDto(request);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
        expect.objectContaining({
          alertId: 'alert-123',
          error: 'SMTP error',
        }),
      );
    });

    it('should handle partial success in multi-channel notifications', async () => {
      const request: NotificationRequestDto = {
        alertId: 'alert-123',
        severity: NotificationPriority.HIGH,
        title: 'Test Alert',
        message: 'Test message',
        channelTypes: [NotificationChannelType.EMAIL, NotificationChannelType.SLACK],
      };

      emailSender.send.mockResolvedValue({
        success: true,
        channelId: 'email-channel-1',
        channelType: NotificationChannelType.EMAIL,
        message: 'Email sent successfully',
        sentAt: new Date(),
        deliveryId: 'email-123',
        duration: 200,
      });

      slackSender.send.mockRejectedValue(new Error('Slack API error'));

      const result = await service.sendNotificationByDto(request);

      expect(result.success).toBe(true); // Should be successful if at least one channel succeeds
      expect(result.channelResults['EMAIL'].success).toBe(true);
      expect(result.channelResults['SLACK'].success).toBe(false);
    });
  });

  describe('Configuration Integration', () => {
    it('should use configuration service for batch settings', async () => {
      const batchRequest: BatchNotificationRequestDto = {
        requests: [
          {
            alertId: 'alert-1',
            severity: NotificationPriority.HIGH,
            title: 'Alert 1',
            message: 'Message 1',
          },
        ],
      };

      logSender.send.mockResolvedValue({
        success: true,
        channelId: 'log-channel-1',
        channelType: NotificationChannelType.LOG,
        message: 'Logged successfully',
        sentAt: new Date(),
        deliveryId: 'log-123',
        duration: 50,
      });

      await service.sendNotificationsBatch(batchRequest);

      expect(configService.getDefaultBatchSize).toHaveBeenCalled();
      expect(configService.getMaxConcurrency).toHaveBeenCalled();
    });

    it('should respect max concurrency limits', async () => {
      configService.getMaxConcurrency.mockReturnValue(2);

      const batchRequest: BatchNotificationRequestDto = {
        requests: Array(5).fill(null).map((_, i) => ({
          alertId: `alert-${i}`,
          severity: NotificationPriority.LOW,
          title: `Alert ${i}`,
          message: `Message ${i}`,
        })),
        concurrency: 10, // Should be limited to max concurrency
      };

      logSender.send.mockResolvedValue({
        success: true,
        channelId: 'log-channel-1',
        channelType: NotificationChannelType.LOG,
        message: 'Logged successfully',
        sentAt: new Date(),
        deliveryId: 'log-123',
        duration: 50,
      });

      await service.sendNotificationsBatch(batchRequest);

      expect(configService.getMaxConcurrency).toHaveBeenCalled();
    });
  });
});
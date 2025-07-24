import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { NotificationService } from '../../../../../src/alert/services/notification.service';
import { EmailSender } from '../../../../../src/alert/services/notification-senders/email.sender';
import { WebhookSender } from '../../../../../src/alert/services/notification-senders/webhook.sender';
import { DingTalkSender } from '../../../../../src/alert/services/notification-senders/dingtalk.sender';
import { SlackSender } from '../../../../../src/alert/services/notification-senders/slack.sender';
import { LogSender } from '../../../../../src/alert/services/notification-senders/log.sender';
import { NotificationChannelType, AlertSeverity, AlertStatus, Alert, AlertRule, NotificationResult, NotificationSender } from '../../../../../src/alert/types/alert.types';
import { CustomLogger } from '../../../../../src/common/config/logger.config';
import { jest } from '@jest/globals';


describe('NotificationService Comprehensive Coverage', () => {
  let service: NotificationService;
  let emailSender: jest.Mocked<EmailSender>;
  let webhookSender: jest.Mocked<WebhookSender>;

  const mockAlert: Alert = {
    id: 'alert-123',
    ruleId: 'rule-123',
    ruleName: '测试告警规则',
    metric: 'cpu_usage',
    value: 95,
    threshold: 80,
    severity: AlertSeverity.CRITICAL,
    status: AlertStatus.FIRING,
    message: '测试告警消息',
    startTime: new Date(),
    context: {
      metric: 'cpu_usage',
      value: 95,
      host: 'server-01',
      environment: 'production',
      tags: { service: 'web-server', region: 'us-east-1' }
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRule: AlertRule = {
    id: 'rule-123',
    name: '测试告警规则',
    description: '测试用的告警规则',
    metric: 'cpu_usage',
    operator: 'gt',
    threshold: 80,
    duration: 300,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    channels: [
      {
        id: 'email-channel',
        name: '邮件通知',
        type: NotificationChannelType.EMAIL,
        config: {
          to: ['admin@example.com', 'dev-team@example.com'],
          cc: ['manager@example.com'],
          subject: '告警通知: {{ruleName}}',
          template: 'critical_alert'
        },
        enabled: true,
      },
      {
        id: 'webhook-channel',
        name: 'Webhook通知',
        type: NotificationChannelType.WEBHOOK,
        config: {
          url: 'https://api.example.com/alerts',
          method: 'POST',
          headers: { 'Authorization': 'Bearer token123' },
          timeout: 5000,
          retries: 3
        },
        enabled: true,
      },
    ],
    cooldown: 300,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockSender = (type: NotificationChannelType): jest.Mocked<NotificationSender> => ({
    type,
    send: jest.fn<() => Promise<NotificationResult>>().mockResolvedValue({
      success: true,
      channelId: `${type}-channel`,
      channelType: type,
      sentAt: new Date(),
      duration: 100
    }),
    test: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
    validateConfig: jest.fn<() => { valid: boolean; errors: string[] }>().mockReturnValue({ valid: true, errors: [] }),
  });


  beforeEach(async () => {
    const mockHttpService = {
        post: jest.fn(),
        get: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue({}),
    };

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLogger, useValue: mockLogger },
        {
            provide: EmailSender,
            useValue: createMockSender(NotificationChannelType.EMAIL),
        },
        {
            provide: WebhookSender,
            useValue: createMockSender(NotificationChannelType.WEBHOOK),
        },
        {
            provide: DingTalkSender,
            useValue: createMockSender(NotificationChannelType.DINGTALK),
        },
        {
            provide: SlackSender,
            useValue: createMockSender(NotificationChannelType.SLACK),
        },
        {
            provide: LogSender,
            useValue: createMockSender(NotificationChannelType.LOG),
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    emailSender = module.get(EmailSender);
    webhookSender = module.get(WebhookSender);

    // Manually initialize senders as onModuleInit is not automatically called in test
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Template Processing', () => {
    it('should generate template with correct variables', () => {
      const template = service.generateTemplate(mockAlert, mockRule);
      expect(template.variables).toHaveProperty('ruleName', '测试告警规则');
      expect(template.variables).toHaveProperty('value', 95);
      expect(template.variables).toHaveProperty('host', 'server-01');
    });
  });

  describe('Batch Operations', () => {
    it('should handle batch notifications successfully', async () => {
      const result = await service.sendBatchNotifications(mockAlert, mockRule);
      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(emailSender.send).toHaveBeenCalledTimes(1);
      expect(webhookSender.send).toHaveBeenCalledTimes(1);
    });

    it('should handle partial failures in batch notifications', async () => {
      webhookSender.send.mockRejectedValue(new Error('Webhook服务不可用'));
      const result = await service.sendBatchNotifications(mockAlert, mockRule);
      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(emailSender.send).toHaveBeenCalledTimes(1);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
/**
 * NotificationService 单元测试
 */

import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { NotificationService } from "../../../../../src/alert/services/notification.service";
import { EmailSender } from "../../../../../src/alert/services/notification-senders/email.sender";
import { WebhookSender } from "../../../../../src/alert/services/notification-senders/webhook.sender";
import { DingTalkSender } from "../../../../../src/alert/services/notification-senders/dingtalk.sender";
import { SlackSender } from "../../../../../src/alert/services/notification-senders/slack.sender";
import { LogSender } from "../../../../../src/alert/services/notification-senders/log.sender";
import {
  NotificationChannelType,
  AlertSeverity,
  AlertStatus,
} from "../../../../../src/alert/types/alert.types";

describe("NotificationService", () => {
  let service: NotificationService;
  let eventEmitter: EventEmitter2;
  let emailSender: EmailSender;
  let webhookSender: WebhookSender;
  let dingTalkSender: DingTalkSender;
  let slackSender: SlackSender;
  let logSender: LogSender;

  const mockAlert = {
    id: "alert-123",
    ruleId: "rule-123",
    ruleName: "测试告警规则",
    metric: "cpu_usage",
    value: 95,
    threshold: 80,
    severity: AlertSeverity.CRITICAL,
    status: AlertStatus.FIRING,
    message: "测试告警消息",
    startTime: new Date(),
    context: { metric: "cpu_usage", value: 95 },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRule = {
    id: "rule-123",
    name: "测试告警规则",
    description: "测试用的告警规则",
    metric: "cpu_usage",
    operator: "gt" as const,
    threshold: 80,
    duration: 300,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    channels: [],
    cooldown: 300,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEmailSender = {
    type: NotificationChannelType.EMAIL,
    send: jest.fn(),
    test: jest.fn(),
  };

  const mockWebhookSender = {
    type: NotificationChannelType.WEBHOOK,
    send: jest.fn(),
    test: jest.fn(),
  };

  const mockDingTalkSender = {
    type: NotificationChannelType.DINGTALK,
    send: jest.fn(),
    test: jest.fn(),
  };

  const mockSlackSender = {
    type: NotificationChannelType.SLACK,
    send: jest.fn(),
    test: jest.fn(),
  };

  const mockLogSender = {
    type: NotificationChannelType.LOG,
    send: jest.fn(),
    test: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    removeAllListeners: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: EmailSender,
          useValue: mockEmailSender,
        },
        {
          provide: WebhookSender,
          useValue: mockWebhookSender,
        },
        {
          provide: DingTalkSender,
          useValue: mockDingTalkSender,
        },
        {
          provide: SlackSender,
          useValue: mockSlackSender,
        },
        {
          provide: LogSender,
          useValue: mockLogSender,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    emailSender = module.get<EmailSender>(EmailSender);
    webhookSender = module.get<WebhookSender>(WebhookSender);
    dingTalkSender = module.get<DingTalkSender>(DingTalkSender);
    slackSender = module.get<SlackSender>(SlackSender);
    logSender = module.get<LogSender>(LogSender);

    // 手动调用 onModuleInit 来初始化 senders
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("sendNotification", () => {
    it("应该成功发送邮件通知", async () => {
      const channel = {
        id: "email-channel-1",
        name: "邮件通知",
        type: NotificationChannelType.EMAIL,
        config: {
          to: ["admin@example.com"],
          subject: "告警通知",
        },
        enabled: true,
      };

      mockEmailSender.send.mockResolvedValue({ success: true });

      const result = await service.sendNotification(
        mockAlert,
        mockRule,
        channel,
      );

      expect(emailSender.send).toHaveBeenCalledWith(
        mockAlert,
        mockRule,
        channel.config,
      );
      expect(result.success).toBe(true);
    });

    it("应该成功发送Webhook通知", async () => {
      const channel = {
        id: "webhook-channel-1",
        name: "Webhook通知",
        type: NotificationChannelType.WEBHOOK,
        config: {
          url: "https://api.example.com/webhook",
          method: "POST",
        },
        enabled: true,
      };

      mockWebhookSender.send.mockResolvedValue({ success: true });

      const result = await service.sendNotification(
        mockAlert,
        mockRule,
        channel,
      );

      expect(webhookSender.send).toHaveBeenCalledWith(
        mockAlert,
        mockRule,
        channel.config,
      );
      expect(result.success).toBe(true);
    });

    it("应该成功发送钉钉通知", async () => {
      const channel = {
        id: "dingtalk-channel-1",
        name: "钉钉通知",
        type: NotificationChannelType.DINGTALK,
        config: {
          webhook: "https://oapi.dingtalk.com/robot/send?access_token=xxx",
          secret: "SEC12345",
        },
        enabled: true,
      };

      mockDingTalkSender.send.mockResolvedValue({ success: true });

      const result = await service.sendNotification(
        mockAlert,
        mockRule,
        channel,
      );

      expect(dingTalkSender.send).toHaveBeenCalledWith(
        mockAlert,
        mockRule,
        channel.config,
      );
      expect(result.success).toBe(true);
    });

    it("应该成功发送Slack通知", async () => {
      const channel = {
        id: "slack-channel-1",
        name: "Slack通知",
        type: NotificationChannelType.SLACK,
        config: {
          webhook: "https://hooks.slack.com/services/xxx",
          channel: "#alerts",
        },
        enabled: true,
      };

      mockSlackSender.send.mockResolvedValue({ success: true });

      const result = await service.sendNotification(
        mockAlert,
        mockRule,
        channel,
      );

      expect(slackSender.send).toHaveBeenCalledWith(
        mockAlert,
        mockRule,
        channel.config,
      );
      expect(result.success).toBe(true);
    });

    it("应该在不支持的通知类型时抛出异常", async () => {
      const channel = {
        id: "unsupported-channel-1",
        name: "不支持的通知",
        type: "UNSUPPORTED" as NotificationChannelType,
        config: {},
        enabled: true,
      };

      await expect(
        service.sendNotification(mockAlert, mockRule, channel),
      ).rejects.toThrow("不支持的通知类型: UNSUPPORTED");
    });

    it("应该在发送失败时抛出异常", async () => {
      const channel = {
        id: "email-channel-1",
        name: "邮件通知",
        type: NotificationChannelType.EMAIL,
        config: {
          to: ["invalid-email"],
        },
        enabled: true,
      };

      mockEmailSender.send.mockRejectedValue(new Error("发送失败"));

      await expect(
        service.sendNotification(mockAlert, mockRule, channel),
      ).rejects.toThrow("发送失败");
    });
  });

  describe("sendBatchNotifications", () => {
    it("应该成功发送批量通知", async () => {
      const channels = [
        {
          id: "email-channel-1",
          name: "邮件通知",
          type: NotificationChannelType.EMAIL,
          config: { to: ["admin@example.com"] },
          enabled: true,
        },
        {
          id: "webhook-channel-1",
          name: "Webhook通知",
          type: NotificationChannelType.WEBHOOK,
          config: { url: "https://api.example.com/webhook" },
          enabled: true,
        },
      ];

      const testRule = { ...mockRule, channels };

      mockEmailSender.send.mockResolvedValue({
        success: true,
        channelId: "email-channel-1",
        channelType: NotificationChannelType.EMAIL,
        sentAt: new Date(),
        duration: 100,
      });
      mockWebhookSender.send.mockResolvedValue({
        success: true,
        channelId: "webhook-channel-1",
        channelType: NotificationChannelType.WEBHOOK,
        sentAt: new Date(),
        duration: 150,
      });

      const result = await service.sendBatchNotifications(mockAlert, testRule);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    it("应该处理批量通知中的部分失败", async () => {
      const channels = [
        {
          id: "email-channel-1",
          name: "邮件通知",
          type: NotificationChannelType.EMAIL,
          config: { to: ["admin@example.com"] },
          enabled: true,
        },
        {
          id: "webhook-channel-1",
          name: "Webhook通知",
          type: NotificationChannelType.WEBHOOK,
          config: { url: "https://api.example.com/webhook" },
          enabled: true,
        },
      ];

      const testRule = { ...mockRule, channels };

      mockEmailSender.send.mockResolvedValue({
        success: true,
        channelId: "email-channel-1",
        channelType: NotificationChannelType.EMAIL,
        sentAt: new Date(),
        duration: 100,
      });
      mockWebhookSender.send.mockRejectedValue(new Error("Webhook失败"));

      const result = await service.sendBatchNotifications(mockAlert, testRule);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(2);
    });

    it("应该在没有启用通知渠道时返回空结果", async () => {
      const channels = [
        {
          id: "email-channel-1",
          name: "邮件通知",
          type: NotificationChannelType.EMAIL,
          config: { to: ["admin@example.com"] },
          enabled: false, // 禁用
        },
      ];

      const testRule = { ...mockRule, channels };

      const result = await service.sendBatchNotifications(mockAlert, testRule);

      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });
  });

  describe("testChannel", () => {
    it("应该成功测试邮件渠道", async () => {
      const type = NotificationChannelType.EMAIL;
      const config = {
        to: ["test@example.com"],
        subject: "测试通知",
      };

      mockEmailSender.test.mockResolvedValue(true);

      const result = await service.testChannel(type, config);

      expect(emailSender.test).toHaveBeenCalledWith(config);
      expect(result).toBe(true);
    });

    it("应该成功测试Webhook渠道", async () => {
      const type = NotificationChannelType.WEBHOOK;
      const config = {
        url: "https://api.example.com/test-webhook",
        method: "POST",
      };

      mockWebhookSender.test.mockResolvedValue(true);

      const result = await service.testChannel(type, config);

      expect(webhookSender.test).toHaveBeenCalledWith(config);
      expect(result).toBe(true);
    });

    it("应该在不支持的通知类型时抛出异常", async () => {
      const type = "UNSUPPORTED" as NotificationChannelType;
      const config = {};

      await expect(service.testChannel(type, config)).rejects.toThrow(
        "不支持的通知类型: UNSUPPORTED",
      );
    });

    it("应该在测试失败时返回false", async () => {
      const type = NotificationChannelType.EMAIL;
      const config = {
        to: ["invalid-email"],
      };

      mockEmailSender.test.mockResolvedValue(false);

      const result = await service.testChannel(type, config);

      expect(result).toBe(false);
    });
  });

  describe("generateTemplate", () => {
    it("应该生成通知模板", () => {
      const template = service.generateTemplate(mockAlert, mockRule);

      expect(template).toHaveProperty("subject");
      expect(template).toHaveProperty("body");
      expect(template).toHaveProperty("variables");
      expect(template.variables).toHaveProperty("alertId", mockAlert.id);
      expect(template.variables).toHaveProperty("ruleName", mockRule.name);
    });

    it("应该包含所有必要的模板变量", () => {
      const template = service.generateTemplate(mockAlert, mockRule);

      expect(template.variables).toHaveProperty("alertId");
      expect(template.variables).toHaveProperty("ruleName");
      expect(template.variables).toHaveProperty("metric");
      expect(template.variables).toHaveProperty("value");
      expect(template.variables).toHaveProperty("threshold");
      expect(template.variables).toHaveProperty("severity");
      expect(template.variables).toHaveProperty("message");
    });
  });

  it("应该被定义", () => {
    expect(service).toBeDefined();
  });
});

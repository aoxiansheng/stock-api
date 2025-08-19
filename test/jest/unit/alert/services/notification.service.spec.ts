/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from '@nestjs/common';
import { NotificationService } from "../../../../../src/alert/services/notification.service";
import {
  EmailSender,
  WebhookSender,
  SlackSender,
  LogSender,
  DingTalkSender,
} from "../../../../../src/alert/services/notification-senders";
import {
  NotificationChannelType,
  AlertSeverity,
  AlertStatus,
} from "../../../../../src/alert/types/alert.types";
import {
  NOTIFICATION_OPERATIONS,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_TEMPLATE_VARIABLES,
} from "../../../../../src/alert/constants/notification.constants";

// 从工具文件导入NotificationTemplateUtil
import { NotificationTemplateUtil } from "../../../../../src/alert/utils/notification.utils";

describe("NotificationService Optimization Features", () => {
  let service: NotificationService;
  let emailSender: jest.Mocked<EmailSender>;
  let slackSender: jest.Mocked<SlackSender>;

  let loggerSpy: jest.SpyInstance;

  const mockRule = {
    id: "rule_123",
    name: "Test Rule",
    description: "A test rule",
    metric: "cpu_usage",
    operator: "gt" as const,
    threshold: 80,
    duration: 60,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    channels: [
      {
        id: "channel_1",
        name: "email-channel",
        type: NotificationChannelType.EMAIL,
        config: { to: "test1@example.com" },
        enabled: true,
      },
      {
        id: "channel_2",
        name: "slack-channel",
        type: NotificationChannelType.SLACK,
        config: { webhookUrl: "http://slack.com" },
        enabled: true,
      },
    ],
    cooldown: 300,
    tags: { project: "test" },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
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

    const mockDingTalkSender = {
      type: NotificationChannelType.DINGTALK,
      send: jest.fn(),
      test: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: EmailSender,
          useValue: mockEmailSender,
        },
        {
          provide: WebhookSender,
          useValue: mockWebhookSender,
        },
        {
          provide: SlackSender,
          useValue: mockSlackSender,
        },
        {
          provide: LogSender,
          useValue: mockLogSender,
        },
        {
          provide: DingTalkSender,
          useValue: mockDingTalkSender,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    emailSender = module.get(EmailSender);
    slackSender = module.get(SlackSender);
    loggerSpy = jest
      .spyOn((service as any).logger, "debug")
      .mockImplementation();

    // Manually trigger onModuleInit to initialize senders
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Constants Usage", () => {
    it("should use operation constants for all methods", () => {
      expect(NOTIFICATION_OPERATIONS.SEND_NOTIFICATION).toBe(
        "sendNotification",
      );
      expect(NOTIFICATION_OPERATIONS.SEND_BATCH_NOTIFICATIONS).toBe(
        "sendBatchNotifications",
      );
      expect(NOTIFICATION_OPERATIONS.TEST_CHANNEL).toBe("testChannel");
      expect(NOTIFICATION_OPERATIONS.GENERATE_TEMPLATE).toBe(
        "generateTemplate",
      );
    });

    it("should use message constants for logging", () => {
      expect(NOTIFICATION_MESSAGES.NOTIFICATION_SENT).toBe("通知发送成功");
      expect(NOTIFICATION_MESSAGES.BATCH_NOTIFICATIONS_COMPLETED).toBe(
        "批量通知发送完成",
      );
      expect(NOTIFICATION_MESSAGES.CHANNEL_TEST_PASSED).toBe(
        "通知渠道测试通过",
      );
      expect(NOTIFICATION_MESSAGES.TEMPLATE_GENERATED).toBe("通知模板生成成功");
    });

    it("should use template variable constants", () => {
      expect(NOTIFICATION_TEMPLATE_VARIABLES.ALERT_ID).toBe("alertId");
      expect(NOTIFICATION_TEMPLATE_VARIABLES.RULE_NAME).toBe("ruleName");
      expect(NOTIFICATION_TEMPLATE_VARIABLES.METRIC).toBe("metric");
      expect(NOTIFICATION_TEMPLATE_VARIABLES.SEVERITY).toBe("severity");
    });
  });

  describe("Enhanced Single Notification", () => {
    it("should use constants for notification processing start logging", async () => {
      const mockAlert = {
        id: "alert_123",
        ruleId: "rule_123",
        ruleName: "Test Rule",
        metric: "cpu_usage",
        value: 85,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: "CPU usage is high",
        startTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockChannelConfig = {
        id: "channel_123",
        name: "test-channel",
        type: NotificationChannelType.EMAIL,
        enabled: true,
        config: { to: "test@example.com" },
      };

      emailSender.send.mockResolvedValue({
        success: true,
        channelId: "channel_123",
        channelType: NotificationChannelType.EMAIL,
        sentAt: new Date(),
        duration: 100,
      });

      await service.sendNotification(mockAlert, mockRule, mockChannelConfig);

      expect(loggerSpy).toHaveBeenCalledWith(
        NOTIFICATION_MESSAGES.NOTIFICATION_PROCESSING_STARTED,
        expect.objectContaining({
          operation: NOTIFICATION_OPERATIONS.SEND_NOTIFICATION,
          channelType: NotificationChannelType.EMAIL,
          alertId: "alert_123",
          ruleId: "rule_123",
        }),
      );
    });

    it("should use template utility for unsupported type error", async () => {
      const mockAlert = {
        id: "alert_123",
        ruleId: "rule_123",
        ruleName: "Test Rule",
      };
      const mockChannelConfig = {
        id: "channel_123",
        name: "test-channel",
        type: "UNSUPPORTED_TYPE" as NotificationChannelType,
        enabled: true,
        config: {},
      };

      await expect(
        service.sendNotification(mockAlert as any, mockRule, mockChannelConfig),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.sendNotification(
          mockAlert as any,
          mockRule,
          mockChannelConfig,
        );
      } catch (error) {
        expect(error.message).toContain("不支持的通知类型: UNSUPPORTED_TYPE");
      }
    });

    it("should use constants for successful notification logging", async () => {
      const mockAlert = {
        id: "alert_123",
        ruleId: "rule_123",
        ruleName: "Test Rule",
        metric: "cpu_usage",
        value: 85,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: "CPU usage is high",
        startTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockChannelConfig = {
        id: "channel_123",
        name: "test-channel",
        type: NotificationChannelType.EMAIL,
        enabled: true,
        config: { to: "test@example.com" },
      };

      emailSender.send.mockResolvedValue({
        success: true,
        channelId: "channel_123",
        channelType: NotificationChannelType.EMAIL,
        sentAt: new Date(),
        duration: 100,
      });

      await service.sendNotification(mockAlert, mockRule, mockChannelConfig);

      expect(loggerSpy).toHaveBeenCalledWith(
        NOTIFICATION_MESSAGES.NOTIFICATION_SENT,
        expect.objectContaining({
          operation: NOTIFICATION_OPERATIONS.SEND_NOTIFICATION,
          channelType: NotificationChannelType.EMAIL,
          alertId: "alert_123",
          success: true,
        }),
      );
    });
  });

  describe("Enhanced Batch Notifications", () => {
    it("should use constants for batch processing start logging", async () => {
      const mockAlert = {
        id: "alert_123",
        ruleId: "rule_123",
        ruleName: "Test Rule",
        metric: "cpu_usage",
        value: 85,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: "CPU usage is high",
        startTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const channels = [
        {
          id: "channel_1",
          type: NotificationChannelType.EMAIL,
          config: { to: "test1@example.com" },
          enabled: true,
          name: "email",
        },
        {
          id: "channel_2",
          type: NotificationChannelType.SLACK,
          config: { webhookUrl: "http://slack.com" },
          enabled: true,
          name: "slack",
        },
      ];

      const batchMockRule = { ...mockRule, channels };

      // 完整的 INotificationResult mock 对象
      emailSender.send.mockResolvedValue({
        success: true,
        channelId: "channel_1",
        channelType: NotificationChannelType.EMAIL,
        sentAt: new Date(),
        duration: 50,
      } as any);
      slackSender.send.mockResolvedValue({
        success: true,
        channelId: "channel_2",
        channelType: NotificationChannelType.SLACK,
        sentAt: new Date(),
        duration: 60,
      } as any);

      await service.sendBatchNotifications(mockAlert, batchMockRule);

      expect(loggerSpy).toHaveBeenCalledWith(
        NOTIFICATION_MESSAGES.BATCH_PROCESSING_STARTED,
        expect.objectContaining({
          operation: NOTIFICATION_OPERATIONS.SEND_BATCH_NOTIFICATIONS,
          alertId: "alert_123",
          ruleId: "rule_123",
          channelCount: 2,
          enabledChannelCount: 2,
        }),
      );
    });

    it("should handle partial failures in batch notifications", async () => {
      const mockAlert = {
        id: "alert_123",
        ruleId: "rule_123",
        ruleName: "Test Rule",
      };
      const channels = [
        {
          id: "channel_1",
          name: "email-channel",
          type: NotificationChannelType.EMAIL,
          config: { to: "test1@example.com" },
          enabled: true,
        },
        {
          id: "channel_2",
          name: "slack-channel",
          type: NotificationChannelType.SLACK,
          config: { webhookUrl: "http://slack.com" },
          enabled: true,
        },
      ];
      const batchMockRule = { ...mockRule, channels };

      // 完整的 INotificationResult mock 对象
      emailSender.send.mockResolvedValue({
        success: true,
        channelId: "channel_1",
        channelType: NotificationChannelType.EMAIL,
        sentAt: new Date(),
        duration: 50,
      } as any);
      slackSender.send.mockRejectedValue(new Error("Slack API error"));

      const results = await service.sendBatchNotifications(
        mockAlert as any,
        batchMockRule,
      );

      expect(results.results.length).toBe(2);
      expect(
        results.results.find(
          (r) => r.channelType === NotificationChannelType.EMAIL,
        ).success,
      ).toBe(true);
      expect(
        results.results.find(
          (r) => r.channelType === NotificationChannelType.SLACK,
        ).success,
      ).toBe(false);
    });
  });

  describe("Enhanced Channel Testing", () => {
    it("should use constants for channel test logging", async () => {
      const config = { to: "test@example.com" };

      emailSender.test.mockResolvedValue(true);

      await service.testChannel(NotificationChannelType.EMAIL, config);

      expect(loggerSpy).toHaveBeenCalledWith(
        NOTIFICATION_MESSAGES.CHANNEL_TEST_STARTED,
        expect.objectContaining({
          operation: NOTIFICATION_OPERATIONS.TEST_CHANNEL,
          channelType: NotificationChannelType.EMAIL,
        }),
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        NOTIFICATION_MESSAGES.CHANNEL_TEST_PASSED,
        expect.objectContaining({
          operation: NOTIFICATION_OPERATIONS.TEST_CHANNEL,
          channelType: NotificationChannelType.EMAIL,
          success: true,
        }),
      );
    });
  });

  describe("Enhanced Template Generation", () => {
    it("should use constants and utility for template generation", async () => {
      const mockAlert = {
        id: "alert_123",
        ruleId: "rule_123",
        ruleName: "CPU Alert Rule",
        metric: "cpu_usage",
        value: 85,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: "CPU usage is high",
        startTime: new Date(),
        tags: { environment: "production" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRuleForTemplate = {
        id: "rule_123",
        name: "CPU Alert Rule",
        description: "Monitor CPU usage",
      };

      const template = service.generateTemplate(
        mockAlert as any,
        mockRuleForTemplate as any,
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        NOTIFICATION_MESSAGES.TEMPLATE_GENERATION_STARTED,
        expect.objectContaining({
          operation: NOTIFICATION_OPERATIONS.GENERATE_TEMPLATE,
          alertId: "alert_123",
          ruleId: "rule_123",
        }),
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        NOTIFICATION_MESSAGES.TEMPLATE_GENERATED,
        expect.objectContaining({
          operation: NOTIFICATION_OPERATIONS.GENERATE_TEMPLATE,
          alertId: "alert_123",
          var_iableCount: expect.any(Number),
        }),
      );

      expect(template).toHaveProperty("subject");
      expect(template).toHaveProperty("body");
      expect(template).toHaveProperty("variables");
      expect(template.variables).toHaveProperty(
        NOTIFICATION_TEMPLATE_VARIABLES.ALERT_ID,
        "alert_123",
      );
      expect(template.variables).toHaveProperty(
        NOTIFICATION_TEMPLATE_VARIABLES.RULE_NAME,
        "CPU Alert Rule",
      );
    });
  });

  describe("Utility Functions", () => {
    it("should generate error messages using templates", () => {
      const message = NotificationTemplateUtil.generateErrorMessage(
        "UNSUPPORTED_TYPE",
        {
          channelType: "INVALID_TYPE",
        },
      );

      expect(message).toBe("不支持的通知类型: INVALID_TYPE");
    });

    it("should format templates correctly", () => {
      const template =
        "Alert {{alertId}} for rule {{ruleName}} has value {{value}}";
      const variables = {
        alertId: "alert_123",
        ruleName: "Test Rule",
        value: 85,
      };

      const result = NotificationTemplateUtil.formatTemplate(
        template,
        variables,
      );
      expect(result).toBe("Alert alert_123 for rule Test Rule has value 85");
    });

    it("should validate variable names correctly", () => {
      expect(NotificationTemplateUtil.isValidVariableName("alertId")).toBe(
        true,
      );
      expect(NotificationTemplateUtil.isValidVariableName("rule_name")).toBe(
        true,
      );
      expect(NotificationTemplateUtil.isValidVariableName("123invalid")).toBe(
        false,
      );
      expect(NotificationTemplateUtil.isValidVariableName("invalid-name")).toBe(
        false,
      );
    });

    it("should validate email addresses correctly", () => {
      expect(NotificationTemplateUtil.isValidEmail("test@example.com")).toBe(
        true,
      );
      expect(
        NotificationTemplateUtil.isValidEmail("user.name+tag@domain.co.uk"),
      ).toBe(true);
      expect(NotificationTemplateUtil.isValidEmail("invalid-email")).toBe(
        false,
      );
      expect(NotificationTemplateUtil.isValidEmail("@domain.com")).toBe(false);
    });

    it("should validate URLs correctly", () => {
      expect(NotificationTemplateUtil.isValidUrl("_https://example.com")).toBe(
        true,
      );
      expect(NotificationTemplateUtil.isValidUrl("http://_localhost:3000")).toBe(
        true,
      );
      expect(NotificationTemplateUtil.isValidUrl("_ftp://example.com")).toBe(
        false,
      );
      expect(NotificationTemplateUtil.isValidUrl("invalid-url")).toBe(false);
    });

    it("should calculate retry delays correctly", () => {
      const delay1 = NotificationTemplateUtil.calculateRetryDelay(0);
      const delay2 = NotificationTemplateUtil.calculateRetryDelay(1);
      const delay3 = NotificationTemplateUtil.calculateRetryDelay(2);

      expect(delay1).toBeGreaterThanOrEqual(1000);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it("should generate template variables correctly", () => {
      const mockAlert = {
        id: "alert_123",
        metric: "cpu_usage",
        value: 85,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: "CPU usage is high",
        startTime: new Date("2023-01-_01T10:_00:00Z"),
        tags: { environment: "production" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockRule = {
        id: "rule_123",
        name: "CPU Alert Rule",
        description: "Monitor CPU usage",
      };

      const variables = NotificationTemplateUtil.generateTemplateVariables(
        mockAlert,
        mockRule,
      );

      expect(variables[NOTIFICATION_TEMPLATE_VARIABLES.ALERT_ID]).toBe(
        "alert_123",
      );
      expect(variables[NOTIFICATION_TEMPLATE_VARIABLES.RULE_NAME]).toBe(
        "CPU Alert Rule",
      );
      expect(variables[NOTIFICATION_TEMPLATE_VARIABLES.METRIC]).toBe(
        "cpu_usage",
      );
      expect(variables[NOTIFICATION_TEMPLATE_VARIABLES.VALUE]).toBe(85);
      expect(variables[NOTIFICATION_TEMPLATE_VARIABLES.SEVERITY]).toBe(
        "critical",
      );
    });
  });
});

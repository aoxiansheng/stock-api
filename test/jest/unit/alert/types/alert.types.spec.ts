import { 
  AlertSeverity, 
  AlertStatus, 
  NotificationChannelType, 
  NotificationStatus,
  BaseEntity,
  BaseStats,
  BaseQuery,
  AlertRule,
  Alert,
  AlertHistory,
  NotificationChannel,
  NotificationResult,
  BatchNotificationResult,
  NotificationLog,
  AlertQuery,
  RuleEvaluationResult,
  MetricData,
  AlertCondition,
  NotificationSender,
  NotificationTemplate,
  RuleEngine,
  AlertSuppressionRule
} from "../../../../../src/alert/types/alert.types";

describe("AlertTypes", () => {
  describe("Enums", () => {
    it("should have correct AlertSeverity values", () => {
      expect(AlertSeverity.CRITICAL).toBe("critical");
      expect(AlertSeverity.WARNING).toBe("warning");
      expect(AlertSeverity.INFO).toBe("info");
    });

    it("should have correct AlertStatus values", () => {
      expect(AlertStatus.FIRING).toBe("firing");
      expect(AlertStatus.ACKNOWLEDGED).toBe("acknowledged");
      expect(AlertStatus.RESOLVED).toBe("resolved");
      expect(AlertStatus.SUPPRESSED).toBe("suppressed");
    });

    it("should have correct NotificationChannelType values", () => {
      expect(NotificationChannelType.EMAIL).toBe("email");
      expect(NotificationChannelType.WEBHOOK).toBe("webhook");
      expect(NotificationChannelType.SLACK).toBe("slack");
      expect(NotificationChannelType.LOG).toBe("log");
      expect(NotificationChannelType.SMS).toBe("sms");
      expect(NotificationChannelType.DINGTALK).toBe("dingtalk");
    });

    it("should have correct NotificationStatus values", () => {
      expect(NotificationStatus.PENDING).toBe("pending");
      expect(NotificationStatus.SENT).toBe("sent");
      expect(NotificationStatus.DELIVERED).toBe("delivered");
      expect(NotificationStatus.FAILED).toBe("failed");
      expect(NotificationStatus.RETRY).toBe("retry");
    });
  });

  describe("BaseEntity", () => {
    it("should define the correct structure for base entity", () => {
      const entity: BaseEntity = {
        id: "entity-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(entity.id).toBeDefined();
      expect(entity.createdAt).toBeDefined();
      expect(entity.updatedAt).toBeDefined();
    });
  });

  describe("BaseStats", () => {
    it("should define the correct structure for base stats", () => {
      const stats: BaseStats = {
        timestamp: new Date(),
        period: "daily",
      };

      expect(stats.timestamp).toBeDefined();
      expect(stats.period).toBeDefined();
    });
  });

  describe("BaseQuery", () => {
    it("should define the correct structure for base query", () => {
      const query: BaseQuery = {
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      };

      // 所有字段都是可选的
      expect(query.page).toBeDefined();
      expect(query.limit).toBeDefined();
      expect(query.sortBy).toBeDefined();
      expect(query.sortOrder).toBeDefined();
    });

    it("should allow empty base query", () => {
      const query: BaseQuery = {};

      expect(query).toBeDefined();
    });
  });

  describe("Interfaces", () => {
    it("should define the correct structure for NotificationChannel", () => {
      const channel: NotificationChannel = {
        name: "Email Channel",
        type: NotificationChannelType.EMAIL,
        config: { to: "admin@example.com" },
        enabled: true,
        retryCount: 3,
        timeout: 30000,
        priority: 1,
      };

      expect(channel.name).toBeDefined();
      expect(channel.type).toBeDefined();
      expect(channel.config).toBeDefined();
      expect(channel.enabled).toBeDefined();
      expect(channel.retryCount).toBeDefined();
      expect(channel.timeout).toBeDefined();
      expect(channel.priority).toBeDefined();
    });

    it("should define the correct structure for AlertCondition", () => {
      const condition: AlertCondition = {
        field: "cpu_usage",
        operator: ">",
        value: 80,
        logicalOperator: "and",
      };

      expect(condition.field).toBeDefined();
      expect(condition.operator).toBeDefined();
      expect(condition.value).toBeDefined();
      expect(condition.logicalOperator).toBeDefined();
    });

    it("should define the correct structure for AlertRule", () => {
      const rule: AlertRule = {
        id: "rule-123",
        name: "CPU Usage Alert",
        description: "Alert when CPU usage exceeds threshold",
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [],
        cooldown: 300,
        tags: { environment: "production" },
        conditions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(rule.id).toBeDefined();
      expect(rule.name).toBeDefined();
      expect(rule.metric).toBeDefined();
      expect(rule.operator).toBeDefined();
      expect(rule.threshold).toBeDefined();
      expect(rule.duration).toBeDefined();
      expect(rule.severity).toBeDefined();
      expect(rule.enabled).toBeDefined();
      expect(rule.channels).toBeDefined();
      expect(rule.cooldown).toBeDefined();
      expect(rule.createdAt).toBeDefined();
      expect(rule.updatedAt).toBeDefined();

      // 可选字段
      expect(rule.description).toBeDefined();
      expect(rule.tags).toBeDefined();
      expect(rule.conditions).toBeDefined();
    });

    it("should define the correct structure for Alert", () => {
      const alert: Alert = {
        id: "alert-123",
        ruleId: "rule-123",
        ruleName: "CPU Usage Alert",
        metric: "cpu_usage",
        value: 85.5,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.FIRING,
        message: "CPU usage is above threshold",
        startTime: new Date(),
        endTime: new Date(),
        acknowledgedBy: "user1",
        acknowledgedAt: new Date(),
        resolvedBy: "user2",
        resolvedAt: new Date(),
        tags: { environment: "production" },
        context: { currentValue: 85.5 },
        escalationLevel: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(alert.id).toBeDefined();
      expect(alert.ruleId).toBeDefined();
      expect(alert.ruleName).toBeDefined();
      expect(alert.metric).toBeDefined();
      expect(alert.value).toBeDefined();
      expect(alert.threshold).toBeDefined();
      expect(alert.severity).toBeDefined();
      expect(alert.status).toBeDefined();
      expect(alert.message).toBeDefined();
      expect(alert.startTime).toBeDefined();
      expect(alert.createdAt).toBeDefined();
      expect(alert.updatedAt).toBeDefined();

      // 可选字段
      expect(alert.endTime).toBeDefined();
      expect(alert.acknowledgedBy).toBeDefined();
      expect(alert.acknowledgedAt).toBeDefined();
      expect(alert.resolvedBy).toBeDefined();
      expect(alert.resolvedAt).toBeDefined();
      expect(alert.tags).toBeDefined();
      expect(alert.context).toBeDefined();
      expect(alert.escalationLevel).toBeDefined();
    });

    it("should define the correct structure for AlertHistory", () => {
      const history: AlertHistory = {
        id: "history-123",
        alertId: "alert-123",
        action: "created",
        performedBy: "user1",
        performedAt: new Date(),
        details: { reason: "threshold exceeded" },
        comment: "Initial alert creation",
      };

      expect(history.id).toBeDefined();
      expect(history.alertId).toBeDefined();
      expect(history.action).toBeDefined();
      expect(history.performedAt).toBeDefined();

      // 可选字段
      expect(history.performedBy).toBeDefined();
      expect(history.details).toBeDefined();
      expect(history.comment).toBeDefined();
    });

    it("should define the correct structure for NotificationResult", () => {
      const result: NotificationResult = {
        success: true,
        channelId: "channel-123",
        channelType: NotificationChannelType.EMAIL,
        message: "Notification sent successfully",
        error: undefined,
        sentAt: new Date(),
        duration: 1000,
        retryCount: 0,
      };

      expect(result.success).toBeDefined();
      expect(result.channelId).toBeDefined();
      expect(result.channelType).toBeDefined();
      expect(result.sentAt).toBeDefined();
      expect(result.duration).toBeDefined();

      // 可选字段
      expect(result.message).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(result.retryCount).toBeDefined();
    });

    it("should define the correct structure for BatchNotificationResult", () => {
      const result: BatchNotificationResult = {
        total: 5,
        successful: 4,
        failed: 1,
        results: [],
        duration: 5000,
      };

      expect(result.total).toBeDefined();
      expect(result.successful).toBeDefined();
      expect(result.failed).toBeDefined();
      expect(result.results).toBeDefined();
      expect(result.duration).toBeDefined();
    });

    it("should define the correct structure for NotificationLog", () => {
      const log: NotificationLog = {
        id: "log-123",
        alertId: "alert-123",
        channelId: "channel-123",
        channelType: NotificationChannelType.EMAIL,
        success: true,
        message: "Notification sent successfully",
        error: undefined,
        sentAt: new Date(),
        duration: 1000,
        retryCount: 0,
        metadata: { provider: "smtp" },
      };

      expect(log.id).toBeDefined();
      expect(log.alertId).toBeDefined();
      expect(log.channelId).toBeDefined();
      expect(log.channelType).toBeDefined();
      expect(log.success).toBeDefined();
      expect(log.sentAt).toBeDefined();
      expect(log.duration).toBeDefined();
      expect(log.retryCount).toBeDefined();

      // 可选字段
      expect(log.message).toBeDefined();
      expect(log.error).toBeUndefined();
      expect(log.metadata).toBeDefined();
    });

    it("should define the correct structure for AlertQuery", () => {
      const query: AlertQuery = {
        ruleId: "rule-123",
        severity: AlertSeverity.WARNING,
        status: AlertStatus.FIRING,
        startTime: new Date(),
        endTime: new Date(),
        metric: "cpu_usage",
        tags: { environment: "production" },
        acknowledgedBy: "user1",
        resolvedBy: "user2",
        page: 1,
        limit: 10,
        sortBy: "startTime",
        sortOrder: "desc",
      };

      expect(query.ruleId).toBeDefined();
      expect(query.severity).toBeDefined();
      expect(query.status).toBeDefined();
      expect(query.startTime).toBeDefined();
      expect(query.endTime).toBeDefined();
      expect(query.metric).toBeDefined();
      expect(query.page).toBeDefined();
      expect(query.limit).toBeDefined();
      expect(query.sortBy).toBeDefined();
      expect(query.sortOrder).toBeDefined();

      // 可选字段
      expect(query.tags).toBeDefined();
      expect(query.acknowledgedBy).toBeDefined();
      expect(query.resolvedBy).toBeDefined();
    });

    it("should define the correct structure for RuleEvaluationResult", () => {
      const result: RuleEvaluationResult = {
        ruleId: "rule-123",
        triggered: true,
        value: 85.5,
        threshold: 80,
        message: "CPU usage exceeded threshold",
        evaluatedAt: new Date(),
        context: { currentValue: 85.5 },
        severity: AlertSeverity.WARNING,
      };

      expect(result.ruleId).toBeDefined();
      expect(result.triggered).toBeDefined();
      expect(result.value).toBeDefined();
      expect(result.threshold).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.evaluatedAt).toBeDefined();

      // 可选字段
      expect(result.context).toBeDefined();
      expect(result.severity).toBeDefined();
    });

    it("should define the correct structure for MetricData", () => {
      const data: MetricData = {
        metric: "cpu_usage",
        value: 85.5,
        timestamp: new Date(),
        tags: { host: "server-1" },
        source: "prometheus",
      };

      expect(data.metric).toBeDefined();
      expect(data.value).toBeDefined();
      expect(data.timestamp).toBeDefined();

      // 可选字段
      expect(data.tags).toBeDefined();
      expect(data.source).toBeDefined();
    });

    it("should define the correct structure for AlertSuppressionRule", () => {
      const rule: AlertSuppressionRule = {
        id: "suppression-123",
        name: "Maintenance Window Suppression",
        conditions: {
          metric: "cpu_usage",
          severity: AlertSeverity.WARNING,
          tags: { environment: "production" },
        },
        duration: 3600,
        enabled: true,
        priority: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(rule.id).toBeDefined();
      expect(rule.name).toBeDefined();
      expect(rule.conditions).toBeDefined();
      expect(rule.duration).toBeDefined();
      expect(rule.enabled).toBeDefined();
      expect(rule.priority).toBeDefined();
      expect(rule.createdAt).toBeDefined();
      expect(rule.updatedAt).toBeDefined();
    });
  });

  describe("Interfaces with Methods", () => {
    it("should define the correct structure for NotificationSender", () => {
      const sender: NotificationSender = {
        type: NotificationChannelType.EMAIL,
        send: jest.fn(),
        test: jest.fn(),
        validateConfig: jest.fn(),
      };

      expect(sender.type).toBeDefined();
      expect(typeof sender.send).toBe("function");
      expect(typeof sender.test).toBe("function");
      expect(typeof sender.validateConfig).toBe("function");
    });

    it("should define the correct structure for NotificationTemplate", () => {
      const template: NotificationTemplate = {
        subject: "Alert Notification",
        body: "Alert details: {{alert.message}}",
        variables: { alert: { message: "Test alert" } },
        format: "text",
      };

      expect(template.subject).toBeDefined();
      expect(template.body).toBeDefined();
      expect(template.variables).toBeDefined();
      expect(template.format).toBeDefined();
    });

    it("should define the correct structure for RuleEngine", () => {
      const engine: RuleEngine = {
        evaluateRule: jest.fn(),
        evaluateRules: jest.fn(),
        isInCooldown: jest.fn(),
        setCooldown: jest.fn(),
        validateRule: jest.fn(),
      };

      expect(typeof engine.evaluateRule).toBe("function");
      expect(typeof engine.evaluateRules).toBe("function");
      expect(typeof engine.isInCooldown).toBe("function");
      expect(typeof engine.setCooldown).toBe("function");
      expect(typeof engine.validateRule).toBe("function");
    });
  });
});
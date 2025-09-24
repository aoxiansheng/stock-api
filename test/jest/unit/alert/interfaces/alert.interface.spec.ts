import { 
  IAlertRule, 
  IAlert, 
  IAlertStats, 
  IAlertQuery 
} from "../../../../../src/alert/interfaces/alert.interface";
import { AlertSeverity, AlertStatus } from "../../../../../src/alert/types/alert.types";

describe("AlertInterface", () => {
  describe("IAlertRule", () => {
    it("should define the correct structure for alert rule interface", () => {
      const alertRule: IAlertRule = {
        id: "rule-123",
        name: "CPU Usage Alert",
        description: "Alert when CPU usage exceeds threshold",
        metric: "cpu_usage",
        operator: ">",
        threshold: 80,
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [
          {
            id: "channel-1",
            name: "Email Channel",
            type: "email",
            config: { to: "admin@example.com" },
            enabled: true,
          },
        ],
        cooldown: 300,
        tags: { environment: "production" },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "user1",
      };

      // 验证必需字段
      expect(alertRule.id).toBeDefined();
      expect(alertRule.name).toBeDefined();
      expect(alertRule.metric).toBeDefined();
      expect(alertRule.operator).toBeDefined();
      expect(alertRule.threshold).toBeDefined();
      expect(alertRule.duration).toBeDefined();
      expect(alertRule.severity).toBeDefined();
      expect(alertRule.enabled).toBeDefined();
      expect(alertRule.channels).toBeDefined();
      expect(alertRule.cooldown).toBeDefined();
      expect(alertRule.createdAt).toBeDefined();
      expect(alertRule.updatedAt).toBeDefined();

      // 验证可选字段
      expect(alertRule.description).toBeDefined();
      expect(alertRule.tags).toBeDefined();
      expect(alertRule.createdBy).toBeDefined();
    });
  });

  describe("IAlert", () => {
    it("should define the correct structure for alert interface", () => {
      const alert: IAlert = {
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
      };

      // 验证必需字段
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

      // 验证可选字段
      expect(alert.endTime).toBeDefined();
      expect(alert.acknowledgedBy).toBeDefined();
      expect(alert.acknowledgedAt).toBeDefined();
      expect(alert.resolvedBy).toBeDefined();
      expect(alert.resolvedAt).toBeDefined();
      expect(alert.tags).toBeDefined();
      expect(alert.context).toBeDefined();
    });
  });

  describe("IAlertStats", () => {
    it("should define the correct structure for alert stats interface", () => {
      const alertStats: IAlertStats = {
        totalRules: 10,
        enabledRules: 8,
        activeAlerts: 2,
        criticalAlerts: 1,
        warningAlerts: 1,
        infoAlerts: 0,
        totalAlertsToday: 5,
        resolvedAlertsToday: 3,
        averageResolutionTime: 120,
        timestamp: new Date(),
        period: "daily",
      };

      // 验证继承自 BaseAlertStats 的字段
      expect(alertStats.activeAlerts).toBeDefined();
      expect(alertStats.criticalAlerts).toBeDefined();
      expect(alertStats.warningAlerts).toBeDefined();
      expect(alertStats.infoAlerts).toBeDefined();
      expect(alertStats.totalAlertsToday).toBeDefined();
      expect(alertStats.resolvedAlertsToday).toBeDefined();
      expect(alertStats.averageResolutionTime).toBeDefined();
      expect(alertStats.timestamp).toBeDefined();
      expect(alertStats.period).toBeDefined();

      // 验证 IAlertStats 特有的字段
      expect(alertStats.totalRules).toBeDefined();
      expect(alertStats.enabledRules).toBeDefined();
    });
  });

  describe("IAlertQuery", () => {
    it("should define the correct structure for alert query interface", () => {
      const alertQuery: IAlertQuery = {
        ruleId: "rule-123",
        severity: AlertSeverity.WARNING,
        status: AlertStatus.FIRING,
        startTime: new Date("2023-01-01T00:00:00Z"),
        endTime: new Date("2023-01-02T00:00:00Z"),
        metric: "cpu_usage",
        tags: { environment: "production" },
        page: 1,
        limit: 10,
        sortBy: "startTime",
        sortOrder: "desc",
      };

      // 验证可选字段
      expect(alertQuery.ruleId).toBeDefined();
      expect(alertQuery.severity).toBeDefined();
      expect(alertQuery.status).toBeDefined();
      expect(alertQuery.startTime).toBeDefined();
      expect(alertQuery.endTime).toBeDefined();
      expect(alertQuery.metric).toBeDefined();
      expect(alertQuery.tags).toBeDefined();
      expect(alertQuery.page).toBeDefined();
      expect(alertQuery.limit).toBeDefined();
      expect(alertQuery.sortBy).toBeDefined();
      expect(alertQuery.sortOrder).toBeDefined();
    });

    it("should allow minimal query interface", () => {
      const alertQuery: IAlertQuery = {};

      // 所有字段都是可选的
      expect(alertQuery).toBeDefined();
    });
  });
});
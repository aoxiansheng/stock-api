import { 
  AlertRule, 
  AlertRuleSchema 
} from "../../../../../src/alert/schemas/alert-rule.schema";
import { AlertSeverity } from "../../../../../src/alert/types/alert.types";
import { Schema } from "mongoose";

describe("AlertRuleSchema", () => {
  describe("Schema Definition", () => {
    it("should be a valid Mongoose schema", () => {
      expect(AlertRuleSchema).toBeInstanceOf(Schema);
    });

    it("should have correct timestamps configuration", () => {
      expect(AlertRuleSchema.options.timestamps).toBe(true);
    });

    it("should have correct collection name", () => {
      expect(AlertRuleSchema.options.collection).toBe("alert_rules");
    });
  });

  describe("AlertRule Class", () => {
    it("should define the correct structure for alert rule schema", () => {
      const alertRule: AlertRule = {
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
            name: "Email Channel",
            type: "email",
            config: { to: "admin@example.com" },
            enabled: true,
          },
        ],
        cooldown: 300,
        tags: { environment: "production" },
        createdBy: "user1",
        createdAt: new Date(),
        updatedAt: new Date(),
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

    it("should have correct default values", () => {
      const alertRule = new AlertRule();
      
      // 验证默认值
      expect(alertRule.operator).toBe(">");
      expect(alertRule.severity).toBe(AlertSeverity.WARNING);
      expect(alertRule.enabled).toBe(true);
      expect(alertRule.duration).toBe(60);
      expect(alertRule.cooldown).toBe(300);
      expect(alertRule.channels).toEqual([]);
      expect(alertRule.tags).toEqual({});
    });

    it("should have semantic accessor methods", () => {
      const alertRule = new AlertRule();
      alertRule.createdAt = new Date("2023-01-01T00:00:00Z");
      alertRule.updatedAt = new Date("2023-01-01T00:05:00Z");
      alertRule.createdBy = "user1";
      alertRule.operator = ">";

      // 验证语义化访问器
      expect(alertRule.ruleCreatedAt).toBe(alertRule.createdAt);
      expect(alertRule.ruleUpdatedAt).toBe(alertRule.updatedAt);
      expect(alertRule.ruleCreator).toBe(alertRule.createdBy);
      expect(alertRule.ruleOperator).toBe(alertRule.operator);
    });
  });

  describe("Schema Indexes", () => {
    it("should have correct indexes defined", () => {
      const indexes = AlertRuleSchema.indexes();
      
      // 验证索引存在
      expect(indexes.some(index => index[0].metric)).toBe(true);
      expect(indexes.some(index => index[0].severity)).toBe(true);
      expect(indexes.some(index => index[0].createdAt)).toBe(true);
      expect(indexes.some(index => index[0]["tags.environment"])).toBe(true);
      expect(indexes.some(index => index[0]["tags.service"])).toBe(true);
    });
  });
});
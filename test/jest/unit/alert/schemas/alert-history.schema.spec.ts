import { 
  AlertHistory, 
  AlertHistorySchema 
} from "../../../../../src/alert/schemas/alert-history.schema";
import { AlertSeverity, AlertStatus } from "../../../../../src/alert/types/alert.types";
import { Schema } from "mongoose";

describe("AlertHistorySchema", () => {
  describe("Schema Definition", () => {
    it("should be a valid Mongoose schema", () => {
      expect(AlertHistorySchema).toBeInstanceOf(Schema);
    });

    it("should have correct timestamps configuration", () => {
      expect(AlertHistorySchema.options.timestamps).toBe(true);
    });

    it("should have correct collection name", () => {
      expect(AlertHistorySchema.options.collection).toBe("alert_history");
    });
  });

  describe("AlertHistory Class", () => {
    it("should define the correct structure for alert history schema", () => {
      const alertHistory: AlertHistory = {
        id: "alert-123",
        ruleId: "rule-123",
        ruleName: "CPU Usage Alert",
        metric: "cpu_usage",
        value: 85.5,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.FIRING,
        message: "CPU usage is above threshold",
        startTime: new Date("2023-01-01T00:00:00Z"),
        endTime: new Date("2023-01-01T00:05:00Z"),
        acknowledgedBy: "user1",
        acknowledgedAt: new Date("2023-01-01T00:01:00Z"),
        resolvedBy: "user2",
        resolvedAt: new Date("2023-01-01T00:05:00Z"),
        tags: { environment: "production" },
        context: { currentValue: 85.5 },
      };

      // 验证必需字段
      expect(alertHistory.id).toBeDefined();
      expect(alertHistory.ruleId).toBeDefined();
      expect(alertHistory.ruleName).toBeDefined();
      expect(alertHistory.metric).toBeDefined();
      expect(alertHistory.value).toBeDefined();
      expect(alertHistory.threshold).toBeDefined();
      expect(alertHistory.severity).toBeDefined();
      expect(alertHistory.status).toBeDefined();
      expect(alertHistory.message).toBeDefined();
      expect(alertHistory.startTime).toBeDefined();

      // 验证可选字段
      expect(alertHistory.endTime).toBeDefined();
      expect(alertHistory.acknowledgedBy).toBeDefined();
      expect(alertHistory.acknowledgedAt).toBeDefined();
      expect(alertHistory.resolvedBy).toBeDefined();
      expect(alertHistory.resolvedAt).toBeDefined();
      expect(alertHistory.tags).toBeDefined();
      expect(alertHistory.context).toBeDefined();
    });

    it("should have semantic accessor methods", () => {
      const alertHistory = new AlertHistory();
      alertHistory.startTime = new Date("2023-01-01T00:00:00Z");
      alertHistory.endTime = new Date("2023-01-01T00:05:00Z");
      alertHistory.acknowledgedAt = new Date("2023-01-01T00:01:00Z");
      alertHistory.resolvedAt = new Date("2023-01-01T00:05:00Z");
      alertHistory.acknowledgedBy = "user1";
      alertHistory.resolvedBy = "user2";

      // 验证语义化访问器
      expect(alertHistory.alertCreatedAt).toBe(alertHistory.startTime);
      expect(alertHistory.alertProcessedAt).toBe(alertHistory.acknowledgedAt);
      expect(alertHistory.alertEndedAt).toBe(alertHistory.endTime);
      expect(alertHistory.alertHandler).toBe(alertHistory.resolvedBy);
      expect(alertHistory.alertAcknowledger).toBe(alertHistory.acknowledgedBy);
      expect(alertHistory.alertResolver).toBe(alertHistory.resolvedBy);
    });

    it("should handle alertHandler correctly when resolvedBy is not set", () => {
      const alertHistory = new AlertHistory();
      alertHistory.acknowledgedBy = "user1";
      alertHistory.resolvedBy = undefined;

      // 当 resolvedBy 未设置时，应该返回 acknowledgedBy
      expect(alertHistory.alertHandler).toBe(alertHistory.acknowledgedBy);
    });
  });

  describe("Schema Indexes", () => {
    it("should have correct indexes defined", () => {
      const indexes = AlertHistorySchema.indexes();
      
      // 验证索引存在
      expect(indexes.some(index => index[0].ruleId)).toBe(true);
      expect(indexes.some(index => index[0].severity)).toBe(true);
      expect(indexes.some(index => index[0].startTime)).toBe(true);
      expect(indexes.some(index => index[0].status)).toBe(true);
      expect(indexes.some(index => index[0].metric)).toBe(true);
      expect(indexes.some(index => index[0]["tags.environment"])).toBe(true);
      expect(indexes.some(index => index[0]["tags.service"])).toBe(true);
      
      // 验证TTL索引存在
      expect(indexes.some(index => 
        index[0].startTime && index[1] && index[1].expireAfterSeconds
      )).toBe(true);
    });
  });
});
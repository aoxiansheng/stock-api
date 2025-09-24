import { 
  AlertFiredEvent, 
  AlertResolvedEvent, 
  AlertAcknowledgedEvent, 
  AlertSuppressedEvent, 
  AlertEscalatedEvent, 
  ALERT_EVENTS, 
  AlertEventType, 
  AlertEventMap 
} from "../../../../../src/alert/events/alert.events";
import { Alert, AlertRule } from "../../../../../src/alert/types/alert.types";

describe("AlertEvents", () => {
  describe("Event Classes", () => {
    const mockAlert: Alert = {
      id: "alert-123",
      ruleId: "rule-123",
      ruleName: "CPU Usage Alert",
      metric: "cpu_usage",
      value: 85.5,
      threshold: 80,
      severity: "warning",
      status: "firing",
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

    const mockRule: AlertRule = {
      id: "rule-123",
      name: "CPU Usage Alert",
      description: "Alert when CPU usage exceeds threshold",
      metric: "cpu_usage",
      operator: ">",
      threshold: 80,
      duration: 60,
      severity: "warning",
      enabled: true,
      channels: [],
      cooldown: 300,
      tags: { environment: "production" },
      conditions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockContext = {
      metricValue: 85.5,
      threshold: 80,
      triggeredAt: new Date(),
      dataSource: "prometheus",
      tags: { environment: "production" },
    };

    it("should create AlertFiredEvent correctly", () => {
      const event = new AlertFiredEvent(mockAlert, mockRule, mockContext);

      expect(event.alert).toBe(mockAlert);
      expect(event.rule).toBe(mockRule);
      expect(event.context).toBe(mockContext);
    });

    it("should create AlertResolvedEvent correctly", () => {
      const resolvedAt = new Date();
      const resolvedBy = "user1";
      const comment = "Issue resolved";

      const event = new AlertResolvedEvent(mockAlert, resolvedAt, resolvedBy, comment);

      expect(event.alert).toBe(mockAlert);
      expect(event.resolvedAt).toBe(resolvedAt);
      expect(event.resolvedBy).toBe(resolvedBy);
      expect(event.comment).toBe(comment);
    });

    it("should create AlertAcknowledgedEvent correctly", () => {
      const acknowledgedAt = new Date();
      const acknowledgedBy = "user1";
      const comment = "Acknowledged for investigation";

      const event = new AlertAcknowledgedEvent(mockAlert, acknowledgedAt, acknowledgedBy, comment);

      expect(event.alert).toBe(mockAlert);
      expect(event.acknowledgedAt).toBe(acknowledgedAt);
      expect(event.acknowledgedBy).toBe(acknowledgedBy);
      expect(event.comment).toBe(comment);
    });

    it("should create AlertSuppressedEvent correctly", () => {
      const suppressedAt = new Date();
      const suppressedBy = "user1";
      const suppressionDuration = 300;
      const reason = "Maintenance window";

      const event = new AlertSuppressedEvent(mockAlert, suppressedAt, suppressedBy, suppressionDuration, reason);

      expect(event.alert).toBe(mockAlert);
      expect(event.suppressedAt).toBe(suppressedAt);
      expect(event.suppressedBy).toBe(suppressedBy);
      expect(event.suppressionDuration).toBe(suppressionDuration);
      expect(event.reason).toBe(reason);
    });

    it("should create AlertEscalatedEvent correctly", () => {
      const previousSeverity = "warning";
      const newSeverity = "critical";
      const escalatedAt = new Date();
      const escalationReason = "Severity increased due to multiple failures";

      const event = new AlertEscalatedEvent(mockAlert, previousSeverity, newSeverity, escalatedAt, escalationReason);

      expect(event.alert).toBe(mockAlert);
      expect(event.previousSeverity).toBe(previousSeverity);
      expect(event.newSeverity).toBe(newSeverity);
      expect(event.escalatedAt).toBe(escalatedAt);
      expect(event.escalationReason).toBe(escalationReason);
    });
  });

  describe("ALERT_EVENTS", () => {
    it("should have correct event name constants", () => {
      expect(ALERT_EVENTS.FIRED).toBe("alert.fired");
      expect(ALERT_EVENTS.RESOLVED).toBe("alert.resolved");
      expect(ALERT_EVENTS.ACKNOWLEDGED).toBe("alert.acknowledged");
      expect(ALERT_EVENTS.SUPPRESSED).toBe("alert.suppressed");
      expect(ALERT_EVENTS.ESCALATED).toBe("alert.escalated");
    });

    it("should have unique event names", () => {
      const eventNames = Object.values(ALERT_EVENTS);
      const uniqueEventNames = [...new Set(eventNames)];
      expect(eventNames).toHaveLength(uniqueEventNames.length);
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        ALERT_EVENTS.FIRED = "alert.triggered";
      }).toThrow();

      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        ALERT_EVENTS.RESOLVED = "alert.closed";
      }).toThrow();
    });
  });

  describe("Type Definitions", () => {
    it("should define correct AlertEventType", () => {
      const eventType: AlertEventType = "alert.fired";
      expect(eventType).toBe("alert.fired");
    });

    it("should define correct AlertEventMap", () => {
      const eventMap: AlertEventMap = {
        "alert.fired": new AlertFiredEvent(
          // @ts-ignore - 使用部分mock数据
          { id: "alert-123" },
          { id: "rule-123" },
          { metricValue: 85.5 }
        ),
        "alert.resolved": new AlertResolvedEvent(
          // @ts-ignore - 使用部分mock数据
          { id: "alert-123" },
          new Date(),
          "user1"
        ),
        "alert.acknowledged": new AlertAcknowledgedEvent(
          // @ts-ignore - 使用部分mock数据
          { id: "alert-123" },
          new Date(),
          "user1"
        ),
        "alert.suppressed": new AlertSuppressedEvent(
          // @ts-ignore - 使用部分mock数据
          { id: "alert-123" },
          new Date(),
          "user1",
          300
        ),
        "alert.escalated": new AlertEscalatedEvent(
          // @ts-ignore - 使用部分mock数据
          { id: "alert-123" },
          "warning",
          "critical",
          new Date(),
          "Severity increased"
        ),
      };

      expect(eventMap["alert.fired"]).toBeInstanceOf(AlertFiredEvent);
      expect(eventMap["alert.resolved"]).toBeInstanceOf(AlertResolvedEvent);
      expect(eventMap["alert.acknowledged"]).toBeInstanceOf(AlertAcknowledgedEvent);
      expect(eventMap["alert.suppressed"]).toBeInstanceOf(AlertSuppressedEvent);
      expect(eventMap["alert.escalated"]).toBeInstanceOf(AlertEscalatedEvent);
    });
  });
});
import * as AlertSchemasIndex from "../../../../../src/alert/schemas/index";
import { AlertRuleSchema } from "../../../../../src/alert/schemas/alert-rule.schema";
import { AlertHistorySchema } from "../../../../../src/alert/schemas/alert-history.schema";
import { NotificationLogSchema } from "../../../../../src/alert/schemas/notification-log.schema";

describe("Alert Schemas Index", () => {
  it("should export AlertRuleSchema", () => {
    expect(AlertSchemasIndex.AlertRuleSchema).toBeDefined();
    expect(AlertSchemasIndex.AlertRuleSchema).toBe(AlertRuleSchema);
  });

  it("should export AlertHistorySchema", () => {
    expect(AlertSchemasIndex.AlertHistorySchema).toBeDefined();
    expect(AlertSchemasIndex.AlertHistorySchema).toBe(AlertHistorySchema);
  });

  it("should export NotificationLogSchema", () => {
    expect(AlertSchemasIndex.NotificationLogSchema).toBeDefined();
    expect(AlertSchemasIndex.NotificationLogSchema).toBe(NotificationLogSchema);
  });

  it("should export all expected schemas", () => {
    const expectedExports = [
      "AlertRuleSchema",
      "AlertHistorySchema",
      "NotificationLogSchema",
    ];

    expectedExports.forEach((exportName) => {
      expect(AlertSchemasIndex[exportName]).toBeDefined();
    });
  });

  it("should not export undefined values", () => {
    Object.values(AlertSchemasIndex).forEach((exportedValue) => {
      expect(exportedValue).toBeDefined();
    });
  });

  it("should have valid mongoose schema exports", () => {
    Object.values(AlertSchemasIndex).forEach((exportedValue) => {
      expect(typeof exportedValue).toBe("object");
    });
  });

  it("should support mongoose schema structure", () => {
    // Mongoose schemas are objects with schema definition
    expect(AlertSchemasIndex.AlertRuleSchema).toBeInstanceOf(Object);
    expect(AlertSchemasIndex.AlertHistorySchema).toBeInstanceOf(Object);
    expect(AlertSchemasIndex.NotificationLogSchema).toBeInstanceOf(Object);
  });
});

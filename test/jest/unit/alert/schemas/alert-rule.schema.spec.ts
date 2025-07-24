import { SchemaFactory } from "@nestjs/mongoose";
import {
  AlertRule,
  AlertRuleSchema,
} from "../../../../../src/alert/schemas/alert-rule.schema";
import { AlertSeverity } from "../../../../../src/alert/types/alert.types";

describe("AlertRuleSchema", () => {
  it("should create a valid AlertRule model", () => {
    const schemaDefinition = AlertRuleSchema.obj;

    expect(schemaDefinition).toHaveProperty("id");
    expect(schemaDefinition).toHaveProperty("name");
    expect(schemaDefinition).toHaveProperty("metric");
    expect(schemaDefinition).toHaveProperty("operator");
    expect(schemaDefinition).toHaveProperty("threshold");
    expect(schemaDefinition).toHaveProperty("duration");
    expect(schemaDefinition).toHaveProperty("severity");
    expect(schemaDefinition).toHaveProperty("enabled");
    expect(schemaDefinition).toHaveProperty("channels");
    expect(schemaDefinition).toHaveProperty("cooldown");

    expect((schemaDefinition.id as any).unique).toBe(true);
    expect((schemaDefinition.operator as any).default).toBe("gt");
    expect((schemaDefinition.duration as any).default).toBe(60);
    expect((schemaDefinition.severity as any).default).toBe(
      AlertSeverity.WARNING,
    );
    expect((schemaDefinition.enabled as any).default).toBe(true);
    expect((schemaDefinition.cooldown as any).default).toBe(300);
  });

  it("should have correct indexes", () => {
    const indexes = AlertRuleSchema.indexes();
    const expectedIndexes = [
      [{ id: 1 }, { unique: true, background: true }],
      [{ metric: 1, enabled: 1 }, { background: true }],
      [{ severity: 1, enabled: 1 }, { background: true }],
      [{ createdAt: -1 }, { background: true }],
      [{ "tags.environment": 1 }, { background: true }],
      [{ "tags.service": 1 }, { background: true }],
    ];

    // Sort both arrays to ensure order doesn't affect the test
    const sortFn = (a, b) =>
      JSON.stringify(a[0]).localeCompare(JSON.stringify(b[0]));

    expect(indexes.sort(sortFn)).toEqual(expectedIndexes.sort(sortFn));
  });
});

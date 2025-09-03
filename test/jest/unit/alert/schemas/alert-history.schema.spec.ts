import {
  AlertHistory,
  AlertHistorySchema,
} from "../../../../../src/alert/schemas/alert-history.schema";
import { AlertStatus } from "../../../../../src/alert/types/alert.types";

describe("AlertHistorySchema", () => {
  it("should create a valid AlertHistory model", () => {
    const schemaDefinition = AlertHistorySchema.obj;

    expect(schemaDefinition).toHaveProperty("id");
    expect(schemaDefinition).toHaveProperty("ruleId");
    expect(schemaDefinition).toHaveProperty("ruleName");
    expect(schemaDefinition).toHaveProperty("metric");
    expect(schemaDefinition).toHaveProperty("value");
    expect(schemaDefinition).toHaveProperty("threshold");
    expect(schemaDefinition).toHaveProperty("severity");
    expect(schemaDefinition).toHaveProperty("status");
    expect(schemaDefinition).toHaveProperty("message");
    expect(schemaDefinition).toHaveProperty("startTime");

    expect((schemaDefinition.id as any).unique).toBe(true);
    expect((schemaDefinition.status as any).default).toBe(AlertStatus.FIRING);
  });

  it("should have correct indexes", () => {
    const indexes = AlertHistorySchema.indexes();
    const expectedIndexes = [
      [{ id: 1 }, { background: true, unique: true }],
      [{ ruleId: 1, startTime: -1 }, { background: true }],
      [{ severity: 1, status: 1 }, { background: true }],
      [{ startTime: -1 }, { background: true }],
      [{ status: 1, startTime: -1 }, { background: true }],
      [{ metric: 1, startTime: -1 }, { background: true }],
      [{ "tags.environment": 1 }, { background: true }],
      [{ "tags.service": 1 }, { background: true }],
      [{ startTime: 1 }, { background: true, expireAfterSeconds: 7776000 }],
    ];
    expect(indexes).toEqual(expect.arrayContaining(expectedIndexes));
  });

  describe("Getters", () => {
    let alertHistory: AlertHistory;

    beforeEach(() => {
      alertHistory = new AlertHistory();
      alertHistory.startTime = new Date("2023-01-01T_00:00:00.000Z");
    });

    it("should calculate duration correctly", () => {
      alertHistory.endTime = new Date("2023-01-01T00:01:00.000Z");
      expect(alertHistory.duration).toBe(60000);
    });

    it("should return 0 duration if endTime is not set", () => {
      expect(alertHistory.duration).toBe(0);
    });

    it("should correctly determine if alert is active", () => {
      alertHistory.status = AlertStatus.FIRING;
      expect(alertHistory.isActive).toBe(true);

      alertHistory.status = AlertStatus.ACKNOWLEDGED;
      expect(alertHistory.isActive).toBe(true);

      alertHistory.status = AlertStatus.RESOLVED;
      expect(alertHistory.isActive).toBe(false);
    });
  });
});

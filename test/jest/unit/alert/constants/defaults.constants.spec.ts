import { ALERT_DEFAULTS } from "../../../../../src/alert/constants/defaults.constants";
import { AlertSeverity } from "../../../../../src/alert/types/alert.types";

describe("AlertDefaults", () => {
  describe("ALERT_DEFAULTS", () => {
    it("should have correct default values", () => {
      expect(ALERT_DEFAULTS.operator).toBe(">");
      expect(ALERT_DEFAULTS.severity).toBe(AlertSeverity.WARNING);
      expect(ALERT_DEFAULTS.enabled).toBe(true);
      expect(ALERT_DEFAULTS.duration).toBe(60);
    });

    it("should have immutable default values", () => {
      // 尝试修改默认值应该失败
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        ALERT_DEFAULTS.operator = "<";
      }).toThrow();

      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        ALERT_DEFAULTS.severity = AlertSeverity.CRITICAL;
      }).toThrow();

      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        ALERT_DEFAULTS.enabled = false;
      }).toThrow();

      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        ALERT_DEFAULTS.duration = 120;
      }).toThrow();
    });

    it("should have the correct types", () => {
      expect(typeof ALERT_DEFAULTS.operator).toBe("string");
      expect(typeof ALERT_DEFAULTS.severity).toBe("string");
      expect(typeof ALERT_DEFAULTS.enabled).toBe("boolean");
      expect(typeof ALERT_DEFAULTS.duration).toBe("number");
    });

    it("should have valid operator values", () => {
      const validOperators = [">", ">=", "<", "<=", "==", "!="];
      expect(validOperators).toContain(ALERT_DEFAULTS.operator);
    });

    it("should have valid severity values", () => {
      const validSeverities = [
        AlertSeverity.CRITICAL,
        AlertSeverity.WARNING,
        AlertSeverity.INFO,
      ];
      expect(validSeverities).toContain(ALERT_DEFAULTS.severity);
    });

    it("should have positive duration value", () => {
      expect(ALERT_DEFAULTS.duration).toBeGreaterThan(0);
    });
  });
});
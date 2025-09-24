import { ALERT_VALIDATION_LIMITS } from "../../../../../src/alert/constants/validation.constants";

describe("AlertValidationConstants", () => {
  describe("ALERT_VALIDATION_LIMITS", () => {
    it("should have correct validation limit values", () => {
      // 持续时间和冷却时间限制
      expect(ALERT_VALIDATION_LIMITS.DURATION_MIN).toBe(30);
      expect(ALERT_VALIDATION_LIMITS.DURATION_MAX).toBe(600);
      expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MIN).toBe(60);
      expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MAX).toBe(3000);

      // 重试和超时验证常量
      expect(ALERT_VALIDATION_LIMITS.RETRIES_MIN).toBe(0);
      expect(ALERT_VALIDATION_LIMITS.RETRIES_MAX).toBe(10);
      expect(ALERT_VALIDATION_LIMITS.TIMEOUT_MIN).toBe(1000);
      expect(ALERT_VALIDATION_LIMITS.TIMEOUT_MAX).toBe(60000);

      // 字符串长度限制
      expect(ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH).toBe(100);
      expect(ALERT_VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH).toBe(500);
    });

    it("should have positive validation limit values", () => {
      Object.values(ALERT_VALIDATION_LIMITS).forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });

    it("should maintain logical validation limit order", () => {
      // 持续时间范围
      expect(ALERT_VALIDATION_LIMITS.DURATION_MIN).toBeLessThan(ALERT_VALIDATION_LIMITS.DURATION_MAX);
      
      // 冷却时间范围
      expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MIN).toBeLessThan(ALERT_VALIDATION_LIMITS.COOLDOWN_MAX);
      
      // 重试次数范围
      expect(ALERT_VALIDATION_LIMITS.RETRIES_MIN).toBeLessThan(ALERT_VALIDATION_LIMITS.RETRIES_MAX);
      
      // 超时时间范围
      expect(ALERT_VALIDATION_LIMITS.TIMEOUT_MIN).toBeLessThan(ALERT_VALIDATION_LIMITS.TIMEOUT_MAX);
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        ALERT_VALIDATION_LIMITS.DURATION_MIN = 15;
      }).toThrow();

      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH = 200;
      }).toThrow();
    });

    it("should have the correct types", () => {
      Object.values(ALERT_VALIDATION_LIMITS).forEach(value => {
        expect(typeof value).toBe("number");
      });
    });
  });
});
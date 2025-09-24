import { RULE_LIMITS, RETRY_LIMITS } from "../../../../../src/alert/constants/limits.constants";

describe("AlertLimits", () => {
  describe("RULE_LIMITS", () => {
    it("should have correct rule limit values", () => {
      expect(RULE_LIMITS.MAX_ACTIONS_PER_RULE).toBe(5);
      expect(RULE_LIMITS.MAX_TAGS_PER_ENTITY).toBe(10);
    });

    it("should have positive limit values", () => {
      expect(RULE_LIMITS.MAX_ACTIONS_PER_RULE).toBeGreaterThan(0);
      expect(RULE_LIMITS.MAX_TAGS_PER_ENTITY).toBeGreaterThan(0);
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        RULE_LIMITS.MAX_ACTIONS_PER_RULE = 10;
      }).toThrow();

      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        RULE_LIMITS.MAX_TAGS_PER_ENTITY = 20;
      }).toThrow();
    });

    it("should have the correct types", () => {
      expect(typeof RULE_LIMITS.MAX_ACTIONS_PER_RULE).toBe("number");
      expect(typeof RULE_LIMITS.MAX_TAGS_PER_ENTITY).toBe("number");
    });
  });

  describe("RETRY_LIMITS", () => {
    it("should have correct retry limit values", () => {
      expect(RETRY_LIMITS.MINIMAL_RETRIES).toBe(1);
      expect(RETRY_LIMITS.STANDARD_RETRIES).toBe(3);
      expect(RETRY_LIMITS.CRITICAL_RETRIES).toBe(5);
      expect(RETRY_LIMITS.MAX_RETRIES).toBe(10);
      expect(RETRY_LIMITS.DATABASE_RETRIES).toBe(3);
      expect(RETRY_LIMITS.API_RETRIES).toBe(3);
      expect(RETRY_LIMITS.NOTIFICATION_RETRIES).toBe(5);
      expect(RETRY_LIMITS.VALIDATION_RETRIES).toBe(1);
    });

    it("should have positive retry values", () => {
      Object.values(RETRY_LIMITS).forEach(value => {
        expect(value).toBeGreaterThan(0);
      });
    });

    it("should maintain logical order of retry limits", () => {
      expect(RETRY_LIMITS.MINIMAL_RETRIES).toBeLessThan(RETRY_LIMITS.STANDARD_RETRIES);
      expect(RETRY_LIMITS.STANDARD_RETRIES).toBeLessThan(RETRY_LIMITS.CRITICAL_RETRIES);
      expect(RETRY_LIMITS.CRITICAL_RETRIES).toBeLessThan(RETRY_LIMITS.MAX_RETRIES);
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        RETRY_LIMITS.MINIMAL_RETRIES = 2;
      }).toThrow();

      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        RETRY_LIMITS.STANDARD_RETRIES = 5;
      }).toThrow();
    });

    it("should have the correct types", () => {
      Object.values(RETRY_LIMITS).forEach(value => {
        expect(typeof value).toBe("number");
      });
    });
  });
});
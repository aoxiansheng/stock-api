import { alertConfig } from "../../../../../src/common/config/alert.config";

describe("AlertConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("alert configuration", () => {
    it("should use default evaluation interval when env var is not set", () => {
      delete process.env.ALERT_EVALUATION_INTERVAL;
      const config = alertConfig();
      expect(config.evaluationInterval).toBe(60);
    });

    it("should parse evaluation interval from environment variable", () => {
      process.env.ALERT_EVALUATION_INTERVAL = "120";
      const config = alertConfig();
      expect(config.evaluationInterval).toBe(120);
    });

    it("should handle invalid evaluation interval gracefully", () => {
      process.env.ALERT_EVALUATION_INTERVAL = "invalid";
      const config = alertConfig();
      expect(config.evaluationInterval).toBeNaN();
    });

    it("should handle zero evaluation interval", () => {
      process.env.ALERT_EVALUATION_INTERVAL = "0";
      const config = alertConfig();
      expect(config.evaluationInterval).toBe(0);
    });

    it("should handle negative evaluation interval", () => {
      process.env.ALERT_EVALUATION_INTERVAL = "-30";
      const config = alertConfig();
      expect(config.evaluationInterval).toBe(-30);
    });

    it("should parse evaluation interval with radix 10", () => {
      process.env.ALERT_EVALUATION_INTERVAL = "08";
      const config = alertConfig();
      expect(config.evaluationInterval).toBe(8);
    });
  });

  describe("validation configuration", () => {
    it("should have correct duration validation limits", () => {
      const config = alertConfig();

      expect(config.validation.duration.min).toBe(1);
      expect(config.validation.duration.max).toBe(3600);
    });

    it("should have correct cooldown validation limits", () => {
      const config = alertConfig();

      expect(config.validation.cooldown.min).toBe(0);
      expect(config.validation.cooldown.max).toBe(86400);
    });
  });

  describe("cache configuration", () => {
    it("should have correct cache prefixes", () => {
      const config = alertConfig();

      expect(config.cache.cooldownPrefix).toBe("alert:cooldown:");
      expect(config.cache.activeAlertPrefix).toBe("active-alert");
    });

    it("should have correct TTL settings", () => {
      const config = alertConfig();

      expect(config.cache.activeAlertTtlSeconds).toBe(24 * 60 * 60);
      expect(config.cache.activeAlertTtlSeconds).toBe(86400);
    });
  });

  describe("complete configuration structure", () => {
    it("should return complete configuration object", () => {
      process.env.ALERT_EVALUATION_INTERVAL = "90";
      const config = alertConfig();

      expect(config).toEqual({
        evaluationInterval: 90,
        validation: {
          duration: {
            min: 1,
            max: 3600,
          },
          cooldown: {
            min: 0,
            max: 86400,
          },
        },
        cache: {
          cooldownPrefix: "alert:cooldown:",
          activeAlertPrefix: "active-alert",
          activeAlertTtlSeconds: 86400,
        },
      });
    });

    it('should be registered as "alert" config', () => {
      // Test that it's a NestJS config factory
      expect(typeof alertConfig).toBe("function");

      // The registerAs wrapper adds a KEY property
      expect((alertConfig as any).KEY).toBe("CONFIGURATION(alert)");
    });
  });

  describe("time-based calculations", () => {
    it("should calculate active alert TTL correctly", () => {
      const config = alertConfig();
      const hoursInSeconds = 24 * 60 * 60;

      expect(config.cache.activeAlertTtlSeconds).toBe(hoursInSeconds);
      expect(config.cache.activeAlertTtlSeconds).toBe(86400);
    });

    it("should validate duration limits are reasonable", () => {
      const config = alertConfig();

      // Min duration should be at least 1 second
      expect(config.validation.duration.min).toBeGreaterThanOrEqual(1);

      // Max duration should be reasonable (1 hour = 3600 seconds)
      expect(config.validation.duration.max).toBeLessThanOrEqual(3600);

      // Min should be less than max
      expect(config.validation.duration.min).toBeLessThan(
        config.validation.duration.max,
      );
    });

    it("should validate cooldown limits are reasonable", () => {
      const config = alertConfig();

      // Min cooldown can be 0 (no cooldown)
      expect(config.validation.cooldown.min).toBe(0);

      // Max cooldown should not exceed 24 hours
      expect(config.validation.cooldown.max).toBeLessThanOrEqual(86400);

      // Min should be less than or equal to max
      expect(config.validation.cooldown.min).toBeLessThanOrEqual(
        config.validation.cooldown.max,
      );
    });
  });

  describe("configuration invariants", () => {
    it("should maintain consistent cache prefix format", () => {
      const config = alertConfig();

      // Cooldown prefix should end with colon for Redis key consistency
      expect(config.cache.cooldownPrefix).toMatch(/:$/);

      // Active alert prefix should not have trailing colon
      expect(config.cache.activeAlertPrefix).not.toMatch(/:$/);
    });

    it("should have positive TTL values", () => {
      const config = alertConfig();

      expect(config.cache.activeAlertTtlSeconds).toBeGreaterThan(0);
    });
  });
});

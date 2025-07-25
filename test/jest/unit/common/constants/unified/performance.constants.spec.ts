/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  PERFORMANCE_CONSTANTS,
  getTimeoutFromEnv,
  calculateRetryDelay,
  isSlowResponse,
  getResponseTimeLevel,
} from "../../../../../../src/common/constants/unified/performance.constants";

describe("Performance Constants", () => {
  describe("RESPONSE_TIME_THRESHOLDS", () => {
    it("should define correct threshold values", () => {
      expect(
        PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.FAST_REQUEST_MS,
      ).toBeLessThan(
        PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.NORMAL_REQUEST_MS,
      );
      expect(
        PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.NORMAL_REQUEST_MS,
      ).toBeLessThan(
        PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.SLOW_REQUEST_MS,
      );
      expect(
        PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.SLOW_REQUEST_MS,
      ).toBeLessThan(
        PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.CRITICAL_SLOW_MS,
      );
    });

    it("should be immutable", () => {
      expect(
        Object.isFrozen(PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS),
      ).toBe(true);
      const originalValue =
        PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.FAST_REQUEST_MS;

      try {
        PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.FAST_REQUEST_MS = 200;
        // 确认值没有改变
        expect(
          PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.FAST_REQUEST_MS,
        ).toBe(originalValue);
      } catch (e) {
        // 在严格模式下抛出错误是预期的
        expect(e).toBeDefined();
      }
    });

    it("should be immutable", () => {
      expect(Object.isFrozen(PERFORMANCE_CONSTANTS.TIMEOUTS)).toBe(true);
      const originalValue = PERFORMANCE_CONSTANTS.TIMEOUTS.DEFAULT_TIMEOUT_MS;

      try {
        PERFORMANCE_CONSTANTS.TIMEOUTS.DEFAULT_TIMEOUT_MS = 60000;
        // 确认值没有改变
        expect(PERFORMANCE_CONSTANTS.TIMEOUTS.DEFAULT_TIMEOUT_MS).toBe(
          originalValue,
        );
      } catch (e) {
        // 在严格模式下抛出错误是预期的
        expect(e).toBeDefined();
      }
    });
  });

  describe("TIMEOUTS", () => {
    it("should have timeout configurations", () => {
      expect(PERFORMANCE_CONSTANTS.TIMEOUTS.DEFAULT_TIMEOUT_MS).toBe(30000);
      expect(PERFORMANCE_CONSTANTS.TIMEOUTS.QUICK_TIMEOUT_MS).toBe(5000);
      expect(PERFORMANCE_CONSTANTS.TIMEOUTS.LONG_TIMEOUT_MS).toBe(60000);
      expect(PERFORMANCE_CONSTANTS.TIMEOUTS.DATABASE_TIMEOUT_MS).toBe(10000);
      expect(PERFORMANCE_CONSTANTS.TIMEOUTS.CACHE_TIMEOUT_MS).toBe(3000);
      expect(PERFORMANCE_CONSTANTS.TIMEOUTS.HTTP_REQUEST_TIMEOUT_MS).toBe(
        15000,
      );
      expect(PERFORMANCE_CONSTANTS.TIMEOUTS.AUTHENTICATION_TIMEOUT_MS).toBe(
        5000,
      );
    });

    it("should be immutable", () => {
      expect(Object.isFrozen(PERFORMANCE_CONSTANTS.TIMEOUTS)).toBe(true);
      const originalValue = PERFORMANCE_CONSTANTS.TIMEOUTS.DEFAULT_TIMEOUT_MS;

      try {
        PERFORMANCE_CONSTANTS.TIMEOUTS.DEFAULT_TIMEOUT_MS = 60000;
        // 确认值没有改变
        expect(PERFORMANCE_CONSTANTS.TIMEOUTS.DEFAULT_TIMEOUT_MS).toBe(
          originalValue,
        );
      } catch (e) {
        // 在严格模式下抛出错误是预期的
        expect(e).toBeDefined();
      }
    });
  });

  describe("RETRY_SETTINGS", () => {
    it("should have retry configuration", () => {
      expect(PERFORMANCE_CONSTANTS.RETRY_SETTINGS.MAX_RETRY_ATTEMPTS).toBe(3);
      expect(PERFORMANCE_CONSTANTS.RETRY_SETTINGS.RETRY_DELAY_MS).toBe(1000);
      expect(
        PERFORMANCE_CONSTANTS.RETRY_SETTINGS.EXPONENTIAL_BACKOFF_BASE,
      ).toBe(2);
      expect(PERFORMANCE_CONSTANTS.RETRY_SETTINGS.MAX_RETRY_DELAY_MS).toBe(
        10000,
      );
      expect(PERFORMANCE_CONSTANTS.RETRY_SETTINGS.JITTER_FACTOR).toBe(0.1);
    });
  });

  describe("BATCH_LIMITS", () => {
    it("should have batch processing limits", () => {
      expect(PERFORMANCE_CONSTANTS.BATCH_LIMITS.MAX_BATCH_SIZE).toBe(1000);
      expect(PERFORMANCE_CONSTANTS.BATCH_LIMITS.DEFAULT_PAGE_SIZE).toBe(10);
      expect(PERFORMANCE_CONSTANTS.BATCH_LIMITS.MAX_PAGE_SIZE).toBe(100);
      expect(PERFORMANCE_CONSTANTS.BATCH_LIMITS.MAX_CONCURRENT_OPERATIONS).toBe(
        10,
      );
      expect(PERFORMANCE_CONSTANTS.BATCH_LIMITS.BULK_INSERT_SIZE).toBe(500);
      expect(PERFORMANCE_CONSTANTS.BATCH_LIMITS.BULK_UPDATE_SIZE).toBe(200);
    });
  });

  describe("MEMORY_THRESHOLDS", () => {
    it("should have memory usage thresholds", () => {
      expect(PERFORMANCE_CONSTANTS.MEMORY_THRESHOLDS.LOW_MEMORY_USAGE_MB).toBe(
        50,
      );
      expect(
        PERFORMANCE_CONSTANTS.MEMORY_THRESHOLDS.NORMAL_MEMORY_USAGE_MB,
      ).toBe(100);
      expect(PERFORMANCE_CONSTANTS.MEMORY_THRESHOLDS.HIGH_MEMORY_USAGE_MB).toBe(
        200,
      );
      expect(
        PERFORMANCE_CONSTANTS.MEMORY_THRESHOLDS.CRITICAL_MEMORY_USAGE_MB,
      ).toBe(500);
      expect(PERFORMANCE_CONSTANTS.MEMORY_THRESHOLDS.MAX_OBJECT_SIZE_MB).toBe(
        10,
      );
      expect(PERFORMANCE_CONSTANTS.MEMORY_THRESHOLDS.MAX_REQUEST_SIZE_MB).toBe(
        50,
      );
    });
  });

  describe("CONNECTION_POOLS", () => {
    it("should have connection pool configurations", () => {
      expect(PERFORMANCE_CONSTANTS.CONNECTION_POOLS.MIN_POOL_SIZE).toBe(5);
      expect(PERFORMANCE_CONSTANTS.CONNECTION_POOLS.MAX_POOL_SIZE).toBe(20);
      expect(PERFORMANCE_CONSTANTS.CONNECTION_POOLS.IDLE_TIMEOUT_MS).toBe(
        300000,
      );
      expect(PERFORMANCE_CONSTANTS.CONNECTION_POOLS.CONNECTION_TIMEOUT_MS).toBe(
        5000,
      );
      expect(PERFORMANCE_CONSTANTS.CONNECTION_POOLS.ACQUIRE_TIMEOUT_MS).toBe(
        10000,
      );
    });
  });

  describe("MONITORING", () => {
    it("should have monitoring configurations", () => {
      expect(
        PERFORMANCE_CONSTANTS.MONITORING.METRICS_COLLECTION_INTERVAL_MS,
      ).toBe(10000);
      expect(PERFORMANCE_CONSTANTS.MONITORING.HEALTH_CHECK_INTERVAL_MS).toBe(
        30000,
      );
      expect(PERFORMANCE_CONSTANTS.MONITORING.SAMPLE_RATE).toBe(0.1);
      expect(PERFORMANCE_CONSTANTS.MONITORING.ERROR_SAMPLE_RATE).toBe(1.0);
      expect(PERFORMANCE_CONSTANTS.MONITORING.SLOW_REQUEST_SAMPLE_RATE).toBe(
        1.0,
      );
    });
  });
});

describe("getTimeoutFromEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should return timeout from environment variable", () => {
    process.env.TIMEOUT_DEFAULT_TIMEOUT = "60000";
    const timeout = getTimeoutFromEnv("DEFAULT_TIMEOUT_MS");
    expect(timeout).toBe(60000);
  });

  it("should handle environment variable without _MS suffix", () => {
    process.env.TIMEOUT_CACHE_TIMEOUT = "5000";
    const timeout = getTimeoutFromEnv("CACHE_TIMEOUT_MS");
    expect(timeout).toBe(5000);
  });

  it("should return default value from constants when env var not set", () => {
    delete process.env.TIMEOUT_QUICK_TIMEOUT;
    const timeout = getTimeoutFromEnv("QUICK_TIMEOUT_MS");
    expect(timeout).toBe(PERFORMANCE_CONSTANTS.TIMEOUTS.QUICK_TIMEOUT_MS);
  });

  it("should return provided default value when env var not set", () => {
    delete process.env.TIMEOUT_DATABASE_TIMEOUT;
    const timeout = getTimeoutFromEnv("DATABASE_TIMEOUT_MS", 15000);
    expect(timeout).toBe(15000);
  });

  it("should return default from constants when env var is invalid", () => {
    process.env.TIMEOUT_LONG_TIMEOUT = "invalid";
    const timeout = getTimeoutFromEnv("LONG_TIMEOUT_MS");
    expect(timeout).toBe(PERFORMANCE_CONSTANTS.TIMEOUTS.LONG_TIMEOUT_MS);
  });

  it("should handle zero value from environment", () => {
    process.env.TIMEOUT_HTTP_REQUEST_TIMEOUT = "0";
    const timeout = getTimeoutFromEnv("HTTP_REQUEST_TIMEOUT_MS");
    expect(timeout).toBe(0);
  });
});

describe("calculateRetryDelay", () => {
  beforeEach(() => {
    // Mock Math.random to return consistent value for testing
    jest.spyOn(Math, "random").mockReturnValue(0.5);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should calculate delay for first attempt (attempt 0)", () => {
    const delay = calculateRetryDelay(0);
    // Base delay: 1000 * 2^0 = 1000
    // Jitter: 1000 * 0.1 * 0.5 = 50
    // Total: 1000 + 50 = 1050
    expect(delay).toBe(1050);
  });

  it("should calculate delay for second attempt (attempt 1)", () => {
    const delay = calculateRetryDelay(1);
    // Base delay: 1000 * 2^1 = 2000
    // Jitter: 2000 * 0.1 * 0.5 = 100
    // Total: 2000 + 100 = 2100
    expect(delay).toBe(2100);
  });

  it("should calculate delay for third attempt (attempt 2)", () => {
    const delay = calculateRetryDelay(2);
    // Base delay: 1000 * 2^2 = 4000
    // Jitter: 4000 * 0.1 * 0.5 = 200
    // Total: 4000 + 200 = 4200
    expect(delay).toBe(4200);
  });

  it("should cap delay at maximum retry delay", () => {
    const delay = calculateRetryDelay(10); // Large attempt number
    expect(delay).toBeLessThanOrEqual(
      PERFORMANCE_CONSTANTS.RETRY_SETTINGS.MAX_RETRY_DELAY_MS,
    );
  });

  it("should handle attempt 0", () => {
    const delay = calculateRetryDelay(0);
    expect(delay).toBeGreaterThan(0);
    expect(delay).toBeLessThanOrEqual(
      PERFORMANCE_CONSTANTS.RETRY_SETTINGS.MAX_RETRY_DELAY_MS,
    );
  });

  it("should include jitter variation", () => {
    // Test with different random values
    jest.spyOn(Math, "random").mockReturnValue(0.1);
    const delay1 = calculateRetryDelay(1);

    jest.spyOn(Math, "random").mockReturnValue(0.9);
    const delay2 = calculateRetryDelay(1);

    expect(delay1).not.toBe(delay2);
    expect(delay1).toBeLessThan(delay2);
  });
});

describe("isSlowResponse", () => {
  it("should return true for slow response with default threshold", () => {
    const result = isSlowResponse(1500);
    expect(result).toBe(true);
  });

  it("should return false for fast response with default threshold", () => {
    const result = isSlowResponse(500);
    expect(result).toBe(false);
  });

  it("should use specified threshold", () => {
    const result = isSlowResponse(200, "FAST_REQUEST_MS");
    // 根据源码中isSlowResponse的实现，当responseTime > threshold时才返回true
    // FAST_REQUEST_MS为100，200 > 100，所以应该返回true
    expect(result).toBe(true);
  });

  it("should return false when response time equals threshold", () => {
    const threshold =
      PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.SLOW_REQUEST_MS;
    const result = isSlowResponse(threshold);
    expect(result).toBe(false);
  });

  it("should work with different threshold types", () => {
    expect(isSlowResponse(50, "FAST_REQUEST_MS")).toBe(false);
    expect(isSlowResponse(150, "FAST_REQUEST_MS")).toBe(true);
    expect(isSlowResponse(600, "NORMAL_REQUEST_MS")).toBe(true);
    expect(isSlowResponse(400, "NORMAL_REQUEST_MS")).toBe(false);
  });
});

describe("getResponseTimeLevel", () => {
  it('should return "fast" for very quick responses', () => {
    const level = getResponseTimeLevel(50);
    expect(level).toBe("fast");
  });

  it('should return "fast" for responses at fast threshold', () => {
    const level = getResponseTimeLevel(
      PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.FAST_REQUEST_MS,
    );
    expect(level).toBe("fast");
  });

  it('should return "normal" for responses between fast and normal thresholds', () => {
    const level = getResponseTimeLevel(300);
    expect(level).toBe("normal");
  });

  it('should return "normal" for responses at normal threshold', () => {
    const level = getResponseTimeLevel(
      PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.NORMAL_REQUEST_MS,
    );
    expect(level).toBe("normal");
  });

  it('should return "slow" for responses between normal and slow thresholds', () => {
    const level = getResponseTimeLevel(800);
    expect(level).toBe("slow");
  });

  it('should return "slow" for responses at slow threshold', () => {
    const level = getResponseTimeLevel(
      PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.SLOW_REQUEST_MS,
    );
    expect(level).toBe("slow");
  });

  it('should return "critical" for very slow responses', () => {
    const level = getResponseTimeLevel(6000);
    expect(level).toBe("critical");
  });

  it("should handle zero response time", () => {
    const level = getResponseTimeLevel(0);
    expect(level).toBe("fast");
  });

  it("should handle boundary values correctly", () => {
    const { FAST_REQUEST_MS, NORMAL_REQUEST_MS, SLOW_REQUEST_MS } =
      PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS;

    expect(getResponseTimeLevel(FAST_REQUEST_MS + 1)).toBe("normal");
    expect(getResponseTimeLevel(NORMAL_REQUEST_MS + 1)).toBe("slow");
    expect(getResponseTimeLevel(SLOW_REQUEST_MS + 1)).toBe("critical");
  });
});

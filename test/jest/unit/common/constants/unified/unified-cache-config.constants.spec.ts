/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  CACHE_CONSTANTS,
  buildCacheKey,
  parseCacheKey,
  getTTLFromEnv,
  getRecommendedTTL,
  shouldCompress,
} from "../../../../../../src/common/constants/unified/unified-cache-config.constants";

describe("Cache Constants", () => {
  describe("TTL_SETTINGS", () => {
    it("should have all required TTL settings", () => {
      expect(CACHE_CONSTANTS.TTL_SETTINGS.DEFAULT_TTL).toBe(3600);
      expect(CACHE_CONSTANTS.TTL_SETTINGS.SHORT_TTL).toBe(300);
      expect(CACHE_CONSTANTS.TTL_SETTINGS.LONG_TTL).toBe(7200);
      expect(CACHE_CONSTANTS.TTL_SETTINGS.REALTIME_DATA_TTL).toBe(5);
      expect(CACHE_CONSTANTS.TTL_SETTINGS.AUTH_TOKEN_TTL).toBe(1800);
    });

    it("should be immutable", () => {
      expect(Object.isFrozen(CACHE_CONSTANTS.TTL_SETTINGS)).toBe(true);
      const originalValue = CACHE_CONSTANTS.TTL_SETTINGS.DEFAULT_TTL;
      
      try {
        CACHE_CONSTANTS.TTL_SETTINGS.DEFAULT_TTL = 1000;
        // 确认值没有改变
        expect(CACHE_CONSTANTS.TTL_SETTINGS.DEFAULT_TTL).toBe(originalValue);
      } catch (e) {
        // 在严格模式下抛出错误是预期的
        expect(e).toBeDefined();
      }
    });

    it("should be immutable for key prefixes", () => {
      expect(Object.isFrozen(CACHE_CONSTANTS.KEY_PREFIXES)).toBe(true);
      const originalValue = CACHE_CONSTANTS.KEY_PREFIXES.AUTH;
      
      try {
        CACHE_CONSTANTS.KEY_PREFIXES.AUTH = "changed:";
        // 确认值没有改变
        expect(CACHE_CONSTANTS.KEY_PREFIXES.AUTH).toBe(originalValue);
      } catch (e) {
        // 在严格模式下抛出错误是预期的
        expect(e).toBeDefined();
      }
    });
  });

  describe("KEY_PREFIXES", () => {
    it("should have all required key prefixes", () => {
      expect(CACHE_CONSTANTS.KEY_PREFIXES.QUERY).toBe("query:");
      expect(CACHE_CONSTANTS.KEY_PREFIXES.AUTH).toBe("auth:");
      expect(CACHE_CONSTANTS.KEY_PREFIXES.METRICS).toBe("metrics:");
    });

    it("should be immutable for key prefixes", () => {
      expect(() => {
        // @ts-expect-error Testing immutability
        CACHE_CONSTANTS.KEY_PREFIXES.USER = "changed:";
      }).toThrow();
    });
  });

  describe("SIZE_LIMITS", () => {
    it("should have all size limit configurations", () => {
      expect(CACHE_CONSTANTS.SIZE_LIMITS.MAX_CACHE_SIZE).toBe(1000);
      expect(CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH).toBe(255);
      expect(CACHE_CONSTANTS.SIZE_LIMITS.COMPRESSION_THRESHOLD_KB).toBe(10);
    });
  });

  describe("REDIS_CONFIG", () => {
    it("should have Redis connection configurations", () => {
      expect(CACHE_CONSTANTS.REDIS_CONFIG.MAX_RETRIES).toBe(3);
      expect(CACHE_CONSTANTS.REDIS_CONFIG.CONNECTION_TIMEOUT_MS).toBe(5000);
    });
  });

  describe("STRATEGY_CONFIG", () => {
    it("should have cache strategy configurations", () => {
      expect(CACHE_CONSTANTS.STRATEGY_CONFIG.EVICTION_POLICY).toBe(
        "allkeys-lru",
      );
      expect(CACHE_CONSTANTS.STRATEGY_CONFIG.ENABLE_COMPRESSION).toBe(true);
    });
  });

  describe("MONITORING_CONFIG", () => {
    it("should have monitoring configurations", () => {
      expect(CACHE_CONSTANTS.MONITORING_CONFIG.ENABLE_METRICS).toBe(true);
      expect(CACHE_CONSTANTS.MONITORING_CONFIG.ALERT_THRESHOLD_PERCENT).toBe(
        90,
      );
    });
  });
});

describe("buildCacheKey", () => {
  it("should build cache key without suffix", () => {
    const key = buildCacheKey("QUERY", "user123");
    expect(key).toBe("query:user123");
  });

  it("should build cache key with suffix", () => {
    const key = buildCacheKey("AUTH", "token456", "metadata");
    expect(key).toBe("auth:token456:metadata");
  });

  it("should handle different prefix types", () => {
    expect(buildCacheKey("STORAGE", "data")).toBe("storage:data");
    expect(buildCacheKey("METRICS", "performance")).toBe("metrics:performance");
    expect(buildCacheKey("ALERT", "rule", "config")).toBe("alert:rule:config");
  });
});

describe("parseCacheKey", () => {
  it("should parse cache key without suffix", () => {
    const result = parseCacheKey("query:user123");
    expect(result).toEqual({
      prefix: "query:",
      identifier: "user123",
      suffix: undefined,
    });
  });

  it("should parse cache key with suffix", () => {
    const result = parseCacheKey("auth:token456:metadata");
    expect(result).toEqual({
      prefix: "auth:",
      identifier: "token456",
      suffix: "metadata",
    });
  });

  it("should parse cache key with multiple suffix parts", () => {
    const result = parseCacheKey("metrics:performance:cpu:usage");
    expect(result).toEqual({
      prefix: "metrics:",
      identifier: "performance",
      suffix: "cpu:usage",
    });
  });

  it("should return null for invalid cache key", () => {
    const result = parseCacheKey("invalid_key");
    expect(result).toBeNull();
  });

  it("should return null for empty cache key", () => {
    const result = parseCacheKey("");
    expect(result).toBeNull();
  });
});

describe("getTTLFromEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should return TTL from environment variable", () => {
    process.env.CACHE_TTL_DEFAULT_TTL = "7200";
    const ttl = getTTLFromEnv("DEFAULT_TTL");
    expect(ttl).toBe(7200);
  });

  it("should return default value from constants when env var not set", () => {
    delete process.env.CACHE_TTL_DEFAULT_TTL;
    const ttl = getTTLFromEnv("DEFAULT_TTL");
    expect(ttl).toBe(CACHE_CONSTANTS.TTL_SETTINGS.DEFAULT_TTL);
  });

  it("should return provided default value when env var not set", () => {
    delete process.env.CACHE_TTL_SHORT_TTL;
    const ttl = getTTLFromEnv("SHORT_TTL", 600);
    expect(ttl).toBe(600);
  });

  it("should return default from constants when env var is invalid", () => {
    process.env.CACHE_TTL_MEDIUM_TTL = "invalid";
    const ttl = getTTLFromEnv("MEDIUM_TTL");
    expect(ttl).toBe(CACHE_CONSTANTS.TTL_SETTINGS.MEDIUM_TTL);
  });

  it("should handle zero value from environment", () => {
    process.env.CACHE_TTL_REALTIME_DATA_TTL = "0";
    const ttl = getTTLFromEnv("REALTIME_DATA_TTL");
    expect(ttl).toBe(0);
  });
});

describe("getRecommendedTTL", () => {
  it("should return correct TTL for realtime data", () => {
    const ttl = getRecommendedTTL("realtime");
    expect(ttl).toBe(CACHE_CONSTANTS.TTL_SETTINGS.REALTIME_DATA_TTL);
  });

  it("should return correct TTL for static data", () => {
    const ttl = getRecommendedTTL("static");
    expect(ttl).toBe(CACHE_CONSTANTS.TTL_SETTINGS.BASIC_INFO_TTL);
  });

  it("should return correct TTL for config data", () => {
    const ttl = getRecommendedTTL("config");
    expect(ttl).toBe(CACHE_CONSTANTS.TTL_SETTINGS.MAPPING_CONFIG_TTL);
  });

  it("should return correct TTL for session data", () => {
    const ttl = getRecommendedTTL("session");
    expect(ttl).toBe(CACHE_CONSTANTS.TTL_SETTINGS.SESSION_TTL);
  });

  it("should return correct TTL for metrics data", () => {
    const ttl = getRecommendedTTL("metrics");
    expect(ttl).toBe(CACHE_CONSTANTS.TTL_SETTINGS.METRICS_TTL);
  });

  it("should return default TTL for unknown data type", () => {
    // @ts-expect-error - Testing runtime behavior
    const ttl = getRecommendedTTL("unknown");
    expect(ttl).toBe(CACHE_CONSTANTS.TTL_SETTINGS.DEFAULT_TTL);
  });
});

describe("shouldCompress", () => {
  it("should return true when size exceeds threshold and compression enabled", () => {
    const threshold =
      CACHE_CONSTANTS.SIZE_LIMITS.COMPRESSION_THRESHOLD_KB * 1024;
    const result = shouldCompress(threshold + 1);
    expect(result).toBe(true);
  });

  it("should return false when size is below threshold", () => {
    const threshold =
      CACHE_CONSTANTS.SIZE_LIMITS.COMPRESSION_THRESHOLD_KB * 1024;
    const result = shouldCompress(threshold - 1);
    expect(result).toBe(false);
  });

  it("should return false when size equals threshold", () => {
    const threshold =
      CACHE_CONSTANTS.SIZE_LIMITS.COMPRESSION_THRESHOLD_KB * 1024;
    const result = shouldCompress(threshold);
    expect(result).toBe(false);
  });

  it("should handle zero size", () => {
    const result = shouldCompress(0);
    expect(result).toBe(false);
  });

  it("should handle very large sizes", () => {
    const largeSize = 100 * 1024 * 1024; // 100MB
    const result = shouldCompress(largeSize);
    expect(result).toBe(true);
  });
});

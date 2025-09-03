import {
  CACHE_KEYS,
  CACHE_TTL,
  CACHE_CONSTANTS,
} from "../../../../../src/cache/constants/cache.constants";

describe("Cache Constants", () => {
  describe("CACHE_KEYS", () => {
    it("should define all cache key prefixes", () => {
      expect(CACHE_KEYS.STOCK_QUOTE).toBe("stock:quote:");
      expect(CACHE_KEYS.STOCK_BASIC_INFO).toBe("stock:basic:");
      expect(CACHE_KEYS.INDEX_QUOTE).toBe("index:quote:");
      expect(CACHE_KEYS.MARKET_STATUS).toBe("market:status:");
      expect(CACHE_KEYS.SYMBOL_MAPPING).toBe("symbol:mapping:");
      expect(CACHE_KEYS.DATA_MAPPING).toBe("data:mapping:");
    });

    it("should have consistent naming convention", () => {
      const keys = Object.values(CACHE_KEYS);

      keys.forEach((key) => {
        // 支持两种格式：prefix: 或 category:type:
        expect(key).toMatch(/^[a-z_]+:([a-z_]+:)?$/);
        expect(key.endsWith(":")).toBe(true);
      });
    });

    it("should be readonly object", () => {
      expect(() => {
        (CACHE_KEYS as any).NEWKEY = "new:key:";
      }).toThrow();
    });

    it("should have all required cache key types", () => {
      const expectedKeys = [
        "STOCK_QUOTE",
        "STOCK_BASIC_INFO",
        "INDEX_QUOTE",
        "MARKET_STATUS",
        "SYMBOL_MAPPING",
        "DATA_MAPPING",
      ];

      expectedKeys.forEach((key) => {
        expect(CACHE_KEYS).toHaveProperty(key);
        expect(typeof CACHE_KEYS[key]).toBe("string");
      });
    });

    it("should not have duplicate values", () => {
      const values = Object.values(CACHE_KEYS);
      const uniqueValues = [...new Set(values)];
      expect(values).toHaveLength(uniqueValues.length);
    });
  });

  describe("CACHE_TTL", () => {
    it("should define all TTL values in seconds", () => {
      expect(CACHE_TTL.REALTIME_DATA).toBe(5);
      expect(CACHE_TTL.BASIC_INFO).toBe(3600);
      expect(CACHE_TTL.MARKET_STATUS).toBe(60);
      expect(CACHE_TTL.MAPPING_RULES).toBe(1800);
    });

    it("should have reasonable TTL values", () => {
      expect(CACHE_TTL.REALTIME_DATA).toBeGreaterThan(0);
      expect(CACHE_TTL.REALTIME_DATA).toBeLessThan(60); // Real-time should be very short

      expect(CACHE_TTL.BASIC_INFO).toBeGreaterThan(CACHE_TTL.MAPPING_RULES);
      expect(CACHE_TTL.MAPPING_RULES).toBeGreaterThan(CACHE_TTL.MARKET_STATUS);
      expect(CACHE_TTL.MARKET_STATUS).toBeGreaterThan(CACHE_TTL.REALTIME_DATA);
    });

    it("should be readonly object", () => {
      expect(() => {
        (CACHE_TTL as any).NEW_TTL = 123;
      }).toThrow();
    });

    it("should have all numeric values", () => {
      Object.values(CACHE_TTL).forEach((ttl) => {
        expect(typeof ttl).toBe("number");
        expect(ttl).toBeGreaterThan(0);
        expect(Number.isInteger(ttl)).toBe(true);
      });
    });

    it("should match expected TTL categories", () => {
      const expectedTTLs = [
        "REALTIME_DATA",
        "BASIC_INFO",
        "MARKET_STATUS",
        "MAPPING_RULES",
      ];

      expectedTTLs.forEach((ttl) => {
        expect(CACHE_TTL).toHaveProperty(ttl);
        expect(typeof CACHE_TTL[ttl]).toBe("number");
      });
    });

    it("should be ordered from shortest to longest TTL", () => {
      const values = [
        CACHE_TTL.REALTIME_DATA,
        CACHE_TTL.MARKET_STATUS,
        CACHE_TTL.MAPPING_RULES,
        CACHE_TTL.BASIC_INFO,
      ];

      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });

  describe("Cache key generation patterns", () => {
    it("should support key concatenation for stock quotes", () => {
      const symbol = "700.HK";
      const fullKey = `${CACHE_KEYS.STOCK_QUOTE}${symbol}`;
      expect(fullKey).toBe("stock:quote:700.HK");
    });

    it("should support key concatenation for basic info", () => {
      const symbol = "AAPL.US";
      const fullKey = `${CACHE_KEYS.STOCK_BASIC_INFO}${symbol}`;
      expect(fullKey).toBe("stock:basic:AAPL.US");
    });

    it("should support key concatenation for index quotes", () => {
      const index = "HSI.HK";
      const fullKey = `${CACHE_KEYS.INDEX_QUOTE}${index}`;
      expect(fullKey).toBe("index:quote:HSI.HK");
    });

    it("should support key concatenation for symbol mappings", () => {
      const provider = "longport";
      const symbol = "700.HK";
      const fullKey = `${CACHE_KEYS.SYMBOL_MAPPING}${provider}:${symbol}`;
      expect(fullKey).toBe("symbol:mapping:longport:700.HK");
    });
  });

  describe("Integration with cache operations", () => {
    it("should work with Redis SET operations", () => {
      const key = `${CACHE_KEYS.STOCK_QUOTE}700.HK`;
      const ttl = CACHE_TTL.REALTIME_DATA;

      // Simulate Redis operation
      const redisCommand = {
        key,
        ttl,
        operation: "SETEX",
      };

      expect(redisCommand.key).toMatch(/^stock:quote:/);
      expect(redisCommand.ttl).toBe(5);
      expect(redisCommand.operation).toBe("SETEX");
    });

    it("should work with cache cleanup operations", () => {
      const patterns = Object.values(CACHE_KEYS).map((prefix) => `${prefix}*`);

      expect(patterns).toContain("stock:quote:*");
      expect(patterns).toContain("stock:basic:*");
      expect(patterns).toContain("index:quote:*");
      expect(patterns).toContain("market:status:*");
      expect(patterns).toContain("symbol:mapping:*");
      expect(patterns).toContain("data:mapping:*");
    });
  });

  describe("CACHE_CONFIG", () => {
    it("should have correct configuration values", () => {
      expect(CACHE_CONSTANTS.SIZE_LIMITS.COMPRESSION_THRESHOLD_KB).toBe(10);
      expect(CACHE_CONSTANTS.STRATEGY_CONFIG.ENABLE_COMPRESSION).toBe(true);
    });

    it("should define performance thresholds", () => {
      expect(CACHE_CONSTANTS.MONITORING_CONFIG.SLOW_OPERATION_MS).toBe(100);
    });
  });
});

import {
  STORAGE_ERROR_MESSAGES,
  STORAGE_WARNING_MESSAGES,
  STORAGE_CONFIG,
  STORAGE_PERFORMANCE_THRESHOLDS,
  STORAGE_METRICS,
  STORAGE_OPERATIONS,
  STORAGE_SOURCES,
  STORAGE_STATUS,
  STORAGE_DEFAULTS,
  STORAGE_KEY_PATTERNS,
} from "../../../../../src/core/storage/constants/storage.constants";

describe("Storage Constants", () => {
  describe("STORAGE_ERROR_MESSAGES", () => {
    it("should define all error messages", () => {
      expect(STORAGE_ERROR_MESSAGES.STORAGE_FAILED).toBe("存储失败");
      expect(STORAGE_ERROR_MESSAGES.RETRIEVAL_FAILED).toBe("数据检索失败");
      expect(STORAGE_ERROR_MESSAGES.DATA_NOT_FOUND).toBe("数据未找到");
      expect(STORAGE_ERROR_MESSAGES.REDIS_NOT_AVAILABLE).toBe(
        "Redis连接不可用",
      );
      expect(STORAGE_ERROR_MESSAGES.COMPRESSION_FAILED).toBe("数据压缩失败");
      expect(STORAGE_ERROR_MESSAGES.DECOMPRESSION_FAILED).toBe("数据解压失败");
      expect(STORAGE_ERROR_MESSAGES.SERIALIZATION_FAILED).toBe(
        "数据序列化失败",
      );
      expect(STORAGE_ERROR_MESSAGES.DESERIALIZATION_FAILED).toBe(
        "数据反序列化失败",
      );
      expect(STORAGE_ERROR_MESSAGES.CACHE_UPDATE_FAILED).toBe("缓存更新失败");
      expect(STORAGE_ERROR_MESSAGES.PERSISTENT_STORAGE_FAILED).toBe(
        "持久化存储失败",
      );
      expect(STORAGE_ERROR_MESSAGES.DELETE_FAILED).toBe("删除失败");
      expect(STORAGE_ERROR_MESSAGES.STATS_GENERATION_FAILED).toBe(
        "统计信息生成失败",
      );
      expect(STORAGE_ERROR_MESSAGES.INVALID_STORAGE_TYPE).toBe(
        "无效的存储类型",
      );
      // expect(STORAGE_ERROR_MESSAGES.INVALID_DATA_CATEGORY).toBe('无效的数据类别');
      expect(STORAGE_ERROR_MESSAGES.KEY_GENERATION_FAILED).toBe("键生成失败");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(STORAGE_ERROR_MESSAGES)).toBe(true);
    });

    it("should use Chinese messages", () => {
      const messages = Object.values(STORAGE_ERROR_MESSAGES);
      messages.forEach((message) => {
        expect(message).toMatch(/[\u4e00-\u9fa5]/); // Contains Chinese characters
      });
    });
  });

  describe("STORAGE_WARNING_MESSAGES", () => {
    it("should define all warning messages", () => {
      expect(STORAGE_WARNING_MESSAGES.REDIS_CONNECTION_UNAVAILABLE).toBe(
        "Redis连接不可用",
      );
      expect(STORAGE_WARNING_MESSAGES.COMPRESSION_SKIPPED).toBe("跳过数据压缩");
      expect(STORAGE_WARNING_MESSAGES.CACHE_MISS).toBe("缓存未命中");
      expect(STORAGE_WARNING_MESSAGES.PERSISTENT_FALLBACK).toBe(
        "回退到持久化存储",
      );
      expect(STORAGE_WARNING_MESSAGES.LARGE_DATA_SIZE).toBe("数据大小较大");
      expect(STORAGE_WARNING_MESSAGES.HIGH_MEMORY_USAGE).toBe("内存使用率较高");
      expect(STORAGE_WARNING_MESSAGES.SLOW_OPERATION).toBe("操作响应较慢");
      expect(STORAGE_WARNING_MESSAGES.TTL_CALCULATION_FAILED).toBe(
        "TTL计算失败",
      );
      expect(STORAGE_WARNING_MESSAGES.METADATA_PARSING_FAILED).toBe(
        "元数据解析失败",
      );
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(STORAGE_WARNING_MESSAGES)).toBe(true);
    });
  });

  describe("STORAGE_CONFIG", () => {
    it("should define all configuration values", () => {
      expect(STORAGE_CONFIG.DEFAULT_CACHE_TTL).toBe(3600);
      expect(STORAGE_CONFIG.DEFAULT_COMPRESSION_THRESHOLD).toBe(1024);
      expect(STORAGE_CONFIG.DEFAULT_COMPRESSION_RATIO).toBe(0.8);
      expect(STORAGE_CONFIG.MAX_KEY_LENGTH).toBe(250);
      expect(STORAGE_CONFIG.MAX_DATA_SIZE_MB).toBe(16);
      expect(STORAGE_CONFIG.MAX_BATCH_SIZE).toBe(1000);
      expect(STORAGE_CONFIG.DEFAULT_RETRY_ATTEMPTS).toBe(3);
      expect(STORAGE_CONFIG.DEFAULT_TIMEOUT_MS).toBe(30000);
      expect(STORAGE_CONFIG.STATS_SAMPLE_SIZE).toBe(100);
    });

    it("should have reasonable configuration values", () => {
      expect(STORAGE_CONFIG.DEFAULT_CACHE_TTL).toBeGreaterThan(0);
      expect(STORAGE_CONFIG.DEFAULT_COMPRESSION_THRESHOLD).toBeGreaterThan(0);
      expect(STORAGE_CONFIG.DEFAULT_COMPRESSION_RATIO).toBeGreaterThan(0);
      expect(STORAGE_CONFIG.DEFAULT_COMPRESSION_RATIO).toBeLessThan(1);
      expect(STORAGE_CONFIG.MAX_KEY_LENGTH).toBeGreaterThan(0);
      expect(STORAGE_CONFIG.MAX_DATA_SIZE_MB).toBeGreaterThan(0);
      expect(STORAGE_CONFIG.MAX_BATCH_SIZE).toBeGreaterThan(0);
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(STORAGE_CONFIG)).toBe(true);
    });
  });

  describe("STORAGE_PERFORMANCE_THRESHOLDS", () => {
    it("should define all performance thresholds", () => {
      expect(STORAGE_PERFORMANCE_THRESHOLDS.SLOW_STORAGE_MS).toBe(1000);
      expect(STORAGE_PERFORMANCE_THRESHOLDS.SLOW_RETRIEVAL_MS).toBe(500);
      expect(STORAGE_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE).toBe(0.05);
      expect(STORAGE_PERFORMANCE_THRESHOLDS.LOW_CACHE_HIT_RATE).toBe(0.7);
      expect(STORAGE_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE_MB).toBe(1024);
      expect(STORAGE_PERFORMANCE_THRESHOLDS.LARGE_DATA_SIZE_KB).toBe(100);
    });

    it("should have reasonable threshold values", () => {
      expect(STORAGE_PERFORMANCE_THRESHOLDS.SLOW_STORAGE_MS).toBeGreaterThan(0);
      expect(STORAGE_PERFORMANCE_THRESHOLDS.SLOW_RETRIEVAL_MS).toBeGreaterThan(
        0,
      );
      expect(STORAGE_PERFORMANCE_THRESHOLDS.HIGH_ERROR_RATE).toBeLessThan(1);
      expect(STORAGE_PERFORMANCE_THRESHOLDS.LOW_CACHE_HIT_RATE).toBeLessThan(1);
      expect(
        STORAGE_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE_MB,
      ).toBeGreaterThan(0);
      expect(STORAGE_PERFORMANCE_THRESHOLDS.LARGE_DATA_SIZE_KB).toBeGreaterThan(
        0,
      );
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(STORAGE_PERFORMANCE_THRESHOLDS)).toBe(true);
    });
  });

  describe("STORAGE_METRICS", () => {
    it("should define all metric names", () => {
      expect(STORAGE_METRICS.STORAGE_OPERATIONS_TOTAL).toBe(
        "storage_operations_total",
      );
      expect(STORAGE_METRICS.STORAGE_DURATION).toBe("storage_duration");
      expect(STORAGE_METRICS.RETRIEVAL_DURATION).toBe("retrieval_duration");
      expect(STORAGE_METRICS.CACHE_HIT_RATE).toBe("cache_hit_rate");
      expect(STORAGE_METRICS.CACHE_MISS_RATE).toBe("cache_miss_rate");
      expect(STORAGE_METRICS.COMPRESSION_RATIO).toBe("compression_ratio");
      expect(STORAGE_METRICS.DATA_SIZE_BYTES).toBe("data_size_bytes");
      expect(STORAGE_METRICS.ERROR_RATE).toBe("error_rate");
      expect(STORAGE_METRICS.OPERATIONS_PER_SECOND).toBe(
        "operations_per_second",
      );
      expect(STORAGE_METRICS.MEMORY_USAGE_BYTES).toBe("memory_usage_bytes");
      expect(STORAGE_METRICS.TTL_REMAINING).toBe("ttl_remaining");
      expect(STORAGE_METRICS.PERSISTENT_STORAGE_SIZE).toBe(
        "persistent_storage_size",
      );
    });

    it("should use snake_case naming convention", () => {
      const metrics = Object.values(STORAGE_METRICS);
      metrics.forEach((metric) => {
        expect(metric).toMatch(/^[a-z_]+$/);
        expect(metric).not.toContain(" ");
        expect(metric).not.toContain("-");
      });
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(STORAGE_METRICS)).toBe(true);
    });
  });

  describe("STORAGE_OPERATIONS", () => {
    it("should define all operation types", () => {
      expect(STORAGE_OPERATIONS.STORE).toBe("store");
      expect(STORAGE_OPERATIONS.RETRIEVE).toBe("retrieve");
      expect(STORAGE_OPERATIONS.DELETE).toBe("delete");
      expect(STORAGE_OPERATIONS.UPDATE).toBe("update");
      expect(STORAGE_OPERATIONS.COMPRESS).toBe("compress");
      expect(STORAGE_OPERATIONS.DECOMPRESS).toBe("decompress");
      expect(STORAGE_OPERATIONS.SERIALIZE).toBe("serialize");
      expect(STORAGE_OPERATIONS.DESERIALIZE).toBe("deserialize");
      expect(STORAGE_OPERATIONS.CACHE_UPDATE).toBe("cache_update");
      expect(STORAGE_OPERATIONS.STATS_GENERATION).toBe("stats_generation");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(STORAGE_OPERATIONS)).toBe(true);
    });
  });

  describe("STORAGE_SOURCES", () => {
    it("should define all source types", () => {
      expect(STORAGE_SOURCES.CACHE).toBe("cache");
      expect(STORAGE_SOURCES.PERSISTENT).toBe("persistent");
      expect(STORAGE_SOURCES.NOT_FOUND).toBe("not_found");
      expect(STORAGE_SOURCES.BOTH).toBe("both");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(STORAGE_SOURCES)).toBe(true);
    });
  });

  describe("STORAGE_STATUS", () => {
    it("should define all status values", () => {
      expect(STORAGE_STATUS.SUCCESS).toBe("success");
      expect(STORAGE_STATUS.FAILED).toBe("failed");
      expect(STORAGE_STATUS.PARTIAL_SUCCESS).toBe("partial_success");
      expect(STORAGE_STATUS.TIMEOUT).toBe("timeout");
      expect(STORAGE_STATUS.CANCELLED).toBe("cancelled");
      expect(STORAGE_STATUS.PENDING).toBe("pending");
      expect(STORAGE_STATUS.PROCESSING).toBe("processing");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(STORAGE_STATUS)).toBe(true);
    });
  });

  describe("STORAGE_DEFAULTS", () => {
    it("should define all default values", () => {
      expect(STORAGE_DEFAULTS.PROVIDER).toBe("unknown");
      expect(STORAGE_DEFAULTS.MARKET).toBe("unknown");
      expect(STORAGE_DEFAULTS.DATA_SIZE).toBe(0);
      expect(STORAGE_DEFAULTS.PROCESSING_TIME).toBe(0);
      expect(STORAGE_DEFAULTS.COMPRESSED).toBe(false);
      expect(STORAGE_DEFAULTS.TTL).toBe(3600);
      expect(STORAGE_DEFAULTS.CACHE_HIT_RATE).toBe(0.85);
      expect(STORAGE_DEFAULTS.OPERATIONS_PER_SECOND).toBe(0);
      expect(STORAGE_DEFAULTS.ERROR_RATE).toBe(0);
      expect(STORAGE_DEFAULTS.MEMORY_USAGE).toBe(0);
    });

    it("should have reasonable default values", () => {
      expect(STORAGE_DEFAULTS.TTL).toBeGreaterThan(0);
      expect(STORAGE_DEFAULTS.CACHE_HIT_RATE).toBeGreaterThan(0);
      expect(STORAGE_DEFAULTS.CACHE_HIT_RATE).toBeLessThan(1);
      expect(typeof STORAGE_DEFAULTS.COMPRESSED).toBe("boolean");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(STORAGE_DEFAULTS)).toBe(true);
    });
  });

  describe("STORAGE_KEY_PATTERNS", () => {
    it("should define all key patterns", () => {
      expect(STORAGE_KEY_PATTERNS.CACHE_KEY_SEPARATOR).toBe(":");
      expect(STORAGE_KEY_PATTERNS.METADATA_SUFFIX).toBe(":meta");
      expect(STORAGE_KEY_PATTERNS.STATS_PREFIX).toBe("stats:");
      expect(STORAGE_KEY_PATTERNS.TEMP_PREFIX).toBe("temp:");
      expect(STORAGE_KEY_PATTERNS.BACKUP_PREFIX).toBe("backup:");
      expect(STORAGE_KEY_PATTERNS.INDEX_PREFIX).toBe("index:");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(STORAGE_KEY_PATTERNS)).toBe(true);
    });
  });

  describe("Integration with storage service", () => {
    it("should support error message construction", () => {
      const key = "test-key";
      const errorMessage = `${STORAGE_ERROR_MESSAGES.DATA_NOT_FOUND}: ${key}`;
      expect(errorMessage).toBe("数据未找到: test-key");
    });

    it("should support performance threshold checking", () => {
      const processingTime = 1500;
      const isSlowStorage =
        processingTime > STORAGE_PERFORMANCE_THRESHOLDS.SLOW_STORAGE_MS;
      expect(isSlowStorage).toBe(true);
    });

    it("should support cache key construction", () => {
      const baseKey = "data";
      const metadataKey = `${baseKey}${STORAGE_KEY_PATTERNS.METADATA_SUFFIX}`;
      expect(metadataKey).toBe("data:meta");
    });

    it("should support data size validation", () => {
      const dataSize = 150 * 1024; // 150KB
      const isLargeData =
        dataSize > STORAGE_PERFORMANCE_THRESHOLDS.LARGE_DATA_SIZE_KB * 1024;
      expect(isLargeData).toBe(true);
    });
  });
});

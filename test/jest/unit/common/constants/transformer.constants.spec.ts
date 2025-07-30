import {
  TRANSFORM_ERROR_MESSAGES,
  TRANSFORM_WARNING_MESSAGES,
  TRANSFORM_CONFIG,
  TRANSFORM_PERFORMANCE_THRESHOLDS,
  TRANSFORM_METRICS,
  TRANSFORM_STATUS,
  TRANSFORM_EVENTS,
  TRANSFORM_DEFAULTS,
  FIELD_VALIDATION_RULES,
} from "../../../../../src/core/transformer/constants/transformer.constants";

describe("Transformer Constants", () => {
  describe("TRANSFORM_ERROR_MESSAGES", () => {
    it("should define all error messages", () => {
      expect(TRANSFORM_ERROR_MESSAGES.NO_MAPPING_RULE).toBe(
        "未找到匹配的映射规则",
      );
      expect(TRANSFORM_ERROR_MESSAGES.TRANSFORMATION_FAILED).toBe(
        "数据转换失败",
      );
      expect(TRANSFORM_ERROR_MESSAGES.VALIDATION_FAILED).toBe(
        "转换后数据验证失败",
      );
      expect(TRANSFORM_ERROR_MESSAGES.INVALID_RAW_DATA).toBe(
        "原始数据格式无效",
      );
      expect(TRANSFORM_ERROR_MESSAGES.MISSING_REQUIRED_FIELDS).toBe(
        "缺少必需字段",
      );
      expect(TRANSFORM_ERROR_MESSAGES.RULE_NOT_FOUND).toBe(
        "指定的映射规则不存在",
      );
      expect(TRANSFORM_ERROR_MESSAGES.BATCH_TRANSFORMATION_FAILED).toBe(
        "批量转换失败",
      );
      expect(TRANSFORM_ERROR_MESSAGES.PREVIEW_GENERATION_FAILED).toBe(
        "预览生成失败",
      );
      expect(TRANSFORM_ERROR_MESSAGES.SAMPLE_DATA_EXTRACTION_FAILED).toBe(
        "样本数据提取失败",
      );
      expect(TRANSFORM_ERROR_MESSAGES.FIELD_MAPPING_ERROR).toBe("字段映射错误");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(TRANSFORM_ERROR_MESSAGES)).toBe(true);
    });

    it("should use Chinese messages", () => {
      const messages = Object.values(TRANSFORM_ERROR_MESSAGES);
      messages.forEach((message) => {
        expect(message).toMatch(/[\u4e00-\u9fa5]/); // Contains Chinese characters
      });
    });
  });

  describe("TRANSFORM_WARNING_MESSAGES", () => {
    it("should define all warning messages", () => {
      expect(TRANSFORM_WARNING_MESSAGES.EMPTY_TRANSFORMED_DATA).toBe(
        "转换后数据为空",
      );
      expect(TRANSFORM_WARNING_MESSAGES.MISSING_EXPECTED_FIELDS).toBe(
        "转换后数据缺少预期字段",
      );
      expect(TRANSFORM_WARNING_MESSAGES.NULL_FIELD_VALUES).toBe(
        "字段值为空或未定义",
      );
      expect(TRANSFORM_WARNING_MESSAGES.PARTIAL_TRANSFORMATION).toBe(
        "部分数据转换成功",
      );
      expect(TRANSFORM_WARNING_MESSAGES.PERFORMANCE_WARNING).toBe(
        "转换性能较慢",
      );
      expect(TRANSFORM_WARNING_MESSAGES.LARGE_DATASET_WARNING).toBe(
        "数据集较大，可能影响性能",
      );
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(TRANSFORM_WARNING_MESSAGES)).toBe(true);
    });
  });

  describe("TRANSFORM_CONFIG", () => {
    it("should define all configuration values", () => {
      expect(TRANSFORM_CONFIG.MAX_BATCH_SIZE).toBe(1000);
      expect(TRANSFORM_CONFIG.MAX_FIELD_MAPPINGS).toBe(100);
      expect(TRANSFORM_CONFIG.MAX_SAMPLE_SIZE).toBe(10);
      expect(TRANSFORM_CONFIG.DEFAULT_TIMEOUT_MS).toBe(30000);
      expect(TRANSFORM_CONFIG.MAX_NESTED_DEPTH).toBe(10);
      expect(TRANSFORM_CONFIG.MAX_STRING_LENGTH).toBe(10000);
      expect(TRANSFORM_CONFIG.MAX_ARRAY_LENGTH).toBe(10000);
    });

    it("should have reasonable configuration values", () => {
      expect(TRANSFORM_CONFIG.MAX_BATCH_SIZE).toBeGreaterThan(0);
      expect(TRANSFORM_CONFIG.MAX_FIELD_MAPPINGS).toBeGreaterThan(0);
      expect(TRANSFORM_CONFIG.MAX_SAMPLE_SIZE).toBeGreaterThan(0);
      expect(TRANSFORM_CONFIG.DEFAULT_TIMEOUT_MS).toBeGreaterThan(0);
      expect(TRANSFORM_CONFIG.MAX_NESTED_DEPTH).toBeGreaterThan(0);
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(TRANSFORM_CONFIG)).toBe(true);
    });
  });

  describe("TRANSFORM_PERFORMANCE_THRESHOLDS", () => {
    it("should define all performance thresholds", () => {
      expect(TRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS).toBe(
        5000,
      );
      expect(TRANSFORM_PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE).toBe(1000);
      expect(TRANSFORM_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE_MB).toBe(200); // 更新为统一常量系统中的值
      expect(TRANSFORM_PERFORMANCE_THRESHOLDS.MAX_PROCESSING_TIME_MS).toBe(
        60000,
      );
    });

    it("should have reasonable threshold values", () => {
      expect(
        TRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS,
      ).toBeGreaterThan(0);
      expect(
        TRANSFORM_PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE,
      ).toBeGreaterThan(0);
      expect(
        TRANSFORM_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE_MB,
      ).toBeGreaterThan(0);
      expect(
        TRANSFORM_PERFORMANCE_THRESHOLDS.MAX_PROCESSING_TIME_MS,
      ).toBeGreaterThan(
        TRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS,
      );
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(TRANSFORM_PERFORMANCE_THRESHOLDS)).toBe(true);
    });
  });

  describe("TRANSFORM_METRICS", () => {
    it("should define all metric names", () => {
      expect(TRANSFORM_METRICS.RECORDS_PROCESSED).toBe("records_processed");
      expect(TRANSFORM_METRICS.FIELDS_TRANSFORMED).toBe("fields_transformed");
      expect(TRANSFORM_METRICS.PROCESSING_TIME_MS).toBe("processing_time_ms");
      expect(TRANSFORM_METRICS.SUCCESS_RATE).toBe("success_rate");
      expect(TRANSFORM_METRICS.ERROR_RATE).toBe("error_rate");
      expect(TRANSFORM_METRICS.MEMORY_USAGE_MB).toBe("memory_usage_mb");
      expect(TRANSFORM_METRICS.THROUGHPUT_PER_SECOND).toBe(
        "throughput_per_second",
      );
    });

    it("should use snake_case naming convention", () => {
      const metrics = Object.values(TRANSFORM_METRICS);
      metrics.forEach((metric) => {
        expect(metric).toMatch(/^[a-z_]+$/);
        expect(metric).not.toContain(" ");
        expect(metric).not.toContain("-");
      });
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(TRANSFORM_METRICS)).toBe(true);
    });
  });

  describe("TRANSFORM_STATUS", () => {
    it("should define all status values", () => {
      expect(TRANSFORM_STATUS.PENDING).toBe("pending");
      expect(TRANSFORM_STATUS.PROCESSING).toBe("processing");
      expect(TRANSFORM_STATUS.SUCCESS).toBe("success");
      expect(TRANSFORM_STATUS.FAILED).toBe("failed");
      expect(TRANSFORM_STATUS.PARTIAL_SUCCESS).toBe("partial_success");
      expect(TRANSFORM_STATUS.CANCELLED).toBe("cancelled");
      expect(TRANSFORM_STATUS.TIMEOUT).toBe("timeout");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(TRANSFORM_STATUS)).toBe(true);
    });
  });

  describe("TRANSFORM_EVENTS", () => {
    it("should define all event names", () => {
      expect(TRANSFORM_EVENTS.TRANSFORMATION_STARTED).toBe(
        "transformation.started",
      );
      expect(TRANSFORM_EVENTS.TRANSFORMATION_COMPLETED).toBe(
        "transformation.completed",
      );
      expect(TRANSFORM_EVENTS.TRANSFORMATION_FAILED).toBe(
        "transformation.failed",
      );
      expect(TRANSFORM_EVENTS.BATCH_TRANSFORMATION_STARTED).toBe(
        "batch.transformation.started",
      );
      expect(TRANSFORM_EVENTS.BATCH_TRANSFORMATION_COMPLETED).toBe(
        "batch.transformation.completed",
      );
      expect(TRANSFORM_EVENTS.RULE_APPLIED).toBe("rule.applied");
      expect(TRANSFORM_EVENTS.VALIDATION_COMPLETED).toBe(
        "validation.completed",
      );
      expect(TRANSFORM_EVENTS.PERFORMANCE_WARNING).toBe("performance.warning");
    });

    it("should use consistent event naming convention", () => {
      const events = Object.values(TRANSFORM_EVENTS);
      events.forEach((event) => {
        expect(event).toMatch(/^[a-z.]+$/);
        expect(event).not.toContain(" ");
        expect(event).not.toContain("_");
      });
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(TRANSFORM_EVENTS)).toBe(true);
    });
  });

  describe("TRANSFORM_DEFAULTS", () => {
    it("should define all default values", () => {
      expect(TRANSFORM_DEFAULTS.BATCH_SIZE).toBe(100);
      expect(TRANSFORM_DEFAULTS.TIMEOUT_MS).toBe(10000);
      expect(TRANSFORM_DEFAULTS.RETRY_ATTEMPTS).toBe(3);
      expect(TRANSFORM_DEFAULTS.VALIDATE_OUTPUT).toBe(true);
      expect(TRANSFORM_DEFAULTS.INCLUDE_METADATA).toBe(false);
      expect(TRANSFORM_DEFAULTS.CONTINUE_ON_ERROR).toBe(false);
      expect(TRANSFORM_DEFAULTS.ENABLE_CACHING).toBe(true);
      expect(TRANSFORM_DEFAULTS.LOG_LEVEL).toBe("info");
    });

    it("should have reasonable default values", () => {
      expect(TRANSFORM_DEFAULTS.BATCH_SIZE).toBeGreaterThan(0);
      expect(TRANSFORM_DEFAULTS.TIMEOUT_MS).toBeGreaterThan(0);
      expect(TRANSFORM_DEFAULTS.RETRY_ATTEMPTS).toBeGreaterThanOrEqual(0);
      expect(typeof TRANSFORM_DEFAULTS.VALIDATE_OUTPUT).toBe("boolean");
      expect(typeof TRANSFORM_DEFAULTS.INCLUDE_METADATA).toBe("boolean");
      expect(typeof TRANSFORM_DEFAULTS.CONTINUE_ON_ERROR).toBe("boolean");
      expect(typeof TRANSFORM_DEFAULTS.ENABLE_CACHING).toBe("boolean");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(TRANSFORM_DEFAULTS)).toBe(true);
    });
  });

  describe("FIELD_VALIDATION_RULES", () => {
    it("should define all validation rules", () => {
      expect(FIELD_VALIDATION_RULES.REQUIRED).toBe("required");
      expect(FIELD_VALIDATION_RULES.OPTIONAL).toBe("optional");
      expect(FIELD_VALIDATION_RULES.NUMERIC).toBe("numeric");
      expect(FIELD_VALIDATION_RULES.STRING).toBe("string");
      expect(FIELD_VALIDATION_RULES.BOOLEAN).toBe("boolean");
      expect(FIELD_VALIDATION_RULES.DATE).toBe("date");
      expect(FIELD_VALIDATION_RULES.ARRAY).toBe("array");
      expect(FIELD_VALIDATION_RULES.OBJECT).toBe("object");
      expect(FIELD_VALIDATION_RULES.EMAIL).toBe("email");
      expect(FIELD_VALIDATION_RULES.URL).toBe("url");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(FIELD_VALIDATION_RULES)).toBe(true);
    });
  });

  describe("Integration with transformer service", () => {
    it("should support error message construction", () => {
      const provider = "test-provider";
      const transDataRuleListType = "test-type";
      const errorMessage = `${TRANSFORM_ERROR_MESSAGES.NO_MAPPING_RULE}: provider '${provider}', transDataRuleListType '${transDataRuleListType}'`;
      expect(errorMessage).toBe(
        "未找到匹配的映射规则: provider 'test-provider', transDataRuleListType 'test-type'",
      );
    });

    it("should support performance threshold checking", () => {
      const processingTime = 6000;
      const isSlowTransformation =
        processingTime >
        TRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS;
      expect(isSlowTransformation).toBe(true);
    });

    it("should support batch size validation", () => {
      const batchSize = 1500;
      const exceedsLimit = batchSize > TRANSFORM_CONFIG.MAX_BATCH_SIZE;
      expect(exceedsLimit).toBe(true);
    });

    it("should support nested depth validation", () => {
      const pathDepth = 15;
      const exceedsDepth = pathDepth > TRANSFORM_CONFIG.MAX_NESTED_DEPTH;
      expect(exceedsDepth).toBe(true);
    });
  });
});

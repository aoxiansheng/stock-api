import {
  SYMBOL_MAPPER_ERROR_MESSAGES,
  SYMBOL_MAPPER_WARNING_MESSAGES,
  SYMBOL_MAPPER_SUCCESS_MESSAGES,
  SYMBOL_MAPPER_PERFORMANCE_CONFIG,
  SYMBOL_MAPPER_CONFIG,
  SYMBOL_MAPPER_METRICS,
  SYMBOL_MAPPER_STATUS,
  SYMBOL_MAPPER_OPERATIONS,
  SYMBOL_MAPPER_DEFAULTS,
  SYMBOL_MAPPER_VALIDATION_RULES,
} from "../../../../../src/core/symbol-mapper/constants/symbol-mapper.constants";

describe("Symbol Mapper Constants", () => {
  describe("SYMBOL_MAPPER_ERROR_MESSAGES", () => {
    it("should define all error messages", () => {
      expect(SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_EXISTS).toContain(
        "{dataSourceName}",
      );
      expect(SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_NOT_FOUND).toContain(
        "{id}",
      );
      expect(
        SYMBOL_MAPPER_ERROR_MESSAGES.DATA_SOURCE_MAPPING_NOT_FOUND,
      ).toContain("{dataSourceName}");
      expect(SYMBOL_MAPPER_ERROR_MESSAGES.DATA_SOURCE_NOT_FOUND).toContain(
        "{dataSourceName}",
      );
      expect(SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_RULE_NOT_FOUND).toContain(
        "{dataSourceName}",
      );
      expect(SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_INACTIVE).toContain(
        "{mappingId}",
      );
      expect(SYMBOL_MAPPER_ERROR_MESSAGES.SYMBOL_MAPPING_FAILED).toBe(
        "股票代码映射失败",
      );
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(SYMBOL_MAPPER_ERROR_MESSAGES)).toBe(true);
    });

    it("should use Chinese messages or templates", () => {
      const messages = Object.values(SYMBOL_MAPPER_ERROR_MESSAGES);
      messages.forEach((message) => {
        // 检查是否包含中文字符或者是模板字符串
        expect(message).toMatch(/[\u4e00-\u9fa5]|{.*}/);
      });
    });
  });

  describe("SYMBOL_MAPPER_WARNING_MESSAGES", () => {
    it("should define all warning messages", () => {
      expect(SYMBOL_MAPPER_WARNING_MESSAGES.MAPPING_CONFIG_NOT_FOUND).toBe(
        "未找到数据源映射配置，返回原始代码",
      );
      expect(SYMBOL_MAPPER_WARNING_MESSAGES.MATCHING_RULE_NOT_FOUND).toBe(
        "未找到匹配的映射规则，返回原始代码",
      );
      expect(SYMBOL_MAPPER_WARNING_MESSAGES.SLOW_MAPPING_DETECTED).toBe(
        "检测到慢映射操作",
      );
      expect(SYMBOL_MAPPER_WARNING_MESSAGES.LARGE_BATCH_WARNING).toBe(
        "批量处理数据量较大，可能影响性能",
      );
      expect(
        SYMBOL_MAPPER_WARNING_MESSAGES.MAPPING_CONFIG_RETRIEVAL_FAILED,
      ).toBe("获取映射配置失败");
      expect(SYMBOL_MAPPER_WARNING_MESSAGES.PARTIAL_MAPPING_SUCCESS).toBe(
        "部分股票代码映射成功",
      );
      expect(SYMBOL_MAPPER_WARNING_MESSAGES.INACTIVE_MAPPING_RULE).toBe(
        "映射规则已停用",
      );
      expect(SYMBOL_MAPPER_WARNING_MESSAGES.EMPTY_MAPPING_RULES).toBe(
        "映射规则列表为空",
      );
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(SYMBOL_MAPPER_WARNING_MESSAGES)).toBe(true);
    });
  });

  describe("SYMBOL_MAPPER_SUCCESS_MESSAGES", () => {
    it("should define all success messages", () => {
      expect(SYMBOL_MAPPER_SUCCESS_MESSAGES.SYMBOL_MAPPED).toBe(
        "股票代码映射完成",
      );
      expect(SYMBOL_MAPPER_SUCCESS_MESSAGES.MAPPING_CONFIG_CREATED).toBe(
        "数据源映射配置创建成功",
      );
      expect(SYMBOL_MAPPER_SUCCESS_MESSAGES.MAPPING_CONFIG_UPDATED).toBe(
        "映射配置更新成功",
      );
      expect(SYMBOL_MAPPER_SUCCESS_MESSAGES.MAPPING_CONFIG_DELETED).toBe(
        "映射配置删除成功",
      );
      expect(SYMBOL_MAPPER_SUCCESS_MESSAGES.MAPPING_RULES_RETRIEVED).toBe(
        "映射规则获取完成",
      );
      expect(SYMBOL_MAPPER_SUCCESS_MESSAGES.MAPPING_CONFIG_RETRIEVED).toBe(
        "映射配置获取成功",
      );
      expect(SYMBOL_MAPPER_SUCCESS_MESSAGES.DATA_SOURCE_MAPPING_RETRIEVED).toBe(
        "数据源映射配置获取成功",
      );
      expect(SYMBOL_MAPPER_SUCCESS_MESSAGES.PAGINATED_QUERY_COMPLETED).toBe(
        "分页查询完成",
      );
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(SYMBOL_MAPPER_SUCCESS_MESSAGES)).toBe(true);
    });
  });

  describe("SYMBOL_MAPPER_PERFORMANCE_CONFIG", () => {
    it("should define all performance configuration", () => {
      expect(SYMBOL_MAPPER_PERFORMANCE_CONFIG.SLOW_MAPPING_THRESHOLD_MS).toBe(
        100,
      );
      expect(SYMBOL_MAPPER_PERFORMANCE_CONFIG.MAX_SYMBOLS_PER_BATCH).toBe(1000);
      expect(SYMBOL_MAPPER_PERFORMANCE_CONFIG.LOG_SYMBOLS_LIMIT).toBe(5);
      expect(SYMBOL_MAPPER_PERFORMANCE_CONFIG.MIN_PROCESSING_TIME_MS).toBe(1);
      expect(SYMBOL_MAPPER_PERFORMANCE_CONFIG.LARGE_BATCH_THRESHOLD).toBe(500);
      expect(SYMBOL_MAPPER_PERFORMANCE_CONFIG.PERFORMANCE_SAMPLE_SIZE).toBe(
        100,
      );
      expect(SYMBOL_MAPPER_PERFORMANCE_CONFIG.MAX_CONCURRENT_MAPPINGS).toBe(10);
    });

    it("should have reasonable performance values", () => {
      expect(
        SYMBOL_MAPPER_PERFORMANCE_CONFIG.SLOW_MAPPING_THRESHOLD_MS,
      ).toBeGreaterThan(0);
      expect(
        SYMBOL_MAPPER_PERFORMANCE_CONFIG.MAX_SYMBOLS_PER_BATCH,
      ).toBeGreaterThan(0);
      expect(
        SYMBOL_MAPPER_PERFORMANCE_CONFIG.LOG_SYMBOLS_LIMIT,
      ).toBeGreaterThan(0);
      expect(
        SYMBOL_MAPPER_PERFORMANCE_CONFIG.MIN_PROCESSING_TIME_MS,
      ).toBeGreaterThan(0);
      expect(
        SYMBOL_MAPPER_PERFORMANCE_CONFIG.LARGE_BATCH_THRESHOLD,
      ).toBeLessThan(SYMBOL_MAPPER_PERFORMANCE_CONFIG.MAX_SYMBOLS_PER_BATCH);
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(SYMBOL_MAPPER_PERFORMANCE_CONFIG)).toBe(true);
    });
  });

  describe("SYMBOL_MAPPER_CONFIG", () => {
    it("should define all configuration values", () => {
      expect(SYMBOL_MAPPER_CONFIG.DEFAULT_PAGE_SIZE).toBe(10);
      expect(SYMBOL_MAPPER_CONFIG.MAX_PAGE_SIZE).toBe(100);
      expect(SYMBOL_MAPPER_CONFIG.DEFAULT_TIMEOUT_MS).toBe(30000);
      expect(SYMBOL_MAPPER_CONFIG.MAX_RETRY_ATTEMPTS).toBe(3);
      expect(SYMBOL_MAPPER_CONFIG.RETRY_DELAY_MS).toBe(1000);
      expect(SYMBOL_MAPPER_CONFIG.MAX_DATA_SOURCE_NAME_LENGTH).toBe(100);
      expect(SYMBOL_MAPPER_CONFIG.MAX_SYMBOL_LENGTH).toBe(50);
      expect(SYMBOL_MAPPER_CONFIG.MAX_MAPPING_RULES_PER_SOURCE).toBe(10000);
    });

    it("should have reasonable configuration values", () => {
      expect(SYMBOL_MAPPER_CONFIG.DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
      expect(SYMBOL_MAPPER_CONFIG.MAX_PAGE_SIZE).toBeGreaterThan(
        SYMBOL_MAPPER_CONFIG.DEFAULT_PAGE_SIZE,
      );
      expect(SYMBOL_MAPPER_CONFIG.DEFAULT_TIMEOUT_MS).toBeGreaterThan(0);
      expect(SYMBOL_MAPPER_CONFIG.MAX_RETRY_ATTEMPTS).toBeGreaterThan(0);
      expect(SYMBOL_MAPPER_CONFIG.RETRY_DELAY_MS).toBeGreaterThan(0);
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(SYMBOL_MAPPER_CONFIG)).toBe(true);
    });
  });

  describe("SYMBOL_MAPPER_METRICS", () => {
    it("should define all metric names", () => {
      expect(SYMBOL_MAPPER_METRICS.MAPPINGS_TOTAL).toBe(
        "symbol_mappings_total",
      );
      expect(SYMBOL_MAPPER_METRICS.MAPPING_DURATION).toBe(
        "symbol_mapping_duration",
      );
      expect(SYMBOL_MAPPER_METRICS.TRANSFORM_DURATION).toBe(
        "symbol_transform_duration",
      );
      expect(SYMBOL_MAPPER_METRICS.BATCH_SIZE).toBe("symbol_batch_size");
      expect(SYMBOL_MAPPER_METRICS.SUCCESS_RATE).toBe(
        "symbol_mapping_success_rate",
      );
      expect(SYMBOL_MAPPER_METRICS.ERROR_RATE).toBe(
        "symbol_mapping_error_rate",
      );
      expect(SYMBOL_MAPPER_METRICS.CACHE_HIT_RATE).toBe(
        "symbol_mapping_cache_hit_rate",
      );
      expect(SYMBOL_MAPPER_METRICS.RULES_PROCESSED).toBe(
        "symbol_mapping_rules_processed",
      );
      expect(SYMBOL_MAPPER_METRICS.DATA_SOURCES_COUNT).toBe(
        "symbol_mapping_data_sources_count",
      );
      expect(SYMBOL_MAPPER_METRICS.ACTIVE_RULES_COUNT).toBe(
        "symbol_mapping_active_rules_count",
      );
    });

    it("should use snake_case naming convention", () => {
      const metrics = Object.values(SYMBOL_MAPPER_METRICS);
      metrics.forEach((metric) => {
        expect(metric).toMatch(/^symbol_[a-z_]+$/);
        expect(metric).not.toContain(" ");
        expect(metric).not.toContain("-");
      });
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(SYMBOL_MAPPER_METRICS)).toBe(true);
    });
  });

  describe("SYMBOL_MAPPER_STATUS", () => {
    it("should define all status values", () => {
      expect(SYMBOL_MAPPER_STATUS.ACTIVE).toBe("active");
      expect(SYMBOL_MAPPER_STATUS.INACTIVE).toBe("inactive");
      expect(SYMBOL_MAPPER_STATUS.PENDING).toBe("pending");
      expect(SYMBOL_MAPPER_STATUS.PROCESSING).toBe("processing");
      expect(SYMBOL_MAPPER_STATUS.COMPLETED).toBe("completed");
      expect(SYMBOL_MAPPER_STATUS.FAILED).toBe("failed");
      expect(SYMBOL_MAPPER_STATUS.DEPRECATED).toBe("deprecated");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(SYMBOL_MAPPER_STATUS)).toBe(true);
    });
  });

  describe("SYMBOL_MAPPER_OPERATIONS", () => {
    it("should define all operation names", () => {
      expect(SYMBOL_MAPPER_OPERATIONS.MAP_SYMBOL).toBe("mapSymbol");
      expect(SYMBOL_MAPPER_OPERATIONS.CREATE_DATA_SOURCE_MAPPING).toBe(
        "createDataSourceMapping",
      );
      expect(SYMBOL_MAPPER_OPERATIONS.SAVE_MAPPING).toBe("saveMapping");
      expect(SYMBOL_MAPPER_OPERATIONS.GET_MAPPING_RULES).toBe(
        "getMappingRules",
      );
      expect(SYMBOL_MAPPER_OPERATIONS.GET_MAPPING_BY_ID).toBe("getMappingById");
      expect(SYMBOL_MAPPER_OPERATIONS.GET_MAPPING_BY_DATA_SOURCE).toBe(
        "getMappingByDataSource",
      );
      expect(SYMBOL_MAPPER_OPERATIONS.GET_MAPPINGS_PAGINATED).toBe(
        "getMappingsPaginated",
      );
      expect(SYMBOL_MAPPER_OPERATIONS.UPDATE_MAPPING).toBe("updateMapping");
      expect(SYMBOL_MAPPER_OPERATIONS.DELETE_MAPPING).toBe("deleteMapping");
      expect(SYMBOL_MAPPER_OPERATIONS.TRANSFORM_SYMBOLS).toBe(
        "transformSymbols",
      );
    });

    it("should use camelCase naming convention", () => {
      const operations = Object.values(SYMBOL_MAPPER_OPERATIONS);
      operations.forEach((operation) => {
        expect(operation).toMatch(/^[a-z][a-zA-Z]*$/);
        expect(operation).not.toContain("_");
        expect(operation).not.toContain("-");
        expect(operation).not.toContain(" ");
      });
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(SYMBOL_MAPPER_OPERATIONS)).toBe(true);
    });
  });

  describe("SYMBOL_MAPPER_DEFAULTS", () => {
    it("should define all default values", () => {
      expect(SYMBOL_MAPPER_DEFAULTS.PAGE_NUMBER).toBe(1);
      expect(SYMBOL_MAPPER_DEFAULTS.PAGE_SIZE).toBe(10);
      expect(SYMBOL_MAPPER_DEFAULTS.TIMEOUT_MS).toBe(30000);
      expect(SYMBOL_MAPPER_DEFAULTS.RETRY_ATTEMPTS).toBe(3);
      expect(SYMBOL_MAPPER_DEFAULTS.LOG_LEVEL).toBe("info");
      expect(SYMBOL_MAPPER_DEFAULTS.ENABLE_PERFORMANCE_MONITORING).toBe(true);
      expect(SYMBOL_MAPPER_DEFAULTS.ENABLE_CACHING).toBe(true);
      expect(SYMBOL_MAPPER_DEFAULTS.BATCH_SIZE).toBe(100);
      expect(SYMBOL_MAPPER_DEFAULTS.PROCESSING_TIME).toBe(0);
      expect(SYMBOL_MAPPER_DEFAULTS.SUCCESS_RATE).toBe(1.0);
      expect(SYMBOL_MAPPER_DEFAULTS.ERROR_RATE).toBe(0.0);
    });

    it("should have reasonable default values", () => {
      expect(SYMBOL_MAPPER_DEFAULTS.PAGE_NUMBER).toBeGreaterThan(0);
      expect(SYMBOL_MAPPER_DEFAULTS.PAGE_SIZE).toBeGreaterThan(0);
      expect(SYMBOL_MAPPER_DEFAULTS.TIMEOUT_MS).toBeGreaterThan(0);
      expect(SYMBOL_MAPPER_DEFAULTS.RETRY_ATTEMPTS).toBeGreaterThan(0);
      expect(typeof SYMBOL_MAPPER_DEFAULTS.ENABLE_PERFORMANCE_MONITORING).toBe(
        "boolean",
      );
      expect(typeof SYMBOL_MAPPER_DEFAULTS.ENABLE_CACHING).toBe("boolean");
      expect(SYMBOL_MAPPER_DEFAULTS.SUCCESS_RATE).toBeLessThanOrEqual(1.0);
      expect(SYMBOL_MAPPER_DEFAULTS.ERROR_RATE).toBeGreaterThanOrEqual(0.0);
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(SYMBOL_MAPPER_DEFAULTS)).toBe(true);
    });
  });

  describe("SYMBOL_MAPPER_VALIDATION_RULES", () => {
    it("should define all validation rules", () => {
      expect(SYMBOL_MAPPER_VALIDATION_RULES.MIN_SYMBOL_LENGTH).toBe(1);
      expect(SYMBOL_MAPPER_VALIDATION_RULES.MAX_SYMBOL_LENGTH).toBe(50);
      expect(SYMBOL_MAPPER_VALIDATION_RULES.MIN_DATA_SOURCE_NAME_LENGTH).toBe(
        1,
      );
      expect(SYMBOL_MAPPER_VALIDATION_RULES.MAX_DATA_SOURCE_NAME_LENGTH).toBe(
        100,
      );
      expect(SYMBOL_MAPPER_VALIDATION_RULES.SYMBOL_PATTERN).toBeInstanceOf(
        RegExp,
      );
      expect(SYMBOL_MAPPER_VALIDATION_RULES.DATA_SOURCE_PATTERN).toBeInstanceOf(
        RegExp,
      );
      expect(SYMBOL_MAPPER_VALIDATION_RULES.MAX_BATCH_SIZE).toBe(1000);
      expect(SYMBOL_MAPPER_VALIDATION_RULES.MIN_BATCH_SIZE).toBe(1);
    });

    it("should have reasonable validation values", () => {
      expect(SYMBOL_MAPPER_VALIDATION_RULES.MIN_SYMBOL_LENGTH).toBeGreaterThan(
        0,
      );
      expect(SYMBOL_MAPPER_VALIDATION_RULES.MAX_SYMBOL_LENGTH).toBeGreaterThan(
        SYMBOL_MAPPER_VALIDATION_RULES.MIN_SYMBOL_LENGTH,
      );
      expect(
        SYMBOL_MAPPER_VALIDATION_RULES.MIN_DATA_SOURCE_NAME_LENGTH,
      ).toBeGreaterThan(0);
      expect(
        SYMBOL_MAPPER_VALIDATION_RULES.MAX_DATA_SOURCE_NAME_LENGTH,
      ).toBeGreaterThan(
        SYMBOL_MAPPER_VALIDATION_RULES.MIN_DATA_SOURCE_NAME_LENGTH,
      );
      expect(SYMBOL_MAPPER_VALIDATION_RULES.MAX_BATCH_SIZE).toBeGreaterThan(
        SYMBOL_MAPPER_VALIDATION_RULES.MIN_BATCH_SIZE,
      );
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(SYMBOL_MAPPER_VALIDATION_RULES)).toBe(true);
    });
  });

  describe("Integration with symbol mapper service", () => {
    it("should support error message templating", () => {
      const dataSourceName = "test-source";
      const errorMessage =
        SYMBOL_MAPPER_ERROR_MESSAGES.MAPPING_CONFIG_EXISTS.replace(
          "{dataSourceName}",
          dataSourceName,
        );
      expect(errorMessage).toContain("test-source");
      expect(errorMessage).not.toContain("{dataSourceName}");
    });

    it("should support performance threshold checking", () => {
      const processingTime = 150;
      const isSlowMapping =
        processingTime >
        SYMBOL_MAPPER_PERFORMANCE_CONFIG.SLOW_MAPPING_THRESHOLD_MS;
      expect(isSlowMapping).toBe(true);
    });

    it("should support batch size validation", () => {
      const batchSize = 600;
      const isLargeBatch =
        batchSize > SYMBOL_MAPPER_PERFORMANCE_CONFIG.LARGE_BATCH_THRESHOLD;
      expect(isLargeBatch).toBe(true);
    });

    it("should support symbol validation", () => {
      const symbol = "AAPL";
      const isValidFormat =
        SYMBOL_MAPPER_VALIDATION_RULES.SYMBOL_PATTERN.test(symbol);
      expect(isValidFormat).toBe(true);

      const invalidSymbol = "AAPL@";
      const isInvalidFormat =
        SYMBOL_MAPPER_VALIDATION_RULES.SYMBOL_PATTERN.test(invalidSymbol);
      expect(isInvalidFormat).toBe(false);
    });

    it("should support data source name validation", () => {
      const dataSourceName = "test_source";
      const isValidFormat =
        SYMBOL_MAPPER_VALIDATION_RULES.DATA_SOURCE_PATTERN.test(dataSourceName);
      expect(isValidFormat).toBe(true);

      const invalidDataSourceName = "test source";
      const isInvalidFormat =
        SYMBOL_MAPPER_VALIDATION_RULES.DATA_SOURCE_PATTERN.test(
          invalidDataSourceName,
        );
      expect(isInvalidFormat).toBe(false);
    });
  });
});

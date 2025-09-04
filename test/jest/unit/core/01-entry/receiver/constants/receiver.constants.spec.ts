import {
  RECEIVER_ERROR_MESSAGES,
  RECEIVER_WARNING_MESSAGES,
  RECEIVER_SUCCESS_MESSAGES,
  SUPPORTED_CAPABILITY_TYPES,
  RECEIVER_PERFORMANCE_THRESHOLDS,
  RECEIVER_VALIDATION_RULES,
  MARKET_RECOGNITION_RULES,
  RECEIVER_CONFIG,
  RECEIVER_METRICS,
  RECEIVER_STATUS,
  RECEIVER_OPERATIONS,
} from "../../../../../../../src/core/01-entry/receiver/constants/receiver.constants";

describe("Receiver Constants", () => {
  describe("RECEIVER_ERROR_MESSAGES", () => {
    it("should define all error messages", () => {
      expect(RECEIVER_ERROR_MESSAGES.VALIDATION_FAILED).toBe(
        "请求参数验证失败",
      );
      expect(RECEIVER_ERROR_MESSAGES.SYMBOLS_REQUIRED).toBe(
        "股票代码列表不能为空",
      );
      expect(RECEIVER_ERROR_MESSAGES.DATA_TYPE_REQUIRED).toBe(
        "数据类型参数必须为非空字符串",
      );
      expect(RECEIVER_ERROR_MESSAGES.INVALID_SYMBOL_FORMAT).toContain(
        "{maxLength}",
      );
      expect(RECEIVER_ERROR_MESSAGES.TOO_MANY_SYMBOLS).toContain("{maxCount}");
      expect(RECEIVER_ERROR_MESSAGES.UNSUPPORTED_DATA_TYPE).toContain(
        "{receiverType}",
      );
      expect(RECEIVER_ERROR_MESSAGES.NO_PROVIDER_FOUND).toContain(
        "{receiverType}",
      );
      expect(RECEIVER_ERROR_MESSAGES.PROVIDER_NOT_SUPPORT_CAPABILITY).toContain(
        "{provider}",
      );
      expect(RECEIVER_ERROR_MESSAGES.DATA_FETCHING_FAILED).toContain("{error}");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(RECEIVER_ERROR_MESSAGES)).toBe(true);
    });

    it("should use Chinese messages", () => {
      const messages = Object.values(RECEIVER_ERROR_MESSAGES);
      messages.forEach((message) => {
        // 检查是否包含中文字符或者是模板字符串
        expect(message).toMatch(/[\u4e00-\u9fa5]|{.*}/);
      });
    });
  });

  describe("RECEIVER_WARNING_MESSAGES", () => {
    it("should define all warning messages", () => {
      expect(RECEIVER_WARNING_MESSAGES.DUPLICATE_SYMBOLS).toBe(
        "请求中包含重复的股票代码",
      );
      expect(RECEIVER_WARNING_MESSAGES.SYMBOLS_WITH_WHITESPACE).toBe(
        "部分股票代码包含前后空白字符，已自动去除",
      );
      expect(RECEIVER_WARNING_MESSAGES.PREFERRED_PROVIDER_NOT_SUPPORT).toBe(
        "首选提供商不支持请求的能力",
      );
      expect(
        RECEIVER_WARNING_MESSAGES.PREFERRED_PROVIDER_NOT_SUPPORT_MARKET,
      ).toBe("提供商 '{provider}' 不支持市场 '{market}'");
      expect(RECEIVER_WARNING_MESSAGES.SYMBOL_TRANSFORMATION_FALLBACK).toBe(
        "股票代码转换失败，使用原始代码",
      );
      expect(RECEIVER_WARNING_MESSAGES.SLOW_REQUEST_DETECTED).toBe(
        "检测到慢请求",
      );
      expect(RECEIVER_WARNING_MESSAGES.LARGE_SYMBOL_COUNT).toBe(
        "请求的股票代码数量较多，可能影响性能",
      );
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(RECEIVER_WARNING_MESSAGES)).toBe(true);
    });
  });

  describe("RECEIVER_SUCCESS_MESSAGES", () => {
    it("should define all success messages", () => {
      expect(RECEIVER_SUCCESS_MESSAGES.REQUEST_PROCESSED).toBe(
        "数据请求处理成功",
      );
      expect(RECEIVER_SUCCESS_MESSAGES.PROVIDER_SELECTED).toBe(
        "自动选择最优提供商",
      );
      expect(RECEIVER_SUCCESS_MESSAGES.PREFERRED_PROVIDER_USED).toBe(
        "使用首选提供商",
      );
      expect(RECEIVER_SUCCESS_MESSAGES.SYMBOLS_TRANSFORMED).toBe(
        "股票代码转换完成",
      );
      expect(RECEIVER_SUCCESS_MESSAGES.DATA_FETCHED).toBe("数据获取成功");
      expect(RECEIVER_SUCCESS_MESSAGES.VALIDATION_PASSED).toBe(
        "请求参数验证通过",
      );
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(RECEIVER_SUCCESS_MESSAGES)).toBe(true);
    });
  });

  describe("SUPPORTED_CAPABILITY_TYPES", () => {
    it("should define all supported data types", () => {
      expect(SUPPORTED_CAPABILITY_TYPES).toContain("get-stock-quote");
      expect(SUPPORTED_CAPABILITY_TYPES).toContain("get-stock-basic-info");
      expect(SUPPORTED_CAPABILITY_TYPES).toContain("get-index-quote");
      expect(SUPPORTED_CAPABILITY_TYPES).toContain("get-market-status");
      expect(SUPPORTED_CAPABILITY_TYPES).toContain("get-trading-days");
      expect(SUPPORTED_CAPABILITY_TYPES).toContain("get-global-state");
      expect(SUPPORTED_CAPABILITY_TYPES).toContain("get-crypto-quote");
      expect(SUPPORTED_CAPABILITY_TYPES).toContain("get-stock-logo");
    });

    it("should use consistent naming convention", () => {
      SUPPORTED_CAPABILITY_TYPES.forEach((receiverType) => {
        expect(receiverType).toMatch(/^get-[a-z-]+$/); // get-* pattern with kebab-case
        expect(receiverType).not.toContain("_"); // no underscores
        expect(receiverType).not.toContain(" "); // no spaces
      });
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(SUPPORTED_CAPABILITY_TYPES)).toBe(true);
    });

    it("should be an array", () => {
      expect(Array.isArray(SUPPORTED_CAPABILITY_TYPES)).toBe(true);
      expect(SUPPORTED_CAPABILITY_TYPES.length).toBeGreaterThan(0);
    });
  });

  describe("RECEIVER_PERFORMANCE_THRESHOLDS", () => {
    it("should define all performance thresholds", () => {
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS).toBe(1000);
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.MAX_SYMBOLS_PER_REQUEST).toBe(100);
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT).toBe(10);
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.LARGE_SYMBOL_COUNT_WARNING).toBe(
        50,
      );
      expect(
        RECEIVER_PERFORMANCE_THRESHOLDS.PROVIDER_SELECTION_TIMEOUT_MS,
      ).toBe(5000);
      expect(
        RECEIVER_PERFORMANCE_THRESHOLDS.SYMBOL_TRANSFORMATION_TIMEOUT_MS,
      ).toBe(10000);
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.DATA_FETCHING_TIMEOUT_MS).toBe(
        30000,
      );
    });

    it("should have reasonable threshold values", () => {
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS).toBeGreaterThan(
        0,
      );
      expect(
        RECEIVER_PERFORMANCE_THRESHOLDS.MAX_SYMBOLS_PER_REQUEST,
      ).toBeGreaterThan(0);
      expect(RECEIVER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT).toBeGreaterThan(
        0,
      );
      expect(
        RECEIVER_PERFORMANCE_THRESHOLDS.LARGE_SYMBOL_COUNT_WARNING,
      ).toBeLessThan(RECEIVER_PERFORMANCE_THRESHOLDS.MAX_SYMBOLS_PER_REQUEST);
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(RECEIVER_PERFORMANCE_THRESHOLDS)).toBe(true);
    });
  });

  describe("RECEIVER_VALIDATION_RULES", () => {
    it("should define all validation rules", () => {
      expect(RECEIVER_VALIDATION_RULES.MIN_SYMBOL_LENGTH).toBe(1);
      expect(RECEIVER_VALIDATION_RULES.MAX_SYMBOL_LENGTH).toBe(20);
      expect(RECEIVER_VALIDATION_RULES.MAX_SYMBOLS_COUNT).toBe(100);
      expect(RECEIVER_VALIDATION_RULES.MIN_DATA_TYPE_LENGTH).toBe(1);
      expect(RECEIVER_VALIDATION_RULES.MAX_DATA_TYPE_LENGTH).toBe(50);
      expect(RECEIVER_VALIDATION_RULES.SYMBOL_PATTERN).toBeInstanceOf(RegExp);
      expect(RECEIVER_VALIDATION_RULES.DATA_TYPE_PATTERN).toBeInstanceOf(
        RegExp,
      );
    });

    it("should have reasonable validation values", () => {
      expect(RECEIVER_VALIDATION_RULES.MIN_SYMBOL_LENGTH).toBeGreaterThan(0);
      expect(RECEIVER_VALIDATION_RULES.MAX_SYMBOL_LENGTH).toBeGreaterThan(
        RECEIVER_VALIDATION_RULES.MIN_SYMBOL_LENGTH,
      );
      expect(RECEIVER_VALIDATION_RULES.MAX_SYMBOLS_COUNT).toBeGreaterThan(0);
      expect(RECEIVER_VALIDATION_RULES.MIN_DATA_TYPE_LENGTH).toBeGreaterThan(0);
      expect(RECEIVER_VALIDATION_RULES.MAX_DATA_TYPE_LENGTH).toBeGreaterThan(
        RECEIVER_VALIDATION_RULES.MIN_DATA_TYPE_LENGTH,
      );
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(RECEIVER_VALIDATION_RULES)).toBe(true);
    });
  });

  describe("MARKET_RECOGNITION_RULES", () => {
    it("should define all market recognition rules", () => {
      expect(MARKET_RECOGNITION_RULES.MARKETS.HK.SUFFIX).toBe(".HK");
      expect(
        MARKET_RECOGNITION_RULES.MARKETS.HK.NUMERIC_PATTERN,
      ).toBeInstanceOf(RegExp);
      expect(MARKET_RECOGNITION_RULES.MARKETS.HK.MARKET_CODE).toBe("HK");

      expect(MARKET_RECOGNITION_RULES.MARKETS.US.SUFFIX).toBe(".US");
      expect(MARKET_RECOGNITION_RULES.MARKETS.US.ALPHA_PATTERN).toBeInstanceOf(
        RegExp,
      );
      expect(MARKET_RECOGNITION_RULES.MARKETS.US.MARKET_CODE).toBe("US");

      expect(MARKET_RECOGNITION_RULES.MARKETS.SZ.SUFFIX).toBe(".SZ");
      expect(MARKET_RECOGNITION_RULES.MARKETS.SZ.PREFIX_PATTERNS).toEqual([
        "00",
        "30",
      ]);
      expect(MARKET_RECOGNITION_RULES.MARKETS.SZ.MARKET_CODE).toBe("SZ");

      expect(MARKET_RECOGNITION_RULES.MARKETS.SH.SUFFIX).toBe(".SH");
      expect(MARKET_RECOGNITION_RULES.MARKETS.SH.PREFIX_PATTERNS).toEqual([
        "60",
        "68",
      ]);
      expect(MARKET_RECOGNITION_RULES.MARKETS.SH.MARKET_CODE).toBe("SH");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(MARKET_RECOGNITION_RULES)).toBe(true);
      expect(Object.isFrozen(MARKET_RECOGNITION_RULES.MARKETS.HK)).toBe(true);
      expect(Object.isFrozen(MARKET_RECOGNITION_RULES.MARKETS.US)).toBe(true);
      expect(Object.isFrozen(MARKET_RECOGNITION_RULES.MARKETS.SZ)).toBe(true);
      expect(Object.isFrozen(MARKET_RECOGNITION_RULES.MARKETS.SH)).toBe(true);
    });
  });

  describe("RECEIVER_CONFIG", () => {
    it("should define all configuration values", () => {
      expect(RECEIVER_CONFIG.DEFAULT_TIMEOUT_MS).toBe(30000);
      expect(RECEIVER_CONFIG.MAX_RETRY_ATTEMPTS).toBe(3);
      expect(RECEIVER_CONFIG.RETRY_DELAY_MS).toBe(1000);
      expect(RECEIVER_CONFIG.MAX_CONCURRENT_REQUESTS).toBe(10);
      expect(RECEIVER_CONFIG.REQUEST_ID_LENGTH).toBe(36);
      expect(RECEIVER_CONFIG.LOG_TRUNCATE_LENGTH).toBe(1000);
      expect(RECEIVER_CONFIG.PERFORMANCE_SAMPLE_SIZE).toBe(100);
    });

    it("should have reasonable configuration values", () => {
      expect(RECEIVER_CONFIG.DEFAULT_TIMEOUT_MS).toBeGreaterThan(0);
      expect(RECEIVER_CONFIG.MAX_RETRY_ATTEMPTS).toBeGreaterThan(0);
      expect(RECEIVER_CONFIG.RETRY_DELAY_MS).toBeGreaterThan(0);
      expect(RECEIVER_CONFIG.MAX_CONCURRENT_REQUESTS).toBeGreaterThan(0);
      expect(RECEIVER_CONFIG.REQUEST_ID_LENGTH).toBe(36); // UUID length
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(RECEIVER_CONFIG)).toBe(true);
    });
  });

  describe("RECEIVER_METRICS", () => {
    it("should define all metric names", () => {
      expect(RECEIVER_METRICS.REQUESTS_TOTAL).toBe("receiver_requests_total");
      expect(RECEIVER_METRICS.REQUEST_DURATION).toBe(
        "receiver_request_duration",
      );
      expect(RECEIVER_METRICS.VALIDATION_ERRORS).toBe(
        "receiver_validation_errors",
      );
      expect(RECEIVER_METRICS.PROVIDER_SELECTION_TIME).toBe(
        "receiver_provider_selection_time",
      );
      expect(RECEIVER_METRICS.SYMBOL_TRANSFORMATION_TIME).toBe(
        "receiver_symbol_transformation_time",
      );
      expect(RECEIVER_METRICS.DATA_FETCHING_TIME).toBe(
        "receiver_data_fetching_time",
      );
      expect(RECEIVER_METRICS.SUCCESS_RATE).toBe("receiver_success_rate");
      expect(RECEIVER_METRICS.ERROR_RATE).toBe("receiver_error_rate");
      expect(RECEIVER_METRICS.SYMBOLS_PROCESSED).toBe(
        "receiver_symbols_processed",
      );
      expect(RECEIVER_METRICS.SLOW_REQUESTS).toBe("receiver_slow_requests");
    });

    it("should use snake_case naming convention", () => {
      const metrics = Object.values(RECEIVER_METRICS);
      metrics.forEach((metric) => {
        expect(metric).toMatch(/^receiver_[a-z_]+$/);
        expect(metric).not.toContain(" ");
        expect(metric).not.toContain("-");
      });
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(RECEIVER_METRICS)).toBe(true);
    });
  });

  describe("RECEIVER_STATUS", () => {
    it("should define all status values", () => {
      expect(RECEIVER_STATUS.PENDING).toBe("pending");
      expect(RECEIVER_STATUS.VALIDATING).toBe("validating");
      expect(RECEIVER_STATUS.SELECTING_PROVIDER).toBe("selecting_provider");
      expect(RECEIVER_STATUS.TRANSFORMING_SYMBOLS).toBe("transforming_symbols");
      expect(RECEIVER_STATUS.FETCHING_DATA).toBe("fetching_data");
      expect(RECEIVER_STATUS.SUCCESS).toBe("success");
      expect(RECEIVER_STATUS.FAILED).toBe("failed");
      expect(RECEIVER_STATUS.TIMEOUT).toBe("timeout");
      expect(RECEIVER_STATUS.CANCELLED).toBe("cancelled");
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(RECEIVER_STATUS)).toBe(true);
    });
  });

  describe("RECEIVER_OPERATIONS", () => {
    it("should define all operation names", () => {
      expect(RECEIVER_OPERATIONS.HANDLE_REQUEST).toBe("handleRequest");
      expect(RECEIVER_OPERATIONS.VALIDATE_REQUEST).toBe("validateRequest");
      expect(RECEIVER_OPERATIONS.DETERMINE_PROVIDER).toBe(
        "determineOptimalProvider",
      );
      expect(RECEIVER_OPERATIONS.VALIDATE_PREFERRED_PROVIDER).toBe(
        "validatePreferredProvider",
      );
      expect(RECEIVER_OPERATIONS.TRANSFORM_SYMBOLS).toBe("transformSymbols");
      expect(RECEIVER_OPERATIONS.EXECUTE_DATA_FETCHING).toBe(
        "executeDataFetching",
      );
      expect(RECEIVER_OPERATIONS.RECORD_PERFORMANCE).toBe(
        "recordPerformanceMetrics",
      );
      expect(RECEIVER_OPERATIONS.INFER_MARKET).toBe("inferMarketFromSymbols");
      expect(RECEIVER_OPERATIONS.GET_MARKET_FROM_SYMBOL).toBe(
        "getMarketFromSymbol",
      );
    });

    it("should use camelCase naming convention", () => {
      const operations = Object.values(RECEIVER_OPERATIONS);
      operations.forEach((operation) => {
        expect(operation).toMatch(/^[a-z][a-zA-Z]*$/);
        expect(operation).not.toContain("_");
        expect(operation).not.toContain("-");
        expect(operation).not.toContain(" ");
      });
    });

    it("should be frozen", () => {
      expect(Object.isFrozen(RECEIVER_OPERATIONS)).toBe(true);
    });
  });

  describe("Integration with receiver service", () => {
    it("should support error message templating", () => {
      const maxLength = "20";
      const errorMessage =
        RECEIVER_ERROR_MESSAGES.INVALID_SYMBOL_FORMAT.replace(
          "{maxLength}",
          maxLength,
        );
      expect(errorMessage).toContain("20");
      expect(errorMessage).not.toContain("{maxLength}");
    });

    it("should support performance threshold checking", () => {
      const processingTime = 1500;
      const isSlowRequest =
        processingTime > RECEIVER_PERFORMANCE_THRESHOLDS.SLOW_REQUEST_MS;
      expect(isSlowRequest).toBe(true);
    });

    it("should support data type validation", () => {
      const receiverType = "get-stock-quote";
      const isSupported = SUPPORTED_CAPABILITY_TYPES.includes(receiverType);
      expect(isSupported).toBe(true);

      const invalidDataType = "stock-quote" as any; // old format
      const isUnsupported =
        SUPPORTED_CAPABILITY_TYPES.includes(invalidDataType);
      expect(isUnsupported).toBe(false);
    });

    it("should support symbol validation", () => {
      const symbol = "AAPL";
      const isValidFormat =
        RECEIVER_VALIDATION_RULES.SYMBOL_PATTERN.test(symbol);
      expect(isValidFormat).toBe(true);

      const invalidSymbol = "AAPL@";
      const isInvalidFormat =
        RECEIVER_VALIDATION_RULES.SYMBOL_PATTERN.test(invalidSymbol);
      expect(isInvalidFormat).toBe(false);
    });

    it("should support market recognition", () => {
      const hkSymbol = "00700";
      const isHkPattern =
        MARKET_RECOGNITION_RULES.MARKETS.HK.NUMERIC_PATTERN.test(hkSymbol);
      expect(isHkPattern).toBe(true);

      const usSymbol = "AAPL";
      const isUsPattern =
        MARKET_RECOGNITION_RULES.MARKETS.US.ALPHA_PATTERN.test(usSymbol);
      expect(isUsPattern).toBe(true);
    });
  });
});

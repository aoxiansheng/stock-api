import {
  QUERY_ERROR_MESSAGES,
  QUERY_WARNING_MESSAGES,
  QUERY_SUCCESS_MESSAGES,
  QUERY_PERFORMANCE_CONFIG,
  QUERY_CONFIG,
  QUERY_VALIDATION_RULES,
  QUERY_OPERATIONS,
  QUERY_METRICS,
  QUERY_STATUS,
  QUERY_DEFAULTS,
} from '../../../../../src/core/query/constants/query.constants';

describe('Query Constants', () => {
  describe('QUERY_ERROR_MESSAGES', () => {
    it('should define all error messages', () => {
      expect(QUERY_ERROR_MESSAGES.QUERY_TYPE_REQUIRED).toBe('查询类型不能为空');
      expect(QUERY_ERROR_MESSAGES.UNSUPPORTED_QUERY_TYPE).toContain('{queryType}');
      expect(QUERY_ERROR_MESSAGES.SYMBOLS_REQUIRED_FOR_BY_SYMBOLS).toBe('按股票代码查询时，股票代码列表不能为空');
      expect(QUERY_ERROR_MESSAGES.TOO_MANY_SYMBOLS).toContain('{maxCount}');
      expect(QUERY_ERROR_MESSAGES.INVALID_SYMBOL_FORMAT).toBe('股票代码不能为空字符串');
      expect(QUERY_ERROR_MESSAGES.INVALID_QUERY_LIMIT).toBe('查询限制必须在1-1000之间');
      expect(QUERY_ERROR_MESSAGES.INVALID_QUERY_OFFSET).toBe('查询偏移量不能为负数');
      expect(QUERY_ERROR_MESSAGES.QUERY_VALIDATION_FAILED).toBe('查询请求参数验证失败');
      expect(QUERY_ERROR_MESSAGES.BULK_QUERIES_REQUIRED).toBe('批量查询请求列表不能为空');
      expect(QUERY_ERROR_MESSAGES.TOO_MANY_BULK_QUERIES).toBe('单次批量查询不能超过100个子查询');
      expect(QUERY_ERROR_MESSAGES.MISSING_QUERY_TYPE_IN_BULK).toContain('{index}');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(QUERY_ERROR_MESSAGES)).toBe(true);
    });

    it('should use Chinese messages or templates', () => {
      const messages = Object.values(QUERY_ERROR_MESSAGES);
      messages.forEach(message => {
        // 检查是否包含中文字符或者是模板字符串
        expect(message).toMatch(/[\u4e00-\u9fa5]|{.*}/);
      });
    });
  });

  describe('QUERY_WARNING_MESSAGES', () => {
    it('should define all warning messages', () => {
      expect(QUERY_WARNING_MESSAGES.QUERY_REQUEST_VALIDATION_FAILED).toBe('查询请求验证失败');
      expect(QUERY_WARNING_MESSAGES.SYMBOL_DATA_FETCH_FAILED).toBe('获取股票数据失败');
      expect(QUERY_WARNING_MESSAGES.CACHE_DATA_EXPIRED).toBe('缓存数据已过期');
      expect(QUERY_WARNING_MESSAGES.CACHE_RETRIEVAL_WARNING).toBe('从缓存获取数据失败');
      expect(QUERY_WARNING_MESSAGES.CACHE_STORAGE_WARNING).toBe('查询结果缓存失败');
      expect(QUERY_WARNING_MESSAGES.BULK_QUERY_SINGLE_FAILED).toBe('批量查询中的单个查询失败');
      expect(QUERY_WARNING_MESSAGES.PARTIAL_RESULTS_WARNING).toContain('{actualCount}');
      expect(QUERY_WARNING_MESSAGES.SLOW_QUERY_DETECTED).toBe('检测到慢查询');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(QUERY_WARNING_MESSAGES)).toBe(true);
    });
  });

  describe('QUERY_SUCCESS_MESSAGES', () => {
    it('should define all success messages', () => {
      expect(QUERY_SUCCESS_MESSAGES.QUERY_SERVICE_INITIALIZED).toBe('查询服务初始化完成');
      expect(QUERY_SUCCESS_MESSAGES.QUERY_EXECUTION_STARTED).toBe('开始执行查询');
      expect(QUERY_SUCCESS_MESSAGES.QUERY_EXECUTION_SUCCESS).toBe('查询执行成功');
      expect(QUERY_SUCCESS_MESSAGES.BULK_QUERY_EXECUTION_STARTED).toBe('开始执行批量查询');
      expect(QUERY_SUCCESS_MESSAGES.BULK_QUERY_EXECUTION_COMPLETED).toBe('批量查询执行完成');
      expect(QUERY_SUCCESS_MESSAGES.SYMBOL_QUERY_PROCESSING_STARTED).toBe('开始处理股票代码查询');
      expect(QUERY_SUCCESS_MESSAGES.CACHE_DATA_RETRIEVED).toBe('从缓存获取数据成功');
      expect(QUERY_SUCCESS_MESSAGES.REALTIME_DATA_RETRIEVED).toBe('从实时数据源获取数据成功');
      expect(QUERY_SUCCESS_MESSAGES.QUERY_RESULT_CACHED).toBe('查询结果缓存成功');
      expect(QUERY_SUCCESS_MESSAGES.QUERY_RESULTS_PROCESSED).toBe('查询结果处理完成');
      expect(QUERY_SUCCESS_MESSAGES.QUERY_STATS_RETRIEVED).toBe('获取查询统计信息');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(QUERY_SUCCESS_MESSAGES)).toBe(true);
    });
  });

  describe('QUERY_PERFORMANCE_CONFIG', () => {
    it('should define all performance configuration', () => {
      expect(QUERY_PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD_MS).toBe(1000);
      expect(QUERY_PERFORMANCE_CONFIG.DEFAULT_CACHE_TTL_SECONDS).toBe(3600);
      expect(QUERY_PERFORMANCE_CONFIG.DEFAULT_MAX_CACHE_AGE_SECONDS).toBe(300);
      expect(QUERY_PERFORMANCE_CONFIG.DEFAULT_QUERY_LIMIT).toBe(100);
      expect(QUERY_PERFORMANCE_CONFIG.MAX_SYMBOLS_PER_QUERY).toBe(100);
      expect(QUERY_PERFORMANCE_CONFIG.LOG_SYMBOLS_LIMIT).toBe(3);
      expect(QUERY_PERFORMANCE_CONFIG.MAX_BULK_QUERIES).toBe(100);
      expect(QUERY_PERFORMANCE_CONFIG.QUERY_TIMEOUT_MS).toBe(30000);
      expect(QUERY_PERFORMANCE_CONFIG.CACHE_TIMEOUT_MS).toBe(5000);
      expect(QUERY_PERFORMANCE_CONFIG.REALTIME_FETCH_TIMEOUT_MS).toBe(15000);
    });

    it('should have reasonable performance values', () => {
      expect(QUERY_PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD_MS).toBeGreaterThan(0);
      expect(QUERY_PERFORMANCE_CONFIG.DEFAULT_CACHE_TTL_SECONDS).toBeGreaterThan(0);
      expect(QUERY_PERFORMANCE_CONFIG.DEFAULT_MAX_CACHE_AGE_SECONDS).toBeGreaterThan(0);
      expect(QUERY_PERFORMANCE_CONFIG.DEFAULT_QUERY_LIMIT).toBeGreaterThan(0);
      expect(QUERY_PERFORMANCE_CONFIG.MAX_SYMBOLS_PER_QUERY).toBeGreaterThan(0);
      expect(QUERY_PERFORMANCE_CONFIG.LOG_SYMBOLS_LIMIT).toBeGreaterThan(0);
      expect(QUERY_PERFORMANCE_CONFIG.DEFAULT_MAX_CACHE_AGE_SECONDS).toBeLessThan(QUERY_PERFORMANCE_CONFIG.DEFAULT_CACHE_TTL_SECONDS);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(QUERY_PERFORMANCE_CONFIG)).toBe(true);
    });
  });

  describe('QUERY_CONFIG', () => {
    it('should define all configuration values', () => {
      expect(QUERY_CONFIG.DEFAULT_STORAGE_KEY_SEPARATOR).toBe(':');
      expect(QUERY_CONFIG.QUERY_ID_LENGTH).toBe(8);
      expect(QUERY_CONFIG.MAX_QUERY_LIMIT).toBe(1000);
      expect(QUERY_CONFIG.MIN_QUERY_LIMIT).toBe(1);
      expect(QUERY_CONFIG.DEFAULT_DATA_TYPE).toBe('stock-quote');
      expect(QUERY_CONFIG.DEFAULT_PROVIDER).toBe('unknown');
      expect(QUERY_CONFIG.DEFAULT_MARKET).toBe('unknown');
      expect(QUERY_CONFIG.CACHE_SOURCE_TAG).toBe('realtime');
      expect(QUERY_CONFIG.QPS_CALCULATION_WINDOW_SECONDS).toBe(60);
    });

    it('should have reasonable configuration values', () => {
      expect(QUERY_CONFIG.QUERY_ID_LENGTH).toBeGreaterThan(0);
      expect(QUERY_CONFIG.MAX_QUERY_LIMIT).toBeGreaterThan(QUERY_CONFIG.MIN_QUERY_LIMIT);
      expect(QUERY_CONFIG.QPS_CALCULATION_WINDOW_SECONDS).toBeGreaterThan(0);
      expect(typeof QUERY_CONFIG.DEFAULT_STORAGE_KEY_SEPARATOR).toBe('string');
      expect(typeof QUERY_CONFIG.DEFAULT_DATA_TYPE).toBe('string');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(QUERY_CONFIG)).toBe(true);
    });
  });

  describe('QUERY_VALIDATION_RULES', () => {
    it('should define all validation rules', () => {
      expect(QUERY_VALIDATION_RULES.MIN_SYMBOL_LENGTH).toBe(1);
      expect(QUERY_VALIDATION_RULES.MAX_SYMBOL_LENGTH).toBe(20);
      expect(QUERY_VALIDATION_RULES.MIN_QUERY_LIMIT).toBe(1);
      expect(QUERY_VALIDATION_RULES.MAX_QUERY_LIMIT).toBe(1000);
      expect(QUERY_VALIDATION_RULES.MIN_QUERY_OFFSET).toBe(0);
      expect(QUERY_VALIDATION_RULES.MAX_BULK_QUERIES).toBe(100);
      expect(QUERY_VALIDATION_RULES.SYMBOL_PATTERN).toBeInstanceOf(RegExp);
      expect(QUERY_VALIDATION_RULES.QUERY_ID_PATTERN).toBeInstanceOf(RegExp);
    });

    it('should have reasonable validation values', () => {
      expect(QUERY_VALIDATION_RULES.MIN_SYMBOL_LENGTH).toBeGreaterThan(0);
      expect(QUERY_VALIDATION_RULES.MAX_SYMBOL_LENGTH).toBeGreaterThan(QUERY_VALIDATION_RULES.MIN_SYMBOL_LENGTH);
      expect(QUERY_VALIDATION_RULES.MIN_QUERY_LIMIT).toBeGreaterThan(0);
      expect(QUERY_VALIDATION_RULES.MAX_QUERY_LIMIT).toBeGreaterThan(QUERY_VALIDATION_RULES.MIN_QUERY_LIMIT);
      expect(QUERY_VALIDATION_RULES.MIN_QUERY_OFFSET).toBeGreaterThanOrEqual(0);
      expect(QUERY_VALIDATION_RULES.MAX_BULK_QUERIES).toBeGreaterThan(0);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(QUERY_VALIDATION_RULES)).toBe(true);
    });
  });

  describe('QUERY_OPERATIONS', () => {
    it('should define all operation names', () => {
      expect(QUERY_OPERATIONS.ON_MODULE_INIT).toBe('onModuleInit');
      expect(QUERY_OPERATIONS.EXECUTE_QUERY).toBe('executeQuery');
      expect(QUERY_OPERATIONS.EXECUTE_BULK_QUERY).toBe('executeBulkQuery');
      expect(QUERY_OPERATIONS.VALIDATE_QUERY_REQUEST).toBe('validateQueryRequest');
      expect(QUERY_OPERATIONS.VALIDATE_BULK_QUERY_REQUEST).toBe('validateBulkQueryRequest');
      expect(QUERY_OPERATIONS.PERFORM_QUERY_EXECUTION).toBe('performQueryExecution');
      expect(QUERY_OPERATIONS.EXECUTE_SYMBOL_BASED_QUERY).toBe('executeSymbolBasedQuery');
      expect(QUERY_OPERATIONS.PROCESS_SINGLE_SYMBOL).toBe('processSingleSymbol');
      expect(QUERY_OPERATIONS.FETCH_SYMBOL_DATA).toBe('fetchSymbolData');
      expect(QUERY_OPERATIONS.TRY_GET_FROM_CACHE).toBe('tryGetFromCache');
    });

    it('should use camelCase naming convention', () => {
      const operations = Object.values(QUERY_OPERATIONS);
      operations.forEach(operation => {
        expect(operation).toMatch(/^[a-z][a-zA-Z]*$/);
        expect(operation).not.toContain('_');
        expect(operation).not.toContain('-');
        expect(operation).not.toContain(' ');
      });
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(QUERY_OPERATIONS)).toBe(true);
    });
  });

  describe('QUERY_METRICS', () => {
    it('should define all metric names', () => {
      expect(QUERY_METRICS.TOTAL_QUERIES).toBe('query_total_queries');
      expect(QUERY_METRICS.QUERY_DURATION).toBe('query_duration');
      expect(QUERY_METRICS.CACHE_HIT_RATE).toBe('query_cache_hit_rate');
      expect(QUERY_METRICS.ERROR_RATE).toBe('query_error_rate');
      expect(QUERY_METRICS.SUCCESS_RATE).toBe('query_success_rate');
      expect(QUERY_METRICS.QUERIES_PER_SECOND).toBe('query_qps');
      expect(QUERY_METRICS.SLOW_QUERIES).toBe('query_slow_queries');
      expect(QUERY_METRICS.BULK_QUERIES).toBe('query_bulk_queries');
      expect(QUERY_METRICS.SYMBOL_QUERIES).toBe('query_symbol_queries');
      expect(QUERY_METRICS.CACHE_QUERIES).toBe('query_cache_queries');
    });

    it('should use snake_case naming convention', () => {
      const metrics = Object.values(QUERY_METRICS);
      metrics.forEach(metric => {
        expect(metric).toMatch(/^query_[a-z_]+$/);
        expect(metric).not.toContain(' ');
        expect(metric).not.toContain('-');
      });
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(QUERY_METRICS)).toBe(true);
    });
  });

  describe('QUERY_STATUS', () => {
    it('should define all status values', () => {
      expect(QUERY_STATUS.PENDING).toBe('pending');
      expect(QUERY_STATUS.VALIDATING).toBe('validating');
      expect(QUERY_STATUS.EXECUTING).toBe('executing');
      expect(QUERY_STATUS.PROCESSING_RESULTS).toBe('processing_results');
      expect(QUERY_STATUS.CACHING).toBe('caching');
      expect(QUERY_STATUS.COMPLETED).toBe('completed');
      expect(QUERY_STATUS.FAILED).toBe('failed');
      expect(QUERY_STATUS.TIMEOUT).toBe('timeout');
      expect(QUERY_STATUS.CANCELLED).toBe('cancelled');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(QUERY_STATUS)).toBe(true);
    });
  });

  describe('QUERY_DEFAULTS', () => {
    it('should define all default values', () => {
      expect(QUERY_DEFAULTS.PAGE_SIZE).toBe(100);
      expect(QUERY_DEFAULTS.PAGE_OFFSET).toBe(0);
      expect(QUERY_DEFAULTS.CACHE_TTL_SECONDS).toBe(3600);
      expect(QUERY_DEFAULTS.MAX_CACHE_AGE_SECONDS).toBe(300);
      expect(QUERY_DEFAULTS.TIMEOUT_MS).toBe(30000);
      expect(QUERY_DEFAULTS.RETRY_ATTEMPTS).toBe(3);
      expect(QUERY_DEFAULTS.LOG_LEVEL).toBe('info');
      expect(QUERY_DEFAULTS.ENABLE_CACHING).toBe(true);
      expect(QUERY_DEFAULTS.ENABLE_PERFORMANCE_MONITORING).toBe(true);
      expect(QUERY_DEFAULTS.PARALLEL_EXECUTION).toBe(false);
      expect(QUERY_DEFAULTS.CONTINUE_ON_ERROR).toBe(false);
      expect(QUERY_DEFAULTS.INCLUDE_METADATA).toBe(false);
      expect(QUERY_DEFAULTS.UPDATE_CACHE).toBe(true);
      expect(QUERY_DEFAULTS.USE_CACHE).toBe(true);
    });

    it('should have reasonable default values', () => {
      expect(QUERY_DEFAULTS.PAGE_SIZE).toBeGreaterThan(0);
      expect(QUERY_DEFAULTS.PAGE_OFFSET).toBeGreaterThanOrEqual(0);
      expect(QUERY_DEFAULTS.CACHE_TTL_SECONDS).toBeGreaterThan(0);
      expect(QUERY_DEFAULTS.MAX_CACHE_AGE_SECONDS).toBeGreaterThan(0);
      expect(QUERY_DEFAULTS.TIMEOUT_MS).toBeGreaterThan(0);
      expect(QUERY_DEFAULTS.RETRY_ATTEMPTS).toBeGreaterThan(0);
      expect(typeof QUERY_DEFAULTS.ENABLE_CACHING).toBe('boolean');
      expect(typeof QUERY_DEFAULTS.ENABLE_PERFORMANCE_MONITORING).toBe('boolean');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(QUERY_DEFAULTS)).toBe(true);
    });
  });

  describe('Integration with query service', () => {
    it('should support error message templating', () => {
      const queryType = 'invalid-type';
      const supportedTypes = 'BY_SYMBOLS';
      const errorMessage = QUERY_ERROR_MESSAGES.UNSUPPORTED_QUERY_TYPE
        .replace('{queryType}', queryType)
        .replace('{supportedTypes}', supportedTypes);
      expect(errorMessage).toContain('invalid-type');
      expect(errorMessage).toContain('BY_SYMBOLS');
      expect(errorMessage).not.toContain('{queryType}');
      expect(errorMessage).not.toContain('{supportedTypes}');
    });

    it('should support performance threshold checking', () => {
      const queryTime = 1500;
      const isSlowQuery = queryTime > QUERY_PERFORMANCE_CONFIG.SLOW_QUERY_THRESHOLD_MS;
      expect(isSlowQuery).toBe(true);
    });

    it('should support validation rules', () => {
      const symbolCount = 150;
      const exceedsLimit = symbolCount > QUERY_PERFORMANCE_CONFIG.MAX_SYMBOLS_PER_QUERY;
      expect(exceedsLimit).toBe(true);

      const queryLimit = 500;
      const validLimit = queryLimit >= QUERY_VALIDATION_RULES.MIN_QUERY_LIMIT && 
                        queryLimit <= QUERY_VALIDATION_RULES.MAX_QUERY_LIMIT;
      expect(validLimit).toBe(true);
    });

    it('should support symbol pattern validation', () => {
      const validSymbol = 'AAPL';
      const isValidFormat = QUERY_VALIDATION_RULES.SYMBOL_PATTERN.test(validSymbol);
      expect(isValidFormat).toBe(true);

      const invalidSymbol = 'AAPL@';
      const isInvalidFormat = QUERY_VALIDATION_RULES.SYMBOL_PATTERN.test(invalidSymbol);
      expect(isInvalidFormat).toBe(false);
    });

    it('should support cache configuration', () => {
      const cacheAge = 600; // 10 minutes
      const isExpired = cacheAge > QUERY_PERFORMANCE_CONFIG.DEFAULT_MAX_CACHE_AGE_SECONDS;
      expect(isExpired).toBe(true);

      const cacheTtl = QUERY_PERFORMANCE_CONFIG.DEFAULT_CACHE_TTL_SECONDS;
      expect(cacheTtl).toBeGreaterThan(QUERY_PERFORMANCE_CONFIG.DEFAULT_MAX_CACHE_AGE_SECONDS);
    });
  });
});

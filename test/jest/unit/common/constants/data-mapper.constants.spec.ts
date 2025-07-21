import {
  DATA_MAPPER_ERROR_MESSAGES,
  DATA_MAPPER_WARNING_MESSAGES,
  DATA_MAPPER_SUCCESS_MESSAGES,
  FIELD_SUGGESTION_CONFIG,
  DATA_MAPPER_CONFIG,
  TRANSFORMATION_TYPES,
  TRANSFORMATION_DEFAULTS,
  DATA_MAPPER_PERFORMANCE_THRESHOLDS,
  DATA_MAPPER_METRICS,
  DATA_MAPPER_STATUS,
  DATA_MAPPER_DEFAULTS,
  DATA_TYPE_HANDLERS,
  DATA_MAPPER_FIELD_VALIDATION_RULES,
  DATA_MAPPER_CACHE_CONFIG,
  PATH_RESOLUTION_CONFIG,
} from '../../../../../src/core/data-mapper/constants/data-mapper.constants';

describe('Data Mapper Constants', () => {
  describe('DATA_MAPPER_ERROR_MESSAGES', () => {
    it('should define all error messages', () => {
      expect(DATA_MAPPER_ERROR_MESSAGES.MAPPING_RULE_NOT_FOUND).toBe('映射规则未找到');
      expect(DATA_MAPPER_ERROR_MESSAGES.RULE_ID_NOT_FOUND).toBe('指定ID的映射规则不存在');
      expect(DATA_MAPPER_ERROR_MESSAGES.INVALID_JSON_FORMAT).toBe('无效的JSON格式');
      expect(DATA_MAPPER_ERROR_MESSAGES.JSON_DATA_REQUIRED).toBe('需要提供jsonData或jsonString');
      expect(DATA_MAPPER_ERROR_MESSAGES.TRANSFORMATION_FAILED).toBe('数据转换失败');
      expect(DATA_MAPPER_ERROR_MESSAGES.PATH_RESOLUTION_FAILED).toBe('路径解析失败');
      expect(DATA_MAPPER_ERROR_MESSAGES.MAPPING_TEST_FAILED).toBe('映射规则测试失败');
      expect(DATA_MAPPER_ERROR_MESSAGES.CUSTOM_TRANSFORMATION_NOT_SUPPORTED).toBe('不支持自定义转换');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(DATA_MAPPER_ERROR_MESSAGES)).toBe(true);
    });

    it('should use Chinese messages', () => {
      const messages = Object.values(DATA_MAPPER_ERROR_MESSAGES);
      messages.forEach(message => {
        expect(message).toMatch(/[\u4e00-\u9fa5]/); // Contains Chinese characters
      });
    });
  });

  describe('DATA_MAPPER_WARNING_MESSAGES', () => {
    it('should define all warning messages', () => {
      expect(DATA_MAPPER_WARNING_MESSAGES.CUSTOM_TRANSFORMATIONS_NOT_SUPPORTED).toBe('不支持自定义转换');
      expect(DATA_MAPPER_WARNING_MESSAGES.TRANSFORMATION_FAILED_FALLBACK).toBe('转换失败，返回原始值');
      expect(DATA_MAPPER_WARNING_MESSAGES.PATH_NOT_FOUND).toBe('路径未找到');
      expect(DATA_MAPPER_WARNING_MESSAGES.FIELD_NOT_MAPPED).toBe('字段未映射');
      expect(DATA_MAPPER_WARNING_MESSAGES.EMPTY_MAPPING_RESULT).toBe('映射结果为空');
      expect(DATA_MAPPER_WARNING_MESSAGES.LOW_SIMILARITY_SCORE).toBe('相似度评分较低');
      expect(DATA_MAPPER_WARNING_MESSAGES.LARGE_DATASET_WARNING).toBe('数据集较大，可能影响性能');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(DATA_MAPPER_WARNING_MESSAGES)).toBe(true);
    });
  });

  describe('DATA_MAPPER_SUCCESS_MESSAGES', () => {
    it('should define all success messages', () => {
      expect(DATA_MAPPER_SUCCESS_MESSAGES.RULE_CREATED).toBe('映射规则创建成功');
      expect(DATA_MAPPER_SUCCESS_MESSAGES.RULE_UPDATED).toBe('映射规则更新成功');
      expect(DATA_MAPPER_SUCCESS_MESSAGES.RULE_DELETED).toBe('映射规则删除成功');
      expect(DATA_MAPPER_SUCCESS_MESSAGES.RULE_ACTIVATED).toBe('映射规则激活成功');
      expect(DATA_MAPPER_SUCCESS_MESSAGES.RULE_DEACTIVATED).toBe('映射规则停用成功');
      expect(DATA_MAPPER_SUCCESS_MESSAGES.MAPPING_TEST_SUCCESSFUL).toBe('映射规则测试成功');
      expect(DATA_MAPPER_SUCCESS_MESSAGES.TRANSFORMATION_SUCCESSFUL).toBe('数据转换成功');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(DATA_MAPPER_SUCCESS_MESSAGES)).toBe(true);
    });
  });

  describe('FIELD_SUGGESTION_CONFIG', () => {
    it('should define all field suggestion configuration', () => {
      expect(FIELD_SUGGESTION_CONFIG.SIMILARITY_THRESHOLD).toBe(0.3);
      expect(FIELD_SUGGESTION_CONFIG.MAX_SUGGESTIONS).toBe(3);
      expect(FIELD_SUGGESTION_CONFIG.MIN_FIELD_LENGTH).toBe(1);
      expect(FIELD_SUGGESTION_CONFIG.MAX_FIELD_LENGTH).toBe(100);
      expect(FIELD_SUGGESTION_CONFIG.EXACT_MATCH_SCORE).toBe(1.0);
      expect(FIELD_SUGGESTION_CONFIG.SUBSTRING_MATCH_SCORE).toBe(0.8);
      expect(FIELD_SUGGESTION_CONFIG.CASE_INSENSITIVE).toBe(true);
    });

    it('should have reasonable threshold values', () => {
      expect(FIELD_SUGGESTION_CONFIG.SIMILARITY_THRESHOLD).toBeGreaterThan(0);
      expect(FIELD_SUGGESTION_CONFIG.SIMILARITY_THRESHOLD).toBeLessThan(1);
      expect(FIELD_SUGGESTION_CONFIG.MAX_SUGGESTIONS).toBeGreaterThan(0);
      expect(FIELD_SUGGESTION_CONFIG.EXACT_MATCH_SCORE).toBe(1.0);
      expect(FIELD_SUGGESTION_CONFIG.SUBSTRING_MATCH_SCORE).toBeLessThan(1.0);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(FIELD_SUGGESTION_CONFIG)).toBe(true);
    });
  });

  describe('DATA_MAPPER_CONFIG', () => {
    it('should define all configuration values', () => {
      expect(DATA_MAPPER_CONFIG.MAX_FIELD_MAPPINGS).toBe(100);
      expect(DATA_MAPPER_CONFIG.MAX_NESTED_DEPTH).toBe(10);
      expect(DATA_MAPPER_CONFIG.MAX_ARRAY_SIZE).toBe(1000);
      expect(DATA_MAPPER_CONFIG.DEFAULT_PAGE_SIZE).toBe(10);
      expect(DATA_MAPPER_CONFIG.MAX_PAGE_SIZE).toBe(100);
      expect(DATA_MAPPER_CONFIG.DEFAULT_TIMEOUT_MS).toBe(30000);
      expect(DATA_MAPPER_CONFIG.MAX_RULE_NAME_LENGTH).toBe(100);
      expect(DATA_MAPPER_CONFIG.MAX_DESCRIPTION_LENGTH).toBe(500);
    });

    it('should have reasonable configuration values', () => {
      expect(DATA_MAPPER_CONFIG.MAX_FIELD_MAPPINGS).toBeGreaterThan(0);
      expect(DATA_MAPPER_CONFIG.MAX_NESTED_DEPTH).toBeGreaterThan(0);
      expect(DATA_MAPPER_CONFIG.DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
      expect(DATA_MAPPER_CONFIG.MAX_PAGE_SIZE).toBeGreaterThan(DATA_MAPPER_CONFIG.DEFAULT_PAGE_SIZE);
      expect(DATA_MAPPER_CONFIG.DEFAULT_TIMEOUT_MS).toBeGreaterThan(0);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(DATA_MAPPER_CONFIG)).toBe(true);
    });
  });

  describe('TRANSFORMATION_TYPES', () => {
    it('should define all transformation types', () => {
      expect(TRANSFORMATION_TYPES.MULTIPLY).toBe('multiply');
      expect(TRANSFORMATION_TYPES.DIVIDE).toBe('divide');
      expect(TRANSFORMATION_TYPES.ADD).toBe('add');
      expect(TRANSFORMATION_TYPES.SUBTRACT).toBe('subtract');
      expect(TRANSFORMATION_TYPES.FORMAT).toBe('format');
      expect(TRANSFORMATION_TYPES.CUSTOM).toBe('custom');
      expect(TRANSFORMATION_TYPES.NONE).toBe('none');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(TRANSFORMATION_TYPES)).toBe(true);
    });
  });

  describe('TRANSFORMATION_DEFAULTS', () => {
    it('should define all transformation defaults', () => {
      expect(TRANSFORMATION_DEFAULTS.MULTIPLY_VALUE).toBe(1);
      expect(TRANSFORMATION_DEFAULTS.DIVIDE_VALUE).toBe(1);
      expect(TRANSFORMATION_DEFAULTS.ADD_VALUE).toBe(0);
      expect(TRANSFORMATION_DEFAULTS.SUBTRACT_VALUE).toBe(0);
      expect(TRANSFORMATION_DEFAULTS.FORMAT_TEMPLATE).toBe('{value}');
      expect(TRANSFORMATION_DEFAULTS.VALUE_PLACEHOLDER).toBe('{value}');
    });

    it('should have reasonable default values', () => {
      expect(TRANSFORMATION_DEFAULTS.MULTIPLY_VALUE).toBeGreaterThan(0);
      expect(TRANSFORMATION_DEFAULTS.DIVIDE_VALUE).toBeGreaterThan(0);
      expect(typeof TRANSFORMATION_DEFAULTS.FORMAT_TEMPLATE).toBe('string');
      expect(TRANSFORMATION_DEFAULTS.FORMAT_TEMPLATE).toContain('{value}');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(TRANSFORMATION_DEFAULTS)).toBe(true);
    });
  });

  describe('DATA_MAPPER_PERFORMANCE_THRESHOLDS', () => {
    it('should define all performance thresholds', () => {
      expect(DATA_MAPPER_PERFORMANCE_THRESHOLDS.SLOW_MAPPING_MS).toBe(1000);
      expect(DATA_MAPPER_PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE).toBe(1000);
      expect(DATA_MAPPER_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE_MB).toBe(100);
      expect(DATA_MAPPER_PERFORMANCE_THRESHOLDS.MAX_PROCESSING_TIME_MS).toBe(60000);
      expect(DATA_MAPPER_PERFORMANCE_THRESHOLDS.SIMILARITY_CALCULATION_TIMEOUT_MS).toBe(5000);
    });

    it('should have reasonable threshold values', () => {
      expect(DATA_MAPPER_PERFORMANCE_THRESHOLDS.SLOW_MAPPING_MS).toBeGreaterThan(0);
      expect(DATA_MAPPER_PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE).toBeGreaterThan(0);
      expect(DATA_MAPPER_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE_MB).toBeGreaterThan(0);
      expect(DATA_MAPPER_PERFORMANCE_THRESHOLDS.MAX_PROCESSING_TIME_MS).toBeGreaterThan(DATA_MAPPER_PERFORMANCE_THRESHOLDS.SLOW_MAPPING_MS);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(DATA_MAPPER_PERFORMANCE_THRESHOLDS)).toBe(true);
    });
  });

  describe('DATA_MAPPER_METRICS', () => {
    it('should define all metric names', () => {
      expect(DATA_MAPPER_METRICS.RULES_PROCESSED).toBe('rules_processed');
      expect(DATA_MAPPER_METRICS.FIELDS_MAPPED).toBe('fields_mapped');
      expect(DATA_MAPPER_METRICS.TRANSFORMATIONS_APPLIED).toBe('transformations_applied');
      expect(DATA_MAPPER_METRICS.PROCESSING_TIME_MS).toBe('processing_time_ms');
      expect(DATA_MAPPER_METRICS.SUCCESS_RATE).toBe('success_rate');
      expect(DATA_MAPPER_METRICS.ERROR_RATE).toBe('error_rate');
      expect(DATA_MAPPER_METRICS.SIMILARITY_SCORE).toBe('similarity_score');
      expect(DATA_MAPPER_METRICS.CACHE_HIT_RATE).toBe('cache_hit_rate');
    });

    it('should use snake_case naming convention', () => {
      const metrics = Object.values(DATA_MAPPER_METRICS);
      metrics.forEach(metric => {
        expect(metric).toMatch(/^[a-z_]+$/);
        expect(metric).not.toContain(' ');
        expect(metric).not.toContain('-');
      });
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(DATA_MAPPER_METRICS)).toBe(true);
    });
  });

  describe('DATA_MAPPER_STATUS', () => {
    it('should define all status values', () => {
      expect(DATA_MAPPER_STATUS.ACTIVE).toBe('active');
      expect(DATA_MAPPER_STATUS.INACTIVE).toBe('inactive');
      expect(DATA_MAPPER_STATUS.DRAFT).toBe('draft');
      expect(DATA_MAPPER_STATUS.TESTING).toBe('testing');
      expect(DATA_MAPPER_STATUS.DEPRECATED).toBe('deprecated');
      expect(DATA_MAPPER_STATUS.ERROR).toBe('error');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(DATA_MAPPER_STATUS)).toBe(true);
    });
  });

  describe('DATA_MAPPER_DEFAULTS', () => {
    it('should define all default values', () => {
      expect(DATA_MAPPER_DEFAULTS.PAGE_NUMBER).toBe(1);
      expect(DATA_MAPPER_DEFAULTS.PAGE_SIZE).toBe(10);
      expect(DATA_MAPPER_DEFAULTS.RULE_STATUS).toBe(DATA_MAPPER_STATUS.ACTIVE);
      expect(DATA_MAPPER_DEFAULTS.SIMILARITY_THRESHOLD).toBe(FIELD_SUGGESTION_CONFIG.SIMILARITY_THRESHOLD);
      expect(DATA_MAPPER_DEFAULTS.MAX_SUGGESTIONS).toBe(FIELD_SUGGESTION_CONFIG.MAX_SUGGESTIONS);
      expect(DATA_MAPPER_DEFAULTS.TIMEOUT_MS).toBe(10000);
      expect(DATA_MAPPER_DEFAULTS.RETRY_ATTEMPTS).toBe(3);
      expect(DATA_MAPPER_DEFAULTS.ENABLE_CACHING).toBe(true);
      expect(DATA_MAPPER_DEFAULTS.LOG_LEVEL).toBe('info');
    });

    it('should have reasonable default values', () => {
      expect(DATA_MAPPER_DEFAULTS.PAGE_NUMBER).toBeGreaterThan(0);
      expect(DATA_MAPPER_DEFAULTS.PAGE_SIZE).toBeGreaterThan(0);
      expect(DATA_MAPPER_DEFAULTS.TIMEOUT_MS).toBeGreaterThan(0);
      expect(DATA_MAPPER_DEFAULTS.RETRY_ATTEMPTS).toBeGreaterThan(0);
      expect(typeof DATA_MAPPER_DEFAULTS.ENABLE_CACHING).toBe('boolean');
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(DATA_MAPPER_DEFAULTS)).toBe(true);
    });
  });

  describe('DATA_TYPE_HANDLERS', () => {
    it('should define all data type handlers', () => {
      expect(DATA_TYPE_HANDLERS.ARRAY_FIELDS).toEqual(['secu_quote', 'basic_info', 'data', 'items']);
      expect(DATA_TYPE_HANDLERS.OBJECT_FIELDS).toEqual(['metadata', 'config', 'settings']);
      expect(DATA_TYPE_HANDLERS.PRIMITIVE_FIELDS).toEqual(['string', 'number', 'boolean', 'date']);
      expect(DATA_TYPE_HANDLERS.NESTED_SEPARATORS).toEqual(['.', '[', ']']);
      expect(DATA_TYPE_HANDLERS.PATH_DELIMITERS).toEqual(/[.\[\]]/);
    });

    it('should be frozen', () => {
      expect(Object.isFrozen(DATA_TYPE_HANDLERS)).toBe(true);
    });
  });

  describe('Integration with data mapper service', () => {
    it('should support error message construction', () => {
      const ruleId = 'test-rule-id';
      const errorMessage = `${DATA_MAPPER_ERROR_MESSAGES.RULE_ID_NOT_FOUND}: ${ruleId}`;
      expect(errorMessage).toBe('指定ID的映射规则不存在: test-rule-id');
    });

    it('should support performance threshold checking', () => {
      const processingTime = 1500;
      const isSlowMapping = processingTime > DATA_MAPPER_PERFORMANCE_THRESHOLDS.SLOW_MAPPING_MS;
      expect(isSlowMapping).toBe(true);
    });

    it('should support transformation type validation', () => {
      const validTypes = Object.values(TRANSFORMATION_TYPES);
      expect(validTypes).toContain('multiply');
      expect(validTypes).toContain('divide');
      expect(validTypes).toContain('format');
    });

    it('should support field suggestion configuration', () => {
      const similarity = 0.5;
      const isAboveThreshold = similarity > FIELD_SUGGESTION_CONFIG.SIMILARITY_THRESHOLD;
      expect(isAboveThreshold).toBe(true);
    });
  });
});

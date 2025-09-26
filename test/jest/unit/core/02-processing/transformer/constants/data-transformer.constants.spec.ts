import {
  DATATRANSFORM_ERROR_MESSAGES,
  TRANSFORM_WARNING_MESSAGES,
  DATATRANSFORM_CONFIG,
  DATATRANSFORM_PERFORMANCE_THRESHOLDS,
  TRANSFORM_METRICS,
  TRANSFORM_STATUS,
  FIELD_VALIDATION_RULES,
  DATA_TYPE_CONVERSIONS,
  TRANSFORM_PRIORITIES,
  BATCH_TRANSFORM_OPTIONS,
  TRANSFORM_CACHE_CONFIG,
  TRANSFORM_LOG_LEVELS,
  TRANSFORM_EVENTS,
  TRANSFORM_DEFAULTS,
  TRANSFORM_RULE_TYPES,
  TRANSFORM_RESULT_FORMATS,
  TRANSFORM_QUALITY_METRICS,
} from '@core/02-processing/transformer/constants/data-transformer.constants';

describe('DataTransformerConstants', () => {
  describe('DATATRANSFORM_ERROR_MESSAGES', () => {
    it('should define all required error messages', () => {
      expect(DATATRANSFORM_ERROR_MESSAGES.NO_MAPPING_RULE).toBe('未找到匹配的映射规则');
      expect(DATATRANSFORM_ERROR_MESSAGES.TRANSFORMATION_FAILED).toBe('数据转换失败');
      expect(DATATRANSFORM_ERROR_MESSAGES.VALIDATION_FAILED).toBe('转换后数据验证失败');
      expect(DATATRANSFORM_ERROR_MESSAGES.INVALID_RAW_DATA).toBe('原始数据格式无效');
      expect(DATATRANSFORM_ERROR_MESSAGES.MISSING_REQUIRED_FIELDS).toBe('缺少必需字段');
      expect(DATATRANSFORM_ERROR_MESSAGES.RULE_NOT_FOUND).toBe('指定的映射规则不存在');
      expect(DATATRANSFORM_ERROR_MESSAGES.BATCH_TRANSFORMATION_FAILED).toBe('批量转换失败');
      expect(DATATRANSFORM_ERROR_MESSAGES.PREVIEW_GENERATION_FAILED).toBe('预览生成失败');
      expect(DATATRANSFORM_ERROR_MESSAGES.SAMPLE_DATA_EXTRACTION_FAILED).toBe('样本数据提取失败');
      expect(DATATRANSFORM_ERROR_MESSAGES.FIELD_MAPPING_ERROR).toBe('字段映射错误');
    });

    it('should be frozen', () => {
      expect(() => {
        (DATATRANSFORM_ERROR_MESSAGES as any).TEST = 'test';
      }).toThrow();
    });
  });

  describe('TRANSFORM_WARNING_MESSAGES', () => {
    it('should define all required warning messages', () => {
      expect(TRANSFORM_WARNING_MESSAGES.EMPTY_TRANSFORMED_DATA).toBe('转换后数据为空');
      expect(TRANSFORM_WARNING_MESSAGES.MISSING_EXPECTED_FIELDS).toBe('转换后数据缺少预期字段');
      expect(TRANSFORM_WARNING_MESSAGES.NULL_FIELD_VALUES).toBe('字段值为空或未定义');
      expect(TRANSFORM_WARNING_MESSAGES.PARTIAL_TRANSFORMATION).toBe('部分数据转换成功');
      expect(TRANSFORM_WARNING_MESSAGES.PERFORMANCE_WARNING).toBe('转换性能较慢');
      expect(TRANSFORM_WARNING_MESSAGES.LARGE_DATASET_WARNING).toBe('数据集较大，可能影响性能');
    });

    it('should be frozen', () => {
      expect(() => {
        (TRANSFORM_WARNING_MESSAGES as any).TEST = 'test';
      }).toThrow();
    });
  });

  describe('DATATRANSFORM_CONFIG', () => {
    it('should define configuration values with correct types', () => {
      expect(typeof DATATRANSFORM_CONFIG.MAX_BATCH_SIZE).toBe('number');
      expect(typeof DATATRANSFORM_CONFIG.MAX_FIELD_MAPPINGS).toBe('number');
      expect(typeof DATATRANSFORM_CONFIG.MAX_SAMPLE_SIZE).toBe('number');
      expect(typeof DATATRANSFORM_CONFIG.DEFAULT_TIMEOUT_MS).toBe('number');
      expect(typeof DATATRANSFORM_CONFIG.MAX_NESTED_DEPTH).toBe('number');
      expect(typeof DATATRANSFORM_CONFIG.MAX_STRING_LENGTH).toBe('number');
      expect(typeof DATATRANSFORM_CONFIG.MAX_ARRAY_LENGTH).toBe('number');
    });

    it('should have reasonable configuration limits', () => {
      expect(DATATRANSFORM_CONFIG.MAX_FIELD_MAPPINGS).toBe(100);
      expect(DATATRANSFORM_CONFIG.MAX_SAMPLE_SIZE).toBe(10);
      expect(DATATRANSFORM_CONFIG.MAX_NESTED_DEPTH).toBe(10);
      expect(DATATRANSFORM_CONFIG.MAX_STRING_LENGTH).toBe(10000);
      expect(DATATRANSFORM_CONFIG.MAX_ARRAY_LENGTH).toBe(10000);
    });
  });

  describe('DATATRANSFORM_PERFORMANCE_THRESHOLDS', () => {
    it('should define performance threshold values', () => {
      expect(typeof DATATRANSFORM_PERFORMANCE_THRESHOLDS.SLOW_TRANSFORMATION_MS).toBe('number');
      expect(typeof DATATRANSFORM_PERFORMANCE_THRESHOLDS.LARGE_DATASET_SIZE).toBe('number');
      expect(typeof DATATRANSFORM_PERFORMANCE_THRESHOLDS.HIGH_MEMORY_USAGE_MB).toBe('number');
      expect(typeof DATATRANSFORM_PERFORMANCE_THRESHOLDS.MAX_PROCESSING_TIME_MS).toBe('number');
    });
  });

  describe('TRANSFORM_METRICS', () => {
    it('should define all metrics constants', () => {
      expect(TRANSFORM_METRICS.RECORDS_PROCESSED).toBe('records_processed');
      expect(TRANSFORM_METRICS.FIELDS_TRANSFORMED).toBe('fields_transformed');
      expect(TRANSFORM_METRICS.PROCESSING_TIME_MS).toBe('processing_time_ms');
      expect(TRANSFORM_METRICS.SUCCESS_RATE).toBe('success_rate');
      expect(TRANSFORM_METRICS.ERROR_RATE).toBe('error_rate');
      expect(TRANSFORM_METRICS.MEMORY_USAGE_MB).toBe('memory_usage_mb');
      expect(TRANSFORM_METRICS.THROUGHPUT_PER_SECOND).toBe('throughput_per_second');
    });
  });

  describe('TRANSFORM_STATUS', () => {
    it('should define all status constants', () => {
      expect(TRANSFORM_STATUS.PROCESSING).toBe('processing');
      expect(TRANSFORM_STATUS.SUCCESS).toBe('success');
      expect(TRANSFORM_STATUS.FAILED).toBe('failed');
      expect(TRANSFORM_STATUS.PARTIAL_SUCCESS).toBe('partial_success');
      expect(TRANSFORM_STATUS.CANCELLED).toBe('cancelled');
      expect(TRANSFORM_STATUS.TIMEOUT).toBe('timeout');
    });
  });

  describe('FIELD_VALIDATION_RULES', () => {
    it('should define all validation rules', () => {
      expect(FIELD_VALIDATION_RULES.REQUIRED).toBe('required');
      expect(FIELD_VALIDATION_RULES.OPTIONAL).toBe('optional');
      expect(FIELD_VALIDATION_RULES.NUMERIC).toBe('numeric');
      expect(FIELD_VALIDATION_RULES.STRING).toBe('string');
      expect(FIELD_VALIDATION_RULES.BOOLEAN).toBe('boolean');
      expect(FIELD_VALIDATION_RULES.DATE).toBe('date');
      expect(FIELD_VALIDATION_RULES.ARRAY).toBe('array');
      expect(FIELD_VALIDATION_RULES.OBJECT).toBe('object');
      expect(FIELD_VALIDATION_RULES.EMAIL).toBe('email');
      expect(FIELD_VALIDATION_RULES.URL).toBe('url');
    });
  });

  describe('DATA_TYPE_CONVERSIONS', () => {
    it('should define all conversion types', () => {
      expect(DATA_TYPE_CONVERSIONS.STRING_TO_NUMBER).toBe('string_to_number');
      expect(DATA_TYPE_CONVERSIONS.NUMBER_TO_STRING).toBe('number_to_string');
      expect(DATA_TYPE_CONVERSIONS.STRING_TO_DATE).toBe('string_to_date');
      expect(DATA_TYPE_CONVERSIONS.DATE_TO_STRING).toBe('date_to_string');
      expect(DATA_TYPE_CONVERSIONS.BOOLEAN_TO_STRING).toBe('boolean_to_string');
      expect(DATA_TYPE_CONVERSIONS.STRING_TO_BOOLEAN).toBe('string_to_boolean');
      expect(DATA_TYPE_CONVERSIONS.ARRAY_TO_STRING).toBe('array_to_string');
      expect(DATA_TYPE_CONVERSIONS.STRING_TO_ARRAY).toBe('string_to_array');
    });
  });

  describe('TRANSFORM_PRIORITIES', () => {
    it('should define priority levels with correct values', () => {
      expect(TRANSFORM_PRIORITIES.HIGH).toBe(1);
      expect(TRANSFORM_PRIORITIES.MEDIUM).toBe(2);
      expect(TRANSFORM_PRIORITIES.LOW).toBe(3);
      expect(TRANSFORM_PRIORITIES.BACKGROUND).toBe(4);
    });

    it('should maintain priority order', () => {
      expect(TRANSFORM_PRIORITIES.HIGH).toBeLessThan(TRANSFORM_PRIORITIES.MEDIUM);
      expect(TRANSFORM_PRIORITIES.MEDIUM).toBeLessThan(TRANSFORM_PRIORITIES.LOW);
      expect(TRANSFORM_PRIORITIES.LOW).toBeLessThan(TRANSFORM_PRIORITIES.BACKGROUND);
    });
  });

  describe('BATCH_TRANSFORM_OPTIONS', () => {
    it('should define all batch options', () => {
      expect(BATCH_TRANSFORM_OPTIONS.CONTINUE_ON_ERROR).toBe('continueOnError');
      expect(BATCH_TRANSFORM_OPTIONS.PARALLEL_PROCESSING).toBe('parallelProcessing');
      expect(BATCH_TRANSFORM_OPTIONS.INCLUDE_METADATA).toBe('includeMetadata');
      expect(BATCH_TRANSFORM_OPTIONS.ENABLE_CACHING).toBe('enableCaching');
    });
  });

  describe('TRANSFORM_CACHE_CONFIG', () => {
    it('should define cache configuration with correct types', () => {
      expect(typeof TRANSFORM_CACHE_CONFIG.RULE_CACHE_TTL).toBe('number');
      expect(typeof TRANSFORM_CACHE_CONFIG.RESULT_CACHE_TTL).toBe('number');
      expect(typeof TRANSFORM_CACHE_CONFIG.MAX_CACHE_SIZE).toBe('number');
      expect(typeof TRANSFORM_CACHE_CONFIG.CACHE_KEY_PREFIX).toBe('string');
    });

    it('should have reasonable cache configuration values', () => {
      expect(TRANSFORM_CACHE_CONFIG.RULE_CACHE_TTL).toBe(1800);
      expect(TRANSFORM_CACHE_CONFIG.RESULT_CACHE_TTL).toBe(300);
      expect(TRANSFORM_CACHE_CONFIG.MAX_CACHE_SIZE).toBe(1000);
      expect(TRANSFORM_CACHE_CONFIG.CACHE_KEY_PREFIX).toBe('transform:');
    });
  });

  describe('TRANSFORM_LOG_LEVELS', () => {
    it('should define all log levels', () => {
      expect(TRANSFORM_LOG_LEVELS.DEBUG).toBe('debug');
      expect(TRANSFORM_LOG_LEVELS.INFO).toBe('info');
      expect(TRANSFORM_LOG_LEVELS.WARN).toBe('warn');
      expect(TRANSFORM_LOG_LEVELS.ERROR).toBe('error');
      expect(TRANSFORM_LOG_LEVELS.FATAL).toBe('fatal');
    });
  });

  describe('TRANSFORM_EVENTS', () => {
    it('should define all event types', () => {
      expect(TRANSFORM_EVENTS.TRANSFORMATION_STARTED).toBe('transformation.started');
      expect(TRANSFORM_EVENTS.TRANSFORMATION_COMPLETED).toBe('transformation.completed');
      expect(TRANSFORM_EVENTS.TRANSFORMATION_FAILED).toBe('transformation.failed');
      expect(TRANSFORM_EVENTS.BATCH_TRANSFORMATION_STARTED).toBe('batch.transformation.started');
      expect(TRANSFORM_EVENTS.BATCH_TRANSFORMATION_COMPLETED).toBe('batch.transformation.completed');
      expect(TRANSFORM_EVENTS.RULE_APPLIED).toBe('rule.applied');
      expect(TRANSFORM_EVENTS.VALIDATION_COMPLETED).toBe('validation.completed');
      expect(TRANSFORM_EVENTS.PERFORMANCE_WARNING).toBe('performance.warning');
    });
  });

  describe('TRANSFORM_DEFAULTS', () => {
    it('should define default configuration values', () => {
      expect(typeof TRANSFORM_DEFAULTS.TIMEOUT_MS).toBe('number');
      expect(typeof TRANSFORM_DEFAULTS.INCLUDE_METADATA).toBe('boolean');
      expect(typeof TRANSFORM_DEFAULTS.CONTINUE_ON_ERROR).toBe('boolean');
      expect(typeof TRANSFORM_DEFAULTS.ENABLE_CACHING).toBe('boolean');
      expect(typeof TRANSFORM_DEFAULTS.LOG_LEVEL).toBe('string');
    });

    it('should have sensible default values', () => {
      expect(TRANSFORM_DEFAULTS.TIMEOUT_MS).toBe(10000);
      expect(TRANSFORM_DEFAULTS.INCLUDE_METADATA).toBe(false);
      expect(TRANSFORM_DEFAULTS.CONTINUE_ON_ERROR).toBe(false);
      expect(TRANSFORM_DEFAULTS.ENABLE_CACHING).toBe(true);
      expect(TRANSFORM_DEFAULTS.LOG_LEVEL).toBe(TRANSFORM_LOG_LEVELS.INFO);
    });
  });

  describe('TRANSFORM_RULE_TYPES', () => {
    it('should define all rule types', () => {
      expect(TRANSFORM_RULE_TYPES.FIELD_MAPPING).toBe('field_mapping');
      expect(TRANSFORM_RULE_TYPES.DATA_AGGREGATION).toBe('data_aggregation');
      expect(TRANSFORM_RULE_TYPES.FORMAT_CONVERSION).toBe('format_conversion');
      expect(TRANSFORM_RULE_TYPES.VALIDATION_RULE).toBe('validation_rule');
      expect(TRANSFORM_RULE_TYPES.CUSTOM_TRANSFORMATION).toBe('custom_transformation');
    });
  });

  describe('TRANSFORM_RESULT_FORMATS', () => {
    it('should define all result formats', () => {
      expect(TRANSFORM_RESULT_FORMATS.JSON).toBe('json');
      expect(TRANSFORM_RESULT_FORMATS.XML).toBe('xml');
      expect(TRANSFORM_RESULT_FORMATS.CSV).toBe('csv');
      expect(TRANSFORM_RESULT_FORMATS.YAML).toBe('yaml');
      expect(TRANSFORM_RESULT_FORMATS.PLAIN_TEXT).toBe('plain_text');
    });
  });

  describe('TRANSFORM_QUALITY_METRICS', () => {
    it('should define all quality metrics', () => {
      expect(TRANSFORM_QUALITY_METRICS.COMPLETENESS).toBe('completeness');
      expect(TRANSFORM_QUALITY_METRICS.ACCURACY).toBe('accuracy');
      expect(TRANSFORM_QUALITY_METRICS.CONSISTENCY).toBe('consistency');
      expect(TRANSFORM_QUALITY_METRICS.VALIDITY).toBe('validity');
      expect(TRANSFORM_QUALITY_METRICS.TIMELINESS).toBe('timeliness');
    });
  });
});

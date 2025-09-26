import {
  DATA_MAPPER_ERROR_MESSAGES,
  DATA_MAPPER_WARNING_MESSAGES,
  DATA_MAPPER_SUCCESS_MESSAGES,
  FIELD_SUGGESTION_CONFIG,
  DATA_MAPPER_CONFIG,
  TRANSFORMATION_TYPES,
  TransformationType,
  TRANSFORMATION_TYPE_VALUES,
  API_TYPES,
  ApiType,
  API_TYPE_VALUES,
  RULE_LIST_TYPES,
  RuleListType,
  RULE_LIST_TYPE_VALUES,
  TRANSFORMATION_DEFAULTS,
  DATA_MAPPER_DEFAULTS,
} from '../../../../../../../src/core/00-prepare/data-mapper/constants/data-mapper.constants';

describe('Data Mapper Constants', () => {
  describe('DATA_MAPPER_ERROR_MESSAGES', () => {
    it('should be frozen and contain all expected error messages', () => {
      expect(Object.isFrozen(DATA_MAPPER_ERROR_MESSAGES)).toBe(true);

      const expectedKeys = [
        'MAPPING_RULE_NOT_FOUND',
        'RULE_ID_NOT_FOUND',
        'INVALID_JSON_FORMAT',
        'JSON_DATA_REQUIRED',
        'TRANSFORMATION_FAILED',
        'PATH_RESOLUTION_FAILED',
        'MAPPING_TEST_FAILED',
        'CUSTOM_TRANSFORMATION_NOT_SUPPORTED',
        'FIELD_MAPPING_ERROR',
        'RULE_CREATION_FAILED',
        'RULE_UPDATE_FAILED',
        'RULE_DELETION_FAILED',
      ];

      expectedKeys.forEach(key => {
        expect(DATA_MAPPER_ERROR_MESSAGES).toHaveProperty(key);
        expect(typeof DATA_MAPPER_ERROR_MESSAGES[key]).toBe('string');
        expect(DATA_MAPPER_ERROR_MESSAGES[key].length).toBeGreaterThan(0);
      });
    });

    it('should contain Chinese error messages', () => {
      expect(DATA_MAPPER_ERROR_MESSAGES.MAPPING_RULE_NOT_FOUND).toBe('映射规则未找到');
      expect(DATA_MAPPER_ERROR_MESSAGES.TRANSFORMATION_FAILED).toBe('数据转换失败');
      expect(DATA_MAPPER_ERROR_MESSAGES.INVALID_JSON_FORMAT).toBe('无效的JSON格式');
    });
  });

  describe('DATA_MAPPER_WARNING_MESSAGES', () => {
    it('should be frozen and contain all expected warning messages', () => {
      expect(Object.isFrozen(DATA_MAPPER_WARNING_MESSAGES)).toBe(true);

      const expectedKeys = [
        'CUSTOM_TRANSFORMATIONS_NOT_SUPPORTED',
        'TRANSFORMATION_FAILED_FALLBACK',
        'PATH_NOT_FOUND',
        'FIELD_NOT_MAPPED',
        'EMPTY_MAPPING_RESULT',
        'LOW_SIMILARITY_SCORE',
        'LARGE_DATASET_WARNING',
      ];

      expectedKeys.forEach(key => {
        expect(DATA_MAPPER_WARNING_MESSAGES).toHaveProperty(key);
        expect(typeof DATA_MAPPER_WARNING_MESSAGES[key]).toBe('string');
        expect(DATA_MAPPER_WARNING_MESSAGES[key].length).toBeGreaterThan(0);
      });
    });

    it('should contain meaningful warning messages', () => {
      expect(DATA_MAPPER_WARNING_MESSAGES.TRANSFORMATION_FAILED_FALLBACK).toBe('转换失败，返回原始值');
      expect(DATA_MAPPER_WARNING_MESSAGES.LOW_SIMILARITY_SCORE).toBe('相似度评分较低');
    });
  });

  describe('DATA_MAPPER_SUCCESS_MESSAGES', () => {
    it('should be frozen and contain all expected success messages', () => {
      expect(Object.isFrozen(DATA_MAPPER_SUCCESS_MESSAGES)).toBe(true);

      const expectedKeys = [
        'RULE_CREATED',
        'RULE_UPDATED',
        'RULE_DELETED',
        'RULE_ACTIVATED',
        'RULE_DEACTIVATED',
        'MAPPING_TEST_SUCCESSFUL',
        'TRANSFORMATION_SUCCESSFUL',
      ];

      expectedKeys.forEach(key => {
        expect(DATA_MAPPER_SUCCESS_MESSAGES).toHaveProperty(key);
        expect(typeof DATA_MAPPER_SUCCESS_MESSAGES[key]).toBe('string');
        expect(DATA_MAPPER_SUCCESS_MESSAGES[key].length).toBeGreaterThan(0);
      });
    });

    it('should contain positive success messages', () => {
      expect(DATA_MAPPER_SUCCESS_MESSAGES.RULE_CREATED).toBe('映射规则创建成功');
      expect(DATA_MAPPER_SUCCESS_MESSAGES.TRANSFORMATION_SUCCESSFUL).toBe('数据转换成功');
    });
  });

  describe('FIELD_SUGGESTION_CONFIG', () => {
    it('should be frozen and contain valid configuration values', () => {
      expect(Object.isFrozen(FIELD_SUGGESTION_CONFIG)).toBe(true);

      expect(FIELD_SUGGESTION_CONFIG.SIMILARITY_THRESHOLD).toBe(0.3);
      expect(FIELD_SUGGESTION_CONFIG.MAX_SUGGESTIONS).toBe(3);
      expect(FIELD_SUGGESTION_CONFIG.MIN_FIELD_LENGTH).toBe(1);
      expect(FIELD_SUGGESTION_CONFIG.MAX_FIELD_LENGTH).toBe(100);
      expect(FIELD_SUGGESTION_CONFIG.EXACT_MATCH_SCORE).toBe(1.0);
      expect(FIELD_SUGGESTION_CONFIG.SUBSTRING_MATCH_SCORE).toBe(0.8);
      expect(FIELD_SUGGESTION_CONFIG.CASE_INSENSITIVE).toBe(true);
    });

    it('should have valid numeric ranges', () => {
      expect(FIELD_SUGGESTION_CONFIG.SIMILARITY_THRESHOLD).toBeGreaterThan(0);
      expect(FIELD_SUGGESTION_CONFIG.SIMILARITY_THRESHOLD).toBeLessThanOrEqual(1);
      expect(FIELD_SUGGESTION_CONFIG.MAX_SUGGESTIONS).toBeGreaterThan(0);
      expect(FIELD_SUGGESTION_CONFIG.MIN_FIELD_LENGTH).toBeGreaterThanOrEqual(1);
      expect(FIELD_SUGGESTION_CONFIG.MAX_FIELD_LENGTH).toBeGreaterThan(FIELD_SUGGESTION_CONFIG.MIN_FIELD_LENGTH);
    });
  });

  describe('DATA_MAPPER_CONFIG', () => {
    it('should be frozen and contain valid configuration values', () => {
      expect(Object.isFrozen(DATA_MAPPER_CONFIG)).toBe(true);

      expect(typeof DATA_MAPPER_CONFIG.MAX_FIELD_MAPPINGS).toBe('number');
      expect(typeof DATA_MAPPER_CONFIG.MAX_NESTED_DEPTH).toBe('number');
      expect(typeof DATA_MAPPER_CONFIG.MAX_ARRAY_SIZE).toBe('number');
      expect(typeof DATA_MAPPER_CONFIG.DEFAULT_PAGE_SIZE).toBe('number');
      expect(typeof DATA_MAPPER_CONFIG.MAX_PAGE_SIZE).toBe('number');
      expect(typeof DATA_MAPPER_CONFIG.DEFAULT_TIMEOUT_MS).toBe('number');
      expect(typeof DATA_MAPPER_CONFIG.MAX_RULE_NAME_LENGTH).toBe('number');
      expect(typeof DATA_MAPPER_CONFIG.MAX_DESCRIPTION_LENGTH).toBe('number');
    });

    it('should have sensible limits', () => {
      expect(DATA_MAPPER_CONFIG.MAX_FIELD_MAPPINGS).toBe(100);
      expect(DATA_MAPPER_CONFIG.MAX_NESTED_DEPTH).toBe(10);
      expect(DATA_MAPPER_CONFIG.MAX_ARRAY_SIZE).toBe(1000);
      expect(DATA_MAPPER_CONFIG.DEFAULT_PAGE_SIZE).toBe(10);
      expect(DATA_MAPPER_CONFIG.MAX_PAGE_SIZE).toBe(100);
      expect(DATA_MAPPER_CONFIG.MAX_RULE_NAME_LENGTH).toBe(100);
      expect(DATA_MAPPER_CONFIG.MAX_DESCRIPTION_LENGTH).toBe(500);
      expect(DATA_MAPPER_CONFIG.DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(DATA_MAPPER_CONFIG.MAX_PAGE_SIZE);
    });
  });

  describe('TRANSFORMATION_TYPES', () => {
    it('should be frozen and contain all transformation types', () => {
      expect(Object.isFrozen(TRANSFORMATION_TYPES)).toBe(true);

      const expectedTypes = [
        'MULTIPLY',
        'DIVIDE',
        'ADD',
        'SUBTRACT',
        'FORMAT',
        'CUSTOM',
        'NONE',
      ];

      expectedTypes.forEach(type => {
        expect(TRANSFORMATION_TYPES).toHaveProperty(type);
        expect(typeof TRANSFORMATION_TYPES[type]).toBe('string');
      });
    });

    it('should have consistent values', () => {
      expect(TRANSFORMATION_TYPES.MULTIPLY).toBe('multiply');
      expect(TRANSFORMATION_TYPES.DIVIDE).toBe('divide');
      expect(TRANSFORMATION_TYPES.ADD).toBe('add');
      expect(TRANSFORMATION_TYPES.SUBTRACT).toBe('subtract');
      expect(TRANSFORMATION_TYPES.FORMAT).toBe('format');
      expect(TRANSFORMATION_TYPES.CUSTOM).toBe('custom');
      expect(TRANSFORMATION_TYPES.NONE).toBe('none');
    });

    it('should match TRANSFORMATION_TYPE_VALUES array', () => {
      const valuesFromObject = Object.values(TRANSFORMATION_TYPES);
      expect(TRANSFORMATION_TYPE_VALUES).toEqual(valuesFromObject);
      expect(TRANSFORMATION_TYPE_VALUES.length).toBe(7);
    });
  });

  describe('API_TYPES', () => {
    it('should be frozen and contain all API types', () => {
      expect(Object.isFrozen(API_TYPES)).toBe(true);

      expect(API_TYPES.REST).toBe('rest');
      expect(API_TYPES.STREAM).toBe('stream');
    });

    it('should match API_TYPE_VALUES array', () => {
      const valuesFromObject = Object.values(API_TYPES);
      expect(API_TYPE_VALUES).toEqual(valuesFromObject);
      expect(API_TYPE_VALUES.length).toBe(2);
    });
  });

  describe('RULE_LIST_TYPES', () => {
    it('should be frozen and contain all rule list types', () => {
      expect(Object.isFrozen(RULE_LIST_TYPES)).toBe(true);

      expect(RULE_LIST_TYPES.QUOTE_FIELDS).toBe('quote_fields');
      expect(RULE_LIST_TYPES.BASIC_INFO_FIELDS).toBe('basic_info_fields');
      expect(RULE_LIST_TYPES.INDEX_FIELDS).toBe('index_fields');
    });

    it('should match RULE_LIST_TYPE_VALUES array', () => {
      const valuesFromObject = Object.values(RULE_LIST_TYPES);
      expect(RULE_LIST_TYPE_VALUES).toEqual(valuesFromObject);
      expect(RULE_LIST_TYPE_VALUES.length).toBe(3);
    });
  });

  describe('TRANSFORMATION_DEFAULTS', () => {
    it('should be frozen and contain valid default values', () => {
      expect(Object.isFrozen(TRANSFORMATION_DEFAULTS)).toBe(true);

      expect(TRANSFORMATION_DEFAULTS.MULTIPLY_VALUE).toBe(1);
      expect(TRANSFORMATION_DEFAULTS.DIVIDE_VALUE).toBe(1);
      expect(TRANSFORMATION_DEFAULTS.ADD_VALUE).toBe(0);
      expect(TRANSFORMATION_DEFAULTS.SUBTRACT_VALUE).toBe(0);
      expect(TRANSFORMATION_DEFAULTS.FORMAT_TEMPLATE).toBe('{value}');
      expect(TRANSFORMATION_DEFAULTS.VALUE_PLACEHOLDER).toBe('{value}');
    });

    it('should have mathematically neutral defaults', () => {
      // Multiplication and division by 1 should not change values
      expect(TRANSFORMATION_DEFAULTS.MULTIPLY_VALUE).toBe(1);
      expect(TRANSFORMATION_DEFAULTS.DIVIDE_VALUE).toBe(1);
      // Addition and subtraction by 0 should not change values
      expect(TRANSFORMATION_DEFAULTS.ADD_VALUE).toBe(0);
      expect(TRANSFORMATION_DEFAULTS.SUBTRACT_VALUE).toBe(0);
    });
  });

  describe('DATA_MAPPER_DEFAULTS', () => {
    it('should be frozen and contain valid default values', () => {
      expect(Object.isFrozen(DATA_MAPPER_DEFAULTS)).toBe(true);

      expect(DATA_MAPPER_DEFAULTS.PAGE_NUMBER).toBe(1);
      expect(DATA_MAPPER_DEFAULTS.PAGE_SIZE).toBe(10);
      expect(DATA_MAPPER_DEFAULTS.SIMILARITY_THRESHOLD).toBe(FIELD_SUGGESTION_CONFIG.SIMILARITY_THRESHOLD);
      expect(DATA_MAPPER_DEFAULTS.MAX_SUGGESTIONS).toBe(FIELD_SUGGESTION_CONFIG.MAX_SUGGESTIONS);
      expect(DATA_MAPPER_DEFAULTS.TIMEOUT_MS).toBe(DATA_MAPPER_CONFIG.DEFAULT_TIMEOUT_MS);
      expect(DATA_MAPPER_DEFAULTS.ENABLE_CACHING).toBe(true);
      expect(DATA_MAPPER_DEFAULTS.LOG_LEVEL).toBe('info');
    });

    it('should be consistent with related configurations', () => {
      expect(DATA_MAPPER_DEFAULTS.PAGE_SIZE).toBe(DATA_MAPPER_CONFIG.DEFAULT_PAGE_SIZE);
      expect(DATA_MAPPER_DEFAULTS.SIMILARITY_THRESHOLD).toBe(FIELD_SUGGESTION_CONFIG.SIMILARITY_THRESHOLD);
      expect(DATA_MAPPER_DEFAULTS.MAX_SUGGESTIONS).toBe(FIELD_SUGGESTION_CONFIG.MAX_SUGGESTIONS);
    });
  });

  describe('Type Definitions', () => {
    it('should properly define TransformationType', () => {
      const validType: TransformationType = 'multiply';
      expect(TRANSFORMATION_TYPE_VALUES.includes(validType)).toBe(true);

      const anotherType: TransformationType = 'custom';
      expect(TRANSFORMATION_TYPE_VALUES.includes(anotherType)).toBe(true);
    });

    it('should properly define ApiType', () => {
      const validApiType: ApiType = 'rest';
      expect(API_TYPE_VALUES.includes(validApiType)).toBe(true);

      const anotherApiType: ApiType = 'stream';
      expect(API_TYPE_VALUES.includes(anotherApiType)).toBe(true);
    });

    it('should properly define RuleListType', () => {
      const validRuleType: RuleListType = 'quote_fields';
      expect(RULE_LIST_TYPE_VALUES.includes(validRuleType)).toBe(true);

      const anotherRuleType: RuleListType = 'index_fields';
      expect(RULE_LIST_TYPE_VALUES.includes(anotherRuleType)).toBe(true);
    });
  });

  describe('Constants Immutability', () => {
    it('should prevent modification of frozen objects', () => {
      expect(() => {
        (DATA_MAPPER_ERROR_MESSAGES as any).NEW_ERROR = 'test';
      }).toThrow();

      expect(() => {
        (TRANSFORMATION_TYPES as any).NEW_TYPE = 'test';
      }).toThrow();

      expect(() => {
        (DATA_MAPPER_CONFIG as any).NEW_CONFIG = 'test';
      }).toThrow();
    });
  });
});
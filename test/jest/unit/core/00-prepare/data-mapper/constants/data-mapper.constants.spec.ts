import {
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
} from '../../../../../../../src/core/00-prepare/data-mapper/constants/data-mapper.constants';

describe('Data Mapper Constants', () => {
  // 已精简：消息类与字段建议配置不再校验

  describe('DATA_MAPPER_CONFIG', () => {
    it('should be frozen and contain minimal configuration values', () => {
      expect(Object.isFrozen(DATA_MAPPER_CONFIG)).toBe(true);
      expect(typeof DATA_MAPPER_CONFIG.MAX_RULE_NAME_LENGTH).toBe('number');
      expect(typeof DATA_MAPPER_CONFIG.MAX_DESCRIPTION_LENGTH).toBe('number');
    });

    it('should have sensible limits', () => {
      expect(DATA_MAPPER_CONFIG.MAX_RULE_NAME_LENGTH).toBe(100);
      expect(DATA_MAPPER_CONFIG.MAX_DESCRIPTION_LENGTH).toBe(500);
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

  // 已精简：不再校验 TRANSFORMATION_DEFAULTS 与 DATA_MAPPER_DEFAULTS

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
        (TRANSFORMATION_TYPES as any).NEW_TYPE = 'test';
      }).toThrow();

      expect(() => {
        (API_TYPES as any).NEW_API = 'test';
      }).toThrow();

      expect(() => {
        (DATA_MAPPER_CONFIG as any).NEW_CONFIG = 'test';
      }).toThrow();
    });
  });
});

import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

import {
  TransformPreviewDto,
  TransformMappingRuleInfoDto,
  TransformFieldMappingPreviewDto,
  DataBatchTransformOptionsDto
} from '@core/02-processing/transformer/dto/data-transform-preview.dto';
import { safeTransform } from '@core/02-processing/transformer/utils/transform.utils';

describe('TransformMappingRuleInfoDto', () => {
  describe('Validation', () => {
    it('should validate valid mapping rule info', async () => {
      const validRuleInfo = {
        id: 'rule-123',
        name: 'Test Rule',
        provider: 'longport',
        transDataRuleListType: 'quote_fields',
        dataFieldMappingsCount: 5
      };

      const dto = plainToClass(TransformMappingRuleInfoDto, validRuleInfo);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.id).toBe('rule-123');
      expect(dto.name).toBe('Test Rule');
      expect(dto.provider).toBe('longport');
      expect(dto.transDataRuleListType).toBe('quote_fields');
      expect(dto.dataFieldMappingsCount).toBe(5);
    });

    it('should fail validation for missing required fields', async () => {
      const invalidRuleInfo = {
        // Missing required fields
        provider: 'longport'
      };

      const dto = plainToClass(TransformMappingRuleInfoDto, invalidRuleInfo);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'id')).toBe(true);
      expect(errors.some(error => error.property === 'name')).toBe(true);
      expect(errors.some(error => error.property === 'transDataRuleListType')).toBe(true);
      expect(errors.some(error => error.property === 'dataFieldMappingsCount')).toBe(true);
    });

    it('should fail validation for invalid types', async () => {
      const invalidRuleInfo = {
        id: 123, // Should be string
        name: null, // Should be string
        provider: '', // Should be non-empty string
        transDataRuleListType: [], // Should be string
        dataFieldMappingsCount: 'five' // Should be number
      };

      const dto = plainToClass(TransformMappingRuleInfoDto, invalidRuleInfo);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'id')).toBe(true);
      expect(errors.some(error => error.property === 'name')).toBe(true);
      expect(errors.some(error => error.property === 'dataFieldMappingsCount')).toBe(true);
    });

    it('should handle zero field mappings count', async () => {
      const validRuleInfo = {
        id: 'rule-zero',
        name: 'Zero Mappings Rule',
        provider: 'test-provider',
        transDataRuleListType: 'empty_fields',
        dataFieldMappingsCount: 0
      };

      const dto = plainToClass(TransformMappingRuleInfoDto, validRuleInfo);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.dataFieldMappingsCount).toBe(0);
    });

    it('should handle large field mappings count', async () => {
      const validRuleInfo = {
        id: 'rule-large',
        name: 'Large Mappings Rule',
        provider: 'bulk-provider',
        transDataRuleListType: 'bulk_fields',
        dataFieldMappingsCount: 10000
      };

      const dto = plainToClass(TransformMappingRuleInfoDto, validRuleInfo);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.dataFieldMappingsCount).toBe(10000);
    });

    it('should handle special characters in string fields', async () => {
      const validRuleInfo = {
        id: '特殊-规则-🚀',
        name: 'Special Rule: @#$%^&*()',
        provider: 'provider-with-special-chars-特殊',
        transDataRuleListType: 'type_with_unicode_🔥',
        dataFieldMappingsCount: 3
      };

      const dto = plainToClass(TransformMappingRuleInfoDto, validRuleInfo);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.id).toBe('特殊-规则-🚀');
      expect(dto.name).toBe('Special Rule: @#$%^&*()');
      expect(dto.provider).toBe('provider-with-special-chars-特殊');
      expect(dto.transDataRuleListType).toBe('type_with_unicode_🔥');
    });

    it('should handle negative field mappings count', async () => {
      const invalidRuleInfo = {
        id: 'rule-negative',
        name: 'Negative Count Rule',
        provider: 'test-provider',
        transDataRuleListType: 'test_fields',
        dataFieldMappingsCount: -5 // Negative number
      };

      const dto = plainToClass(TransformMappingRuleInfoDto, invalidRuleInfo);
      const errors = await validate(dto);

      // This should pass validation as @IsNumber() doesn't restrict to positive numbers
      expect(errors).toHaveLength(0);
      expect(dto.dataFieldMappingsCount).toBe(-5);
    });
  });

  describe('Property Assignment', () => {
    it('should correctly assign all properties', () => {
      const ruleData = {
        id: 'assignment-test',
        name: 'Assignment Test Rule',
        provider: 'assignment-provider',
        transDataRuleListType: 'assignment_fields',
        dataFieldMappingsCount: 15
      };

      const dto = plainToClass(TransformMappingRuleInfoDto, ruleData);

      expect(dto.id).toBe('assignment-test');
      expect(dto.name).toBe('Assignment Test Rule');
      expect(dto.provider).toBe('assignment-provider');
      expect(dto.transDataRuleListType).toBe('assignment_fields');
      expect(dto.dataFieldMappingsCount).toBe(15);
    });

    it('should handle floating point numbers for mappings count', async () => {
      const ruleInfo = {
        id: 'float-test',
        name: 'Float Test',
        provider: 'test-provider',
        transDataRuleListType: 'test_fields',
        dataFieldMappingsCount: 5.5
      };

      const dto = plainToClass(TransformMappingRuleInfoDto, ruleInfo);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.dataFieldMappingsCount).toBe(5.5);
    });
  });
});

describe('TransformFieldMappingPreviewDto', () => {
  describe('Validation', () => {
    it('should validate valid field mapping preview', async () => {
      const validFieldMapping = {
        sourceField: 'last_done',
        targetField: 'lastPrice',
        sampleSourceValue: 385.6,
        expectedTargetValue: 385.6,
        transformType: 'direct'
      };

      const dto = plainToClass(TransformFieldMappingPreviewDto, validFieldMapping);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sourceField).toBe('last_done');
      expect(dto.targetField).toBe('lastPrice');
      expect(dto.sampleSourceValue).toBe(385.6);
      expect(dto.expectedTargetValue).toBe(385.6);
      expect(dto.transformType).toBe('direct');
    });

    it('should validate field mapping without optional fields', async () => {
      const minimalFieldMapping = {
        sourceField: 'change_rate',
        targetField: 'changePercent'
      };

      const dto = plainToClass(TransformFieldMappingPreviewDto, minimalFieldMapping);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sourceField).toBe('change_rate');
      expect(dto.targetField).toBe('changePercent');
      expect(dto.sampleSourceValue).toBeUndefined();
      expect(dto.expectedTargetValue).toBeUndefined();
      expect(dto.transformType).toBeUndefined();
    });

    it('should fail validation for missing required fields', async () => {
      const invalidFieldMapping = {
        sampleSourceValue: 100
        // Missing sourceField and targetField
      };

      const dto = plainToClass(TransformFieldMappingPreviewDto, invalidFieldMapping);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'sourceField')).toBe(true);
      expect(errors.some(error => error.property === 'targetField')).toBe(true);
    });

    it('should fail validation for invalid types', async () => {
      const invalidFieldMapping = {
        sourceField: 123, // Should be string
        targetField: null, // Should be string
        transformType: [] // Should be string
      };

      const dto = plainToClass(TransformFieldMappingPreviewDto, invalidFieldMapping);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'sourceField')).toBe(true);
      expect(errors.some(error => error.property === 'targetField')).toBe(true);
    });

    it('should handle complex sample values', async () => {
      const complexFieldMapping = {
        sourceField: 'nested.data.value',
        targetField: 'flatValue',
        sampleSourceValue: {
          nested: {
            data: {
              value: 'complex nested value'
            }
          }
        },
        expectedTargetValue: 'complex nested value',
        transformType: 'flatten'
      };

      const dto = plainToClass(TransformFieldMappingPreviewDto, complexFieldMapping);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sampleSourceValue.nested.data.value).toBe('complex nested value');
      expect(dto.expectedTargetValue).toBe('complex nested value');
      expect(dto.transformType).toBe('flatten');
    });

    it('should handle array sample values', async () => {
      const arrayFieldMapping = {
        sourceField: 'prices[]',
        targetField: 'priceList',
        sampleSourceValue: [100, 200, 300],
        expectedTargetValue: [100, 200, 300],
        transformType: 'array_copy'
      };

      const dto = plainToClass(TransformFieldMappingPreviewDto, arrayFieldMapping);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sampleSourceValue).toEqual([100, 200, 300]);
      expect(dto.expectedTargetValue).toEqual([100, 200, 300]);
    });

    it('should handle null and undefined values', async () => {
      const nullFieldMapping = {
        sourceField: 'optional_field',
        targetField: 'nullableField',
        sampleSourceValue: null,
        expectedTargetValue: undefined
      };

      const dto = plainToClass(TransformFieldMappingPreviewDto, nullFieldMapping);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sampleSourceValue).toBeNull();
      expect(dto.expectedTargetValue).toBeUndefined();
    });

    it('should handle special characters in field paths', async () => {
      const specialFieldMapping = {
        sourceField: '特殊字段.价格@#$',
        targetField: 'price_special_chars',
        sampleSourceValue: '🚀💰',
        expectedTargetValue: '🚀💰',
        transformType: 'unicode_处理'
      };

      const dto = plainToClass(TransformFieldMappingPreviewDto, specialFieldMapping);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sourceField).toBe('特殊字段.价格@#$');
      expect(dto.targetField).toBe('price_special_chars');
      expect(dto.sampleSourceValue).toBe('🚀💰');
      expect(dto.transformType).toBe('unicode_处理');
    });
  });

  describe('Property Assignment', () => {
    it('should correctly assign all properties', () => {
      const mappingData = {
        sourceField: 'test.source',
        targetField: 'test_target',
        sampleSourceValue: 'test value',
        expectedTargetValue: 'test value transformed',
        transformType: 'test_transform'
      };

      const dto = plainToClass(TransformFieldMappingPreviewDto, mappingData);

      expect(dto.sourceField).toBe('test.source');
      expect(dto.targetField).toBe('test_target');
      expect(dto.sampleSourceValue).toBe('test value');
      expect(dto.expectedTargetValue).toBe('test value transformed');
      expect(dto.transformType).toBe('test_transform');
    });

    it('should handle primitive types correctly', () => {
      const primitiveMapping = {
        sourceField: 'primitive_source',
        targetField: 'primitive_target',
        sampleSourceValue: 42,
        expectedTargetValue: true
      };

      const dto = plainToClass(TransformFieldMappingPreviewDto, primitiveMapping);

      expect(dto.sampleSourceValue).toBe(42);
      expect(dto.expectedTargetValue).toBe(true);
      expect(typeof dto.sampleSourceValue).toBe('number');
      expect(typeof dto.expectedTargetValue).toBe('boolean');
    });
  });
});

describe('TransformPreviewDto', () => {
  let mockMappingRule: TransformMappingRuleInfoDto;
  let mockFieldMappings: TransformFieldMappingPreviewDto[];

  beforeEach(() => {
    mockMappingRule = plainToClass(TransformMappingRuleInfoDto, {
      id: 'test-rule',
      name: 'Test Rule',
      provider: 'test-provider',
      transDataRuleListType: 'test_fields',
      dataFieldMappingsCount: 2
    });

    mockFieldMappings = [
      plainToClass(TransformFieldMappingPreviewDto, {
        sourceField: 'last_done',
        targetField: 'lastPrice',
        sampleSourceValue: 385.6,
        expectedTargetValue: 385.6
      }),
      plainToClass(TransformFieldMappingPreviewDto, {
        sourceField: 'change_rate',
        targetField: 'changePercent',
        sampleSourceValue: -0.0108,
        expectedTargetValue: -1.08
      })
    ];
  });

  describe('Validation', () => {
    it('should validate valid transform preview', async () => {
      const validPreview = {
        transformMappingRule: {
          id: 'preview-rule',
          name: 'Preview Rule',
          provider: 'longport',
          transDataRuleListType: 'quote_fields',
          dataFieldMappingsCount: 2
        },
        sampleInput: {
          last_done: 385.6,
          change_rate: -0.0108
        },
        expectedOutput: {
          lastPrice: 385.6,
          changePercent: -1.08
        },
        sharedDataFieldMappings: [
          {
            sourceField: 'last_done',
            targetField: 'lastPrice',
            sampleSourceValue: 385.6,
            expectedTargetValue: 385.6
          },
          {
            sourceField: 'change_rate',
            targetField: 'changePercent',
            sampleSourceValue: -0.0108,
            expectedTargetValue: -1.08
          }
        ]
      };

      const dto = plainToClass(TransformPreviewDto, validPreview);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.transformMappingRule.id).toBe('preview-rule');
      expect(dto.sampleInput.last_done).toBe(385.6);
      expect(dto.expectedOutput.lastPrice).toBe(385.6);
      expect(dto.sharedDataFieldMappings).toHaveLength(2);
    });

    it('should fail validation for missing required fields', async () => {
      const invalidPreview = {
        sampleInput: { test: 'data' }
        // Missing transformMappingRule, expectedOutput, sharedDataFieldMappings
      };

      const dto = plainToClass(TransformPreviewDto, invalidPreview);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'transformMappingRule')).toBe(true);
      expect(errors.some(error => error.property === 'expectedOutput')).toBe(true);
      expect(errors.some(error => error.property === 'sharedDataFieldMappings')).toBe(true);
    });

    it('should fail validation for invalid nested objects', async () => {
      const invalidPreview = {
        transformMappingRule: {
          // Missing required fields in nested object
          id: 'invalid-rule'
        },
        sampleInput: 'not an object', // Should be object
        expectedOutput: [], // Should be object
        sharedDataFieldMappings: 'not an array' // Should be array
      };

      const dto = plainToClass(TransformPreviewDto, invalidPreview);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'sampleInput')).toBe(true);
      expect(errors.some(error => error.property === 'expectedOutput')).toBe(true);
      expect(errors.some(error => error.property === 'sharedDataFieldMappings')).toBe(true);
    });

    it('should validate empty arrays and objects', async () => {
      const emptyPreview = {
        transformMappingRule: {
          id: 'empty-rule',
          name: 'Empty Rule',
          provider: 'empty-provider',
          transDataRuleListType: 'empty_fields',
          dataFieldMappingsCount: 0
        },
        sampleInput: {},
        expectedOutput: {},
        sharedDataFieldMappings: []
      };

      const dto = plainToClass(TransformPreviewDto, emptyPreview);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sampleInput).toEqual({});
      expect(dto.expectedOutput).toEqual({});
      expect(dto.sharedDataFieldMappings).toEqual([]);
    });

    it('should validate complex nested input/output', async () => {
      const complexPreview = {
        transformMappingRule: {
          id: 'complex-rule',
          name: 'Complex Rule',
          provider: 'complex-provider',
          transDataRuleListType: 'complex_fields',
          dataFieldMappingsCount: 3
        },
        sampleInput: {
          quotes: [
            { symbol: '700.HK', price: 385.6 },
            { symbol: 'AAPL', price: 195.89 }
          ],
          metadata: {
            timestamp: '2024-01-01T12:00:00Z',
            source: 'live'
          }
        },
        expectedOutput: {
          stockData: [
            { ticker: '700.HK', lastPrice: 385.6 },
            { ticker: 'AAPL', lastPrice: 195.89 }
          ],
          processingInfo: {
            processedAt: '2024-01-01T12:00:00Z',
            dataSource: 'live'
          }
        },
        sharedDataFieldMappings: [
          {
            sourceField: 'quotes[].symbol',
            targetField: 'stockData[].ticker',
            sampleSourceValue: '700.HK',
            expectedTargetValue: '700.HK'
          },
          {
            sourceField: 'quotes[].price',
            targetField: 'stockData[].lastPrice',
            sampleSourceValue: 385.6,
            expectedTargetValue: 385.6
          },
          {
            sourceField: 'metadata.source',
            targetField: 'processingInfo.dataSource',
            sampleSourceValue: 'live',
            expectedTargetValue: 'live'
          }
        ]
      };

      const dto = plainToClass(TransformPreviewDto, complexPreview);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sampleInput.quotes).toHaveLength(2);
      expect(dto.expectedOutput.stockData).toHaveLength(2);
      expect(dto.sharedDataFieldMappings).toHaveLength(3);
    });
  });

  describe('Property Assignment and Nested Validation', () => {
    it('should correctly assign and validate nested objects', async () => {
      const previewData = {
        transformMappingRule: mockMappingRule,
        sampleInput: { test: 'input' },
        expectedOutput: { test: 'output' },
        sharedDataFieldMappings: mockFieldMappings
      };

      const dto = plainToClass(TransformPreviewDto, previewData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.transformMappingRule).toBeInstanceOf(TransformMappingRuleInfoDto);
      expect(dto.transformMappingRule.id).toBe('test-rule');
      expect(dto.sharedDataFieldMappings).toHaveLength(2);
      expect(dto.sharedDataFieldMappings[0]).toBeInstanceOf(TransformFieldMappingPreviewDto);
      expect(dto.sharedDataFieldMappings[0].sourceField).toBe('last_done');
    });

    it('should handle large datasets in input/output', async () => {
      const largeDataset = Array(1000).fill(null).map((_, i) => ({
        id: i,
        value: `item_${i}`,
        timestamp: new Date().toISOString()
      }));

      const largePreview = {
        transformMappingRule: {
          id: 'large-rule',
          name: 'Large Dataset Rule',
          provider: 'bulk-provider',
          transDataRuleListType: 'bulk_fields',
          dataFieldMappingsCount: 1
        },
        sampleInput: { items: largeDataset },
        expectedOutput: { processedItems: largeDataset },
        sharedDataFieldMappings: [
          {
            sourceField: 'items',
            targetField: 'processedItems',
            transformType: 'bulk_copy'
          }
        ]
      };

      const dto = plainToClass(TransformPreviewDto, largePreview);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sampleInput.items).toHaveLength(1000);
      expect(dto.expectedOutput.processedItems).toHaveLength(1000);
    });

    it('should handle special characters and unicode in data', async () => {
      const unicodePreview = {
        transformMappingRule: {
          id: 'unicode-rule',
          name: 'Unicode Test Rule',
          provider: 'unicode-provider',
          transDataRuleListType: 'unicode_fields',
          dataFieldMappingsCount: 1
        },
        sampleInput: {
          '中文字段': '腾讯控股',
          'emoji_field': '🚀📈💰',
          'special_chars': '@#$%^&*()'
        },
        expectedOutput: {
          'chinese_field': '腾讯控股',
          'emoji_transformed': '🚀📈💰',
          'special_transformed': '@#$%^&*()'
        },
        sharedDataFieldMappings: [
          {
            sourceField: '中文字段',
            targetField: 'chinese_field',
            sampleSourceValue: '腾讯控股',
            expectedTargetValue: '腾讯控股'
          }
        ]
      };

      const dto = plainToClass(TransformPreviewDto, unicodePreview);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sampleInput['中文字段']).toBe('腾讯控股');
      expect(dto.expectedOutput['chinese_field']).toBe('腾讯控股');
      expect(dto.sampleInput['emoji_field']).toBe('🚀📈💰');
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize and deserialize correctly', async () => {
      const originalPreview = {
        transformMappingRule: {
          id: 'serialization-test',
          name: 'Serialization Test',
          provider: 'test-provider',
          transDataRuleListType: 'test_fields',
          dataFieldMappingsCount: 1
        },
        sampleInput: { test: 'input' },
        expectedOutput: { test: 'output' },
        sharedDataFieldMappings: [
          {
            sourceField: 'test',
            targetField: 'test',
            sampleSourceValue: 'input',
            expectedTargetValue: 'output'
          }
        ]
      };

      // 使用安全转换函数
      const dto = safeTransform(TransformPreviewDto, originalPreview);
      const json = JSON.stringify(dto);
      const parsed = JSON.parse(json);

      expect(parsed.transformMappingRule.id).toBe('serialization-test');
      expect(parsed.sampleInput.test).toBe('input');
      expect(parsed.expectedOutput.test).toBe('output');
      expect(parsed.sharedDataFieldMappings).toHaveLength(1);
      expect(parsed.sharedDataFieldMappings[0].sourceField).toBe('test');
    });

    it('should reject circular references during validation', async () => {
      const circularInput: any = { name: 'test' };
      circularInput.self = circularInput;

      const previewWithCircular = {
        transformMappingRule: {
          id: 'circular-test',
          name: 'Circular Test',
          provider: 'test-provider',
          transDataRuleListType: 'test_fields',
          dataFieldMappingsCount: 0
        },
        sampleInput: circularInput,
        expectedOutput: { name: 'test' },
        sharedDataFieldMappings: []
      };

      // 使用安全转换函数
      const dto = safeTransform(TransformPreviewDto, previewWithCircular);
      const errors = await validate(dto);
      
      // 验证应该失败，因为存在循环引用
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'sampleInput')).toBe(true);
      
      // 基本属性仍然可以正常访问
      expect(dto.transformMappingRule.id).toBe('circular-test');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle null values in optional fields', async () => {
      const nullPreview = {
        transformMappingRule: {
          id: 'null-test',
          name: 'Null Test',
          provider: 'test-provider',
          transDataRuleListType: 'test_fields',
          dataFieldMappingsCount: 1
        },
        sampleInput: { nullField: null },
        expectedOutput: { nullField: null },
        sharedDataFieldMappings: [
          {
            sourceField: 'nullField',
            targetField: 'nullField',
            sampleSourceValue: null,
            expectedTargetValue: null
          }
        ]
      };

      const dto = plainToClass(TransformPreviewDto, nullPreview);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sampleInput.nullField).toBeNull();
      expect(dto.expectedOutput.nullField).toBeNull();
    });

    it('should handle very deep nested objects', async () => {
      const createDeepObject = (depth: number): any => {
        if (depth === 0) return { value: 'deep' };
        return { [`level${depth}`]: createDeepObject(depth - 1) };
      };

      const deepObject = createDeepObject(20);

      const deepPreview = {
        transformMappingRule: {
          id: 'deep-test',
          name: 'Deep Nesting Test',
          provider: 'test-provider',
          transDataRuleListType: 'deep_fields',
          dataFieldMappingsCount: 1
        },
        sampleInput: deepObject,
        expectedOutput: deepObject,
        sharedDataFieldMappings: [
          {
            sourceField: 'level20.level19...level1.value',
            targetField: 'flattened_value',
            sampleSourceValue: 'deep',
            expectedTargetValue: 'deep'
          }
        ]
      };

      const dto = plainToClass(TransformPreviewDto, deepPreview);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sampleInput.level20).toBeDefined();
    });

    it('should handle arrays with different types', async () => {
      const mixedArray = [
        'string',
        123,
        true,
        null,
        { object: 'value' },
        [1, 2, 3]
      ];

      const mixedArrayPreview = {
        transformMappingRule: {
          id: 'mixed-array-test',
          name: 'Mixed Array Test',
          provider: 'test-provider',
          transDataRuleListType: 'mixed_fields',
          dataFieldMappingsCount: 1
        },
        sampleInput: { mixedData: mixedArray },
        expectedOutput: { processedData: mixedArray },
        sharedDataFieldMappings: [
          {
            sourceField: 'mixedData',
            targetField: 'processedData',
            sampleSourceValue: mixedArray,
            expectedTargetValue: mixedArray,
            transformType: 'array_copy'
          }
        ]
      };

      const dto = plainToClass(TransformPreviewDto, mixedArrayPreview);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.sampleInput.mixedData).toHaveLength(6);
      expect(dto.sampleInput.mixedData[0]).toBe('string');
      expect(dto.sampleInput.mixedData[1]).toBe(123);
      expect(dto.sampleInput.mixedData[2]).toBe(true);
      expect(dto.sampleInput.mixedData[3]).toBeNull();
    });
  });
});

describe('DataBatchTransformOptionsDto', () => {
  describe('Validation', () => {
    it('should validate valid batch transform options', async () => {
      const validOptions = {
        continueOnError: true
      };

      const dto = plainToClass(DataBatchTransformOptionsDto, validOptions);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.continueOnError).toBe(true);
    });

    it('should handle optional fields being undefined', async () => {
      const minimalOptions = {};

      const dto = plainToClass(DataBatchTransformOptionsDto, minimalOptions);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.continueOnError).toBeUndefined();
    });

    it('should handle false value for continueOnError', async () => {
      const falseOptions = {
        continueOnError: false
      };

      const dto = plainToClass(DataBatchTransformOptionsDto, falseOptions);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.continueOnError).toBe(false);
    });

    it('should fail validation for invalid boolean type', async () => {
      const invalidOptions = {
        continueOnError: 'not a boolean'
      };

      const dto = plainToClass(DataBatchTransformOptionsDto, invalidOptions);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'continueOnError')).toBe(true);
    });

    it('should handle null value for continueOnError', async () => {
      const nullOptions = {
        continueOnError: null
      };

      const dto = plainToClass(DataBatchTransformOptionsDto, nullOptions);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'continueOnError')).toBe(true);
    });

    it('should handle object with extra properties', async () => {
      const extraPropsOptions = {
        continueOnError: true,
        extraProperty: 'should be ignored'
      };

      const dto = plainToClass(DataBatchTransformOptionsDto, extraPropsOptions);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.continueOnError).toBe(true);
      expect((dto as any).extraProperty).toBe('should be ignored');
    });
  });
});
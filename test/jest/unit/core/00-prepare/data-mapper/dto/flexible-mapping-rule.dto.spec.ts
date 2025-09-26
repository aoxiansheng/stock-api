import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  TransformRuleDto,
  FlexibleFieldMappingDto,
  CreateFlexibleMappingRuleDto,
  FlexibleMappingRuleResponseDto,
  TestFlexibleMappingRuleDto,
  FlexibleMappingTestResultDto,
  CreateMappingRuleFromSuggestionsDto,
} from '../../../../../../../src/core/00-prepare/data-mapper/dto/flexible-mapping-rule.dto';
import { REFERENCE_DATA } from '@common/constants/domain';

describe('Flexible Mapping Rule DTOs', () => {
  describe('TransformRuleDto', () => {
    it('should validate a valid transform rule', async () => {
      const validRule = {
        type: 'multiply',
        value: 0.13,
        customFunction: 'function(value) { return value * 2; }',
      };

      const dto = plainToClass(TransformRuleDto, validRule);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require type field', async () => {
      const invalidRule = {
        value: 0.13,
      };

      const dto = plainToClass(TransformRuleDto, invalidRule);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'type')).toBe(true);
    });

    it('should accept valid transformation types', async () => {
      const validTypes = ['multiply', 'divide', 'add', 'subtract', 'format', 'custom', 'none'];

      for (const type of validTypes) {
        const dto = plainToClass(TransformRuleDto, { type });
        const errors = await validate(dto);
        const typeErrors = errors.filter(error => error.property === 'type');
        expect(typeErrors).toHaveLength(0);
      }
    });

    it('should reject invalid transformation types', async () => {
      const invalidRule = {
        type: 'invalid_type',
      };

      const dto = plainToClass(TransformRuleDto, invalidRule);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'type')).toBe(true);
    });

    it('should make value and customFunction optional', async () => {
      const minimalRule = {
        type: 'none',
      };

      const dto = plainToClass(TransformRuleDto, minimalRule);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('FlexibleFieldMappingDto', () => {
    it('should validate a complete field mapping', async () => {
      const validMapping = {
        sourceFieldPath: 'last_done',
        targetField: 'lastPrice',
        transform: {
          type: 'multiply',
          value: 0.13,
        },
        fallbackPaths: ['fallback.price', 'last_trade.price'],
        enabled: true,
      };

      const dto = plainToClass(FlexibleFieldMappingDto, validMapping);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require sourceFieldPath and targetField', async () => {
      const invalidMapping = {
        transform: {
          type: 'multiply',
          value: 1,
        },
      };

      const dto = plainToClass(FlexibleFieldMappingDto, invalidMapping);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'sourceFieldPath')).toBe(true);
      expect(errors.some(error => error.property === 'targetField')).toBe(true);
    });

    it('should accept minimal field mapping', async () => {
      const minimalMapping = {
        sourceFieldPath: 'price',
        targetField: 'lastPrice',
      };

      const dto = plainToClass(FlexibleFieldMappingDto, minimalMapping);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should validate nested transform rule', async () => {
      const mappingWithInvalidTransform = {
        sourceFieldPath: 'price',
        targetField: 'lastPrice',
        transform: {
          type: 'invalid_type',
        },
      };

      const dto = plainToClass(FlexibleFieldMappingDto, mappingWithInvalidTransform);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate fallbackPaths as string array', async () => {
      const mappingWithInvalidFallback = {
        sourceFieldPath: 'price',
        targetField: 'lastPrice',
        fallbackPaths: ['valid.path', 123, 'another.path'],
      };

      const dto = plainToClass(FlexibleFieldMappingDto, mappingWithInvalidFallback);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'fallbackPaths')).toBe(true);
    });
  });

  describe('CreateFlexibleMappingRuleDto', () => {
    const validRuleData = {
      name: 'test_mapping_rule',
      description: 'Test mapping rule for unit tests',
      provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      apiType: 'rest',
      transDataRuleListType: 'quote_fields',
      fieldMappings: [
        {
          sourceFieldPath: 'last_done',
          targetField: 'lastPrice',
        },
      ],
      enabled: true,
      sourceTemplateId: '507f1f77bcf86cd799439011',
      isDefault: false,
      version: '1.0.0',
    };

    it('should validate a complete rule creation request', async () => {
      const dto = plainToClass(CreateFlexibleMappingRuleDto, validRuleData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require essential fields', async () => {
      const incompleteData = {
        description: 'Missing required fields',
      };

      const dto = plainToClass(CreateFlexibleMappingRuleDto, incompleteData);
      const errors = await validate(dto);

      const requiredFields = ['name', 'provider', 'apiType', 'transDataRuleListType', 'fieldMappings'];
      requiredFields.forEach(field => {
        expect(errors.some(error => error.property === field)).toBe(true);
      });
    });

    it('should validate name length', async () => {
      const longName = 'a'.repeat(101); // Exceeds MAX_RULE_NAME_LENGTH
      const dataWithLongName = {
        ...validRuleData,
        name: longName,
      };

      const dto = plainToClass(CreateFlexibleMappingRuleDto, dataWithLongName);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'name')).toBe(true);
    });

    it('should validate apiType enum', async () => {
      const invalidApiType = {
        ...validRuleData,
        apiType: 'invalid_api_type',
      };

      const dto = plainToClass(CreateFlexibleMappingRuleDto, invalidApiType);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'apiType')).toBe(true);
    });

    it('should validate transDataRuleListType enum', async () => {
      const invalidRuleType = {
        ...validRuleData,
        transDataRuleListType: 'invalid_rule_type',
      };

      const dto = plainToClass(CreateFlexibleMappingRuleDto, invalidRuleType);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'transDataRuleListType')).toBe(true);
    });

    it('should validate nested fieldMappings', async () => {
      const invalidFieldMappings = {
        ...validRuleData,
        fieldMappings: [
          {
            sourceFieldPath: 'valid_path',
            // Missing targetField
          },
        ],
      };

      const dto = plainToClass(CreateFlexibleMappingRuleDto, invalidFieldMappings);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should accept minimal required data', async () => {
      const minimalData = {
        name: 'minimal_rule',
        provider: 'test_provider',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        fieldMappings: [
          {
            sourceFieldPath: 'price',
            targetField: 'lastPrice',
          },
        ],
      };

      const dto = plainToClass(CreateFlexibleMappingRuleDto, minimalData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('FlexibleMappingRuleResponseDto', () => {
    describe('fromDocument static method', () => {
      it('should convert document to response DTO correctly', () => {
        const mockDocument = {
          _id: '507f1f77bcf86cd799439011',
          name: 'test_rule',
          provider: 'longport',
          apiType: 'rest',
          transDataRuleListType: 'quote_fields',
          description: 'Test rule',
          sourceTemplateId: '507f1f77bcf86cd799439012',
          fieldMappings: [
            {
              sourceFieldPath: 'last_done',
              targetField: 'lastPrice',
            },
          ],
          isActive: true,
          isDefault: false,
          version: '1.0.0',
          overallConfidence: 0.85,
          usageCount: 10,
          lastUsedAt: new Date('2023-01-01'),
          lastValidatedAt: new Date('2023-01-02'),
          successfulTransformations: 8,
          failedTransformations: 2,
          successRate: 0.8,
          createdAt: new Date('2023-01-03'),
          updatedAt: new Date('2023-01-04'),
        };

        const result = FlexibleMappingRuleResponseDto.fromDocument(mockDocument);

        expect(result.id).toBe('507f1f77bcf86cd799439011');
        expect(result.name).toBe('test_rule');
        expect(result.provider).toBe('longport');
        expect(result.apiType).toBe('rest');
        expect(result.transDataRuleListType).toBe('quote_fields');
        expect(result.description).toBe('Test rule');
        expect(result.sourceTemplateId).toBe('507f1f77bcf86cd799439012');
        expect(result.fieldMappings).toHaveLength(1);
        expect(result.isActive).toBe(true);
        expect(result.isDefault).toBe(false);
        expect(result.version).toBe('1.0.0');
        expect(result.overallConfidence).toBe(0.85);
        expect(result.usageCount).toBe(10);
        expect(result.successfulTransformations).toBe(8);
        expect(result.failedTransformations).toBe(2);
        expect(result.successRate).toBe(0.8);
      });

      it('should handle missing optional fields with defaults', () => {
        const minimalDocument = {
          _id: '507f1f77bcf86cd799439011',
          name: 'minimal_rule',
          provider: 'test_provider',
          apiType: 'rest',
          transDataRuleListType: 'quote_fields',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = FlexibleMappingRuleResponseDto.fromDocument(minimalDocument);

        expect(result.id).toBe('507f1f77bcf86cd799439011');
        expect(result.fieldMappings).toEqual([]);
        expect(result.isActive).toBe(true);
        expect(result.isDefault).toBe(false);
        expect(result.version).toBe('1.0.0');
        expect(result.overallConfidence).toBe(0);
        expect(result.usageCount).toBe(0);
        expect(result.successfulTransformations).toBe(0);
        expect(result.failedTransformations).toBe(0);
      });

      it('should handle document with id instead of _id', () => {
        const documentWithId = {
          id: 'test-id-123',
          name: 'test_rule',
          provider: 'test_provider',
          apiType: 'stream',
          transDataRuleListType: 'basic_info_fields',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = FlexibleMappingRuleResponseDto.fromDocument(documentWithId);
        expect(result.id).toBe('test-id-123');
      });
    });
  });

  describe('TestFlexibleMappingRuleDto', () => {
    it('should validate a complete test request', async () => {
      const validTestData = {
        dataMapperRuleId: '507f1f77bcf86cd799439011',
        testData: {
          symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
          last_done: 561,
          volume: 11292534,
        },
        includeDebugInfo: true,
      };

      const dto = plainToClass(TestFlexibleMappingRuleDto, validTestData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require dataMapperRuleId and testData', async () => {
      const incompleteData = {
        includeDebugInfo: false,
      };

      const dto = plainToClass(TestFlexibleMappingRuleDto, incompleteData);
      const errors = await validate(dto);

      expect(errors.some(error => error.property === 'dataMapperRuleId')).toBe(true);
      expect(errors.some(error => error.property === 'testData')).toBe(true);
    });

    it('should have default value for includeDebugInfo', () => {
      const testData = {
        dataMapperRuleId: '507f1f77bcf86cd799439011',
        testData: { test: 'value' },
      };

      const dto = plainToClass(TestFlexibleMappingRuleDto, testData);
      expect(dto.includeDebugInfo).toBe(false);
    });

    it('should validate testData as object', async () => {
      const invalidTestData = {
        dataMapperRuleId: '507f1f77bcf86cd799439011',
        testData: 'not an object',
      };

      const dto = plainToClass(TestFlexibleMappingRuleDto, invalidTestData);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'testData')).toBe(true);
    });
  });

  describe('CreateMappingRuleFromSuggestionsDto', () => {
    it('should validate a complete suggestions-based creation request', async () => {
      const validSuggestionsData = {
        name: 'generated_from_suggestions',
        templateId: '507f1f77bcf86cd799439011',
        selectedSuggestionIndexes: [0, 2, 4],
        description: 'Rule created from field mapping suggestions',
        isDefault: true,
      };

      const dto = plainToClass(CreateMappingRuleFromSuggestionsDto, validSuggestionsData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require name, templateId, and selectedSuggestionIndexes', async () => {
      const incompleteData = {
        description: 'Missing required fields',
      };

      const dto = plainToClass(CreateMappingRuleFromSuggestionsDto, incompleteData);
      const errors = await validate(dto);

      expect(errors.some(error => error.property === 'name')).toBe(true);
      expect(errors.some(error => error.property === 'templateId')).toBe(true);
      expect(errors.some(error => error.property === 'selectedSuggestionIndexes')).toBe(true);
    });

    it('should validate selectedSuggestionIndexes as number array', async () => {
      const invalidIndexes = {
        name: 'test_rule',
        templateId: '507f1f77bcf86cd799439011',
        selectedSuggestionIndexes: [0, 'invalid', 2],
      };

      const dto = plainToClass(CreateMappingRuleFromSuggestionsDto, invalidIndexes);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'selectedSuggestionIndexes')).toBe(true);
    });

    it('should have default value for isDefault', () => {
      const suggestionsData = {
        name: 'test_rule',
        templateId: '507f1f77bcf86cd799439011',
        selectedSuggestionIndexes: [0, 1],
      };

      const dto = plainToClass(CreateMappingRuleFromSuggestionsDto, suggestionsData);
      expect(dto.isDefault).toBe(false);
    });
  });

  describe('FlexibleMappingTestResultDto', () => {
    it('should have proper structure for test results', () => {
      const testResult: FlexibleMappingTestResultDto = {
        dataMapperRuleId: '507f1f77bcf86cd799439011',
        ruleName: 'test_rule',
        originalData: { price: 100 },
        transformedData: { lastPrice: 13 },
        success: true,
        mappingStats: {
          totalMappings: 5,
          successfulMappings: 4,
          failedMappings: 1,
          successRate: 0.8,
        },
        executionTime: 25,
        debugInfo: [
          {
            sourceFieldPath: 'price',
            targetField: 'lastPrice',
            sourceValue: 100,
            transformedValue: 13,
            success: true,
          },
        ],
      };

      expect(testResult.dataMapperRuleId).toBeDefined();
      expect(testResult.mappingStats.totalMappings).toBe(5);
      expect(testResult.mappingStats.successRate).toBe(0.8);
      expect(testResult.debugInfo).toHaveLength(1);
      expect(testResult.debugInfo![0].success).toBe(true);
    });

    it('should handle test results without debug info', () => {
      const testResult: FlexibleMappingTestResultDto = {
        dataMapperRuleId: '507f1f77bcf86cd799439011',
        ruleName: 'test_rule',
        originalData: { price: 100 },
        transformedData: { lastPrice: 13 },
        success: true,
        mappingStats: {
          totalMappings: 1,
          successfulMappings: 1,
          failedMappings: 0,
          successRate: 1.0,
        },
        executionTime: 15,
      };

      expect(testResult.debugInfo).toBeUndefined();
      expect(testResult.mappingStats.successRate).toBe(1.0);
    });
  });
});
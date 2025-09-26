import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  AnalyzeDataSourceDto,
  ExtractedFieldDto,
  DataSourceAnalysisResponseDto,
  CreateDataSourceTemplateDto,
  SuggestFieldMappingsDto,
  FieldMappingSuggestionDto,
  SuggestFieldMappingsResponseDto,
  DataSourceTemplateResponseDto,
} from '../../../../../../../src/core/00-prepare/data-mapper/dto/data-source-analysis.dto';
import { REFERENCE_DATA } from '@common/constants/domain';

describe('Data Source Analysis DTOs', () => {
  describe('AnalyzeDataSourceDto', () => {
    const validAnalysisData = {
      provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      apiType: 'stream',
      sampleData: {
        symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
        last_done: 561,
        volume: 11292534,
        timestamp: '2025-08-08T07:39:55Z',
      },
      name: 'LongPort WebSocket 报价流',
      description: 'Test data source for analysis',
      dataType: 'quote_fields',
      saveAsTemplate: true,
    };

    it('should validate a complete analysis request', async () => {
      const dto = plainToClass(AnalyzeDataSourceDto, validAnalysisData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require apiType and sampleData', async () => {
      const incompleteData = {
        provider: 'test_provider',
        name: 'Test source',
      };

      const dto = plainToClass(AnalyzeDataSourceDto, incompleteData);
      const errors = await validate(dto);

      expect(errors.some(error => error.property === 'apiType')).toBe(true);
      expect(errors.some(error => error.property === 'sampleData')).toBe(true);
    });

    it('should validate apiType enum', async () => {
      const invalidApiType = {
        ...validAnalysisData,
        apiType: 'invalid_api_type',
      };

      const dto = plainToClass(AnalyzeDataSourceDto, invalidApiType);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'apiType')).toBe(true);
    });

    it('should validate dataType enum', async () => {
      const invalidDataType = {
        ...validAnalysisData,
        dataType: 'invalid_data_type',
      };

      const dto = plainToClass(AnalyzeDataSourceDto, invalidDataType);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'dataType')).toBe(true);
    });

    it('should have default values for optional fields', () => {
      const minimalData = {
        apiType: 'rest',
        sampleData: { test: 'value' },
      };

      const dto = plainToClass(AnalyzeDataSourceDto, minimalData);
      expect(dto.provider).toBe('custom');
      expect(dto.dataType).toBe('quote_fields');
      expect(dto.saveAsTemplate).toBe(false);
    });

    it('should validate sampleData as object', async () => {
      const invalidSampleData = {
        ...validAnalysisData,
        sampleData: 'not an object',
      };

      const dto = plainToClass(AnalyzeDataSourceDto, invalidSampleData);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'sampleData')).toBe(true);
    });

    it('should accept valid apiType values', async () => {
      const validApiTypes = ['rest', 'stream'];

      for (const apiType of validApiTypes) {
        const dto = plainToClass(AnalyzeDataSourceDto, {
          ...validAnalysisData,
          apiType,
        });
        const errors = await validate(dto);
        const apiTypeErrors = errors.filter(error => error.property === 'apiType');
        expect(apiTypeErrors).toHaveLength(0);
      }
    });

    it('should accept valid dataType values', async () => {
      const validDataTypes = ['quote_fields', 'basic_info_fields', 'index_fields'];

      for (const dataType of validDataTypes) {
        const dto = plainToClass(AnalyzeDataSourceDto, {
          ...validAnalysisData,
          dataType,
        });
        const errors = await validate(dto);
        const dataTypeErrors = errors.filter(error => error.property === 'dataType');
        expect(dataTypeErrors).toHaveLength(0);
      }
    });
  });

  describe('ExtractedFieldDto', () => {
    const validFieldData = {
      fieldPath: 'last_done',
      fieldName: 'last_done',
      fieldType: 'number',
      sampleValue: 561,
      confidence: 0.85,
      isNested: false,
      nestingLevel: 0,
    };

    it('should validate a complete extracted field', async () => {
      const dto = plainToClass(ExtractedFieldDto, validFieldData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require all essential fields', async () => {
      const incompleteData = {
        sampleValue: 561,
      };

      const dto = plainToClass(ExtractedFieldDto, incompleteData);
      const errors = await validate(dto);

      const requiredFields = ['fieldPath', 'fieldName', 'fieldType', 'confidence', 'isNested', 'nestingLevel'];
      requiredFields.forEach(field => {
        expect(errors.some(error => error.property === field)).toBe(true);
      });
    });

    it('should validate confidence range', async () => {
      const invalidConfidenceHigh = {
        ...validFieldData,
        confidence: 1.5,
      };
      const invalidConfidenceLow = {
        ...validFieldData,
        confidence: -0.1,
      };

      const dtoHigh = plainToClass(ExtractedFieldDto, invalidConfidenceHigh);
      const errorsHigh = await validate(dtoHigh);
      expect(errorsHigh.some(error => error.property === 'confidence')).toBe(true);

      const dtoLow = plainToClass(ExtractedFieldDto, invalidConfidenceLow);
      const errorsLow = await validate(dtoLow);
      expect(errorsLow.some(error => error.property === 'confidence')).toBe(true);
    });

    it('should validate nestingLevel minimum', async () => {
      const invalidNestingLevel = {
        ...validFieldData,
        nestingLevel: -1,
      };

      const dto = plainToClass(ExtractedFieldDto, invalidNestingLevel);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'nestingLevel')).toBe(true);
    });

    it('should accept null or undefined sampleValue', async () => {
      const fieldWithNullValue = {
        ...validFieldData,
        sampleValue: null,
      };
      const fieldWithUndefinedValue = {
        ...validFieldData,
        sampleValue: undefined,
      };

      const dtoNull = plainToClass(ExtractedFieldDto, fieldWithNullValue);
      const errorsNull = await validate(dtoNull);
      expect(errorsNull.filter(error => error.property === 'sampleValue')).toHaveLength(0);

      const dtoUndefined = plainToClass(ExtractedFieldDto, fieldWithUndefinedValue);
      const errorsUndefined = await validate(dtoUndefined);
      expect(errorsUndefined.filter(error => error.property === 'sampleValue')).toHaveLength(0);
    });
  });

  describe('DataSourceAnalysisResponseDto', () => {
    const validAnalysisResponse = {
      provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      apiType: 'stream',
      sampleData: {
        symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
        last_done: 561,
        volume: 11292534,
      },
      extractedFields: [
        {
          fieldPath: 'last_done',
          fieldName: 'last_done',
          fieldType: 'number',
          sampleValue: 561,
          confidence: 0.85,
          isNested: false,
          nestingLevel: 0,
        },
      ],
      totalFields: 15,
      analysisTimestamp: new Date(),
      confidence: 0.82,
      savedTemplate: {
        id: '12345',
        name: 'longport_quote_fields_template',
        message: '模板已成功保存到数据库',
      },
    };

    it('should validate a complete analysis response', async () => {
      const dto = plainToClass(DataSourceAnalysisResponseDto, validAnalysisResponse);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require essential fields', async () => {
      const incompleteData = {
        extractedFields: [],
      };

      const dto = plainToClass(DataSourceAnalysisResponseDto, incompleteData);
      const errors = await validate(dto);

      const requiredFields = ['provider', 'apiType', 'sampleData', 'totalFields', 'confidence'];
      requiredFields.forEach(field => {
        expect(errors.some(error => error.property === field)).toBe(true);
      });
    });

    it('should validate extractedFields array', async () => {
      const invalidExtractedFields = {
        ...validAnalysisResponse,
        extractedFields: [
          {
            fieldPath: 'valid_field',
            fieldName: 'valid_field',
            // Missing required fields
          },
        ],
      };

      const dto = plainToClass(DataSourceAnalysisResponseDto, invalidExtractedFields);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate confidence range', async () => {
      const invalidConfidence = {
        ...validAnalysisResponse,
        confidence: 1.5,
      };

      const dto = plainToClass(DataSourceAnalysisResponseDto, invalidConfidence);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'confidence')).toBe(true);
    });

    it('should validate totalFields minimum', async () => {
      const invalidTotalFields = {
        ...validAnalysisResponse,
        totalFields: -1,
      };

      const dto = plainToClass(DataSourceAnalysisResponseDto, invalidTotalFields);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'totalFields')).toBe(true);
    });
  });

  describe('CreateDataSourceTemplateDto', () => {
    const validTemplateData = {
      name: 'LongPort WebSocket 报价流',
      provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
      apiType: 'stream',
      description: 'Template for LongPort WebSocket quote stream',
      sampleData: {
        symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
        last_done: 561,
      },
      extractedFields: [
        {
          fieldPath: 'last_done',
          fieldName: 'last_done',
          fieldType: 'number',
          sampleValue: 561,
          confidence: 0.85,
          isNested: false,
          nestingLevel: 0,
        },
      ],
      isDefault: true,
      confidence: 0.82,
    };

    it('should validate a complete template creation request', async () => {
      const dto = plainToClass(CreateDataSourceTemplateDto, validTemplateData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require essential fields', async () => {
      const incompleteData = {
        description: 'Missing required fields',
      };

      const dto = plainToClass(CreateDataSourceTemplateDto, incompleteData);
      const errors = await validate(dto);

      const requiredFields = ['name', 'provider', 'apiType', 'sampleData', 'extractedFields', 'confidence'];
      requiredFields.forEach(field => {
        expect(errors.some(error => error.property === field)).toBe(true);
      });
    });

    it('should validate name length limits', async () => {
      const longName = 'a'.repeat(101);
      const longNameData = {
        ...validTemplateData,
        name: longName,
      };

      const dto = plainToClass(CreateDataSourceTemplateDto, longNameData);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'name')).toBe(true);
    });

    it('should validate description length limits', async () => {
      const longDescription = 'a'.repeat(501);
      const longDescriptionData = {
        ...validTemplateData,
        description: longDescription,
      };

      const dto = plainToClass(CreateDataSourceTemplateDto, longDescriptionData);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'description')).toBe(true);
    });

    it('should have default value for isDefault', () => {
      const templateData = {
        ...validTemplateData,
        isDefault: undefined,
      };

      const dto = plainToClass(CreateDataSourceTemplateDto, templateData);
      expect(dto.isDefault).toBe(false);
    });
  });

  describe('SuggestFieldMappingsDto', () => {
    const validSuggestionsData = {
      templateId: '507f1f77bcf86cd799439011',
      targetFields: ['symbol', 'lastPrice', 'volume', 'timestamp'],
      minConfidence: 0.3,
    };

    it('should validate a complete field mapping suggestions request', async () => {
      const dto = plainToClass(SuggestFieldMappingsDto, validSuggestionsData);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require templateId and targetFields', async () => {
      const incompleteData = {
        minConfidence: 0.5,
      };

      const dto = plainToClass(SuggestFieldMappingsDto, incompleteData);
      const errors = await validate(dto);

      expect(errors.some(error => error.property === 'templateId')).toBe(true);
      expect(errors.some(error => error.property === 'targetFields')).toBe(true);
    });

    it('should validate targetFields as string array', async () => {
      const invalidTargetFields = {
        ...validSuggestionsData,
        targetFields: ['valid', 123, 'another_valid'],
      };

      const dto = plainToClass(SuggestFieldMappingsDto, invalidTargetFields);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'targetFields')).toBe(true);
    });

    it('should validate minConfidence range', async () => {
      const invalidConfidenceHigh = {
        ...validSuggestionsData,
        minConfidence: 1.5,
      };
      const invalidConfidenceLow = {
        ...validSuggestionsData,
        minConfidence: -0.1,
      };

      const dtoHigh = plainToClass(SuggestFieldMappingsDto, invalidConfidenceHigh);
      const errorsHigh = await validate(dtoHigh);
      expect(errorsHigh.some(error => error.property === 'minConfidence')).toBe(true);

      const dtoLow = plainToClass(SuggestFieldMappingsDto, invalidConfidenceLow);
      const errorsLow = await validate(dtoLow);
      expect(errorsLow.some(error => error.property === 'minConfidence')).toBe(true);
    });

    it('should have default value for minConfidence', () => {
      const suggestionsData = {
        templateId: '507f1f77bcf86cd799439011',
        targetFields: ['symbol', 'lastPrice'],
      };

      const dto = plainToClass(SuggestFieldMappingsDto, suggestionsData);
      expect(dto.minConfidence).toBe(0.3);
    });
  });

  describe('FieldMappingSuggestionDto', () => {
    const validSuggestion = {
      sourceField: {
        fieldPath: 'last_done',
        fieldName: 'last_done',
        fieldType: 'number',
        sampleValue: 561,
        confidence: 0.85,
        isNested: false,
        nestingLevel: 0,
      },
      targetField: 'lastPrice',
      confidence: 0.85,
      reasoning: '语义匹配: last_done -> lastPrice',
    };

    it('should validate a complete field mapping suggestion', async () => {
      const dto = plainToClass(FieldMappingSuggestionDto, validSuggestion);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require all essential fields', async () => {
      const incompleteData = {
        reasoning: 'Missing other fields',
      };

      const dto = plainToClass(FieldMappingSuggestionDto, incompleteData);
      const errors = await validate(dto);

      const requiredFields = ['sourceField', 'targetField', 'confidence'];
      requiredFields.forEach(field => {
        expect(errors.some(error => error.property === field)).toBe(true);
      });
    });

    it('should validate confidence range', async () => {
      const invalidConfidence = {
        ...validSuggestion,
        confidence: 1.5,
      };

      const dto = plainToClass(FieldMappingSuggestionDto, invalidConfidence);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'confidence')).toBe(true);
    });

    it('should validate nested sourceField', async () => {
      const invalidSourceField = {
        ...validSuggestion,
        sourceField: {
          fieldPath: 'valid_path',
          // Missing required fields
        },
      };

      const dto = plainToClass(FieldMappingSuggestionDto, invalidSourceField);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('SuggestFieldMappingsResponseDto', () => {
    const validMappingsResponse = {
      templateId: '507f1f77bcf86cd799439011',
      suggestions: [
        {
          sourceField: {
            fieldPath: 'last_done',
            fieldName: 'last_done',
            fieldType: 'number',
            sampleValue: 561,
            confidence: 0.85,
            isNested: false,
            nestingLevel: 0,
          },
          targetField: 'lastPrice',
          confidence: 0.85,
          reasoning: '语义匹配: last_done -> lastPrice',
        },
      ],
      generatedAt: new Date(),
      coverage: 0.75,
    };

    it('should validate a complete field mappings response', async () => {
      const dto = plainToClass(SuggestFieldMappingsResponseDto, validMappingsResponse);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should require essential fields', async () => {
      const incompleteData = {
        suggestions: [],
      };

      const dto = plainToClass(SuggestFieldMappingsResponseDto, incompleteData);
      const errors = await validate(dto);

      const requiredFields = ['templateId', 'coverage'];
      requiredFields.forEach(field => {
        expect(errors.some(error => error.property === field)).toBe(true);
      });
    });

    it('should validate coverage range', async () => {
      const invalidCoverage = {
        ...validMappingsResponse,
        coverage: 1.5,
      };

      const dto = plainToClass(SuggestFieldMappingsResponseDto, invalidCoverage);
      const errors = await validate(dto);
      expect(errors.some(error => error.property === 'coverage')).toBe(true);
    });

    it('should validate suggestions array', async () => {
      const invalidSuggestions = {
        ...validMappingsResponse,
        suggestions: [
          {
            targetField: 'lastPrice',
            // Missing required fields
          },
        ],
      };

      const dto = plainToClass(SuggestFieldMappingsResponseDto, invalidSuggestions);
      const errors = await validate(dto);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('DataSourceTemplateResponseDto', () => {
    describe('fromDocument static method', () => {
      it('should convert document to response DTO correctly', () => {
        const mockDocument = {
          _id: '507f1f77bcf86cd799439011',
          name: 'test_template',
          provider: 'longport',
          apiType: 'stream',
          description: 'Test template',
          sampleData: { symbol: '700.HK', price: 100 },
          extractedFields: [
            {
              fieldPath: 'price',
              fieldName: 'price',
              fieldType: 'number',
              sampleValue: 100,
              confidence: 0.9,
              isNested: false,
              nestingLevel: 0,
            },
          ],
          totalFields: 5,
          confidence: 0.85,
          isActive: true,
          isDefault: false,
          usageCount: 10,
          lastUsedAt: new Date('2023-01-01'),
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-03'),
        };

        const result = DataSourceTemplateResponseDto.fromDocument(mockDocument);

        expect(result.id).toBe('507f1f77bcf86cd799439011');
        expect(result.name).toBe('test_template');
        expect(result.provider).toBe('longport');
        expect(result.apiType).toBe('stream');
        expect(result.description).toBe('Test template');
        expect(result.extractedFields).toHaveLength(1);
        expect(result.totalFields).toBe(5);
        expect(result.confidence).toBe(0.85);
        expect(result.isActive).toBe(true);
        expect(result.isDefault).toBe(false);
        expect(result.usageCount).toBe(10);
      });

      it('should handle missing optional fields with defaults', () => {
        const minimalDocument = {
          _id: '507f1f77bcf86cd799439011',
          name: 'minimal_template',
          provider: 'test_provider',
          apiType: 'rest',
          sampleData: { test: 'value' },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = DataSourceTemplateResponseDto.fromDocument(minimalDocument);

        expect(result.id).toBe('507f1f77bcf86cd799439011');
        expect(result.extractedFields).toEqual([]);
        expect(result.totalFields).toBe(0);
        expect(result.confidence).toBe(0);
        expect(result.isActive).toBe(true);
        expect(result.isDefault).toBe(false);
        expect(result.usageCount).toBe(0);
      });

      it('should handle document with id instead of _id', () => {
        const documentWithId = {
          id: 'test-id-123',
          name: 'test_template',
          provider: 'test_provider',
          apiType: 'rest',
          sampleData: { test: 'value' },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const result = DataSourceTemplateResponseDto.fromDocument(documentWithId);
        expect(result.id).toBe('test-id-123');
      });
    });
  });
});
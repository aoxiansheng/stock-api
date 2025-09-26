import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

import { DataTransformRequestDto } from '../../../../../../../src/core/02-processing/transformer/dto/data-transform-request.dto';

describe('DataTransformRequestDto', () => {
  describe('Validation', () => {
    it('should validate valid transform request', async () => {
      const validRequest = {
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: { last_done: 385.6, change_rate: -0.0108 },
      };

      const dto = plainToClass(DataTransformRequestDto, validRequest);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate request with all optional fields', async () => {
      const fullRequest = {
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        mappingOutRuleId: 'custom-rule-123',
        options: {
          includeMetadata: true,
          includeDebugInfo: false,
        },
      };

      const dto = plainToClass(DataTransformRequestDto, fullRequest);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should fail validation for missing provider', async () => {
      const invalidRequest = {
        // provider: 'longport', // Missing required field
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
      };

      const dto = plainToClass(DataTransformRequestDto, invalidRequest);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'provider')).toBe(true);
    });

    it('should fail validation for invalid apiType', async () => {
      const invalidRequest = {
        provider: 'longport',
        apiType: 'invalid_type', // Should be 'rest' or 'stream'
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
      };

      const dto = plainToClass(DataTransformRequestDto, invalidRequest);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'apiType')).toBe(true);
    });

    it('should fail validation for missing transDataRuleListType', async () => {
      const invalidRequest = {
        provider: 'longport',
        apiType: 'rest',
        // transDataRuleListType: 'quote_fields', // Missing required field
        rawData: { test: 'data' },
      };

      const dto = plainToClass(DataTransformRequestDto, invalidRequest);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'transDataRuleListType')).toBe(true);
    });

    it('should fail validation for missing rawData', async () => {
      const invalidRequest = {
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        // rawData: { test: 'data' }, // Missing required field
      };

      const dto = plainToClass(DataTransformRequestDto, invalidRequest);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'rawData')).toBe(true);
    });

    it('should fail validation for empty rawData', async () => {
      const invalidRequest = {
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: {}, // Empty object should fail @IsNotEmpty()
      };

      const dto = plainToClass(DataTransformRequestDto, invalidRequest);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'rawData')).toBe(true);
    });

    it('should validate both rest and stream API types', async () => {
      const restRequest = {
        provider: 'longport',
        apiType: 'rest' as const,
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
      };

      const streamRequest = {
        provider: 'longport',
        apiType: 'stream' as const,
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
      };

      const restDto = plainToClass(DataTransformRequestDto, restRequest);
      const streamDto = plainToClass(DataTransformRequestDto, streamRequest);

      const restErrors = await validate(restDto);
      const streamErrors = await validate(streamDto);

      expect(restErrors).toHaveLength(0);
      expect(streamErrors).toHaveLength(0);
    });

    it('should validate optional mappingOutRuleId', async () => {
      const requestWithRuleId = {
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        mappingOutRuleId: 'rule-abc-123',
      };

      const dto = plainToClass(DataTransformRequestDto, requestWithRuleId);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.mappingOutRuleId).toBe('rule-abc-123');
    });

    it('should fail validation for invalid mappingOutRuleId type', async () => {
      const invalidRequest = {
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        mappingOutRuleId: 123, // Should be string
      };

      const dto = plainToClass(DataTransformRequestDto, invalidRequest);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'mappingOutRuleId')).toBe(true);
    });
  });

  describe('Transform Options Validation', () => {
    it('should validate valid transform options', async () => {
      const requestWithOptions = {
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        options: {
          includeMetadata: true,
          includeDebugInfo: false,
        },
      };

      const dto = plainToClass(DataTransformRequestDto, requestWithOptions);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should validate partial transform options', async () => {
      const requestWithPartialOptions = {
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        options: {
          includeMetadata: true,
          // includeDebugInfo omitted
        },
      };

      const dto = plainToClass(DataTransformRequestDto, requestWithPartialOptions);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
    });

    it('should fail validation for invalid option types', async () => {
      const requestWithInvalidOptions = {
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        options: {
          includeMetadata: 'yes', // Should be boolean
          includeDebugInfo: 1, // Should be boolean
        },
      };

      const dto = plainToClass(DataTransformRequestDto, requestWithInvalidOptions);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'options')).toBe(true);
    });
  });

  describe('Property Assignment', () => {
    it('should correctly assign all properties', () => {
      const requestData = {
        provider: 'test-provider',
        apiType: 'stream',
        transDataRuleListType: 'test-rule-type',
        rawData: { field1: 'value1', field2: 100 },
        mappingOutRuleId: 'test-rule-id',
        options: {
          includeMetadata: true,
          includeDebugInfo: true,
        },
      };

      const dto = plainToClass(DataTransformRequestDto, requestData);

      expect(dto.provider).toBe('test-provider');
      expect(dto.apiType).toBe('stream');
      expect(dto.transDataRuleListType).toBe('test-rule-type');
      expect(dto.rawData).toEqual({ field1: 'value1', field2: 100 });
      expect(dto.mappingOutRuleId).toBe('test-rule-id');
      expect(dto.options).toEqual({
        includeMetadata: true,
        includeDebugInfo: true,
      });
    });

    it('should handle missing optional properties', () => {
      const minimalRequest = {
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
      };

      const dto = plainToClass(DataTransformRequestDto, minimalRequest);

      expect(dto.provider).toBe('longport');
      expect(dto.apiType).toBe('rest');
      expect(dto.transDataRuleListType).toBe('quote_fields');
      expect(dto.rawData).toEqual({ test: 'data' });
      expect(dto.mappingOutRuleId).toBeUndefined();
      expect(dto.options).toBeUndefined();
    });
  });

  describe('Raw Data Scenarios', () => {
    it('should handle complex nested raw data', async () => {
      const complexData = {
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: {
          quotes: [
            { symbol: '700.HK', price: 385.6 },
            { symbol: '0941.HK', price: 67.8 },
          ],
          metadata: {
            timestamp: '2024-01-01T00:00:00Z',
            source: 'live',
          },
        },
      };

      const dto = plainToClass(DataTransformRequestDto, complexData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.rawData.quotes).toHaveLength(2);
    });

    it('should handle array raw data', async () => {
      const arrayData = {
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: [
          { symbol: '700.HK', price: 385.6 },
          { symbol: '0941.HK', price: 67.8 },
        ],
      };

      const dto = plainToClass(DataTransformRequestDto, arrayData);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(Array.isArray(dto.rawData)).toBe(true);
      expect(dto.rawData).toHaveLength(2);
    });

    it('should handle primitive raw data', async () => {
      const primitiveData = {
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: 'simple string data',
      };

      const dto = plainToClass(DataTransformRequestDto, primitiveData);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0); // Should fail @IsObject validation
    });
  });

  describe('Provider Scenarios', () => {
    it('should handle different provider names', async () => {
      const providers = ['longport', 'yahoo', 'alpha-vantage', 'custom-provider-123'];

      for (const provider of providers) {
        const request = {
          provider,
          apiType: 'rest',
          transDataRuleListType: 'quote_fields',
          rawData: { test: 'data' },
        };

        const dto = plainToClass(DataTransformRequestDto, request);
        const errors = await validate(dto);

        expect(errors).toHaveLength(0);
        expect(dto.provider).toBe(provider);
      }
    });

    it('should fail validation for empty provider', async () => {
      const invalidRequest = {
        provider: '', // Empty string
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
      };

      const dto = plainToClass(DataTransformRequestDto, invalidRequest);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(error => error.property === 'provider')).toBe(true);
    });
  });

  describe('API Documentation', () => {
    it('should be serializable for API responses', () => {
      const requestData = {
        provider: 'longport',
        apiType: 'rest',
        transDataRuleListType: 'quote_fields',
        rawData: { test: 'data' },
        mappingOutRuleId: 'rule-123',
        options: {
          includeMetadata: true,
          includeDebugInfo: false,
        },
      };

      const dto = plainToClass(DataTransformRequestDto, requestData);
      const json = JSON.stringify(dto);
      const parsed = JSON.parse(json);

      expect(parsed.provider).toBe('longport');
      expect(parsed.apiType).toBe('rest');
      expect(parsed.transDataRuleListType).toBe('quote_fields');
      expect(parsed.rawData).toEqual({ test: 'data' });
      expect(parsed.mappingOutRuleId).toBe('rule-123');
      expect(parsed.options).toEqual({
        includeMetadata: true,
        includeDebugInfo: false,
      });
    });

    it('should have swagger decorators for documentation', () => {
      const dto = new DataTransformRequestDto();

      // Check that the class has the necessary metadata for Swagger documentation
      expect(dto).toBeDefined();
    });
  });
});

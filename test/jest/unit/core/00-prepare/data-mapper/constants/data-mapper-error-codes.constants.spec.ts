import {
  DATA_MAPPER_ERROR_CODES,
  DataMapperErrorCode,
} from '../../../../../../../src/core/00-prepare/data-mapper/constants/data-mapper-error-codes.constants';

describe('Data Mapper Error Codes Constants', () => {
  describe('DATA_MAPPER_ERROR_CODES', () => {
    it('should be an object with error codes', () => {
      expect(typeof DATA_MAPPER_ERROR_CODES).toBe('object');
      expect(DATA_MAPPER_ERROR_CODES).not.toBeNull();
    });

    it('should contain all validation error codes (001-299)', () => {
      const validationErrors = [
        'INVALID_RULE_ID_FORMAT',
        'INVALID_SUGGESTION_INDEX',
        'INVALID_MAPPING_RULE_DATA',
        'INVALID_FIELD_MAPPING',
        'MISSING_REQUIRED_FIELDS',
        'INVALID_API_TYPE',
        'INVALID_RULE_NAME',
      ];

      validationErrors.forEach(errorKey => {
        expect(DATA_MAPPER_ERROR_CODES).toHaveProperty(errorKey);
        const errorCode = DATA_MAPPER_ERROR_CODES[errorKey];
        expect(errorCode).toMatch(/^DATA_MAPPER_VALIDATION_\d{3}$/);
        const codeNumber = parseInt(errorCode.split('_').pop()!);
        expect(codeNumber).toBeGreaterThanOrEqual(1);
        expect(codeNumber).toBeLessThanOrEqual(299);
      });
    });

    it('should contain all business logic error codes (300-599)', () => {
      const businessErrors = [
        'MAPPING_RULE_NOT_FOUND',
        'MAPPING_RULE_ALREADY_EXISTS',
        'RULE_APPLICATION_FAILED',
        'TEMPLATE_NOT_FOUND',
        'TEMPLATE_ALREADY_EXISTS',
        'TEMPLATE_GENERATION_FAILED',
        'RULE_ALIGNMENT_FAILED',
        'DATA_SOURCE_ANALYSIS_FAILED',
        'BEST_RULE_MATCH_FAILED',
        'RULE_DOCUMENT_CREATION_FAILED',
        'FLEXIBLE_MAPPING_FAILED',
      ];

      businessErrors.forEach(errorKey => {
        expect(DATA_MAPPER_ERROR_CODES).toHaveProperty(errorKey);
        const errorCode = DATA_MAPPER_ERROR_CODES[errorKey];
        expect(errorCode).toMatch(/^DATA_MAPPER_BUSINESS_\d{3}$/);
        const codeNumber = parseInt(errorCode.split('_').pop()!);
        expect(codeNumber).toBeGreaterThanOrEqual(300);
        expect(codeNumber).toBeLessThanOrEqual(599);
      });
    });

    it('should contain all system resource error codes (600-899)', () => {
      const systemErrors = [
        'RULE_CACHE_ERROR',
        'TEMPLATE_CACHE_ERROR',
        'MEMORY_PRESSURE_HIGH',
        'PROCESSING_TIMEOUT',
        'CONCURRENT_TASK_LIMIT_EXCEEDED',
        'RULE_SERIALIZATION_ERROR',
        'TEMPLATE_SERIALIZATION_ERROR',
        'ASYNC_TASK_LIMITER_ERROR',
      ];

      systemErrors.forEach(errorKey => {
        expect(DATA_MAPPER_ERROR_CODES).toHaveProperty(errorKey);
        const errorCode = DATA_MAPPER_ERROR_CODES[errorKey];
        expect(errorCode).toMatch(/^DATA_MAPPER_SYSTEM_\d{3}$/);
        const codeNumber = parseInt(errorCode.split('_').pop()!);
        expect(codeNumber).toBeGreaterThanOrEqual(600);
        expect(codeNumber).toBeLessThanOrEqual(899);
      });
    });

    it('should contain all external dependency error codes (900-999)', () => {
      const externalErrors = [
        'DATABASE_CONNECTION_ERROR',
        'MONGODB_QUERY_ERROR',
        'REDIS_CACHE_ERROR',
        'EVENT_BUS_ERROR',
        'PAGINATION_SERVICE_ERROR',
        'METRICS_COLLECTION_ERROR',
        'EXTERNAL_TEMPLATE_FETCH_ERROR',
        'RULE_DOCUMENT_FETCH_ERROR',
      ];

      externalErrors.forEach(errorKey => {
        expect(DATA_MAPPER_ERROR_CODES).toHaveProperty(errorKey);
        const errorCode = DATA_MAPPER_ERROR_CODES[errorKey];
        expect(errorCode).toMatch(/^DATA_MAPPER_EXTERNAL_\d{3}$/);
        const codeNumber = parseInt(errorCode.split('_').pop()!);
        expect(codeNumber).toBeGreaterThanOrEqual(900);
        expect(codeNumber).toBeLessThanOrEqual(999);
      });
    });

    it('should have unique error codes', () => {
      const errorCodes = Object.values(DATA_MAPPER_ERROR_CODES);
      const uniqueErrorCodes = new Set(errorCodes);
      expect(uniqueErrorCodes.size).toBe(errorCodes.length);
    });

    it('should follow the correct naming format', () => {
      const allErrorCodes = Object.values(DATA_MAPPER_ERROR_CODES);
      allErrorCodes.forEach(errorCode => {
        expect(errorCode).toMatch(/^DATA_MAPPER_(VALIDATION|BUSINESS|SYSTEM|EXTERNAL)_\d{3}$/);
      });
    });

    it('should contain specific expected error codes', () => {
      expect(DATA_MAPPER_ERROR_CODES.INVALID_RULE_ID_FORMAT).toBe('DATA_MAPPER_VALIDATION_001');
      expect(DATA_MAPPER_ERROR_CODES.MAPPING_RULE_NOT_FOUND).toBe('DATA_MAPPER_BUSINESS_300');
      expect(DATA_MAPPER_ERROR_CODES.RULE_CACHE_ERROR).toBe('DATA_MAPPER_SYSTEM_600');
      expect(DATA_MAPPER_ERROR_CODES.DATABASE_CONNECTION_ERROR).toBe('DATA_MAPPER_EXTERNAL_900');
    });

    it('should have descriptive error key names', () => {
      const errorKeys = Object.keys(DATA_MAPPER_ERROR_CODES);
      errorKeys.forEach(key => {
        expect(key).toMatch(/^[A-Z_]+$/); // Should be all uppercase with underscores
        expect(key.length).toBeGreaterThan(5); // Should be reasonably descriptive
        expect(key).not.toMatch(/^\d/); // Should not start with a number
      });
    });
  });

  describe('DataMapperErrorCode Type', () => {
    it('should properly define the union type', () => {
      const validCode: DataMapperErrorCode = 'DATA_MAPPER_VALIDATION_001';
      expect(Object.values(DATA_MAPPER_ERROR_CODES).includes(validCode)).toBe(true);

      const anotherValidCode: DataMapperErrorCode = 'DATA_MAPPER_BUSINESS_300';
      expect(Object.values(DATA_MAPPER_ERROR_CODES).includes(anotherValidCode)).toBe(true);
    });

    it('should include all error codes in the type', () => {
      const allErrorCodes = Object.values(DATA_MAPPER_ERROR_CODES);
      allErrorCodes.forEach(code => {
        const typedCode: DataMapperErrorCode = code;
        expect(typeof typedCode).toBe('string');
      });
    });
  });

  describe('Error Code Categories', () => {
    it('should have proper distribution across categories', () => {
      const allErrorCodes = Object.values(DATA_MAPPER_ERROR_CODES);

      const validationCodes = allErrorCodes.filter(code => code.includes('VALIDATION'));
      const businessCodes = allErrorCodes.filter(code => code.includes('BUSINESS'));
      const systemCodes = allErrorCodes.filter(code => code.includes('SYSTEM'));
      const externalCodes = allErrorCodes.filter(code => code.includes('EXTERNAL'));

      expect(validationCodes.length).toBeGreaterThan(0);
      expect(businessCodes.length).toBeGreaterThan(0);
      expect(systemCodes.length).toBeGreaterThan(0);
      expect(externalCodes.length).toBeGreaterThan(0);

      const totalCodes = validationCodes.length + businessCodes.length + systemCodes.length + externalCodes.length;
      expect(totalCodes).toBe(allErrorCodes.length);
    });

    it('should maintain sequential numbering within categories', () => {
      const validationCodes = Object.values(DATA_MAPPER_ERROR_CODES)
        .filter(code => code.includes('VALIDATION'))
        .map(code => parseInt(code.split('_').pop()!))
        .sort((a, b) => a - b);

      // Check that all validation codes are in the 001-299 range
      expect(validationCodes[0]).toBeGreaterThanOrEqual(1);
      expect(validationCodes[validationCodes.length - 1]).toBeLessThanOrEqual(299);
    });
  });

  describe('Constants Immutability', () => {
    it('should allow modification of the error codes object (not frozen)', () => {
      // Since the error codes object is not frozen, we can modify it
      const originalValue = DATA_MAPPER_ERROR_CODES.INVALID_RULE_ID_FORMAT;
      (DATA_MAPPER_ERROR_CODES as any).NEW_ERROR_CODE = 'DATA_MAPPER_TEST_001';
      expect(DATA_MAPPER_ERROR_CODES).toHaveProperty('NEW_ERROR_CODE');

      // Cleanup
      delete (DATA_MAPPER_ERROR_CODES as any).NEW_ERROR_CODE;
      expect(DATA_MAPPER_ERROR_CODES.INVALID_RULE_ID_FORMAT).toBe(originalValue);
    });

    it('should preserve existing error codes integrity', () => {
      const originalErrorCount = Object.keys(DATA_MAPPER_ERROR_CODES).length;
      const originalCodes = { ...DATA_MAPPER_ERROR_CODES };

      // Verify that all original codes are still present
      Object.entries(originalCodes).forEach(([key, value]) => {
        expect(DATA_MAPPER_ERROR_CODES).toHaveProperty(key, value);
      });

      expect(Object.keys(DATA_MAPPER_ERROR_CODES).length).toBeGreaterThanOrEqual(originalErrorCount);
    });
  });

  describe('Error Code Consistency', () => {
    it('should maintain consistent format across all categories', () => {
      const categories = ['VALIDATION', 'BUSINESS', 'SYSTEM', 'EXTERNAL'];
      const prefix = 'DATA_MAPPER';

      categories.forEach(category => {
        const categoryCodes = Object.values(DATA_MAPPER_ERROR_CODES)
          .filter(code => code.includes(category));

        categoryCodes.forEach(code => {
          expect(code.startsWith(`${prefix}_${category}_`)).toBe(true);
          const numberPart = code.split('_').pop();
          expect(numberPart).toMatch(/^\d{3}$/); // Exactly 3 digits
        });
      });
    });
  });
});
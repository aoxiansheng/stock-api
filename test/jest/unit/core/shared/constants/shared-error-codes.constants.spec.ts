import { SHARED_ERROR_CODES, SharedErrorCode } from '@core/shared/constants/shared-error-codes.constants';

describe('Shared Error Codes Constants', () => {
  describe('Constant Structure', () => {
    it('should be defined and immutable', () => {
      expect(SHARED_ERROR_CODES).toBeDefined();
      expect(Object.isFrozen(SHARED_ERROR_CODES)).toBe(true);
    });

    it('should have all required error codes', () => {
      const expectedCodes = [
        'INVALID_PATH_FORMAT',
        'PATH_DEPTH_EXCEEDED',
        'INVALID_OBJECT_TYPE',
        'INVALID_SYMBOL_FORMAT',
        'MISSING_REQUIRED_PARAMETER',
        'INVALID_FIELD_MAPPING',
        'DANGEROUS_PROPERTY_ACCESS',
        'MARKET_STATUS_UNAVAILABLE',
        'DATA_CHANGE_NOT_DETECTED',
        'FIELD_MAPPING_FAILED',
        'SNAPSHOT_COMPARISON_FAILED',
        'PROVIDER_INTEGRATION_UNAVAILABLE',
        'MEMORY_CACHE_FULL',
        'OPERATION_TIMEOUT',
        'CONFIGURATION_ERROR',
        'CACHE_SERVICE_ERROR',
        'REDIS_SNAPSHOT_ERROR',
        'PROVIDER_CONNECTION_FAILED',
        'PROVIDER_SERVICE_UNAVAILABLE',
      ];

      expectedCodes.forEach(code => {
        expect(SHARED_ERROR_CODES[code]).toBeDefined();
        expect(typeof SHARED_ERROR_CODES[code]).toBe('string');
      });
    });

    it('should have exactly 19 error codes', () => {
      const codeKeys = Object.keys(SHARED_ERROR_CODES);
      expect(codeKeys).toHaveLength(19);
    });
  });

  describe('Error Code Format Validation', () => {
    it('should follow SHARED_{CATEGORY}_{SEQUENCE} format', () => {
      const errorCodePattern = /^SHARED_[A-Z]+_\d{3}$/;

      Object.values(SHARED_ERROR_CODES).forEach(errorCode => {
        expect(errorCode).toMatch(errorCodePattern);
      });
    });

    it('should have valid category names', () => {
      const validCategories = ['VALIDATION', 'BUSINESS', 'SYSTEM', 'EXTERNAL'];

      Object.values(SHARED_ERROR_CODES).forEach(errorCode => {
        const category = errorCode.split('_')[1];
        expect(validCategories).toContain(category);
      });
    });

    it('should have 3-digit sequence numbers', () => {
      Object.values(SHARED_ERROR_CODES).forEach(errorCode => {
        const sequence = errorCode.split('_')[2];
        expect(sequence).toMatch(/^\d{3}$/);
        expect(sequence.length).toBe(3);
      });
    });
  });

  describe('Category Range Validation', () => {
    it('should have validation errors in range 001-299', () => {
      const validationCodes = Object.values(SHARED_ERROR_CODES)
        .filter(code => code.includes('_VALIDATION_'));

      validationCodes.forEach(code => {
        const sequence = parseInt(code.split('_')[2]);
        expect(sequence).toBeGreaterThanOrEqual(1);
        expect(sequence).toBeLessThanOrEqual(299);
      });

      expect(validationCodes.length).toBe(7);
    });

    it('should have business errors in range 300-599', () => {
      const businessCodes = Object.values(SHARED_ERROR_CODES)
        .filter(code => code.includes('_BUSINESS_'));

      businessCodes.forEach(code => {
        const sequence = parseInt(code.split('_')[2]);
        expect(sequence).toBeGreaterThanOrEqual(300);
        expect(sequence).toBeLessThanOrEqual(599);
      });

      expect(businessCodes.length).toBe(5);
    });

    it('should have system errors in range 600-899', () => {
      const systemCodes = Object.values(SHARED_ERROR_CODES)
        .filter(code => code.includes('_SYSTEM_'));

      systemCodes.forEach(code => {
        const sequence = parseInt(code.split('_')[2]);
        expect(sequence).toBeGreaterThanOrEqual(600);
        expect(sequence).toBeLessThanOrEqual(899);
      });

      expect(systemCodes.length).toBe(3);
    });

    it('should have external errors in range 900-999', () => {
      const externalCodes = Object.values(SHARED_ERROR_CODES)
        .filter(code => code.includes('_EXTERNAL_'));

      externalCodes.forEach(code => {
        const sequence = parseInt(code.split('_')[2]);
        expect(sequence).toBeGreaterThanOrEqual(900);
        expect(sequence).toBeLessThanOrEqual(999);
      });

      expect(externalCodes.length).toBe(4);
    });
  });

  describe('Error Code Uniqueness', () => {
    it('should have unique error code values', () => {
      const errorCodes = Object.values(SHARED_ERROR_CODES);
      const uniqueCodes = new Set(errorCodes);

      expect(uniqueCodes.size).toBe(errorCodes.length);
    });

    it('should have unique sequence numbers within each category', () => {
      const categories = ['VALIDATION', 'BUSINESS', 'SYSTEM', 'EXTERNAL'];

      categories.forEach(category => {
        const categoryCodes = Object.values(SHARED_ERROR_CODES)
          .filter(code => code.includes(`_${category}_`));

        const sequences = categoryCodes.map(code => code.split('_')[2]);
        const uniqueSequences = new Set(sequences);

        expect(uniqueSequences.size).toBe(sequences.length);
      });
    });

    it('should have unique constant names', () => {
      const constantNames = Object.keys(SHARED_ERROR_CODES);
      const uniqueNames = new Set(constantNames);

      expect(uniqueNames.size).toBe(constantNames.length);
    });
  });

  describe('Specific Error Code Validation', () => {
    it('should have correct validation error codes', () => {
      expect(SHARED_ERROR_CODES.INVALID_PATH_FORMAT).toBe('SHARED_VALIDATION_001');
      expect(SHARED_ERROR_CODES.PATH_DEPTH_EXCEEDED).toBe('SHARED_VALIDATION_002');
      expect(SHARED_ERROR_CODES.INVALID_OBJECT_TYPE).toBe('SHARED_VALIDATION_003');
      expect(SHARED_ERROR_CODES.INVALID_SYMBOL_FORMAT).toBe('SHARED_VALIDATION_004');
      expect(SHARED_ERROR_CODES.MISSING_REQUIRED_PARAMETER).toBe('SHARED_VALIDATION_005');
      expect(SHARED_ERROR_CODES.INVALID_FIELD_MAPPING).toBe('SHARED_VALIDATION_006');
      expect(SHARED_ERROR_CODES.DANGEROUS_PROPERTY_ACCESS).toBe('SHARED_VALIDATION_007');
    });

    it('should have correct business error codes', () => {
      expect(SHARED_ERROR_CODES.MARKET_STATUS_UNAVAILABLE).toBe('SHARED_BUSINESS_300');
      expect(SHARED_ERROR_CODES.DATA_CHANGE_NOT_DETECTED).toBe('SHARED_BUSINESS_301');
      expect(SHARED_ERROR_CODES.FIELD_MAPPING_FAILED).toBe('SHARED_BUSINESS_302');
      expect(SHARED_ERROR_CODES.SNAPSHOT_COMPARISON_FAILED).toBe('SHARED_BUSINESS_303');
      expect(SHARED_ERROR_CODES.PROVIDER_INTEGRATION_UNAVAILABLE).toBe('SHARED_BUSINESS_350');
    });

    it('should have correct system error codes', () => {
      expect(SHARED_ERROR_CODES.MEMORY_CACHE_FULL).toBe('SHARED_SYSTEM_600');
      expect(SHARED_ERROR_CODES.OPERATION_TIMEOUT).toBe('SHARED_SYSTEM_700');
      expect(SHARED_ERROR_CODES.CONFIGURATION_ERROR).toBe('SHARED_SYSTEM_800');
    });

    it('should have correct external error codes', () => {
      expect(SHARED_ERROR_CODES.CACHE_SERVICE_ERROR).toBe('SHARED_EXTERNAL_900');
      expect(SHARED_ERROR_CODES.REDIS_SNAPSHOT_ERROR).toBe('SHARED_EXTERNAL_901');
      expect(SHARED_ERROR_CODES.PROVIDER_CONNECTION_FAILED).toBe('SHARED_EXTERNAL_950');
      expect(SHARED_ERROR_CODES.PROVIDER_SERVICE_UNAVAILABLE).toBe('SHARED_EXTERNAL_951');
    });
  });

  describe('Type Safety Validation', () => {
    it('should support SharedErrorCode type', () => {
      const testErrorCode: SharedErrorCode = SHARED_ERROR_CODES.INVALID_PATH_FORMAT;
      expect(testErrorCode).toBe('SHARED_VALIDATION_001');
    });

    it('should work with switch statements', () => {
      const testHandler = (errorCode: SharedErrorCode): string => {
        switch (errorCode) {
          case SHARED_ERROR_CODES.INVALID_PATH_FORMAT:
            return 'validation error';
          case SHARED_ERROR_CODES.MARKET_STATUS_UNAVAILABLE:
            return 'business error';
          case SHARED_ERROR_CODES.MEMORY_CACHE_FULL:
            return 'system error';
          case SHARED_ERROR_CODES.CACHE_SERVICE_ERROR:
            return 'external error';
          default:
            return 'unknown error';
        }
      };

      expect(testHandler(SHARED_ERROR_CODES.INVALID_PATH_FORMAT)).toBe('validation error');
      expect(testHandler(SHARED_ERROR_CODES.MARKET_STATUS_UNAVAILABLE)).toBe('business error');
      expect(testHandler(SHARED_ERROR_CODES.MEMORY_CACHE_FULL)).toBe('system error');
      expect(testHandler(SHARED_ERROR_CODES.CACHE_SERVICE_ERROR)).toBe('external error');
    });

    it('should work with object iteration', () => {
      const errorCodeKeys = Object.keys(SHARED_ERROR_CODES);
      const errorCodeValues = Object.values(SHARED_ERROR_CODES);

      expect(errorCodeKeys.length).toBeGreaterThan(0);
      expect(errorCodeValues.length).toBeGreaterThan(0);
      expect(errorCodeKeys.length).toBe(errorCodeValues.length);

      errorCodeKeys.forEach(key => {
        expect(typeof key).toBe('string');
        expect(key).toMatch(/^[A-Z_]+$/);
      });

      errorCodeValues.forEach(value => {
        expect(typeof value).toBe('string');
        expect(value).toMatch(/^SHARED_[A-Z]+_\d{3}$/);
      });
    });
  });

  describe('Business Logic Validation', () => {
    it('should cover all shared component error scenarios', () => {
      const scenarioCategories = {
        validation: [
          'INVALID_PATH_FORMAT',
          'PATH_DEPTH_EXCEEDED',
          'INVALID_OBJECT_TYPE',
          'INVALID_SYMBOL_FORMAT',
          'MISSING_REQUIRED_PARAMETER',
          'INVALID_FIELD_MAPPING',
          'DANGEROUS_PROPERTY_ACCESS',
        ],
        business: [
          'MARKET_STATUS_UNAVAILABLE',
          'DATA_CHANGE_NOT_DETECTED',
          'FIELD_MAPPING_FAILED',
          'SNAPSHOT_COMPARISON_FAILED',
          'PROVIDER_INTEGRATION_UNAVAILABLE',
        ],
        system: [
          'MEMORY_CACHE_FULL',
          'OPERATION_TIMEOUT',
          'CONFIGURATION_ERROR',
        ],
        external: [
          'CACHE_SERVICE_ERROR',
          'REDIS_SNAPSHOT_ERROR',
          'PROVIDER_CONNECTION_FAILED',
          'PROVIDER_SERVICE_UNAVAILABLE',
        ],
      };

      Object.entries(scenarioCategories).forEach(([category, scenarios]) => {
        scenarios.forEach(scenario => {
          expect(SHARED_ERROR_CODES[scenario]).toBeDefined();
          expect(SHARED_ERROR_CODES[scenario]).toContain(category.toUpperCase());
        });
      });
    });

    it('should have logical sequence numbering', () => {
      const validationSequences = Object.values(SHARED_ERROR_CODES)
        .filter(code => code.includes('_VALIDATION_'))
        .map(code => parseInt(code.split('_')[2]))
        .sort((a, b) => a - b);

      const businessSequences = Object.values(SHARED_ERROR_CODES)
        .filter(code => code.includes('_BUSINESS_'))
        .map(code => parseInt(code.split('_')[2]))
        .sort((a, b) => a - b);

      expect(validationSequences[0]).toBe(1);
      expect(validationSequences[validationSequences.length - 1]).toBe(7);

      expect(businessSequences[0]).toBe(300);
      expect(businessSequences[businessSequences.length - 1]).toBe(350);
    });

    it('should maintain semantic grouping within categories', () => {
      const validationCodes = [
        'INVALID_PATH_FORMAT',
        'PATH_DEPTH_EXCEEDED',
        'INVALID_OBJECT_TYPE',
        'INVALID_SYMBOL_FORMAT',
        'MISSING_REQUIRED_PARAMETER',
        'INVALID_FIELD_MAPPING',
        'DANGEROUS_PROPERTY_ACCESS',
      ];

      const businessCodes = [
        'MARKET_STATUS_UNAVAILABLE',
        'DATA_CHANGE_NOT_DETECTED',
        'FIELD_MAPPING_FAILED',
        'SNAPSHOT_COMPARISON_FAILED',
        'PROVIDER_INTEGRATION_UNAVAILABLE',
      ];

      validationCodes.forEach(code => {
        expect(SHARED_ERROR_CODES[code]).toContain('_VALIDATION_');
      });

      businessCodes.forEach(code => {
        expect(SHARED_ERROR_CODES[code]).toContain('_BUSINESS_');
      });
    });
  });

  describe('Integration and Usage Patterns', () => {
    it('should support error mapping scenarios', () => {
      const createErrorMap = (codes: typeof SHARED_ERROR_CODES) => {
        return Object.entries(codes).reduce((map, [key, value]) => {
          map[value] = {
            name: key,
            category: value.split('_')[1],
            sequence: parseInt(value.split('_')[2]),
          };
          return map;
        }, {} as Record<string, any>);
      };

      const errorMap = createErrorMap(SHARED_ERROR_CODES);

      expect(errorMap['SHARED_VALIDATION_001']).toEqual({
        name: 'INVALID_PATH_FORMAT',
        category: 'VALIDATION',
        sequence: 1,
      });

      expect(errorMap['SHARED_BUSINESS_300']).toEqual({
        name: 'MARKET_STATUS_UNAVAILABLE',
        category: 'BUSINESS',
        sequence: 300,
      });
    });

    it('should support filtering by category', () => {
      const getErrorsByCategory = (category: string) => {
        return Object.entries(SHARED_ERROR_CODES)
          .filter(([_, value]) => value.includes(`_${category}_`))
          .map(([key, value]) => ({ key, value }));
      };

      const validationErrors = getErrorsByCategory('VALIDATION');
      const businessErrors = getErrorsByCategory('BUSINESS');
      const systemErrors = getErrorsByCategory('SYSTEM');
      const externalErrors = getErrorsByCategory('EXTERNAL');

      expect(validationErrors).toHaveLength(7);
      expect(businessErrors).toHaveLength(5);
      expect(systemErrors).toHaveLength(3);
      expect(externalErrors).toHaveLength(4);

      expect(validationErrors[0].value).toBe('SHARED_VALIDATION_001');
      expect(businessErrors[0].value).toBe('SHARED_BUSINESS_300');
      expect(systemErrors[0].value).toBe('SHARED_SYSTEM_600');
      expect(externalErrors[0].value).toBe('SHARED_EXTERNAL_900');
    });
  });
});

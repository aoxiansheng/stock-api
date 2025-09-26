import {
  SYMBOL_TRANSFORMER_ERROR_CODES,
  SymbolTransformerErrorCode,
} from '@core/02-processing/symbol-transformer/constants/symbol-transformer-error-codes.constants';

describe('SymbolTransformerErrorCodes', () => {
  describe('Error Code Structure', () => {
    it('should have all validation error codes', () => {
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_PROVIDER_FORMAT).toBe('SYMBOL_TRANSFORMER_VALIDATION_001');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.EMPTY_SYMBOLS_ARRAY).toBe('SYMBOL_TRANSFORMER_VALIDATION_002');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_DIRECTION_FORMAT).toBe('SYMBOL_TRANSFORMER_VALIDATION_003');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_LENGTH_EXCEEDED).toBe('SYMBOL_TRANSFORMER_VALIDATION_004');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.BATCH_SIZE_EXCEEDED).toBe('SYMBOL_TRANSFORMER_VALIDATION_005');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_SYMBOL_FORMAT).toBe('SYMBOL_TRANSFORMER_VALIDATION_006');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_PATTERN_MISMATCH).toBe('SYMBOL_TRANSFORMER_VALIDATION_007');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.MISSING_REQUIRED_PARAMETERS).toBe('SYMBOL_TRANSFORMER_VALIDATION_008');
    });

    it('should have all business logic error codes', () => {
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_TRANSFORMATION_FAILED).toBe('SYMBOL_TRANSFORMER_BUSINESS_300');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.MAPPING_RULE_NOT_FOUND).toBe('SYMBOL_TRANSFORMER_BUSINESS_301');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.UNSUPPORTED_MARKET_TYPE).toBe('SYMBOL_TRANSFORMER_BUSINESS_302');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.TRANSFORMATION_PARTIALLY_FAILED).toBe('SYMBOL_TRANSFORMER_BUSINESS_303');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_FORMAT_INCOMPATIBLE).toBe('SYMBOL_TRANSFORMER_BUSINESS_304');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.PROVIDER_NOT_SUPPORTED).toBe('SYMBOL_TRANSFORMER_BUSINESS_305');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.DUPLICATE_SYMBOL_REQUEST).toBe('SYMBOL_TRANSFORMER_BUSINESS_306');
    });

    it('should have all system resource error codes', () => {
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.CIRCUIT_BREAKER_OPEN).toBe('SYMBOL_TRANSFORMER_SYSTEM_600');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.OPERATION_TIMEOUT).toBe('SYMBOL_TRANSFORMER_SYSTEM_601');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.CACHE_SERVICE_UNAVAILABLE).toBe('SYMBOL_TRANSFORMER_SYSTEM_602');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.RETRY_ATTEMPTS_EXHAUSTED).toBe('SYMBOL_TRANSFORMER_SYSTEM_603');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.MEMORY_LIMIT_EXCEEDED).toBe('SYMBOL_TRANSFORMER_SYSTEM_604');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.PROCESSING_QUEUE_FULL).toBe('SYMBOL_TRANSFORMER_SYSTEM_605');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.PERFORMANCE_DEGRADATION).toBe('SYMBOL_TRANSFORMER_SYSTEM_700');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.RATE_LIMIT_EXCEEDED).toBe('SYMBOL_TRANSFORMER_SYSTEM_701');
    });

    it('should have all external dependency error codes', () => {
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_MAPPER_CACHE_ERROR).toBe('SYMBOL_TRANSFORMER_EXTERNAL_900');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.EVENT_BUS_ERROR).toBe('SYMBOL_TRANSFORMER_EXTERNAL_901');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.MONITORING_SERVICE_ERROR).toBe('SYMBOL_TRANSFORMER_EXTERNAL_902');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.DATABASE_CONNECTION_ERROR).toBe('SYMBOL_TRANSFORMER_EXTERNAL_903');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.NETWORK_CONNECTIVITY_ERROR).toBe('SYMBOL_TRANSFORMER_EXTERNAL_950');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.EXTERNAL_SERVICE_TIMEOUT).toBe('SYMBOL_TRANSFORMER_EXTERNAL_951');
    });
  });

  describe('Error Code Naming Convention', () => {
    it('should follow the standard naming convention', () => {
      Object.values(SYMBOL_TRANSFORMER_ERROR_CODES).forEach(code => {
        expect(code).toMatch(/^SYMBOL_TRANSFORMER_[A-Z_]+_\d{3}$/);
      });
    });

    it('should have validation errors in 001-299 range', () => {
      const validationCodes = [
        SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_PROVIDER_FORMAT,
        SYMBOL_TRANSFORMER_ERROR_CODES.EMPTY_SYMBOLS_ARRAY,
        SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_DIRECTION_FORMAT,
        SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_LENGTH_EXCEEDED,
        SYMBOL_TRANSFORMER_ERROR_CODES.BATCH_SIZE_EXCEEDED,
        SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_SYMBOL_FORMAT,
        SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_PATTERN_MISMATCH,
        SYMBOL_TRANSFORMER_ERROR_CODES.MISSING_REQUIRED_PARAMETERS,
      ];

      validationCodes.forEach(code => {
        const numericPart = parseInt(code.split('_').pop()!);
        expect(numericPart).toBeGreaterThanOrEqual(1);
        expect(numericPart).toBeLessThanOrEqual(299);
      });
    });

    it('should have business errors in 300-599 range', () => {
      const businessCodes = [
        SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_TRANSFORMATION_FAILED,
        SYMBOL_TRANSFORMER_ERROR_CODES.MAPPING_RULE_NOT_FOUND,
        SYMBOL_TRANSFORMER_ERROR_CODES.UNSUPPORTED_MARKET_TYPE,
        SYMBOL_TRANSFORMER_ERROR_CODES.TRANSFORMATION_PARTIALLY_FAILED,
        SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_FORMAT_INCOMPATIBLE,
        SYMBOL_TRANSFORMER_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
        SYMBOL_TRANSFORMER_ERROR_CODES.DUPLICATE_SYMBOL_REQUEST,
      ];

      businessCodes.forEach(code => {
        const numericPart = parseInt(code.split('_').pop()!);
        expect(numericPart).toBeGreaterThanOrEqual(300);
        expect(numericPart).toBeLessThanOrEqual(599);
      });
    });

    it('should have system errors in 600-899 range', () => {
      const systemCodes = [
        SYMBOL_TRANSFORMER_ERROR_CODES.CIRCUIT_BREAKER_OPEN,
        SYMBOL_TRANSFORMER_ERROR_CODES.OPERATION_TIMEOUT,
        SYMBOL_TRANSFORMER_ERROR_CODES.CACHE_SERVICE_UNAVAILABLE,
        SYMBOL_TRANSFORMER_ERROR_CODES.RETRY_ATTEMPTS_EXHAUSTED,
        SYMBOL_TRANSFORMER_ERROR_CODES.MEMORY_LIMIT_EXCEEDED,
        SYMBOL_TRANSFORMER_ERROR_CODES.PROCESSING_QUEUE_FULL,
        SYMBOL_TRANSFORMER_ERROR_CODES.PERFORMANCE_DEGRADATION,
        SYMBOL_TRANSFORMER_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      ];

      systemCodes.forEach(code => {
        const numericPart = parseInt(code.split('_').pop()!);
        expect(numericPart).toBeGreaterThanOrEqual(600);
        expect(numericPart).toBeLessThanOrEqual(899);
      });
    });

    it('should have external dependency errors in 900-999 range', () => {
      const externalCodes = [
        SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_MAPPER_CACHE_ERROR,
        SYMBOL_TRANSFORMER_ERROR_CODES.EVENT_BUS_ERROR,
        SYMBOL_TRANSFORMER_ERROR_CODES.MONITORING_SERVICE_ERROR,
        SYMBOL_TRANSFORMER_ERROR_CODES.DATABASE_CONNECTION_ERROR,
        SYMBOL_TRANSFORMER_ERROR_CODES.NETWORK_CONNECTIVITY_ERROR,
        SYMBOL_TRANSFORMER_ERROR_CODES.EXTERNAL_SERVICE_TIMEOUT,
      ];

      externalCodes.forEach(code => {
        const numericPart = parseInt(code.split('_').pop()!);
        expect(numericPart).toBeGreaterThanOrEqual(900);
        expect(numericPart).toBeLessThanOrEqual(999);
      });
    });
  });

  describe('Error Code Categories', () => {
    it('should have proper prefixes for each category', () => {
      // Validation errors
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_PROVIDER_FORMAT).toContain('VALIDATION');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.EMPTY_SYMBOLS_ARRAY).toContain('VALIDATION');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_DIRECTION_FORMAT).toContain('VALIDATION');

      // Business errors
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_TRANSFORMATION_FAILED).toContain('BUSINESS');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.MAPPING_RULE_NOT_FOUND).toContain('BUSINESS');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.UNSUPPORTED_MARKET_TYPE).toContain('BUSINESS');

      // System errors
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.CIRCUIT_BREAKER_OPEN).toContain('SYSTEM');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.OPERATION_TIMEOUT).toContain('SYSTEM');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.CACHE_SERVICE_UNAVAILABLE).toContain('SYSTEM');

      // External errors
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_MAPPER_CACHE_ERROR).toContain('EXTERNAL');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.EVENT_BUS_ERROR).toContain('EXTERNAL');
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.NETWORK_CONNECTIVITY_ERROR).toContain('EXTERNAL');
    });

    it('should have unique error codes', () => {
      const allCodes = Object.values(SYMBOL_TRANSFORMER_ERROR_CODES);
      const uniqueCodes = new Set(allCodes);

      expect(uniqueCodes.size).toBe(allCodes.length);
    });

    it('should have meaningful error code names', () => {
      const errorNames = Object.keys(SYMBOL_TRANSFORMER_ERROR_CODES);

      // Check for descriptive naming
      expect(errorNames).toContain('INVALID_PROVIDER_FORMAT');
      expect(errorNames).toContain('EMPTY_SYMBOLS_ARRAY');
      expect(errorNames).toContain('SYMBOL_TRANSFORMATION_FAILED');
      expect(errorNames).toContain('CACHE_SERVICE_UNAVAILABLE');
      expect(errorNames).toContain('NETWORK_CONNECTIVITY_ERROR');

      // All names should be in uppercase
      errorNames.forEach(name => {
        expect(name).toBe(name.toUpperCase());
      });

      // All names should use underscores for separation
      errorNames.forEach(name => {
        expect(name.includes('_')).toBe(true);
      });
    });
  });

  describe('SymbolTransformerErrorCode Type', () => {
    it('should correctly type error codes', () => {
      const validErrorCode: SymbolTransformerErrorCode = SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_PROVIDER_FORMAT;
      expect(typeof validErrorCode).toBe('string');
    });

    it('should include all error codes in type', () => {
      // Test that the type accepts all defined error codes
      const allCodes = Object.values(SYMBOL_TRANSFORMER_ERROR_CODES);
      allCodes.forEach(code => {
        const typedCode: SymbolTransformerErrorCode = code as SymbolTransformerErrorCode;
        expect(typeof typedCode).toBe('string');
      });
    });
  });

  describe('Error Code Immutability', () => {
    it('should be immutable', () => {
      expect(() => {
        (SYMBOL_TRANSFORMER_ERROR_CODES as any).NEW_ERROR = 'SYMBOL_TRANSFORMER_VALIDATION_999';
      }).toThrow();

      expect(() => {
        (SYMBOL_TRANSFORMER_ERROR_CODES as any).INVALID_PROVIDER_FORMAT = 'MODIFIED_CODE';
      }).toThrow();
    });

    it('should prevent deletion of existing codes', () => {
      expect(() => {
        delete (SYMBOL_TRANSFORMER_ERROR_CODES as any).INVALID_PROVIDER_FORMAT;
      }).toThrow();
    });
  });

  describe('Error Code Coverage', () => {
    it('should cover all major error scenarios', () => {
      // Input validation coverage
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_PROVIDER_FORMAT).toBeDefined();
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.EMPTY_SYMBOLS_ARRAY).toBeDefined();
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_DIRECTION_FORMAT).toBeDefined();
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_LENGTH_EXCEEDED).toBeDefined();
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.BATCH_SIZE_EXCEEDED).toBeDefined();
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.INVALID_SYMBOL_FORMAT).toBeDefined();

      // Business logic coverage
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_TRANSFORMATION_FAILED).toBeDefined();
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.MAPPING_RULE_NOT_FOUND).toBeDefined();
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.UNSUPPORTED_MARKET_TYPE).toBeDefined();

      // System resource coverage
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.OPERATION_TIMEOUT).toBeDefined();
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.MEMORY_LIMIT_EXCEEDED).toBeDefined();
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.RATE_LIMIT_EXCEEDED).toBeDefined();

      // External dependency coverage
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.SYMBOL_MAPPER_CACHE_ERROR).toBeDefined();
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.DATABASE_CONNECTION_ERROR).toBeDefined();
      expect(SYMBOL_TRANSFORMER_ERROR_CODES.NETWORK_CONNECTIVITY_ERROR).toBeDefined();
    });

    it('should have comprehensive error code count', () => {
      const totalCodes = Object.keys(SYMBOL_TRANSFORMER_ERROR_CODES).length;

      // Verify we have a reasonable number of error codes (not too few, not excessive)
      expect(totalCodes).toBeGreaterThanOrEqual(20);
      expect(totalCodes).toBeLessThanOrEqual(50);
    });
  });

  describe('Error Code Documentation Alignment', () => {
    it('should match the documented categories and ranges', () => {
      const codes = SYMBOL_TRANSFORMER_ERROR_CODES;

      // Validation errors (001-299)
      const validationCodes = Object.values(codes).filter(code =>
        code.includes('VALIDATION')
      );

      validationCodes.forEach(code => {
        const num = parseInt(code.substring(code.lastIndexOf('_') + 1));
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(299);
      });

      // Business errors (300-599)
      const businessCodes = Object.values(codes).filter(code =>
        code.includes('BUSINESS')
      );

      businessCodes.forEach(code => {
        const num = parseInt(code.substring(code.lastIndexOf('_') + 1));
        expect(num).toBeGreaterThanOrEqual(300);
        expect(num).toBeLessThanOrEqual(599);
      });

      // System errors (600-899)
      const systemCodes = Object.values(codes).filter(code =>
        code.includes('SYSTEM')
      );

      systemCodes.forEach(code => {
        const num = parseInt(code.substring(code.lastIndexOf('_') + 1));
        expect(num).toBeGreaterThanOrEqual(600);
        expect(num).toBeLessThanOrEqual(899);
      });

      // External errors (900-999)
      const externalCodes = Object.values(codes).filter(code =>
        code.includes('EXTERNAL')
      );

      externalCodes.forEach(code => {
        const num = parseInt(code.substring(code.lastIndexOf('_') + 1));
        expect(num).toBeGreaterThanOrEqual(900);
        expect(num).toBeLessThanOrEqual(999);
      });
    });
  });
});
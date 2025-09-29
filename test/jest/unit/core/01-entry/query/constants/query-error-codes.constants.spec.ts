import {
  QUERY_ERROR_CODES,
  QueryErrorCategories,
  QUERY_ERROR_DESCRIPTIONS
} from '@core/01-entry/query/constants/query-error-codes.constants';

describe('Query Error Codes Constants', () => {
  describe('QUERY_ERROR_CODES', () => {
    it('should be a frozen object', () => {
      expect(Object.isFrozen(QUERY_ERROR_CODES)).toBe(true);
    });

    it('should have validation error codes (001-299)', () => {
      expect(QUERY_ERROR_CODES.MISSING_REQUIRED_PARAMS).toBe('QUERY_VALIDATION_001');
      expect(QUERY_ERROR_CODES.MISSING_SYMBOLS_PARAM).toBe('QUERY_VALIDATION_002');
      expect(QUERY_ERROR_CODES.INVALID_DATE_RANGE).toBe('QUERY_VALIDATION_100');
      expect(QUERY_ERROR_CODES.QUERY_TOO_COMPLEX).toBe('QUERY_VALIDATION_200');
    });

    it('should have business error codes (300-599)', () => {
      expect(QUERY_ERROR_CODES.UNSUPPORTED_QUERY_TYPE).toBe('QUERY_BUSINESS_300');
      expect(QUERY_ERROR_CODES.QUERY_ALREADY_EXECUTING).toBe('QUERY_BUSINESS_400');
      expect(QUERY_ERROR_CODES.QUERY_RESULT_EMPTY).toBe('QUERY_BUSINESS_500');
    });

    it('should have system error codes (600-899)', () => {
      expect(QUERY_ERROR_CODES.MEMORY_PRESSURE).toBe('QUERY_SYSTEM_600');
      expect(QUERY_ERROR_CODES.QUERY_TIMEOUT).toBe('QUERY_SYSTEM_700');
      expect(QUERY_ERROR_CODES.CONFIG_VALIDATION_FAILED).toBe('QUERY_SYSTEM_800');
    });

    it('should have external dependency error codes (900-999)', () => {
      expect(QUERY_ERROR_CODES.DATABASE_CONNECTION_FAILED).toBe('QUERY_EXTERNAL_900');
      expect(QUERY_ERROR_CODES.PROVIDER_UNAVAILABLE).toBe('QUERY_EXTERNAL_950');
      expect(QUERY_ERROR_CODES.NETWORK_ERROR).toBe('QUERY_EXTERNAL_980');
    });

    it('should not allow modification of error codes', () => {
      expect(() => {
        (QUERY_ERROR_CODES as any).NEW_ERROR = 'NEW_CODE';
      }).toThrow();
    });

    it('should have unique error codes', () => {
      const errorCodes = Object.values(QUERY_ERROR_CODES);
      const uniqueErrorCodes = new Set(errorCodes);
      expect(errorCodes.length).toBe(uniqueErrorCodes.size);
    });

    it('should follow naming convention for error codes', () => {
      Object.values(QUERY_ERROR_CODES).forEach(errorCode => {
        expect(errorCode).toMatch(/^QUERY_(VALIDATION|BUSINESS|SYSTEM|EXTERNAL)_\d{3}$/);
      });
    });
  });

  describe('QueryErrorCategories', () => {
    describe('isValidationError', () => {
      it('should return true for validation error codes', () => {
        expect(QueryErrorCategories.isValidationError('QUERY_VALIDATION_001')).toBe(true);
        expect(QueryErrorCategories.isValidationError('QUERY_VALIDATION_100')).toBe(true);
        expect(QueryErrorCategories.isValidationError('QUERY_VALIDATION_200')).toBe(true);
      });

      it('should return false for non-validation error codes', () => {
        expect(QueryErrorCategories.isValidationError('QUERY_BUSINESS_300')).toBe(false);
        expect(QueryErrorCategories.isValidationError('QUERY_SYSTEM_600')).toBe(false);
        expect(QueryErrorCategories.isValidationError('QUERY_EXTERNAL_900')).toBe(false);
      });

      it('should handle empty or invalid input', () => {
        expect(QueryErrorCategories.isValidationError('')).toBe(false);
        expect(QueryErrorCategories.isValidationError('INVALID_CODE')).toBe(false);
      });
    });

    describe('isBusinessError', () => {
      it('should return true for business error codes', () => {
        expect(QueryErrorCategories.isBusinessError('QUERY_BUSINESS_300')).toBe(true);
        expect(QueryErrorCategories.isBusinessError('QUERY_BUSINESS_400')).toBe(true);
        expect(QueryErrorCategories.isBusinessError('QUERY_BUSINESS_500')).toBe(true);
      });

      it('should return false for non-business error codes', () => {
        expect(QueryErrorCategories.isBusinessError('QUERY_VALIDATION_001')).toBe(false);
        expect(QueryErrorCategories.isBusinessError('QUERY_SYSTEM_600')).toBe(false);
        expect(QueryErrorCategories.isBusinessError('QUERY_EXTERNAL_900')).toBe(false);
      });
    });

    describe('isSystemError', () => {
      it('should return true for system error codes', () => {
        expect(QueryErrorCategories.isSystemError('QUERY_SYSTEM_600')).toBe(true);
        expect(QueryErrorCategories.isSystemError('QUERY_SYSTEM_700')).toBe(true);
        expect(QueryErrorCategories.isSystemError('QUERY_SYSTEM_800')).toBe(true);
      });

      it('should return false for non-system error codes', () => {
        expect(QueryErrorCategories.isSystemError('QUERY_VALIDATION_001')).toBe(false);
        expect(QueryErrorCategories.isSystemError('QUERY_BUSINESS_300')).toBe(false);
        expect(QueryErrorCategories.isSystemError('QUERY_EXTERNAL_900')).toBe(false);
      });
    });

    describe('isExternalError', () => {
      it('should return true for external error codes', () => {
        expect(QueryErrorCategories.isExternalError('QUERY_EXTERNAL_900')).toBe(true);
        expect(QueryErrorCategories.isExternalError('QUERY_EXTERNAL_950')).toBe(true);
        expect(QueryErrorCategories.isExternalError('QUERY_EXTERNAL_980')).toBe(true);
      });

      it('should return false for non-external error codes', () => {
        expect(QueryErrorCategories.isExternalError('QUERY_VALIDATION_001')).toBe(false);
        expect(QueryErrorCategories.isExternalError('QUERY_BUSINESS_300')).toBe(false);
        expect(QueryErrorCategories.isExternalError('QUERY_SYSTEM_600')).toBe(false);
      });
    });

    describe('isRetryable', () => {
      it('should return true for timeout errors', () => {
        expect(QueryErrorCategories.isRetryable('QUERY_SYSTEM_700')).toBe(true); // QUERY_TIMEOUT
        expect(QueryErrorCategories.isRetryable('QUERY_SYSTEM_701')).toBe(true); // EXECUTION_TIMEOUT
        expect(QueryErrorCategories.isRetryable('QUERY_EXTERNAL_902')).toBe(true); // DATABASE_TIMEOUT
        expect(QueryErrorCategories.isRetryable('QUERY_EXTERNAL_981')).toBe(true); // CONNECTION_TIMEOUT
      });

      it('should return true for resource exhaustion errors', () => {
        expect(QueryErrorCategories.isRetryable('QUERY_SYSTEM_602')).toBe(true); // RESOURCE_EXHAUSTED
        expect(QueryErrorCategories.isRetryable('QUERY_SYSTEM_601')).toBe(true); // CPU_OVERLOAD
        expect(QueryErrorCategories.isRetryable('QUERY_SYSTEM_600')).toBe(true); // MEMORY_PRESSURE
      });

      it('should return true for most external errors except authentication', () => {
        expect(QueryErrorCategories.isRetryable('QUERY_EXTERNAL_900')).toBe(true); // DATABASE_CONNECTION_FAILED
        expect(QueryErrorCategories.isRetryable('QUERY_EXTERNAL_950')).toBe(true); // PROVIDER_UNAVAILABLE
        expect(QueryErrorCategories.isRetryable('QUERY_EXTERNAL_980')).toBe(true); // NETWORK_ERROR
      });

      it('should return false for authentication failures', () => {
        expect(QueryErrorCategories.isRetryable('QUERY_EXTERNAL_953')).toBe(false); // PROVIDER_AUTHENTICATION_FAILED
      });

      it('should return false for validation errors', () => {
        expect(QueryErrorCategories.isRetryable('QUERY_VALIDATION_001')).toBe(false);
        expect(QueryErrorCategories.isRetryable('QUERY_VALIDATION_100')).toBe(false);
      });

      it('should return false for business logic errors', () => {
        expect(QueryErrorCategories.isRetryable('QUERY_BUSINESS_300')).toBe(false);
        expect(QueryErrorCategories.isRetryable('QUERY_BUSINESS_400')).toBe(false);
      });

      it('should handle custom error codes with timeout patterns', () => {
        expect(QueryErrorCategories.isRetryable('CUSTOM_TIMEOUT_ERROR')).toBe(true);
        expect(QueryErrorCategories.isRetryable('SOME_RESOURCE_EXHAUSTED_ERROR')).toBe(true);
        expect(QueryErrorCategories.isRetryable('MEMORY_PRESSURE_ISSUE')).toBe(true);
        expect(QueryErrorCategories.isRetryable('CPU_OVERLOAD_DETECTED')).toBe(true);
      });
    });

    describe('getRecoveryAction', () => {
      it('should return "retry" for retryable errors', () => {
        expect(QueryErrorCategories.getRecoveryAction('QUERY_SYSTEM_700')).toBe('retry'); // TIMEOUT
        expect(QueryErrorCategories.getRecoveryAction('QUERY_SYSTEM_600')).toBe('retry'); // MEMORY_PRESSURE
        expect(QueryErrorCategories.getRecoveryAction('QUERY_EXTERNAL_900')).toBe('retry'); // DATABASE_CONNECTION_FAILED
      });

      it('should return "fallback" for non-retryable external errors', () => {
        expect(QueryErrorCategories.getRecoveryAction('QUERY_EXTERNAL_953')).toBe('fallback'); // PROVIDER_AUTHENTICATION_FAILED
      });

      it('should return "abort" for validation and business errors', () => {
        expect(QueryErrorCategories.getRecoveryAction('QUERY_VALIDATION_001')).toBe('abort');
        expect(QueryErrorCategories.getRecoveryAction('QUERY_BUSINESS_300')).toBe('abort');
        expect(QueryErrorCategories.getRecoveryAction('QUERY_SYSTEM_800')).toBe('abort'); // CONFIG_VALIDATION_FAILED
      });

      it('should handle edge cases', () => {
        expect(QueryErrorCategories.getRecoveryAction('')).toBe('abort');
        expect(QueryErrorCategories.getRecoveryAction('UNKNOWN_ERROR')).toBe('abort');
      });
    });
  });

  describe('QUERY_ERROR_DESCRIPTIONS', () => {
    it('should be a frozen object', () => {
      expect(Object.isFrozen(QUERY_ERROR_DESCRIPTIONS)).toBe(true);
    });

    it('should have descriptions for documented error codes', () => {
      expect(QUERY_ERROR_DESCRIPTIONS[QUERY_ERROR_CODES.MISSING_SYMBOLS_PARAM]).toBeDefined();
      expect(QUERY_ERROR_DESCRIPTIONS[QUERY_ERROR_CODES.MISSING_MARKET_PARAM]).toBeDefined();
      expect(QUERY_ERROR_DESCRIPTIONS[QUERY_ERROR_CODES.UNSUPPORTED_QUERY_TYPE]).toBeDefined();
      expect(QUERY_ERROR_DESCRIPTIONS[QUERY_ERROR_CODES.PROVIDER_UNAVAILABLE]).toBeDefined();
    });

    it('should have meaningful description text', () => {
      const description = QUERY_ERROR_DESCRIPTIONS[QUERY_ERROR_CODES.MISSING_SYMBOLS_PARAM];
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
      expect(description).toContain('symbols');
    });

    it('should not allow modification of descriptions', () => {
      expect(() => {
        (QUERY_ERROR_DESCRIPTIONS as any)[QUERY_ERROR_CODES.MISSING_SYMBOLS_PARAM] = 'Modified description';
      }).toThrow();
    });
  });

  describe('Error Code Integration', () => {
    it('should have consistent error code references between constants and descriptions', () => {
      Object.keys(QUERY_ERROR_DESCRIPTIONS).forEach(errorCode => {
        expect(Object.values(QUERY_ERROR_CODES)).toContain(errorCode);
      });
    });

    it('should maintain error code format consistency', () => {
      Object.values(QUERY_ERROR_CODES).forEach(errorCode => {
        // Check that error code follows the expected pattern
        expect(errorCode).toMatch(/^QUERY_[A-Z]+_\d{3}$/);
      });
    });

    it('should categorize all error codes correctly', () => {
      Object.values(QUERY_ERROR_CODES).forEach(errorCode => {
        const isValidation = QueryErrorCategories.isValidationError(errorCode);
        const isBusiness = QueryErrorCategories.isBusinessError(errorCode);
        const isSystem = QueryErrorCategories.isSystemError(errorCode);
        const isExternal = QueryErrorCategories.isExternalError(errorCode);

        // Each error code should belong to exactly one category
        const categoryCount = [isValidation, isBusiness, isSystem, isExternal].filter(Boolean).length;
        expect(categoryCount).toBe(1);
      });
    });

    it('should provide valid recovery actions for all error codes', () => {
      Object.values(QUERY_ERROR_CODES).forEach(errorCode => {
        const recoveryAction = QueryErrorCategories.getRecoveryAction(errorCode);
        expect(['retry', 'fallback', 'abort']).toContain(recoveryAction);
      });
    });
  });

  describe('Performance Considerations', () => {
    it('should perform error categorization quickly', () => {
      const start = Date.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        QueryErrorCategories.isValidationError('QUERY_VALIDATION_001');
        QueryErrorCategories.isBusinessError('QUERY_BUSINESS_300');
        QueryErrorCategories.isSystemError('QUERY_SYSTEM_600');
        QueryErrorCategories.isExternalError('QUERY_EXTERNAL_900');
      }

      const end = Date.now();
      const elapsed = end - start;

      // Should complete 1000 iterations in less than 100ms
      expect(elapsed).toBeLessThan(100);
    });

    it('should handle retryability checks efficiently', () => {
      const start = Date.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        QueryErrorCategories.isRetryable('QUERY_SYSTEM_700');
        QueryErrorCategories.isRetryable('QUERY_VALIDATION_001');
        QueryErrorCategories.isRetryable('QUERY_EXTERNAL_953');
      }

      const end = Date.now();
      const elapsed = end - start;

      // Should complete 1000 iterations in less than 100ms
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Boundary Value Testing', () => {
    it('should handle boundary values for validation codes (001-299)', () => {
      expect(QueryErrorCategories.isValidationError('QUERY_VALIDATION_001')).toBe(true);
      expect(QueryErrorCategories.isValidationError('QUERY_VALIDATION_299')).toBe(true);
    });

    it('should handle boundary values for business codes (300-599)', () => {
      expect(QueryErrorCategories.isBusinessError('QUERY_BUSINESS_300')).toBe(true);
      expect(QueryErrorCategories.isBusinessError('QUERY_BUSINESS_599')).toBe(true);
    });

    it('should handle boundary values for system codes (600-899)', () => {
      expect(QueryErrorCategories.isSystemError('QUERY_SYSTEM_600')).toBe(true);
      expect(QueryErrorCategories.isSystemError('QUERY_SYSTEM_899')).toBe(true);
    });

    it('should handle boundary values for external codes (900-999)', () => {
      expect(QueryErrorCategories.isExternalError('QUERY_EXTERNAL_900')).toBe(true);
      expect(QueryErrorCategories.isExternalError('QUERY_EXTERNAL_999')).toBe(true);
    });
  });
});
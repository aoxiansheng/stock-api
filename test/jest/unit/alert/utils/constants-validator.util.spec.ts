import { AlertConstantsValidator, ValidationResult } from '@alert/utils/constants-validator.util';

// Mock the logging module
jest.mock('@common/logging/index', () => ({
  createLogger: jest.fn(() => ({
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }))
}));

// Mock business exception factory
jest.mock('@common/core/exceptions', () => ({
  UniversalExceptionFactory: {
    createBusinessException: jest.fn(() => new Error('Mock exception'))
  },
  BusinessErrorCode: {
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR'
  },
  ComponentIdentifier: {
    ALERT: 'ALERT'
  }
}));

describe('AlertConstantsValidator', () => {
  let originalNodeEnv: string | undefined;
  let mockLogger: any;

  beforeEach(() => {
    jest.clearAllMocks();
    originalNodeEnv = process.env.NODE_ENV;

    // Get the mocked logger
    const { createLogger } = require('@common/logging/index');
    mockLogger = createLogger();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('validateAll', () => {
    it('should return ValidationResult with correct structure', () => {
      const result = AlertConstantsValidator.validateAll();

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should log validation start message', () => {
      AlertConstantsValidator.validateAll();

      expect(mockLogger.log).toHaveBeenCalledWith('Alert模块常量验证...');
    });

    it('should handle validation process without throwing', () => {
      expect(() => {
        AlertConstantsValidator.validateAll();
      }).not.toThrow();
    });

    it('should complete validation in development environment', () => {
      process.env.NODE_ENV = 'development';

      const result = AlertConstantsValidator.validateAll();

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
    });

    it('should complete validation in test environment', () => {
      process.env.NODE_ENV = 'test';

      const result = AlertConstantsValidator.validateAll();

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
    });

    it('should have consistent ValidationResult interface across calls', () => {
      const result1 = AlertConstantsValidator.validateAll();
      const result2 = AlertConstantsValidator.validateAll();

      // Both results should have the same structure
      expect(Object.keys(result1).sort()).toEqual(Object.keys(result2).sort());
      expect(typeof result1.isValid).toBe(typeof result2.isValid);
      expect(Array.isArray(result1.errors)).toBe(Array.isArray(result2.errors));
      expect(Array.isArray(result1.warnings)).toBe(Array.isArray(result2.warnings));
    });

    it('should call logger methods during validation', () => {
      AlertConstantsValidator.validateAll();

      // Should at least call log for starting validation
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('should handle different NODE_ENV values', () => {
      const environments = ['development', 'production', 'test', undefined];

      environments.forEach(env => {
        process.env.NODE_ENV = env;

        expect(() => {
          const result = AlertConstantsValidator.validateAll();
          expect(result).toHaveProperty('isValid');
        }).not.toThrow();
      });
    });

    it('should maintain result consistency', () => {
      // Run validation multiple times
      const results = Array.from({ length: 5 }, () => AlertConstantsValidator.validateAll());

      // All results should have the same basic structure
      results.forEach(result => {
        expect(result).toHaveProperty('isValid');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('warnings');
      });

      // The validation logic should be deterministic
      const firstResult = results[0];
      results.slice(1).forEach(result => {
        expect(result.isValid).toBe(firstResult.isValid);
        expect(result.errors.length).toBe(firstResult.errors.length);
        expect(result.warnings.length).toBe(firstResult.warnings.length);
      });
    });

    it('should validate with reasonable performance', () => {
      const start = Date.now();
      AlertConstantsValidator.validateAll();
      const duration = Date.now() - start;

      // Validation should complete quickly (under 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  describe('ValidationResult interface', () => {
    it('should provide valid ValidationResult type', () => {
      const result: ValidationResult = AlertConstantsValidator.validateAll();

      // Type checking - these should compile without errors
      const isValid: boolean = result.isValid;
      const errors: string[] = result.errors;
      const warnings: string[] = result.warnings;

      expect(typeof isValid).toBe('boolean');
      expect(Array.isArray(errors)).toBe(true);
      expect(Array.isArray(warnings)).toBe(true);
    });

    it('should return arrays even when empty', () => {
      const result = AlertConstantsValidator.validateAll();

      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should ensure errors are strings when present', () => {
      const result = AlertConstantsValidator.validateAll();

      result.errors.forEach(error => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
      });
    });

    it('should ensure warnings are strings when present', () => {
      const result = AlertConstantsValidator.validateAll();

      result.warnings.forEach(warning => {
        expect(typeof warning).toBe('string');
        expect(warning.length).toBeGreaterThan(0);
      });
    });
  });

  describe('logging behavior', () => {
    it('should log validation start', () => {
      mockLogger.log.mockClear();

      AlertConstantsValidator.validateAll();

      expect(mockLogger.log).toHaveBeenCalledWith('Alert模块常量验证...');
    });

    it('should use logger instance correctly', () => {
      const result = AlertConstantsValidator.validateAll();

      // Logger should be called at least once
      expect(mockLogger.log.mock.calls.length).toBeGreaterThanOrEqual(1);

      // If validation passes, should log success
      if (result.isValid) {
        expect(mockLogger.log).toHaveBeenCalledWith('常量验证通过 ✅');
      }

      // If validation fails, should log error
      if (!result.isValid) {
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('验证失败，发现')
        );
      }
    });

    it('should handle logger gracefully', () => {
      // Even if logger fails, validation should continue
      mockLogger.log.mockImplementation(() => {
        throw new Error('Logger error');
      });

      expect(() => {
        AlertConstantsValidator.validateAll();
      }).not.toThrow();
    });
  });

  describe('edge cases and robustness', () => {
    it('should handle process.env.NODE_ENV changes', () => {
      const originalEnv = process.env.NODE_ENV;

      try {
        process.env.NODE_ENV = 'production';
        const prodResult = AlertConstantsValidator.validateAll();

        process.env.NODE_ENV = 'development';
        const devResult = AlertConstantsValidator.validateAll();

        // Both should complete successfully
        expect(prodResult).toBeDefined();
        expect(devResult).toBeDefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should be stateless across multiple calls', () => {
      const result1 = AlertConstantsValidator.validateAll();
      const result2 = AlertConstantsValidator.validateAll();
      const result3 = AlertConstantsValidator.validateAll();

      // Multiple calls should return consistent results
      expect(result1.isValid).toBe(result2.isValid);
      expect(result2.isValid).toBe(result3.isValid);
    });

    it('should handle concurrent validation calls', async () => {
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(AlertConstantsValidator.validateAll())
      );

      const results = await Promise.all(promises);

      // All results should be consistent
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.isValid).toBe(firstResult.isValid);
        expect(result.errors.length).toBe(firstResult.errors.length);
      });
    });
  });
});
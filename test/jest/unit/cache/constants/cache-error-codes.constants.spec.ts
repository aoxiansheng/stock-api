/**
 * Cache Error Codes Constants 单元测试
 * 测试错误码常量的完整性和分类功能
 */

import {
  CACHE_ERROR_CODES,
  CacheErrorCode,
  CacheErrorCategories,
} from '@cache/constants/cache-error-codes.constants';

describe('CACHE_ERROR_CODES', () => {
  describe('error code structure validation', () => {
    it('should have consistent naming pattern for validation errors', () => {
      const validationErrors = [
        'INVALID_KEY_FORMAT',
        'INVALID_TTL_VALUE',
        'INVALID_BATCH_SIZE',
        'SERIALIZATION_FORMAT_ERROR',
        'BATCH_SIZE_EXCEEDED',
      ];

      validationErrors.forEach(errorKey => {
        expect(CACHE_ERROR_CODES[errorKey]).toBeDefined();
        expect(CACHE_ERROR_CODES[errorKey]).toMatch(/^CACHE_VALIDATION_\d{3}$/);
      });
    });

    it('should have consistent naming pattern for business errors', () => {
      const businessErrors = [
        'KEY_NOT_FOUND',
        'OPERATION_NOT_SUPPORTED',
        'LOCK_ACQUISITION_FAILED',
        'TRANSACTION_FAILED',
      ];

      businessErrors.forEach(errorKey => {
        expect(CACHE_ERROR_CODES[errorKey]).toBeDefined();
        expect(CACHE_ERROR_CODES[errorKey]).toMatch(/^CACHE_BUSINESS_\d{3}$/);
      });
    });

    it('should have consistent naming pattern for system errors', () => {
      const systemErrors = [
        'MEMORY_LIMIT_EXCEEDED',
        'OPERATION_TIMEOUT',
        'CONFIG_VALIDATION_FAILED',
      ];

      systemErrors.forEach(errorKey => {
        expect(CACHE_ERROR_CODES[errorKey]).toBeDefined();
        expect(CACHE_ERROR_CODES[errorKey]).toMatch(/^CACHE_SYSTEM_\d{3}$/);
      });
    });

    it('should have consistent naming pattern for external errors', () => {
      const externalErrors = [
        'REDIS_CONNECTION_FAILED',
        'CLUSTER_NODE_UNAVAILABLE',
        'NETWORK_ERROR',
      ];

      externalErrors.forEach(errorKey => {
        expect(CACHE_ERROR_CODES[errorKey]).toBeDefined();
        expect(CACHE_ERROR_CODES[errorKey]).toMatch(/^CACHE_EXTERNAL_\d{3}$/);
      });
    });
  });

  describe('error code categories', () => {
    it('should have validation errors in 001-299 range', () => {
      const validationErrorKeys = Object.keys(CACHE_ERROR_CODES).filter(key =>
        CACHE_ERROR_CODES[key].includes('VALIDATION')
      );

      validationErrorKeys.forEach(key => {
        const errorCode = CACHE_ERROR_CODES[key];
        const number = parseInt(errorCode.split('_')[2]);
        expect(number).toBeGreaterThanOrEqual(1);
        expect(number).toBeLessThanOrEqual(299);
      });
    });

    it('should have business errors in 300-599 range', () => {
      const businessErrorKeys = Object.keys(CACHE_ERROR_CODES).filter(key =>
        CACHE_ERROR_CODES[key].includes('BUSINESS')
      );

      businessErrorKeys.forEach(key => {
        const errorCode = CACHE_ERROR_CODES[key];
        const number = parseInt(errorCode.split('_')[2]);
        expect(number).toBeGreaterThanOrEqual(300);
        expect(number).toBeLessThanOrEqual(599);
      });
    });

    it('should have system errors in 600-899 range', () => {
      const systemErrorKeys = Object.keys(CACHE_ERROR_CODES).filter(key =>
        CACHE_ERROR_CODES[key].includes('SYSTEM')
      );

      systemErrorKeys.forEach(key => {
        const errorCode = CACHE_ERROR_CODES[key];
        const number = parseInt(errorCode.split('_')[2]);
        expect(number).toBeGreaterThanOrEqual(600);
        expect(number).toBeLessThanOrEqual(899);
      });
    });

    it('should have external errors in 900-999 range', () => {
      const externalErrorKeys = Object.keys(CACHE_ERROR_CODES).filter(key =>
        CACHE_ERROR_CODES[key].includes('EXTERNAL')
      );

      externalErrorKeys.forEach(key => {
        const errorCode = CACHE_ERROR_CODES[key];
        const number = parseInt(errorCode.split('_')[2]);
        expect(number).toBeGreaterThanOrEqual(900);
        expect(number).toBeLessThanOrEqual(999);
      });
    });
  });

  describe('error code uniqueness', () => {
    it('should not have duplicate error codes', () => {
      const errorCodes = Object.values(CACHE_ERROR_CODES);
      const uniqueErrorCodes = [...new Set(errorCodes)];

      expect(errorCodes.length).toBe(uniqueErrorCodes.length);
    });

    it('should not have duplicate error keys', () => {
      const errorKeys = Object.keys(CACHE_ERROR_CODES);
      const uniqueErrorKeys = [...new Set(errorKeys)];

      expect(errorKeys.length).toBe(uniqueErrorKeys.length);
    });
  });
});

describe('CacheErrorCategories', () => {
  describe('error type detection', () => {
    it('should correctly identify validation errors', () => {
      expect(CacheErrorCategories.isValidationError('CACHE_VALIDATION_001')).toBe(true);
      expect(CacheErrorCategories.isValidationError('CACHE_BUSINESS_300')).toBe(false);
      expect(CacheErrorCategories.isValidationError('CACHE_SYSTEM_700')).toBe(false);
      expect(CacheErrorCategories.isValidationError('CACHE_EXTERNAL_900')).toBe(false);
    });

    it('should correctly identify business errors', () => {
      expect(CacheErrorCategories.isBusinessError('CACHE_BUSINESS_300')).toBe(true);
      expect(CacheErrorCategories.isBusinessError('CACHE_VALIDATION_001')).toBe(false);
      expect(CacheErrorCategories.isBusinessError('CACHE_SYSTEM_700')).toBe(false);
      expect(CacheErrorCategories.isBusinessError('CACHE_EXTERNAL_900')).toBe(false);
    });

    it('should correctly identify system errors', () => {
      expect(CacheErrorCategories.isSystemError('CACHE_SYSTEM_700')).toBe(true);
      expect(CacheErrorCategories.isSystemError('CACHE_VALIDATION_001')).toBe(false);
      expect(CacheErrorCategories.isSystemError('CACHE_BUSINESS_300')).toBe(false);
      expect(CacheErrorCategories.isSystemError('CACHE_EXTERNAL_900')).toBe(false);
    });

    it('should correctly identify external errors', () => {
      expect(CacheErrorCategories.isExternalError('CACHE_EXTERNAL_900')).toBe(true);
      expect(CacheErrorCategories.isExternalError('CACHE_VALIDATION_001')).toBe(false);
      expect(CacheErrorCategories.isExternalError('CACHE_BUSINESS_300')).toBe(false);
      expect(CacheErrorCategories.isExternalError('CACHE_SYSTEM_700')).toBe(false);
    });
  });

  describe('retry logic', () => {
    it('should identify retryable timeout errors', () => {
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.OPERATION_TIMEOUT)).toBe(true);
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.CONNECTION_TIMEOUT)).toBe(true);
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.LOCK_TIMEOUT)).toBe(true);
    });

    it('should identify retryable resource errors', () => {
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.CONNECTION_POOL_EXHAUSTED)).toBe(true);
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.MEMORY_LIMIT_EXCEEDED)).toBe(true);
    });

    it('should identify retryable external errors', () => {
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED)).toBe(true);
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.NETWORK_ERROR)).toBe(true);
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.CLUSTER_NODE_UNAVAILABLE)).toBe(true);
    });

    it('should identify non-retryable authentication errors', () => {
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.REDIS_AUTHENTICATION_FAILED)).toBe(false);
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.REDIS_PERMISSION_DENIED)).toBe(false);
    });

    it('should identify retryable business errors', () => {
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.LOCK_ACQUISITION_FAILED)).toBe(true);
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.WATCH_KEY_MODIFIED)).toBe(true);
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.CONDITIONAL_OPERATION_FAILED)).toBe(true);
    });

    it('should identify non-retryable validation errors', () => {
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.INVALID_KEY_FORMAT)).toBe(false);
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.INVALID_TTL_VALUE)).toBe(false);
      expect(CacheErrorCategories.isRetryable(CACHE_ERROR_CODES.SERIALIZATION_FORMAT_ERROR)).toBe(false);
    });
  });

  describe('recovery action determination', () => {
    it('should suggest retry for retryable errors', () => {
      expect(CacheErrorCategories.getRecoveryAction(CACHE_ERROR_CODES.OPERATION_TIMEOUT)).toBe('retry');
      expect(CacheErrorCategories.getRecoveryAction(CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED)).toBe('retry');
      expect(CacheErrorCategories.getRecoveryAction(CACHE_ERROR_CODES.LOCK_ACQUISITION_FAILED)).toBe('retry');
    });

    it('should suggest fallback for non-retryable system/external errors', () => {
      expect(CacheErrorCategories.getRecoveryAction(CACHE_ERROR_CODES.CONFIG_VALIDATION_FAILED)).toBe('fallback');
      expect(CacheErrorCategories.getRecoveryAction(CACHE_ERROR_CODES.REDIS_AUTHENTICATION_FAILED)).toBe('fallback');
    });

    it('should suggest abort for validation errors', () => {
      expect(CacheErrorCategories.getRecoveryAction(CACHE_ERROR_CODES.INVALID_KEY_FORMAT)).toBe('abort');
      expect(CacheErrorCategories.getRecoveryAction(CACHE_ERROR_CODES.INVALID_TTL_VALUE)).toBe('abort');
      expect(CacheErrorCategories.getRecoveryAction(CACHE_ERROR_CODES.SERIALIZATION_FORMAT_ERROR)).toBe('abort');
    });

    it('should suggest retry for retryable external errors but fallback for authentication', () => {
      // Retryable external errors should suggest retry
      expect(CacheErrorCategories.getRecoveryAction(CACHE_ERROR_CODES.REDIS_SERVER_ERROR)).toBe('retry');
      expect(CacheErrorCategories.getRecoveryAction(CACHE_ERROR_CODES.NETWORK_ERROR)).toBe('retry');

      // Non-retryable external errors should suggest fallback
      expect(CacheErrorCategories.getRecoveryAction(CACHE_ERROR_CODES.REDIS_AUTHENTICATION_FAILED)).toBe('fallback');
      expect(CacheErrorCategories.getRecoveryAction(CACHE_ERROR_CODES.REDIS_PERMISSION_DENIED)).toBe('fallback');
    });
  });

  describe('severity level determination', () => {
    it('should assign low severity to validation errors', () => {
      expect(CacheErrorCategories.getSeverityLevel(CACHE_ERROR_CODES.INVALID_KEY_FORMAT)).toBe('low');
      expect(CacheErrorCategories.getSeverityLevel(CACHE_ERROR_CODES.INVALID_TTL_VALUE)).toBe('low');
    });

    it('should assign medium severity to basic business errors', () => {
      expect(CacheErrorCategories.getSeverityLevel(CACHE_ERROR_CODES.KEY_NOT_FOUND)).toBe('medium');
      expect(CacheErrorCategories.getSeverityLevel(CACHE_ERROR_CODES.OPERATION_NOT_SUPPORTED)).toBe('medium');
    });

    it('should assign high severity to lock and transaction errors', () => {
      // Based on actual implementation: business errors with LOCK_ or TRANSACTION_ get high severity
      expect(CacheErrorCategories.getSeverityLevel(CACHE_ERROR_CODES.LOCK_ACQUISITION_FAILED)).toBe('high');
      expect(CacheErrorCategories.getSeverityLevel(CACHE_ERROR_CODES.TRANSACTION_FAILED)).toBe('high');
      expect(CacheErrorCategories.getSeverityLevel(CACHE_ERROR_CODES.DEADLOCK_DETECTED)).toBe('medium'); // This is business error but not LOCK_ or TRANSACTION_
    });

    it('should assign critical severity to memory and config errors', () => {
      expect(CacheErrorCategories.getSeverityLevel(CACHE_ERROR_CODES.MEMORY_LIMIT_EXCEEDED)).toBe('critical');
      expect(CacheErrorCategories.getSeverityLevel(CACHE_ERROR_CODES.CONFIG_VALIDATION_FAILED)).toBe('critical');
    });

    it('should assign critical severity to Redis connection errors', () => {
      expect(CacheErrorCategories.getSeverityLevel(CACHE_ERROR_CODES.REDIS_CONNECTION_FAILED)).toBe('critical');
      expect(CacheErrorCategories.getSeverityLevel(CACHE_ERROR_CODES.MASTER_DOWN)).toBe('critical');
    });

    it('should assign high severity to other external errors', () => {
      expect(CacheErrorCategories.getSeverityLevel(CACHE_ERROR_CODES.NETWORK_ERROR)).toBe('high');
      expect(CacheErrorCategories.getSeverityLevel(CACHE_ERROR_CODES.CLUSTER_NODE_UNAVAILABLE)).toBe('high');
    });
  });
});

describe('CacheErrorCode type', () => {
  it('should properly type error codes', () => {
    const errorCode: CacheErrorCode = CACHE_ERROR_CODES.INVALID_KEY_FORMAT;
    expect(typeof errorCode).toBe('string');
    expect(errorCode).toBe('CACHE_VALIDATION_001');
  });

  it('should include all error codes in the type union', () => {
    // This test ensures that the type includes all possible error codes
    const allErrorCodes = Object.values(CACHE_ERROR_CODES);
    allErrorCodes.forEach((code: CacheErrorCode) => {
      expect(typeof code).toBe('string');
      expect(code).toMatch(/^CACHE_(VALIDATION|BUSINESS|SYSTEM|EXTERNAL)_\d{3}$/);
    });
  });
});

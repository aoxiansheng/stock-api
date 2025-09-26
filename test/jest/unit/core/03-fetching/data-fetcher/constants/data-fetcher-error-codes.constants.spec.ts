/**
 * DataFetcher 错误代码常量单元测试
 * 测试DataFetcher模块错误代码的定义和编码规范
 */

import { DATA_FETCHER_ERROR_CODES } from '@core/03-fetching/data-fetcher/constants/data-fetcher-error-codes.constants';

describe('DATA_FETCHER_ERROR_CODES', () => {
  describe('error code structure', () => {
    it('should contain all required error code categories', () => {
      // 验证错误 (001-299)
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('MISSING_REQUIRED_PARAMS');
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('INVALID_SYMBOLS');
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('SYMBOLS_LIMIT_EXCEEDED');
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('INVALID_PROVIDER');
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('INVALID_CAPABILITY');

      // 业务逻辑错误 (300-599)
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('CAPABILITY_NOT_SUPPORTED');
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('PROVIDER_NOT_FOUND');
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('CONTEXT_SERVICE_NOT_AVAILABLE');
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('DATA_FETCH_FAILED');
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('PARTIAL_FAILURE');

      // 系统错误 (600-899)
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('EXECUTION_TIMEOUT');
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('MEMORY_PRESSURE');
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('CPU_OVERLOAD');

      // 外部依赖错误 (900-999)
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('PROVIDER_UNAVAILABLE');
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('PROVIDER_RATE_LIMITED');
      expect(DATA_FETCHER_ERROR_CODES).toHaveProperty('NETWORK_ERROR');
    });

    it('should follow proper error code naming convention', () => {
      const errorCodeValues = Object.values(DATA_FETCHER_ERROR_CODES);

      errorCodeValues.forEach(errorCode => {
        // Should start with DATA_FETCHER_
        expect(errorCode).toMatch(/^DATA_FETCHER_/);

        // Should follow the pattern: DATA_FETCHER_{CATEGORY}_{NUMBER}
        expect(errorCode).toMatch(/^DATA_FETCHER_[A-Z_]+_\d{3}$/);
      });
    });
  });

  describe('validation error codes (001-299)', () => {
    it('should have correct validation error code format', () => {
      expect(DATA_FETCHER_ERROR_CODES.MISSING_REQUIRED_PARAMS).toBe('DATA_FETCHER_VALIDATION_001');
      expect(DATA_FETCHER_ERROR_CODES.INVALID_SYMBOLS).toBe('DATA_FETCHER_VALIDATION_002');
      expect(DATA_FETCHER_ERROR_CODES.SYMBOLS_LIMIT_EXCEEDED).toBe('DATA_FETCHER_VALIDATION_003');
      expect(DATA_FETCHER_ERROR_CODES.INVALID_PROVIDER).toBe('DATA_FETCHER_VALIDATION_004');
      expect(DATA_FETCHER_ERROR_CODES.INVALID_CAPABILITY).toBe('DATA_FETCHER_VALIDATION_005');
    });

    it('should have validation error codes in correct range', () => {
      const validationCodes = [
        DATA_FETCHER_ERROR_CODES.MISSING_REQUIRED_PARAMS,
        DATA_FETCHER_ERROR_CODES.INVALID_SYMBOLS,
        DATA_FETCHER_ERROR_CODES.SYMBOLS_LIMIT_EXCEEDED,
        DATA_FETCHER_ERROR_CODES.INVALID_PROVIDER,
        DATA_FETCHER_ERROR_CODES.INVALID_CAPABILITY
      ];

      validationCodes.forEach(code => {
        const number = parseInt(code.split('_').pop() as string);
        expect(number).toBeGreaterThanOrEqual(1);
        expect(number).toBeLessThanOrEqual(299);
      });
    });
  });

  describe('business logic error codes (300-599)', () => {
    it('should have correct business error code format', () => {
      expect(DATA_FETCHER_ERROR_CODES.CAPABILITY_NOT_SUPPORTED).toBe('DATA_FETCHER_BUSINESS_300');
      expect(DATA_FETCHER_ERROR_CODES.PROVIDER_NOT_FOUND).toBe('DATA_FETCHER_BUSINESS_301');
      expect(DATA_FETCHER_ERROR_CODES.CONTEXT_SERVICE_NOT_AVAILABLE).toBe('DATA_FETCHER_BUSINESS_302');
      expect(DATA_FETCHER_ERROR_CODES.DATA_FETCH_FAILED).toBe('DATA_FETCHER_BUSINESS_303');
      expect(DATA_FETCHER_ERROR_CODES.PARTIAL_FAILURE).toBe('DATA_FETCHER_BUSINESS_304');
    });

    it('should have business error codes in correct range', () => {
      const businessCodes = [
        DATA_FETCHER_ERROR_CODES.CAPABILITY_NOT_SUPPORTED,
        DATA_FETCHER_ERROR_CODES.PROVIDER_NOT_FOUND,
        DATA_FETCHER_ERROR_CODES.CONTEXT_SERVICE_NOT_AVAILABLE,
        DATA_FETCHER_ERROR_CODES.DATA_FETCH_FAILED,
        DATA_FETCHER_ERROR_CODES.PARTIAL_FAILURE
      ];

      businessCodes.forEach(code => {
        const number = parseInt(code.split('_').pop() as string);
        expect(number).toBeGreaterThanOrEqual(300);
        expect(number).toBeLessThanOrEqual(599);
      });
    });
  });

  describe('system error codes (600-899)', () => {
    it('should have correct system error code format', () => {
      expect(DATA_FETCHER_ERROR_CODES.EXECUTION_TIMEOUT).toBe('DATA_FETCHER_SYSTEM_600');
      expect(DATA_FETCHER_ERROR_CODES.MEMORY_PRESSURE).toBe('DATA_FETCHER_SYSTEM_601');
      expect(DATA_FETCHER_ERROR_CODES.CPU_OVERLOAD).toBe('DATA_FETCHER_SYSTEM_602');
    });

    it('should have system error codes in correct range', () => {
      const systemCodes = [
        DATA_FETCHER_ERROR_CODES.EXECUTION_TIMEOUT,
        DATA_FETCHER_ERROR_CODES.MEMORY_PRESSURE,
        DATA_FETCHER_ERROR_CODES.CPU_OVERLOAD
      ];

      systemCodes.forEach(code => {
        const number = parseInt(code.split('_').pop() as string);
        expect(number).toBeGreaterThanOrEqual(600);
        expect(number).toBeLessThanOrEqual(899);
      });
    });
  });

  describe('external dependency error codes (900-999)', () => {
    it('should have correct external error code format', () => {
      expect(DATA_FETCHER_ERROR_CODES.PROVIDER_UNAVAILABLE).toBe('DATA_FETCHER_EXTERNAL_900');
      expect(DATA_FETCHER_ERROR_CODES.PROVIDER_RATE_LIMITED).toBe('DATA_FETCHER_EXTERNAL_901');
      expect(DATA_FETCHER_ERROR_CODES.NETWORK_ERROR).toBe('DATA_FETCHER_EXTERNAL_902');
    });

    it('should have external error codes in correct range', () => {
      const externalCodes = [
        DATA_FETCHER_ERROR_CODES.PROVIDER_UNAVAILABLE,
        DATA_FETCHER_ERROR_CODES.PROVIDER_RATE_LIMITED,
        DATA_FETCHER_ERROR_CODES.NETWORK_ERROR
      ];

      externalCodes.forEach(code => {
        const number = parseInt(code.split('_').pop() as string);
        expect(number).toBeGreaterThanOrEqual(900);
        expect(number).toBeLessThanOrEqual(999);
      });
    });
  });

  describe('error code uniqueness', () => {
    it('should have unique error codes', () => {
      const errorCodeValues = Object.values(DATA_FETCHER_ERROR_CODES);
      const uniqueValues = new Set(errorCodeValues);

      expect(uniqueValues.size).toBe(errorCodeValues.length);
    });

    it('should have unique numeric suffixes', () => {
      const errorCodeValues = Object.values(DATA_FETCHER_ERROR_CODES);
      const numericSuffixes = errorCodeValues.map(code => {
        const parts = code.split('_');
        return parts[parts.length - 1];
      });

      const uniqueSuffixes = new Set(numericSuffixes);
      expect(uniqueSuffixes.size).toBe(numericSuffixes.length);
    });
  });

  describe('error code categories completeness', () => {
    it('should cover all major error scenarios', () => {
      const allErrorCodes = Object.keys(DATA_FETCHER_ERROR_CODES);

      // 验证错误类别
      const validationErrors = allErrorCodes.filter(key =>
        DATA_FETCHER_ERROR_CODES[key as keyof typeof DATA_FETCHER_ERROR_CODES].includes('VALIDATION')
      );
      expect(validationErrors.length).toBeGreaterThanOrEqual(5);

      // 业务逻辑错误类别
      const businessErrors = allErrorCodes.filter(key =>
        DATA_FETCHER_ERROR_CODES[key as keyof typeof DATA_FETCHER_ERROR_CODES].includes('BUSINESS')
      );
      expect(businessErrors.length).toBeGreaterThanOrEqual(5);

      // 系统错误类别
      const systemErrors = allErrorCodes.filter(key =>
        DATA_FETCHER_ERROR_CODES[key as keyof typeof DATA_FETCHER_ERROR_CODES].includes('SYSTEM')
      );
      expect(systemErrors.length).toBeGreaterThanOrEqual(3);

      // 外部依赖错误类别
      const externalErrors = allErrorCodes.filter(key =>
        DATA_FETCHER_ERROR_CODES[key as keyof typeof DATA_FETCHER_ERROR_CODES].includes('EXTERNAL')
      );
      expect(externalErrors.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('immutability', () => {
    it('should be an immutable object', () => {
      expect(() => {
        (DATA_FETCHER_ERROR_CODES as any).NEW_ERROR_CODE = 'DATA_FETCHER_NEW_001';
      }).toThrow();
    });

    it('should have immutable property values', () => {
      const originalValue = DATA_FETCHER_ERROR_CODES.MISSING_REQUIRED_PARAMS;

      expect(() => {
        (DATA_FETCHER_ERROR_CODES as any).MISSING_REQUIRED_PARAMS = 'MODIFIED_VALUE';
      }).toThrow();

      expect(DATA_FETCHER_ERROR_CODES.MISSING_REQUIRED_PARAMS).toBe(originalValue);
    });
  });
});

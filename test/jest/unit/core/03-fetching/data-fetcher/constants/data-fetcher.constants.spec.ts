/**
 * DataFetcher 常量单元测试
 * 测试DataFetcher模块的常量定义和值
 */

import {
  DATA_FETCHER_OPERATIONS,
  DATA_FETCHER_ERROR_MESSAGES,
  DATA_FETCHER_WARNING_MESSAGES,
  DATA_FETCHER_PERFORMANCE_THRESHOLDS,
  DATA_FETCHER_DEFAULT_CONFIG
} from '@core/03-fetching/data-fetcher/constants/data-fetcher.constants';
import { NUMERIC_CONSTANTS } from '@common/constants/core';
import { HTTP_TIMEOUTS, BATCH_SIZE_SEMANTICS } from '@common/constants/semantic';
import { RETRY_BUSINESS_SCENARIOS } from '@common/constants/semantic/retry-semantics.constants';

describe('DataFetcher Constants', () => {
  describe('DATA_FETCHER_OPERATIONS', () => {
    it('should contain all required operation names', () => {
      expect(DATA_FETCHER_OPERATIONS).toHaveProperty('FETCH_RAW_DATA');
      expect(DATA_FETCHER_OPERATIONS).toHaveProperty('CHECK_CAPABILITY');
      expect(DATA_FETCHER_OPERATIONS).toHaveProperty('GET_PROVIDER_CONTEXT');
    });

    it('should have correct operation values', () => {
      expect(DATA_FETCHER_OPERATIONS.FETCH_RAW_DATA).toBe('fetchRawData');
      expect(DATA_FETCHER_OPERATIONS.CHECK_CAPABILITY).toBe('checkCapability');
      expect(DATA_FETCHER_OPERATIONS.GET_PROVIDER_CONTEXT).toBe('getProviderContext');
    });

    it('should be immutable object', () => {
      expect(() => {
        (DATA_FETCHER_OPERATIONS as any).NEW_OPERATION = 'newOperation';
      }).toThrow();
    });
  });

  describe('DATA_FETCHER_ERROR_MESSAGES', () => {
    it('should contain all required error message templates', () => {
      expect(DATA_FETCHER_ERROR_MESSAGES).toHaveProperty('PROVIDER_NOT_FOUND');
      expect(DATA_FETCHER_ERROR_MESSAGES).toHaveProperty('CAPABILITY_NOT_SUPPORTED');
      expect(DATA_FETCHER_ERROR_MESSAGES).toHaveProperty('CONTEXT_SERVICE_NOT_AVAILABLE');
      expect(DATA_FETCHER_ERROR_MESSAGES).toHaveProperty('DATA_FETCH_FAILED');
      expect(DATA_FETCHER_ERROR_MESSAGES).toHaveProperty('INVALID_SYMBOLS');
      expect(DATA_FETCHER_ERROR_MESSAGES).toHaveProperty('EXECUTION_TIMEOUT');
      expect(DATA_FETCHER_ERROR_MESSAGES).toHaveProperty('PARTIAL_FAILURE');
    });

    it('should have placeholders in error messages', () => {
      expect(DATA_FETCHER_ERROR_MESSAGES.PROVIDER_NOT_FOUND).toContain('{provider}');
      expect(DATA_FETCHER_ERROR_MESSAGES.CAPABILITY_NOT_SUPPORTED).toContain('{provider}');
      expect(DATA_FETCHER_ERROR_MESSAGES.CAPABILITY_NOT_SUPPORTED).toContain('{capability}');
      expect(DATA_FETCHER_ERROR_MESSAGES.CONTEXT_SERVICE_NOT_AVAILABLE).toContain('{provider}');
      expect(DATA_FETCHER_ERROR_MESSAGES.DATA_FETCH_FAILED).toContain('{error}');
      expect(DATA_FETCHER_ERROR_MESSAGES.INVALID_SYMBOLS).toContain('{symbols}');
      expect(DATA_FETCHER_ERROR_MESSAGES.PARTIAL_FAILURE).toContain('{failedSymbols}');
    });

    it('should be immutable object', () => {
      expect(() => {
        (DATA_FETCHER_ERROR_MESSAGES as any).NEW_ERROR = 'New error: {message}';
      }).toThrow();
    });
  });

  describe('DATA_FETCHER_WARNING_MESSAGES', () => {
    it('should contain all required warning message templates', () => {
      expect(DATA_FETCHER_WARNING_MESSAGES).toHaveProperty('SLOW_RESPONSE');
      expect(DATA_FETCHER_WARNING_MESSAGES).toHaveProperty('PARTIAL_SUCCESS');
      expect(DATA_FETCHER_WARNING_MESSAGES).toHaveProperty('CONTEXT_SERVICE_WARNING');
    });

    it('should have placeholders in warning messages', () => {
      expect(DATA_FETCHER_WARNING_MESSAGES.SLOW_RESPONSE).toContain('{processingTimeMs}');
      expect(DATA_FETCHER_WARNING_MESSAGES.PARTIAL_SUCCESS).toContain('{failedCount}');
      expect(DATA_FETCHER_WARNING_MESSAGES.CONTEXT_SERVICE_WARNING).toContain('{warning}');
    });

    it('should be immutable object', () => {
      expect(() => {
        (DATA_FETCHER_WARNING_MESSAGES as any).NEW_WARNING = 'New warning: {message}';
      }).toThrow();
    });
  });

  describe('DATA_FETCHER_PERFORMANCE_THRESHOLDS (slimmed)', () => {
    it('should contain required thresholds', () => {
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS).toHaveProperty('SLOW_RESPONSE_MS');
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS).toHaveProperty('LOG_SYMBOLS_LIMIT');
    });

    it('should have numeric and positive values', () => {
      expect(typeof DATA_FETCHER_PERFORMANCE_THRESHOLDS.SLOW_RESPONSE_MS).toBe('number');
      expect(typeof DATA_FETCHER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT).toBe('number');
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS.SLOW_RESPONSE_MS).toBeGreaterThan(0);
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT).toBeGreaterThan(0);
    });

    it('should be immutable object', () => {
      expect(() => {
        (DATA_FETCHER_PERFORMANCE_THRESHOLDS as any).NEW_THRESHOLD = 2000;
      }).toThrow();
    });
  });

  describe('DATA_FETCHER_DEFAULT_CONFIG (slimmed)', () => {
    it('should contain required default configuration', () => {
      expect(DATA_FETCHER_DEFAULT_CONFIG).toHaveProperty('DEFAULT_API_TYPE');
    });

    it('should have correct default API type', () => {
      expect(DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_API_TYPE).toBe('rest');
      expect(['rest', 'stream']).toContain(DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_API_TYPE);
    });

    // timeout/retry/batch defaults removed from constants; verified via config service instead

    it('should be immutable object', () => {
      expect(() => {
        (DATA_FETCHER_DEFAULT_CONFIG as any).NEW_DEFAULT = 'new_value';
      }).toThrow();
    });
  });

  describe('constants integration', () => {
    it('should load shared constants', () => {
      expect(NUMERIC_CONSTANTS.N_1000).toBeDefined();
      expect(HTTP_TIMEOUTS.REQUEST.NORMAL_MS).toBeDefined();
      expect(BATCH_SIZE_SEMANTICS.BASIC.MAX_SIZE).toBeDefined();
      expect(BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE).toBeDefined();
      expect(RETRY_BUSINESS_SCENARIOS.DATA_FETCHER.maxAttempts).toBeDefined();
    });
  });
});

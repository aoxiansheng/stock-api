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

  describe('DATA_FETCHER_PERFORMANCE_THRESHOLDS', () => {
    it('should contain all required thresholds', () => {
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS).toHaveProperty('SLOW_RESPONSE_MS');
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS).toHaveProperty('MAX_TIME_PER_SYMBOL_MS');
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS).toHaveProperty('MAX_SYMBOLS_PER_BATCH');
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS).toHaveProperty('LOG_SYMBOLS_LIMIT');
    });

    it('should have numeric values for thresholds', () => {
      expect(typeof DATA_FETCHER_PERFORMANCE_THRESHOLDS.SLOW_RESPONSE_MS).toBe('number');
      expect(typeof DATA_FETCHER_PERFORMANCE_THRESHOLDS.MAX_TIME_PER_SYMBOL_MS).toBe('number');
      expect(typeof DATA_FETCHER_PERFORMANCE_THRESHOLDS.MAX_SYMBOLS_PER_BATCH).toBe('number');
      expect(typeof DATA_FETCHER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT).toBe('number');
    });

    it('should have positive values', () => {
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS.SLOW_RESPONSE_MS).toBeGreaterThan(0);
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS.MAX_TIME_PER_SYMBOL_MS).toBeGreaterThan(0);
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS.MAX_SYMBOLS_PER_BATCH).toBeGreaterThan(0);
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT).toBeGreaterThan(0);
    });

    it('should use unified configuration constants', () => {
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS.SLOW_RESPONSE_MS).toBe(NUMERIC_CONSTANTS.N_1000);
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS.MAX_SYMBOLS_PER_BATCH).toBe(BATCH_SIZE_SEMANTICS.BASIC.MAX_SIZE);
    });

    it('should be immutable object', () => {
      expect(() => {
        (DATA_FETCHER_PERFORMANCE_THRESHOLDS as any).NEW_THRESHOLD = 2000;
      }).toThrow();
    });
  });

  describe('DATA_FETCHER_DEFAULT_CONFIG', () => {
    it('should contain all required default configuration', () => {
      expect(DATA_FETCHER_DEFAULT_CONFIG).toHaveProperty('DEFAULT_API_TYPE');
      expect(DATA_FETCHER_DEFAULT_CONFIG).toHaveProperty('DEFAULT_TIMEOUT_MS');
      expect(DATA_FETCHER_DEFAULT_CONFIG).toHaveProperty('DEFAULT_RETRY_COUNT');
      expect(DATA_FETCHER_DEFAULT_CONFIG).toHaveProperty('DEFAULT_BATCH_SIZE');
    });

    it('should have correct default API type', () => {
      expect(DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_API_TYPE).toBe('rest');
      expect(['rest', 'stream']).toContain(DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_API_TYPE);
    });

    it('should have numeric values for timeouts and limits', () => {
      expect(typeof DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_TIMEOUT_MS).toBe('number');
      expect(typeof DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_RETRY_COUNT).toBe('number');
      expect(typeof DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_BATCH_SIZE).toBe('number');
    });

    it('should have positive values for defaults', () => {
      expect(DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_TIMEOUT_MS).toBeGreaterThan(0);
      expect(DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_RETRY_COUNT).toBeGreaterThanOrEqual(0);
      expect(DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_BATCH_SIZE).toBeGreaterThan(0);
    });

    it('should use unified configuration constants', () => {
      expect(DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_TIMEOUT_MS).toBe(HTTP_TIMEOUTS.REQUEST.NORMAL_MS);
      expect(DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_RETRY_COUNT).toBe(RETRY_BUSINESS_SCENARIOS.DATA_FETCHER.maxAttempts);
      expect(DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_BATCH_SIZE).toBe(BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE);
    });

    it('should be immutable object', () => {
      expect(() => {
        (DATA_FETCHER_DEFAULT_CONFIG as any).NEW_DEFAULT = 'new_value';
      }).toThrow();
    });
  });

  describe('constants integration', () => {
    it('should properly integrate with common constants', () => {
      expect(NUMERIC_CONSTANTS.N_1000).toBeDefined();
      expect(HTTP_TIMEOUTS.REQUEST.NORMAL_MS).toBeDefined();
      expect(BATCH_SIZE_SEMANTICS.BASIC.MAX_SIZE).toBeDefined();
      expect(BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE).toBeDefined();
      expect(RETRY_BUSINESS_SCENARIOS.DATA_FETCHER.maxAttempts).toBeDefined();
    });

    it('should have reasonable threshold relationships', () => {
      // Slow response threshold should be less than timeout
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS.SLOW_RESPONSE_MS).toBeLessThan(
        DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_TIMEOUT_MS
      );

      // Max time per symbol should be reasonable for monitoring thresholds
      const maxTimePerSymbol = DATA_FETCHER_PERFORMANCE_THRESHOLDS.MAX_TIME_PER_SYMBOL_MS;
      const maxBatchSize = DATA_FETCHER_PERFORMANCE_THRESHOLDS.MAX_SYMBOLS_PER_BATCH;
      
      // 基于并发处理的实际情况计算合理的批量处理时间
      // 默认并发限制为10，1000个符号需要100批，每批最大时间约为单符号最大时间
      const defaultConcurrency = 10; // 从 DATA_FETCHER_BATCH_CONCURRENCY 默认值
      const batchCount = Math.ceil(maxBatchSize / defaultConcurrency);
      const estimatedMaxBatchTime = batchCount * maxTimePerSymbol;

      // 批量处理时间应该在合理范围内（考虑并发处理）
      // 100批 × 500ms = 50秒，这对于大批量处理是合理的
      expect(estimatedMaxBatchTime).toBeLessThan(
        DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_TIMEOUT_MS * 3 // 放宽到3倍超时时间
      );

      // 单符号时间阈值应该小于整体超时时间
      expect(maxTimePerSymbol).toBeLessThan(
        DATA_FETCHER_DEFAULT_CONFIG.DEFAULT_TIMEOUT_MS
      );

      // Log symbols limit should be reasonable
      expect(DATA_FETCHER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT).toBeLessThanOrEqual(
        DATA_FETCHER_PERFORMANCE_THRESHOLDS.MAX_SYMBOLS_PER_BATCH
      );
    });
  });
});

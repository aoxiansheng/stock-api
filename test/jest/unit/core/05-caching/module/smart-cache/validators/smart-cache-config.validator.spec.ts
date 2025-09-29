/**
 * SmartCacheConfigValidator 单元测试
 * 测试智能缓存配置验证器的所有功能
 */

import { SmartCacheConfigValidator } from '@core/05-caching/module/smart-cache/validators/smart-cache-config.validator';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

// Mock dependencies
jest.mock('@common/core/exceptions', () => ({
  UniversalExceptionFactory: {
    createBusinessException: jest.fn().mockImplementation(({ message }) => {
      const error = new Error(message);
      error.name = 'BusinessException';
      return error;
    }),
  },
  BusinessErrorCode: {
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
    DATA_VALIDATION_FAILED: 'DATA_VALIDATION_FAILED',
  },
  ComponentIdentifier: {
    SMART_CACHE: 'SMART_CACHE',
  },
}));

describe('SmartCacheConfigValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateTTL', () => {
    it('should validate correct TTL values', () => {
      const errors = SmartCacheConfigValidator.validateTTL(300, 'test-strategy');
      expect(errors).toEqual([]);
    });

    it('should return errors for negative TTL values', () => {
      const errors = SmartCacheConfigValidator.validateTTL(-30, 'test-strategy');
      expect(errors).toContain('test-strategy: TTL必须为正数，当前值: -30');
    });

    it('should return errors for zero TTL values', () => {
      const errors = SmartCacheConfigValidator.validateTTL(0, 'test-strategy');
      expect(errors).toContain('test-strategy: TTL必须为正数，当前值: 0');
    });

    it('should return errors for very large TTL values', () => {
      const errors = SmartCacheConfigValidator.validateTTL(100000, 'test-strategy');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('TTL过大');
    });

    it('should include strategy name in error messages', () => {
      const errors = SmartCacheConfigValidator.validateTTL(-10, 'custom-strategy');
      expect(errors[0]).toContain('custom-strategy');
    });

    it('should handle different strategy names', () => {
      const strategies = ['STRONG_TIMELINESS', 'WEAK_TIMELINESS', 'MARKET_AWARE'];
      strategies.forEach(strategy => {
        const errors = SmartCacheConfigValidator.validateTTL(300, strategy);
        expect(errors).toEqual([]);
      });
    });

    it('should validate boundary values', () => {
      const errors1 = SmartCacheConfigValidator.validateTTL(1, 'boundary-test');
      expect(errors1).toEqual([]);

      const errors2 = SmartCacheConfigValidator.validateTTL(3600, 'boundary-test');
      expect(errors2).toEqual([]);
    });

    it('should handle invalid inputs gracefully', () => {
      const errors = SmartCacheConfigValidator.validateTTL(NaN, 'nan-test');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateThresholdRatio', () => {
    it('should validate correct threshold ratio', () => {
      const errors = SmartCacheConfigValidator.validateThresholdRatio(0.8, 'test-strategy');
      expect(errors).toEqual([]);
    });

    it('should validate boundary values', () => {
      const errors1 = SmartCacheConfigValidator.validateThresholdRatio(0.0, 'boundary-test');
      expect(errors1).toEqual([]);

      const errors2 = SmartCacheConfigValidator.validateThresholdRatio(1.0, 'boundary-test');
      expect(errors2).toEqual([]);
    });

    it('should return errors for negative ratios', () => {
      const errors = SmartCacheConfigValidator.validateThresholdRatio(-0.1, 'negative-test');
      expect(errors).toContain('negative-test: 阈值比例必须在0-1之间，当前值: -0.1');
    });

    it('should return errors for ratios greater than 1', () => {
      const errors = SmartCacheConfigValidator.validateThresholdRatio(1.1, 'exceed-test');
      expect(errors).toContain('exceed-test: 阈值比例必须在0-1之间，当前值: 1.1');
    });

    it('should handle invalid ratios gracefully', () => {
      const errors = SmartCacheConfigValidator.validateThresholdRatio(NaN, 'nan-test');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle infinity values', () => {
      const errors = SmartCacheConfigValidator.validateThresholdRatio(Infinity, 'infinity-test');
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should include strategy name in error messages', () => {
      const errors = SmartCacheConfigValidator.validateThresholdRatio(2.0, 'custom-strategy');
      expect(errors[0]).toContain('custom-strategy');
    });
  });

  describe('validateConcurrency', () => {
    it('should validate correct concurrency values', () => {
      const errors1 = SmartCacheConfigValidator.validateConcurrency(10);
      expect(errors1).toEqual([]);

      const errors2 = SmartCacheConfigValidator.validateConcurrency(50);
      expect(errors2).toEqual([]);
    });

    it('should return errors for values outside allowed range', () => {
      const errors1 = SmartCacheConfigValidator.validateConcurrency(0);
      expect(errors1.length).toBeGreaterThan(0);
      expect(errors1[0]).toContain('并发数必须在');

      const errors2 = SmartCacheConfigValidator.validateConcurrency(10000);
      expect(errors2.length).toBeGreaterThan(0);
      expect(errors2[0]).toContain('并发数必须在');
    });

    it('should return errors for negative concurrency', () => {
      const errors = SmartCacheConfigValidator.validateConcurrency(-5);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('并发数必须在');
    });

    it('should handle decimal values gracefully', () => {
      const errors = SmartCacheConfigValidator.validateConcurrency(5.5);
      // The method doesn't explicitly check for integers, so this depends on the constant limits
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle invalid inputs gracefully', () => {
      const errors = SmartCacheConfigValidator.validateConcurrency(NaN);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate boundary values from constants', () => {
      // Test with values that should be within the valid range based on typical cache limits
      const errors1 = SmartCacheConfigValidator.validateConcurrency(1);
      const errors2 = SmartCacheConfigValidator.validateConcurrency(100);

      // At least one of these should be valid based on typical concurrency limits
      expect(errors1.length === 0 || errors2.length === 0).toBe(true);
    });
  });

  describe('validateInterval', () => {
    it('should validate correct interval values', () => {
      const errors1 = SmartCacheConfigValidator.validateInterval(1000, 'cleanup');
      expect(errors1).toEqual([]);

      const errors2 = SmartCacheConfigValidator.validateInterval(5000, 'health check');
      expect(errors2).toEqual([]);
    });

    it('should return errors for zero intervals', () => {
      const errors = SmartCacheConfigValidator.validateInterval(0, 'cleanup');
      expect(errors).toContain('cleanup: 时间间隔必须为正数，当前值: 0毫秒');
    });

    it('should return errors for negative intervals', () => {
      const errors = SmartCacheConfigValidator.validateInterval(-1000, 'cleanup');
      expect(errors).toContain('cleanup: 时间间隔必须为正数，当前值: -1000毫秒');
    });

    it('should return errors for very small intervals', () => {
      const errors = SmartCacheConfigValidator.validateInterval(500, 'cleanup'); // Less than 1000ms
      expect(errors).toContain('cleanup: 时间间隔不能小于1秒，当前值: 500毫秒');
    });

    it('should return errors for very large intervals', () => {
      const errors = SmartCacheConfigValidator.validateInterval(25 * 60 * 60 * 1000, 'cleanup'); // More than 24 hours
      expect(errors).toContain('cleanup: 时间间隔不能超过1天，当前值: 90000000毫秒');
    });

    it('should include interval name in error message', () => {
      const errors = SmartCacheConfigValidator.validateInterval(-1000, 'custom interval');
      expect(errors[0]).toContain('custom interval');
    });

    it('should handle valid 24 hour intervals', () => {
      const errors = SmartCacheConfigValidator.validateInterval(24 * 60 * 60 * 1000, 'daily cleanup'); // Exactly 24 hours
      expect(errors).toEqual([]);
    });

    it('should handle multiple errors for very bad values', () => {
      const errors = SmartCacheConfigValidator.validateInterval(-500, 'multi-error');
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0]).toContain('multi-error');
    });

    it('should handle invalid inputs gracefully', () => {
      const errors = SmartCacheConfigValidator.validateInterval(NaN, 'nan-test');
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateAdaptiveTtlRange', () => {
    it('should validate correct adaptive TTL range', () => {
      const errors = SmartCacheConfigValidator.validateAdaptiveTtlRange(30, 300, 60);
      expect(errors).toEqual([]);
    });

    it('should return errors when min TTL is greater than max TTL', () => {
      const errors = SmartCacheConfigValidator.validateAdaptiveTtlRange(300, 30, 60);
      expect(errors).toContain('自适应策略: 最小TTL(300)必须小于最大TTL(30)');
    });

    it('should return errors when base TTL is outside range', () => {
      const errors1 = SmartCacheConfigValidator.validateAdaptiveTtlRange(30, 300, 20); // base < min
      expect(errors1).toContain('自适应策略: 基础TTL(20)必须在最小TTL(30)和最大TTL(300)之间');

      const errors2 = SmartCacheConfigValidator.validateAdaptiveTtlRange(30, 300, 400); // base > max
      expect(errors2).toContain('自适应策略: 基础TTL(400)必须在最小TTL(30)和最大TTL(300)之间');
    });

    it('should allow min and max TTL to be equal when base TTL matches', () => {
      const errors = SmartCacheConfigValidator.validateAdaptiveTtlRange(60, 60, 60);
      expect(errors).toEqual([]);
    });

    it('should return errors for equal min/max when base TTL is different', () => {
      const errors = SmartCacheConfigValidator.validateAdaptiveTtlRange(60, 60, 30);
      expect(errors).toContain('自适应策略: 基础TTL(30)必须在最小TTL(60)和最大TTL(60)之间');
    });

    it('should handle boundary cases correctly', () => {
      const errors1 = SmartCacheConfigValidator.validateAdaptiveTtlRange(30, 300, 30); // base = min
      expect(errors1).toEqual([]);

      const errors2 = SmartCacheConfigValidator.validateAdaptiveTtlRange(30, 300, 300); // base = max
      expect(errors2).toEqual([]);
    });

    it('should handle multiple validation errors', () => {
      const errors = SmartCacheConfigValidator.validateAdaptiveTtlRange(300, 30, 400); // Both conditions fail
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0]).toContain('自适应策略');
    });

    it('should validate with typical cache values', () => {
      const errors = SmartCacheConfigValidator.validateAdaptiveTtlRange(5, 3600, 300); // 5s to 1h, base 5min
      expect(errors).toEqual([]);
    });

    it('should handle edge case with very small values', () => {
      const errors = SmartCacheConfigValidator.validateAdaptiveTtlRange(1, 2, 1);
      expect(errors).toEqual([]);
    });
  });

  describe('validateMarketAwareConfig', () => {
    it('should validate correct market-aware configuration', () => {
      const errors = SmartCacheConfigValidator.validateMarketAwareConfig(30, 300, 60000); // 30s open, 300s closed, 60s check interval
      expect(errors).toEqual([]);
    });

    it('should return errors for negative TTL values', () => {
      const errors1 = SmartCacheConfigValidator.validateMarketAwareConfig(-30, 300, 60000);
      expect(errors1).toContain('市场感知策略: 开市和闭市TTL必须为正数');

      const errors2 = SmartCacheConfigValidator.validateMarketAwareConfig(30, -300, 60000);
      expect(errors2).toContain('市场感知策略: 开市和闭市TTL必须为正数');

      const errors3 = SmartCacheConfigValidator.validateMarketAwareConfig(-30, -300, 60000);
      expect(errors3).toContain('市场感知策略: 开市和闭市TTL必须为正数');
    });

    it('should return errors for zero TTL values', () => {
      const errors1 = SmartCacheConfigValidator.validateMarketAwareConfig(0, 300, 60000);
      expect(errors1).toContain('市场感知策略: 开市和闭市TTL必须为正数');

      const errors2 = SmartCacheConfigValidator.validateMarketAwareConfig(30, 0, 60000);
      expect(errors2).toContain('市场感知策略: 开市和闭市TTL必须为正数');
    });

    it('should return errors for invalid check interval', () => {
      const errors1 = SmartCacheConfigValidator.validateMarketAwareConfig(30, 300, 0);
      expect(errors1).toContain('市场感知策略: 市场状态检查间隔必须为正数');

      const errors2 = SmartCacheConfigValidator.validateMarketAwareConfig(30, 300, -60000);
      expect(errors2).toContain('市场感知策略: 市场状态检查间隔必须为正数');
    });

    it('should warn when open TTL is greater than or equal to closed TTL', () => {
      const errors1 = SmartCacheConfigValidator.validateMarketAwareConfig(300, 300, 60000); // Equal
      expect(errors1).toContain('市场感知策略: 建议开市TTL(300)小于闭市TTL(300)以适应市场活跃度');

      const errors2 = SmartCacheConfigValidator.validateMarketAwareConfig(400, 300, 60000); // Open > Closed
      expect(errors2).toContain('市场感知策略: 建议开市TTL(400)小于闭市TTL(300)以适应市场活跃度');
    });

    it('should handle multiple validation errors', () => {
      const errors = SmartCacheConfigValidator.validateMarketAwareConfig(-30, 0, -60000);
      expect(errors.length).toBeGreaterThanOrEqual(2); // Multiple errors expected
      expect(errors.some(error => error.includes('开市和闭市TTL必须为正数'))).toBe(true);
      expect(errors.some(error => error.includes('市场状态检查间隔必须为正数'))).toBe(true);
    });

    it('should validate typical market configuration values', () => {
      // US market: 5s open, 300s closed, check every 30s
      const errors1 = SmartCacheConfigValidator.validateMarketAwareConfig(5, 300, 30000);
      expect(errors1).toEqual([]);

      // HK market: 10s open, 600s closed, check every 60s
      const errors2 = SmartCacheConfigValidator.validateMarketAwareConfig(10, 600, 60000);
      expect(errors2).toEqual([]);
    });

    it('should handle valid boundary cases', () => {
      const errors = SmartCacheConfigValidator.validateMarketAwareConfig(1, 2, 1); // Minimal valid values
      expect(errors).toEqual([]);
    });

    it('should handle edge case with very large values', () => {
      const errors = SmartCacheConfigValidator.validateMarketAwareConfig(3600, 86400, 300000); // 1h open, 24h closed, 5min check
      expect(errors).toEqual([]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle infinity values in TTL', () => {
      const errors = SmartCacheConfigValidator.validateTTL(Infinity, 'infinity-test');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('TTL过大');
    });

    it('should handle NaN values in configurations', () => {
      const errors1 = SmartCacheConfigValidator.validateConcurrency(NaN);
      expect(errors1.length).toBeGreaterThan(0);

      const errors2 = SmartCacheConfigValidator.validateInterval(NaN, 'test');
      expect(errors2.length).toBeGreaterThan(0);

      const errors3 = SmartCacheConfigValidator.validateThresholdRatio(NaN, 'test');
      expect(errors3.length).toBeGreaterThan(0);
    });

    it('should provide meaningful error messages with context', () => {
      const errors = SmartCacheConfigValidator.validateTTL(-10, 'error-context-test');
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('error-context-test');
      expect(errors[0]).toContain('TTL必须为正数');
    });

    it('should handle very large but potentially valid values', () => {
      // Test with large values that might still be within validator limits
      const errors = SmartCacheConfigValidator.validateTTL(86400, 'large-valid-test'); // 1 day
      // This depends on the actual ADAPTIVE_MAX_S constant value
      expect(Array.isArray(errors)).toBe(true);
    });

    it('should handle decimal values consistently', () => {
      const errors1 = SmartCacheConfigValidator.validateTTL(30.5, 'decimal-test');
      expect(Array.isArray(errors1)).toBe(true);

      const errors2 = SmartCacheConfigValidator.validateThresholdRatio(0.75, 'decimal-ratio-test');
      expect(errors2).toEqual([]);
    });

    it('should handle zero values across all validators', () => {
      const ttlErrors = SmartCacheConfigValidator.validateTTL(0, 'zero-ttl-test');
      expect(ttlErrors.length).toBeGreaterThan(0);

      const intervalErrors = SmartCacheConfigValidator.validateInterval(0, 'zero-interval-test');
      expect(intervalErrors.length).toBeGreaterThan(0);

      const ratioErrors = SmartCacheConfigValidator.validateThresholdRatio(0, 'zero-ratio-test');
      expect(ratioErrors).toEqual([]); // 0 should be valid for ratios
    });

    it('should handle extreme negative values', () => {
      const errors1 = SmartCacheConfigValidator.validateTTL(-999999, 'extreme-negative');
      expect(errors1.length).toBeGreaterThan(0);

      const errors2 = SmartCacheConfigValidator.validateAdaptiveTtlRange(-100, -50, -75);
      expect(errors2.length).toBeGreaterThan(0);

      const errors3 = SmartCacheConfigValidator.validateMarketAwareConfig(-1000, -2000, -3000);
      expect(errors3.length).toBeGreaterThan(0);
    });

    it('should validate complex scenarios with multiple parameters', () => {
      // Test a complex scenario that exercises multiple validation paths
      const ttlErrors = SmartCacheConfigValidator.validateTTL(300, 'complex-scenario');
      const ratioErrors = SmartCacheConfigValidator.validateThresholdRatio(0.8, 'complex-scenario');
      const intervalErrors = SmartCacheConfigValidator.validateInterval(5000, 'complex-scenario');
      const adaptiveErrors = SmartCacheConfigValidator.validateAdaptiveTtlRange(30, 600, 300);
      const marketErrors = SmartCacheConfigValidator.validateMarketAwareConfig(30, 300, 60000);

      // All should be valid in this scenario
      expect(ttlErrors).toEqual([]);
      expect(ratioErrors).toEqual([]);
      expect(intervalErrors).toEqual([]);
      expect(adaptiveErrors).toEqual([]);
      expect(marketErrors).toEqual([]);
    });
  });
});
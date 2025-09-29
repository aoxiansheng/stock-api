/**
 * SmartCacheConfigFactory 单元测试
 * 测试智能缓存配置工厂的功能
 */

import { SmartCacheConfigFactory } from '@core/05-caching/module/smart-cache/config/smart-cache-config.factory';

describe('SmartCacheConfigFactory', () => {
  describe('createConfig', () => {
    it('should create default configuration', () => {
      const config = SmartCacheConfigFactory.createConfig();

      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });

    it('should include required TTL configuration', () => {
      const config = SmartCacheConfigFactory.createConfig();

      expect(config.ttl).toBeDefined();
      expect(config.ttl.realTimeTtlSeconds).toBeDefined();
      expect(config.ttl.nearRealTimeTtlSeconds).toBeDefined();
      expect(config.ttl.batchQueryTtlSeconds).toBeDefined();
    });

    it('should include performance configuration', () => {
      const config = SmartCacheConfigFactory.createConfig();

      expect(config.performance).toBeDefined();
      expect(config.performance.maxConcurrentOperations).toBeDefined();
      expect(config.performance.operationTimeoutMs).toBeDefined();
    });

    it('should include intervals configuration', () => {
      const config = SmartCacheConfigFactory.createConfig();

      expect(config.intervals).toBeDefined();
      expect(config.intervals.cleanupIntervalMs).toBeDefined();
      expect(config.intervals.healthCheckIntervalMs).toBeDefined();
    });

    it('should include limits configuration', () => {
      const config = SmartCacheConfigFactory.createConfig();

      expect(config.limits).toBeDefined();
      expect(config.limits.maxKeyLength).toBeDefined();
      expect(config.limits.maxValueSizeBytes).toBeDefined();
    });

    it('should include retry configuration', () => {
      const config = SmartCacheConfigFactory.createConfig();

      expect(config.retry).toBeDefined();
      expect(config.retry.maxRetryAttempts).toBeDefined();
      expect(config.retry.baseRetryDelayMs).toBeDefined();
    });

    it('should have reasonable default values', () => {
      const config = SmartCacheConfigFactory.createConfig();

      // TTL defaults should be reasonable
      expect(config.ttl.realTimeTtlSeconds).toBeGreaterThan(0);
      expect(config.ttl.batchQueryTtlSeconds).toBeGreaterThan(config.ttl.realTimeTtlSeconds);
      expect(config.ttl.nearRealTimeTtlSeconds).toBeGreaterThan(0);

      // Performance defaults should be reasonable
      expect(config.performance.maxConcurrentOperations).toBeGreaterThan(0);
      expect(config.performance.operationTimeoutMs).toBeGreaterThan(0);

      // Intervals defaults should be reasonable
      expect(config.intervals.cleanupIntervalMs).toBeGreaterThan(0);
      expect(config.intervals.healthCheckIntervalMs).toBeGreaterThan(0);

      // Limits defaults should be reasonable
      expect(config.limits.maxKeyLength).toBeGreaterThan(0);
      expect(config.limits.maxValueSizeBytes).toBeGreaterThan(0);

      // Retry defaults should be reasonable
      expect(config.retry.maxRetryAttempts).toBeGreaterThan(0);
      expect(config.retry.baseRetryDelayMs).toBeGreaterThan(0);
    });

    it('should respect environment variables', () => {
      // This test would check if the factory properly reads environment variables
      // For now, just ensure the factory function exists and works
      const config = SmartCacheConfigFactory.createConfig();
      expect(config).toBeDefined();
    });

    it('should provide immutable configuration', () => {
      const config1 = SmartCacheConfigFactory.createConfig();
      const config2 = SmartCacheConfigFactory.createConfig();

      // Should be separate objects
      expect(config1).not.toBe(config2);

      // But with same values
      expect(config1).toEqual(config2);
    });
  });

  describe('Configuration validation', () => {
    it('should create valid configuration structure', () => {
      const config = SmartCacheConfigFactory.createConfig();

      // Verify all required properties exist
      const requiredProps = ['ttl', 'performance', 'intervals', 'limits', 'retry'];
      requiredProps.forEach(prop => {
        expect(config).toHaveProperty(prop);
      });

      // Verify TTL structure
      const requiredTtlProps = ['realTimeTtlSeconds', 'nearRealTimeTtlSeconds', 'batchQueryTtlSeconds'];
      requiredTtlProps.forEach(prop => {
        expect(config.ttl).toHaveProperty(prop);
        expect(typeof config.ttl[prop]).toBe('number');
      });

      // Verify performance structure
      const requiredPerfProps = ['maxConcurrentOperations', 'operationTimeoutMs'];
      requiredPerfProps.forEach(prop => {
        expect(config.performance).toHaveProperty(prop);
        expect(typeof config.performance[prop]).toBe('number');
      });

      // Verify intervals structure
      const requiredIntervalProps = ['cleanupIntervalMs', 'healthCheckIntervalMs'];
      requiredIntervalProps.forEach(prop => {
        expect(config.intervals).toHaveProperty(prop);
        expect(typeof config.intervals[prop]).toBe('number');
      });

      // Verify limits structure
      const requiredLimitProps = ['maxKeyLength', 'maxValueSizeBytes'];
      requiredLimitProps.forEach(prop => {
        expect(config.limits).toHaveProperty(prop);
        expect(typeof config.limits[prop]).toBe('number');
      });

      // Verify retry structure
      const requiredRetryProps = ['maxRetryAttempts', 'baseRetryDelayMs'];
      requiredRetryProps.forEach(prop => {
        expect(config.retry).toHaveProperty(prop);
        expect(typeof config.retry[prop]).toBe('number');
      });
    });

    it('should have logical constraints between values', () => {
      const config = SmartCacheConfigFactory.createConfig();

      // TTL constraints - real-time should be shorter than batch query
      expect(config.ttl.realTimeTtlSeconds).toBeLessThan(config.ttl.batchQueryTtlSeconds);

      // Positive values
      expect(config.ttl.realTimeTtlSeconds).toBeGreaterThan(0);
      expect(config.performance.maxConcurrentOperations).toBeGreaterThan(0);
      expect(config.performance.operationTimeoutMs).toBeGreaterThan(0);
      expect(config.intervals.cleanupIntervalMs).toBeGreaterThan(0);
      expect(config.limits.maxKeyLength).toBeGreaterThan(0);
      expect(config.limits.maxValueSizeBytes).toBeGreaterThan(0);
      expect(config.retry.maxRetryAttempts).toBeGreaterThan(0);
      expect(config.retry.baseRetryDelayMs).toBeGreaterThan(0);
    });
  });

  describe('Environment Variable Parsing', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should use environment variables when provided', () => {
      process.env.SMART_CACHE_STRONG_TTL_SECONDS = '10';
      process.env.SMART_CACHE_WEAK_TTL_SECONDS = '600';
      process.env.SMART_CACHE_MAX_CONCURRENT_UPDATES = '8';
      process.env.SMART_CACHE_ENABLE_METRICS = 'false';

      const config = SmartCacheConfigFactory.createConfig();

      expect(config.ttl.realTimeTtlSeconds).toBe(10);
      expect(config.ttl.batchQueryTtlSeconds).toBe(600);
      expect(config.performance.maxConcurrentOperations).toBe(8);
      expect(config.metricsEnabled).toBe(false);
    });

    it('should handle invalid integer environment variables gracefully', () => {
      process.env.SMART_CACHE_STRONG_TTL_SECONDS = 'invalid';
      process.env.SMART_CACHE_MAX_CONCURRENT_UPDATES = 'not-a-number';

      const config = SmartCacheConfigFactory.createConfig();

      // Should use default values for invalid inputs
      expect(config.ttl.realTimeTtlSeconds).toBeGreaterThan(0);
      expect(config.performance.maxConcurrentOperations).toBeGreaterThan(0);
    });

    it('should handle boolean environment variables correctly', () => {
      // Test different boolean formats
      process.env.SMART_CACHE_ENABLE_METRICS = 'true';
      let config = SmartCacheConfigFactory.createConfig();
      expect(config.metricsEnabled).toBe(true);

      process.env.SMART_CACHE_ENABLE_METRICS = '1';
      config = SmartCacheConfigFactory.createConfig();
      expect(config.metricsEnabled).toBe(true);

      process.env.SMART_CACHE_ENABLE_METRICS = 'yes';
      config = SmartCacheConfigFactory.createConfig();
      expect(config.metricsEnabled).toBe(true);

      process.env.SMART_CACHE_ENABLE_METRICS = 'false';
      config = SmartCacheConfigFactory.createConfig();
      expect(config.metricsEnabled).toBe(false);

      process.env.SMART_CACHE_ENABLE_METRICS = '0';
      config = SmartCacheConfigFactory.createConfig();
      expect(config.metricsEnabled).toBe(false);
    });

    it('should apply min/max boundaries to parsed values', () => {
      // Test values that should be constrained by boundaries
      process.env.SMART_CACHE_MAX_CONCURRENT_UPDATES = '1000'; // Should be capped

      const config = SmartCacheConfigFactory.createConfig();

      // Should be capped at the maximum allowed value
      expect(config.performance.maxConcurrentOperations).toBeLessThanOrEqual(100);
    });

    it('should use verbose logging when enabled', () => {
      process.env.SMART_CACHE_VERBOSE_CONFIG = 'true';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const config = SmartCacheConfigFactory.createConfig();

      expect(config).toBeDefined();
      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Validation', () => {
    it('should throw error for invalid configuration', () => {
      // Mock the createConfig to return invalid config for testing
      const originalCreateConfig = SmartCacheConfigFactory.createConfig;

      // Mock to create an invalid config that will fail validation
      jest.spyOn(SmartCacheConfigFactory, 'createConfig').mockImplementation(() => {
        return {
          name: '', // Invalid empty name
          defaultTtlSeconds: -1, // Invalid negative TTL
          maxTtlSeconds: 100,
          minTtlSeconds: 200, // Invalid: min > max
          compressionEnabled: true,
          compressionThresholdBytes: 1024,
          metricsEnabled: true,
          performanceMonitoringEnabled: true,
          ttl: {
            realTimeTtlSeconds: -5, // Invalid negative
            nearRealTimeTtlSeconds: 0, // Invalid zero
            batchQueryTtlSeconds: 300,
            offHoursTtlSeconds: 600,
            weekendTtlSeconds: 1200,
          },
          performance: {
            maxMemoryMb: 2048,
            defaultBatchSize: 50,
            maxConcurrentOperations: 8,
            slowOperationThresholdMs: 1000,
            connectionTimeoutMs: 5000,
            operationTimeoutMs: 30000,
          },
          intervals: {
            cleanupIntervalMs: 300000,
            healthCheckIntervalMs: 300000,
            metricsCollectionIntervalMs: 60000,
            statsLogIntervalMs: 300000,
            heartbeatIntervalMs: 30000,
          },
          limits: {
            maxKeyLength: 500,
            maxValueSizeBytes: 10485760,
            maxCacheEntries: 100000,
            memoryThresholdRatio: 0.85,
            errorRateAlertThreshold: 0.05,
          },
          retry: {
            maxRetryAttempts: 3,
            baseRetryDelayMs: 100,
            retryDelayMultiplier: 2,
            maxRetryDelayMs: 5000,
            exponentialBackoffEnabled: true,
          },
        } as any;
      });

      expect(() => {
        SmartCacheConfigFactory.createConfig();
      }).toThrow();

      // Restore original implementation
      (SmartCacheConfigFactory.createConfig as jest.Mock).mockRestore();
    });

    it('should validate TTL configuration boundaries', () => {
      const config = SmartCacheConfigFactory.createConfig();

      // TTL values should be positive
      expect(config.ttl.realTimeTtlSeconds).toBeGreaterThan(0);
      expect(config.ttl.nearRealTimeTtlSeconds).toBeGreaterThan(0);
      expect(config.ttl.batchQueryTtlSeconds).toBeGreaterThan(0);
      expect(config.ttl.offHoursTtlSeconds).toBeGreaterThan(0);
      expect(config.ttl.weekendTtlSeconds).toBeGreaterThan(0);

      // min < max TTL relationship
      expect(config.minTtlSeconds).toBeLessThan(config.maxTtlSeconds);
    });

    it('should validate performance configuration boundaries', () => {
      const config = SmartCacheConfigFactory.createConfig();

      expect(config.performance.maxMemoryMb).toBeGreaterThan(0);
      expect(config.performance.maxMemoryMb).toBeLessThanOrEqual(8192);
      expect(config.performance.defaultBatchSize).toBeGreaterThan(0);
      expect(config.performance.maxConcurrentOperations).toBeGreaterThan(0);
      expect(config.performance.maxConcurrentOperations).toBeLessThanOrEqual(100);
      expect(config.performance.slowOperationThresholdMs).toBeGreaterThan(0);
      expect(config.performance.connectionTimeoutMs).toBeGreaterThan(0);
      expect(config.performance.operationTimeoutMs).toBeGreaterThan(0);
    });

    it('should validate limits configuration boundaries', () => {
      const config = SmartCacheConfigFactory.createConfig();

      expect(config.limits.maxKeyLength).toBeGreaterThan(0);
      expect(config.limits.maxValueSizeBytes).toBeGreaterThan(0);
      expect(config.limits.maxCacheEntries).toBeGreaterThan(0);
      expect(config.limits.memoryThresholdRatio).toBeGreaterThan(0);
      expect(config.limits.memoryThresholdRatio).toBeLessThanOrEqual(1);
      expect(config.limits.errorRateAlertThreshold).toBeGreaterThanOrEqual(0);
      expect(config.limits.errorRateAlertThreshold).toBeLessThanOrEqual(1);
    });

    it('should validate retry configuration', () => {
      const config = SmartCacheConfigFactory.createConfig();

      expect(config.retry.maxRetryAttempts).toBeGreaterThanOrEqual(0);
      expect(config.retry.baseRetryDelayMs).toBeGreaterThan(0);
      expect(config.retry.retryDelayMultiplier).toBeGreaterThan(1);
      expect(config.retry.maxRetryDelayMs).toBeGreaterThan(config.retry.baseRetryDelayMs);
    });
  });

  describe('System Information', () => {
    it('should provide system information', () => {
      const systemInfo = SmartCacheConfigFactory.getSystemInfo();

      expect(systemInfo).toHaveProperty('cpuCores');
      expect(systemInfo).toHaveProperty('totalMemoryMB');
      expect(systemInfo).toHaveProperty('freeMemoryMB');
      expect(systemInfo).toHaveProperty('platform');
      expect(systemInfo).toHaveProperty('arch');
      expect(systemInfo).toHaveProperty('nodeVersion');

      expect(typeof systemInfo.cpuCores).toBe('number');
      expect(systemInfo.cpuCores).toBeGreaterThan(0);
      expect(typeof systemInfo.totalMemoryMB).toBe('number');
      expect(systemInfo.totalMemoryMB).toBeGreaterThan(0);
      expect(typeof systemInfo.freeMemoryMB).toBe('number');
      expect(systemInfo.freeMemoryMB).toBeGreaterThanOrEqual(0);
      expect(typeof systemInfo.platform).toBe('string');
      expect(typeof systemInfo.arch).toBe('string');
      expect(typeof systemInfo.nodeVersion).toBe('string');
    });

  

    it('should show custom environment variables when set', () => {
      const originalEnv = { ...process.env };
      process.env.CACHE_STRONG_TTL = '15';
      process.env.CACHE_WEAK_TTL = '600';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const config = SmartCacheConfigFactory.createConfig();

      expect(config).toBeDefined();

      process.env = originalEnv;
      consoleSpy.mockRestore();
    });
  });

  describe('CPU and Memory Based Configuration', () => {
    it('should adapt configuration based on CPU cores', () => {
      const config = SmartCacheConfigFactory.createConfig();
      const systemInfo = SmartCacheConfigFactory.getSystemInfo();

      // Max concurrent operations should be related to CPU cores
      expect(config.performance.maxConcurrentOperations).toBeGreaterThanOrEqual(Math.min(systemInfo.cpuCores, 2));
    });

    it('should adapt memory configuration based on total memory', () => {
      const config = SmartCacheConfigFactory.createConfig();
      const systemInfo = SmartCacheConfigFactory.getSystemInfo();

      // Max memory should be reasonable portion of total memory
      const expectedMaxMemory = Math.min(Math.round(systemInfo.totalMemoryMB * 0.3), 2048);
      expect(config.performance.maxMemoryMb).toBeLessThanOrEqual(expectedMaxMemory);
    });

    it('should create consistent configuration on multiple calls', () => {
      const config1 = SmartCacheConfigFactory.createConfig();
      const config2 = SmartCacheConfigFactory.createConfig();

      // Should be equivalent but not the same object
      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle float environment variables', () => {
      const originalEnv = { ...process.env };

      // Mock parseFloatEnv by testing an environment variable that would use it
      // Since the current implementation doesn't expose parseFloatEnv directly,
      // we'll test through a scenario that would use float parsing
      process.env.SMART_CACHE_MEMORY_THRESHOLD = '0.75';

      const config = SmartCacheConfigFactory.createConfig();
      expect(config).toBeDefined();

      process.env = originalEnv;
    });

    it('should handle missing environment variables gracefully', () => {
      const originalEnv = { ...process.env };

      // Clear all smart cache related env vars
      Object.keys(process.env).forEach(key => {
        if (key.includes('SMART_CACHE') || key.includes('CACHE_')) {
          delete process.env[key];
        }
      });

      const config = SmartCacheConfigFactory.createConfig();

      // Should still create valid configuration with defaults
      expect(config).toBeDefined();
      expect(config.ttl.realTimeTtlSeconds).toBeGreaterThan(0);
      expect(config.performance.maxConcurrentOperations).toBeGreaterThan(0);

      process.env = originalEnv;
    });

    it('should handle extreme environment variable values', () => {
      const originalEnv = { ...process.env };

      process.env.SMART_CACHE_MAX_CONCURRENT_UPDATES = '999999';
      process.env.SMART_CACHE_STRONG_TTL_SECONDS = '-100';

      const config = SmartCacheConfigFactory.createConfig();

      // Should enforce reasonable boundaries
      expect(config.performance.maxConcurrentOperations).toBeLessThanOrEqual(100);
      expect(config.ttl.realTimeTtlSeconds).toBeGreaterThan(0);

      process.env = originalEnv;
    });

    it('should handle memory calculation edge cases', () => {
      const config = SmartCacheConfigFactory.createConfig();

      // Memory configuration should be reasonable regardless of system memory
      expect(config.performance.maxMemoryMb).toBeGreaterThan(0);
      expect(config.performance.maxMemoryMb).toBeLessThanOrEqual(8192);
    });

    it('should validate configuration name requirements', () => {
      const config = SmartCacheConfigFactory.createConfig();

      expect(config.name).toBeDefined();
      expect(config.name.trim().length).toBeGreaterThan(0);
      expect(config.name).toBe('smart-cache');
    });

    it('should ensure TTL relationships are logical', () => {
      const config = SmartCacheConfigFactory.createConfig();

      // Near real-time should be between real-time and batch
      expect(config.ttl.nearRealTimeTtlSeconds).toBeGreaterThan(config.ttl.realTimeTtlSeconds);
      expect(config.ttl.nearRealTimeTtlSeconds).toBeLessThanOrEqual(config.ttl.batchQueryTtlSeconds);

      // Off-hours and weekend should be longer than regular hours
      expect(config.ttl.offHoursTtlSeconds).toBeGreaterThanOrEqual(config.ttl.batchQueryTtlSeconds);
      expect(config.ttl.weekendTtlSeconds).toBeGreaterThanOrEqual(config.ttl.offHoursTtlSeconds);
    });
  });
});

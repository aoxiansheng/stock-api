/**
 * Monitoring Config Unit Tests
 * 测试监控配置的完整性、验证逻辑和环境适配
 */

import {
  DEFAULT_MONITORING_CONFIG,
  getMonitoringConfigForEnvironment,
  validateMonitoringConfig,
  MonitoringConfig,
} from '@monitoring/config/monitoring.config';
import {
  UniversalExceptionFactory,
  ComponentIdentifier,
  BusinessErrorCode,
} from '@common/core/exceptions';
import { MONITORING_ERROR_CODES } from '@monitoring/constants/monitoring-error-codes.constants';

describe('MonitoringConfig', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('DEFAULT_MONITORING_CONFIG', () => {
    it('should have valid default cache configuration', () => {
      expect(DEFAULT_MONITORING_CONFIG.cache).toBeDefined();
      expect(DEFAULT_MONITORING_CONFIG.cache.namespace).toBeDefined();
      expect(DEFAULT_MONITORING_CONFIG.cache.keyIndexPrefix).toBeDefined();
      expect(DEFAULT_MONITORING_CONFIG.cache.compressionThreshold).toBe(1024);
      expect(DEFAULT_MONITORING_CONFIG.cache.fallbackThreshold).toBe(10);
      expect(DEFAULT_MONITORING_CONFIG.cache.batchSize).toBeGreaterThan(0);
    });

    it('should have valid default events configuration', () => {
      expect(DEFAULT_MONITORING_CONFIG.events).toBeDefined();
      expect(typeof DEFAULT_MONITORING_CONFIG.events.enableAutoAnalysis).toBe('boolean');
      expect(DEFAULT_MONITORING_CONFIG.events.retryAttempts).toBeGreaterThanOrEqual(0);
    });

    it('should have valid default performance configuration', () => {
      expect(DEFAULT_MONITORING_CONFIG.performance).toBeDefined();
      expect(DEFAULT_MONITORING_CONFIG.performance.latencyThresholds).toBeDefined();
      expect(DEFAULT_MONITORING_CONFIG.performance.latencyThresholds.p95Warning).toBeGreaterThan(0);
      expect(DEFAULT_MONITORING_CONFIG.performance.latencyThresholds.p99Critical).toBeGreaterThan(0);
      expect(DEFAULT_MONITORING_CONFIG.performance.hitRateThreshold).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_MONITORING_CONFIG.performance.hitRateThreshold).toBeLessThanOrEqual(1);
      expect(DEFAULT_MONITORING_CONFIG.performance.errorRateThreshold).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_MONITORING_CONFIG.performance.errorRateThreshold).toBeLessThanOrEqual(1);
    });

    it('should calculate p99Critical as 2.5x of p95Warning', () => {
      const expectedP99 = Math.floor(DEFAULT_MONITORING_CONFIG.performance.latencyThresholds.p95Warning * 2.5);
      expect(DEFAULT_MONITORING_CONFIG.performance.latencyThresholds.p99Critical).toBe(expectedP99);
    });
  });

  describe('Environment Variable Integration', () => {
    it('should use environment variables in default config', () => {
      const originalVars = {
        MONITORING_NAMESPACE: process.env.MONITORING_NAMESPACE,
        MONITORING_DEFAULT_BATCH_SIZE: process.env.MONITORING_DEFAULT_BATCH_SIZE,
        MONITORING_AUTO_ANALYSIS: process.env.MONITORING_AUTO_ANALYSIS,
      };

      try {
        process.env.MONITORING_NAMESPACE = 'test_monitoring';
        process.env.MONITORING_DEFAULT_BATCH_SIZE = '15';
        process.env.MONITORING_AUTO_ANALYSIS = 'false';

        delete require.cache[require.resolve('@monitoring/config/monitoring.config')];
        const { DEFAULT_MONITORING_CONFIG: testConfig } = require('@monitoring/config/monitoring.config');

        expect(testConfig.cache.namespace).toBe('test_monitoring');
        expect(testConfig.cache.batchSize).toBe(15);
        expect(testConfig.events.enableAutoAnalysis).toBe(false);
      } finally {
        process.env.MONITORING_NAMESPACE = originalVars.MONITORING_NAMESPACE;
        process.env.MONITORING_DEFAULT_BATCH_SIZE = originalVars.MONITORING_DEFAULT_BATCH_SIZE;
        process.env.MONITORING_AUTO_ANALYSIS = originalVars.MONITORING_AUTO_ANALYSIS;
        delete require.cache[require.resolve('@monitoring/config/monitoring.config')];
      }
    });
  });

  describe('validateMonitoringConfig', () => {
    it('should return default config when given empty partial config', () => {
      const result = validateMonitoringConfig({});
      expect(result).toEqual(DEFAULT_MONITORING_CONFIG);
    });

    it('should merge partial config with defaults', () => {
      const partialConfig: Partial<MonitoringConfig> = {
        cache: {
          ...DEFAULT_MONITORING_CONFIG.cache,
          batchSize: 25,
        },
      };

      const result = validateMonitoringConfig(partialConfig);
      expect(result.cache.batchSize).toBe(25);
      expect(result.events).toEqual(DEFAULT_MONITORING_CONFIG.events);
      expect(result.performance).toEqual(DEFAULT_MONITORING_CONFIG.performance);
    });

    describe('Cache Configuration Validation', () => {
      it('should throw error for negative compression threshold', () => {
        const invalidConfig: Partial<MonitoringConfig> = {
          cache: {
            ...DEFAULT_MONITORING_CONFIG.cache,
            compressionThreshold: -1,
          },
        };

        expect(() => validateMonitoringConfig(invalidConfig)).toThrow();
      });

      it('should throw error for batch size less than 1', () => {
        const invalidConfig: Partial<MonitoringConfig> = {
          cache: {
            ...DEFAULT_MONITORING_CONFIG.cache,
            batchSize: 0,
          },
        };

        expect(() => validateMonitoringConfig(invalidConfig)).toThrow();
      });

      it('should accept valid cache configuration', () => {
        const validConfig: Partial<MonitoringConfig> = {
          cache: {
            ...DEFAULT_MONITORING_CONFIG.cache,
            compressionThreshold: 2048,
            batchSize: 15,
          },
        };

        expect(() => validateMonitoringConfig(validConfig)).not.toThrow();
        const result = validateMonitoringConfig(validConfig);
        expect(result.cache.compressionThreshold).toBe(2048);
        expect(result.cache.batchSize).toBe(15);
      });
    });

    describe('Performance Configuration Validation', () => {
      it('should throw error for hit rate threshold below 0', () => {
        const invalidConfig: Partial<MonitoringConfig> = {
          performance: {
            ...DEFAULT_MONITORING_CONFIG.performance,
            hitRateThreshold: -0.1,
          },
        };

        expect(() => validateMonitoringConfig(invalidConfig)).toThrow();
      });

      it('should throw error for hit rate threshold above 1', () => {
        const invalidConfig: Partial<MonitoringConfig> = {
          performance: {
            ...DEFAULT_MONITORING_CONFIG.performance,
            hitRateThreshold: 1.1,
          },
        };

        expect(() => validateMonitoringConfig(invalidConfig)).toThrow();
      });

      it('should throw error for error rate threshold below 0', () => {
        const invalidConfig: Partial<MonitoringConfig> = {
          performance: {
            ...DEFAULT_MONITORING_CONFIG.performance,
            errorRateThreshold: -0.1,
          },
        };

        expect(() => validateMonitoringConfig(invalidConfig)).toThrow();
      });

      it('should throw error for error rate threshold above 1', () => {
        const invalidConfig: Partial<MonitoringConfig> = {
          performance: {
            ...DEFAULT_MONITORING_CONFIG.performance,
            errorRateThreshold: 1.1,
          },
        };

        expect(() => validateMonitoringConfig(invalidConfig)).toThrow();
      });

      it('should accept boundary values for thresholds', () => {
        const boundaryConfig: Partial<MonitoringConfig> = {
          performance: {
            ...DEFAULT_MONITORING_CONFIG.performance,
            hitRateThreshold: 0,
            errorRateThreshold: 1,
          },
        };

        expect(() => validateMonitoringConfig(boundaryConfig)).not.toThrow();
        const result = validateMonitoringConfig(boundaryConfig);
        expect(result.performance.hitRateThreshold).toBe(0);
        expect(result.performance.errorRateThreshold).toBe(1);
      });
    });
  });

  describe('getMonitoringConfigForEnvironment', () => {
    it('should return production config for production environment', () => {
      process.env.NODE_ENV = 'production';
      const config = getMonitoringConfigForEnvironment();

      expect(config.cache.batchSize).toBe(20);
      expect(config.performance.hitRateThreshold).toBe(0.9);
      expect(config.performance.errorRateThreshold).toBe(0.05);
    });

    it('should return test config for test environment', () => {
      process.env.NODE_ENV = 'test';
      const config = getMonitoringConfigForEnvironment();

      expect(config.cache.batchSize).toBe(3);
      expect(config.events.enableAutoAnalysis).toBe(false);
    });

    it('should return default config for development environment', () => {
      process.env.NODE_ENV = 'development';
      const config = getMonitoringConfigForEnvironment();

      expect(config).toEqual(validateMonitoringConfig({}));
    });

    it('should return default config for undefined NODE_ENV', () => {
      delete process.env.NODE_ENV;
      const config = getMonitoringConfigForEnvironment();

      expect(config).toEqual(validateMonitoringConfig({}));
    });

    it('should return default config for unknown environment', () => {
      process.env.NODE_ENV = 'staging';
      const config = getMonitoringConfigForEnvironment();

      expect(config).toEqual(validateMonitoringConfig({}));
    });
  });

  describe('Error Handling', () => {
    it('should provide specific error codes for validation failures', () => {
      const invalidConfig: Partial<MonitoringConfig> = {
        cache: {
          ...DEFAULT_MONITORING_CONFIG.cache,
          compressionThreshold: -1,
        },
      };

      try {
        validateMonitoringConfig(invalidConfig);
      } catch (error: any) {
        expect(error.context?.errorType).toBe(MONITORING_ERROR_CODES.NEGATIVE_COMPRESSION_THRESHOLD);
      }
    });

    it('should include context information in error messages', () => {
      const invalidConfig: Partial<MonitoringConfig> = {
        cache: {
          ...DEFAULT_MONITORING_CONFIG.cache,
          batchSize: 0,
        },
      };

      try {
        validateMonitoringConfig(invalidConfig);
      } catch (error: any) {
        expect(error.context).toBeDefined();
        expect(error.context.batchSize).toBe(0);
        expect(error.context.minBatchSize).toBe(1);
      }
    });
  });

  describe('Configuration Immutability', () => {
    it('should not modify original DEFAULT_MONITORING_CONFIG', () => {
      const originalDefault = { ...DEFAULT_MONITORING_CONFIG };

      validateMonitoringConfig({
        cache: {
          ...DEFAULT_MONITORING_CONFIG.cache,
          batchSize: 999,
        },
      });

      expect(DEFAULT_MONITORING_CONFIG).toEqual(originalDefault);
    });

    it('should create new config object', () => {
      const partialConfig = { cache: { ...DEFAULT_MONITORING_CONFIG.cache, batchSize: 50 } };
      const result = validateMonitoringConfig(partialConfig);

      expect(result).not.toBe(DEFAULT_MONITORING_CONFIG);
      expect(result).not.toBe(partialConfig);
    });
  });

  describe('Class-based Configuration System', () => {
    it('should create valid MonitoringCacheConfig instance', () => {
      const { MonitoringCacheConfig } = require('@monitoring/config/monitoring.config');
      const config = new MonitoringCacheConfig();

      expect(config.namespace).toBeDefined();
      expect(config.keyIndexPrefix).toBeDefined();
      expect(config.compressionThreshold).toBe(1024);
      expect(config.fallbackThreshold).toBe(10);
      expect(config.batchSize).toBe(10);
    });

    it('should create valid MonitoringEventsConfig instance', () => {
      const { MonitoringEventsConfig } = require('@monitoring/config/monitoring.config');
      const config = new MonitoringEventsConfig();

      expect(typeof config.enableAutoAnalysis).toBe('boolean');
      expect(config.enableAutoAnalysis).toBe(true);
      expect(config.retryAttempts).toBe(3);
    });

    it('should create valid MonitoringLatencyThresholdsConfig instance', () => {
      const { MonitoringLatencyThresholdsConfig } = require('@monitoring/config/monitoring.config');
      const config = new MonitoringLatencyThresholdsConfig();

      expect(config.p95Warning).toBe(200);
      expect(config.p99Critical).toBe(500);
    });

    it('should create valid MonitoringPerformanceConfig instance', () => {
      const { MonitoringPerformanceConfig } = require('@monitoring/config/monitoring.config');
      const config = new MonitoringPerformanceConfig();

      expect(config.latencyThresholds).toBeDefined();
      expect(config.hitRateThreshold).toBe(0.8);
      expect(config.errorRateThreshold).toBe(0.1);
    });

    it('should create valid MonitoringConfigValidated instance', () => {
      const { MonitoringConfigValidated } = require('@monitoring/config/monitoring.config');
      const config = new MonitoringConfigValidated();

      expect(config.cache).toBeDefined();
      expect(config.events).toBeDefined();
      expect(config.performance).toBeDefined();
      expect(config.cache.namespace).toBe('monitoring');
      expect(config.events.enableAutoAnalysis).toBe(true);
      expect(config.performance.hitRateThreshold).toBe(0.8);
    });
  });

  describe('Class-validator Integration', () => {
    it('should validate MonitoringCacheConfig with class-validator', () => {
      const { validateSync } = require('class-validator');
      const { MonitoringCacheConfig } = require('@monitoring/config/monitoring.config');

      const config = new MonitoringCacheConfig();
      const errors = validateSync(config);

      expect(errors).toHaveLength(0);
    });

    it('should validate MonitoringEventsConfig with class-validator', () => {
      const { validateSync } = require('class-validator');
      const { MonitoringEventsConfig } = require('@monitoring/config/monitoring.config');

      const config = new MonitoringEventsConfig();
      const errors = validateSync(config);

      expect(errors).toHaveLength(0);
    });

    it('should validate MonitoringLatencyThresholdsConfig with class-validator', () => {
      const { validateSync } = require('class-validator');
      const { MonitoringLatencyThresholdsConfig } = require('@monitoring/config/monitoring.config');

      const config = new MonitoringLatencyThresholdsConfig();
      const errors = validateSync(config);

      expect(errors).toHaveLength(0);
    });

    it('should detect validation errors in MonitoringCacheConfig', () => {
      const { validateSync } = require('class-validator');
      const { MonitoringCacheConfig } = require('@monitoring/config/monitoring.config');

      const config = new MonitoringCacheConfig();
      config.compressionThreshold = -1; // Invalid negative value
      config.batchSize = 0; // Invalid zero value

      const errors = validateSync(config);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect validation errors in MonitoringLatencyThresholdsConfig', () => {
      const { validateSync } = require('class-validator');
      const { MonitoringLatencyThresholdsConfig } = require('@monitoring/config/monitoring.config');

      const config = new MonitoringLatencyThresholdsConfig();
      config.p95Warning = 40; // Below min value of 50
      config.p99Critical = 6000; // Above max value of 5000

      const errors = validateSync(config);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should detect validation errors in MonitoringPerformanceConfig', () => {
      const { validateSync } = require('class-validator');
      const { MonitoringPerformanceConfig } = require('@monitoring/config/monitoring.config');

      const config = new MonitoringPerformanceConfig();
      config.hitRateThreshold = 1.5; // Above max value of 1.0
      config.errorRateThreshold = -0.1; // Below min value of 0.01

      const errors = validateSync(config);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('monitoringConfigValidated Factory', () => {
    it('should create configuration from environment variables', () => {
      const originalEnvs = {
        MONITORING_CACHE_NAMESPACE: process.env.MONITORING_CACHE_NAMESPACE,
        MONITORING_COMPRESSION_THRESHOLD: process.env.MONITORING_COMPRESSION_THRESHOLD,
        MONITORING_AUTO_ANALYSIS: process.env.MONITORING_AUTO_ANALYSIS,
        MONITORING_P95_WARNING: process.env.MONITORING_P95_WARNING,
        MONITORING_HIT_RATE_THRESHOLD: process.env.MONITORING_HIT_RATE_THRESHOLD,
      };

      try {
        process.env.MONITORING_CACHE_NAMESPACE = 'test_monitoring';
        process.env.MONITORING_COMPRESSION_THRESHOLD = '2048';
        process.env.MONITORING_AUTO_ANALYSIS = 'false';
        process.env.MONITORING_P95_WARNING = '150';
        process.env.MONITORING_HIT_RATE_THRESHOLD = '0.9';

        const { monitoringConfigValidated } = require('@monitoring/config/monitoring.config');
        const factory = monitoringConfigValidated();
        const config = factory();

        expect(config.cache.namespace).toBe('test_monitoring');
        expect(config.cache.compressionThreshold).toBe(2048);
        expect(config.events.enableAutoAnalysis).toBe(false);
        expect(config.performance.latencyThresholds.p95Warning).toBe(150);
        expect(config.performance.hitRateThreshold).toBe(0.9);
      } finally {
        // Restore original environment variables
        process.env.MONITORING_CACHE_NAMESPACE = originalEnvs.MONITORING_CACHE_NAMESPACE;
        process.env.MONITORING_COMPRESSION_THRESHOLD = originalEnvs.MONITORING_COMPRESSION_THRESHOLD;
        process.env.MONITORING_AUTO_ANALYSIS = originalEnvs.MONITORING_AUTO_ANALYSIS;
        process.env.MONITORING_P95_WARNING = originalEnvs.MONITORING_P95_WARNING;
        process.env.MONITORING_HIT_RATE_THRESHOLD = originalEnvs.MONITORING_HIT_RATE_THRESHOLD;
      }
    });

    it('should throw validation errors for invalid environment variables', () => {
      const originalEnvs = {
        MONITORING_COMPRESSION_THRESHOLD: process.env.MONITORING_COMPRESSION_THRESHOLD,
        MONITORING_P95_WARNING: process.env.MONITORING_P95_WARNING,
      };

      try {
        process.env.MONITORING_COMPRESSION_THRESHOLD = 'invalid_number';
        process.env.MONITORING_P95_WARNING = '25'; // Below minimum of 50

        const { monitoringConfigValidated } = require('@monitoring/config/monitoring.config');
        const factory = monitoringConfigValidated();

        expect(() => factory()).toThrow();
      } finally {
        // Restore original environment variables
        process.env.MONITORING_COMPRESSION_THRESHOLD = originalEnvs.MONITORING_COMPRESSION_THRESHOLD;
        process.env.MONITORING_P95_WARNING = originalEnvs.MONITORING_P95_WARNING;
      }
    });

    it('should handle undefined environment variables with defaults', () => {
      const originalEnvs = {
        MONITORING_CACHE_NAMESPACE: process.env.MONITORING_CACHE_NAMESPACE,
        MONITORING_COMPRESSION_THRESHOLD: process.env.MONITORING_COMPRESSION_THRESHOLD,
        MONITORING_AUTO_ANALYSIS: process.env.MONITORING_AUTO_ANALYSIS,
      };

      try {
        delete process.env.MONITORING_CACHE_NAMESPACE;
        delete process.env.MONITORING_COMPRESSION_THRESHOLD;
        delete process.env.MONITORING_AUTO_ANALYSIS;

        const { monitoringConfigValidated } = require('@monitoring/config/monitoring.config');
        const factory = monitoringConfigValidated();
        const config = factory();

        expect(config.cache.namespace).toBe('monitoring'); // Default value
        expect(config.cache.compressionThreshold).toBe(1024); // Default value
        expect(config.events.enableAutoAnalysis).toBe(true); // Default value
      } finally {
        // Restore original environment variables
        process.env.MONITORING_CACHE_NAMESPACE = originalEnvs.MONITORING_CACHE_NAMESPACE;
        process.env.MONITORING_COMPRESSION_THRESHOLD = originalEnvs.MONITORING_COMPRESSION_THRESHOLD;
        process.env.MONITORING_AUTO_ANALYSIS = originalEnvs.MONITORING_AUTO_ANALYSIS;
      }
    });
  });

  describe('Configuration Type Exports', () => {
    it('should export MonitoringConfigType correctly', () => {
      const { MonitoringConfigType } = require('@monitoring/config/monitoring.config');

      // MonitoringConfigType should be an alias for MonitoringConfigValidated
      expect(MonitoringConfigType).toBeDefined();
    });

    it('should provide interface compatibility', () => {
      const config = DEFAULT_MONITORING_CONFIG;

      // Test that the interface structure matches expected format
      expect(config).toHaveProperty('cache');
      expect(config).toHaveProperty('events');
      expect(config).toHaveProperty('performance');

      expect(config.cache).toHaveProperty('namespace');
      expect(config.cache).toHaveProperty('keyIndexPrefix');
      expect(config.cache).toHaveProperty('compressionThreshold');
      expect(config.cache).toHaveProperty('fallbackThreshold');
      expect(config.cache).toHaveProperty('batchSize');

      expect(config.events).toHaveProperty('enableAutoAnalysis');
      expect(config.events).toHaveProperty('retryAttempts');

      expect(config.performance).toHaveProperty('latencyThresholds');
      expect(config.performance).toHaveProperty('hitRateThreshold');
      expect(config.performance).toHaveProperty('errorRateThreshold');

      expect(config.performance.latencyThresholds).toHaveProperty('p95Warning');
      expect(config.performance.latencyThresholds).toHaveProperty('p99Critical');
    });
  });

  describe('Transform Decorators', () => {
    it('should transform string environment variables correctly', () => {
      const originalEnvs = {
        MONITORING_COMPRESSION_THRESHOLD: process.env.MONITORING_COMPRESSION_THRESHOLD,
        MONITORING_BATCH_SIZE: process.env.MONITORING_BATCH_SIZE,
        MONITORING_P95_WARNING: process.env.MONITORING_P95_WARNING,
        MONITORING_HIT_RATE_THRESHOLD: process.env.MONITORING_HIT_RATE_THRESHOLD,
      };

      try {
        process.env.MONITORING_COMPRESSION_THRESHOLD = '4096';
        process.env.MONITORING_BATCH_SIZE = '20';
        process.env.MONITORING_P95_WARNING = '300';
        process.env.MONITORING_HIT_RATE_THRESHOLD = '0.85';

        const { monitoringConfigValidated } = require('@monitoring/config/monitoring.config');
        const factory = monitoringConfigValidated();
        const config = factory();

        expect(typeof config.cache.compressionThreshold).toBe('number');
        expect(config.cache.compressionThreshold).toBe(4096);

        expect(typeof config.cache.batchSize).toBe('number');
        expect(config.cache.batchSize).toBe(20);

        expect(typeof config.performance.latencyThresholds.p95Warning).toBe('number');
        expect(config.performance.latencyThresholds.p95Warning).toBe(300);

        expect(typeof config.performance.hitRateThreshold).toBe('number');
        expect(config.performance.hitRateThreshold).toBe(0.85);
      } finally {
        // Restore original environment variables
        process.env.MONITORING_COMPRESSION_THRESHOLD = originalEnvs.MONITORING_COMPRESSION_THRESHOLD;
        process.env.MONITORING_BATCH_SIZE = originalEnvs.MONITORING_BATCH_SIZE;
        process.env.MONITORING_P95_WARNING = originalEnvs.MONITORING_P95_WARNING;
        process.env.MONITORING_HIT_RATE_THRESHOLD = originalEnvs.MONITORING_HIT_RATE_THRESHOLD;
      }
    });

    it('should handle boolean environment variables correctly', () => {
      const originalEnv = process.env.MONITORING_AUTO_ANALYSIS;

      const testCases = [
        { input: 'true', expected: true },
        { input: 'false', expected: false },
        { input: '1', expected: true },
        { input: '0', expected: false },
        { input: 'yes', expected: true },
        { input: 'no', expected: false },
        { input: 'FALSE', expected: false }, // Case insensitive
      ];

      for (const testCase of testCases) {
        try {
          process.env.MONITORING_AUTO_ANALYSIS = testCase.input;

          const { monitoringConfigValidated } = require('@monitoring/config/monitoring.config');
          const factory = monitoringConfigValidated();
          const config = factory();

          expect(config.events.enableAutoAnalysis).toBe(testCase.expected);
        } finally {
          process.env.MONITORING_AUTO_ANALYSIS = originalEnv;
        }
      }
    });
  });
});

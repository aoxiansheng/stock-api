import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
  CacheUnifiedConfigValidation,
  createCacheConfig,
  validateCacheConfig,
  CORE_ENV_VARIABLES,
} from '@core/05-caching/foundation/config/unified-config';
import {
  CACHE_CORE_VALUES,
  CACHE_CORE_TTL,
  CACHE_CORE_BATCH_SIZES,
  CACHE_CORE_INTERVALS,
} from '@core/05-caching/foundation/constants/core-values.constants';

describe('CacheUnifiedConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('CacheUnifiedConfigValidation Class', () => {
    it('should create with default values', () => {
      const config = new CacheUnifiedConfigValidation();

      expect(config.name).toBe('cache-foundation');
      expect(config.defaultTtlSeconds).toBe(CACHE_CORE_TTL.DEFAULT_TTL_SECONDS);
      expect(config.maxTtlSeconds).toBe(CACHE_CORE_TTL.MAX_TTL_SECONDS);
      expect(config.minTtlSeconds).toBe(CACHE_CORE_TTL.MIN_TTL_SECONDS);
      expect(config.compressionEnabled).toBe(true);
      expect(config.compressionThresholdBytes).toBe(CACHE_CORE_VALUES.DEFAULT_COMPRESSION_THRESHOLD);
      expect(config.metricsEnabled).toBe(true);
      expect(config.performanceMonitoringEnabled).toBe(true);
    });

    it('should have correct TTL strategy configuration', () => {
      const config = new CacheUnifiedConfigValidation();

      expect(config.ttl.realTimeTtlSeconds).toBe(CACHE_CORE_TTL.REAL_TIME_TTL_SECONDS);
      expect(config.ttl.nearRealTimeTtlSeconds).toBe(CACHE_CORE_TTL.NEAR_REAL_TIME_TTL_SECONDS);
      expect(config.ttl.batchQueryTtlSeconds).toBe(CACHE_CORE_TTL.BATCH_QUERY_TTL_SECONDS);
      expect(config.ttl.offHoursTtlSeconds).toBe(CACHE_CORE_TTL.OFF_HOURS_TTL_SECONDS);
      expect(config.ttl.weekendTtlSeconds).toBe(CACHE_CORE_TTL.WEEKEND_TTL_SECONDS);
    });

    it('should have correct performance configuration', () => {
      const config = new CacheUnifiedConfigValidation();

      expect(config.performance.maxMemoryMb).toBe(512);
      expect(config.performance.defaultBatchSize).toBe(CACHE_CORE_BATCH_SIZES.DEFAULT_BATCH_SIZE);
      expect(config.performance.maxConcurrentOperations).toBe(CACHE_CORE_VALUES.MAX_CONCURRENT_OPERATIONS);
      expect(config.performance.slowOperationThresholdMs).toBe(CACHE_CORE_VALUES.SLOW_OPERATION_THRESHOLD_MS);
      expect(config.performance.connectionTimeoutMs).toBe(CACHE_CORE_INTERVALS.CONNECTION_TIMEOUT_MS);
      expect(config.performance.operationTimeoutMs).toBe(CACHE_CORE_INTERVALS.OPERATION_TIMEOUT_MS);
    });

    it('should have correct intervals configuration', () => {
      const config = new CacheUnifiedConfigValidation();

      expect(config.intervals.cleanupIntervalMs).toBe(CACHE_CORE_INTERVALS.CLEANUP_INTERVAL_MS);
      expect(config.intervals.healthCheckIntervalMs).toBe(CACHE_CORE_INTERVALS.HEALTH_CHECK_INTERVAL_MS);
      expect(config.intervals.metricsCollectionIntervalMs).toBe(CACHE_CORE_INTERVALS.METRICS_COLLECTION_INTERVAL_MS);
      expect(config.intervals.statsLogIntervalMs).toBe(CACHE_CORE_INTERVALS.STATS_LOG_INTERVAL_MS);
      expect(config.intervals.heartbeatIntervalMs).toBe(CACHE_CORE_INTERVALS.HEARTBEAT_INTERVAL_MS);
    });

    it('should have correct limits configuration', () => {
      const config = new CacheUnifiedConfigValidation();

      expect(config.limits.maxKeyLength).toBe(CACHE_CORE_VALUES.MAX_KEY_LENGTH);
      expect(config.limits.maxValueSizeBytes).toBe(CACHE_CORE_VALUES.MAX_VALUE_SIZE_BYTES);
      expect(config.limits.maxCacheEntries).toBe(CACHE_CORE_VALUES.DEFAULT_MAX_CACHE_SIZE);
      expect(config.limits.memoryThresholdRatio).toBe(CACHE_CORE_VALUES.DEFAULT_MEMORY_THRESHOLD);
      expect(config.limits.errorRateAlertThreshold).toBe(CACHE_CORE_VALUES.ERROR_RATE_ALERT_THRESHOLD);
    });

    it('should have correct retry configuration', () => {
      const config = new CacheUnifiedConfigValidation();

      expect(config.retry.maxRetryAttempts).toBe(CACHE_CORE_VALUES.DEFAULT_RETRY_ATTEMPTS);
      expect(config.retry.baseRetryDelayMs).toBe(1000);
      expect(config.retry.retryDelayMultiplier).toBe(CACHE_CORE_VALUES.EXPONENTIAL_BACKOFF_BASE);
      expect(config.retry.maxRetryDelayMs).toBe(30000);
      expect(config.retry.exponentialBackoffEnabled).toBe(true);
    });
  });

  describe('createCacheConfig Function', () => {
    it('should create config with default values when no environment variables', () => {
      const config = createCacheConfig();

      expect(config.name).toBe('cache-foundation');
      expect(config.defaultTtlSeconds).toBe(CACHE_CORE_TTL.DEFAULT_TTL_SECONDS);
      expect(config.compressionEnabled).toBe(true);
      expect(config.metricsEnabled).toBe(true);
      expect(config.performanceMonitoringEnabled).toBe(true);
    });

    it('should create config with custom name from options', () => {
      const config = createCacheConfig({
        name: 'custom-cache-config',
      });

      expect(config.name).toBe('custom-cache-config');
    });

    it('should use environment variables when provided', () => {
      process.env.CACHE_DEFAULT_TTL_SECONDS = '600';
      process.env.CACHE_MAX_TTL_SECONDS = '7200';
      process.env.CACHE_MIN_TTL_SECONDS = '10';
      process.env.CACHE_COMPRESSION_ENABLED = 'false';
      process.env.CACHE_COMPRESSION_THRESHOLD_BYTES = '2048';
      process.env.CACHE_METRICS_ENABLED = 'false';
      process.env.CACHE_PERFORMANCE_MONITORING_ENABLED = 'false';

      const config = createCacheConfig();

      expect(config.defaultTtlSeconds).toBe(600);
      expect(config.maxTtlSeconds).toBe(7200);
      expect(config.minTtlSeconds).toBe(10);
      expect(config.compressionEnabled).toBe(false);
      expect(config.compressionThresholdBytes).toBe(2048);
      expect(config.metricsEnabled).toBe(false);
      expect(config.performanceMonitoringEnabled).toBe(false);
    });

    it('should use TTL environment variables', () => {
      process.env.CACHE_REAL_TIME_TTL_SECONDS = '3';
      process.env.CACHE_NEAR_REAL_TIME_TTL_SECONDS = '15';
      process.env.CACHE_BATCH_QUERY_TTL_SECONDS = '600';
      process.env.CACHE_OFF_HOURS_TTL_SECONDS = '1800';
      process.env.CACHE_WEEKEND_TTL_SECONDS = '3600';

      const config = createCacheConfig();

      expect(config.ttl.realTimeTtlSeconds).toBe(3);
      expect(config.ttl.nearRealTimeTtlSeconds).toBe(15);
      expect(config.ttl.batchQueryTtlSeconds).toBe(600);
      expect(config.ttl.offHoursTtlSeconds).toBe(1800);
      expect(config.ttl.weekendTtlSeconds).toBe(3600);
    });

    it('should use performance environment variables', () => {
      process.env.CACHE_MAX_MEMORY_MB = '1024';
      process.env.CACHE_DEFAULT_BATCH_SIZE = '200';
      process.env.CACHE_MAX_CONCURRENT_OPERATIONS = '20';
      process.env.CACHE_SLOW_OPERATION_THRESHOLD_MS = '2000';
      process.env.CACHE_CONNECTION_TIMEOUT_MS = '10000';
      process.env.CACHE_OPERATION_TIMEOUT_MS = '8000';

      const config = createCacheConfig();

      expect(config.performance.maxMemoryMb).toBe(1024);
      expect(config.performance.defaultBatchSize).toBe(200);
      expect(config.performance.maxConcurrentOperations).toBe(20);
      expect(config.performance.slowOperationThresholdMs).toBe(2000);
      expect(config.performance.connectionTimeoutMs).toBe(10000);
      expect(config.performance.operationTimeoutMs).toBe(8000);
    });

    it('should use intervals environment variables', () => {
      process.env.CACHE_CLEANUP_INTERVAL_MS = '60000';
      process.env.CACHE_HEALTH_CHECK_INTERVAL_MS = '15000';
      process.env.CACHE_METRICS_COLLECTION_INTERVAL_MS = '5000';
      process.env.CACHE_STATS_LOG_INTERVAL_MS = '30000';
      process.env.CACHE_HEARTBEAT_INTERVAL_MS = '2000';

      const config = createCacheConfig();

      expect(config.intervals.cleanupIntervalMs).toBe(60000);
      expect(config.intervals.healthCheckIntervalMs).toBe(15000);
      expect(config.intervals.metricsCollectionIntervalMs).toBe(5000);
      expect(config.intervals.statsLogIntervalMs).toBe(30000);
      expect(config.intervals.heartbeatIntervalMs).toBe(2000);
    });

    it('should use limits environment variables', () => {
      process.env.CACHE_MAX_KEY_LENGTH = '512';
      process.env.CACHE_MAX_VALUE_SIZE_MB = '20';
      process.env.CACHE_MAX_CACHE_ENTRIES = '20000';
      process.env.CACHE_MEMORY_THRESHOLD_RATIO = '0.9';
      process.env.CACHE_ERROR_RATE_ALERT_THRESHOLD = '0.05';

      const config = createCacheConfig();

      expect(config.limits.maxKeyLength).toBe(512);
      expect(config.limits.maxValueSizeBytes).toBe(20 * 1024 * 1024); // 20MB in bytes
      expect(config.limits.maxCacheEntries).toBe(20000);
      expect(config.limits.memoryThresholdRatio).toBe(0.9);
      expect(config.limits.errorRateAlertThreshold).toBe(0.05);
    });

    it('should use retry environment variables', () => {
      process.env.CACHE_MAX_RETRY_ATTEMPTS = '5';
      process.env.CACHE_BASE_RETRY_DELAY_MS = '2000';
      process.env.CACHE_RETRY_DELAY_MULTIPLIER = '3.0';
      process.env.CACHE_MAX_RETRY_DELAY_MS = '60000';
      process.env.CACHE_EXPONENTIAL_BACKOFF_ENABLED = 'false';

      const config = createCacheConfig();

      expect(config.retry.maxRetryAttempts).toBe(5);
      expect(config.retry.baseRetryDelayMs).toBe(2000);
      expect(config.retry.retryDelayMultiplier).toBe(3.0);
      expect(config.retry.maxRetryDelayMs).toBe(60000);
      expect(config.retry.exponentialBackoffEnabled).toBe(false);
    });

    it('should use custom environment prefix', () => {
      process.env.CUSTOM_DEFAULT_TTL_SECONDS = '900';
      process.env.CUSTOM_COMPRESSION_ENABLED = 'false';

      const config = createCacheConfig({
        name: 'custom-cache-test',
        envPrefix: 'CUSTOM_',
      });

      expect(config.defaultTtlSeconds).toBe(900);
      expect(config.compressionEnabled).toBe(false);
    });

    it('should apply default overrides', () => {
      const config = createCacheConfig({
        name: 'override-test',
        defaultOverrides: {
          defaultTtlSeconds: 1200,
          compressionEnabled: false,
        },
      });

      expect(config.defaultTtlSeconds).toBe(1200);
      expect(config.compressionEnabled).toBe(false);
    });

    it('should handle invalid numeric environment variables gracefully', () => {
      process.env.CACHE_DEFAULT_TTL_SECONDS = 'invalid';
      process.env.CACHE_MAX_MEMORY_MB = 'not-a-number';

      const config = createCacheConfig();

      // Should fallback to default values when parsing fails
      expect(config.defaultTtlSeconds).toBe(CACHE_CORE_TTL.DEFAULT_TTL_SECONDS);
      expect(config.performance.maxMemoryMb).toBe(512);
    });

    it('should skip validation in non-strict mode', () => {
      // Create invalid config but with strictMode disabled
      const config = createCacheConfig({
        name: 'non-strict-test',
        strictMode: false,
        defaultOverrides: {
          defaultTtlSeconds: -1, // Invalid value
        },
      });

      expect(config.defaultTtlSeconds).toBe(-1);
    });

    it('should throw error for invalid config in strict mode', () => {
      expect(() => {
        createCacheConfig({
          name: 'strict-test',
          strictMode: true,
          defaultOverrides: {
            defaultTtlSeconds: -1, // Invalid value (below minimum)
          },
        });
      }).toThrow('Cache configuration validation failed');
    });
  });

  describe('validateCacheConfig Function', () => {
    it('should validate a correct configuration', () => {
      const config = new CacheUnifiedConfigValidation();
      const result = validateCacheConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid TTL values', () => {
      const config = {
        defaultTtlSeconds: -1, // Invalid: below minimum
        maxTtlSeconds: 10000000, // Invalid: above maximum
        minTtlSeconds: -5, // Invalid: below minimum
      };

      const result = validateCacheConfig(config as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid compression threshold', () => {
      const config = {
        compressionThresholdBytes: 50, // Invalid: below minimum
      };

      const result = validateCacheConfig(config as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should generate warnings for illogical configurations', () => {
      const config = {
        ttl: {
          realTimeTtlSeconds: 300, // Greater than near-real-time
          nearRealTimeTtlSeconds: 60,
        },
        performance: {
          slowOperationThresholdMs: 60000, // Greater than health check interval
        },
        intervals: {
          healthCheckIntervalMs: 30000,
        },
      };

      const result = validateCacheConfig(config as any);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings).toContain('Real-time TTL is greater than near-real-time TTL');
      expect(result.warnings).toContain('Slow operation threshold is greater than health check interval');
    });

    it('should handle partial configurations', () => {
      const partialConfig = {
        defaultTtlSeconds: 300,
        compressionEnabled: true,
      };

      const result = validateCacheConfig(partialConfig);

      // Should not fail for missing optional properties
      expect(result.isValid).toBe(true);
    });

    it('should validate boolean properties', () => {
      const config = {
        compressionEnabled: 'not-a-boolean', // Invalid type
        metricsEnabled: 123, // Invalid type
      };

      const result = validateCacheConfig(config as any);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('CORE_ENV_VARIABLES Constant', () => {
    it('should contain all 18 core environment variables', () => {
      expect(CORE_ENV_VARIABLES).toHaveLength(18);
    });

    it('should contain TTL variables', () => {
      const ttlVars = [
        'CACHE_REAL_TIME_TTL_SECONDS',
        'CACHE_NEAR_REAL_TIME_TTL_SECONDS',
        'CACHE_BATCH_QUERY_TTL_SECONDS',
        'CACHE_OFF_HOURS_TTL_SECONDS',
        'CACHE_DEFAULT_TTL_SECONDS',
      ];

      ttlVars.forEach(varName => {
        expect(CORE_ENV_VARIABLES).toContain(varName as any);
      });
    });

    it('should contain performance variables', () => {
      const performanceVars = [
        'CACHE_MAX_MEMORY_MB',
        'CACHE_DEFAULT_BATCH_SIZE',
        'CACHE_MAX_CONCURRENT_OPERATIONS',
        'CACHE_SLOW_OPERATION_THRESHOLD_MS',
      ];

      performanceVars.forEach(varName => {
        expect(CORE_ENV_VARIABLES).toContain(varName as any);
      });
    });

    it('should contain interval variables', () => {
      const intervalVars = [
        'CACHE_CLEANUP_INTERVAL_MS',
        'CACHE_HEALTH_CHECK_INTERVAL_MS',
        'CACHE_METRICS_COLLECTION_INTERVAL_MS',
        'CACHE_CONNECTION_TIMEOUT_MS',
      ];

      intervalVars.forEach(varName => {
        expect(CORE_ENV_VARIABLES).toContain(varName as any);
      });
    });

    it('should contain feature toggle variables', () => {
      const featureVars = [
        'CACHE_COMPRESSION_ENABLED',
        'CACHE_METRICS_ENABLED',
        'CACHE_PERFORMANCE_MONITORING_ENABLED',
      ];

      featureVars.forEach(varName => {
        expect(CORE_ENV_VARIABLES).toContain(varName as any);
      });
    });

    it('should contain limit variables', () => {
      const limitVars = [
        'CACHE_MAX_KEY_LENGTH',
        'CACHE_MAX_VALUE_SIZE_MB',
      ];

      limitVars.forEach(varName => {
        expect(CORE_ENV_VARIABLES).toContain(varName as any);
      });
    });
  });

  describe('NestJS Integration', () => {
    let module: TestingModule;

    beforeEach(async () => {
      module = await Test.createTestingModule({
        imports: [],
        providers: [
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'cacheUnified') {
                  return createCacheConfig({
                    name: 'test-cache-config',
                  });
                }
                return undefined;
              }),
            },
          },
        ],
      }).compile();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should integrate with NestJS ConfigService', () => {
      const configService = module.get<ConfigService>(ConfigService);
      const cacheConfig = configService.get('cacheUnified');

      expect(cacheConfig).toBeDefined();
      expect(cacheConfig.name).toBe('test-cache-config');
      expect(cacheConfig.defaultTtlSeconds).toBe(CACHE_CORE_TTL.DEFAULT_TTL_SECONDS);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null environment variables', () => {
      process.env.CACHE_DEFAULT_TTL_SECONDS = '';
      process.env.CACHE_MAX_MEMORY_MB = null as any;

      const config = createCacheConfig();

      expect(config.defaultTtlSeconds).toBe(CACHE_CORE_TTL.DEFAULT_TTL_SECONDS);
      expect(config.performance.maxMemoryMb).toBe(512);
    });

    it('should handle zero values appropriately', () => {
      process.env.CACHE_DEFAULT_TTL_SECONDS = '0';
      process.env.CACHE_MAX_CONCURRENT_OPERATIONS = '0';

      const config = createCacheConfig({
        name: 'edge-case-test',
        strictMode: false
      });

      expect(config.defaultTtlSeconds).toBe(0);
      expect(config.performance.maxConcurrentOperations).toBe(0);
    });

    it('should handle floating point environment variables', () => {
      process.env.CACHE_MEMORY_THRESHOLD_RATIO = '0.85';
      process.env.CACHE_ERROR_RATE_ALERT_THRESHOLD = '0.001';

      const config = createCacheConfig();

      expect(config.limits.memoryThresholdRatio).toBe(0.85);
      expect(config.limits.errorRateAlertThreshold).toBe(0.001);
    });

    it('should handle large numeric values', () => {
      process.env.CACHE_MAX_VALUE_SIZE_MB = '100';
      process.env.CACHE_MAX_CACHE_ENTRIES = '1000000';

      const config = createCacheConfig();

      expect(config.limits.maxValueSizeBytes).toBe(100 * 1024 * 1024);
      expect(config.limits.maxCacheEntries).toBe(1000000);
    });
  });
});
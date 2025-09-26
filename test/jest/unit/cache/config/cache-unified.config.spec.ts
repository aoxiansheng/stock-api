import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import cacheUnifiedConfig, { CacheUnifiedConfigValidation } from '@cache/config/cache-unified.config';
import { UniversalExceptionFactory } from '@common/core/exceptions';

describe('CacheUnifiedConfig', () => {
  let module: TestingModule;

  beforeEach(async () => {
    // Clear environment variables to ensure clean test state
    delete process.env.CACHE_DEFAULT_TTL;
    delete process.env.CACHE_STRONG_TTL;
    delete process.env.CACHE_REALTIME_TTL;
    delete process.env.CACHE_MONITORING_TTL;
    delete process.env.CACHE_AUTH_TTL;
    delete process.env.CACHE_TRANSFORMER_TTL;
    delete process.env.CACHE_SUGGESTION_TTL;
    delete process.env.CACHE_LONG_TERM_TTL;
    delete process.env.CACHE_COMPRESSION_THRESHOLD;
    delete process.env.CACHE_COMPRESSION_ENABLED;
    delete process.env.CACHE_MAX_ITEMS;
    delete process.env.CACHE_MAX_KEY_LENGTH;
    delete process.env.CACHE_MAX_VALUE_SIZE_MB;
    delete process.env.CACHE_SLOW_OPERATION_MS;
    delete process.env.CACHE_RETRY_DELAY_MS;
    delete process.env.CACHE_LOCK_TTL;
    delete process.env.CACHE_MAX_BATCH_SIZE;
    delete process.env.CACHE_MAX_SIZE;
    delete process.env.CACHE_LRU_SORT_BATCH_SIZE;
    delete process.env.SMART_CACHE_MAX_BATCH;
    delete process.env.CACHE_MAX_SIZE_MB;

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [cacheUnifiedConfig],
          isGlobal: true,
        }),
      ],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Default Configuration', () => {
    it('should load with default values when no environment variables are set', () => {
      const config = cacheUnifiedConfig();

      expect(config).toBeInstanceOf(CacheUnifiedConfigValidation);
      expect(config.defaultTtl).toBe(300);
      expect(config.strongTimelinessTtl).toBe(5);
      expect(config.realtimeTtl).toBe(30);
      expect(config.monitoringTtl).toBe(300);
      expect(config.authTtl).toBe(300);
      expect(config.transformerTtl).toBe(300);
      expect(config.suggestionTtl).toBe(300);
      expect(config.longTermTtl).toBe(3600);
    });

    it('should have correct performance configuration defaults', () => {
      const config = cacheUnifiedConfig();

      expect(config.compressionThreshold).toBe(1024);
      expect(config.compressionEnabled).toBe(true);
      expect(config.maxItems).toBe(10000);
      expect(config.maxKeyLength).toBe(255);
      expect(config.maxValueSizeMB).toBe(10);
    });

    it('should have correct operation configuration defaults', () => {
      const config = cacheUnifiedConfig();

      expect(config.slowOperationMs).toBe(100);
      expect(config.retryDelayMs).toBe(100);
      expect(config.lockTtl).toBe(30);
    });

    it('should have correct limit configuration defaults', () => {
      const config = cacheUnifiedConfig();

      expect(config.maxBatchSize).toBe(100);
      expect(config.maxCacheSize).toBe(10000);
      expect(config.lruSortBatchSize).toBe(1000);
      expect(config.smartCacheMaxBatch).toBe(50);
      expect(config.maxCacheSizeMB).toBe(1024);
    });
  });

  describe('Environment Variable Override', () => {
    it('should override TTL values from environment variables', () => {
      process.env.CACHE_DEFAULT_TTL = '600';
      process.env.CACHE_STRONG_TTL = '10';
      process.env.CACHE_REALTIME_TTL = '60';
      process.env.CACHE_MONITORING_TTL = '450';
      process.env.CACHE_AUTH_TTL = '900';
      process.env.CACHE_TRANSFORMER_TTL = '1200';
      process.env.CACHE_SUGGESTION_TTL = '1500';
      process.env.CACHE_LONG_TERM_TTL = '7200';

      const config = cacheUnifiedConfig();

      expect(config.defaultTtl).toBe(600);
      expect(config.strongTimelinessTtl).toBe(10);
      expect(config.realtimeTtl).toBe(60);
      expect(config.monitoringTtl).toBe(450);
      expect(config.authTtl).toBe(900);
      expect(config.transformerTtl).toBe(1200);
      expect(config.suggestionTtl).toBe(1500);
      expect(config.longTermTtl).toBe(7200);
    });

    it('should override performance configuration from environment variables', () => {
      process.env.CACHE_COMPRESSION_THRESHOLD = '2048';
      process.env.CACHE_COMPRESSION_ENABLED = 'false';
      process.env.CACHE_MAX_ITEMS = '20000';
      process.env.CACHE_MAX_KEY_LENGTH = '512';
      process.env.CACHE_MAX_VALUE_SIZE_MB = '20';

      const config = cacheUnifiedConfig();

      expect(config.compressionThreshold).toBe(2048);
      expect(config.compressionEnabled).toBe(false);
      expect(config.maxItems).toBe(20000);
      expect(config.maxKeyLength).toBe(512);
      expect(config.maxValueSizeMB).toBe(20);
    });

    it('should override operation configuration from environment variables', () => {
      process.env.CACHE_SLOW_OPERATION_MS = '200';
      process.env.CACHE_RETRY_DELAY_MS = '150';
      process.env.CACHE_LOCK_TTL = '60';

      const config = cacheUnifiedConfig();

      expect(config.slowOperationMs).toBe(200);
      expect(config.retryDelayMs).toBe(150);
      expect(config.lockTtl).toBe(60);
    });

    it('should override limit configuration from environment variables', () => {
      process.env.CACHE_MAX_BATCH_SIZE = '200';
      process.env.CACHE_MAX_SIZE = '20000';
      process.env.CACHE_LRU_SORT_BATCH_SIZE = '2000';
      process.env.SMART_CACHE_MAX_BATCH = '100';
      process.env.CACHE_MAX_SIZE_MB = '2048';

      const config = cacheUnifiedConfig();

      expect(config.maxBatchSize).toBe(200);
      expect(config.maxCacheSize).toBe(20000);
      expect(config.lruSortBatchSize).toBe(2000);
      expect(config.smartCacheMaxBatch).toBe(100);
      expect(config.maxCacheSizeMB).toBe(2048);
    });

    it('should handle compression enabled flag correctly', () => {
      process.env.CACHE_COMPRESSION_ENABLED = 'true';
      let config = cacheUnifiedConfig();
      expect(config.compressionEnabled).toBe(true);

      process.env.CACHE_COMPRESSION_ENABLED = 'false';
      config = cacheUnifiedConfig();
      expect(config.compressionEnabled).toBe(false);

      process.env.CACHE_COMPRESSION_ENABLED = 'any-other-value';
      config = cacheUnifiedConfig();
      expect(config.compressionEnabled).toBe(true);
    });

    it('should fallback to defaults for invalid environment variable values', () => {
      process.env.CACHE_DEFAULT_TTL = 'invalid-number';
      process.env.CACHE_MAX_BATCH_SIZE = 'not-a-number';
      process.env.CACHE_COMPRESSION_THRESHOLD = '';

      const config = cacheUnifiedConfig();

      expect(config.defaultTtl).toBe(300); // fallback to default
      expect(config.maxBatchSize).toBe(100); // fallback to default
      expect(config.compressionThreshold).toBe(1024); // fallback to default
    });
  });

  describe('Configuration Validation', () => {
    it('should throw error when defaultTtl is too small', () => {
      process.env.CACHE_DEFAULT_TTL = '0';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should throw error when defaultTtl is too large', () => {
      process.env.CACHE_DEFAULT_TTL = '100000';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should throw error when strongTimelinessTtl exceeds maximum', () => {
      process.env.CACHE_STRONG_TTL = '100';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should throw error when realtimeTtl exceeds maximum', () => {
      process.env.CACHE_REALTIME_TTL = '500';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should throw error when monitoringTtl is too small', () => {
      process.env.CACHE_MONITORING_TTL = '30';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should throw error when authTtl is too small', () => {
      process.env.CACHE_AUTH_TTL = '30';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should throw error when longTermTtl is too small', () => {
      process.env.CACHE_LONG_TERM_TTL = '100';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should throw error when maxBatchSize exceeds maximum', () => {
      process.env.CACHE_MAX_BATCH_SIZE = '2000';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should throw error when maxCacheSize is too small', () => {
      process.env.CACHE_MAX_SIZE = '500';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should throw error when maxCacheSize exceeds maximum', () => {
      process.env.CACHE_MAX_SIZE = '200000';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should throw error when lruSortBatchSize is too small', () => {
      process.env.CACHE_LRU_SORT_BATCH_SIZE = '50';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should throw error when smartCacheMaxBatch is too small', () => {
      process.env.SMART_CACHE_MAX_BATCH = '5';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should throw error when maxCacheSizeMB is too small', () => {
      process.env.CACHE_MAX_SIZE_MB = '32';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should throw error when maxCacheSizeMB exceeds maximum', () => {
      process.env.CACHE_MAX_SIZE_MB = '10000';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should provide detailed error information on validation failure', () => {
      process.env.CACHE_DEFAULT_TTL = '0';
      process.env.CACHE_STRONG_TTL = '100';
      process.env.CACHE_MAX_BATCH_SIZE = '2000';

      expect(() => cacheUnifiedConfig()).toThrow();

      try {
        cacheUnifiedConfig();
      } catch (error) {
        expect(error.message).toContain('Cache unified configuration validation failed');
        expect(error.context).toBeDefined();
        expect(error.context.validationErrors).toBeInstanceOf(Array);
        expect(error.context.configType).toBe('CacheUnifiedConfig');
      }
    });
  });

  describe('Configuration Boundaries', () => {
    it('should accept valid minimum values', () => {
      process.env.CACHE_DEFAULT_TTL = '1';
      process.env.CACHE_STRONG_TTL = '1';
      process.env.CACHE_REALTIME_TTL = '1';
      process.env.CACHE_MONITORING_TTL = '60';
      process.env.CACHE_AUTH_TTL = '60';
      process.env.CACHE_LONG_TERM_TTL = '300';
      process.env.CACHE_MAX_BATCH_SIZE = '1';
      process.env.CACHE_MAX_SIZE = '1000';
      process.env.CACHE_LRU_SORT_BATCH_SIZE = '100';
      process.env.SMART_CACHE_MAX_BATCH = '10';
      process.env.CACHE_MAX_SIZE_MB = '64';

      expect(() => cacheUnifiedConfig()).not.toThrow();
    });

    it('should accept valid maximum values', () => {
      process.env.CACHE_DEFAULT_TTL = '86400';
      process.env.CACHE_STRONG_TTL = '60';
      process.env.CACHE_REALTIME_TTL = '300';
      process.env.CACHE_MONITORING_TTL = '3600';
      process.env.CACHE_AUTH_TTL = '3600';
      process.env.CACHE_LONG_TERM_TTL = '86400';
      process.env.CACHE_MAX_BATCH_SIZE = '1000';
      process.env.CACHE_MAX_SIZE = '100000';
      process.env.CACHE_LRU_SORT_BATCH_SIZE = '10000';
      process.env.SMART_CACHE_MAX_BATCH = '1000';
      process.env.CACHE_MAX_SIZE_MB = '8192';

      expect(() => cacheUnifiedConfig()).not.toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should return CacheUnifiedConfigValidation instance', () => {
      const config = cacheUnifiedConfig();

      expect(config).toBeInstanceOf(CacheUnifiedConfigValidation);
    });

    it('should have all required properties', () => {
      const config = cacheUnifiedConfig();

      // TTL properties
      expect(typeof config.defaultTtl).toBe('number');
      expect(typeof config.strongTimelinessTtl).toBe('number');
      expect(typeof config.realtimeTtl).toBe('number');
      expect(typeof config.monitoringTtl).toBe('number');
      expect(typeof config.authTtl).toBe('number');
      expect(typeof config.transformerTtl).toBe('number');
      expect(typeof config.suggestionTtl).toBe('number');
      expect(typeof config.longTermTtl).toBe('number');

      // Performance properties
      expect(typeof config.compressionThreshold).toBe('number');
      expect(typeof config.compressionEnabled).toBe('boolean');
      expect(typeof config.maxItems).toBe('number');
      expect(typeof config.maxKeyLength).toBe('number');
      expect(typeof config.maxValueSizeMB).toBe('number');

      // Operation properties
      expect(typeof config.slowOperationMs).toBe('number');
      expect(typeof config.retryDelayMs).toBe('number');
      expect(typeof config.lockTtl).toBe('number');

      // Limit properties
      expect(typeof config.maxBatchSize).toBe('number');
      expect(typeof config.maxCacheSize).toBe('number');
      expect(typeof config.lruSortBatchSize).toBe('number');
      expect(typeof config.smartCacheMaxBatch).toBe('number');
      expect(typeof config.maxCacheSizeMB).toBe('number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero compressionThreshold', () => {
      process.env.CACHE_COMPRESSION_THRESHOLD = '0';

      const config = cacheUnifiedConfig();
      expect(config.compressionThreshold).toBe(0);
    });

    it('should handle negative environment values gracefully', () => {
      process.env.CACHE_DEFAULT_TTL = '-100';

      expect(() => cacheUnifiedConfig()).toThrow();
    });

    it('should handle floating point environment values', () => {
      process.env.CACHE_DEFAULT_TTL = '300.5';

      const config = cacheUnifiedConfig();
      expect(config.defaultTtl).toBe(300); // parseInt truncates decimals
    });

    it('should handle mixed case environment values for boolean', () => {
      process.env.CACHE_COMPRESSION_ENABLED = 'FALSE';
      let config = cacheUnifiedConfig();
      expect(config.compressionEnabled).toBe(true); // Only "false" string disables

      process.env.CACHE_COMPRESSION_ENABLED = 'False';
      config = cacheUnifiedConfig();
      expect(config.compressionEnabled).toBe(true);

      process.env.CACHE_COMPRESSION_ENABLED = 'false';
      config = cacheUnifiedConfig();
      expect(config.compressionEnabled).toBe(false);
    });
  });

  describe('Integration with Validation Library', () => {
    it('should use class-validator decorators correctly', () => {
      const config = cacheUnifiedConfig();

      // Test that @Min decorators are working
      expect(config.defaultTtl).toBeGreaterThanOrEqual(1);
      expect(config.strongTimelinessTtl).toBeGreaterThanOrEqual(1);
      expect(config.monitoringTtl).toBeGreaterThanOrEqual(60);

      // Test that @Max decorators are working
      expect(config.strongTimelinessTtl).toBeLessThanOrEqual(60);
      expect(config.realtimeTtl).toBeLessThanOrEqual(300);
    });

    it('should validate all numeric constraints', () => {
      const validationErrors = [
        () => {
          process.env.CACHE_DEFAULT_TTL = '0';
          cacheUnifiedConfig();
        },
        () => {
          process.env.CACHE_STRONG_TTL = '70';
          cacheUnifiedConfig();
        },
        () => {
          process.env.CACHE_MAX_BATCH_SIZE = '1500';
          cacheUnifiedConfig();
        },
      ];

      validationErrors.forEach(testFn => {
        expect(testFn).toThrow();
      });
    });
  });
});
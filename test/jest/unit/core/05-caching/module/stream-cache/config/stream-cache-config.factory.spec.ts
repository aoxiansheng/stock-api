import { StreamCacheConfigFactory } from '@core/05-caching/module/stream-cache/config/stream-cache-config.factory';
import { STREAM_CACHE_ENV_VARS } from '@core/05-caching/module/stream-cache/constants/stream-cache.env-vars.constants';
import { DEFAULT_STREAM_CACHE_CONFIG } from '@core/05-caching/module/stream-cache/constants/stream-cache.constants';

describe('StreamCacheConfigFactory', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('createConfig', () => {
    it('should create config with default values when no environment variables are set', () => {
      const config = StreamCacheConfigFactory.createConfig();

      expect(config.hotCacheTTL).toBe(DEFAULT_STREAM_CACHE_CONFIG.hotCacheTTL);
      expect(config.warmCacheTTL).toBe(DEFAULT_STREAM_CACHE_CONFIG.warmCacheTTL);
      expect(config.maxHotCacheSize).toBe(DEFAULT_STREAM_CACHE_CONFIG.maxHotCacheSize);
      expect(config.streamBatchSize).toBe(DEFAULT_STREAM_CACHE_CONFIG.streamBatchSize);
      expect(config.connectionTimeout).toBe(DEFAULT_STREAM_CACHE_CONFIG.connectionTimeout);
      expect(config.heartbeatInterval).toBe(DEFAULT_STREAM_CACHE_CONFIG.heartbeatInterval);
      expect(config.compressionThreshold).toBe(DEFAULT_STREAM_CACHE_CONFIG.compressionThreshold);
      expect(config.compressionEnabled).toBe(DEFAULT_STREAM_CACHE_CONFIG.compressionEnabled);
      expect(config.cleanupInterval).toBe(DEFAULT_STREAM_CACHE_CONFIG.cleanupInterval);
    });

    it('should use environment variables when provided', () => {
      process.env.STREAM_CACHE_HOT_CACHE_TTL_SECONDS = '10';
      process.env.STREAM_CACHE_WARM_CACHE_TTL_SECONDS = '600';
      process.env.STREAM_CACHE_MAX_HOT_CACHE_SIZE = '2000';
      process.env.STREAM_CACHE_STREAM_BATCH_SIZE = '200';
      process.env.STREAM_CACHE_CONNECTION_TIMEOUT_MS = '8000';
      process.env.STREAM_CACHE_HEARTBEAT_INTERVAL_MS = '15000';

      const config = StreamCacheConfigFactory.createConfig();

      expect(config.hotCacheTTL).toBe(10);
      expect(config.warmCacheTTL).toBe(600);
      expect(config.maxHotCacheSize).toBe(2000);
      expect(config.streamBatchSize).toBe(200);
      expect(config.connectionTimeout).toBe(8000);
      expect(config.heartbeatInterval).toBe(15000);
    });

    it('should handle compression configuration from environment', () => {
      process.env.STREAM_CACHE_COMPRESSION_THRESHOLD_BYTES = '2048';
      process.env.STREAM_CACHE_COMPRESSION_ENABLED = 'false';

      const config = StreamCacheConfigFactory.createConfig();

      expect(config.compressionThreshold).toBe(2048);
      expect(config.compressionEnabled).toBe(false);
    });

    it('should handle cleanup configuration from environment', () => {
      process.env.STREAM_CACHE_CLEANUP_INTERVAL_MS = '120000';
      process.env.STREAM_CACHE_MAX_CLEANUP_ITEMS = '500';
      process.env.STREAM_CACHE_MEMORY_CLEANUP_THRESHOLD = '0.8';

      const config = StreamCacheConfigFactory.createConfig();

      expect(config.cleanupInterval).toBe(120000);
      expect(config.maxCleanupItems).toBe(500);
      expect(config.memoryCleanupThreshold).toBe(0.8);
    });

    it('should handle performance monitoring configuration from environment', () => {
      process.env.STREAM_CACHE_SLOW_OPERATION_THRESHOLD_MS = '2000';
      process.env.STREAM_CACHE_STATS_LOG_INTERVAL_MS = '300000';
      process.env.STREAM_CACHE_PERFORMANCE_MONITORING_ENABLED = 'true';
      process.env.STREAM_CACHE_VERBOSE_LOGGING_ENABLED = 'false';

      const config = StreamCacheConfigFactory.createConfig();

      expect(config.slowOperationThreshold).toBe(2000);
      expect(config.statsLogInterval).toBe(300000);
      expect(config.performanceMonitoring).toBe(true);
      expect(config.verboseLogging).toBe(false);
    });

    it('should handle error handling configuration from environment', () => {
      process.env.STREAM_CACHE_MAX_RETRY_ATTEMPTS = '5';
      process.env.STREAM_CACHE_RETRY_BASE_DELAY_MS = '200';
      process.env.STREAM_CACHE_RETRY_DELAY_MULTIPLIER = '2.5';
      process.env.STREAM_CACHE_ENABLE_FALLBACK = 'true';

      const config = StreamCacheConfigFactory.createConfig();

      expect(config.maxRetryAttempts).toBe(5);
      expect(config.retryBaseDelay).toBe(200);
      expect(config.retryDelayMultiplier).toBe(2.5);
      expect(config.enableFallback).toBe(true);
    });

    it('should handle basic configuration from environment', () => {
      process.env.STREAM_CACHE_DEFAULT_TTL_SECONDS = '900';
      process.env.STREAM_CACHE_MIN_TTL_SECONDS = '5';
      process.env.STREAM_CACHE_MAX_TTL_SECONDS = '7200';

      const config = StreamCacheConfigFactory.createConfig();

      expect(config.defaultTTL).toBe(900);
      expect(config.minTTL).toBe(5);
      expect(config.maxTTL).toBe(7200);
    });
  });

  describe('parseIntEnv', () => {
    it('should parse valid integer environment variables', () => {
      process.env.TEST_INT = '42';

      const result = (StreamCacheConfigFactory as any).parseIntEnv('TEST_INT', 10);
      expect(result).toBe(42);
    });

    it('should return default value for missing environment variable', () => {
      const result = (StreamCacheConfigFactory as any).parseIntEnv('MISSING_VAR', 100);
      expect(result).toBe(100);
    });

    it('should return default value for invalid integer', () => {
      process.env.TEST_INVALID = 'not-a-number';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = (StreamCacheConfigFactory as any).parseIntEnv('TEST_INVALID', 50);

      expect(result).toBe(50);
      consoleSpy.mockRestore();
    });

    it('should enforce minimum value constraints', () => {
      process.env.TEST_MIN = '5';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = (StreamCacheConfigFactory as any).parseIntEnv('TEST_MIN', 10, 15);

      expect(result).toBe(15); // Should use minimum value
      consoleSpy.mockRestore();
    });

    it('should enforce maximum value constraints', () => {
      process.env.TEST_MAX = '1000';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = (StreamCacheConfigFactory as any).parseIntEnv('TEST_MAX', 10, 1, 500);

      expect(result).toBe(500); // Should use maximum value
      consoleSpy.mockRestore();
    });
  });

  describe('parseFloatEnv', () => {
    it('should parse valid float environment variables', () => {
      process.env.TEST_FLOAT = '3.14';

      const result = (StreamCacheConfigFactory as any).parseFloatEnv('TEST_FLOAT', 1.0);
      expect(result).toBe(3.14);
    });

    it('should return default value for missing environment variable', () => {
      const result = (StreamCacheConfigFactory as any).parseFloatEnv('MISSING_FLOAT', 2.5);
      expect(result).toBe(2.5);
    });

    it('should return default value for invalid float', () => {
      process.env.TEST_INVALID_FLOAT = 'not-a-float';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = (StreamCacheConfigFactory as any).parseFloatEnv('TEST_INVALID_FLOAT', 1.5);

      expect(result).toBe(1.5);
      consoleSpy.mockRestore();
    });

    it('should enforce minimum value constraints for floats', () => {
      process.env.TEST_FLOAT_MIN = '0.1';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = (StreamCacheConfigFactory as any).parseFloatEnv('TEST_FLOAT_MIN', 0.5, 0.2);

      expect(result).toBe(0.2); // Should use minimum value
      consoleSpy.mockRestore();
    });

    it('should enforce maximum value constraints for floats', () => {
      process.env.TEST_FLOAT_MAX = '10.0';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result = (StreamCacheConfigFactory as any).parseFloatEnv('TEST_FLOAT_MAX', 5.0, 1.0, 8.0);

      expect(result).toBe(8.0); // Should use maximum value
      consoleSpy.mockRestore();
    });
  });

  describe('parseBoolEnv', () => {
    it('should parse "true" as true', () => {
      process.env.TEST_BOOL = 'true';

      const result = (StreamCacheConfigFactory as any).parseBoolEnv('TEST_BOOL', false);
      expect(result).toBe(true);
    });

    it('should parse "1" as true', () => {
      process.env.TEST_BOOL = '1';

      const result = (StreamCacheConfigFactory as any).parseBoolEnv('TEST_BOOL', false);
      expect(result).toBe(true);
    });

    it('should parse "yes" as true', () => {
      process.env.TEST_BOOL = 'yes';

      const result = (StreamCacheConfigFactory as any).parseBoolEnv('TEST_BOOL', false);
      expect(result).toBe(true);
    });

    it('should parse "TRUE" as true (case insensitive)', () => {
      process.env.TEST_BOOL = 'TRUE';

      const result = (StreamCacheConfigFactory as any).parseBoolEnv('TEST_BOOL', false);
      expect(result).toBe(true);
    });

    it('should parse "false" as false', () => {
      process.env.TEST_BOOL = 'false';

      const result = (StreamCacheConfigFactory as any).parseBoolEnv('TEST_BOOL', true);
      expect(result).toBe(false);
    });

    it('should parse "0" as false', () => {
      process.env.TEST_BOOL = '0';

      const result = (StreamCacheConfigFactory as any).parseBoolEnv('TEST_BOOL', true);
      expect(result).toBe(false);
    });

    it('should return default value for missing environment variable', () => {
      const result = (StreamCacheConfigFactory as any).parseBoolEnv('MISSING_BOOL', true);
      expect(result).toBe(true);
    });

    it('should parse arbitrary string as false', () => {
      process.env.TEST_BOOL = 'maybe';

      const result = (StreamCacheConfigFactory as any).parseBoolEnv('TEST_BOOL', true);
      expect(result).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should pass validation for valid configuration', () => {
      const validConfig = {
        hotCacheTTL: 5,
        warmCacheTTL: 300,
        minTTL: 1,
        maxTTL: 3600,
        maxHotCacheSize: 1000,
        streamBatchSize: 100,
        connectionTimeout: 5000,
        heartbeatInterval: 10000,
        memoryCleanupThreshold: 0.8,
        maxRetryAttempts: 3,
        retryBaseDelay: 100,
        retryDelayMultiplier: 2.0,
      };

      const errors = (StreamCacheConfigFactory as any).validateConfig(validConfig);
      expect(errors).toEqual([]);
    });

    it('should detect negative hotCacheTTL', () => {
      const invalidConfig = {
        ...DEFAULT_STREAM_CACHE_CONFIG,
        hotCacheTTL: -1
      };

      const errors = (StreamCacheConfigFactory as any).validateConfig(invalidConfig);
      expect(errors).toContain('hotCacheTTL must be positive');
    });

    it('should detect negative warmCacheTTL', () => {
      const invalidConfig = {
        ...DEFAULT_STREAM_CACHE_CONFIG,
        warmCacheTTL: -1
      };

      const errors = (StreamCacheConfigFactory as any).validateConfig(invalidConfig);
      expect(errors).toContain('warmCacheTTL must be positive');
    });

    it('should detect invalid TTL range (minTTL >= maxTTL)', () => {
      const invalidConfig = {
        ...DEFAULT_STREAM_CACHE_CONFIG,
        minTTL: 300,
        maxTTL: 300
      };

      const errors = (StreamCacheConfigFactory as any).validateConfig(invalidConfig);
      expect(errors).toContain('minTTL must be less than maxTTL');
    });

    it('should detect negative maxHotCacheSize', () => {
      const invalidConfig = {
        ...DEFAULT_STREAM_CACHE_CONFIG,
        maxHotCacheSize: -1
      };

      const errors = (StreamCacheConfigFactory as any).validateConfig(invalidConfig);
      expect(errors).toContain('maxHotCacheSize must be positive');
    });

    it('should detect negative streamBatchSize', () => {
      const invalidConfig = {
        ...DEFAULT_STREAM_CACHE_CONFIG,
        streamBatchSize: 0
      };

      const errors = (StreamCacheConfigFactory as any).validateConfig(invalidConfig);
      expect(errors).toContain('streamBatchSize must be positive');
    });

    it('should detect negative connectionTimeout', () => {
      const invalidConfig = {
        ...DEFAULT_STREAM_CACHE_CONFIG,
        connectionTimeout: -1000
      };

      const errors = (StreamCacheConfigFactory as any).validateConfig(invalidConfig);
      expect(errors).toContain('connectionTimeout must be positive');
    });

    it('should detect negative heartbeatInterval', () => {
      const invalidConfig = {
        ...DEFAULT_STREAM_CACHE_CONFIG,
        heartbeatInterval: 0
      };

      const errors = (StreamCacheConfigFactory as any).validateConfig(invalidConfig);
      expect(errors).toContain('heartbeatInterval must be positive');
    });

    it('should detect invalid memoryCleanupThreshold (below 0)', () => {
      const invalidConfig = {
        ...DEFAULT_STREAM_CACHE_CONFIG,
        memoryCleanupThreshold: -0.1
      };

      const errors = (StreamCacheConfigFactory as any).validateConfig(invalidConfig);
      expect(errors).toContain('memoryCleanupThreshold must be between 0 and 1');
    });

    it('should detect invalid memoryCleanupThreshold (above 1)', () => {
      const invalidConfig = {
        ...DEFAULT_STREAM_CACHE_CONFIG,
        memoryCleanupThreshold: 1.5
      };

      const errors = (StreamCacheConfigFactory as any).validateConfig(invalidConfig);
      expect(errors).toContain('memoryCleanupThreshold must be between 0 and 1');
    });

    it('should detect negative maxRetryAttempts', () => {
      const invalidConfig = {
        ...DEFAULT_STREAM_CACHE_CONFIG,
        maxRetryAttempts: -1
      };

      const errors = (StreamCacheConfigFactory as any).validateConfig(invalidConfig);
      expect(errors).toContain('maxRetryAttempts must be non-negative');
    });

    it('should detect negative retryBaseDelay', () => {
      const invalidConfig = {
        ...DEFAULT_STREAM_CACHE_CONFIG,
        retryBaseDelay: 0
      };

      const errors = (StreamCacheConfigFactory as any).validateConfig(invalidConfig);
      expect(errors).toContain('retryBaseDelay must be positive');
    });

    it('should detect negative retryDelayMultiplier', () => {
      const invalidConfig = {
        ...DEFAULT_STREAM_CACHE_CONFIG,
        retryDelayMultiplier: -1.0
      };

      const errors = (StreamCacheConfigFactory as any).validateConfig(invalidConfig);
      expect(errors).toContain('retryDelayMultiplier must be positive');
    });

    it('should collect multiple validation errors', () => {
      const invalidConfig = {
        hotCacheTTL: -1,
        warmCacheTTL: -1,
        maxHotCacheSize: 0,
        streamBatchSize: -10,
        connectionTimeout: -5000,
        heartbeatInterval: 0,
        memoryCleanupThreshold: 2.0,
        maxRetryAttempts: -5,
        retryBaseDelay: -100,
        retryDelayMultiplier: -2.0,
        minTTL: 100,
        maxTTL: 50, // minTTL > maxTTL
      };

      const errors = (StreamCacheConfigFactory as any).validateConfig(invalidConfig);
      expect(errors.length).toBeGreaterThan(5);
      expect(errors).toContain('hotCacheTTL must be positive');
      expect(errors).toContain('warmCacheTTL must be positive');
      expect(errors).toContain('minTTL must be less than maxTTL');
    });

    it('should throw error when validation fails', () => {
      process.env.STREAM_CACHE_HOT_CACHE_TTL_SECONDS = '-1';
      process.env.STREAM_CACHE_WARM_CACHE_TTL_SECONDS = '-1';

      expect(() => {
        StreamCacheConfigFactory.createConfig();
      }).toThrow('Stream Cache configuration validation failed');
    });
  });

  describe('Boolean Environment Variable Parsing', () => {
    it('should handle various truthy values', () => {
      const truthyValues = ['true', 'TRUE', 'True', '1', 'yes', 'YES', 'Yes'];

      truthyValues.forEach((value, index) => {
        process.env[`TEST_BOOL_${index}`] = value;
        const result = (StreamCacheConfigFactory as any).parseBoolEnv(`TEST_BOOL_${index}`, false);
        expect(result).toBe(true);
      });
    });

    it('should handle various falsy values', () => {
      const falsyValues = ['false', 'FALSE', 'False', '0', 'no', 'NO', 'off', 'OFF', ''];

      falsyValues.forEach((value, index) => {
        process.env[`TEST_BOOL_${index}`] = value;
        const result = (StreamCacheConfigFactory as any).parseBoolEnv(`TEST_BOOL_${index}`, true);
        expect(result).toBe(false);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle extremely large integer values', () => {
      process.env.TEST_LARGE = '999999999999';

      const result = (StreamCacheConfigFactory as any).parseIntEnv('TEST_LARGE', 100);
      expect(result).toBe(999999999999);
    });

    it('should handle very small float values', () => {
      process.env.TEST_SMALL_FLOAT = '0.001';

      const result = (StreamCacheConfigFactory as any).parseFloatEnv('TEST_SMALL_FLOAT', 1.0);
      expect(result).toBe(0.001);
    });

    it('should handle scientific notation in environment variables', () => {
      process.env.TEST_SCIENTIFIC = '1e5';

      const result = (StreamCacheConfigFactory as any).parseIntEnv('TEST_SCIENTIFIC', 1000);
      expect(result).toBe(100000);
    });

    it('should log configuration creation success', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      StreamCacheConfigFactory.createConfig();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Creating Stream Cache configuration')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Stream Cache configuration created successfully'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Integration Testing', () => {
    it('should create config compatible with StreamCacheStandardizedService', () => {
      process.env.STREAM_CACHE_HOT_CACHE_TTL_SECONDS = '10';
      process.env.STREAM_CACHE_WARM_CACHE_TTL_SECONDS = '600';
      process.env.STREAM_CACHE_COMPRESSION_ENABLED = 'true';

      const config = StreamCacheConfigFactory.createConfig();

      // Verify all required properties exist for service integration
      expect(config).toHaveProperty('hotCacheTTL');
      expect(config).toHaveProperty('warmCacheTTL');
      expect(config).toHaveProperty('maxHotCacheSize');
      expect(config).toHaveProperty('streamBatchSize');
      expect(config).toHaveProperty('connectionTimeout');
      expect(config).toHaveProperty('heartbeatInterval');
      expect(config).toHaveProperty('compressionThreshold');
      expect(config).toHaveProperty('compressionEnabled');
      expect(config).toHaveProperty('cleanupInterval');
      expect(config).toHaveProperty('maxCleanupItems');
      expect(config).toHaveProperty('memoryCleanupThreshold');
      expect(config).toHaveProperty('slowOperationThreshold');
      expect(config).toHaveProperty('statsLogInterval');
      expect(config).toHaveProperty('performanceMonitoring');
      expect(config).toHaveProperty('verboseLogging');
      expect(config).toHaveProperty('maxRetryAttempts');
      expect(config).toHaveProperty('retryBaseDelay');
      expect(config).toHaveProperty('retryDelayMultiplier');
      expect(config).toHaveProperty('enableFallback');
      expect(config).toHaveProperty('defaultTTL');
      expect(config).toHaveProperty('minTTL');
      expect(config).toHaveProperty('maxTTL');
      expect(config).toHaveProperty('maxCacheSize');
      expect(config).toHaveProperty('maxBatchSize');
    });
  });
});
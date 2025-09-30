import { DataMapperCacheConfigFactory } from '@core/05-caching/module/data-mapper-cache/config/data-mapper-cache-config.factory';
import { DATA_MAPPER_CACHE_CONSTANTS } from '@core/05-caching/module/data-mapper-cache/constants/data-mapper-cache.constants';
import { DATA_MAPPER_CACHE_ENV_VARS } from '@core/05-caching/module/data-mapper-cache/constants/data-mapper-cache.env-vars.constants';

describe('DataMapperCacheConfigFactory', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env };
    // Clear relevant environment variables
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.BEST_RULE_TTL_SECONDS];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.RULE_BY_ID_TTL_SECONDS];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.PROVIDER_RULES_TTL_SECONDS];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.RULE_STATS_TTL_SECONDS];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.SLOW_OPERATION_THRESHOLD_MS];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_BATCH_SIZE];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.STATS_CLEANUP_INTERVAL_MS];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.DEFAULT_SCAN_TIMEOUT_MS];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.PROVIDER_INVALIDATE_TIMEOUT_MS];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.STATS_SCAN_TIMEOUT_MS];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.CLEAR_ALL_TIMEOUT_MS];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.REDIS_SCAN_COUNT];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.DELETE_BATCH_SIZE];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_KEYS_PREVENTION];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.INTER_BATCH_DELAY_MS];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_KEY_LENGTH];
    delete process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_RULE_SIZE_KB];
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe('createConfig()', () => {
    it('should create configuration with default values when no environment variables are set', () => {
      const config = DataMapperCacheConfigFactory.createConfig();

      expect(config).toBeDefined();

      // TTL configurations
      expect(config.bestRuleTtl).toBe(DATA_MAPPER_CACHE_CONSTANTS.TTL.BEST_RULE);
      expect(config.ruleByIdTtl).toBe(DATA_MAPPER_CACHE_CONSTANTS.TTL.RULE_BY_ID);
      expect(config.providerRulesTtl).toBe(DATA_MAPPER_CACHE_CONSTANTS.TTL.PROVIDER_RULES);
      expect(config.ruleStatsTtl).toBe(DATA_MAPPER_CACHE_CONSTANTS.TTL.RULE_STATS);

      // Performance configurations
      expect(config.slowOperationThreshold).toBe(DATA_MAPPER_CACHE_CONSTANTS.PERFORMANCE.SLOW_OPERATION_MS);
      expect(config.maxBatchSize).toBe(DATA_MAPPER_CACHE_CONSTANTS.PERFORMANCE.MAX_BATCH_SIZE);
      expect(config.statsCleanupInterval).toBe(DATA_MAPPER_CACHE_CONSTANTS.PERFORMANCE.STATS_CLEANUP_INTERVAL_MS);

      // Operation timeout configurations
      expect(config.defaultScanTimeout).toBe(DATA_MAPPER_CACHE_CONSTANTS.OPERATION_TIMEOUTS.DEFAULT_SCAN_MS);
      expect(config.providerInvalidateTimeout).toBe(DATA_MAPPER_CACHE_CONSTANTS.OPERATION_TIMEOUTS.PROVIDER_INVALIDATE_MS);
      expect(config.statsScanTimeout).toBe(DATA_MAPPER_CACHE_CONSTANTS.OPERATION_TIMEOUTS.STATS_SCAN_MS);
      expect(config.clearAllTimeout).toBe(DATA_MAPPER_CACHE_CONSTANTS.OPERATION_TIMEOUTS.CLEAR_ALL_MS);

      // Batch operations configurations
      expect(config.redisScanCount).toBe(DATA_MAPPER_CACHE_CONSTANTS.BATCH_OPERATIONS.REDIS_SCAN_COUNT);
      expect(config.deleteBatchSize).toBe(DATA_MAPPER_CACHE_CONSTANTS.BATCH_OPERATIONS.DELETE_BATCH_SIZE);
      expect(config.maxKeysPrevention).toBe(DATA_MAPPER_CACHE_CONSTANTS.BATCH_OPERATIONS.MAX_KEYS_PREVENTION);
      expect(config.interBatchDelay).toBe(DATA_MAPPER_CACHE_CONSTANTS.BATCH_OPERATIONS.INTER_BATCH_DELAY_MS);

      // Size limit configurations
      expect(config.maxKeyLength).toBe(DATA_MAPPER_CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH);
      expect(config.maxRuleSizeKb).toBe(DATA_MAPPER_CACHE_CONSTANTS.SIZE_LIMITS.MAX_RULE_SIZE_KB);

      // Reference configurations
      expect(config.cacheKeys).toBe(DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS);
      expect(config.errorMessages).toBe(DATA_MAPPER_CACHE_CONSTANTS.ERROR_MESSAGES);
      expect(config.successMessages).toBe(DATA_MAPPER_CACHE_CONSTANTS.SUCCESS_MESSAGES);
    });

    it('should use environment variables when provided', () => {
      // Set environment variables
      process.env[DATA_MAPPER_CACHE_ENV_VARS.BEST_RULE_TTL_SECONDS] = '900';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.RULE_BY_ID_TTL_SECONDS] = '1200';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.PROVIDER_RULES_TTL_SECONDS] = '1800';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.RULE_STATS_TTL_SECONDS] = '600';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.SLOW_OPERATION_THRESHOLD_MS] = '150';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_BATCH_SIZE] = '150';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.STATS_CLEANUP_INTERVAL_MS] = '180000';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.DEFAULT_SCAN_TIMEOUT_MS] = '15000';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.PROVIDER_INVALIDATE_TIMEOUT_MS] = '25000';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.STATS_SCAN_TIMEOUT_MS] = '35000';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.CLEAR_ALL_TIMEOUT_MS] = '45000';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.REDIS_SCAN_COUNT] = '150';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.DELETE_BATCH_SIZE] = '75';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_KEYS_PREVENTION] = '750';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.INTER_BATCH_DELAY_MS] = '15';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_KEY_LENGTH] = '300';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_RULE_SIZE_KB] = '75';

      const config = DataMapperCacheConfigFactory.createConfig();

      expect(config.bestRuleTtl).toBe(900);
      expect(config.ruleByIdTtl).toBe(1200);
      expect(config.providerRulesTtl).toBe(1800);
      expect(config.ruleStatsTtl).toBe(600);
      expect(config.slowOperationThreshold).toBe(150);
      expect(config.maxBatchSize).toBe(150);
      expect(config.statsCleanupInterval).toBe(180000);
      expect(config.defaultScanTimeout).toBe(15000);
      expect(config.providerInvalidateTimeout).toBe(25000);
      expect(config.statsScanTimeout).toBe(35000);
      expect(config.clearAllTimeout).toBe(45000);
      expect(config.redisScanCount).toBe(150);
      expect(config.deleteBatchSize).toBe(75);
      expect(config.maxKeysPrevention).toBe(750);
      expect(config.interBatchDelay).toBe(15);
      expect(config.maxKeyLength).toBe(300);
      expect(config.maxRuleSizeKb).toBe(75);
    });

    it('should handle invalid environment variables gracefully', () => {
      // Set invalid environment variables
      process.env[DATA_MAPPER_CACHE_ENV_VARS.BEST_RULE_TTL_SECONDS] = 'invalid';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_BATCH_SIZE] = 'not-a-number';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.SLOW_OPERATION_THRESHOLD_MS] = '';

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const config = DataMapperCacheConfigFactory.createConfig();

      // Should use default values for invalid environment variables
      expect(config.bestRuleTtl).toBe(DATA_MAPPER_CACHE_CONSTANTS.TTL.BEST_RULE);
      expect(config.maxBatchSize).toBe(DATA_MAPPER_CACHE_CONSTANTS.PERFORMANCE.MAX_BATCH_SIZE);
      expect(config.slowOperationThreshold).toBe(DATA_MAPPER_CACHE_CONSTANTS.PERFORMANCE.SLOW_OPERATION_MS);

      consoleSpy.mockRestore();
    });

    it('should validate configuration and throw error for invalid values', () => {
      // Set environment variables that will fail validation
      process.env[DATA_MAPPER_CACHE_ENV_VARS.BEST_RULE_TTL_SECONDS] = '0'; // Invalid: must be positive
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_BATCH_SIZE] = '-1'; // Invalid: must be positive

      expect(() => {
        DataMapperCacheConfigFactory.createConfig();
      }).toThrow('Data Mapper Cache configuration validation failed');
    });

    it('should include cache keys and messages in configuration', () => {
      const config = DataMapperCacheConfigFactory.createConfig();

      expect(config.cacheKeys).toBeDefined();
      expect(config.errorMessages).toBeDefined();
      expect(config.successMessages).toBeDefined();
      expect(config.cacheKeys).toBe(DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS);
      expect(config.errorMessages).toBe(DATA_MAPPER_CACHE_CONSTANTS.ERROR_MESSAGES);
      expect(config.successMessages).toBe(DATA_MAPPER_CACHE_CONSTANTS.SUCCESS_MESSAGES);
    });
  });

  describe('Environment Variable Parsing', () => {
    it('should handle empty string environment variables', () => {
      process.env[DATA_MAPPER_CACHE_ENV_VARS.BEST_RULE_TTL_SECONDS] = '';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_BATCH_SIZE] = '   '; // Whitespace

      const config = DataMapperCacheConfigFactory.createConfig();

      // Should use default values for empty/whitespace environment variables
      expect(config.bestRuleTtl).toBe(DATA_MAPPER_CACHE_CONSTANTS.TTL.BEST_RULE);
      expect(config.maxBatchSize).toBe(DATA_MAPPER_CACHE_CONSTANTS.PERFORMANCE.MAX_BATCH_SIZE);
    });

    it('should handle floating point environment variables', () => {
      process.env[DATA_MAPPER_CACHE_ENV_VARS.BEST_RULE_TTL_SECONDS] = '900.5'; // Should be parsed as 900
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_BATCH_SIZE] = '100.9'; // Should be parsed as 100

      const config = DataMapperCacheConfigFactory.createConfig();

      expect(config.bestRuleTtl).toBe(900);
      expect(config.maxBatchSize).toBe(100);
    });

    it('should handle negative values', () => {
      process.env[DATA_MAPPER_CACHE_ENV_VARS.BEST_RULE_TTL_SECONDS] = '-100';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.INTER_BATCH_DELAY_MS] = '-5';

      expect(() => {
        DataMapperCacheConfigFactory.createConfig();
      }).toThrow('Data Mapper Cache configuration validation failed');
    });

    it('should handle very large values', () => {
      process.env[DATA_MAPPER_CACHE_ENV_VARS.BEST_RULE_TTL_SECONDS] = '999999999';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_BATCH_SIZE] = '999999';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_KEYS_PREVENTION] = '1000000'; // 设置更大的值避免验证错误

      const config = DataMapperCacheConfigFactory.createConfig();

      expect(config.bestRuleTtl).toBe(999999999);
      expect(config.maxBatchSize).toBe(999999);
      expect(config.maxKeysPrevention).toBe(1000000);
    });
  });

  describe('Configuration Validation', () => {
    it('should validate all TTL values are positive', () => {
      process.env[DATA_MAPPER_CACHE_ENV_VARS.BEST_RULE_TTL_SECONDS] = '0';

      expect(() => {
        DataMapperCacheConfigFactory.createConfig();
      }).toThrow(/bestRuleTtl must be positive/);
    });

    it('should validate all performance values are positive', () => {
      process.env[DATA_MAPPER_CACHE_ENV_VARS.SLOW_OPERATION_THRESHOLD_MS] = '0';

      expect(() => {
        DataMapperCacheConfigFactory.createConfig();
      }).toThrow(/slowOperationThreshold must be positive/);
    });

    it('should validate all timeout values are positive', () => {
      process.env[DATA_MAPPER_CACHE_ENV_VARS.DEFAULT_SCAN_TIMEOUT_MS] = '0';

      expect(() => {
        DataMapperCacheConfigFactory.createConfig();
      }).toThrow(/defaultScanTimeout must be positive/);
    });

    it('should validate all batch operation values are positive', () => {
      process.env[DATA_MAPPER_CACHE_ENV_VARS.REDIS_SCAN_COUNT] = '0';

      expect(() => {
        DataMapperCacheConfigFactory.createConfig();
      }).toThrow(/redisScanCount must be positive/);
    });

    it('should validate size limit values are positive', () => {
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_KEY_LENGTH] = '0';

      expect(() => {
        DataMapperCacheConfigFactory.createConfig();
      }).toThrow(/maxKeyLength must be positive/);
    });

    it('should validate inter-batch delay is non-negative', () => {
      process.env[DATA_MAPPER_CACHE_ENV_VARS.INTER_BATCH_DELAY_MS] = '-1';

      expect(() => {
        DataMapperCacheConfigFactory.createConfig();
      }).toThrow(/interBatchDelay must be non-negative/);
    });

    it('should validate logical relationships between values', () => {
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_BATCH_SIZE] = '1000';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_KEYS_PREVENTION] = '500'; // maxBatchSize > maxKeysPrevention

      expect(() => {
        DataMapperCacheConfigFactory.createConfig();
      }).toThrow(/maxBatchSize should not exceed maxKeysPrevention/);
    });

    it('should allow valid configuration to pass validation', () => {
      process.env[DATA_MAPPER_CACHE_ENV_VARS.BEST_RULE_TTL_SECONDS] = '1800';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.RULE_BY_ID_TTL_SECONDS] = '3600';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.PROVIDER_RULES_TTL_SECONDS] = '3600';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.RULE_STATS_TTL_SECONDS] = '900';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.SLOW_OPERATION_THRESHOLD_MS] = '100';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_BATCH_SIZE] = '100';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.STATS_CLEANUP_INTERVAL_MS] = '300000';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.DEFAULT_SCAN_TIMEOUT_MS] = '10000';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.PROVIDER_INVALIDATE_TIMEOUT_MS] = '20000';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.STATS_SCAN_TIMEOUT_MS] = '30000';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.CLEAR_ALL_TIMEOUT_MS] = '60000';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.REDIS_SCAN_COUNT] = '100';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.DELETE_BATCH_SIZE] = '50';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_KEYS_PREVENTION] = '1000';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.INTER_BATCH_DELAY_MS] = '10';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_KEY_LENGTH] = '256';
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_RULE_SIZE_KB] = '64';

      expect(() => {
        DataMapperCacheConfigFactory.createConfig();
      }).not.toThrow();
    });
  });


  describe('Configuration Properties', () => {
    let config: any;

    beforeEach(() => {
      config = DataMapperCacheConfigFactory.createConfig();
    });

    it('should have all required TTL properties', () => {
      expect(config).toHaveProperty('bestRuleTtl');
      expect(config).toHaveProperty('ruleByIdTtl');
      expect(config).toHaveProperty('providerRulesTtl');
      expect(config).toHaveProperty('ruleStatsTtl');
      expect(typeof config.bestRuleTtl).toBe('number');
      expect(typeof config.ruleByIdTtl).toBe('number');
      expect(typeof config.providerRulesTtl).toBe('number');
      expect(typeof config.ruleStatsTtl).toBe('number');
    });

    it('should have all required performance properties', () => {
      expect(config).toHaveProperty('slowOperationThreshold');
      expect(config).toHaveProperty('maxBatchSize');
      expect(config).toHaveProperty('statsCleanupInterval');
      expect(typeof config.slowOperationThreshold).toBe('number');
      expect(typeof config.maxBatchSize).toBe('number');
      expect(typeof config.statsCleanupInterval).toBe('number');
    });

    it('should have all required timeout properties', () => {
      expect(config).toHaveProperty('defaultScanTimeout');
      expect(config).toHaveProperty('providerInvalidateTimeout');
      expect(config).toHaveProperty('statsScanTimeout');
      expect(config).toHaveProperty('clearAllTimeout');
      expect(typeof config.defaultScanTimeout).toBe('number');
      expect(typeof config.providerInvalidateTimeout).toBe('number');
      expect(typeof config.statsScanTimeout).toBe('number');
      expect(typeof config.clearAllTimeout).toBe('number');
    });

    it('should have all required batch operation properties', () => {
      expect(config).toHaveProperty('redisScanCount');
      expect(config).toHaveProperty('deleteBatchSize');
      expect(config).toHaveProperty('maxKeysPrevention');
      expect(config).toHaveProperty('interBatchDelay');
      expect(typeof config.redisScanCount).toBe('number');
      expect(typeof config.deleteBatchSize).toBe('number');
      expect(typeof config.maxKeysPrevention).toBe('number');
      expect(typeof config.interBatchDelay).toBe('number');
    });

    it('should have all required size limit properties', () => {
      expect(config).toHaveProperty('maxKeyLength');
      expect(config).toHaveProperty('maxRuleSizeKb');
      expect(typeof config.maxKeyLength).toBe('number');
      expect(typeof config.maxRuleSizeKb).toBe('number');
    });

    it('should have all required reference properties', () => {
      expect(config).toHaveProperty('cacheKeys');
      expect(config).toHaveProperty('errorMessages');
      expect(config).toHaveProperty('successMessages');
      expect(typeof config.cacheKeys).toBe('object');
      expect(typeof config.errorMessages).toBe('object');
      expect(typeof config.successMessages).toBe('object');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined environment variables', () => {
      // Explicitly set to undefined
      process.env[DATA_MAPPER_CACHE_ENV_VARS.BEST_RULE_TTL_SECONDS] = undefined as any;
      process.env[DATA_MAPPER_CACHE_ENV_VARS.MAX_BATCH_SIZE] = undefined as any;

      const config = DataMapperCacheConfigFactory.createConfig();

      expect(config.bestRuleTtl).toBe(DATA_MAPPER_CACHE_CONSTANTS.TTL.BEST_RULE);
      expect(config.maxBatchSize).toBe(DATA_MAPPER_CACHE_CONSTANTS.PERFORMANCE.MAX_BATCH_SIZE);
    });


    it('should create immutable configuration object', () => {
      const config1 = DataMapperCacheConfigFactory.createConfig();
      const config2 = DataMapperCacheConfigFactory.createConfig();

      // Should be different object instances
      expect(config1).not.toBe(config2);

      // But should have same values
      expect(config1.bestRuleTtl).toBe(config2.bestRuleTtl);
      expect(config1.maxBatchSize).toBe(config2.maxBatchSize);
    });
  });
});

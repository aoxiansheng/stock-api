import { SymbolMapperCacheConfigFactory } from '@core/05-caching/module/symbol-mapper-cache/config/symbol-mapper-cache-config.factory';
import { SYMBOL_MAPPER_CACHE_CONSTANTS } from '@core/05-caching/module/symbol-mapper-cache/constants/symbol-mapper-cache.constants';

describe('SymbolMapperCacheConfigFactory', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('createConfig', () => {
    it('should create default configuration when no environment variables are set', () => {
      // Clear relevant environment variables
      delete process.env.PROVIDER_RULES_TTL_SECONDS;
      delete process.env.SYMBOL_MAPPING_TTL_SECONDS;
      delete process.env.BATCH_RESULT_TTL_SECONDS;
      delete process.env.DEFAULT_BATCH_SIZE;
      delete process.env.L1_CACHE_SIZE;
      delete process.env.L2_CACHE_SIZE;
      delete process.env.L3_CACHE_SIZE;

      const config = SymbolMapperCacheConfigFactory.createConfig();

      expect(config).toEqual({
        // TTL configurations (should use defaults)
        providerRulesTtl: SYMBOL_MAPPER_CACHE_CONSTANTS.TTL.PROVIDER_RULES_TTL_S,
        symbolMappingTtl: SYMBOL_MAPPER_CACHE_CONSTANTS.TTL.SYMBOL_MAPPING_TTL_S,
        batchResultTtl: SYMBOL_MAPPER_CACHE_CONSTANTS.TTL.BATCH_RESULT_TTL_S,

        // Batch configurations
        defaultBatchSize: SYMBOL_MAPPER_CACHE_CONSTANTS.BATCH.DEFAULT_BATCH_SIZE,
        lruSortBatchSize: SYMBOL_MAPPER_CACHE_CONSTANTS.BATCH.LRU_SORT_BATCH_SIZE,
        maxConcurrentOperations: SYMBOL_MAPPER_CACHE_CONSTANTS.BATCH.MAX_CONCURRENT_OPERATIONS,

        // Connection configurations
        maxReconnectDelay: SYMBOL_MAPPER_CACHE_CONSTANTS.CONNECTION.MAX_RECONNECT_DELAY_MS,
        baseRetryDelay: SYMBOL_MAPPER_CACHE_CONSTANTS.CONNECTION.BASE_RETRY_DELAY_MS,
        connectionTimeout: SYMBOL_MAPPER_CACHE_CONSTANTS.CONNECTION.CONNECTION_TIMEOUT_MS,

        // Memory monitoring
        memoryCheckInterval: SYMBOL_MAPPER_CACHE_CONSTANTS.MEMORY.CHECK_INTERVAL_MS,
        memoryCleanupInterval: SYMBOL_MAPPER_CACHE_CONSTANTS.MEMORY.CLEANUP_INTERVAL_MS,

        // LRU cache sizes (default values)
        l1CacheSize: 100,
        l2CacheSize: 1000,
        l3CacheSize: 500,

        // Performance monitoring
        slowOperationThreshold: 100,
        metricsCollectionEnabled: true,
        performanceMonitoringEnabled: true,

        // References to constants
        cacheKeys: SYMBOL_MAPPER_CACHE_CONSTANTS.KEYS,
        events: SYMBOL_MAPPER_CACHE_CONSTANTS.EVENTS,
      });
    });

    it('should use environment variables when provided', () => {
      // Set environment variables
      process.env.PROVIDER_RULES_TTL_SECONDS = '1800';
      process.env.SYMBOL_MAPPING_TTL_SECONDS = '7200';
      process.env.BATCH_RESULT_TTL_SECONDS = '3600';
      process.env.DEFAULT_BATCH_SIZE = '50';
      process.env.L1_CACHE_SIZE = '200';
      process.env.L2_CACHE_SIZE = '2000';
      process.env.L3_CACHE_SIZE = '1000';
      process.env.SLOW_OPERATION_THRESHOLD_MS = '200';
      process.env.METRICS_COLLECTION_ENABLED = 'false';
      process.env.PERFORMANCE_MONITORING_ENABLED = 'true';

      const config = SymbolMapperCacheConfigFactory.createConfig();

      expect(config.providerRulesTtl).toBe(1800);
      expect(config.symbolMappingTtl).toBe(7200);
      expect(config.batchResultTtl).toBe(3600);
      expect(config.defaultBatchSize).toBe(50);
      expect(config.l1CacheSize).toBe(200);
      expect(config.l2CacheSize).toBe(2000);
      expect(config.l3CacheSize).toBe(1000);
      expect(config.slowOperationThreshold).toBe(200);
      expect(config.metricsCollectionEnabled).toBe(false);
      expect(config.performanceMonitoringEnabled).toBe(true);
    });

    it('should throw error for invalid configuration', () => {
      // Set invalid values that will cause validation errors
      process.env.PROVIDER_RULES_TTL_SECONDS = '-1';
      process.env.L1_CACHE_SIZE = '0';
      process.env.L2_CACHE_SIZE = '50'; // L2 < L1 will cause validation error

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('Symbol Mapper Cache configuration validation failed');
    });
  });

  describe('parseIntEnv', () => {
    // Since parseIntEnv is private, we test it through createConfig
    it('should handle invalid integer values gracefully', () => {
      process.env.DEFAULT_BATCH_SIZE = 'invalid_number';

      const config = SymbolMapperCacheConfigFactory.createConfig();

      // Should use default value
      expect(config.defaultBatchSize).toBe(SYMBOL_MAPPER_CACHE_CONSTANTS.BATCH.DEFAULT_BATCH_SIZE);
    });

    it('should handle empty string values', () => {
      process.env.DEFAULT_BATCH_SIZE = '';

      const config = SymbolMapperCacheConfigFactory.createConfig();

      // Should use default value
      expect(config.defaultBatchSize).toBe(SYMBOL_MAPPER_CACHE_CONSTANTS.BATCH.DEFAULT_BATCH_SIZE);
    });

    it('should handle numeric strings correctly', () => {
      process.env.DEFAULT_BATCH_SIZE = '25';

      const config = SymbolMapperCacheConfigFactory.createConfig();

      expect(config.defaultBatchSize).toBe(25);
    });

    it('should enforce minimum values', () => {
      process.env.L1_CACHE_SIZE = '-5'; // Below minimum

      const config = SymbolMapperCacheConfigFactory.createConfig();

      // Should use minimum value (1)
      expect(config.l1CacheSize).toBeGreaterThan(0);
    });

    it('should enforce maximum values when applicable', () => {
      process.env.MAX_CONCURRENT_OPERATIONS = '100'; // Above reasonable limit

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('maxConcurrentOperations should not exceed 50');
    });

    it('should handle edge case values (zero, negative)', () => {
      process.env.LRU_SORT_BATCH_SIZE = '0';
      process.env.MEMORY_CHECK_INTERVAL_MS = '-100';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow(/must be positive/);
    });

    it('should handle very large numeric values', () => {
      process.env.L2_CACHE_SIZE = '999999999';

      const config = SymbolMapperCacheConfigFactory.createConfig();

      expect(config.l2CacheSize).toBe(999999999);
    });

    it('should handle whitespace in environment variables', () => {
      process.env.DEFAULT_BATCH_SIZE = '  25  ';

      const config = SymbolMapperCacheConfigFactory.createConfig();

      expect(config.defaultBatchSize).toBe(25);
    });
  });

  describe('parseBoolEnv', () => {
    // Since parseBoolEnv is private, we test it through createConfig
    it('should parse true values correctly', () => {
      process.env.METRICS_COLLECTION_ENABLED = 'true';
      let config = SymbolMapperCacheConfigFactory.createConfig();
      expect(config.metricsCollectionEnabled).toBe(true);

      process.env.METRICS_COLLECTION_ENABLED = '1';
      config = SymbolMapperCacheConfigFactory.createConfig();
      expect(config.metricsCollectionEnabled).toBe(true);

      process.env.METRICS_COLLECTION_ENABLED = 'yes';
      config = SymbolMapperCacheConfigFactory.createConfig();
      expect(config.metricsCollectionEnabled).toBe(true);

      process.env.METRICS_COLLECTION_ENABLED = 'TRUE';
      config = SymbolMapperCacheConfigFactory.createConfig();
      expect(config.metricsCollectionEnabled).toBe(true);
    });

    it('should parse false values correctly', () => {
      process.env.METRICS_COLLECTION_ENABLED = 'false';
      let config = SymbolMapperCacheConfigFactory.createConfig();
      expect(config.metricsCollectionEnabled).toBe(false);

      process.env.METRICS_COLLECTION_ENABLED = '0';
      config = SymbolMapperCacheConfigFactory.createConfig();
      expect(config.metricsCollectionEnabled).toBe(false);

      process.env.METRICS_COLLECTION_ENABLED = 'no';
      config = SymbolMapperCacheConfigFactory.createConfig();
      expect(config.metricsCollectionEnabled).toBe(false);

      process.env.METRICS_COLLECTION_ENABLED = 'invalid';
      config = SymbolMapperCacheConfigFactory.createConfig();
      expect(config.metricsCollectionEnabled).toBe(false);
    });

    it('should use default value when environment variable is not set', () => {
      delete process.env.METRICS_COLLECTION_ENABLED;

      const config = SymbolMapperCacheConfigFactory.createConfig();

      expect(config.metricsCollectionEnabled).toBe(true); // Default is true
    });
  });

  describe('validateConfig', () => {
    // Since validateConfig is private, we test it through createConfig
    it('should validate TTL values are positive', () => {
      process.env.PROVIDER_RULES_TTL_SECONDS = '-1';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('providerRulesTtl must be positive');
    });

    it('should validate all TTL configurations', () => {
      process.env.SYMBOL_MAPPING_TTL_SECONDS = '0';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('symbolMappingTtl must be positive');

      process.env.SYMBOL_MAPPING_TTL_SECONDS = '3600';
      process.env.BATCH_RESULT_TTL_SECONDS = '-5';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('batchResultTtl must be positive');
    });

    it('should validate batch configurations', () => {
      process.env.LRU_SORT_BATCH_SIZE = '0';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('lruSortBatchSize must be positive');
    });

    it('should validate connection configurations', () => {
      process.env.MAX_RECONNECT_DELAY_MS = '-1';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('maxReconnectDelay must be positive');

      process.env.MAX_RECONNECT_DELAY_MS = '30000';
      process.env.BASE_RETRY_DELAY_MS = '0';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('baseRetryDelay must be positive');

      process.env.BASE_RETRY_DELAY_MS = '1000';
      process.env.CONNECTION_TIMEOUT_MS = '-100';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('connectionTimeout must be positive');
    });

    it('should validate memory monitoring configurations', () => {
      process.env.MEMORY_CHECK_INTERVAL_MS = '0';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('memoryCheckInterval must be positive');

      process.env.MEMORY_CHECK_INTERVAL_MS = '60000';
      process.env.MEMORY_CLEANUP_INTERVAL_MS = '-1';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('memoryCleanupInterval must be positive');
    });

    it('should validate cache sizes are positive', () => {
      process.env.L1_CACHE_SIZE = '0';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('l1CacheSize must be positive');

      process.env.L1_CACHE_SIZE = '100';
      process.env.L2_CACHE_SIZE = '0';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('l2CacheSize must be positive');

      process.env.L2_CACHE_SIZE = '1000';
      process.env.L3_CACHE_SIZE = '-10';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('l3CacheSize must be positive');
    });

    it('should validate performance configurations', () => {
      process.env.SLOW_OPERATION_THRESHOLD_MS = '0';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('slowOperationThreshold must be positive');
    });

    it('should validate logical relationships between cache sizes', () => {
      process.env.L1_CACHE_SIZE = '2000';
      process.env.L2_CACHE_SIZE = '1000'; // L2 < L1 should fail

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('l1CacheSize should not exceed l2CacheSize');
    });

    it('should validate batch size vs cache size relationship', () => {
      process.env.DEFAULT_BATCH_SIZE = '1000';
      process.env.L3_CACHE_SIZE = '500'; // batch size > L3 cache should fail

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('defaultBatchSize should not exceed l3CacheSize');
    });

    it('should validate maximum concurrent operations', () => {
      process.env.MAX_CONCURRENT_OPERATIONS = '100'; // > 50 should fail

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('maxConcurrentOperations should not exceed 50');
    });

    it('should allow valid configuration', () => {
      // Set all valid values
      process.env.PROVIDER_RULES_TTL_SECONDS = '3600';
      process.env.SYMBOL_MAPPING_TTL_SECONDS = '7200';
      process.env.BATCH_RESULT_TTL_SECONDS = '1800';
      process.env.DEFAULT_BATCH_SIZE = '20';
      process.env.LRU_SORT_BATCH_SIZE = '100';
      process.env.MAX_CONCURRENT_OPERATIONS = '10';
      process.env.MAX_RECONNECT_DELAY_MS = '30000';
      process.env.BASE_RETRY_DELAY_MS = '1000';
      process.env.CONNECTION_TIMEOUT_MS = '5000';
      process.env.MEMORY_CHECK_INTERVAL_MS = '60000';
      process.env.MEMORY_CLEANUP_INTERVAL_MS = '300000';
      process.env.L1_CACHE_SIZE = '100';
      process.env.L2_CACHE_SIZE = '1000';
      process.env.L3_CACHE_SIZE = '500';
      process.env.SLOW_OPERATION_THRESHOLD_MS = '100';

      expect(() => {
        const config = SymbolMapperCacheConfigFactory.createConfig();
        expect(config).toBeDefined();
      }).not.toThrow();
    });
  });

 

  describe('Error Handling', () => {
    it('should handle multiple validation errors', () => {
      process.env.PROVIDER_RULES_TTL_SECONDS = '-1';
      process.env.SYMBOL_MAPPING_TTL_SECONDS = '0';
      process.env.L1_CACHE_SIZE = '0';

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow(/providerRulesTtl must be positive.*symbolMappingTtl must be positive.*l1CacheSize must be positive/);
    });

    it('should maintain configuration immutability', () => {
      const config1 = SymbolMapperCacheConfigFactory.createConfig();
      const config2 = SymbolMapperCacheConfigFactory.createConfig();

      // Should be different objects
      expect(config1).not.toBe(config2);

      // But with same values
      expect(config1).toEqual(config2);
    });
  });

  describe('Edge Cases and Boundary Values', () => {
    it('should handle boundary values correctly', () => {
      // Test exactly at maximum allowed values
      process.env.MAX_CONCURRENT_OPERATIONS = '50'; // Exactly at limit

      expect(() => {
        const config = SymbolMapperCacheConfigFactory.createConfig();
        expect(config.maxConcurrentOperations).toBe(50);
      }).not.toThrow();
    });

    it('should handle very small positive values', () => {
      process.env.L1_CACHE_SIZE = '1';
      process.env.L2_CACHE_SIZE = '1';
      process.env.L3_CACHE_SIZE = '1';
      process.env.DEFAULT_BATCH_SIZE = '1';

      const config = SymbolMapperCacheConfigFactory.createConfig();
      expect(config.l1CacheSize).toBe(1);
      expect(config.l2CacheSize).toBe(1);
      expect(config.l3CacheSize).toBe(1);
      expect(config.defaultBatchSize).toBe(1);
    });

    it('should handle NaN and special numeric values', () => {
      process.env.L1_CACHE_SIZE = 'NaN';
      process.env.L2_CACHE_SIZE = 'Infinity';
      process.env.L3_CACHE_SIZE = '-Infinity';

      const config = SymbolMapperCacheConfigFactory.createConfig();
      // Should use default values for invalid inputs
      expect(config.l1CacheSize).toBe(100); // Default value
      expect(config.l2CacheSize).toBe(1000); // Default value
      expect(config.l3CacheSize).toBe(500); // Default value
    });

    it('should handle float values by parsing as integers', () => {
      process.env.L1_CACHE_SIZE = '50.7';
      process.env.L2_CACHE_SIZE = '500.9';

      const config = SymbolMapperCacheConfigFactory.createConfig();
      expect(config.l1CacheSize).toBe(50); // parseInt truncates
      expect(config.l2CacheSize).toBe(500); // parseInt truncates
    });
  });

  describe('Environment Variable Combinations', () => {
    it('should handle partial environment variable sets', () => {
      // Only set some variables, others should use defaults
      process.env.PROVIDER_RULES_TTL_SECONDS = '1800';
      process.env.L1_CACHE_SIZE = '75';
      delete process.env.SYMBOL_MAPPING_TTL_SECONDS;
      delete process.env.L2_CACHE_SIZE;

      const config = SymbolMapperCacheConfigFactory.createConfig();
      expect(config.providerRulesTtl).toBe(1800);
      expect(config.l1CacheSize).toBe(75);
      expect(config.symbolMappingTtl).toBe(SYMBOL_MAPPER_CACHE_CONSTANTS.TTL.SYMBOL_MAPPING_TTL_S);
      expect(config.l2CacheSize).toBe(1000); // Default
    });

    it('should validate mixed valid and invalid environment variables', () => {
      process.env.PROVIDER_RULES_TTL_SECONDS = '3600'; // Valid
      process.env.SYMBOL_MAPPING_TTL_SECONDS = 'invalid'; // Invalid, should use default
      process.env.L1_CACHE_SIZE = '0'; // Invalid, should cause validation error

      expect(() => {
        SymbolMapperCacheConfigFactory.createConfig();
      }).toThrow('l1CacheSize must be positive');
    });
  });

  describe('Configuration Consistency', () => {
    it('should maintain configuration object immutability', () => {
      const config1 = SymbolMapperCacheConfigFactory.createConfig();
      const config2 = SymbolMapperCacheConfigFactory.createConfig();

      // Should be different objects
      expect(config1).not.toBe(config2);
      // But with same values
      expect(config1).toEqual(config2);
    });

    it('should provide references to constants objects', () => {
      const config = SymbolMapperCacheConfigFactory.createConfig();

      expect(config.cacheKeys).toBe(SYMBOL_MAPPER_CACHE_CONSTANTS.KEYS);
      expect(config.events).toBe(SYMBOL_MAPPER_CACHE_CONSTANTS.EVENTS);
    });
  });

  describe('Integration', () => {
    it('should create valid configuration for production environment', () => {
      // Set production-like environment variables
      process.env.PROVIDER_RULES_TTL_SECONDS = '3600';
      process.env.SYMBOL_MAPPING_TTL_SECONDS = '7200';
      process.env.BATCH_RESULT_TTL_SECONDS = '1800';
      process.env.DEFAULT_BATCH_SIZE = '20';
      process.env.L1_CACHE_SIZE = '50';
      process.env.L2_CACHE_SIZE = '500';
      process.env.L3_CACHE_SIZE = '200';
      process.env.MAX_CONCURRENT_OPERATIONS = '10';
      process.env.METRICS_COLLECTION_ENABLED = 'true';
      process.env.PERFORMANCE_MONITORING_ENABLED = 'true';

      const config = SymbolMapperCacheConfigFactory.createConfig();

      // Should create config without throwing
      expect(config).toBeDefined();
      expect(config.providerRulesTtl).toBe(3600);
      expect(config.metricsCollectionEnabled).toBe(true);
      expect(config.cacheKeys).toBeDefined();
      expect(config.events).toBeDefined();
    });

    it('should create valid configuration for development environment', () => {
      // Set development-like environment variables (smaller values)
      process.env.PROVIDER_RULES_TTL_SECONDS = '300';
      process.env.SYMBOL_MAPPING_TTL_SECONDS = '600';
      process.env.BATCH_RESULT_TTL_SECONDS = '180';
      process.env.DEFAULT_BATCH_SIZE = '5';
      process.env.L1_CACHE_SIZE = '10';
      process.env.L2_CACHE_SIZE = '100';
      process.env.L3_CACHE_SIZE = '50';
      process.env.MAX_CONCURRENT_OPERATIONS = '3';
      process.env.METRICS_COLLECTION_ENABLED = 'false';
      process.env.PERFORMANCE_MONITORING_ENABLED = 'false';

      const config = SymbolMapperCacheConfigFactory.createConfig();

      expect(config).toBeDefined();
      expect(config.providerRulesTtl).toBe(300);
      expect(config.metricsCollectionEnabled).toBe(false);
      expect(config.performanceMonitoringEnabled).toBe(false);
    });

    it('should handle completely empty environment', () => {
      // Clear all relevant environment variables
      Object.keys(process.env).forEach(key => {
        if (key.includes('TTL') || key.includes('CACHE') || key.includes('BATCH') ||
            key.includes('CONCURRENT') || key.includes('RECONNECT') || key.includes('RETRY') ||
            key.includes('TIMEOUT') || key.includes('MEMORY') || key.includes('THRESHOLD') ||
            key.includes('MONITORING') || key.includes('METRICS')) {
          delete process.env[key];
        }
      });

      const config = SymbolMapperCacheConfigFactory.createConfig();

      // Should use all default values
      expect(config).toBeDefined();
      expect(config.providerRulesTtl).toBe(SYMBOL_MAPPER_CACHE_CONSTANTS.TTL.PROVIDER_RULES_TTL_S);
      expect(config.symbolMappingTtl).toBe(SYMBOL_MAPPER_CACHE_CONSTANTS.TTL.SYMBOL_MAPPING_TTL_S);
      expect(config.batchResultTtl).toBe(SYMBOL_MAPPER_CACHE_CONSTANTS.TTL.BATCH_RESULT_TTL_S);
    });
  });
});

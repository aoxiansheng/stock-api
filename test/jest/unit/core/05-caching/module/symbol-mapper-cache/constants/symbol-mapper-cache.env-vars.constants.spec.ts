import {
  SYMBOL_MAPPER_CACHE_ENV_VARS,
  SymbolMapperCacheEnvVarKey,
  SymbolMapperCacheEnvConfig,
  getEnvVar
} from '@core/05-caching/module/symbol-mapper-cache/constants/symbol-mapper-cache.env-vars.constants';

describe('SYMBOL_MAPPER_CACHE_ENV_VARS', () => {
  describe('Structure and Immutability', () => {
    it('should be defined and frozen', () => {
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS).toBeDefined();
      expect(Object.isFrozen(SYMBOL_MAPPER_CACHE_ENV_VARS)).toBe(true);
    });

    it('should have all required environment variable keys', () => {
      const expectedKeys = [
        'PROVIDER_RULES_TTL_SECONDS',
        'SYMBOL_MAPPING_TTL_SECONDS',
        'BATCH_RESULT_TTL_SECONDS',
        'DEFAULT_BATCH_SIZE',
        'LRU_SORT_BATCH_SIZE',
        'MAX_CONCURRENT_OPERATIONS',
        'MAX_RECONNECT_DELAY_MS',
        'BASE_RETRY_DELAY_MS',
        'CONNECTION_TIMEOUT_MS',
        'MEMORY_CHECK_INTERVAL_MS',
        'MEMORY_CLEANUP_INTERVAL_MS',
        'L1_CACHE_SIZE',
        'L2_CACHE_SIZE',
        'L3_CACHE_SIZE',
        'SLOW_OPERATION_THRESHOLD_MS',
        'METRICS_COLLECTION_ENABLED',
        'PERFORMANCE_MONITORING_ENABLED',
        'BATCH_QUERY_TTL_SECONDS',
        'NEAR_REAL_TIME_TTL_SECONDS',
        'DEFAULT_TTL_SECONDS',
        'GRACEFUL_SHUTDOWN_TIMEOUT_MS',
        'HEALTH_CHECK_INTERVAL_MS',
        'CLEANUP_INTERVAL_MS',
        'SYMBOL_MAPPING_BATCH_SIZE'
      ];

      expectedKeys.forEach(key => {
        expect(SYMBOL_MAPPER_CACHE_ENV_VARS).toHaveProperty(key);
      });
    });

    it('should maintain object reference stability', () => {
      const envVars1 = SYMBOL_MAPPER_CACHE_ENV_VARS;
      const envVars2 = SYMBOL_MAPPER_CACHE_ENV_VARS;
      expect(envVars1).toBe(envVars2);
    });
  });

  describe('Environment Variable Naming', () => {
    it('should have string values for all keys', () => {
      Object.values(SYMBOL_MAPPER_CACHE_ENV_VARS).forEach(value => {
        expect(typeof value).toBe('string');
      });
    });

    it('should have non-empty string values', () => {
      Object.values(SYMBOL_MAPPER_CACHE_ENV_VARS).forEach(value => {
        expect(value.length).toBeGreaterThan(0);
      });
    });

    it('should have unique environment variable values', () => {
      const values = Object.values(SYMBOL_MAPPER_CACHE_ENV_VARS);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should follow environment variable naming conventions', () => {
      // Environment variables should be UPPER_CASE with underscores
      const envVarPattern = /^[A-Z][A-Z0-9_]*[A-Z0-9]$/;

      Object.values(SYMBOL_MAPPER_CACHE_ENV_VARS).forEach(value => {
        expect(value).toMatch(envVarPattern);
      });
    });

    it('should group related variables by prefix', () => {
      // Symbol mapper specific variables should start with SYMBOL_MAPPER_CACHE_
      const symbolMapperKeys = [
        'PROVIDER_RULES_TTL_SECONDS',
        'SYMBOL_MAPPING_TTL_SECONDS',
        'BATCH_RESULT_TTL_SECONDS',
        'DEFAULT_BATCH_SIZE',
        'LRU_SORT_BATCH_SIZE',
        'MAX_CONCURRENT_OPERATIONS',
        'MAX_RECONNECT_DELAY_MS',
        'BASE_RETRY_DELAY_MS',
        'CONNECTION_TIMEOUT_MS',
        'MEMORY_CHECK_INTERVAL_MS',
        'MEMORY_CLEANUP_INTERVAL_MS',
        'L1_CACHE_SIZE',
        'L2_CACHE_SIZE',
        'L3_CACHE_SIZE',
        'SLOW_OPERATION_THRESHOLD_MS',
        'METRICS_COLLECTION_ENABLED',
        'PERFORMANCE_MONITORING_ENABLED'
      ];

      symbolMapperKeys.forEach(key => {
        const envVar = SYMBOL_MAPPER_CACHE_ENV_VARS[key as keyof typeof SYMBOL_MAPPER_CACHE_ENV_VARS];
        expect(envVar).toMatch(/^SYMBOL_MAPPER_CACHE_/);
      });

      // Shared cache variables should start with CACHE_
      const sharedCacheKeys = [
        'BATCH_QUERY_TTL_SECONDS',
        'NEAR_REAL_TIME_TTL_SECONDS',
        'DEFAULT_TTL_SECONDS',
        'GRACEFUL_SHUTDOWN_TIMEOUT_MS',
        'HEALTH_CHECK_INTERVAL_MS',
        'CLEANUP_INTERVAL_MS',
        'SYMBOL_MAPPING_BATCH_SIZE'
      ];

      sharedCacheKeys.forEach(key => {
        const envVar = SYMBOL_MAPPER_CACHE_ENV_VARS[key as keyof typeof SYMBOL_MAPPER_CACHE_ENV_VARS];
        expect(envVar).toMatch(/^CACHE_/);
      });
    });
  });

  describe('Categorization', () => {
    it('should have TTL configuration variables', () => {
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.PROVIDER_RULES_TTL_SECONDS).toBe('SYMBOL_MAPPER_CACHE_PROVIDER_RULES_TTL_SECONDS');
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.SYMBOL_MAPPING_TTL_SECONDS).toBe('SYMBOL_MAPPER_CACHE_SYMBOL_MAPPING_TTL_SECONDS');
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.BATCH_RESULT_TTL_SECONDS).toBe('SYMBOL_MAPPER_CACHE_BATCH_RESULT_TTL_SECONDS');
    });

    it('should have batch configuration variables', () => {
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.DEFAULT_BATCH_SIZE).toBe('SYMBOL_MAPPER_CACHE_DEFAULT_BATCH_SIZE');
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.LRU_SORT_BATCH_SIZE).toBe('SYMBOL_MAPPER_CACHE_LRU_SORT_BATCH_SIZE');
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.MAX_CONCURRENT_OPERATIONS).toBe('SYMBOL_MAPPER_CACHE_MAX_CONCURRENT_OPERATIONS');
    });

    it('should have connection configuration variables', () => {
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.MAX_RECONNECT_DELAY_MS).toBe('SYMBOL_MAPPER_CACHE_MAX_RECONNECT_DELAY_MS');
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.BASE_RETRY_DELAY_MS).toBe('SYMBOL_MAPPER_CACHE_BASE_RETRY_DELAY_MS');
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.CONNECTION_TIMEOUT_MS).toBe('SYMBOL_MAPPER_CACHE_CONNECTION_TIMEOUT_MS');
    });

    it('should have memory configuration variables', () => {
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.MEMORY_CHECK_INTERVAL_MS).toBe('SYMBOL_MAPPER_CACHE_MEMORY_CHECK_INTERVAL_MS');
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.MEMORY_CLEANUP_INTERVAL_MS).toBe('SYMBOL_MAPPER_CACHE_MEMORY_CLEANUP_INTERVAL_MS');
    });

    it('should have LRU cache configuration variables', () => {
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.L1_CACHE_SIZE).toBe('SYMBOL_MAPPER_CACHE_L1_SIZE');
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.L2_CACHE_SIZE).toBe('SYMBOL_MAPPER_CACHE_L2_SIZE');
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.L3_CACHE_SIZE).toBe('SYMBOL_MAPPER_CACHE_L3_SIZE');
    });

    it('should have performance monitoring variables', () => {
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.SLOW_OPERATION_THRESHOLD_MS).toBe('SYMBOL_MAPPER_CACHE_SLOW_OP_THRESHOLD_MS');
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.METRICS_COLLECTION_ENABLED).toBe('SYMBOL_MAPPER_CACHE_METRICS_COLLECTION_ENABLED');
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.PERFORMANCE_MONITORING_ENABLED).toBe('SYMBOL_MAPPER_CACHE_PERFORMANCE_MONITORING_ENABLED');
    });

    it('should have shared cache variables', () => {
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.BATCH_QUERY_TTL_SECONDS).toBe('CACHE_BATCH_QUERY_TTL_SECONDS');
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.NEAR_REAL_TIME_TTL_SECONDS).toBe('CACHE_NEAR_REAL_TIME_TTL_SECONDS');
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.DEFAULT_TTL_SECONDS).toBe('CACHE_DEFAULT_TTL_SECONDS');
      expect(SYMBOL_MAPPER_CACHE_ENV_VARS.SYMBOL_MAPPING_BATCH_SIZE).toBe('CACHE_SYMBOL_MAPPING_BATCH_SIZE');
    });
  });
});

describe('getEnvVar function', () => {
  it('should return the correct environment variable name for valid keys', () => {
    expect(getEnvVar('PROVIDER_RULES_TTL_SECONDS')).toBe('SYMBOL_MAPPER_CACHE_PROVIDER_RULES_TTL_SECONDS');
    expect(getEnvVar('DEFAULT_BATCH_SIZE')).toBe('SYMBOL_MAPPER_CACHE_DEFAULT_BATCH_SIZE');
    expect(getEnvVar('L1_CACHE_SIZE')).toBe('SYMBOL_MAPPER_CACHE_L1_SIZE');
    expect(getEnvVar('BATCH_QUERY_TTL_SECONDS')).toBe('CACHE_BATCH_QUERY_TTL_SECONDS');
  });

  it('should provide type safety for environment variable access', () => {
    // This test verifies that TypeScript types are working correctly
    // The function should only accept valid keys from SYMBOL_MAPPER_CACHE_ENV_VARS
    const validKey: keyof typeof SYMBOL_MAPPER_CACHE_ENV_VARS = 'PROVIDER_RULES_TTL_SECONDS';
    const result = getEnvVar(validKey);
    expect(typeof result).toBe('string');
  });

  it('should return string values consistently', () => {
    const keys = Object.keys(SYMBOL_MAPPER_CACHE_ENV_VARS) as Array<keyof typeof SYMBOL_MAPPER_CACHE_ENV_VARS>;

    keys.forEach(key => {
      const result = getEnvVar(key);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

describe('Type Definitions', () => {
  it('should provide correct type for SymbolMapperCacheEnvVarKey', () => {
    // This is a compile-time test that verifies the type is correctly inferred
    const envVarKey: SymbolMapperCacheEnvVarKey = 'SYMBOL_MAPPER_CACHE_PROVIDER_RULES_TTL_SECONDS';
    expect(typeof envVarKey).toBe('string');
  });

  it('should provide correct type structure for SymbolMapperCacheEnvConfig', () => {
    // This test verifies the type structure is correct
    const mockConfig: Partial<SymbolMapperCacheEnvConfig> = {
      PROVIDER_RULES_TTL_SECONDS: 'SYMBOL_MAPPER_CACHE_PROVIDER_RULES_TTL_SECONDS',
      DEFAULT_BATCH_SIZE: 'SYMBOL_MAPPER_CACHE_DEFAULT_BATCH_SIZE'
    };

    expect(typeof mockConfig.PROVIDER_RULES_TTL_SECONDS).toBe('string');
    expect(typeof mockConfig.DEFAULT_BATCH_SIZE).toBe('string');
  });
});

describe('Integration and Usage', () => {
  it('should work with process.env access patterns', () => {
    // Test typical usage pattern
    const originalEnv = process.env.SYMBOL_MAPPER_CACHE_PROVIDER_RULES_TTL_SECONDS;

    try {
      process.env[getEnvVar('PROVIDER_RULES_TTL_SECONDS')] = '3600';

      const value = process.env[SYMBOL_MAPPER_CACHE_ENV_VARS.PROVIDER_RULES_TTL_SECONDS];
      expect(value).toBe('3600');
    } finally {
      // Restore original value
      if (originalEnv !== undefined) {
        process.env.SYMBOL_MAPPER_CACHE_PROVIDER_RULES_TTL_SECONDS = originalEnv;
      } else {
        delete process.env.SYMBOL_MAPPER_CACHE_PROVIDER_RULES_TTL_SECONDS;
      }
    }
  });

  it('should support configuration validation patterns', () => {
    // Test pattern used in configuration factories
    const requiredEnvVars = [
      'PROVIDER_RULES_TTL_SECONDS',
      'SYMBOL_MAPPING_TTL_SECONDS',
      'DEFAULT_BATCH_SIZE'
    ] as const;

    requiredEnvVars.forEach(key => {
      const envVarName = getEnvVar(key);
      expect(typeof envVarName).toBe('string');
      expect(envVarName.length).toBeGreaterThan(0);
    });
  });

  it('should maintain consistency with constant object', () => {
    // Verify that getEnvVar returns the same values as direct object access
    Object.keys(SYMBOL_MAPPER_CACHE_ENV_VARS).forEach(key => {
      const typedKey = key as keyof typeof SYMBOL_MAPPER_CACHE_ENV_VARS;
      const fromFunction = getEnvVar(typedKey);
      const fromObject = SYMBOL_MAPPER_CACHE_ENV_VARS[typedKey];
      expect(fromFunction).toBe(fromObject);
    });
  });
});

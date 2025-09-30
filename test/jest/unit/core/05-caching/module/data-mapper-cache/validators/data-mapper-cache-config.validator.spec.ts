import { DataMapperCacheConfigValidator } from '@core/05-caching/module/data-mapper-cache/validators/data-mapper-cache-config.validator';

describe('DataMapperCacheConfigValidator', () => {
  let consoleSpy: jest.SpyInstance;
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    // Mock the logger instance
    loggerSpy = jest.spyOn((DataMapperCacheConfigValidator as any).logger, 'debug').mockImplementation();
    jest.spyOn((DataMapperCacheConfigValidator as any).logger, 'error').mockImplementation();
    jest.spyOn((DataMapperCacheConfigValidator as any).logger, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    if (loggerSpy) {
      loggerSpy.mockRestore();
    }
    jest.restoreAllMocks();
  });

  describe('validateConfig()', () => {
    it('should validate a complete valid configuration', () => {
      const validConfig = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        statsCleanupInterval: 300000,
        defaultScanTimeout: 10000,
        providerInvalidateTimeout: 5000,
        statsScanTimeout: 3000,
        clearAllTimeout: 30000,
        redisScanCount: 100,
        deleteBatchSize: 50,
        maxKeysPrevention: 1000,
        interBatchDelay: 10,
        maxKeyLength: 256,
        maxRuleSizeKb: 64,
        cacheKeys: {
          bestRule: 'best_rule:',
          ruleById: 'rule:id:',
          providerRules: 'rules:provider:'
        }
      };

      const result = DataMapperCacheConfigValidator.validateConfig(validConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary).toContain('PASSED');
    });

    it('should handle null or undefined configuration', () => {
      const result = DataMapperCacheConfigValidator.validateConfig(null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration object is null or undefined');
      expect(result.summary).toContain('FAILED');
    });

    it('should validate and report missing required fields', () => {
      const incompleteConfig = {
        bestRuleTtl: 1800,
        // Missing other required fields
      };

      const result = DataMapperCacheConfigValidator.validateConfig(incompleteConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Required field 'ruleByIdTtl' is missing or null");
      expect(result.errors).toContain("Required field 'providerRulesTtl' is missing or null");
      expect(result.errors).toContain("Required field 'ruleStatsTtl' is missing or null");
      expect(result.errors).toContain("Required field 'slowOperationThreshold' is missing or null");
      expect(result.errors).toContain("Required field 'maxBatchSize' is missing or null");
    });

    it('should warn about missing cache keys configuration', () => {
      const configWithoutCacheKeys = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        // cacheKeys missing
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithoutCacheKeys);

      expect(result.warnings).toContain('cacheKeys configuration is missing or invalid');
    });
  });

  describe('TTL Configuration Validation', () => {
    it('should validate positive TTL values', () => {
      const configWithInvalidTtl = {
        bestRuleTtl: -100,
        ruleByIdTtl: 0,
        providerRulesTtl: 'invalid',
        ruleStatsTtl: null,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithInvalidTtl);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('bestRuleTtl must be a positive number');
      expect(result.errors).toContain('ruleByIdTtl must be a positive number');
      expect(result.errors).toContain('providerRulesTtl must be a positive number');
      expect(result.errors).toContain('ruleStatsTtl must be a positive number');
    });

    it('should warn about TTL values that are too long', () => {
      const configWithLongTtl = {
        bestRuleTtl: 7200, // > 1 hour
        ruleByIdTtl: 7200, // > 1 hour
        providerRulesTtl: 2000, // > 30 minutes
        ruleStatsTtl: 2000, // > 30 minutes
        slowOperationThreshold: 100,
        maxBatchSize: 100,
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithLongTtl);

      expect(result.warnings).toContain('bestRuleTtl > 1 hour may be too long for dynamic mapping rules');
      expect(result.warnings).toContain('ruleByIdTtl > 1 hour may be too long for individual rules');
      expect(result.warnings).toContain('providerRulesTtl > 30 minutes may be too long for provider-specific rules');
      expect(result.warnings).toContain('ruleStatsTtl > 30 minutes may provide stale statistics');
    });

    it('should warn about TTL values that are too short', () => {
      const configWithShortTtl = {
        bestRuleTtl: 30, // < 1 minute
        ruleByIdTtl: 3600,
        providerRulesTtl: 15, // < 30 seconds
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithShortTtl);

      expect(result.warnings).toContain('bestRuleTtl < 1 minute may cause excessive cache invalidation');
      expect(result.warnings).toContain('providerRulesTtl < 30 seconds may cause frequent provider rule reloading');
    });

    it('should validate TTL logical relationships', () => {
      const configWithInconsistentTtl = {
        bestRuleTtl: 900,
        ruleByIdTtl: 1800,
        providerRulesTtl: 3600, // Longer than others
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithInconsistentTtl);

      expect(result.warnings).toContain('providerRulesTtl should not exceed bestRuleTtl for consistency');
      expect(result.warnings).toContain('providerRulesTtl should not exceed ruleByIdTtl for consistency');
    });
  });

  describe('Performance Configuration Validation', () => {
    it('should validate performance threshold values', () => {
      const configWithInvalidPerformance = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: -50,
        maxBatchSize: 0,
        statsCleanupInterval: 'invalid',
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithInvalidPerformance);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('slowOperationThreshold must be a positive number');
      expect(result.errors).toContain('maxBatchSize must be a positive number');
      expect(result.errors).toContain('statsCleanupInterval must be a positive number');
    });

    it('should warn about extreme performance values', () => {
      const configWithExtremePerformance = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 5, // Too low
        maxBatchSize: 1000, // Too high
        statsCleanupInterval: 30000, // Too frequent
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithExtremePerformance);

      expect(result.warnings).toContain('slowOperationThreshold < 10ms may generate too many slow operation alerts');
      expect(result.warnings).toContain('maxBatchSize > 500 may cause memory issues during batch processing');
      expect(result.warnings).toContain('statsCleanupInterval < 1 minute may cause frequent cleanup operations');
    });

    it('should warn about high slowOperationThreshold', () => {
      const configWithHighThreshold = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 1500, // > 1000ms
        maxBatchSize: 100,
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithHighThreshold);

      expect(result.warnings).toContain('slowOperationThreshold > 1000ms may be too high for data mapping operations');
    });

    it('should warn about low maxBatchSize', () => {
      const configWithLowBatchSize = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 5, // < 10
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithLowBatchSize);

      expect(result.warnings).toContain('maxBatchSize < 10 may result in inefficient batch processing');
    });
  });

  describe('Timeout Configuration Validation', () => {
    it('should validate timeout values', () => {
      const configWithInvalidTimeouts = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        defaultScanTimeout: -1000,
        providerInvalidateTimeout: 0,
        statsScanTimeout: 'invalid',
        clearAllTimeout: null,
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithInvalidTimeouts);

      expect(result.errors).toContain('defaultScanTimeout must be a positive number');
      expect(result.errors).toContain('providerInvalidateTimeout must be a positive number');
      expect(result.errors).toContain('statsScanTimeout must be a positive number');
      expect(result.errors).toContain('clearAllTimeout must be a positive number');
    });

    it('should warn about timeout values that are too long', () => {
      const configWithLongTimeouts = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        defaultScanTimeout: 35000, // > 30000ms
        providerInvalidateTimeout: 15000, // > 10000ms
        statsScanTimeout: 7000, // > 5000ms
        clearAllTimeout: 70000, // > 60000ms
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithLongTimeouts);

      expect(result.warnings).toContain('defaultScanTimeout > 30000ms may be too long');
      expect(result.warnings).toContain('providerInvalidateTimeout > 10000ms may be too long');
      expect(result.warnings).toContain('statsScanTimeout > 5000ms may be too long');
      expect(result.warnings).toContain('clearAllTimeout > 60000ms may be too long');
    });

    it('should warn about timeout values that are too short', () => {
      const configWithShortTimeouts = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        defaultScanTimeout: 500, // < 1000ms
        providerInvalidateTimeout: 200, // < 500ms
        statsScanTimeout: 300, // < 500ms
        clearAllTimeout: 800, // < 1000ms
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithShortTimeouts);

      expect(result.warnings).toContain('defaultScanTimeout < 1000ms may be too short');
      expect(result.warnings).toContain('providerInvalidateTimeout < 500ms may be too short');
      expect(result.warnings).toContain('statsScanTimeout < 500ms may be too short');
      expect(result.warnings).toContain('clearAllTimeout < 1000ms may be too short');
    });
  });

  describe('Batch Configuration Validation', () => {
    it('should validate batch operation values', () => {
      const configWithInvalidBatch = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        redisScanCount: -100,
        deleteBatchSize: 0,
        maxKeysPrevention: 'invalid',
        interBatchDelay: -5,
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithInvalidBatch);

      expect(result.errors).toContain('redisScanCount must be a positive number');
      expect(result.errors).toContain('deleteBatchSize must be a positive number');
      expect(result.errors).toContain('maxKeysPrevention must be a positive number');
      expect(result.errors).toContain('interBatchDelay must be a non-negative number');
    });

    it('should warn about extreme batch values', () => {
      const configWithExtremeBatch = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        redisScanCount: 5, // Too low
        deleteBatchSize: 1500, // Too high
        maxKeysPrevention: 500, // Too low
        interBatchDelay: 1500, // Too high
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithExtremeBatch);

      expect(result.warnings).toContain('redisScanCount < 10 may result in too many Redis round trips');
      expect(result.warnings).toContain('deleteBatchSize > 1000 may cause memory issues');
      expect(result.warnings).toContain('maxKeysPrevention < 1000 may be too restrictive');
      expect(result.warnings).toContain('interBatchDelay > 1000ms may slow down batch operations significantly');
    });

    it('should warn about high redisScanCount', () => {
      const configWithHighScanCount = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        redisScanCount: 15000, // > 10000
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithHighScanCount);

      expect(result.warnings).toContain('redisScanCount > 10000 may cause performance issues');
    });
  });

  describe('Size Limits Configuration Validation', () => {
    it('should validate size limit values', () => {
      const configWithInvalidSizes = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        maxKeyLength: -256,
        maxRuleSizeKb: 0,
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithInvalidSizes);

      expect(result.errors).toContain('maxKeyLength must be a positive number');
      expect(result.errors).toContain('maxRuleSizeKb must be a positive number');
    });

    it('should warn about extreme size limits', () => {
      const configWithExtremeSizes = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        maxKeyLength: 1000, // > 512
        maxRuleSizeKb: 150, // > 100
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithExtremeSizes);

      expect(result.warnings).toContain('maxKeyLength > 512 may cause Redis key issues');
      expect(result.warnings).toContain('maxRuleSizeKb > 100KB may indicate overly complex mapping rules');
    });

    it('should warn about restrictive size limits', () => {
      const configWithRestrictiveSizes = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        maxKeyLength: 30, // < 50
        maxRuleSizeKb: 0.5, // < 1
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithRestrictiveSizes);

      expect(result.warnings).toContain('maxKeyLength < 50 may be too restrictive for mapping rules');
      expect(result.warnings).toContain('maxRuleSizeKb < 1KB may be too restrictive for complex rules');
    });
  });

  describe('Logical Consistency Validation', () => {
    it('should validate batch size relationships', () => {
      const configWithInconsistentBatch = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 1500,
        maxKeysPrevention: 1000, // Less than maxBatchSize
        deleteBatchSize: 200,
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithInconsistentBatch);

      expect(result.errors).toContain('maxBatchSize should not exceed maxKeysPrevention');
    });

    it('should warn about deleteBatchSize exceeding maxBatchSize', () => {
      const configWithLargeDeleteBatch = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        deleteBatchSize: 200, // Larger than maxBatchSize
        maxKeysPrevention: 1000,
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithLargeDeleteBatch);

      expect(result.warnings).toContain('deleteBatchSize should not exceed maxBatchSize');
    });

    it('should warn about disproportionate redisScanCount', () => {
      const configWithLargeScanCount = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        redisScanCount: 5000, // 50x maxBatchSize
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithLargeScanCount);

      expect(result.warnings).toContain('redisScanCount seems disproportionately large compared to maxBatchSize');
    });

    it('should warn about timeout inconsistencies', () => {
      const configWithInconsistentTimeouts = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        defaultScanTimeout: 25000,
        clearAllTimeout: 20000, // Less than defaultScanTimeout
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithInconsistentTimeouts);

      expect(result.warnings).toContain('defaultScanTimeout should not exceed clearAllTimeout');
    });

    it('should warn about TTL and timeout relationships', () => {
      const configWithTtlTimeoutIssue = {
        bestRuleTtl: 60, // 1 minute
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        defaultScanTimeout: 35000, // > TTL/2
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithTtlTimeoutIssue);

      expect(result.warnings).toContain('defaultScanTimeout should be much less than bestRuleTtl to ensure cache effectiveness');
    });
  });

  describe('isValidConfig()', () => {
    it('should return true for valid configuration', () => {
      const validConfig = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
      };

      const isValid = DataMapperCacheConfigValidator.isValidConfig(validConfig);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid configuration', () => {
      const invalidConfig = {
        bestRuleTtl: -1800, // Invalid
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
      };

      const isValid = DataMapperCacheConfigValidator.isValidConfig(invalidConfig);

      expect(isValid).toBe(false);
    });
  });

  describe('validateField()', () => {
    it('should validate bestRuleTtl field', () => {
      const validResult = DataMapperCacheConfigValidator.validateField('bestRuleTtl', 1800);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = DataMapperCacheConfigValidator.validateField('bestRuleTtl', -100);
      expect(invalidResult.errors).toContain('bestRuleTtl must be a positive number');

      const warningResult = DataMapperCacheConfigValidator.validateField('bestRuleTtl', 7200);
      expect(warningResult.warnings).toContain('bestRuleTtl > 1 hour may be too long for dynamic mapping rules');
    });

    it('should validate providerRulesTtl field', () => {
      const validResult = DataMapperCacheConfigValidator.validateField('providerRulesTtl', 1800);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = DataMapperCacheConfigValidator.validateField('providerRulesTtl', 0);
      expect(invalidResult.errors).toContain('providerRulesTtl must be a positive number');

      const warningResult = DataMapperCacheConfigValidator.validateField('providerRulesTtl', 2000);
      expect(warningResult.warnings).toContain('providerRulesTtl > 30 minutes may be too long for provider-specific rules');
    });

    it('should validate maxBatchSize field', () => {
      const validResult = DataMapperCacheConfigValidator.validateField('maxBatchSize', 100);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = DataMapperCacheConfigValidator.validateField('maxBatchSize', -50);
      expect(invalidResult.errors).toContain('maxBatchSize must be a positive number');

      const warningResult = DataMapperCacheConfigValidator.validateField('maxBatchSize', 600);
      expect(warningResult.warnings).toContain('maxBatchSize > 500 may cause memory issues during batch processing');
    });

    it('should handle unknown fields', () => {
      const result = DataMapperCacheConfigValidator.validateField('unknownField', 100);
      expect(result.warnings).toContain("Unknown field 'unknownField' - validation skipped");
    });
  });

  describe('Logging and Summary', () => {
    it('should generate appropriate summary for valid configuration', () => {
      const validConfig = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
      };

      const result = DataMapperCacheConfigValidator.validateConfig(validConfig);

      expect(result.summary).toContain('PASSED');
      expect(result.summary).toContain('0 errors');
      expect(result.summary).toContain('max batch: 100');
    });

    it('should generate appropriate summary for invalid configuration', () => {
      const invalidConfig = {
        bestRuleTtl: -1800,
        ruleByIdTtl: 0,
        // Missing other required fields
      };

      const result = DataMapperCacheConfigValidator.validateConfig(invalidConfig);

      expect(result.summary).toContain('FAILED');
      expect(result.summary).toMatch(/\d+ errors/);
      expect(result.summary).toMatch(/\d+ warnings/);
    });

    it('should log error for failed validation', () => {
      const loggerErrorSpy = jest.spyOn((DataMapperCacheConfigValidator as any).logger, 'error');

      const invalidConfig = {
        bestRuleTtl: -100,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
      };

      DataMapperCacheConfigValidator.validateConfig(invalidConfig);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Data Mapper Cache configuration validation failed',
        expect.objectContaining({
          errors: expect.any(Array),
          warnings: expect.any(Array),
          config: expect.any(Object),
        })
      );
    });

    it('should log warning for configuration with warnings', () => {
      const loggerWarnSpy = jest.spyOn((DataMapperCacheConfigValidator as any).logger, 'warn');

      const configWithWarnings = {
        bestRuleTtl: 7200, // Will generate warning
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
      };

      DataMapperCacheConfigValidator.validateConfig(configWithWarnings);

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'Data Mapper Cache configuration validation completed with warnings',
        expect.objectContaining({
          warnings: expect.any(Array),
          config: expect.any(Object),
        })
      );
    });

    it('should sanitize sensitive information in logs', () => {
      const loggerDebugSpy = jest.spyOn((DataMapperCacheConfigValidator as any).logger, 'debug');

      const configWithSensitiveData = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        connectionString: 'sensitive-connection-string',
        apiKey: 'secret-api-key',
        secret: 'top-secret',
        providerCredentials: { username: 'user', password: 'pass' },
        errorMessages: { error1: 'Some error with sensitive data' },
        successMessages: { success1: 'Some success with sensitive data' },
      };

      DataMapperCacheConfigValidator.validateConfig(configWithSensitiveData);

      // Check that sensitive data was sanitized
      const logCall = loggerDebugSpy.mock.calls.find(call =>
        call[0] === 'Data Mapper Cache configuration validation passed'
      );

      if (logCall && logCall[1] && typeof logCall[1] === 'object') {
        const logData = logCall[1] as { config: any };
        const loggedConfig = logData.config;
        expect(loggedConfig).not.toHaveProperty('connectionString');
        expect(loggedConfig).not.toHaveProperty('apiKey');
        expect(loggedConfig).not.toHaveProperty('secret');
        expect(loggedConfig).not.toHaveProperty('providerCredentials');
        expect(loggedConfig.errorMessages).toBe('[REDACTED]');
        expect(loggedConfig.successMessages).toBe('[REDACTED]');
      }
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle configuration with undefined optional fields', () => {
      const configWithUndefinedOptionals = {
        bestRuleTtl: 1800,
        ruleByIdTtl: 3600,
        providerRulesTtl: 1800,
        ruleStatsTtl: 900,
        slowOperationThreshold: 100,
        maxBatchSize: 100,
        statsCleanupInterval: undefined,
        defaultScanTimeout: undefined,
        redisScanCount: undefined,
        maxKeyLength: undefined,
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithUndefinedOptionals);

      // Should not generate errors for undefined optional fields
      expect(result.isValid).toBe(true);
    });

    it('should handle configuration with exact boundary values', () => {
      const configWithBoundaryValues = {
        bestRuleTtl: 3600, // Exactly 1 hour
        ruleByIdTtl: 3600, // Exactly 1 hour
        providerRulesTtl: 1800, // Exactly 30 minutes
        ruleStatsTtl: 1800, // Exactly 30 minutes
        slowOperationThreshold: 1000, // Exactly 1000ms
        maxBatchSize: 500, // Exactly 500
        maxKeyLength: 512, // Exactly 512
        maxRuleSizeKb: 100, // Exactly 100KB
        cacheKeys: {
          bestRule: 'best_rule:',
          ruleById: 'rule:id:',
          providerRules: 'rules:provider:'
        }
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithBoundaryValues);

      // Should not generate warnings for exact boundary values
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle configuration with all fields set to minimum valid values', () => {
      const configWithMinValues = {
        bestRuleTtl: 1,
        ruleByIdTtl: 1,
        providerRulesTtl: 1,
        ruleStatsTtl: 1,
        slowOperationThreshold: 1,
        maxBatchSize: 1,
        statsCleanupInterval: 1,
        defaultScanTimeout: 1,
        providerInvalidateTimeout: 1,
        statsScanTimeout: 1,
        clearAllTimeout: 1,
        redisScanCount: 1,
        deleteBatchSize: 1,
        maxKeysPrevention: 1,
        interBatchDelay: 0,
        maxKeyLength: 1,
        maxRuleSizeKb: 0.001,
      };

      const result = DataMapperCacheConfigValidator.validateConfig(configWithMinValues);

      // Should be valid but may have warnings
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});

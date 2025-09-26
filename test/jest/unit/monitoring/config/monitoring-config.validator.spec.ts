/**
 * Monitoring Configuration Validator Unit Tests
 * 测试监控配置验证器的完整性和准确性
 */

import {
  MonitoringConfigValidator,
  validateMonitoringConfiguration,
  type ConfigValidationResult,
  type EnvironmentValidationResult,
} from '@monitoring/config/monitoring-config.validator';
import {
  MonitoringUnifiedTtlConfig,
  MonitoringTtlUtils,
} from '@monitoring/config/unified/monitoring-unified-ttl.config';
import {
  MonitoringUnifiedLimitsConfig,
  AlertBatchConfig,
  DataProcessingBatchConfig,
  SystemLimitsConfig,
} from '@monitoring/config/unified/monitoring-unified-limits.config';
import {
  MonitoringCoreEnvConfig,
} from '@monitoring/config/unified/monitoring-core-env.config';

describe('MonitoringConfigValidator', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('validateTtlConfig', () => {
    it('should validate valid TTL configuration', () => {
      const config = new MonitoringUnifiedTtlConfig();
      const result = MonitoringConfigValidator.validateTtlConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.configurationName).toBe('MonitoringUnifiedTtl');
      expect(result.summary.validatedFields).toBeGreaterThan(0);
    });

    it('should detect TTL configuration warnings', () => {
      const config = new MonitoringUnifiedTtlConfig();
      // Set alert TTL higher than health TTL to trigger warning
      config.health = 300;
      config.alert = 600;

      const result = MonitoringConfigValidator.validateTtlConfig(config);

      expect(result.isValid).toBe(true); // No validation errors, only warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('告警数据TTL不应大于健康检查TTL'))).toBe(true);
    });

    it('should provide environment-specific warnings for production', () => {
      process.env.NODE_ENV = 'production';

      const config = new MonitoringUnifiedTtlConfig();
      config.health = 60; // Less than recommended 300
      config.alert = 30; // Less than recommended 60

      const result = MonitoringConfigValidator.validateTtlConfig(config);

      expect(result.warnings.some(w => w.includes('生产环境健康检查TTL建议不小于5分钟'))).toBe(true);
      expect(result.warnings.some(w => w.includes('生产环境告警TTL建议不小于1分钟'))).toBe(true);
    });

    it('should provide environment-specific warnings for test', () => {
      process.env.NODE_ENV = 'test';

      const config = new MonitoringUnifiedTtlConfig();
      config.health = 120; // Greater than recommended 60 for test

      const result = MonitoringConfigValidator.validateTtlConfig(config);

      expect(result.warnings.some(w => w.includes('测试环境健康检查TTL建议不大于1分钟'))).toBe(true);
    });

    it('should detect performance vs trend TTL inconsistency', () => {
      const config = new MonitoringUnifiedTtlConfig();
      config.performance = 600;
      config.trend = 300; // Performance TTL > Trend TTL

      const result = MonitoringConfigValidator.validateTtlConfig(config);

      expect(result.warnings.some(w => w.includes('性能指标TTL不应大于趋势分析TTL'))).toBe(true);
    });

    it('should detect cacheStats vs performance TTL inconsistency', () => {
      const config = new MonitoringUnifiedTtlConfig();
      config.cacheStats = 600;
      config.performance = 300; // CacheStats TTL > Performance TTL

      const result = MonitoringConfigValidator.validateTtlConfig(config);

      expect(result.warnings.some(w => w.includes('缓存统计TTL不应大于性能指标TTL'))).toBe(true);
    });
  });

  describe('validateLimitsConfig', () => {
    it('should validate valid limits configuration', () => {
      const config = new MonitoringUnifiedLimitsConfig();
      const result = MonitoringConfigValidator.validateLimitsConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.configurationName).toBe('MonitoringUnifiedLimitsConfig');
      expect(result.summary.validatedFields).toBeGreaterThan(0);
    });

    it('should detect alert batch size inconsistencies', () => {
      const config = new MonitoringUnifiedLimitsConfig();
      config.alertBatch = new AlertBatchConfig();
      config.alertBatch.small = 10;
      config.alertBatch.medium = 5; // Medium < Small should trigger warning
      config.alertBatch.large = 20;
      config.alertBatch.max = 50;

      const result = MonitoringConfigValidator.validateLimitsConfig(config);

      expect(result.warnings.some(w => w.includes('告警小批量大小不应大于中等批量大小'))).toBe(true);
    });

    it('should detect medium vs large batch size inconsistencies', () => {
      const config = new MonitoringUnifiedLimitsConfig();
      config.alertBatch = new AlertBatchConfig();
      config.alertBatch.small = 5;
      config.alertBatch.medium = 20;
      config.alertBatch.large = 10; // Large < Medium should trigger warning
      config.alertBatch.max = 50;

      const result = MonitoringConfigValidator.validateLimitsConfig(config);

      expect(result.warnings.some(w => w.includes('告警中等批量大小不应大于大批量大小'))).toBe(true);
    });

    it('should detect large vs max batch size inconsistencies', () => {
      const config = new MonitoringUnifiedLimitsConfig();
      config.alertBatch = new AlertBatchConfig();
      config.alertBatch.small = 5;
      config.alertBatch.medium = 10;
      config.alertBatch.large = 50;
      config.alertBatch.max = 20; // Max < Large should trigger warning

      const result = MonitoringConfigValidator.validateLimitsConfig(config);

      expect(result.warnings.some(w => w.includes('告警大批量大小不应大于最大批量大小'))).toBe(true);
    });

    it('should detect system limits issues', () => {
      const config = new MonitoringUnifiedLimitsConfig();
      config.systemLimits = new SystemLimitsConfig();
      config.systemLimits.maxQueueSize = 50; // Less than 100
      config.systemLimits.maxRetryAttempts = 5;
      config.systemLimits.maxBufferSize = 10; // Less than maxRetryAttempts * 10

      const result = MonitoringConfigValidator.validateLimitsConfig(config);

      expect(result.warnings.some(w => w.includes('系统队列大小过小，可能导致数据丢失'))).toBe(true);
      expect(result.warnings.some(w => w.includes('缓冲区大小可能不足以支持配置的重试次数'))).toBe(true);
    });

    it('should validate nested configuration objects', () => {
      const config = new MonitoringUnifiedLimitsConfig();

      // Manually set invalid values to test validation
      config.alertBatch = new AlertBatchConfig();
      config.dataProcessingBatch = new DataProcessingBatchConfig();
      config.systemLimits = new SystemLimitsConfig();

      const result = MonitoringConfigValidator.validateLimitsConfig(config);

      expect(result.summary.validatedFields).toBeGreaterThan(0);
      expect(result.summary.configurationName).toBe('MonitoringUnifiedLimitsConfig');
    });
  });

  describe('validateCoreEnvConfig', () => {
    it('should validate valid core environment configuration', () => {
      const config = new MonitoringCoreEnvConfig();
      const result = MonitoringConfigValidator.validateCoreEnvConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.summary.configurationName).toBe('MonitoringCoreEnvConfig');
      expect(result.summary.validatedFields).toBeGreaterThan(0);
    });

    it('should warn about missing environment variables', () => {
      // Clear relevant environment variables
      delete process.env.MONITORING_DEFAULT_TTL;
      delete process.env.MONITORING_DEFAULT_BATCH_SIZE;
      delete process.env.MONITORING_NAMESPACE;

      const config = new MonitoringCoreEnvConfig();
      const result = MonitoringConfigValidator.validateCoreEnvConfig(config);

      expect(result.warnings.some(w => w.includes('环境变量') && w.includes('未设置，将使用默认值'))).toBe(true);
    });

    it('should warn about small default TTL', () => {
      process.env.MONITORING_DEFAULT_TTL = '30'; // Less than 60

      const config = new MonitoringCoreEnvConfig();
      const result = MonitoringConfigValidator.validateCoreEnvConfig(config);

      expect(result.warnings.some(w => w.includes('默认TTL过小，可能导致缓存效率降低'))).toBe(true);
    });

    it('should warn about small batch size', () => {
      process.env.MONITORING_DEFAULT_BATCH_SIZE = '3'; // Less than 5

      const config = new MonitoringCoreEnvConfig();
      const result = MonitoringConfigValidator.validateCoreEnvConfig(config);

      expect(result.warnings.some(w => w.includes('默认批量大小过小，可能影响处理效率'))).toBe(true);
    });

    it('should warn about large API response threshold', () => {
      process.env.MONITORING_API_RESPONSE_GOOD = '1500'; // Greater than 1000

      const config = new MonitoringCoreEnvConfig();
      const result = MonitoringConfigValidator.validateCoreEnvConfig(config);

      expect(result.warnings.some(w => w.includes('API响应时间阈值过大，可能影响用户体验监控'))).toBe(true);
    });
  });

  describe('validateEnvironmentVariables', () => {
    it('should validate complete environment setup', () => {
      // Set all core environment variables
      process.env.MONITORING_DEFAULT_TTL = '300';
      process.env.MONITORING_DEFAULT_BATCH_SIZE = '10';
      process.env.MONITORING_API_RESPONSE_GOOD = '300';
      process.env.MONITORING_CACHE_HIT_THRESHOLD = '0.8';
      process.env.MONITORING_ERROR_RATE_THRESHOLD = '0.1';
      process.env.MONITORING_AUTO_ANALYSIS = 'true';
      process.env.MONITORING_EVENT_RETRY = '3';
      process.env.MONITORING_NAMESPACE = 'monitoring';

      const result = MonitoringConfigValidator.validateEnvironmentVariables();

      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
      expect(result.recommendations.some(r => r.includes('环境变量配置良好'))).toBe(true);
    });

    it('should detect invalid numeric environment variables', () => {
      process.env.MONITORING_DEFAULT_TTL = 'not_a_number';
      process.env.MONITORING_DEFAULT_BATCH_SIZE = 'invalid';
      process.env.MONITORING_API_RESPONSE_GOOD = 'bad_value';

      const result = MonitoringConfigValidator.validateEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.invalid.length).toBeGreaterThan(0);
      expect(result.invalid.some(inv => inv.includes('期望数字类型'))).toBe(true);
    });

    it('should detect invalid float environment variables', () => {
      process.env.MONITORING_CACHE_HIT_THRESHOLD = 'not_a_float';
      process.env.MONITORING_ERROR_RATE_THRESHOLD = 'invalid_float';

      const result = MonitoringConfigValidator.validateEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.invalid.some(inv => inv.includes('MONITORING_CACHE_HIT_THRESHOLD') && inv.includes('期望数字类型'))).toBe(true);
      expect(result.invalid.some(inv => inv.includes('MONITORING_ERROR_RATE_THRESHOLD') && inv.includes('期望数字类型'))).toBe(true);
    });

    it('should detect invalid boolean environment variables', () => {
      process.env.MONITORING_AUTO_ANALYSIS = 'maybe';

      const result = MonitoringConfigValidator.validateEnvironmentVariables();

      expect(result.isValid).toBe(false);
      expect(result.invalid.some(inv => inv.includes('期望布尔类型'))).toBe(true);
    });

    it('should accept valid boolean values', () => {
      const validBooleans = ['true', 'false', '1', '0', 'yes', 'no'];

      for (const validBoolean of validBooleans) {
        process.env.MONITORING_AUTO_ANALYSIS = validBoolean;

        const result = MonitoringConfigValidator.validateEnvironmentVariables();

        expect(result.invalid.filter(inv => inv.includes('MONITORING_AUTO_ANALYSIS'))).toHaveLength(0);
      }
    });
  });

  describe('detectConfigurationOverlaps', () => {
    it('should detect no overlaps in clean environment', () => {
      // Clear any potential legacy environment variables
      for (const key in process.env) {
        if (key.match(/^MONITORING_(TTL_|BATCH_|ALERT_BATCH_|DATA_BATCH_)/)) {
          delete process.env[key];
        }
      }

      const result = MonitoringConfigValidator.detectConfigurationOverlaps();

      expect(result.hasOverlaps).toBe(false);
      expect(result.overlaps).toHaveLength(0);
      expect(result.resolutions.some(r => r.includes('配置已完全统一'))).toBe(true);
    });

    it('should detect legacy environment variables', () => {
      // Set legacy environment variables
      process.env.MONITORING_TTL_HEALTH = '300';
      process.env.MONITORING_BATCH_SIZE = '10';
      process.env.MONITORING_ALERT_BATCH_SMALL = '5';

      const result = MonitoringConfigValidator.detectConfigurationOverlaps();

      expect(result.hasOverlaps).toBe(true);
      expect(result.overlaps.length).toBeGreaterThan(0);
      expect(result.overlaps.some(o => o.includes('检测到废弃环境变量'))).toBe(true);
      expect(result.resolutions.some(r => r.includes('迁移到统一环境变量系统'))).toBe(true);
    });
  });

  describe('validateCompleteConfiguration', () => {
    it('should perform complete configuration validation', () => {
      const result = MonitoringConfigValidator.validateCompleteConfiguration();

      expect(result).toBeDefined();
      expect(result.results.ttl).toBeDefined();
      expect(result.results.limits).toBeDefined();
      expect(result.results.coreEnv).toBeDefined();
      expect(result.results.environment).toBeDefined();
      expect(result.results.overlaps).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.overallScore).toBeLessThanOrEqual(100);
      expect(result.summary.totalConfigurations).toBe(3);
    });

    it('should calculate correct overall score', () => {
      const result = MonitoringConfigValidator.validateCompleteConfiguration();

      expect(typeof result.summary.overallScore).toBe('number');
      expect(result.summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.overallScore).toBeLessThanOrEqual(100);
    });

    it('should provide appropriate recommendations based on score', () => {
      const result = MonitoringConfigValidator.validateCompleteConfiguration();

      expect(result.summary.recommendations).toBeDefined();
      expect(Array.isArray(result.summary.recommendations)).toBe(true);
      expect(result.summary.recommendations.length).toBeGreaterThan(0);

      // Check for score-based recommendations
      if (result.summary.overallScore >= 90) {
        expect(result.summary.recommendations.some(r => r.includes('配置质量优秀'))).toBe(true);
      } else if (result.summary.overallScore >= 70) {
        expect(result.summary.recommendations.some(r => r.includes('配置质量良好'))).toBe(true);
      } else {
        expect(result.summary.recommendations.some(r => r.includes('配置需要改进'))).toBe(true);
      }
    });

    it('should handle error-heavy scenarios', () => {
      // Set up invalid environment to trigger errors
      process.env.MONITORING_DEFAULT_TTL = 'invalid';
      process.env.MONITORING_CACHE_HIT_THRESHOLD = 'not_a_number';
      process.env.MONITORING_TTL_LEGACY = '300'; // Legacy variable

      const result = MonitoringConfigValidator.validateCompleteConfiguration();

      expect(result.summary.totalErrors).toBeGreaterThan(0);
      expect(result.isValid).toBe(false);
      expect(result.summary.recommendations.some(r => r.includes('修复') && r.includes('配置错误'))).toBe(true);
    });
  });

  describe('generateValidationReport', () => {
    it('should generate comprehensive validation report', () => {
      const validationResult = MonitoringConfigValidator.validateCompleteConfiguration();
      const report = MonitoringConfigValidator.generateValidationReport(validationResult);

      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);

      // Check for report sections
      expect(report).toContain('监控组件配置验证报告');
      expect(report).toContain('总体评分');
      expect(report).toContain('TTL配置验证结果');
      expect(report).toContain('批量限制配置验证结果');
      expect(report).toContain('环境变量验证结果');
      expect(report).toContain('配置重复检测结果');
      expect(report).toContain('建议和总结');
    });

    it('should include appropriate status indicators', () => {
      const validationResult = MonitoringConfigValidator.validateCompleteConfiguration();
      const report = MonitoringConfigValidator.generateValidationReport(validationResult);

      // Check for status indicators
      expect(report).toMatch(/[✅❌]/); // Should contain either success or failure indicators
      expect(report).toMatch(/\d+\/100/); // Should contain score format
    });

    it('should show error and warning details when present', () => {
      // Set up conditions that will generate warnings
      process.env.MONITORING_DEFAULT_TTL = '30'; // Will generate warning

      const validationResult = MonitoringConfigValidator.validateCompleteConfiguration();
      const report = MonitoringConfigValidator.generateValidationReport(validationResult);

      if (validationResult.summary.totalWarnings > 0) {
        expect(report).toContain('⚠️ 警告详情');
      }

      if (validationResult.summary.totalErrors > 0) {
        expect(report).toContain('🚨 错误详情');
      }
    });
  });

  describe('Global validateMonitoringConfiguration function', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should execute validation and print report', () => {
      const result = validateMonitoringConfiguration();

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.summary.configurationName).toBe('Complete Monitoring Configuration');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('监控组件配置验证报告'));
    });

    it('should return proper validation result structure', () => {
      const result = validateMonitoringConfiguration();

      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(typeof result.summary.totalErrors).toBe('number');
      expect(typeof result.summary.totalWarnings).toBe('number');
      expect(typeof result.summary.validatedFields).toBe('number');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle validation errors gracefully', () => {
      const config = new MonitoringUnifiedTtlConfig();

      // Manually create an invalid configuration
      (config as any).health = -1; // Negative value should trigger validation error

      expect(() => {
        MonitoringConfigValidator.validateTtlConfig(config);
      }).not.toThrow();
    });

    it('should handle empty configuration objects', () => {
      const config = new MonitoringUnifiedLimitsConfig();
      config.alertBatch = undefined as any;
      config.systemLimits = undefined as any;

      const result = MonitoringConfigValidator.validateLimitsConfig(config);

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
    });

    it('should handle missing environment variables gracefully', () => {
      // Clear all monitoring environment variables
      for (const key in process.env) {
        if (key.startsWith('MONITORING_')) {
          delete process.env[key];
        }
      }

      const result = MonitoringConfigValidator.validateEnvironmentVariables();

      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.missing)).toBe(true);
      expect(Array.isArray(result.invalid)).toBe(true);
    });
  });

  describe('Score calculation', () => {
    it('should properly calculate scores for different scenarios', () => {
      const result = MonitoringConfigValidator.validateCompleteConfiguration();

      // Score should be between 0 and 100
      expect(result.summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.summary.overallScore).toBeLessThanOrEqual(100);

      // With no errors and warnings, score should be high
      if (result.summary.totalErrors === 0 && result.summary.totalWarnings <= 2) {
        expect(result.summary.overallScore).toBeGreaterThanOrEqual(80);
      }
    });

    it('should decrease score based on errors and warnings', () => {
      // Create configuration with known issues
      process.env.MONITORING_DEFAULT_TTL = 'invalid'; // Error
      process.env.MONITORING_CACHE_HIT_THRESHOLD = 'bad'; // Error
      process.env.MONITORING_TTL_LEGACY = '300'; // Warning (overlap)

      const result = MonitoringConfigValidator.validateCompleteConfiguration();

      // Score should be lower due to errors
      expect(result.summary.overallScore).toBeLessThan(100);
      expect(result.summary.totalErrors).toBeGreaterThan(0);
    });
  });
});
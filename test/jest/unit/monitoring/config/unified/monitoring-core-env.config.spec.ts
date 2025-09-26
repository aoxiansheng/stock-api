/**
 * Monitoring Core Environment Config Unit Tests
 * 测试监控核心环境变量配置的完整性和验证逻辑
 */

import { validate, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  MonitoringCoreEnvConfig,
  MonitoringCoreEnvUtils,
  monitoringCoreEnvConfig,
  type MonitoringCoreEnvType,
} from '@monitoring/config/unified/monitoring-core-env.config';

describe('MonitoringCoreEnvConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new MonitoringCoreEnvConfig();

      expect(config.defaultTtl).toBe(300);
      expect(config.defaultBatchSize).toBe(10);
      expect(config.apiResponseGood).toBe(300);
      expect(config.cacheHitThreshold).toBe(0.8);
      expect(config.errorRateThreshold).toBe(0.1);
      expect(config.autoAnalysis).toBe(true);
      expect(config.eventRetry).toBe(3);
      expect(config.namespace).toBe('monitoring');
    });

    it('should validate default configuration', async () => {
      const config = new MonitoringCoreEnvConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Class Validation', () => {
    describe('defaultTtl validation', () => {
      it('should accept valid defaultTtl values', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { defaultTtl: 600 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.defaultTtl).toBe(600);
      });

      it('should reject defaultTtl below minimum', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { defaultTtl: 0 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('默认TTL最小值为1秒');
      });

      it('should reject defaultTtl above maximum', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { defaultTtl: 3601 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('默认TTL最大值为1小时');
      });

      it('should transform string values to numbers', () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { defaultTtl: '450' });
        expect(config.defaultTtl).toBe(450);
      });

      it('should use default for invalid string values', () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { defaultTtl: 'invalid' });
        expect(config.defaultTtl).toBe(300);
      });
    });

    describe('defaultBatchSize validation', () => {
      it('should accept valid defaultBatchSize values', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { defaultBatchSize: 50 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.defaultBatchSize).toBe(50);
      });

      it('should reject defaultBatchSize below minimum', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { defaultBatchSize: 0 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('默认批量大小最小值为1');
      });

      it('should reject defaultBatchSize above maximum', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { defaultBatchSize: 1001 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('默认批量大小最大值为1000');
      });

      it('should transform and use default for invalid values', () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { defaultBatchSize: 'invalid' });
        expect(config.defaultBatchSize).toBe(10);
      });
    });

    describe('apiResponseGood validation', () => {
      it('should accept valid apiResponseGood values', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { apiResponseGood: 500 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.apiResponseGood).toBe(500);
      });

      it('should reject apiResponseGood below minimum', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { apiResponseGood: 49 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('API响应时间阈值最小值为50毫秒');
      });

      it('should reject apiResponseGood above maximum', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { apiResponseGood: 5001 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('API响应时间阈值最大值为5000毫秒');
      });
    });

    describe('cacheHitThreshold validation', () => {
      it('should accept valid cacheHitThreshold values', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { cacheHitThreshold: 0.9 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.cacheHitThreshold).toBe(0.9);
      });

      it('should reject cacheHitThreshold below minimum', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { cacheHitThreshold: 0.09 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('缓存命中率阈值最小值为0.1');
      });

      it('should reject cacheHitThreshold above maximum', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { cacheHitThreshold: 1.1 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('缓存命中率阈值最大值为1.0');
      });

      it('should transform string to float and use default for invalid values', () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { cacheHitThreshold: 'invalid' });
        expect(config.cacheHitThreshold).toBe(0.8);

        const validConfig = plainToClass(MonitoringCoreEnvConfig, { cacheHitThreshold: '0.95' });
        expect(validConfig.cacheHitThreshold).toBe(0.95);
      });
    });

    describe('errorRateThreshold validation', () => {
      it('should accept valid errorRateThreshold values', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { errorRateThreshold: 0.05 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.errorRateThreshold).toBe(0.05);
      });

      it('should reject errorRateThreshold below minimum', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { errorRateThreshold: 0.009 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('错误率阈值最小值为0.01');
      });

      it('should reject errorRateThreshold above maximum', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { errorRateThreshold: 0.6 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('错误率阈值最大值为0.5');
      });
    });

    describe('autoAnalysis validation', () => {
      it('should accept boolean values', async () => {
        const trueConfig = plainToClass(MonitoringCoreEnvConfig, { autoAnalysis: true });
        const falseConfig = plainToClass(MonitoringCoreEnvConfig, { autoAnalysis: false });

        const trueErrors = await validate(trueConfig);
        const falseErrors = await validate(falseConfig);

        expect(trueErrors).toHaveLength(0);
        expect(falseErrors).toHaveLength(0);
        expect(trueConfig.autoAnalysis).toBe(true);
        expect(falseConfig.autoAnalysis).toBe(false);
      });

      it('should transform string values correctly', () => {
        const trueValues = ['true', '1', 'yes'];
        const falseValues = ['false', '0', 'no'];

        trueValues.forEach(value => {
          const config = plainToClass(MonitoringCoreEnvConfig, { autoAnalysis: value });
          expect(config.autoAnalysis).toBe(true);
        });

        falseValues.forEach(value => {
          const config = plainToClass(MonitoringCoreEnvConfig, { autoAnalysis: value });
          expect(config.autoAnalysis).toBe(false);
        });
      });
    });

    describe('eventRetry validation', () => {
      it('should accept valid eventRetry values', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { eventRetry: 5 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.eventRetry).toBe(5);
      });

      it('should accept zero retry attempts', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { eventRetry: 0 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.eventRetry).toBe(0);
      });

      it('should reject eventRetry above maximum', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { eventRetry: 11 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('事件重试次数最大值为10');
      });
    });

    describe('namespace validation', () => {
      it('should accept valid namespace values', async () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { namespace: 'test_monitoring' });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.namespace).toBe('test_monitoring');
      });

      it('should use default for empty values', () => {
        const config = plainToClass(MonitoringCoreEnvConfig, { namespace: '' });
        expect(config.namespace).toBe('monitoring');
      });
    });
  });

  describe('Environment Adjustment', () => {
    describe('Production Environment', () => {
      it('should adjust configuration for production environment', () => {
        process.env.NODE_ENV = 'production';
        const config = new MonitoringCoreEnvConfig();

        // Set lower values than production minimums
        config.defaultTtl = 100;
        config.defaultBatchSize = 5;
        config.apiResponseGood = 400;
        config.cacheHitThreshold = 0.5;
        config.errorRateThreshold = 0.2;
        config.eventRetry = 1;

        config.adjustForEnvironment();

        expect(config.defaultTtl).toBe(600); // Increased to minimum
        expect(config.defaultBatchSize).toBe(20); // Increased to minimum
        expect(config.apiResponseGood).toBe(200); // Decreased to maximum
        expect(config.cacheHitThreshold).toBe(0.85); // Increased to minimum
        expect(config.errorRateThreshold).toBe(0.05); // Decreased to maximum
        expect(config.eventRetry).toBe(5); // Increased to minimum
        expect(config.namespace).toContain('_prod'); // Production namespace
      });

      it('should not decrease already optimal values in production', () => {
        process.env.NODE_ENV = 'production';
        const config = new MonitoringCoreEnvConfig();

        // Set values already above production minimums
        config.defaultTtl = 800;
        config.defaultBatchSize = 50;
        config.apiResponseGood = 150; // Already below 200
        config.cacheHitThreshold = 0.9; // Already above 0.85
        config.errorRateThreshold = 0.03; // Already below 0.05
        config.eventRetry = 7; // Already above 5

        config.adjustForEnvironment();

        expect(config.defaultTtl).toBe(800); // Unchanged
        expect(config.defaultBatchSize).toBe(50); // Unchanged
        expect(config.apiResponseGood).toBe(150); // Unchanged
        expect(config.cacheHitThreshold).toBe(0.9); // Unchanged
        expect(config.errorRateThreshold).toBe(0.03); // Unchanged
        expect(config.eventRetry).toBe(7); // Unchanged
      });
    });

    describe('Test Environment', () => {
      it('should adjust configuration for test environment', () => {
        process.env.NODE_ENV = 'test';
        const config = new MonitoringCoreEnvConfig();

        // Set higher values than test maximums
        config.defaultTtl = 300;
        config.defaultBatchSize = 20;
        config.apiResponseGood = 300;
        config.cacheHitThreshold = 0.8;
        config.errorRateThreshold = 0.1;
        config.eventRetry = 5;
        config.autoAnalysis = true;

        config.adjustForEnvironment();

        expect(config.defaultTtl).toBe(30); // Decreased to maximum
        expect(config.defaultBatchSize).toBe(5); // Decreased to maximum
        expect(config.apiResponseGood).toBe(100); // Decreased to maximum
        expect(config.cacheHitThreshold).toBe(0.5); // Decreased to maximum
        expect(config.errorRateThreshold).toBe(0.1); // Unchanged (already at threshold)
        expect(config.eventRetry).toBe(1); // Decreased to maximum
        expect(config.autoAnalysis).toBe(false); // Disabled for testing
        expect(config.namespace).toContain('_test'); // Test namespace
      });

      it('should not increase already low values in test', () => {
        process.env.NODE_ENV = 'test';
        const config = new MonitoringCoreEnvConfig();

        // Set values already below test maximums
        config.defaultTtl = 10; // Already below 30
        config.defaultBatchSize = 3; // Already below 5
        config.apiResponseGood = 80; // Already below 100
        config.cacheHitThreshold = 0.3; // Already below 0.5
        config.errorRateThreshold = 0.05; // Already below 0.2
        config.eventRetry = 1; // Already at minimum

        config.adjustForEnvironment();

        expect(config.defaultTtl).toBe(10); // Unchanged
        expect(config.defaultBatchSize).toBe(3); // Unchanged
        expect(config.apiResponseGood).toBe(80); // Unchanged
        expect(config.cacheHitThreshold).toBe(0.3); // Unchanged
        expect(config.errorRateThreshold).toBe(0.05); // Unchanged
        expect(config.eventRetry).toBe(1); // Unchanged
      });
    });

    describe('Development Environment', () => {
      it('should adjust namespace but keep other values for development', () => {
        process.env.NODE_ENV = 'development';
        const config = new MonitoringCoreEnvConfig();

        const originalValues = {
          defaultTtl: config.defaultTtl,
          defaultBatchSize: config.defaultBatchSize,
          apiResponseGood: config.apiResponseGood,
          cacheHitThreshold: config.cacheHitThreshold,
          errorRateThreshold: config.errorRateThreshold,
          eventRetry: config.eventRetry,
          autoAnalysis: config.autoAnalysis,
        };

        config.adjustForEnvironment();

        expect(config.defaultTtl).toBe(originalValues.defaultTtl);
        expect(config.defaultBatchSize).toBe(originalValues.defaultBatchSize);
        expect(config.apiResponseGood).toBe(originalValues.apiResponseGood);
        expect(config.cacheHitThreshold).toBe(originalValues.cacheHitThreshold);
        expect(config.errorRateThreshold).toBe(originalValues.errorRateThreshold);
        expect(config.eventRetry).toBe(originalValues.eventRetry);
        expect(config.autoAnalysis).toBe(originalValues.autoAnalysis);
        expect(config.namespace).toContain('_dev'); // Development namespace
      });

      it('should not modify namespace if it already has suffix', () => {
        process.env.NODE_ENV = 'development';
        const config = new MonitoringCoreEnvConfig();
        config.namespace = 'monitoring_custom';

        config.adjustForEnvironment();

        expect(config.namespace).toBe('monitoring_custom'); // Unchanged
      });
    });

    describe('Default Environment', () => {
      it('should treat undefined NODE_ENV as development', () => {
        delete process.env.NODE_ENV;
        const config = new MonitoringCoreEnvConfig();

        config.adjustForEnvironment();

        expect(config.namespace).toContain('_dev');
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      const config = new MonitoringCoreEnvConfig();
      const result = config.validateConfiguration();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid TTL range', () => {
      const config = new MonitoringCoreEnvConfig();
      config.defaultTtl = -1;

      const result = config.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('默认TTL必须在1-3600秒之间'))).toBe(true);
    });

    it('should detect invalid batch size range', () => {
      const config = new MonitoringCoreEnvConfig();
      config.defaultBatchSize = 1001;

      const result = config.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('默认批量大小必须在1-1000之间'))).toBe(true);
    });

    it('should detect invalid API response time range', () => {
      const config = new MonitoringCoreEnvConfig();
      config.apiResponseGood = 10000;

      const result = config.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('API响应时间阈值必须在50-5000毫秒之间'))).toBe(true);
    });

    it('should detect invalid cache hit threshold range', () => {
      const config = new MonitoringCoreEnvConfig();
      config.cacheHitThreshold = 1.5;

      const result = config.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('缓存命中率阈值必须在0.1-1.0之间'))).toBe(true);
    });

    it('should detect invalid error rate threshold range', () => {
      const config = new MonitoringCoreEnvConfig();
      config.errorRateThreshold = 0.8;

      const result = config.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('错误率阈值必须在0.01-0.5之间'))).toBe(true);
    });

    it('should detect invalid event retry range', () => {
      const config = new MonitoringCoreEnvConfig();
      config.eventRetry = 15;

      const result = config.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('事件重试次数必须在0-10之间'))).toBe(true);
    });

    it('should detect invalid namespace length', () => {
      const config = new MonitoringCoreEnvConfig();
      config.namespace = '';

      const result = config.validateConfiguration();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('命名空间长度必须在1-50字符之间'))).toBe(true);
    });
  });

  describe('Configuration Getters', () => {
    describe('getTtlConfig', () => {
      it('should calculate TTL values based on multipliers', () => {
        const config = new MonitoringCoreEnvConfig();
        config.defaultTtl = 600;

        const ttlConfig = config.getTtlConfig();

        expect(ttlConfig.health).toBe(600); // 1.0x
        expect(ttlConfig.trend).toBe(1200); // 2.0x
        expect(ttlConfig.performance).toBe(360); // 0.6x
        expect(ttlConfig.alert).toBe(120); // 0.2x
        expect(ttlConfig.cacheStats).toBe(240); // 0.4x
      });

      it('should floor fractional values', () => {
        const config = new MonitoringCoreEnvConfig();
        config.defaultTtl = 333; // Will create fractions when multiplied

        const ttlConfig = config.getTtlConfig();

        expect(ttlConfig.performance).toBe(Math.floor(333 * 0.6)); // Should be floored
        expect(ttlConfig.alert).toBe(Math.floor(333 * 0.2)); // Should be floored
        expect(ttlConfig.cacheStats).toBe(Math.floor(333 * 0.4)); // Should be floored
      });
    });

    describe('getBatchConfig', () => {
      it('should calculate batch sizes based on multipliers', () => {
        const config = new MonitoringCoreEnvConfig();
        config.defaultBatchSize = 20;

        const batchConfig = config.getBatchConfig();

        expect(batchConfig.alertBatch.small).toBe(10); // 0.5x
        expect(batchConfig.alertBatch.medium).toBe(20); // 1.0x
        expect(batchConfig.alertBatch.large).toBe(40); // 2.0x
        expect(batchConfig.dataProcessingBatch.standard).toBe(20); // 1.0x
        expect(batchConfig.dataProcessingBatch.highFrequency).toBe(100); // 5.0x
        expect(batchConfig.dataCleanupBatch.standard).toBe(2000); // 100x
      });

      it('should ensure minimum of 1 for small batch', () => {
        const config = new MonitoringCoreEnvConfig();
        config.defaultBatchSize = 1;

        const batchConfig = config.getBatchConfig();

        expect(batchConfig.alertBatch.small).toBe(1); // Max(1, floor(1 * 0.5))
      });
    });

    describe('getPerformanceThresholds', () => {
      it('should calculate performance thresholds based on API response time', () => {
        const config = new MonitoringCoreEnvConfig();
        config.apiResponseGood = 200;

        const thresholds = config.getPerformanceThresholds();

        expect(thresholds.p95Warning).toBe(200); // 1.0x
        expect(thresholds.p99Critical).toBe(500); // 2.5x floored
        expect(thresholds.slowRequestThreshold).toBe(400); // 2.0x
      });
    });

    describe('getCacheConfig', () => {
      it('should generate cache configuration', () => {
        const config = new MonitoringCoreEnvConfig();
        config.namespace = 'test_monitoring';
        config.cacheHitThreshold = 0.9;

        const cacheConfig = config.getCacheConfig();

        expect(cacheConfig.namespace).toBe('test_monitoring');
        expect(cacheConfig.keyIndexPrefix).toBe('test_monitoring:index');
        expect(cacheConfig.hitRateThreshold).toBe(0.9);
        expect(cacheConfig.compressionThreshold).toBe(2048); // Fixed value
      });
    });

    describe('getEventConfig', () => {
      it('should generate event configuration', () => {
        const config = new MonitoringCoreEnvConfig();
        config.autoAnalysis = false;
        config.eventRetry = 5;
        config.errorRateThreshold = 0.05;

        const eventConfig = config.getEventConfig();

        expect(eventConfig.enableAutoAnalysis).toBe(false);
        expect(eventConfig.retryAttempts).toBe(5);
        expect(eventConfig.errorRateThreshold).toBe(0.05);
      });
    });
  });

  describe('monitoringCoreEnvConfig Factory', () => {
    it('should create configuration from environment variables', () => {
      process.env.MONITORING_DEFAULT_TTL = '600';
      process.env.MONITORING_DEFAULT_BATCH_SIZE = '25';
      process.env.MONITORING_API_RESPONSE_GOOD = '250';
      process.env.MONITORING_CACHE_HIT_THRESHOLD = '0.9';
      process.env.MONITORING_ERROR_RATE_THRESHOLD = '0.05';
      process.env.MONITORING_AUTO_ANALYSIS = 'false';
      process.env.MONITORING_EVENT_RETRY = '5';
      process.env.MONITORING_NAMESPACE = 'test_monitoring';

      const config = monitoringCoreEnvConfig();

      expect(config.defaultTtl).toBe(600);
      expect(config.defaultBatchSize).toBe(25);
      expect(config.apiResponseGood).toBe(250);
      expect(config.cacheHitThreshold).toBe(0.9);
      expect(config.errorRateThreshold).toBe(0.05);
      expect(config.autoAnalysis).toBe(false);
      expect(config.eventRetry).toBe(5);
      expect(config.namespace).toBe('test_monitoring');
    });

    it('should handle undefined environment variables with defaults', () => {
      // Clear environment variables
      delete process.env.MONITORING_DEFAULT_TTL;
      delete process.env.MONITORING_DEFAULT_BATCH_SIZE;
      delete process.env.MONITORING_AUTO_ANALYSIS;

      const config = monitoringCoreEnvConfig();

      expect(config.defaultTtl).toBe(300); // Default value
      expect(config.defaultBatchSize).toBe(10); // Default value
      expect(config.autoAnalysis).toBe(true); // Default value
    });

    it('should throw validation errors for invalid environment variables', () => {
      process.env.MONITORING_DEFAULT_TTL = 'invalid';
      process.env.MONITORING_DEFAULT_BATCH_SIZE = '0';

      expect(() => monitoringCoreEnvConfig()).toThrow();
    });

    it('should adjust configuration for environment after creation', () => {
      process.env.NODE_ENV = 'production';
      process.env.MONITORING_DEFAULT_TTL = '100'; // Will be adjusted to 600

      const config = monitoringCoreEnvConfig();

      expect(config.defaultTtl).toBe(600); // Adjusted for production
    });
  });
});

describe('MonitoringCoreEnvUtils', () => {
  describe('getEnvironmentVariableMapping', () => {
    it('should return correct environment variable mapping', () => {
      const mapping = MonitoringCoreEnvUtils.getEnvironmentVariableMapping();

      expect(mapping.defaultTtl).toBe('MONITORING_DEFAULT_TTL');
      expect(mapping.defaultBatchSize).toBe('MONITORING_DEFAULT_BATCH_SIZE');
      expect(mapping.apiResponseGood).toBe('MONITORING_API_RESPONSE_GOOD');
      expect(mapping.cacheHitThreshold).toBe('MONITORING_CACHE_HIT_THRESHOLD');
      expect(mapping.errorRateThreshold).toBe('MONITORING_ERROR_RATE_THRESHOLD');
      expect(mapping.autoAnalysis).toBe('MONITORING_AUTO_ANALYSIS');
      expect(mapping.eventRetry).toBe('MONITORING_EVENT_RETRY');
      expect(mapping.namespace).toBe('MONITORING_NAMESPACE');
    });
  });

  describe('getUnificationSummary', () => {
    it('should provide unification benefits summary', () => {
      const summary = MonitoringCoreEnvUtils.getUnificationSummary();

      expect(summary.coreVariables).toHaveLength(3);
      expect(summary.totalReduced).toBe(3);
      expect(summary.reductionPercentage).toBe(70);
      expect(summary.benefits).toHaveLength(4);
      expect(summary.benefits.some(b => b.includes('配置复杂度大幅降低'))).toBe(true);
    });
  });

  describe('getRecommendedConfig', () => {
    it('should return production-optimized configuration', () => {
      const config = MonitoringCoreEnvUtils.getRecommendedConfig('production');

      expect(config.defaultTtl).toBeGreaterThanOrEqual(600);
      expect(config.defaultBatchSize).toBeGreaterThanOrEqual(20);
      expect(config.cacheHitThreshold).toBeGreaterThanOrEqual(0.85);
      expect(config.errorRateThreshold).toBeLessThanOrEqual(0.05);
      expect(config.eventRetry).toBeGreaterThanOrEqual(5);
      expect(config.namespace).toContain('_prod');
    });

    it('should return test-optimized configuration', () => {
      const config = MonitoringCoreEnvUtils.getRecommendedConfig('test');

      expect(config.defaultTtl).toBeLessThanOrEqual(30);
      expect(config.defaultBatchSize).toBeLessThanOrEqual(5);
      expect(config.cacheHitThreshold).toBeLessThanOrEqual(0.5);
      expect(config.errorRateThreshold).toBeLessThanOrEqual(0.2);
      expect(config.eventRetry).toBeLessThanOrEqual(1);
      expect(config.autoAnalysis).toBe(false);
      expect(config.namespace).toContain('_test');
    });

    it('should return development configuration', () => {
      const config = MonitoringCoreEnvUtils.getRecommendedConfig('development');

      expect(config.namespace).toContain('_dev');
      // Development should have middle-ground values
      expect(config.defaultTtl).toBeGreaterThan(30);
      expect(config.defaultTtl).toBeLessThan(600);
    });

    it('should not affect global NODE_ENV', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      MonitoringCoreEnvUtils.getRecommendedConfig('production');

      expect(process.env.NODE_ENV).toBe('development');
    });
  });

  describe('validateEnvironmentValue', () => {
    it('should validate MONITORING_DEFAULT_TTL values', () => {
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_DEFAULT_TTL', '300').isValid).toBe(true);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_DEFAULT_TTL', '0').isValid).toBe(false);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_DEFAULT_TTL', '4000').isValid).toBe(false);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_DEFAULT_TTL', 'invalid').isValid).toBe(false);
    });

    it('should validate MONITORING_DEFAULT_BATCH_SIZE values', () => {
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_DEFAULT_BATCH_SIZE', '10').isValid).toBe(true);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_DEFAULT_BATCH_SIZE', '0').isValid).toBe(false);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_DEFAULT_BATCH_SIZE', '1001').isValid).toBe(false);
    });

    it('should validate MONITORING_API_RESPONSE_GOOD values', () => {
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_API_RESPONSE_GOOD', '300').isValid).toBe(true);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_API_RESPONSE_GOOD', '49').isValid).toBe(false);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_API_RESPONSE_GOOD', '5001').isValid).toBe(false);
    });

    it('should validate MONITORING_CACHE_HIT_THRESHOLD values', () => {
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_CACHE_HIT_THRESHOLD', '0.8').isValid).toBe(true);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_CACHE_HIT_THRESHOLD', '0.09').isValid).toBe(false);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_CACHE_HIT_THRESHOLD', '1.1').isValid).toBe(false);
    });

    it('should validate MONITORING_ERROR_RATE_THRESHOLD values', () => {
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_ERROR_RATE_THRESHOLD', '0.1').isValid).toBe(true);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_ERROR_RATE_THRESHOLD', '0.009').isValid).toBe(false);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_ERROR_RATE_THRESHOLD', '0.6').isValid).toBe(false);
    });

    it('should validate MONITORING_AUTO_ANALYSIS values', () => {
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_AUTO_ANALYSIS', 'true').isValid).toBe(true);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_AUTO_ANALYSIS', 'false').isValid).toBe(true);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_AUTO_ANALYSIS', '1').isValid).toBe(true);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_AUTO_ANALYSIS', '0').isValid).toBe(true);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_AUTO_ANALYSIS', 'maybe').isValid).toBe(false);
    });

    it('should validate MONITORING_EVENT_RETRY values', () => {
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_EVENT_RETRY', '3').isValid).toBe(true);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_EVENT_RETRY', '0').isValid).toBe(true);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_EVENT_RETRY', '11').isValid).toBe(false);
    });

    it('should validate MONITORING_NAMESPACE values', () => {
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_NAMESPACE', 'monitoring').isValid).toBe(true);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_NAMESPACE', '').isValid).toBe(false);
      expect(MonitoringCoreEnvUtils.validateEnvironmentValue('MONITORING_NAMESPACE', 'a'.repeat(51)).isValid).toBe(false);
    });

    it('should handle unknown environment variables', () => {
      const result = MonitoringCoreEnvUtils.validateEnvironmentValue('UNKNOWN_VAR', 'value');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('未知的环境变量');
    });
  });

  describe('generateExampleConfig', () => {
    it('should generate production example configuration', () => {
      const example = MonitoringCoreEnvUtils.generateExampleConfig('production');

      expect(example).toContain('PRODUCTION环境');
      expect(example).toContain('MONITORING_DEFAULT_TTL=');
      expect(example).toContain('MONITORING_DEFAULT_BATCH_SIZE=');
      expect(example).toContain('MONITORING_AUTO_ANALYSIS=');
      expect(example).toContain('统一配置系统');
      expect(example).toContain('自动计算');
    });

    it('should generate test example configuration', () => {
      const example = MonitoringCoreEnvUtils.generateExampleConfig('test');

      expect(example).toContain('TEST环境');
      expect(example).toContain('MONITORING_AUTO_ANALYSIS=false');
    });

    it('should generate development example configuration', () => {
      const example = MonitoringCoreEnvUtils.generateExampleConfig('development');

      expect(example).toContain('DEVELOPMENT环境');
    });

    it('should include helpful comments and descriptions', () => {
      const example = MonitoringCoreEnvUtils.generateExampleConfig('production');

      expect(example).toContain('# 1. 基础TTL时间');
      expect(example).toContain('# 2. 基础批量大小');
      expect(example).toContain('# 3. 自动分析功能开关');
      expect(example).toContain('自动计算');
    });
  });
});

describe('Type Exports', () => {
  it('should export MonitoringCoreEnvType correctly', () => {
    const config: MonitoringCoreEnvType = new MonitoringCoreEnvConfig();

    expect(config.defaultTtl).toBeDefined();
    expect(config.defaultBatchSize).toBeDefined();
    expect(config.apiResponseGood).toBeDefined();
    expect(config.cacheHitThreshold).toBeDefined();
    expect(config.errorRateThreshold).toBeDefined();
    expect(config.autoAnalysis).toBeDefined();
    expect(config.eventRetry).toBeDefined();
    expect(config.namespace).toBeDefined();
  });
});
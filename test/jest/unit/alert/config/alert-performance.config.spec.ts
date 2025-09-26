import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AlertPerformanceConfig, default as alertPerformanceConfig } from '@alert/config/alert-performance.config';
import { BusinessErrorCode } from '@common/core/exceptions';

describe('AlertPerformanceConfig', () => {
  let config: AlertPerformanceConfig;

  beforeEach(async () => {
    // 清理环境变量以确保使用默认值
    delete process.env.ALERT_MAX_CONCURRENCY;
    delete process.env.ALERT_QUEUE_SIZE_LIMIT;
    delete process.env.ALERT_RATE_LIMIT_PER_MINUTE;
    delete process.env.ALERT_BATCH_SIZE;
    delete process.env.ALERT_CONNECTION_POOL_SIZE;

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
    }).compile();

    config = new AlertPerformanceConfig();
  });

  afterEach(() => {
    // 清理环境变量
    delete process.env.ALERT_MAX_CONCURRENCY;
    delete process.env.ALERT_QUEUE_SIZE_LIMIT;
    delete process.env.ALERT_RATE_LIMIT_PER_MINUTE;
    delete process.env.ALERT_BATCH_SIZE;
    delete process.env.ALERT_CONNECTION_POOL_SIZE;
  });

  describe('constructor', () => {
    it('should create instance with default values', () => {
      expect(config).toBeDefined();
      expect(config.maxConcurrency).toBe(5);
      expect(config.queueSizeLimit).toBe(100);
      expect(config.rateLimitPerMinute).toBe(100);
      expect(config.batchSize).toBe(100);
      expect(config.connectionPoolSize).toBe(10);
    });

    it('should use environment variables when provided', () => {
      process.env.ALERT_MAX_CONCURRENCY = '10';
      process.env.ALERT_QUEUE_SIZE_LIMIT = '200';
      process.env.ALERT_RATE_LIMIT_PER_MINUTE = '150';
      process.env.ALERT_BATCH_SIZE = '50';
      process.env.ALERT_CONNECTION_POOL_SIZE = '20';

      const envConfig = new AlertPerformanceConfig();

      expect(envConfig.maxConcurrency).toBe(10);
      expect(envConfig.queueSizeLimit).toBe(200);
      expect(envConfig.rateLimitPerMinute).toBe(150);
      expect(envConfig.batchSize).toBe(50);
      expect(envConfig.connectionPoolSize).toBe(20);
    });

    it('should use default values for invalid environment variables', () => {
      process.env.ALERT_MAX_CONCURRENCY = 'invalid';
      process.env.ALERT_QUEUE_SIZE_LIMIT = 'not-a-number';

      const invalidConfig = new AlertPerformanceConfig();

      expect(invalidConfig.maxConcurrency).toBe(5);
      expect(invalidConfig.queueSizeLimit).toBe(100);
    });
  });

  describe('validation', () => {
    describe('maxConcurrency', () => {
      it('should accept valid values', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { maxConcurrency: 10 });
        const errors = validateSync(testConfig);
        const maxConcurrencyErrors = errors.filter(e => e.property === 'maxConcurrency');
        expect(maxConcurrencyErrors).toHaveLength(0);
      });

      it('should reject values below minimum', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { maxConcurrency: 0 });
        const errors = validateSync(testConfig);
        const maxConcurrencyErrors = errors.filter(e => e.property === 'maxConcurrency');
        expect(maxConcurrencyErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { maxConcurrency: 100 });
        const errors = validateSync(testConfig);
        const maxConcurrencyErrors = errors.filter(e => e.property === 'maxConcurrency');
        expect(maxConcurrencyErrors.length).toBeGreaterThan(0);
      });

      it('should reject non-numeric values', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { maxConcurrency: 'invalid' });
        const errors = validateSync(testConfig);
        const maxConcurrencyErrors = errors.filter(e => e.property === 'maxConcurrency');
        expect(maxConcurrencyErrors.length).toBeGreaterThan(0);
      });
    });

    describe('queueSizeLimit', () => {
      it('should accept valid values', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { queueSizeLimit: 500 });
        const errors = validateSync(testConfig);
        const queueErrors = errors.filter(e => e.property === 'queueSizeLimit');
        expect(queueErrors).toHaveLength(0);
      });

      it('should reject values below minimum', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { queueSizeLimit: 5 });
        const errors = validateSync(testConfig);
        const queueErrors = errors.filter(e => e.property === 'queueSizeLimit');
        expect(queueErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { queueSizeLimit: 2000 });
        const errors = validateSync(testConfig);
        const queueErrors = errors.filter(e => e.property === 'queueSizeLimit');
        expect(queueErrors.length).toBeGreaterThan(0);
      });
    });

    describe('rateLimitPerMinute', () => {
      it('should accept valid values', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { rateLimitPerMinute: 200 });
        const errors = validateSync(testConfig);
        const rateErrors = errors.filter(e => e.property === 'rateLimitPerMinute');
        expect(rateErrors).toHaveLength(0);
      });

      it('should reject values below minimum', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { rateLimitPerMinute: 0 });
        const errors = validateSync(testConfig);
        const rateErrors = errors.filter(e => e.property === 'rateLimitPerMinute');
        expect(rateErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { rateLimitPerMinute: 2000 });
        const errors = validateSync(testConfig);
        const rateErrors = errors.filter(e => e.property === 'rateLimitPerMinute');
        expect(rateErrors.length).toBeGreaterThan(0);
      });
    });

    describe('batchSize', () => {
      it('should accept valid values', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { batchSize: 50 });
        const errors = validateSync(testConfig);
        const batchErrors = errors.filter(e => e.property === 'batchSize');
        expect(batchErrors).toHaveLength(0);
      });

      it('should reject values below minimum', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { batchSize: 0 });
        const errors = validateSync(testConfig);
        const batchErrors = errors.filter(e => e.property === 'batchSize');
        expect(batchErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { batchSize: 2000 });
        const errors = validateSync(testConfig);
        const batchErrors = errors.filter(e => e.property === 'batchSize');
        expect(batchErrors.length).toBeGreaterThan(0);
      });
    });

    describe('connectionPoolSize', () => {
      it('should accept valid values', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { connectionPoolSize: 25 });
        const errors = validateSync(testConfig);
        const poolErrors = errors.filter(e => e.property === 'connectionPoolSize');
        expect(poolErrors).toHaveLength(0);
      });

      it('should reject values below minimum', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { connectionPoolSize: 0 });
        const errors = validateSync(testConfig);
        const poolErrors = errors.filter(e => e.property === 'connectionPoolSize');
        expect(poolErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', () => {
        const testConfig = plainToClass(AlertPerformanceConfig, { connectionPoolSize: 100 });
        const errors = validateSync(testConfig);
        const poolErrors = errors.filter(e => e.property === 'connectionPoolSize');
        expect(poolErrors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('integration', () => {
    it('should create valid configuration with all default values', () => {
      const errors = validateSync(config);
      expect(errors).toHaveLength(0);
    });

    it('should create valid configuration with environment variables', () => {
      process.env.ALERT_MAX_CONCURRENCY = '15';
      process.env.ALERT_QUEUE_SIZE_LIMIT = '300';
      process.env.ALERT_RATE_LIMIT_PER_MINUTE = '250';
      process.env.ALERT_BATCH_SIZE = '75';
      process.env.ALERT_CONNECTION_POOL_SIZE = '30';

      const envConfig = new AlertPerformanceConfig();
      const errors = validateSync(envConfig);

      expect(errors).toHaveLength(0);
      expect(envConfig.maxConcurrency).toBe(15);
      expect(envConfig.queueSizeLimit).toBe(300);
      expect(envConfig.rateLimitPerMinute).toBe(250);
      expect(envConfig.batchSize).toBe(75);
      expect(envConfig.connectionPoolSize).toBe(30);
    });

    it('should handle partial environment variables correctly', () => {
      process.env.ALERT_MAX_CONCURRENCY = '8';
      process.env.ALERT_BATCH_SIZE = '60';

      const partialConfig = new AlertPerformanceConfig();
      const errors = validateSync(partialConfig);

      expect(errors).toHaveLength(0);
      expect(partialConfig.maxConcurrency).toBe(8); // From env
      expect(partialConfig.queueSizeLimit).toBe(100); // Default
      expect(partialConfig.rateLimitPerMinute).toBe(100); // Default
      expect(partialConfig.batchSize).toBe(60); // From env
      expect(partialConfig.connectionPoolSize).toBe(10); // Default
    });
  });

  describe('error handling', () => {
    it('should throw exception when validation fails', () => {
      // 设置无效的环境变量以触发验证错误
      process.env.ALERT_MAX_CONCURRENCY = '100'; // 超过最大值50

      expect(() => {
        alertPerformanceConfig();
      }).toThrow();
    });

    it('should include validation errors in exception context', () => {
      // 设置多个无效的环境变量以触发多个验证错误
      process.env.ALERT_MAX_CONCURRENCY = '100'; // 超过最大值50
      process.env.ALERT_BATCH_SIZE = '2000'; // 超过最大值1000

      try {
        alertPerformanceConfig();
        // 如果没有抛出异常，则失败测试
        expect(true).toBe(false); // 这行代码应该不会执行
      } catch (error) {
        expect(error.message).toContain('Alert performance configuration validation failed');
        expect(error.context).toBeDefined();
        expect(error.context.validationErrors).toBeDefined();
      }
    });
  });
});

export { alertPerformanceConfig };
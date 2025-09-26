import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { AlertCacheConfigValidation, default as alertCacheConfig } from '@alert/config/alert-cache.config';
import { BusinessErrorCode } from '@common/core/exceptions';

describe('AlertCacheConfigValidation', () => {
  let config: AlertCacheConfigValidation;

  beforeEach(async () => {
    // 清理环境变量以确保使用默认值
    delete process.env.ALERT_CACHE_ACTIVE_TTL;
    delete process.env.ALERT_CACHE_HISTORICAL_TTL;
    delete process.env.ALERT_CACHE_COOLDOWN_TTL;
    delete process.env.ALERT_CACHE_CONFIG_TTL;
    delete process.env.ALERT_CACHE_STATS_TTL;
    delete process.env.ALERT_BATCH_SIZE;
    delete process.env.ALERT_MAX_BATCH_PROCESSING;
    delete process.env.ALERT_LARGE_BATCH_SIZE;
    delete process.env.ALERT_MAX_ACTIVE_ALERTS;
    delete process.env.ALERT_CACHE_COMPRESSION_THRESHOLD;
    delete process.env.ALERT_CACHE_COMPRESSION_ENABLED;
    delete process.env.ALERT_CACHE_MAX_MEMORY_MB;
    delete process.env.ALERT_CACHE_MAX_KEY_LENGTH;

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
    }).compile();

    config = new AlertCacheConfigValidation();
  });

  afterEach(() => {
    // 清理环境变量
    delete process.env.ALERT_CACHE_ACTIVE_TTL;
    delete process.env.ALERT_CACHE_HISTORICAL_TTL;
    delete process.env.ALERT_CACHE_COOLDOWN_TTL;
    delete process.env.ALERT_CACHE_CONFIG_TTL;
    delete process.env.ALERT_CACHE_STATS_TTL;
    delete process.env.ALERT_BATCH_SIZE;
    delete process.env.ALERT_MAX_BATCH_PROCESSING;
    delete process.env.ALERT_LARGE_BATCH_SIZE;
    delete process.env.ALERT_MAX_ACTIVE_ALERTS;
    delete process.env.ALERT_CACHE_COMPRESSION_THRESHOLD;
    delete process.env.ALERT_CACHE_COMPRESSION_ENABLED;
    delete process.env.ALERT_CACHE_MAX_MEMORY_MB;
    delete process.env.ALERT_CACHE_MAX_KEY_LENGTH;
  });

  describe('AlertCacheConfigValidation class', () => {
    it('should create instance with default values', () => {
      expect(config).toBeDefined();
      // TTL配置默认值
      expect(config.activeDataTtl).toBe(300);
      expect(config.historicalDataTtl).toBe(3600);
      expect(config.cooldownTtl).toBe(300);
      expect(config.configCacheTtl).toBe(600);
      expect(config.statsCacheTtl).toBe(300);
      
      // 批处理配置默认值
      expect(config.batchSize).toBe(100);
      expect(config.maxBatchProcessing).toBe(1000);
      expect(config.largeBatchSize).toBe(1000);
      expect(config.maxActiveAlerts).toBe(10000);
      
      // 性能配置默认值
      expect(config.compressionThreshold).toBe(2048);
      expect(config.compressionEnabled).toBe(true);
      expect(config.maxCacheMemoryMB).toBe(128);
      expect(config.maxKeyLength).toBe(256);
    });
  });

  describe('alertCache configuration factory', () => {
    it('should create configuration with default values', () => {
      const config = alertCacheConfig();
      expect(config).toBeDefined();
      // TTL配置默认值
      expect(config.activeDataTtl).toBe(300);
      expect(config.historicalDataTtl).toBe(3600);
      expect(config.cooldownTtl).toBe(300);
      expect(config.configCacheTtl).toBe(600);
      expect(config.statsCacheTtl).toBe(300);
      
      // 批处理配置默认值
      expect(config.batchSize).toBe(100);
      expect(config.maxBatchProcessing).toBe(1000);
      expect(config.largeBatchSize).toBe(1000);
      expect(config.maxActiveAlerts).toBe(10000);
      
      // 性能配置默认值
      expect(config.compressionThreshold).toBe(2048);
      expect(config.compressionEnabled).toBe(true);
      expect(config.maxCacheMemoryMB).toBe(128);
      expect(config.maxKeyLength).toBe(256);
    });

    it('should use environment variables when provided', () => {
      // 设置环境变量
      process.env.ALERT_CACHE_ACTIVE_TTL = '600';
      process.env.ALERT_CACHE_HISTORICAL_TTL = '7200';
      process.env.ALERT_CACHE_COOLDOWN_TTL = '600';
      process.env.ALERT_CACHE_CONFIG_TTL = '1200';
      process.env.ALERT_CACHE_STATS_TTL = '600';
      process.env.ALERT_BATCH_SIZE = '200';
      process.env.ALERT_MAX_BATCH_PROCESSING = '2000';
      process.env.ALERT_LARGE_BATCH_SIZE = '2000';
      process.env.ALERT_MAX_ACTIVE_ALERTS = '20000';
      process.env.ALERT_CACHE_COMPRESSION_THRESHOLD = '4096';
      process.env.ALERT_CACHE_COMPRESSION_ENABLED = 'false';
      process.env.ALERT_CACHE_MAX_MEMORY_MB = '256';
      process.env.ALERT_CACHE_MAX_KEY_LENGTH = '512';

      const config = alertCacheConfig();

      expect(config.activeDataTtl).toBe(600);
      expect(config.historicalDataTtl).toBe(7200);
      expect(config.cooldownTtl).toBe(600);
      expect(config.configCacheTtl).toBe(1200);
      expect(config.statsCacheTtl).toBe(600);
      expect(config.batchSize).toBe(200);
      expect(config.maxBatchProcessing).toBe(2000);
      expect(config.largeBatchSize).toBe(2000);
      expect(config.maxActiveAlerts).toBe(20000);
      expect(config.compressionThreshold).toBe(4096);
      expect(config.compressionEnabled).toBe(false);
      expect(config.maxCacheMemoryMB).toBe(256);
      expect(config.maxKeyLength).toBe(512);
    });

    it('should use default values for invalid environment variables', () => {
      process.env.ALERT_CACHE_ACTIVE_TTL = 'invalid';
      process.env.ALERT_BATCH_SIZE = 'not-a-number';

      const config = alertCacheConfig();

      expect(config.activeDataTtl).toBe(300); // 默认值
      expect(config.batchSize).toBe(100); // 默认值
    });
  });

  describe('TTL validation', () => {
    describe('activeDataTtl', () => {
      it('should accept valid values', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { activeDataTtl: 600 });
        const errors = await validate(testConfig);
        const ttlErrors = errors.filter(e => e.property === 'activeDataTtl');
        expect(ttlErrors).toHaveLength(0);
      });

      it('should reject values below minimum', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { activeDataTtl: 30 });
        const errors = await validate(testConfig);
        const ttlErrors = errors.filter(e => e.property === 'activeDataTtl');
        expect(ttlErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { activeDataTtl: 10000 });
        const errors = await validate(testConfig);
        const ttlErrors = errors.filter(e => e.property === 'activeDataTtl');
        expect(ttlErrors.length).toBeGreaterThan(0);
      });
    });

    describe('historicalDataTtl', () => {
      it('should accept valid values', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { historicalDataTtl: 7200 });
        const errors = await validate(testConfig);
        const ttlErrors = errors.filter(e => e.property === 'historicalDataTtl');
        expect(ttlErrors).toHaveLength(0);
      });

      it('should reject values below minimum', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { historicalDataTtl: 100 });
        const errors = await validate(testConfig);
        const ttlErrors = errors.filter(e => e.property === 'historicalDataTtl');
        expect(ttlErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { historicalDataTtl: 100000 });
        const errors = await validate(testConfig);
        const ttlErrors = errors.filter(e => e.property === 'historicalDataTtl');
        expect(ttlErrors.length).toBeGreaterThan(0);
      });
    });

    describe('cooldownTtl', () => {
      it('should accept valid values', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { cooldownTtl: 600 });
        const errors = await validate(testConfig);
        const ttlErrors = errors.filter(e => e.property === 'cooldownTtl');
        expect(ttlErrors).toHaveLength(0);
      });

      it('should reject values below minimum', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { cooldownTtl: 30 });
        const errors = await validate(testConfig);
        const ttlErrors = errors.filter(e => e.property === 'cooldownTtl');
        expect(ttlErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { cooldownTtl: 10000 });
        const errors = await validate(testConfig);
        const ttlErrors = errors.filter(e => e.property === 'cooldownTtl');
        expect(ttlErrors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('batch processing validation', () => {
    describe('batchSize', () => {
      it('should accept valid values', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { batchSize: 500 });
        const errors = await validate(testConfig);
        const batchErrors = errors.filter(e => e.property === 'batchSize');
        expect(batchErrors).toHaveLength(0);
      });

      it('should reject values below minimum', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { batchSize: 5 });
        const errors = await validate(testConfig);
        const batchErrors = errors.filter(e => e.property === 'batchSize');
        expect(batchErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { batchSize: 2000 });
        const errors = await validate(testConfig);
        const batchErrors = errors.filter(e => e.property === 'batchSize');
        expect(batchErrors.length).toBeGreaterThan(0);
      });
    });

    describe('maxBatchProcessing', () => {
      it('should accept valid values', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { maxBatchProcessing: 5000 });
        const errors = await validate(testConfig);
        const batchErrors = errors.filter(e => e.property === 'maxBatchProcessing');
        expect(batchErrors).toHaveLength(0);
      });

      it('should reject values below minimum', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { maxBatchProcessing: 50 });
        const errors = await validate(testConfig);
        const batchErrors = errors.filter(e => e.property === 'maxBatchProcessing');
        expect(batchErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { maxBatchProcessing: 20000 });
        const errors = await validate(testConfig);
        const batchErrors = errors.filter(e => e.property === 'maxBatchProcessing');
        expect(batchErrors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('performance validation', () => {
    describe('compressionThreshold', () => {
      it('should accept valid values', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { compressionThreshold: 4096 });
        const errors = await validate(testConfig);
        const compressionErrors = errors.filter(e => e.property === 'compressionThreshold');
        expect(compressionErrors).toHaveLength(0);
      });

      it('should reject values below minimum', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { compressionThreshold: 100 });
        const errors = await validate(testConfig);
        const compressionErrors = errors.filter(e => e.property === 'compressionThreshold');
        expect(compressionErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { compressionThreshold: 10000 });
        const errors = await validate(testConfig);
        const compressionErrors = errors.filter(e => e.property === 'compressionThreshold');
        expect(compressionErrors.length).toBeGreaterThan(0);
      });
    });

    describe('maxCacheMemoryMB', () => {
      it('should accept valid values', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { maxCacheMemoryMB: 512 });
        const errors = await validate(testConfig);
        const memoryErrors = errors.filter(e => e.property === 'maxCacheMemoryMB');
        expect(memoryErrors).toHaveLength(0);
      });

      it('should reject values below minimum', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { maxCacheMemoryMB: 16 });
        const errors = await validate(testConfig);
        const memoryErrors = errors.filter(e => e.property === 'maxCacheMemoryMB');
        expect(memoryErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', async () => {
        const testConfig = plainToClass(AlertCacheConfigValidation, { maxCacheMemoryMB: 2048 });
        const errors = await validate(testConfig);
        const memoryErrors = errors.filter(e => e.property === 'maxCacheMemoryMB');
        expect(memoryErrors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('integration', () => {
    it('should create valid configuration with all default values', async () => {
      const config = alertCacheConfig();
      const configInstance = plainToClass(AlertCacheConfigValidation, config);
      const errors = await validate(configInstance);
      expect(errors).toHaveLength(0);
    });

    it('should create valid configuration with environment variables', async () => {
      process.env.ALERT_CACHE_ACTIVE_TTL = '900';
      process.env.ALERT_BATCH_SIZE = '150';
      process.env.ALERT_CACHE_COMPRESSION_THRESHOLD = '3072';

      const config = alertCacheConfig();
      const configInstance = plainToClass(AlertCacheConfigValidation, config);
      const errors = await validate(configInstance);

      expect(errors).toHaveLength(0);
      expect(config.activeDataTtl).toBe(900);
      expect(config.batchSize).toBe(150);
      expect(config.compressionThreshold).toBe(3072);
    });

    it('should handle partial environment variables correctly', async () => {
      process.env.ALERT_CACHE_ACTIVE_TTL = '1200';
      process.env.ALERT_CACHE_MAX_MEMORY_MB = '256';

      const config = alertCacheConfig();
      const configInstance = plainToClass(AlertCacheConfigValidation, config);
      const errors = await validate(configInstance);

      expect(errors).toHaveLength(0);
      expect(config.activeDataTtl).toBe(1200); // From env
      expect(config.historicalDataTtl).toBe(3600); // Default
      expect(config.maxCacheMemoryMB).toBe(256); // From env
      expect(config.batchSize).toBe(100); // Default
    });

    it('should validate all fields simultaneously', async () => {
      const invalidConfig = plainToClass(AlertCacheConfigValidation, {
        activeDataTtl: 30, // Too low
        batchSize: 5, // Too low
        maxCacheMemoryMB: 16, // Too low
        compressionThreshold: 100, // Too low
      });

      const errors = await validate(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);

      // Check that multiple fields have validation errors
      const errorProperties = errors.map(e => e.property);
      expect(errorProperties).toContain('activeDataTtl');
      expect(errorProperties).toContain('batchSize');
      expect(errorProperties).toContain('maxCacheMemoryMB');
      expect(errorProperties).toContain('compressionThreshold');
    });
  });

  describe('error handling', () => {
    it('should throw exception when validation fails', () => {
      // 设置无效的环境变量以触发验证错误
      process.env.ALERT_CACHE_ACTIVE_TTL = '10'; // 低于最小值60

      expect(() => {
        alertCacheConfig();
      }).toThrow(/Alert cache configuration validation failed/);
    });

    it('should include validation errors in exception context', () => {
      // 设置多个无效的环境变量以触发多个验证错误
      process.env.ALERT_CACHE_ACTIVE_TTL = '10'; // 低于最小值60
      process.env.ALERT_CACHE_COMPRESSION_THRESHOLD = '100'; // 低于最小值512

      try {
        alertCacheConfig();
        fail('Expected exception was not thrown');
      } catch (error) {
        expect(error.message).toContain('Alert cache configuration validation failed');
        expect(error.context).toBeDefined();
        expect(error.context.validationErrors).toBeDefined();
        // 检查错误代码是否存在，但不具体检查值
        expect(error.context.customErrorCode).toBeDefined();
      }
    });
  });
});
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import alertCacheConfig, {
  AlertCacheConfigValidation,
} from "../../../../../src/alert/config/alert-cache.config";
import { plainToClass } from "class-transformer";
import { validateSync } from "class-validator";

describe("AlertCacheConfig", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [alertCacheConfig],
        }),
      ],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe("AlertCacheConfigValidation", () => {
    it("should validate default configuration successfully", () => {
      const config = new AlertCacheConfigValidation();
      const errors = validateSync(config);
      expect(errors).toHaveLength(0);
    });

    it("should have correct default values", () => {
      const config = new AlertCacheConfigValidation();
      expect(config.activeDataTtl).toBe(300);
      expect(config.historicalDataTtl).toBe(3600);
      expect(config.cooldownTtl).toBe(300);
      expect(config.configCacheTtl).toBe(600);
      expect(config.statsCacheTtl).toBe(300);
      expect(config.batchSize).toBe(100);
      expect(config.maxBatchProcessing).toBe(1000);
      expect(config.largeBatchSize).toBe(1000);
      expect(config.maxActiveAlerts).toBe(10000);
      expect(config.compressionThreshold).toBe(2048);
      expect(config.compressionEnabled).toBe(true);
      expect(config.maxCacheMemoryMB).toBe(128);
      expect(config.maxKeyLength).toBe(256);
    });

    // TTL配置测试
    it("should validate activeDataTtl bounds", () => {
      const config = plainToClass(AlertCacheConfigValidation, {
        activeDataTtl: 59,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertCacheConfigValidation, {
        activeDataTtl: 7201,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate historicalDataTtl bounds", () => {
      const config = plainToClass(AlertCacheConfigValidation, {
        historicalDataTtl: 299,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertCacheConfigValidation, {
        historicalDataTtl: 86401,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate cooldownTtl bounds", () => {
      const config = plainToClass(AlertCacheConfigValidation, {
        cooldownTtl: 59,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertCacheConfigValidation, {
        cooldownTtl: 7201,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate configCacheTtl bounds", () => {
      const config = plainToClass(AlertCacheConfigValidation, {
        configCacheTtl: 299,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertCacheConfigValidation, {
        configCacheTtl: 3601,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate statsCacheTtl bounds", () => {
      const config = plainToClass(AlertCacheConfigValidation, {
        statsCacheTtl: 59,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertCacheConfigValidation, {
        statsCacheTtl: 1801,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    // 批处理配置测试
    it("should validate batchSize bounds", () => {
      const config = plainToClass(AlertCacheConfigValidation, {
        batchSize: 9,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertCacheConfigValidation, {
        batchSize: 1001,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate maxBatchProcessing bounds", () => {
      const config = plainToClass(AlertCacheConfigValidation, {
        maxBatchProcessing: 99,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertCacheConfigValidation, {
        maxBatchProcessing: 10001,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate largeBatchSize bounds", () => {
      const config = plainToClass(AlertCacheConfigValidation, {
        largeBatchSize: 499,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertCacheConfigValidation, {
        largeBatchSize: 5001,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate maxActiveAlerts bounds", () => {
      const config = plainToClass(AlertCacheConfigValidation, {
        maxActiveAlerts: 999,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertCacheConfigValidation, {
        maxActiveAlerts: 100001,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    // 性能配置测试
    it("should validate compressionThreshold bounds", () => {
      const config = plainToClass(AlertCacheConfigValidation, {
        compressionThreshold: 511,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertCacheConfigValidation, {
        compressionThreshold: 8193,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate maxCacheMemoryMB bounds", () => {
      const config = plainToClass(AlertCacheConfigValidation, {
        maxCacheMemoryMB: 31,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertCacheConfigValidation, {
        maxCacheMemoryMB: 1025,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate maxKeyLength bounds", () => {
      const config = plainToClass(AlertCacheConfigValidation, {
        maxKeyLength: 63,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertCacheConfigValidation, {
        maxKeyLength: 513,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });
  });

  describe("Environment Variable Integration", () => {
    it("should read environment variables correctly", () => {
      // 设置环境变量
      process.env.ALERT_CACHE_ACTIVE_TTL = "600";
      process.env.ALERT_CACHE_HISTORICAL_TTL = "7200";
      process.env.ALERT_CACHE_COOLDOWN_TTL = "600";
      process.env.ALERT_CACHE_CONFIG_TTL = "1200";
      process.env.ALERT_CACHE_STATS_TTL = "600";
      process.env.ALERT_BATCH_SIZE = "200";
      process.env.ALERT_MAX_BATCH_PROCESSING = "2000";
      process.env.ALERT_LARGE_BATCH_SIZE = "2000";
      process.env.ALERT_MAX_ACTIVE_ALERTS = "20000";
      process.env.ALERT_CACHE_COMPRESSION_THRESHOLD = "4096";
      process.env.ALERT_CACHE_COMPRESSION_ENABLED = "false";
      process.env.ALERT_CACHE_MAX_MEMORY_MB = "256";
      process.env.ALERT_CACHE_MAX_KEY_LENGTH = "512";

      // 重新加载配置
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

    it("should use default values when environment variables are not set", () => {
      // 确保环境变量未设置
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

      const config = alertCacheConfig();

      expect(config.activeDataTtl).toBe(300);
      expect(config.historicalDataTtl).toBe(3600);
      expect(config.cooldownTtl).toBe(300);
      expect(config.configCacheTtl).toBe(600);
      expect(config.statsCacheTtl).toBe(300);
      expect(config.batchSize).toBe(100);
      expect(config.maxBatchProcessing).toBe(1000);
      expect(config.largeBatchSize).toBe(1000);
      expect(config.maxActiveAlerts).toBe(10000);
      expect(config.compressionThreshold).toBe(2048);
      expect(config.compressionEnabled).toBe(true);
      expect(config.maxCacheMemoryMB).toBe(128);
      expect(config.maxKeyLength).toBe(256);
    });

    it("should validate environment variable values", () => {
      // 设置无效的环境变量值
      process.env.ALERT_CACHE_ACTIVE_TTL = "59"; // 小于最小值

      expect(() => {
        alertCacheConfig();
      }).toThrow(/Alert cache configuration validation failed/);

      // 清理
      delete process.env.ALERT_CACHE_ACTIVE_TTL;
    });
  });
});
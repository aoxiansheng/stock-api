import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import alertPerformanceConfig, {
  AlertPerformanceConfig,
} from "../../../../../src/alert/config/alert-performance.config";
import { plainToClass } from "class-transformer";
import { validateSync } from "class-validator";

describe("AlertPerformanceConfig", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [alertPerformanceConfig],
        }),
      ],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe("AlertPerformanceConfig", () => {
    it("should validate default configuration successfully", () => {
      const config = new AlertPerformanceConfig();
      const errors = validateSync(config);
      expect(errors).toHaveLength(0);
    });

    it("should have correct default values", () => {
      const config = new AlertPerformanceConfig();
      expect(config.maxConcurrency).toBe(5);
      expect(config.queueSizeLimit).toBe(100);
      expect(config.rateLimitPerMinute).toBe(100);
      expect(config.batchSize).toBe(100);
      expect(config.connectionPoolSize).toBe(10);
    });

    it("should validate maxConcurrency bounds", () => {
      const config = plainToClass(AlertPerformanceConfig, {
        maxConcurrency: 0,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertPerformanceConfig, {
        maxConcurrency: 51,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate queueSizeLimit bounds", () => {
      const config = plainToClass(AlertPerformanceConfig, {
        queueSizeLimit: 5,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertPerformanceConfig, {
        queueSizeLimit: 1001,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate rateLimitPerMinute bounds", () => {
      const config = plainToClass(AlertPerformanceConfig, {
        rateLimitPerMinute: 0,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertPerformanceConfig, {
        rateLimitPerMinute: 1001,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate batchSize bounds", () => {
      const config = plainToClass(AlertPerformanceConfig, { batchSize: 0 });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertPerformanceConfig, {
        batchSize: 1001,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate connectionPoolSize bounds", () => {
      const config = plainToClass(AlertPerformanceConfig, {
        connectionPoolSize: 0,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertPerformanceConfig, {
        connectionPoolSize: 51,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });
  });

  describe("Environment Variable Integration", () => {
    it("should read environment variables correctly", () => {
      // 设置环境变量
      process.env.ALERT_MAX_CONCURRENCY = "10";
      process.env.ALERT_QUEUE_SIZE_LIMIT = "200";
      process.env.ALERT_RATE_LIMIT_PER_MINUTE = "200";
      process.env.ALERT_BATCH_SIZE = "200";
      process.env.ALERT_CONNECTION_POOL_SIZE = "20";

      // 重新加载配置
      const config = alertPerformanceConfig();

      expect(config.maxConcurrency).toBe(10);
      expect(config.queueSizeLimit).toBe(200);
      expect(config.rateLimitPerMinute).toBe(200);
      expect(config.batchSize).toBe(200);
      expect(config.connectionPoolSize).toBe(20);

      // 清理环境变量
      delete process.env.ALERT_MAX_CONCURRENCY;
      delete process.env.ALERT_QUEUE_SIZE_LIMIT;
      delete process.env.ALERT_RATE_LIMIT_PER_MINUTE;
      delete process.env.ALERT_BATCH_SIZE;
      delete process.env.ALERT_CONNECTION_POOL_SIZE;
    });

    it("should use default values when environment variables are not set", () => {
      // 确保环境变量未设置
      delete process.env.ALERT_MAX_CONCURRENCY;
      delete process.env.ALERT_QUEUE_SIZE_LIMIT;
      delete process.env.ALERT_RATE_LIMIT_PER_MINUTE;
      delete process.env.ALERT_BATCH_SIZE;
      delete process.env.ALERT_CONNECTION_POOL_SIZE;

      const config = alertPerformanceConfig();

      expect(config.maxConcurrency).toBe(5);
      expect(config.queueSizeLimit).toBe(100);
      expect(config.rateLimitPerMinute).toBe(100);
      expect(config.batchSize).toBe(100);
      expect(config.connectionPoolSize).toBe(10);
    });

    it("should validate environment variable values", () => {
      // 设置无效的环境变量值
      process.env.ALERT_MAX_CONCURRENCY = "0"; // 小于最小值

      expect(() => {
        alertPerformanceConfig();
      }).toThrow(/Alert performance configuration validation failed/);

      // 清理
      delete process.env.ALERT_MAX_CONCURRENCY;
    });
  });
});
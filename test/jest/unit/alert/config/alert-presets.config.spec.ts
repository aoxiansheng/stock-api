import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import alertPresetsConfig, {
  AlertPresetsConfig,
  AlertRulePresets,
  AlertNotificationPresets,
  AlertPerformancePresets,
} from "../../../../../src/alert/config/alert-presets.config";
import { plainToClass } from "class-transformer";
import { validateSync } from "class-validator";

describe("AlertPresetsConfig", () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [alertPresetsConfig],
        }),
      ],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe("AlertRulePresets", () => {
    it("should validate default configuration successfully", () => {
      const config = new AlertRulePresets();
      const errors = validateSync(config);
      expect(errors).toHaveLength(0);
    });

    it("should have correct default values", () => {
      const config = new AlertRulePresets();
      expect(config.quickDuration).toBe(30);
      expect(config.standardDuration).toBe(60);
      expect(config.complexDuration).toBe(120);
      expect(config.complexCooldown).toBe(600);
    });

    it("should validate quickDuration bounds", () => {
      const config = plainToClass(AlertRulePresets, {
        quickDuration: 5,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertRulePresets, {
        quickDuration: 301,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate standardDuration bounds", () => {
      const config = plainToClass(AlertRulePresets, {
        standardDuration: 29,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertRulePresets, {
        standardDuration: 601,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate complexDuration bounds", () => {
      const config = plainToClass(AlertRulePresets, {
        complexDuration: 59,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertRulePresets, {
        complexDuration: 1801,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate complexCooldown bounds", () => {
      const config = plainToClass(AlertRulePresets, {
        complexCooldown: 299,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertRulePresets, {
        complexCooldown: 7201,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });
  });

  describe("AlertNotificationPresets", () => {
      it("should validate default configuration successfully", () => {
      const config = new AlertNotificationPresets();
      const errors = validateSync(config);
      expect(errors).toHaveLength(0);
    });

    it("should have correct default values", () => {
      const config = new AlertNotificationPresets();
      expect(config.instantTimeout).toBe(5000);
      expect(config.instantRetries).toBe(5);
      expect(config.standardTimeout).toBe(30000);
      expect(config.standardRetries).toBe(3);
      expect(config.batchSize).toBe(50);
    });

    it("should validate instantTimeout bounds", () => {
      const config = plainToClass(AlertNotificationPresets, {
        instantTimeout: 999,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertNotificationPresets, {
        instantTimeout: 30001,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate instantRetries bounds", () => {
      const config = plainToClass(AlertNotificationPresets, {
        instantRetries: 0,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertNotificationPresets, {
        instantRetries: 11,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate standardTimeout bounds", () => {
      const config = plainToClass(AlertNotificationPresets, {
        standardTimeout: 4999,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertNotificationPresets, {
        standardTimeout: 60001,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate standardRetries bounds", () => {
      const config = plainToClass(AlertNotificationPresets, {
        standardRetries: 0,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertNotificationPresets, {
        standardRetries: 6,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate batchSize bounds", () => {
      const config = plainToClass(AlertNotificationPresets, {
        batchSize: 9,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertNotificationPresets, {
        batchSize: 201,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });
  });

  describe("AlertPerformancePresets", () => {
    it("should validate default configuration successfully", () => {
      const config = new AlertPerformancePresets();
      const errors = validateSync(config);
      expect(errors).toHaveLength(0);
    });

    it("should have correct default values", () => {
      const config = new AlertPerformancePresets();
      expect(config.highPerformanceConcurrency).toBe(20);
      expect(config.highPerformanceBatchSize).toBe(1000);
      expect(config.balancedConcurrency).toBe(5);
      expect(config.balancedBatchSize).toBe(100);
      expect(config.conservativeConcurrency).toBe(3);
      expect(config.conservativeBatchSize).toBe(50);
    });

    it("should validate highPerformanceConcurrency bounds", () => {
      const config = plainToClass(AlertPerformancePresets, {
        highPerformanceConcurrency: 9,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertPerformancePresets, {
        highPerformanceConcurrency: 51,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate highPerformanceBatchSize bounds", () => {
      const config = plainToClass(AlertPerformancePresets, {
        highPerformanceBatchSize: 499,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertPerformancePresets, {
        highPerformanceBatchSize: 2001,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate balancedConcurrency bounds", () => {
      const config = plainToClass(AlertPerformancePresets, {
        balancedConcurrency: 2,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertPerformancePresets, {
        balancedConcurrency: 21,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate balancedBatchSize bounds", () => {
      const config = plainToClass(AlertPerformancePresets, {
        balancedBatchSize: 49,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertPerformancePresets, {
        balancedBatchSize: 501,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate conservativeConcurrency bounds", () => {
      const config = plainToClass(AlertPerformancePresets, {
        conservativeConcurrency: 0,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertPerformancePresets, {
        conservativeConcurrency: 11,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });

    it("should validate conservativeBatchSize bounds", () => {
      const config = plainToClass(AlertPerformancePresets, {
        conservativeBatchSize: 9,
      });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty("min");

      const configMax = plainToClass(AlertPerformancePresets, {
        conservativeBatchSize: 101,
      });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty("max");
    });
  });

  describe("AlertPresetsConfig", () => {
    it("should validate default configuration successfully", () => {
      const config = new AlertPresetsConfig();
      const errors = validateSync(config);
      expect(errors).toHaveLength(0);
    });

    it("should have nested configurations", () => {
      const config = new AlertPresetsConfig();
      expect(config.rulePresets).toBeInstanceOf(AlertRulePresets);
      expect(config.notificationPresets).toBeInstanceOf(AlertNotificationPresets);
      expect(config.performancePresets).toBeInstanceOf(AlertPerformancePresets);
    });
  });

  describe("Environment Variable Integration", () => {
    it("should read environment variables correctly", () => {
      // 设置环境变量
      process.env.ALERT_PRESET_QUICK_DURATION = "50";
      process.env.ALERT_PRESET_STANDARD_DURATION = "100";
      process.env.ALERT_PRESET_COMPLEX_DURATION = "200";
      process.env.ALERT_PRESET_COMPLEX_COOLDOWN = "1000";
      process.env.ALERT_PRESET_INSTANT_TIMEOUT = "10000";
      process.env.ALERT_PRESET_INSTANT_RETRIES = "3";
      process.env.ALERT_PRESET_STANDARD_TIMEOUT = "40000";
      process.env.ALERT_PRESET_STANDARD_RETRIES = "2";
      process.env.ALERT_PRESET_BATCH_SIZE = "100";
      process.env.ALERT_PRESET_HIGH_CONCURRENCY = "30";
      process.env.ALERT_PRESET_HIGH_BATCH_SIZE = "1500";
      process.env.ALERT_PRESET_BALANCED_CONCURRENCY = "10";
      process.env.ALERT_PRESET_BALANCED_BATCH_SIZE = "200";
      process.env.ALERT_PRESET_CONSERVATIVE_CONCURRENCY = "5";
      process.env.ALERT_PRESET_CONSERVATIVE_BATCH_SIZE = "25";

      // 重新加载配置
      const config = alertPresetsConfig();

      expect(config.rulePresets.quickDuration).toBe(50);
      expect(config.rulePresets.standardDuration).toBe(100);
      expect(config.rulePresets.complexDuration).toBe(200);
      expect(config.rulePresets.complexCooldown).toBe(1000);
      expect(config.notificationPresets.instantTimeout).toBe(10000);
      expect(config.notificationPresets.instantRetries).toBe(3);
      expect(config.notificationPresets.standardTimeout).toBe(40000);
      expect(config.notificationPresets.standardRetries).toBe(2);
      expect(config.notificationPresets.batchSize).toBe(100);
      expect(config.performancePresets.highPerformanceConcurrency).toBe(30);
      expect(config.performancePresets.highPerformanceBatchSize).toBe(1500);
      expect(config.performancePresets.balancedConcurrency).toBe(10);
      expect(config.performancePresets.balancedBatchSize).toBe(200);
      expect(config.performancePresets.conservativeConcurrency).toBe(5);
      expect(config.performancePresets.conservativeBatchSize).toBe(25);

      // 清理环境变量
      delete process.env.ALERT_PRESET_QUICK_DURATION;
      delete process.env.ALERT_PRESET_STANDARD_DURATION;
      delete process.env.ALERT_PRESET_COMPLEX_DURATION;
      delete process.env.ALERT_PRESET_COMPLEX_COOLDOWN;
      delete process.env.ALERT_PRESET_INSTANT_TIMEOUT;
      delete process.env.ALERT_PRESET_INSTANT_RETRIES;
      delete process.env.ALERT_PRESET_STANDARD_TIMEOUT;
      delete process.env.ALERT_PRESET_STANDARD_RETRIES;
      delete process.env.ALERT_PRESET_BATCH_SIZE;
      delete process.env.ALERT_PRESET_HIGH_CONCURRENCY;
      delete process.env.ALERT_PRESET_HIGH_BATCH_SIZE;
      delete process.env.ALERT_PRESET_BALANCED_CONCURRENCY;
      delete process.env.ALERT_PRESET_BALANCED_BATCH_SIZE;
      delete process.env.ALERT_PRESET_CONSERVATIVE_CONCURRENCY;
      delete process.env.ALERT_PRESET_CONSERVATIVE_BATCH_SIZE;
    });

    it("should use default values when environment variables are not set", () => {
      // 确保环境变量未设置
      delete process.env.ALERT_PRESET_QUICK_DURATION;
      delete process.env.ALERT_PRESET_STANDARD_DURATION;
      delete process.env.ALERT_PRESET_COMPLEX_DURATION;
      delete process.env.ALERT_PRESET_COMPLEX_COOLDOWN;
      delete process.env.ALERT_PRESET_INSTANT_TIMEOUT;
      delete process.env.ALERT_PRESET_INSTANT_RETRIES;
      delete process.env.ALERT_PRESET_STANDARD_TIMEOUT;
      delete process.env.ALERT_PRESET_STANDARD_RETRIES;
      delete process.env.ALERT_PRESET_BATCH_SIZE;
      delete process.env.ALERT_PRESET_HIGH_CONCURRENCY;
      delete process.env.ALERT_PRESET_HIGH_BATCH_SIZE;
      delete process.env.ALERT_PRESET_BALANCED_CONCURRENCY;
      delete process.env.ALERT_PRESET_BALANCED_BATCH_SIZE;
      delete process.env.ALERT_PRESET_CONSERVATIVE_CONCURRENCY;
      delete process.env.ALERT_PRESET_CONSERVATIVE_BATCH_SIZE;

      const config = alertPresetsConfig();

      expect(config.rulePresets.quickDuration).toBe(30);
      expect(config.rulePresets.standardDuration).toBe(60);
      expect(config.rulePresets.complexDuration).toBe(120);
      expect(config.rulePresets.complexCooldown).toBe(600);
      expect(config.notificationPresets.instantTimeout).toBe(5000);
      expect(config.notificationPresets.instantRetries).toBe(5);
      expect(config.notificationPresets.standardTimeout).toBe(30000);
      expect(config.notificationPresets.standardRetries).toBe(3);
      expect(config.notificationPresets.batchSize).toBe(50);
      expect(config.performancePresets.highPerformanceConcurrency).toBe(20);
      expect(config.performancePresets.highPerformanceBatchSize).toBe(1000);
      expect(config.performancePresets.balancedConcurrency).toBe(5);
      expect(config.performancePresets.balancedBatchSize).toBe(100);
      expect(config.performancePresets.conservativeConcurrency).toBe(3);
      expect(config.performancePresets.conservativeBatchSize).toBe(50);
    });
  });
});
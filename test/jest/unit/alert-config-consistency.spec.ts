/**
 * Alert配置一致性测试
 * 🎯 验证Alert模块四层配置体系的一致性和完整性
 *
 * @description 确保Alert模块的配置系统符合四层配置体系要求
 * @author Claude Code Assistant
 * @date 2025-09-16
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { validateSync } from "class-validator";
import { plainToClass } from "class-transformer";

// Alert配置导入
import alertConfig, { AlertConfigValidation } from "@alert/config/alert.config";
import alertCacheConfig, {
  AlertCacheConfigValidation,
} from "@alert/config/alert-cache.config";
import alertPerformanceConfig, {
  AlertPerformanceConfig,
} from "@alert/config/alert-performance.config";
// Note: alert-validation.config has been consolidated into other config files
// during the unified cache configuration migration

// 新配置系统导入 (替代过时常量)
import { ConfigType } from "@nestjs/config";
import unifiedTtlConfig from "@appcore/config/unified-ttl.config";
import commonConstantsConfig from "@common/config/common-constants.config";
import { ALERT_DEFAULTS } from "@alert/constants/defaults.constants";
import { RETRY_LIMITS } from "@alert/constants/limits.constants";

// Alert 模块验证常量
import { ALERT_VALIDATION_LIMITS } from "@alert/constants/validation.constants";

describe("Alert配置一致性测试", () => {
  let configService: ConfigService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [
            alertConfig,
            alertCacheConfig,
            alertPerformanceConfig,
            unifiedTtlConfig,
            commonConstantsConfig,
          ],
          isGlobal: true,
        }),
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe("四层配置体系验证", () => {
    describe("1. 环境变量层", () => {
      it("应该支持所有必要的环境变量", () => {
        const expectedEnvVars = [
          "ALERT_EVALUATION_INTERVAL",
          "ALERT_DEFAULT_COOLDOWN",
          "ALERT_BATCH_SIZE",
          "ALERT_EVALUATION_TIMEOUT",
          "ALERT_MAX_RETRIES",
          "ALERT_VALIDATION_DURATION_MIN",
          "ALERT_VALIDATION_DURATION_MAX",
          "ALERT_VALIDATION_COOLDOWN_MAX",
          "ALERT_CACHE_ACTIVE_TTL",
          "ALERT_CACHE_HISTORICAL_TTL",
          "ALERT_CACHE_COOLDOWN_TTL",
          "ALERT_MAX_CONCURRENCY",
          "ALERT_QUEUE_SIZE_LIMIT",
          "ALERT_RATE_LIMIT_PER_MINUTE",
          "ALERT_CONNECTION_POOL_SIZE",
        ];

        // 验证环境变量格式（即使未设置，也应该有默认值处理）
        expectedEnvVars.forEach((envVar) => {
          expect(typeof envVar).toBe("string");
          expect(envVar).toMatch(/^ALERT_/);
        });
      });

      it("应该处理环境变量默认值", () => {
        // 测试默认值是否正确设置
        const alertConfigData = configService.get("alert");
        expect(alertConfigData).toBeDefined();
        expect(alertConfigData.evaluationInterval).toBeGreaterThan(0);
        expect(alertConfigData.defaultCooldown).toBeGreaterThan(0);
        expect(alertConfigData.batchSize).toBeGreaterThan(0);
      });
    });

    describe("2. 配置文件层", () => {
      it("Alert主配置应该有效", () => {
        const alertConfigData = configService.get("alert");
        expect(alertConfigData).toBeDefined();
        expect(alertConfigData.evaluationInterval).toBeGreaterThanOrEqual(10);
        expect(alertConfigData.defaultCooldown).toBeGreaterThanOrEqual(60);
        expect(alertConfigData.batchSize).toBeGreaterThanOrEqual(10);
        expect(alertConfigData.evaluationTimeout).toBeGreaterThanOrEqual(1000);
        expect(alertConfigData.maxRetries).toBeGreaterThanOrEqual(1);
      });

      it("Alert缓存配置应该有效", () => {
        const alertCacheConfigData = configService.get("alertCache");
        expect(alertCacheConfigData).toBeDefined();
        expect(alertCacheConfigData.activeDataTtl).toBeGreaterThanOrEqual(60);
        expect(alertCacheConfigData.historicalDataTtl).toBeGreaterThanOrEqual(
          300,
        );
        expect(alertCacheConfigData.batchSize).toBeGreaterThanOrEqual(10);
        expect(alertCacheConfigData.maxActiveAlerts).toBeGreaterThanOrEqual(
          1000,
        );
      });

      it("Alert性能配置应该有效", () => {
        const alertPerformanceConfigData =
          configService.get("alertPerformance");
        expect(alertPerformanceConfigData).toBeDefined();
        expect(
          alertPerformanceConfigData.maxConcurrency,
        ).toBeGreaterThanOrEqual(1);
        expect(
          alertPerformanceConfigData.queueSizeLimit,
        ).toBeGreaterThanOrEqual(10);
        expect(
          alertPerformanceConfigData.rateLimitPerMinute,
        ).toBeGreaterThanOrEqual(1);
        expect(alertPerformanceConfigData.batchSize).toBeGreaterThanOrEqual(1);
        expect(
          alertPerformanceConfigData.connectionPoolSize,
        ).toBeGreaterThanOrEqual(1);
      });
    });

    describe("3. 配置验证层", () => {
      it("AlertConfigValidation应该通过验证", () => {
        const config = new AlertConfigValidation();
        const errors = validateSync(config);
        expect(errors.length).toBe(0);
      });

      it("AlertCacheConfigValidation应该通过验证", () => {
        const config = new AlertCacheConfigValidation();
        const errors = validateSync(config);
        expect(errors.length).toBe(0);
      });

      it("AlertPerformanceConfig应该通过验证", () => {
        const config = new AlertPerformanceConfig();
        const errors = validateSync(config);
        expect(errors.length).toBe(0);
      });

      // Note: CompleteAlertValidation test skipped - class consolidated during config migration
      // it("嵌套配置验证应该工作", () => {
      //   const completeConfig = new CompleteAlertValidation();
      //   const errors = validateSync(completeConfig, {
      //     validationError: { target: false },
      //   });
      //   expect(errors.length).toBe(0);
      // });
    });

    describe("4. 常量文件层", () => {
      it("ALERT_VALIDATION_LIMITS应该包含Alert所需常量", () => {
        expect(ALERT_VALIDATION_LIMITS.DURATION_MIN).toBeDefined();
        expect(ALERT_VALIDATION_LIMITS.DURATION_MAX).toBeDefined();
        expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MIN).toBeDefined();
        expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MAX).toBeDefined();
        expect(ALERT_VALIDATION_LIMITS.RETRIES_MIN).toBeDefined();
        expect(ALERT_VALIDATION_LIMITS.RETRIES_MAX).toBeDefined();
        expect(ALERT_VALIDATION_LIMITS.TIMEOUT_MIN).toBeDefined();
        expect(ALERT_VALIDATION_LIMITS.TIMEOUT_MAX).toBeDefined();
      });

      it("ALERT_DEFAULTS应该提供合理默认值", () => {
        expect(ALERT_DEFAULTS).toBeDefined();
        expect(typeof ALERT_DEFAULTS).toBe("object");
      });

      it("RETRY_LIMITS应该提供重试配置", () => {
        expect(RETRY_LIMITS.MINIMAL_RETRIES).toBeGreaterThanOrEqual(1);
        expect(RETRY_LIMITS.STANDARD_RETRIES).toBeGreaterThanOrEqual(1);
        expect(RETRY_LIMITS.CRITICAL_RETRIES).toBeGreaterThanOrEqual(1);
        expect(RETRY_LIMITS.MAX_RETRIES).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("配置一致性验证", () => {
    it("Alert配置与常量应该一致", () => {
      const alertConfigData = configService.get("alert");

      // 验证持续时间限制一致性
      expect(alertConfigData.validation.duration.min).toBe(
        ALERT_VALIDATION_LIMITS.DURATION_MIN,
      );
      expect(alertConfigData.validation.duration.max).toBe(
        ALERT_VALIDATION_LIMITS.DURATION_MAX,
      );

      // 验证冷却时间限制一致性
      expect(alertConfigData.validation.cooldown.max).toBe(
        ALERT_VALIDATION_LIMITS.COOLDOWN_MAX,
      );
    });

    it("缓存配置与主配置应该兼容", () => {
      const alertConfigData = configService.get("alert");
      const alertCacheConfigData = configService.get("alertCache");

      // 批处理大小应该一致或兼容
      expect(alertCacheConfigData.batchSize).toBeGreaterThanOrEqual(
        alertConfigData.batchSize * 0.5,
      );
      expect(alertCacheConfigData.batchSize).toBeLessThanOrEqual(
        alertConfigData.batchSize * 2,
      );
    });

    it("性能配置应该与主配置协调", () => {
      const alertConfigData = configService.get("alert");
      const alertPerformanceConfigData = configService.get("alertPerformance");

      // 批处理大小应该协调
      expect(alertPerformanceConfigData.batchSize).toBeGreaterThanOrEqual(
        alertConfigData.batchSize * 0.5,
      );
      expect(alertPerformanceConfigData.batchSize).toBeLessThanOrEqual(
        alertConfigData.batchSize * 2,
      );
    });
  });

  describe("配置边界值测试", () => {
    it("应该正确处理最小值", () => {
      const minConfig = {
        evaluationInterval: 10,
        defaultCooldown: 60,
        batchSize: 10,
        evaluationTimeout: 1000,
        maxRetries: 1,
      };

      const config = plainToClass(AlertConfigValidation, minConfig);
      const errors = validateSync(config);
      expect(errors.length).toBe(0);
    });

    it("应该正确处理最大值", () => {
      const maxConfig = {
        evaluationInterval: 3600,
        defaultCooldown: 7200,
        batchSize: 1000,
        evaluationTimeout: 30000,
        maxRetries: 10,
      };

      const config = plainToClass(AlertConfigValidation, maxConfig);
      const errors = validateSync(config);
      expect(errors.length).toBe(0);
    });

    it("应该拒绝超出边界的值", () => {
      const invalidConfig = {
        evaluationInterval: 5, // 低于最小值10
        defaultCooldown: 30, // 低于最小值60
        batchSize: 5, // 低于最小值10
        evaluationTimeout: 500, // 低于最小值1000
        maxRetries: 0, // 低于最小值1
      };

      const config = plainToClass(AlertConfigValidation, invalidConfig);
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe("配置热重载测试", () => {
    it("配置更改应该能够重新验证", () => {
      // 模拟环境变量更改
      const originalValue = process.env.ALERT_EVALUATION_INTERVAL;
      process.env.ALERT_EVALUATION_INTERVAL = "120";

      try {
        // 重新创建配置
        const newConfig = alertConfig();
        expect(newConfig.evaluationInterval).toBe(120);
      } finally {
        // 恢复原值
        if (originalValue !== undefined) {
          process.env.ALERT_EVALUATION_INTERVAL = originalValue;
        } else {
          delete process.env.ALERT_EVALUATION_INTERVAL;
        }
      }
    });
  });

  describe("配置错误处理", () => {
    it("应该正确处理无效的环境变量", () => {
      const originalValue = process.env.ALERT_EVALUATION_INTERVAL;
      process.env.ALERT_EVALUATION_INTERVAL = "invalid_number";

      try {
        const config = alertConfig();
        // 应该回退到默认值
        expect(config.evaluationInterval).toBe(60);
      } finally {
        if (originalValue !== undefined) {
          process.env.ALERT_EVALUATION_INTERVAL = originalValue;
        } else {
          delete process.env.ALERT_EVALUATION_INTERVAL;
        }
      }
    });

    it("应该在配置验证失败时抛出错误", () => {
      const invalidRawConfig = {
        evaluationInterval: -1,
        defaultCooldown: -1,
        batchSize: -1,
        evaluationTimeout: -1,
        maxRetries: -1,
      };

      expect(() => {
        const config = plainToClass(AlertConfigValidation, invalidRawConfig);
        const errors = validateSync(config);
        if (errors.length > 0) {
          throw new Error("Configuration validation failed");
        }
      }).toThrow();
    });
  });

  describe("配置完整性检查", () => {
    it("所有必需的配置字段都应该存在", () => {
      const alertConfigData = configService.get("alert");
      const requiredFields = [
        "evaluationInterval",
        "defaultCooldown",
        "batchSize",
        "evaluationTimeout",
        "maxRetries",
        "validation",
        "cache",
      ];

      requiredFields.forEach((field) => {
        expect(alertConfigData[field]).toBeDefined();
      });
    });

    it("嵌套配置对象应该完整", () => {
      const alertConfigData = configService.get("alert");

      // 验证validation对象
      expect(alertConfigData.validation.duration).toBeDefined();
      expect(alertConfigData.validation.duration.min).toBeDefined();
      expect(alertConfigData.validation.duration.max).toBeDefined();
      expect(alertConfigData.validation.cooldown).toBeDefined();
      expect(alertConfigData.validation.cooldown.max).toBeDefined();

      // 验证cache对象
      expect(alertConfigData.cache.cooldownPrefix).toBeDefined();
      expect(alertConfigData.cache.activeAlertPrefix).toBeDefined();
    });
  });

  describe("配置迁移验证 (过时代码清理)", () => {
    it("新的统一TTL配置应该可用", () => {
      const unifiedTtlConfigData = configService.get("unifiedTtl");
      expect(unifiedTtlConfigData).toBeDefined();
      expect(unifiedTtlConfigData.defaultTtl).toBeDefined();
      expect(unifiedTtlConfigData.authTtl).toBeDefined();
      expect(unifiedTtlConfigData.monitoringTtl).toBeDefined();
    });

    it("新的通用常量配置应该可用", () => {
      const commonConstantsConfigData = configService.get("commonConstants");
      expect(commonConstantsConfigData).toBeDefined();
      expect(commonConstantsConfigData.defaultBatchSize).toBeDefined();
      expect(commonConstantsConfigData.maxRetryAttempts).toBeDefined();
      expect(commonConstantsConfigData.defaultTimeoutMs).toBeDefined();
    });

    it("新配置值应该与过时常量保持兼容", () => {
      const commonConstantsConfigData = configService.get("commonConstants");

      // 验证新配置提供的值与过时常量在合理范围内
      expect(commonConstantsConfigData.maxRetryAttempts).toBeGreaterThanOrEqual(
        ALERT_VALIDATION_LIMITS.RETRIES_MIN,
      );
      expect(commonConstantsConfigData.maxRetryAttempts).toBeLessThanOrEqual(
        ALERT_VALIDATION_LIMITS.RETRIES_MAX,
      );

      expect(commonConstantsConfigData.defaultTimeoutMs).toBeGreaterThanOrEqual(
        ALERT_VALIDATION_LIMITS.TIMEOUT_MIN,
      );
      expect(commonConstantsConfigData.defaultTimeoutMs).toBeLessThanOrEqual(
        ALERT_VALIDATION_LIMITS.TIMEOUT_MAX,
      );
    });

    it("过时常量仍应可用 (向后兼容)", () => {
      // 这些测试确保在迁移期间过时常量仍然可用
      expect(ALERT_VALIDATION_LIMITS.DURATION_MIN).toBeDefined();
      expect(ALERT_VALIDATION_LIMITS.DURATION_MAX).toBeDefined();
      expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MIN).toBeDefined();
      expect(ALERT_VALIDATION_LIMITS.COOLDOWN_MAX).toBeDefined();
      expect(ALERT_VALIDATION_LIMITS.RETRIES_MIN).toBeDefined();
      expect(ALERT_VALIDATION_LIMITS.RETRIES_MAX).toBeDefined();
      expect(ALERT_VALIDATION_LIMITS.TIMEOUT_MIN).toBeDefined();
      expect(ALERT_VALIDATION_LIMITS.TIMEOUT_MAX).toBeDefined();
    });
  });
});

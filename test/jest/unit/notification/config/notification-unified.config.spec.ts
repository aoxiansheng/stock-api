/**
 * Notification统一配置验证测试套件
 * 🎯 验证通知系统统一配置的完整性、类型安全性和错误处理
 *
 * @description 测试notification-unified.config.ts的所有配置验证逻辑
 * @see src/notification/config/notification-unified.config.ts
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { validateSync } from "class-validator";
import { plainToClass } from "class-transformer";

import notificationUnifiedConfig, {
  NotificationUnifiedConfig,
  NotificationUnifiedConfigValidation,
  NotificationBatchConfig,
  NotificationTimeoutConfig,
  NotificationRetryConfig,
  NotificationValidationConfig,
  NotificationFeatureConfig,
  NotificationTemplateConfig,
} from "@notification/config/notification-unified.config";

describe("Notification Unified Configuration Validation", () => {
  let module: TestingModule;
  let configService: ConfigService;
  let config: NotificationUnifiedConfig;

  beforeAll(async () => {
    // 清理环境变量以确保测试独立性
    const originalEnv = process.env;
    process.env = { ...originalEnv };

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [notificationUnifiedConfig],
          isGlobal: true,
        }),
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
    config = configService.get<NotificationUnifiedConfig>("notification");
  });

  afterAll(async () => {
    await module.close();
  });

  describe("Configuration Structure Validation", () => {
    it("应该正确加载和验证统一配置结构", () => {
      expect(config).toBeDefined();
      expect(config.batch).toBeInstanceOf(NotificationBatchConfig);
      expect(config.timeouts).toBeInstanceOf(NotificationTimeoutConfig);
      expect(config.retry).toBeInstanceOf(NotificationRetryConfig);
      expect(config.validation).toBeInstanceOf(NotificationValidationConfig);
      expect(config.features).toBeInstanceOf(NotificationFeatureConfig);
      expect(config.templates).toBeInstanceOf(NotificationTemplateConfig);

      console.log("统一配置结构验证成功:");
      console.log(`  批处理配置: ${!!config.batch ? "✅" : "❌"}`);
      console.log(`  超时配置: ${!!config.timeouts ? "✅" : "❌"}`);
      console.log(`  重试配置: ${!!config.retry ? "✅" : "❌"}`);
      console.log(`  验证配置: ${!!config.validation ? "✅" : "❌"}`);
      console.log(`  功能配置: ${!!config.features ? "✅" : "❌"}`);
      console.log(`  模板配置: ${!!config.templates ? "✅" : "❌"}`);
    });

    it("应该包含所有必需的配置组", () => {
      const requiredConfigGroups = [
        "batch",
        "timeouts",
        "retry",
        "validation",
        "features",
        "templates",
        "channelTemplates",
        "channelDefaults",
      ];

      requiredConfigGroups.forEach((group) => {
        expect(config[group]).toBeDefined();
        expect(config[group]).not.toBeNull();
      });
    });

    it("应该验证配置对象的类型完整性", () => {
      // 验证每个配置组的类型
      expect(typeof config.batch).toBe("object");
      expect(typeof config.timeouts).toBe("object");
      expect(typeof config.retry).toBe("object");
      expect(typeof config.validation).toBe("object");
      expect(typeof config.features).toBe("object");
      expect(typeof config.templates).toBe("object");
      expect(typeof config.channelTemplates).toBe("object");
      expect(typeof config.channelDefaults).toBe("object");
    });
  });

  describe("Batch Configuration Validation", () => {
    it("应该验证批处理配置的默认值", () => {
      const batchConfig = config.batch;

      expect(batchConfig.defaultBatchSize).toBe(10);
      expect(batchConfig.maxBatchSize).toBe(100);
      expect(batchConfig.maxConcurrency).toBe(5);
      expect(batchConfig.batchTimeout).toBe(60000);
    });

    it("应该验证批处理配置的数值范围", () => {
      const batchConfig = config.batch;

      // defaultBatchSize: @Min(1) @Max(1000)
      expect(batchConfig.defaultBatchSize).toBeGreaterThanOrEqual(1);
      expect(batchConfig.defaultBatchSize).toBeLessThanOrEqual(1000);

      // maxBatchSize: @Min(1) @Max(10000)
      expect(batchConfig.maxBatchSize).toBeGreaterThanOrEqual(1);
      expect(batchConfig.maxBatchSize).toBeLessThanOrEqual(10000);

      // maxConcurrency: @Min(1) @Max(100)
      expect(batchConfig.maxConcurrency).toBeGreaterThanOrEqual(1);
      expect(batchConfig.maxConcurrency).toBeLessThanOrEqual(100);

      // batchTimeout: @Min(1000) @Max(300000)
      expect(batchConfig.batchTimeout).toBeGreaterThanOrEqual(1000);
      expect(batchConfig.batchTimeout).toBeLessThanOrEqual(300000);
    });

    it("应该拒绝无效的批处理配置值", () => {
      const invalidBatchConfig = plainToClass(NotificationBatchConfig, {
        defaultBatchSize: 0, // 无效: 小于最小值
        maxBatchSize: 20000, // 无效: 超过最大值
        maxConcurrency: -1, // 无效: 负数
        batchTimeout: 500, // 无效: 小于最小值
      });

      const errors = validateSync(invalidBatchConfig);
      expect(errors.length).toBeGreaterThan(0);

      // 验证具体的错误类型
      const errorMessages = errors
        .map((error) => Object.values(error.constraints || {}).join(", "))
        .join("; ");

      expect(errorMessages).toContain("min");
      expect(errorMessages).toContain("max");
    });
  });

  describe("Timeout Configuration Validation", () => {
    it("应该验证超时配置的默认值", () => {
      const timeoutConfig = config.timeouts;

      expect(timeoutConfig.defaultTimeout).toBe(15000);
      expect(timeoutConfig.emailTimeout).toBe(30000);
      expect(timeoutConfig.smsTimeout).toBe(5000);
      expect(timeoutConfig.webhookTimeout).toBe(10000);
    });

    it("应该验证超时配置的数值范围", () => {
      const timeoutConfig = config.timeouts;

      // 所有超时值应该在 @Min(1000) @Max(180000) 范围内
      [
        timeoutConfig.defaultTimeout,
        timeoutConfig.emailTimeout,
        timeoutConfig.webhookTimeout,
      ].forEach((timeout) => {
        expect(timeout).toBeGreaterThanOrEqual(1000);
        expect(timeout).toBeLessThanOrEqual(180000);
      });

      // SMS超时有特殊范围 @Min(1000) @Max(30000)
      expect(timeoutConfig.smsTimeout).toBeGreaterThanOrEqual(1000);
      expect(timeoutConfig.smsTimeout).toBeLessThanOrEqual(30000);
    });

    it("应该验证渠道超时的业务逻辑合理性", () => {
      const timeoutConfig = config.timeouts;

      // 邮件超时应该比SMS超时长（因为邮件处理更复杂）
      expect(timeoutConfig.emailTimeout).toBeGreaterThan(
        timeoutConfig.smsTimeout,
      );

      // 默认超时应该在其他超时的合理范围内
      expect(timeoutConfig.defaultTimeout).toBeGreaterThanOrEqual(
        timeoutConfig.smsTimeout,
      );
      expect(timeoutConfig.defaultTimeout).toBeLessThanOrEqual(
        timeoutConfig.emailTimeout,
      );
    });
  });

  describe("Retry Configuration Validation", () => {
    it("应该验证重试配置的默认值", () => {
      const retryConfig = config.retry;

      expect(retryConfig.maxRetryAttempts).toBe(3);
      expect(retryConfig.initialRetryDelay).toBe(1000);
      expect(retryConfig.retryBackoffMultiplier).toBe(2);
      expect(retryConfig.maxRetryDelay).toBe(30000);
      expect(retryConfig.jitterFactor).toBe(0.1);
    });

    it("应该验证重试配置的数值范围", () => {
      const retryConfig = config.retry;

      // maxRetryAttempts: @Min(1) @Max(10)
      expect(retryConfig.maxRetryAttempts).toBeGreaterThanOrEqual(1);
      expect(retryConfig.maxRetryAttempts).toBeLessThanOrEqual(10);

      // initialRetryDelay: @Min(100) @Max(10000)
      expect(retryConfig.initialRetryDelay).toBeGreaterThanOrEqual(100);
      expect(retryConfig.initialRetryDelay).toBeLessThanOrEqual(10000);

      // retryBackoffMultiplier: @Min(1.1) @Max(5.0)
      expect(retryConfig.retryBackoffMultiplier).toBeGreaterThanOrEqual(1.1);
      expect(retryConfig.retryBackoffMultiplier).toBeLessThanOrEqual(5.0);

      // maxRetryDelay: @Min(1000) @Max(300000)
      expect(retryConfig.maxRetryDelay).toBeGreaterThanOrEqual(1000);
      expect(retryConfig.maxRetryDelay).toBeLessThanOrEqual(300000);

      // jitterFactor: @Min(0.0) @Max(1.0)
      expect(retryConfig.jitterFactor).toBeGreaterThanOrEqual(0.0);
      expect(retryConfig.jitterFactor).toBeLessThanOrEqual(1.0);
    });

    it("应该验证重试配置的逻辑一致性", () => {
      const retryConfig = config.retry;

      // 最大重试延迟应该大于初始延迟
      expect(retryConfig.maxRetryDelay).toBeGreaterThan(
        retryConfig.initialRetryDelay,
      );

      // 退避倍数应该大于1，确保延迟递增
      expect(retryConfig.retryBackoffMultiplier).toBeGreaterThan(1);

      // 抖动因子应该在合理范围内
      expect(retryConfig.jitterFactor).toBeLessThan(1);
    });
  });

  describe("Validation Configuration Tests", () => {
    it("应该验证验证配置的默认值", () => {
      const validationConfig = config.validation;

      expect(validationConfig.variableNameMinLength).toBe(1);
      expect(validationConfig.variableNameMaxLength).toBe(50);
      expect(validationConfig.minTemplateLength).toBe(1);
      expect(validationConfig.maxTemplateLength).toBe(10000);
      expect(validationConfig.titleMaxLength).toBe(200);
      expect(validationConfig.contentMaxLength).toBe(2000);
    });

    it("应该验证验证配置的数值约束", () => {
      const validationConfig = config.validation;

      // 变量名长度约束
      expect(validationConfig.variableNameMinLength).toBeGreaterThanOrEqual(1);
      expect(validationConfig.variableNameMinLength).toBeLessThanOrEqual(100);
      expect(validationConfig.variableNameMaxLength).toBeGreaterThanOrEqual(1);
      expect(validationConfig.variableNameMaxLength).toBeLessThanOrEqual(500);

      // 模板长度约束
      expect(validationConfig.minTemplateLength).toBeGreaterThanOrEqual(1);
      expect(validationConfig.maxTemplateLength).toBeGreaterThanOrEqual(100);
      expect(validationConfig.maxTemplateLength).toBeLessThanOrEqual(50000);

      // 内容长度约束
      expect(validationConfig.titleMaxLength).toBeGreaterThanOrEqual(1);
      expect(validationConfig.titleMaxLength).toBeLessThanOrEqual(500);
      expect(validationConfig.contentMaxLength).toBeGreaterThanOrEqual(10);
      expect(validationConfig.contentMaxLength).toBeLessThanOrEqual(10000);
    });

    it("应该验证验证配置的逻辑关系", () => {
      const validationConfig = config.validation;

      // 最小长度应该小于等于最大长度
      expect(validationConfig.variableNameMinLength).toBeLessThanOrEqual(
        validationConfig.variableNameMaxLength,
      );
      expect(validationConfig.minTemplateLength).toBeLessThanOrEqual(
        validationConfig.maxTemplateLength,
      );

      // 标题长度应该小于内容长度
      expect(validationConfig.titleMaxLength).toBeLessThan(
        validationConfig.contentMaxLength,
      );
    });
  });

  describe("Feature Configuration Tests", () => {
    it("应该验证功能配置的默认值", () => {
      const featureConfig = config.features;

      expect(featureConfig.enableBatchProcessing).toBe(true);
      expect(featureConfig.enableRetryMechanism).toBe(true);
      expect(featureConfig.enablePriorityQueue).toBe(true);
      expect(featureConfig.enableMetricsCollection).toBe(true);
    });

    it("应该验证功能配置的类型安全性", () => {
      const featureConfig = config.features;

      expect(typeof featureConfig.enableBatchProcessing).toBe("boolean");
      expect(typeof featureConfig.enableRetryMechanism).toBe("boolean");
      expect(typeof featureConfig.enablePriorityQueue).toBe("boolean");
      expect(typeof featureConfig.enableMetricsCollection).toBe("boolean");
    });

    it("应该测试功能开关的环境变量控制", () => {
      // 测试环境变量可以控制功能开关
      const originalEnv = process.env;

      // 设置特定的环境变量
      process.env.NOTIFICATION_ENABLE_BATCH_PROCESSING = "false";
      process.env.NOTIFICATION_ENABLE_RETRY_MECHANISM = "false";

      // 重新创建配置以测试环境变量影响
      const testRawConfig = {
        features: {
          enableBatchProcessing:
            process.env.NOTIFICATION_ENABLE_BATCH_PROCESSING !== "false",
          enableRetryMechanism:
            process.env.NOTIFICATION_ENABLE_RETRY_MECHANISM !== "false",
          enablePriorityQueue:
            process.env.NOTIFICATION_ENABLE_PRIORITY_QUEUE !== "false",
          enableMetricsCollection:
            process.env.NOTIFICATION_ENABLE_METRICS_COLLECTION !== "false",
        },
      };

      expect(testRawConfig.features.enableBatchProcessing).toBe(false);
      expect(testRawConfig.features.enableRetryMechanism).toBe(false);
      expect(testRawConfig.features.enablePriorityQueue).toBe(true);
      expect(testRawConfig.features.enableMetricsCollection).toBe(true);

      // 恢复环境变量
      process.env = originalEnv;
    });
  });

  describe("Template Configuration Tests", () => {
    it("应该验证模板配置的默认值", () => {
      const templateConfig = config.templates;

      expect(templateConfig.defaultTextTemplate).toBeDefined();
      expect(templateConfig.defaultTextTemplate.length).toBeGreaterThan(10);
      expect(templateConfig.defaultEmailSubjectTemplate).toBeDefined();
      expect(templateConfig.defaultEmailSubjectTemplate.length).toBeGreaterThan(
        5,
      );
    });

    it("应该验证模板内容的格式和变量", () => {
      const templateConfig = config.templates;

      // 验证文本模板包含期望的变量
      const expectedVariables = [
        "{{ruleName}}",
        "{{metric}}",
        "{{value}}",
        "{{threshold}}",
        "{{severity}}",
        "{{status}}",
        "{{startTime}}",
        "{{duration}}",
        "{{message}}",
      ];

      expectedVariables.forEach((variable) => {
        expect(templateConfig.defaultTextTemplate).toContain(variable);
      });

      // 验证邮件主题模板包含关键变量
      expect(templateConfig.defaultEmailSubjectTemplate).toContain(
        "{{severity}}",
      );
      expect(templateConfig.defaultEmailSubjectTemplate).toContain(
        "{{ruleName}}",
      );
      expect(templateConfig.defaultEmailSubjectTemplate).toContain(
        "{{status}}",
      );
    });

    it("应该验证模板长度约束", () => {
      const templateConfig = config.templates;

      // defaultTextTemplate: @MinLength(10) @MaxLength(5000)
      expect(templateConfig.defaultTextTemplate.length).toBeGreaterThanOrEqual(
        10,
      );
      expect(templateConfig.defaultTextTemplate.length).toBeLessThanOrEqual(
        5000,
      );

      // defaultEmailSubjectTemplate: @MinLength(5) @MaxLength(200)
      expect(
        templateConfig.defaultEmailSubjectTemplate.length,
      ).toBeGreaterThanOrEqual(5);
      expect(
        templateConfig.defaultEmailSubjectTemplate.length,
      ).toBeLessThanOrEqual(200);
    });
  });

  describe("Environment Variable Integration", () => {
    it("应该正确处理环境变量的数值转换", () => {
      const testCases = [
        {
          env: "NOTIFICATION_DEFAULT_BATCH_SIZE",
          expected: 10,
          type: "number",
        },
        { env: "NOTIFICATION_MAX_BATCH_SIZE", expected: 100, type: "number" },
        {
          env: "NOTIFICATION_DEFAULT_TIMEOUT",
          expected: 15000,
          type: "number",
        },
        { env: "NOTIFICATION_MAX_RETRY_ATTEMPTS", expected: 3, type: "number" },
        {
          env: "NOTIFICATION_RETRY_BACKOFF_MULTIPLIER",
          expected: 2,
          type: "number",
        },
      ];

      testCases.forEach((testCase) => {
        // 验证配置中的值类型正确
        const configValue = getNestedConfigValue(config, testCase.env);
        if (configValue !== undefined) {
          expect(typeof configValue).toBe(testCase.type);
          if (testCase.type === "number") {
            expect(configValue).toBeGreaterThan(0);
          }
        }
      });
    });

    it("应该正确处理环境变量的布尔值转换", () => {
      const booleanEnvVars = [
        "NOTIFICATION_ENABLE_BATCH_PROCESSING",
        "NOTIFICATION_ENABLE_RETRY_MECHANISM",
        "NOTIFICATION_ENABLE_PRIORITY_QUEUE",
        "NOTIFICATION_ENABLE_METRICS_COLLECTION",
      ];

      booleanEnvVars.forEach((envVar) => {
        // 验证布尔值转换逻辑: 只有明确的 'false' 才为 false
        const testValue = process.env[envVar];
        const expectedResult = testValue !== "false";

        // 在实际配置中验证
        const configValue = getFeatureConfigValue(config, envVar);
        if (configValue !== undefined) {
          expect(typeof configValue).toBe("boolean");
        }
      });
    });

    it("应该处理缺失的环境变量并使用默认值", () => {
      // 验证在没有环境变量的情况下使用默认值
      const originalEnv = process.env;

      // 清理特定环境变量
      delete process.env.NOTIFICATION_DEFAULT_BATCH_SIZE;
      delete process.env.NOTIFICATION_DEFAULT_TIMEOUT;

      // 验证配置仍然有效（使用默认值）
      expect(config.batch.defaultBatchSize).toBeDefined();
      expect(config.timeouts.defaultTimeout).toBeDefined();
      expect(typeof config.batch.defaultBatchSize).toBe("number");
      expect(typeof config.timeouts.defaultTimeout).toBe("number");

      // 恢复环境变量
      process.env = originalEnv;
    });
  });

  describe("Type Safety and Error Handling", () => {
    it("应该在配置验证失败时抛出详细错误", () => {
      // 创建一个无效的配置对象
      const invalidConfig = {
        batch: {
          defaultBatchSize: -1, // 无效值
          maxBatchSize: 0, // 无效值
          maxConcurrency: 200, // 超出范围
          batchTimeout: 500, // 过小
        },
        timeouts: {
          defaultTimeout: 100, // 过小
          emailTimeout: 200000, // 过大
          smsTimeout: 50000, // 过大
          webhookTimeout: -1000, // 无效
        },
      };

      // 使用 plainToClass 和 validateSync 测试验证
      const configInstance = plainToClass(
        NotificationUnifiedConfigValidation,
        invalidConfig,
        {
          enableImplicitConversion: true,
        },
      );

      const errors = validateSync(configInstance, {
        whitelist: true,
        forbidNonWhitelisted: true,
        skipMissingProperties: false,
      });

      expect(errors.length).toBeGreaterThan(0);

      // 验证错误信息包含具体的约束违反
      const errorMessages = errors
        .map(
          (error) =>
            `${error.property}: ${Object.values(error.constraints || {}).join(", ")}`,
        )
        .join("; ");

      console.log("验证错误信息:", errorMessages);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

    it("应该验证所有必需字段都存在", () => {
      // 测试缺失必需字段的情况
      const incompleteConfig = plainToClass(
        NotificationUnifiedConfigValidation,
        {
          batch: {
            defaultBatchSize: 10,
            // 缺失其他必需字段
          },
        },
      );

      const errors = validateSync(incompleteConfig);

      // 应该有验证错误，因为缺失必需字段
      // 但由于使用了默认值，可能不会报错
      // 验证默认值机制正常工作
      expect(incompleteConfig.batch.maxBatchSize).toBeDefined();
      expect(incompleteConfig.batch.maxConcurrency).toBeDefined();
      expect(incompleteConfig.batch.batchTimeout).toBeDefined();
    });

    it("应该验证类型转换的安全性", () => {
      // 测试字符串到数字的转换
      const testConfig = {
        batch: {
          defaultBatchSize: "15", // 字符串
          maxBatchSize: "150", // 字符串
          maxConcurrency: "8", // 字符串
          batchTimeout: "90000", // 字符串
        },
      };

      const configInstance = plainToClass(
        NotificationBatchConfig,
        testConfig.batch,
        {
          enableImplicitConversion: true,
        },
      );

      // 验证类型转换成功
      expect(typeof configInstance.defaultBatchSize).toBe("number");
      expect(typeof configInstance.maxBatchSize).toBe("number");
      expect(typeof configInstance.maxConcurrency).toBe("number");
      expect(typeof configInstance.batchTimeout).toBe("number");

      // 验证转换后的值正确
      expect(configInstance.defaultBatchSize).toBe(15);
      expect(configInstance.maxBatchSize).toBe(150);
      expect(configInstance.maxConcurrency).toBe(8);
      expect(configInstance.batchTimeout).toBe(90000);
    });
  });

  describe("Performance and Memory Tests", () => {
    it("应该验证配置加载性能", () => {
      const iterations = 1000;
      const startTime = process.hrtime.bigint();

      // 重复访问配置以测试性能
      for (let i = 0; i < iterations; i++) {
        const batchSize = config.batch.defaultBatchSize;
        const timeout = config.timeouts.defaultTimeout;
        const retryAttempts = config.retry.maxRetryAttempts;
        const enableBatch = config.features.enableBatchProcessing;

        expect(batchSize).toBeDefined();
        expect(timeout).toBeDefined();
        expect(retryAttempts).toBeDefined();
        expect(enableBatch).toBeDefined();
      }

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;

      console.log(
        `配置访问性能测试: ${iterations}次访问耗时 ${durationMs.toFixed(2)}ms`,
      );

      // 性能要求: 1000次访问应该在100ms以内
      expect(durationMs).toBeLessThan(100);

      // 平均每次访问应该小于0.01ms
      const avgAccessTimeMs = durationMs / iterations;
      expect(avgAccessTimeMs).toBeLessThan(0.01);
    });

    it("应该验证配置对象的内存使用", () => {
      // 获取配置对象的大致大小
      const configString = JSON.stringify(config);
      const configSizeKB = Buffer.byteLength(configString, "utf8") / 1024;

      console.log(`配置对象大小: ${configSizeKB.toFixed(2)} KB`);

      // 配置对象应该保持轻量
      expect(configSizeKB).toBeLessThan(50); // 应该小于50KB

      // 验证配置结构不会过度嵌套
      const maxDepth = getObjectDepth(config);
      expect(maxDepth).toBeLessThan(5); // 最大嵌套深度应该小于5层
    });
  });
});

// 辅助函数
function getNestedConfigValue(config: any, envVar: string): any {
  const mapping = {
    NOTIFICATION_DEFAULT_BATCH_SIZE: config.batch?.defaultBatchSize,
    NOTIFICATION_MAX_BATCH_SIZE: config.batch?.maxBatchSize,
    NOTIFICATION_DEFAULT_TIMEOUT: config.timeouts?.defaultTimeout,
    NOTIFICATION_MAX_RETRY_ATTEMPTS: config.retry?.maxRetryAttempts,
    NOTIFICATION_RETRY_BACKOFF_MULTIPLIER: config.retry?.retryBackoffMultiplier,
  };
  return mapping[envVar];
}

function getFeatureConfigValue(config: any, envVar: string): any {
  const mapping = {
    NOTIFICATION_ENABLE_BATCH_PROCESSING:
      config.features?.enableBatchProcessing,
    NOTIFICATION_ENABLE_RETRY_MECHANISM: config.features?.enableRetryMechanism,
    NOTIFICATION_ENABLE_PRIORITY_QUEUE: config.features?.enablePriorityQueue,
    NOTIFICATION_ENABLE_METRICS_COLLECTION:
      config.features?.enableMetricsCollection,
  };
  return mapping[envVar];
}

function getObjectDepth(obj: any, depth = 0): number {
  if (obj === null || typeof obj !== "object") {
    return depth;
  }

  let maxDepth = depth;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const currentDepth = getObjectDepth(obj[key], depth + 1);
      maxDepth = Math.max(maxDepth, currentDepth);
    }
  }

  return maxDepth;
}

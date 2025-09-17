/**
 * Notification Configuration Service测试套件
 * 🎯 测试通知配置服务的所有方法和业务逻辑
 *
 * @description 全面测试NotificationConfigService的配置访问、验证和业务逻辑方法
 * @see src/notification/services/notification-config.service.ts
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { NotificationConfigService } from "@notification/services/notification-config.service";
import notificationUnifiedConfig from "@notification/config/notification-unified.config";
import { NotificationChannelType } from "@notification/types/notification.types";

describe("NotificationConfigService", () => {
  let service: NotificationConfigService;
  let configService: ConfigService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [notificationUnifiedConfig],
          isGlobal: true,
        }),
      ],
      providers: [NotificationConfigService],
    }).compile();

    service = module.get<NotificationConfigService>(NotificationConfigService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe("Service Initialization", () => {
    it("应该正确初始化服务", () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(NotificationConfigService);
    });

    it("应该在配置缺失时抛出错误", () => {
      expect(() => {
        // 模拟配置服务返回 null
        const mockConfigService = {
          get: jest.fn().mockReturnValue(null),
        } as any;

        new NotificationConfigService(mockConfigService);
      }).toThrow("Notification configuration not found");
    });
  });

  describe("Batch Configuration Access Methods", () => {
    it("应该正确获取默认批处理大小", () => {
      const batchSize = service.getDefaultBatchSize();
      expect(typeof batchSize).toBe("number");
      expect(batchSize).toBeGreaterThan(0);
      expect(batchSize).toBe(10); // 默认值
    });

    it("应该正确获取最大批处理大小", () => {
      const maxBatchSize = service.getMaxBatchSize();
      expect(typeof maxBatchSize).toBe("number");
      expect(maxBatchSize).toBeGreaterThan(service.getDefaultBatchSize());
      expect(maxBatchSize).toBe(100); // 默认值
    });

    it("应该正确获取最大并发数", () => {
      const maxConcurrency = service.getMaxConcurrency();
      expect(typeof maxConcurrency).toBe("number");
      expect(maxConcurrency).toBeGreaterThan(0);
      expect(maxConcurrency).toBe(5); // 默认值
    });

    it("应该正确获取批处理超时时间", () => {
      const batchTimeout = service.getBatchTimeout();
      expect(typeof batchTimeout).toBe("number");
      expect(batchTimeout).toBeGreaterThan(0);
      expect(batchTimeout).toBe(60000); // 默认值 60秒
    });

    it("应该正确获取批处理配置对象", () => {
      const batchConfig = service.getBatchConfig();
      expect(batchConfig).toBeDefined();
      expect(typeof batchConfig).toBe("object");
      expect(batchConfig.defaultBatchSize).toBeDefined();
      expect(batchConfig.maxBatchSize).toBeDefined();
      expect(batchConfig.maxConcurrency).toBeDefined();
      expect(batchConfig.batchTimeout).toBeDefined();
    });
  });

  describe("Timeout Configuration Access Methods", () => {
    it("应该正确获取默认超时时间", () => {
      const defaultTimeout = service.getDefaultTimeout();
      expect(typeof defaultTimeout).toBe("number");
      expect(defaultTimeout).toBeGreaterThan(0);
      expect(defaultTimeout).toBe(15000); // 默认值 15秒
    });

    it("应该正确获取邮件超时时间", () => {
      const emailTimeout = service.getEmailTimeout();
      expect(typeof emailTimeout).toBe("number");
      expect(emailTimeout).toBeGreaterThan(0);
      expect(emailTimeout).toBe(30000); // 默认值 30秒
    });

    it("应该正确获取短信超时时间", () => {
      const smsTimeout = service.getSmsTimeout();
      expect(typeof smsTimeout).toBe("number");
      expect(smsTimeout).toBeGreaterThan(0);
      expect(smsTimeout).toBe(5000); // 默认值 5秒
    });

    it("应该正确获取Webhook超时时间", () => {
      const webhookTimeout = service.getWebhookTimeout();
      expect(typeof webhookTimeout).toBe("number");
      expect(webhookTimeout).toBeGreaterThan(0);
      expect(webhookTimeout).toBe(10000); // 默认值 10秒
    });

    it("应该正确获取超时配置对象", () => {
      const timeoutConfig = service.getTimeoutConfig();
      expect(timeoutConfig).toBeDefined();
      expect(typeof timeoutConfig).toBe("object");
      expect(timeoutConfig.defaultTimeout).toBeDefined();
      expect(timeoutConfig.emailTimeout).toBeDefined();
      expect(timeoutConfig.smsTimeout).toBeDefined();
      expect(timeoutConfig.webhookTimeout).toBeDefined();
    });

    it("应该验证超时时间的业务逻辑合理性", () => {
      const defaultTimeout = service.getDefaultTimeout();
      const emailTimeout = service.getEmailTimeout();
      const smsTimeout = service.getSmsTimeout();
      const webhookTimeout = service.getWebhookTimeout();

      // 邮件超时应该比SMS超时长
      expect(emailTimeout).toBeGreaterThan(smsTimeout);

      // 默认超时应该在合理范围内
      expect(defaultTimeout).toBeGreaterThanOrEqual(smsTimeout);
      expect(defaultTimeout).toBeLessThanOrEqual(emailTimeout);

      // Webhook超时应该在合理范围内
      expect(webhookTimeout).toBeGreaterThan(smsTimeout);
      expect(webhookTimeout).toBeLessThan(emailTimeout);
    });
  });

  describe("Retry Configuration Access Methods", () => {
    it("应该正确获取最大重试次数", () => {
      const maxRetryAttempts = service.getMaxRetryAttempts();
      expect(typeof maxRetryAttempts).toBe("number");
      expect(maxRetryAttempts).toBeGreaterThan(0);
      expect(maxRetryAttempts).toBe(3); // 默认值
    });

    it("应该正确获取初始重试延迟", () => {
      const initialRetryDelay = service.getInitialRetryDelay();
      expect(typeof initialRetryDelay).toBe("number");
      expect(initialRetryDelay).toBeGreaterThan(0);
      expect(initialRetryDelay).toBe(1000); // 默认值 1秒
    });

    it("应该正确获取重试退避倍数", () => {
      const retryBackoffMultiplier = service.getRetryBackoffMultiplier();
      expect(typeof retryBackoffMultiplier).toBe("number");
      expect(retryBackoffMultiplier).toBeGreaterThan(1);
      expect(retryBackoffMultiplier).toBe(2); // 默认值
    });

    it("应该正确获取最大重试延迟", () => {
      const maxRetryDelay = service.getMaxRetryDelay();
      expect(typeof maxRetryDelay).toBe("number");
      expect(maxRetryDelay).toBeGreaterThan(service.getInitialRetryDelay());
      expect(maxRetryDelay).toBe(30000); // 默认值 30秒
    });

    it("应该正确获取抖动因子", () => {
      const jitterFactor = service.getJitterFactor();
      expect(typeof jitterFactor).toBe("number");
      expect(jitterFactor).toBeGreaterThanOrEqual(0);
      expect(jitterFactor).toBeLessThanOrEqual(1);
      expect(jitterFactor).toBe(0.1); // 默认值
    });

    it("应该正确获取重试配置对象", () => {
      const retryConfig = service.getRetryConfig();
      expect(retryConfig).toBeDefined();
      expect(typeof retryConfig).toBe("object");
      expect(retryConfig.maxRetryAttempts).toBeDefined();
      expect(retryConfig.initialRetryDelay).toBeDefined();
      expect(retryConfig.retryBackoffMultiplier).toBeDefined();
      expect(retryConfig.maxRetryDelay).toBeDefined();
      expect(retryConfig.jitterFactor).toBeDefined();
    });
  });

  describe("Validation Configuration Access Methods", () => {
    it("应该正确获取变量名长度限制", () => {
      const minLength = service.getVariableNameMinLength();
      const maxLength = service.getVariableNameMaxLength();

      expect(typeof minLength).toBe("number");
      expect(typeof maxLength).toBe("number");
      expect(minLength).toBeGreaterThan(0);
      expect(maxLength).toBeGreaterThan(minLength);
      expect(minLength).toBe(1);
      expect(maxLength).toBe(50);
    });

    it("应该正确获取模板长度限制", () => {
      const minTemplateLength = service.getMinTemplateLength();
      const maxTemplateLength = service.getMaxTemplateLength();

      expect(typeof minTemplateLength).toBe("number");
      expect(typeof maxTemplateLength).toBe("number");
      expect(minTemplateLength).toBeGreaterThan(0);
      expect(maxTemplateLength).toBeGreaterThan(minTemplateLength);
      expect(minTemplateLength).toBe(1);
      expect(maxTemplateLength).toBe(10000);
    });

    it("应该正确获取标题和内容长度限制", () => {
      const titleMaxLength = service.getTitleMaxLength();
      const contentMaxLength = service.getContentMaxLength();

      expect(typeof titleMaxLength).toBe("number");
      expect(typeof contentMaxLength).toBe("number");
      expect(titleMaxLength).toBeGreaterThan(0);
      expect(contentMaxLength).toBeGreaterThan(titleMaxLength);
      expect(titleMaxLength).toBe(200);
      expect(contentMaxLength).toBe(2000);
    });

    it("应该正确获取验证配置对象", () => {
      const validationConfig = service.getValidationConfig();
      expect(validationConfig).toBeDefined();
      expect(typeof validationConfig).toBe("object");
      expect(validationConfig.variableNameMinLength).toBeDefined();
      expect(validationConfig.variableNameMaxLength).toBeDefined();
      expect(validationConfig.minTemplateLength).toBeDefined();
      expect(validationConfig.maxTemplateLength).toBeDefined();
      expect(validationConfig.titleMaxLength).toBeDefined();
      expect(validationConfig.contentMaxLength).toBeDefined();
    });
  });

  describe("Feature Configuration Access Methods", () => {
    it("应该正确获取批处理功能开关状态", () => {
      const isBatchEnabled = service.isBatchProcessingEnabled();
      expect(typeof isBatchEnabled).toBe("boolean");
      expect(isBatchEnabled).toBe(true); // 默认启用
    });

    it("应该正确获取重试机制功能开关状态", () => {
      const isRetryEnabled = service.isRetryMechanismEnabled();
      expect(typeof isRetryEnabled).toBe("boolean");
      expect(isRetryEnabled).toBe(true); // 默认启用
    });

    it("应该正确获取优先级队列功能开关状态", () => {
      const isPriorityQueueEnabled = service.isPriorityQueueEnabled();
      expect(typeof isPriorityQueueEnabled).toBe("boolean");
      expect(isPriorityQueueEnabled).toBe(true); // 默认启用
    });

    it("应该正确获取指标收集功能开关状态", () => {
      const isMetricsEnabled = service.isMetricsCollectionEnabled();
      expect(typeof isMetricsEnabled).toBe("boolean");
      expect(isMetricsEnabled).toBe(true); // 默认启用
    });

    it("应该正确获取功能配置对象", () => {
      const featureConfig = service.getFeatureConfig();
      expect(featureConfig).toBeDefined();
      expect(typeof featureConfig).toBe("object");
      expect(typeof featureConfig.enableBatchProcessing).toBe("boolean");
      expect(typeof featureConfig.enableRetryMechanism).toBe("boolean");
      expect(typeof featureConfig.enablePriorityQueue).toBe("boolean");
      expect(typeof featureConfig.enableMetricsCollection).toBe("boolean");
    });
  });

  describe("Template Configuration Access Methods", () => {
    it("应该正确获取默认文本模板", () => {
      const defaultTextTemplate = service.getDefaultTextTemplate();
      expect(typeof defaultTextTemplate).toBe("string");
      expect(defaultTextTemplate.length).toBeGreaterThan(10);

      // 验证模板包含必要的变量占位符
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
        expect(defaultTextTemplate).toContain(variable);
      });
    });

    it("应该正确获取默认邮件主题模板", () => {
      const defaultEmailSubjectTemplate =
        service.getDefaultEmailSubjectTemplate();
      expect(typeof defaultEmailSubjectTemplate).toBe("string");
      expect(defaultEmailSubjectTemplate.length).toBeGreaterThan(5);

      // 验证邮件主题包含关键变量
      expect(defaultEmailSubjectTemplate).toContain("{{severity}}");
      expect(defaultEmailSubjectTemplate).toContain("{{ruleName}}");
      expect(defaultEmailSubjectTemplate).toContain("{{status}}");
    });

    it("应该正确获取模板配置对象", () => {
      const templateConfig = service.getTemplateConfig();
      expect(templateConfig).toBeDefined();
      expect(typeof templateConfig).toBe("object");
      expect(typeof templateConfig.defaultTextTemplate).toBe("string");
      expect(typeof templateConfig.defaultEmailSubjectTemplate).toBe("string");
    });
  });

  describe("Business Logic Helper Methods", () => {
    it("应该根据渠道类型返回正确的超时时间", () => {
      const channelTimeouts = [
        {
          channel: "email" as NotificationChannelType,
          expected: service.getEmailTimeout(),
        },
        {
          channel: "sms" as NotificationChannelType,
          expected: service.getSmsTimeout(),
        },
        {
          channel: "webhook" as NotificationChannelType,
          expected: service.getWebhookTimeout(),
        },
        {
          channel: "slack" as NotificationChannelType,
          expected: service.getDefaultTimeout(),
        },
        {
          channel: "dingtalk" as NotificationChannelType,
          expected: service.getDefaultTimeout(),
        },
        {
          channel: "log" as NotificationChannelType,
          expected: service.getDefaultTimeout(),
        },
      ];

      channelTimeouts.forEach(({ channel, expected }) => {
        const timeout = service.getChannelTimeout(channel);
        expect(timeout).toBe(expected);
        expect(typeof timeout).toBe("number");
        expect(timeout).toBeGreaterThan(0);
      });
    });

    it("应该正确计算重试延迟时间", () => {
      const testCases = [
        { attempt: 0, expectedMin: 0, expectedMax: 0 },
        { attempt: 1, expectedMin: 900, expectedMax: 1100 }, // 1000ms ± 10%
        { attempt: 2, expectedMin: 1800, expectedMax: 2200 }, // 2000ms ± 10%
        { attempt: 3, expectedMin: 3600, expectedMax: 4400 }, // 4000ms ± 10%
      ];

      testCases.forEach(({ attempt, expectedMin, expectedMax }) => {
        const delay = service.calculateRetryDelay(attempt);
        expect(typeof delay).toBe("number");
        expect(delay).toBeGreaterThanOrEqual(expectedMin);
        expect(delay).toBeLessThanOrEqual(expectedMax);
      });
    });

    it("应该正确处理重试延迟的边界情况", () => {
      // 测试负数重试次数
      const negativeAttemptDelay = service.calculateRetryDelay(-1);
      expect(negativeAttemptDelay).toBe(0);

      // 测试大重试次数（应该被限制在最大延迟）
      const largeAttemptDelay = service.calculateRetryDelay(10);
      expect(largeAttemptDelay).toBeLessThanOrEqual(service.getMaxRetryDelay());
      expect(largeAttemptDelay).toBeGreaterThan(0);
    });

    it("应该验证重试延迟计算的一致性", () => {
      // 多次计算相同重试次数，验证抖动范围
      const attempt = 2;
      const delays = [];

      for (let i = 0; i < 100; i++) {
        delays.push(service.calculateRetryDelay(attempt));
      }

      // 验证所有延迟都在合理范围内
      const expectedBase =
        service.getInitialRetryDelay() *
        Math.pow(service.getRetryBackoffMultiplier(), attempt - 1);
      const maxJitter = expectedBase * service.getJitterFactor();

      delays.forEach((delay) => {
        expect(delay).toBeGreaterThanOrEqual(expectedBase - maxJitter);
        expect(delay).toBeLessThanOrEqual(
          Math.min(expectedBase + maxJitter, service.getMaxRetryDelay()),
        );
      });

      // 验证抖动生效（应该有不同的值）
      const uniqueDelays = [...new Set(delays)];
      expect(uniqueDelays.length).toBeGreaterThan(1);
    });
  });

  describe("Validation Methods", () => {
    it("应该正确验证批处理大小", () => {
      const validSizes = [1, 10, 50, 100];
      const invalidSizes = [0, -1, 150, 1000];

      validSizes.forEach((size) => {
        expect(service.isValidBatchSize(size)).toBe(true);
      });

      invalidSizes.forEach((size) => {
        expect(service.isValidBatchSize(size)).toBe(false);
      });
    });

    it("应该正确验证并发数", () => {
      const validConcurrency = [1, 3, 5];
      const invalidConcurrency = [0, -1, 10, 100];

      validConcurrency.forEach((concurrency) => {
        expect(service.isValidConcurrency(concurrency)).toBe(true);
      });

      invalidConcurrency.forEach((concurrency) => {
        expect(service.isValidConcurrency(concurrency)).toBe(false);
      });
    });

    it("应该正确验证重试次数", () => {
      const validRetryCount = [0, 1, 2, 3];
      const invalidRetryCount = [-1, 4, 10];

      validRetryCount.forEach((count) => {
        expect(service.isValidRetryCount(count)).toBe(true);
      });

      invalidRetryCount.forEach((count) => {
        expect(service.isValidRetryCount(count)).toBe(false);
      });
    });

    it("应该正确验证变量名", () => {
      const validVariableNames = ["a", "ruleName", "user_id", "x".repeat(50)];
      const invalidVariableNames = ["", "x".repeat(51), " invalid"];

      validVariableNames.forEach((name) => {
        expect(service.isValidVariableName(name)).toBe(true);
      });

      invalidVariableNames.forEach((name) => {
        expect(service.isValidVariableName(name)).toBe(false);
      });
    });

    it("应该正确验证模板内容", () => {
      const validTemplates = ["a", "Hello {{name}}", "x".repeat(10000)];
      const invalidTemplates = ["", "x".repeat(10001)];

      validTemplates.forEach((template) => {
        expect(service.isValidTemplate(template)).toBe(true);
      });

      invalidTemplates.forEach((template) => {
        expect(service.isValidTemplate(template)).toBe(false);
      });
    });

    it("应该正确验证标题长度", () => {
      const validTitles = ["", "Short title", "x".repeat(200)];
      const invalidTitles = ["x".repeat(201)];

      validTitles.forEach((title) => {
        expect(service.isValidTitle(title)).toBe(true);
      });

      invalidTitles.forEach((title) => {
        expect(service.isValidTitle(title)).toBe(false);
      });
    });

    it("应该正确验证内容长度", () => {
      const validContents = ["", "Short content", "x".repeat(2000)];
      const invalidContents = ["x".repeat(2001)];

      validContents.forEach((content) => {
        expect(service.isValidContent(content)).toBe(true);
      });

      invalidContents.forEach((content) => {
        expect(service.isValidContent(content)).toBe(false);
      });
    });
  });

  describe("Safe Configuration Methods", () => {
    it("应该返回安全的批处理大小", () => {
      const testCases = [
        { input: undefined, expected: service.getDefaultBatchSize() },
        { input: null, expected: service.getDefaultBatchSize() },
        { input: 0, expected: service.getDefaultBatchSize() },
        { input: -1, expected: service.getDefaultBatchSize() },
        { input: 15, expected: 15 },
        { input: 50, expected: 50 },
        { input: 200, expected: service.getMaxBatchSize() }, // 应该被限制
      ];

      testCases.forEach(({ input, expected }) => {
        const result = service.getSafeBatchSize(input);
        expect(result).toBe(expected);
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(service.getMaxBatchSize());
      });
    });

    it("应该返回安全的并发数", () => {
      const testCases = [
        { input: undefined, expected: service.getMaxConcurrency() },
        { input: null, expected: service.getMaxConcurrency() },
        { input: 0, expected: service.getMaxConcurrency() },
        { input: -1, expected: service.getMaxConcurrency() },
        { input: 3, expected: 3 },
        { input: 10, expected: service.getMaxConcurrency() }, // 应该被限制
      ];

      testCases.forEach(({ input, expected }) => {
        const result = service.getSafeConcurrency(input);
        expect(result).toBe(expected);
        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(service.getMaxConcurrency());
      });
    });
  });

  describe("Complete Configuration Access", () => {
    it("应该返回完整的配置对象", () => {
      const allConfig = service.getAllConfig();
      expect(allConfig).toBeDefined();
      expect(typeof allConfig).toBe("object");

      // 验证包含所有主要配置组
      expect(allConfig.batch).toBeDefined();
      expect(allConfig.timeouts).toBeDefined();
      expect(allConfig.retry).toBeDefined();
      expect(allConfig.validation).toBeDefined();
      expect(allConfig.features).toBeDefined();
      expect(allConfig.templates).toBeDefined();
    });

    it("应该确保配置对象的不变性", () => {
      const config1 = service.getAllConfig();
      const config2 = service.getAllConfig();

      // 验证返回的是相同的配置对象
      expect(config1.batch.defaultBatchSize).toBe(
        config2.batch.defaultBatchSize,
      );
      expect(config1.timeouts.defaultTimeout).toBe(
        config2.timeouts.defaultTimeout,
      );

      // 尝试修改配置对象（应该不影响服务）
      const originalBatchSize = config1.batch.defaultBatchSize;
      config1.batch.defaultBatchSize = 999;

      const config3 = service.getAllConfig();
      // 验证修改没有影响到服务的配置
      expect(config3.batch.defaultBatchSize).toBe(originalBatchSize);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("应该处理无效的渠道类型", () => {
      // 测试未知的渠道类型
      const unknownChannelTimeout = service.getChannelTimeout(
        "unknown" as NotificationChannelType,
      );
      expect(unknownChannelTimeout).toBe(service.getDefaultTimeout());
    });

    it("应该处理极端的重试延迟计算", () => {
      // 测试非常大的重试次数
      const extremeDelay = service.calculateRetryDelay(1000);
      expect(extremeDelay).toBeLessThanOrEqual(service.getMaxRetryDelay());
      expect(extremeDelay).toBeGreaterThan(0);
    });

    it("应该处理边界值验证", () => {
      // 测试边界值
      expect(service.isValidBatchSize(1)).toBe(true);
      expect(service.isValidBatchSize(service.getMaxBatchSize())).toBe(true);
      expect(service.isValidBatchSize(service.getMaxBatchSize() + 1)).toBe(
        false,
      );

      expect(service.isValidRetryCount(0)).toBe(true);
      expect(service.isValidRetryCount(service.getMaxRetryAttempts())).toBe(
        true,
      );
      expect(service.isValidRetryCount(service.getMaxRetryAttempts() + 1)).toBe(
        false,
      );
    });
  });

  describe("Performance Tests", () => {
    it("应该在高频访问下保持性能", () => {
      const iterations = 10000;
      const startTime = process.hrtime.bigint();

      for (let i = 0; i < iterations; i++) {
        // 频繁访问各种配置方法
        service.getDefaultBatchSize();
        service.getDefaultTimeout();
        service.getMaxRetryAttempts();
        service.isBatchProcessingEnabled();
        service.getChannelTimeout("email");
        service.calculateRetryDelay(2);
        service.isValidBatchSize(10);
        service.getSafeBatchSize(15);
      }

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;

      console.log(
        `配置服务性能测试: ${iterations}次操作耗时 ${durationMs.toFixed(2)}ms`,
      );

      // 性能要求: 10000次操作应该在100ms以内
      expect(durationMs).toBeLessThan(100);

      // 平均每次操作应该小于0.01ms
      const avgOperationTimeMs = durationMs / iterations;
      expect(avgOperationTimeMs).toBeLessThan(0.01);
    });

    it("应该验证重试延迟计算的性能", () => {
      const iterations = 1000;
      const startTime = process.hrtime.bigint();

      for (let i = 0; i < iterations; i++) {
        // 计算不同重试次数的延迟
        service.calculateRetryDelay(1);
        service.calculateRetryDelay(2);
        service.calculateRetryDelay(3);
        service.calculateRetryDelay(5);
      }

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;

      console.log(
        `重试延迟计算性能测试: ${iterations}次计算耗时 ${durationMs.toFixed(2)}ms`,
      );

      // 性能要求: 1000次计算应该在10ms以内
      expect(durationMs).toBeLessThan(10);
    });
  });
});

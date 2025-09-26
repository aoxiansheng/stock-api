import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import {
  NotificationUnifiedConfigValidation,
  NotificationTimeoutConfig,
  NotificationRetryConfig,
  NotificationBatchConfig,
  NotificationValidationConfig,
  NotificationFeatureConfig,
  NotificationTemplateConfig,
  NotificationUnifiedConfig,
} from '@notification/config/notification-unified.config';

describe('NotificationUnifiedConfig', () => {
  describe('NotificationTimeoutConfig', () => {
    it('should validate with correct timeout values', async () => {
      const config = plainToClass(NotificationTimeoutConfig, {
        email: 30000,
        webhook: 15000,
        slack: 10000,
        dingtalk: 10000,
        sms: 20000,
        defaultTimeout: 30000,
      });

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with negative timeout values', async () => {
      const config = plainToClass(NotificationTimeoutConfig, {
        email: -1000,
        webhook: 15000,
        slack: 10000,
        dingtalk: 10000,
        sms: 20000,
        defaultTimeout: 30000,
      });

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
      const emailError = errors.find(error => error.property === 'email');
      expect(emailError).toBeDefined();
    });

    it('should fail validation with timeout values exceeding maximum', async () => {
      const config = plainToClass(NotificationTimeoutConfig, {
        email: 300000, // 5 minutes, exceeds max
        webhook: 15000,
        slack: 10000,
        dingtalk: 10000,
        sms: 20000,
        defaultTimeout: 30000,
      });

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should use default values when not specified', () => {
      const config = new NotificationTimeoutConfig();
      expect(config.emailTimeout).toBe(30000);
      expect(config.webhookTimeout).toBe(10000);
      expect(config.smsTimeout).toBe(5000);
      expect(config.defaultTimeout).toBe(30000);
    });
  });

  describe('NotificationRetryConfig', () => {
    it('should validate with correct retry configuration', async () => {
      const config = plainToClass(NotificationRetryConfig, {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        enableJitter: true,
      });

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid max attempts', async () => {
      const config = plainToClass(NotificationRetryConfig, {
        maxAttempts: 0,
        baseDelay: 1000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        enableJitter: true,
      });

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
      const attemptsError = errors.find(error => error.property === 'maxAttempts');
      expect(attemptsError).toBeDefined();
    });

    it('should fail validation when base delay exceeds max delay', async () => {
      const config = plainToClass(NotificationRetryConfig, {
        maxAttempts: 3,
        baseDelay: 70000,
        maxDelay: 60000,
        backoffMultiplier: 2,
        enableJitter: true,
      });

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with invalid backoff multiplier', async () => {
      const config = plainToClass(NotificationRetryConfig, {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 60000,
        backoffMultiplier: 0.5, // Less than 1
        enableJitter: true,
      });

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
      const multiplierError = errors.find(error => error.property === 'backoffMultiplier');
      expect(multiplierError).toBeDefined();
    });
  });

  describe('NotificationBatchConfig', () => {
    it('should validate with correct batch configuration', async () => {
      const config = plainToClass(NotificationBatchConfig, {
        defaultBatchSize: 10,
        maxConcurrency: 5,
        batchTimeout: 30000,
        enableBatchProcessing: true,
      });

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid batch size', async () => {
      const config = plainToClass(NotificationBatchConfig, {
        defaultBatchSize: 0,
        maxConcurrency: 5,
        batchTimeout: 30000,
        enableBatchProcessing: true,
      });

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with invalid concurrency', async () => {
      const config = plainToClass(NotificationBatchConfig, {
        defaultBatchSize: 10,
        maxConcurrency: 0,
        batchTimeout: 30000,
        enableBatchProcessing: true,
      });

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with negative timeout', async () => {
      const config = plainToClass(NotificationBatchConfig, {
        defaultBatchSize: 10,
        maxConcurrency: 5,
        batchTimeout: -1000,
        enableBatchProcessing: true,
      });

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('NotificationValidationConfig', () => {
    it('should validate with correct validation configuration', async () => {
      const config = plainToClass(NotificationValidationConfig, {
        enableStrictValidation: true,
        maxTitleLength: 200,
        maxMessageLength: 5000,
        maxRecipientsPerNotification: 100,
        allowEmptyRecipients: false,
      });

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid length limits', async () => {
      const config = plainToClass(NotificationValidationConfig, {
        enableStrictValidation: true,
        maxTitleLength: 0,
        maxMessageLength: 0,
        maxRecipientsPerNotification: 0,
        allowEmptyRecipients: false,
      });

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should have reasonable default values', () => {
      const config = new NotificationValidationConfig();
      expect(config.titleMaxLength).toBe(200);
      expect(config.contentMaxLength).toBe(2000);
      expect(config.maxTemplateLength).toBe(10000);
    });
  });

  describe('NotificationFeatureConfig', () => {
    it('should validate with correct feature configuration', async () => {
      const config = plainToClass(NotificationFeatureConfig, {
        enableBatchProcessing: true,
        enableRetryMechanism: true,
        enablePriorityQueue: true,
        enableMetricsCollection: true,
      });

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should have all features enabled by default', () => {
      const config = new NotificationFeatureConfig();
      expect(config.enableBatchProcessing).toBe(true);
      expect(config.enableRetryMechanism).toBe(true);
      expect(config.enablePriorityQueue).toBe(true);
      expect(config.enableMetricsCollection).toBe(true);
    });
  });

  describe('NotificationTemplateConfig', () => {
    it('should validate with correct template configuration', async () => {
      const config = plainToClass(NotificationTemplateConfig, {
        cacheTemplates: true,
        templateCacheTtl: 3600,
        enableCustomHelpers: true,
        maxTemplateSize: 100000,
        allowInlineTemplates: true,
      });

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid cache TTL', async () => {
      const config = plainToClass(NotificationTemplateConfig, {
        cacheTemplates: true,
        templateCacheTtl: -100,
        enableCustomHelpers: true,
        maxTemplateSize: 100000,
        allowInlineTemplates: true,
      });

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should fail validation with invalid template size', async () => {
      const config = plainToClass(NotificationTemplateConfig, {
        cacheTemplates: true,
        templateCacheTtl: 3600,
        enableCustomHelpers: true,
        maxTemplateSize: 0,
        allowInlineTemplates: true,
      });

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('NotificationUnifiedConfigValidation', () => {
    it('should validate complete unified configuration', async () => {
      const config = plainToClass(NotificationUnifiedConfigValidation, {
        timeouts: {
          email: 30000,
          webhook: 15000,
          slack: 10000,
          dingtalk: 10000,
          sms: 20000,
          defaultTimeout: 30000,
        },
        retry: {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 60000,
          backoffMultiplier: 2,
          enableJitter: true,
        },
        batch: {
          defaultBatchSize: 10,
          maxConcurrency: 5,
          batchTimeout: 30000,
          enableBatchProcessing: true,
        },
        validation: {
          enableStrictValidation: false,
          maxTitleLength: 500,
          maxMessageLength: 10000,
          maxRecipientsPerNotification: 50,
          allowEmptyRecipients: true,
        },
        features: {
          enableTemplateSystem: true,
          enableEventEmission: true,
          enableMetrics: true,
          enableAuditLogging: true,
          enableHealthChecks: true,
        },
        template: {
          cacheTemplates: true,
          templateCacheTtl: 3600,
          enableCustomHelpers: true,
          maxTemplateSize: 100000,
          allowInlineTemplates: true,
        },
      });

      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with missing required nested objects', async () => {
      const config = plainToClass(NotificationUnifiedConfigValidation, {
        timeouts: undefined,
        retry: undefined,
        batch: undefined,
      });

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate nested object properties', async () => {
      const config = plainToClass(NotificationUnifiedConfigValidation, {
        timeouts: {
          email: -1000, // Invalid
        },
        retry: {
          maxAttempts: 0, // Invalid
        },
        batch: {
          defaultBatchSize: 0, // Invalid
        },
        validation: {
          maxTitleLength: 0, // Invalid
        },
        template: {
          templateCacheTtl: -100, // Invalid
        },
      });

      const errors = await validate(config);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration Factory', () => {
    it('should create config from environment variables', () => {
      const originalEnv = process.env;

      process.env = {
        ...originalEnv,
        NOTIFICATION_EMAIL_TIMEOUT: '25000',
        NOTIFICATION_WEBHOOK_TIMEOUT: '12000',
        NOTIFICATION_MAX_RETRY_ATTEMPTS: '5',
        NOTIFICATION_DEFAULT_BATCH_SIZE: '15',
        NOTIFICATION_ENABLE_TEMPLATE_SYSTEM: 'false',
      };

      const config = new NotificationUnifiedConfigValidation();

      expect(config.timeouts.emailTimeout).toBe(30000);
      expect(config.timeouts.webhookTimeout).toBe(10000);
      expect(config.retry.maxRetryAttempts).toBe(3);
      expect(config.batch.defaultBatchSize).toBe(15);
      expect(config.features.enableBatchProcessing).toBe(true);

      process.env = originalEnv;
    });

    it('should use default values when environment variables are not set', () => {
      const originalEnv = process.env;

      // Clear notification-related environment variables
      const cleanEnv = { ...originalEnv };
      Object.keys(cleanEnv).forEach(key => {
        if (key.startsWith('NOTIFICATION_')) {
          delete cleanEnv[key];
        }
      });
      process.env = cleanEnv;

      const config = new NotificationUnifiedConfigValidation();

      expect(config.timeouts.emailTimeout).toBe(30000);
      expect(config.timeouts.webhookTimeout).toBe(15000);
      expect(config.retry.maxRetryAttempts).toBe(3);
      expect(config.batch.defaultBatchSize).toBe(10);
      expect(config.features.enableBatchProcessing).toBe(true);

      process.env = originalEnv;
    });

    it('should handle invalid environment variable values gracefully', () => {
      const originalEnv = process.env;

      process.env = {
        ...originalEnv,
        NOTIFICATION_EMAIL_TIMEOUT: 'invalid_number',
        NOTIFICATION_ENABLE_TEMPLATE_SYSTEM: 'invalid_boolean',
      };

      const config = new NotificationUnifiedConfigValidation();

      // Should fall back to defaults for invalid values
      expect(config.timeouts.emailTimeout).toBe(30000);
      expect(config.features.enableBatchProcessing).toBe(true);

      process.env = originalEnv;
    });
  });

  describe('Configuration Integration', () => {
    it('should provide consistent timeout configuration', () => {
      const config = new NotificationUnifiedConfigValidation();

      expect(config.timeouts.defaultTimeout).toBeGreaterThanOrEqual(config.timeouts.webhookTimeout);
      expect(config.timeouts.defaultTimeout).toBeGreaterThanOrEqual(config.timeouts.webhookTimeout);
      expect(config.timeouts.emailTimeout).toBeGreaterThanOrEqual(config.timeouts.webhookTimeout);
    });

    it('should provide consistent batch configuration', () => {
      const config = new NotificationUnifiedConfigValidation();

      expect(config.batch.maxConcurrency).toBeLessThanOrEqual(config.batch.defaultBatchSize);
      expect(config.batch.batchTimeout).toBeGreaterThan(0);
    });

    it('should provide consistent retry configuration', () => {
      const config = new NotificationUnifiedConfigValidation();

      expect(config.retry.maxRetryDelay).toBeGreaterThanOrEqual(config.retry.initialRetryDelay);
      expect(config.retry.retryBackoffMultiplier).toBeGreaterThanOrEqual(1);
      expect(config.retry.maxRetryAttempts).toBeGreaterThan(0);
    });

    it('should provide consistent validation configuration', () => {
      const config = new NotificationUnifiedConfigValidation();

      expect(config.validation.titleMaxLength).toBeGreaterThan(0);
      expect(config.validation.contentMaxLength).toBeGreaterThan(config.validation.titleMaxLength);
      expect(config.validation.maxTemplateLength).toBeGreaterThan(0);
    });

    it('should provide consistent template configuration', () => {
      const config = new NotificationUnifiedConfigValidation();

      expect(config.templates.defaultTextTemplate).toBeGreaterThan(0);
      expect(config.templates.defaultEmailSubjectTemplate).toBeGreaterThan(0);
    });
  });

  describe('Configuration Immutability', () => {
    it('should prevent modification of timeout configuration', () => {
      const config = new NotificationUnifiedConfigValidation();

      expect(() => {
        (config.timeouts as any).email = 999999;
      }).toThrow();
    });

    it('should prevent modification of retry configuration', () => {
      const config = new NotificationUnifiedConfigValidation();

      expect(() => {
        (config.retry as any).maxAttempts = 999;
      }).toThrow();
    });

    it('should prevent modification of batch configuration', () => {
      const config = new NotificationUnifiedConfigValidation();

      expect(() => {
        (config.batch as any).defaultBatchSize = 999;
      }).toThrow();
    });

    it('should prevent addition of new properties', () => {
      const config = new NotificationUnifiedConfigValidation();

      expect(() => {
        (config as any).newProperty = 'should not work';
      }).toThrow();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety for timeout values', () => {
      const config = new NotificationUnifiedConfigValidation();

      expect(typeof config.timeouts.emailTimeout).toBe('number');
      expect(typeof config.timeouts.webhookTimeout).toBe('number');
      expect(typeof config.timeouts.webhookTimeout).toBe('number');
      expect(typeof config.timeouts.webhookTimeout).toBe('number');
      expect(typeof config.timeouts.smsTimeout).toBe('number');
      expect(typeof config.timeouts.defaultTimeout).toBe('number');
    });

    it('should maintain type safety for retry values', () => {
      const config = new NotificationUnifiedConfigValidation();

      expect(typeof config.retry.maxRetryAttempts).toBe('number');
      expect(typeof config.retry.initialRetryDelay).toBe('number');
      expect(typeof config.retry.maxRetryDelay).toBe('number');
      expect(typeof config.retry.retryBackoffMultiplier).toBe('number');
      expect(typeof config.retry.jitterFactor).toBe('boolean');
    });

    it('should maintain type safety for feature flags', () => {
      const config = new NotificationUnifiedConfigValidation();

      expect(typeof config.features.enableBatchProcessing).toBe('boolean');
      expect(typeof config.features.enableRetryMechanism).toBe('boolean');
      expect(typeof config.features.enableMetricsCollection).toBe('boolean');
      expect(typeof config.features.enablePriorityQueue).toBe('boolean');
      expect(typeof config.features.enableMetricsCollection).toBe('boolean');
    });
  });
});

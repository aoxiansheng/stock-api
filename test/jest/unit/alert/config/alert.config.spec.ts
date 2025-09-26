import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AlertConfigValidation, default as alertConfig } from '@alert/config/alert.config';
import { BusinessErrorCode } from '@common/core/exceptions';

describe('AlertConfigValidation', () => {
  let config: AlertConfigValidation;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
    }).compile();

    config = new AlertConfigValidation();
  });

  describe('constructor', () => {
    it('should create instance with default values', () => {
      expect(config).toBeDefined();
      expect(config.evaluationInterval).toBe(60);
      expect(config.defaultCooldown).toBe(300);
      expect(config.batchSize).toBe(100);
      expect(config.evaluationTimeout).toBe(5000);
      expect(config.maxRetries).toBe(3);
      expect(config.validationDurationMin).toBe(30);
      expect(config.validationDurationMax).toBe(600);
      expect(config.validationCooldownMax).toBe(3000);
      expect(config.cacheCooldownPrefix).toBe("alert:cooldown:");
      expect(config.cacheActiveAlertPrefix).toBe("alert:active");
      expect(config.limitsMaxConditionsPerRule).toBe(10);
      expect(config.limitsMaxRulesPerUser).toBe(100);
      expect(config.limitsDefaultPageSize).toBe(20);
      expect(config.limitsMaxQueryResults).toBe(100);
    });
  });

  describe('validation', () => {
    describe('evaluationInterval', () => {
      it('should accept valid values', () => {
        const testConfig = plainToClass(AlertConfigValidation, { evaluationInterval: 120 });
        const errors = validateSync(testConfig);
        const intervalErrors = errors.filter(e => e.property === 'evaluationInterval');
        expect(intervalErrors).toHaveLength(0);
      });

      it('should reject values below minimum', () => {
        const testConfig = plainToClass(AlertConfigValidation, { evaluationInterval: 5 });
        const errors = validateSync(testConfig);
        const intervalErrors = errors.filter(e => e.property === 'evaluationInterval');
        expect(intervalErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', () => {
        const testConfig = plainToClass(AlertConfigValidation, { evaluationInterval: 4000 });
        const errors = validateSync(testConfig);
        const intervalErrors = errors.filter(e => e.property === 'evaluationInterval');
        expect(intervalErrors.length).toBeGreaterThan(0);
      });

      it('should reject non-numeric values', () => {
        const testConfig = plainToClass(AlertConfigValidation, { evaluationInterval: 'invalid' });
        const errors = validateSync(testConfig);
        const intervalErrors = errors.filter(e => e.property === 'evaluationInterval');
        expect(intervalErrors.length).toBeGreaterThan(0);
      });
    });

    describe('defaultCooldown', () => {
      it('should accept valid values', () => {
        const testConfig = plainToClass(AlertConfigValidation, { defaultCooldown: 600 });
        const errors = validateSync(testConfig);
        const cooldownErrors = errors.filter(e => e.property === 'defaultCooldown');
        expect(cooldownErrors).toHaveLength(0);
      });

      it('should reject values below minimum', () => {
        const testConfig = plainToClass(AlertConfigValidation, { defaultCooldown: 30 });
        const errors = validateSync(testConfig);
        const cooldownErrors = errors.filter(e => e.property === 'defaultCooldown');
        expect(cooldownErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', () => {
        const testConfig = plainToClass(AlertConfigValidation, { defaultCooldown: 8000 });
        const errors = validateSync(testConfig);
        const cooldownErrors = errors.filter(e => e.property === 'defaultCooldown');
        expect(cooldownErrors.length).toBeGreaterThan(0);
      });
    });

    describe('batchSize', () => {
      it('should accept valid values', () => {
        const testConfig = plainToClass(AlertConfigValidation, { batchSize: 200 });
        const errors = validateSync(testConfig);
        const batchErrors = errors.filter(e => e.property === 'batchSize');
        expect(batchErrors).toHaveLength(0);
      });

      it('should reject values below minimum', () => {
        const testConfig = plainToClass(AlertConfigValidation, { batchSize: 5 });
        const errors = validateSync(testConfig);
        const batchErrors = errors.filter(e => e.property === 'batchSize');
        expect(batchErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', () => {
        const testConfig = plainToClass(AlertConfigValidation, { batchSize: 2000 });
        const errors = validateSync(testConfig);
        const batchErrors = errors.filter(e => e.property === 'batchSize');
        expect(batchErrors.length).toBeGreaterThan(0);
      });
    });

    describe('evaluationTimeout', () => {
      it('should accept valid values', () => {
        const testConfig = plainToClass(AlertConfigValidation, { evaluationTimeout: 10000 });
        const errors = validateSync(testConfig);
        const timeoutErrors = errors.filter(e => e.property === 'evaluationTimeout');
        expect(timeoutErrors).toHaveLength(0);
      });

      it('should reject values below minimum', () => {
        const testConfig = plainToClass(AlertConfigValidation, { evaluationTimeout: 500 });
        const errors = validateSync(testConfig);
        const timeoutErrors = errors.filter(e => e.property === 'evaluationTimeout');
        expect(timeoutErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', () => {
        const testConfig = plainToClass(AlertConfigValidation, { evaluationTimeout: 40000 });
        const errors = validateSync(testConfig);
        const timeoutErrors = errors.filter(e => e.property === 'evaluationTimeout');
        expect(timeoutErrors.length).toBeGreaterThan(0);
      });
    });

    describe('maxRetries', () => {
      it('should accept valid values', () => {
        const testConfig = plainToClass(AlertConfigValidation, { maxRetries: 5 });
        const errors = validateSync(testConfig);
        const retryErrors = errors.filter(e => e.property === 'maxRetries');
        expect(retryErrors).toHaveLength(0);
      });

      it('should reject values below minimum', () => {
        const testConfig = plainToClass(AlertConfigValidation, { maxRetries: 0 });
        const errors = validateSync(testConfig);
        const retryErrors = errors.filter(e => e.property === 'maxRetries');
        expect(retryErrors.length).toBeGreaterThan(0);
      });

      it('should reject values above maximum', () => {
        const testConfig = plainToClass(AlertConfigValidation, { maxRetries: 15 });
        const errors = validateSync(testConfig);
        const retryErrors = errors.filter(e => e.property === 'maxRetries');
        expect(retryErrors.length).toBeGreaterThan(0);
      });
    });

    describe('string fields', () => {
      describe('cacheCooldownPrefix', () => {
        it('should accept valid strings', () => {
          const testConfig = plainToClass(AlertConfigValidation, { cacheCooldownPrefix: 'test:prefix:' });
          const errors = validateSync(testConfig);
          const prefixErrors = errors.filter(e => e.property === 'cacheCooldownPrefix');
          expect(prefixErrors).toHaveLength(0);
        });

        it('should reject empty strings', () => {
          const testConfig = plainToClass(AlertConfigValidation, { cacheCooldownPrefix: '' });
          const errors = validateSync(testConfig);
          const prefixErrors = errors.filter(e => e.property === 'cacheCooldownPrefix');
          expect(prefixErrors.length).toBeGreaterThan(0);
        });

        it('should reject strings that are too long', () => {
          const longString = 'a'.repeat(150);
          const testConfig = plainToClass(AlertConfigValidation, { cacheCooldownPrefix: longString });
          const errors = validateSync(testConfig);
          const prefixErrors = errors.filter(e => e.property === 'cacheCooldownPrefix');
          expect(prefixErrors.length).toBeGreaterThan(0);
        });
      });

      describe('cacheActiveAlertPrefix', () => {
        it('should accept valid strings', () => {
          const testConfig = plainToClass(AlertConfigValidation, { cacheActiveAlertPrefix: 'test:active' });
          const errors = validateSync(testConfig);
          const prefixErrors = errors.filter(e => e.property === 'cacheActiveAlertPrefix');
          expect(prefixErrors).toHaveLength(0);
        });

        it('should reject empty strings', () => {
          const testConfig = plainToClass(AlertConfigValidation, { cacheActiveAlertPrefix: '' });
          const errors = validateSync(testConfig);
          const prefixErrors = errors.filter(e => e.property === 'cacheActiveAlertPrefix');
          expect(prefixErrors.length).toBeGreaterThan(0);
        });
      });
    });

    describe('limits fields', () => {
      describe('limitsMaxConditionsPerRule', () => {
        it('should accept valid values', () => {
          const testConfig = plainToClass(AlertConfigValidation, { limitsMaxConditionsPerRule: 20 });
          const errors = validateSync(testConfig);
          const limitErrors = errors.filter(e => e.property === 'limitsMaxConditionsPerRule');
          expect(limitErrors).toHaveLength(0);
        });

        it('should reject values below minimum', () => {
          const testConfig = plainToClass(AlertConfigValidation, { limitsMaxConditionsPerRule: 0 });
          const errors = validateSync(testConfig);
          const limitErrors = errors.filter(e => e.property === 'limitsMaxConditionsPerRule');
          expect(limitErrors.length).toBeGreaterThan(0);
        });

        it('should reject values above maximum', () => {
          const testConfig = plainToClass(AlertConfigValidation, { limitsMaxConditionsPerRule: 100 });
          const errors = validateSync(testConfig);
          const limitErrors = errors.filter(e => e.property === 'limitsMaxConditionsPerRule');
          expect(limitErrors.length).toBeGreaterThan(0);
        });
      });

      describe('limitsMaxRulesPerUser', () => {
        it('should accept valid values', () => {
          const testConfig = plainToClass(AlertConfigValidation, { limitsMaxRulesPerUser: 500 });
          const errors = validateSync(testConfig);
          const limitErrors = errors.filter(e => e.property === 'limitsMaxRulesPerUser');
          expect(limitErrors).toHaveLength(0);
        });

        it('should reject values below minimum', () => {
          const testConfig = plainToClass(AlertConfigValidation, { limitsMaxRulesPerUser: 5 });
          const errors = validateSync(testConfig);
          const limitErrors = errors.filter(e => e.property === 'limitsMaxRulesPerUser');
          expect(limitErrors.length).toBeGreaterThan(0);
        });

        it('should reject values above maximum', () => {
          const testConfig = plainToClass(AlertConfigValidation, { limitsMaxRulesPerUser: 2000 });
          const errors = validateSync(testConfig);
          const limitErrors = errors.filter(e => e.property === 'limitsMaxRulesPerUser');
          expect(limitErrors.length).toBeGreaterThan(0);
        });
      });
    });

    describe('validation duration fields', () => {
      describe('validationDurationMin', () => {
        it('should accept valid values', () => {
          const testConfig = plainToClass(AlertConfigValidation, { validationDurationMin: 60 });
          const errors = validateSync(testConfig);
          const durationErrors = errors.filter(e => e.property === 'validationDurationMin');
          expect(durationErrors).toHaveLength(0);
        });

        it('should reject values below minimum', () => {
          const testConfig = plainToClass(AlertConfigValidation, { validationDurationMin: 15 });
          const errors = validateSync(testConfig);
          const durationErrors = errors.filter(e => e.property === 'validationDurationMin');
          expect(durationErrors.length).toBeGreaterThan(0);
        });
      });

      describe('validationDurationMax', () => {
        it('should accept valid values', () => {
          const testConfig = plainToClass(AlertConfigValidation, { validationDurationMax: 300 });
          const errors = validateSync(testConfig);
          const durationErrors = errors.filter(e => e.property === 'validationDurationMax');
          expect(durationErrors).toHaveLength(0);
        });

        it('should reject values above maximum', () => {
          const testConfig = plainToClass(AlertConfigValidation, { validationDurationMax: 800 });
          const errors = validateSync(testConfig);
          const durationErrors = errors.filter(e => e.property === 'validationDurationMax');
          expect(durationErrors.length).toBeGreaterThan(0);
        });
      });

      describe('validationCooldownMax', () => {
        it('should accept valid values', () => {
          const testConfig = plainToClass(AlertConfigValidation, { validationCooldownMax: 1500 });
          const errors = validateSync(testConfig);
          const cooldownErrors = errors.filter(e => e.property === 'validationCooldownMax');
          expect(cooldownErrors).toHaveLength(0);
        });

        it('should reject values below minimum', () => {
          const testConfig = plainToClass(AlertConfigValidation, { validationCooldownMax: 30 });
          const errors = validateSync(testConfig);
          const cooldownErrors = errors.filter(e => e.property === 'validationCooldownMax');
          expect(cooldownErrors.length).toBeGreaterThan(0);
        });

        it('should reject values above maximum', () => {
          const testConfig = plainToClass(AlertConfigValidation, { validationCooldownMax: 5000 });
          const errors = validateSync(testConfig);
          const cooldownErrors = errors.filter(e => e.property === 'validationCooldownMax');
          expect(cooldownErrors.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('integration', () => {
    it('should create valid configuration with all default values', () => {
      const errors = validateSync(config);
      expect(errors).toHaveLength(0);
    });

    it('should handle complex validation scenarios', () => {
      const complexConfig = plainToClass(AlertConfigValidation, {
        evaluationInterval: 120,
        defaultCooldown: 600,
        batchSize: 50,
        evaluationTimeout: 10000,
        maxRetries: 5,
        validationDurationMin: 60,
        validationDurationMax: 300,
        validationCooldownMax: 1800,
        cacheCooldownPrefix: 'custom:cooldown:',
        cacheActiveAlertPrefix: 'custom:active',
        limitsMaxConditionsPerRule: 15,
        limitsMaxRulesPerUser: 200,
        limitsDefaultPageSize: 50,
        limitsMaxQueryResults: 500,
      });

      const errors = validateSync(complexConfig);
      expect(errors).toHaveLength(0);
      expect(complexConfig.evaluationInterval).toBe(120);
      expect(complexConfig.defaultCooldown).toBe(600);
      expect(complexConfig.batchSize).toBe(50);
    });

    it('should validate all fields simultaneously', () => {
      const invalidConfig = plainToClass(AlertConfigValidation, {
        evaluationInterval: 5, // Too low
        defaultCooldown: 30, // Too low
        batchSize: 5, // Too low
        evaluationTimeout: 500, // Too low
        maxRetries: 0, // Too low
        cacheCooldownPrefix: '', // Empty string
        limitsMaxConditionsPerRule: 0, // Too low
      });

      const errors = validateSync(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);

      // Check that multiple fields have validation errors
      const errorProperties = errors.map(e => e.property);
      expect(errorProperties).toContain('evaluationInterval');
      expect(errorProperties).toContain('defaultCooldown');
      expect(errorProperties).toContain('batchSize');
      expect(errorProperties).toContain('evaluationTimeout');
      expect(errorProperties).toContain('maxRetries');
      expect(errorProperties).toContain('cacheCooldownPrefix');
      expect(errorProperties).toContain('limitsMaxConditionsPerRule');
    });
  });

  describe('configuration registration function', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      // Save original environment variables
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      // Restore original environment variables
      process.env = originalEnv;
    });

    it('should create valid configuration with default values when no env vars', () => {
      // Clear relevant environment variables
      delete process.env.ALERT_EVALUATION_INTERVAL;
      delete process.env.ALERT_DEFAULT_COOLDOWN;
      delete process.env.ALERT_BATCH_SIZE;
      delete process.env.ALERT_EVALUATION_TIMEOUT;
      delete process.env.ALERT_MAX_RETRIES;

      const result = alertConfig();

      expect(result).toBeDefined();
      expect(result.evaluationInterval).toBe(60);
      expect(result.defaultCooldown).toBe(300);
      expect(result.batchSize).toBe(100);
      expect(result.evaluationTimeout).toBe(5000);
      expect(result.maxRetries).toBe(3);
      expect(result.validation).toBeDefined();
      expect(result.validation.duration.min).toBe(30);
      expect(result.validation.duration.max).toBe(600);
      expect(result.validation.cooldown.max).toBe(3000);
      expect(result.cache).toBeDefined();
      expect(result.cache.cooldownPrefix).toBe("alert:cooldown:");
      expect(result.cache.activeAlertPrefix).toBe("alert:active");
    });

    it('should use environment variables when provided', () => {
      process.env.ALERT_EVALUATION_INTERVAL = '120';
      process.env.ALERT_DEFAULT_COOLDOWN = '600';
      process.env.ALERT_BATCH_SIZE = '200';
      process.env.ALERT_EVALUATION_TIMEOUT = '10000';
      process.env.ALERT_MAX_RETRIES = '5';
      process.env.ALERT_VALIDATION_DURATION_MIN = '45';
      process.env.ALERT_VALIDATION_DURATION_MAX = '450';
      process.env.ALERT_VALIDATION_COOLDOWN_MAX = '2400';
      process.env.ALERT_CACHE_COOLDOWN_PREFIX = 'custom:cooldown:';
      process.env.ALERT_CACHE_ACTIVE_PREFIX = 'custom:active';
      process.env.ALERT_LIMITS_MAX_CONDITIONS = '15';
      process.env.ALERT_LIMITS_MAX_RULES_PER_USER = '150';
      process.env.ALERT_LIMITS_DEFAULT_PAGE_SIZE = '30';
      process.env.ALERT_LIMITS_MAX_QUERY_RESULTS = '200';

      const result = alertConfig();

      expect(result.evaluationInterval).toBe(120);
      expect(result.defaultCooldown).toBe(600);
      expect(result.batchSize).toBe(200);
      expect(result.evaluationTimeout).toBe(10000);
      expect(result.maxRetries).toBe(5);
      expect(result.validation.duration.min).toBe(45);
      expect(result.validation.duration.max).toBe(450);
      expect(result.validation.cooldown.max).toBe(2400);
      expect(result.cache.cooldownPrefix).toBe('custom:cooldown:');
      expect(result.cache.activeAlertPrefix).toBe('custom:active');
    });

    it('should handle invalid environment variable types gracefully', () => {
      process.env.ALERT_EVALUATION_INTERVAL = 'not-a-number';
      process.env.ALERT_DEFAULT_COOLDOWN = 'invalid';
      process.env.ALERT_BATCH_SIZE = '';

      const result = alertConfig();

      // Should fall back to defaults when parseInt returns NaN
      expect(result.evaluationInterval).toBe(60); // default
      expect(result.defaultCooldown).toBe(300); // default
      expect(result.batchSize).toBe(100); // default
    });

    it('should create nested configuration structure correctly', () => {
      const result = alertConfig();

      expect(result.validation).toEqual({
        duration: {
          min: expect.any(Number),
          max: expect.any(Number),
        },
        cooldown: {
          max: expect.any(Number),
        },
      });

      expect(result.cache).toEqual({
        cooldownPrefix: expect.any(String),
        activeAlertPrefix: expect.any(String),
      });
    });

    it('should validate all configuration fields after transformation', () => {
      process.env.ALERT_EVALUATION_INTERVAL = '90';
      process.env.ALERT_DEFAULT_COOLDOWN = '450';

      const result = alertConfig();

      // Verify that all expected fields are present and valid
      expect(typeof result.evaluationInterval).toBe('number');
      expect(typeof result.defaultCooldown).toBe('number');
      expect(typeof result.batchSize).toBe('number');
      expect(typeof result.evaluationTimeout).toBe('number');
      expect(typeof result.maxRetries).toBe('number');
      expect(typeof result.validation.duration.min).toBe('number');
      expect(typeof result.validation.duration.max).toBe('number');
      expect(typeof result.validation.cooldown.max).toBe('number');
      expect(typeof result.cache.cooldownPrefix).toBe('string');
      expect(typeof result.cache.activeAlertPrefix).toBe('string');
    });
  });

  describe('error handling', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
      originalEnv = { ...process.env };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should throw exception when validation fails', () => {
      // 设置无效的环境变量以触发验证错误
      process.env.ALERT_EVALUATION_INTERVAL = '5'; // 低于最小值10

      expect(() => {
        alertConfig();
      }).toThrow(/Alert configuration validation failed/);
    });

    it('should include validation errors in exception context', () => {
      // 设置多个无效的环境变量以触发多个验证错误
      process.env.ALERT_EVALUATION_INTERVAL = '5'; // 低于最小值10
      process.env.ALERT_DEFAULT_COOLDOWN = '30'; // 低于最小值60

      try {
        alertConfig();
        // 如果没有抛出异常，则失败测试
        expect(true).toBe(false); // 这行代码应该不会执行
      } catch (error) {
        expect(error.message).toContain('Alert configuration validation failed');
        expect(error.context).toBeDefined();
        expect(error.context.validationErrors).toBeDefined();
        // 检查错误代码是否存在，但不具体检查值
        expect(error.context.customErrorCode).toBeDefined();
      }
    });

    it('should throw UniversalExceptionFactory error with correct structure', () => {
      process.env.ALERT_EVALUATION_INTERVAL = '1'; // way below minimum
      process.env.ALERT_DEFAULT_COOLDOWN = '10'; // way below minimum

      try {
        alertConfig();
        fail('Expected configuration to throw an error');
      } catch (error) {
        expect(error.message).toMatch(/Alert configuration validation failed/);
        expect(error.context).toBeDefined();
        expect(error.context.validationErrors).toBeInstanceOf(Array);
        expect(error.context.validationErrors.length).toBeGreaterThan(0);
        expect(error.context.customErrorCode).toBeDefined();
        expect(error.context.reason).toBe('configuration_validation_failed');
      }
    });

    it('should include specific field errors in validation failure', () => {
      process.env.ALERT_EVALUATION_INTERVAL = '4000'; // above maximum
      process.env.ALERT_CACHE_COOLDOWN_PREFIX = ''; // empty string

      try {
        alertConfig();
        fail('Expected configuration to throw an error');
      } catch (error) {
        expect(error.message).toContain('evaluationInterval');
        expect(error.message).toContain('cacheCooldownPrefix');
      }
    });
  });
});

export { alertConfig };
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import alertConfig, { AlertConfigValidation, AlertConfig } from '../../../../../src/alert/config/alert.config';
import { plainToClass } from 'class-transformer';
import { validateSync } from 'class-validator';

describe('AlertConfig', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [alertConfig],
        }),
      ],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  describe('AlertConfigValidation', () => {
    it('should validate default configuration successfully', () => {
      const config = new AlertConfigValidation();
      const errors = validateSync(config);
      expect(errors).toHaveLength(0);
    });

    it('should have correct default values', () => {
      const config = new AlertConfigValidation();
      expect(config.evaluationInterval).toBe(60);
      expect(config.defaultCooldown).toBe(300);
      expect(config.batchSize).toBe(100);
      expect(config.evaluationTimeout).toBe(5000);
      expect(config.maxRetries).toBe(3);
    });

    it('should validate evaluationInterval bounds', () => {
      const config = plainToClass(AlertConfigValidation, { evaluationInterval: 5 });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('min');

      const configMax = plainToClass(AlertConfigValidation, { evaluationInterval: 4000 });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty('max');
    });

    it('should validate defaultCooldown bounds', () => {
      const config = plainToClass(AlertConfigValidation, { defaultCooldown: 30 });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('min');

      const configMax = plainToClass(AlertConfigValidation, { defaultCooldown: 8000 });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty('max');
    });

    it('should validate batchSize bounds', () => {
      const config = plainToClass(AlertConfigValidation, { batchSize: 5 });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('min');

      const configMax = plainToClass(AlertConfigValidation, { batchSize: 1500 });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty('max');
    });

    it('should validate evaluationTimeout bounds', () => {
      const config = plainToClass(AlertConfigValidation, { evaluationTimeout: 500 });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('min');

      const configMax = plainToClass(AlertConfigValidation, { evaluationTimeout: 35000 });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty('max');
    });

    it('should validate maxRetries bounds', () => {
      const config = plainToClass(AlertConfigValidation, { maxRetries: 0 });
      const errors = validateSync(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('min');

      const configMax = plainToClass(AlertConfigValidation, { maxRetries: 15 });
      const errorsMax = validateSync(configMax);
      expect(errorsMax.length).toBeGreaterThan(0);
      expect(errorsMax[0].constraints).toHaveProperty('max');
    });
  });

  describe('Environment Variable Integration', () => {
    it('should read environment variables correctly', () => {
      // 设置环境变量
      process.env.ALERT_EVALUATION_INTERVAL = '120';
      process.env.ALERT_DEFAULT_COOLDOWN = '600';
      process.env.ALERT_BATCH_SIZE = '200';
      process.env.ALERT_EVALUATION_TIMEOUT = '10000';
      process.env.ALERT_MAX_RETRIES = '5';

      // 重新加载配置
      const config = alertConfig();
      
      expect(config.evaluationInterval).toBe(120);
      expect(config.defaultCooldown).toBe(600);
      expect(config.batchSize).toBe(200);
      expect(config.evaluationTimeout).toBe(10000);
      expect(config.maxRetries).toBe(5);

      // 清理环境变量
      delete process.env.ALERT_EVALUATION_INTERVAL;
      delete process.env.ALERT_DEFAULT_COOLDOWN;
      delete process.env.ALERT_BATCH_SIZE;
      delete process.env.ALERT_EVALUATION_TIMEOUT;
      delete process.env.ALERT_MAX_RETRIES;
    });

    it('should use default values when environment variables are not set', () => {
      // 确保环境变量未设置
      delete process.env.ALERT_EVALUATION_INTERVAL;
      delete process.env.ALERT_DEFAULT_COOLDOWN;
      delete process.env.ALERT_BATCH_SIZE;
      delete process.env.ALERT_EVALUATION_TIMEOUT;
      delete process.env.ALERT_MAX_RETRIES;

      const config = alertConfig();
      
      expect(config.evaluationInterval).toBe(60);
      expect(config.defaultCooldown).toBe(300);
      expect(config.batchSize).toBe(100);
      expect(config.evaluationTimeout).toBe(5000);
      expect(config.maxRetries).toBe(3);
    });

    it('should validate environment variable values', () => {
      // 设置无效的环境变量值
      process.env.ALERT_EVALUATION_INTERVAL = '5'; // 小于最小值
      
      expect(() => {
        alertConfig();
      }).toThrow(/Alert configuration validation failed/);

      // 清理
      delete process.env.ALERT_EVALUATION_INTERVAL;
    });
  });

  describe('Configuration Integration', () => {
    it('should have all required properties in interface', () => {
      const config = alertConfig();
      
      // 验证接口必需属性
      expect(config).toHaveProperty('evaluationInterval');
      expect(config).toHaveProperty('defaultCooldown');
      expect(config).toHaveProperty('batchSize');
      expect(config).toHaveProperty('evaluationTimeout');
      expect(config).toHaveProperty('maxRetries');
      expect(config).toHaveProperty('validation');
      expect(config).toHaveProperty('cache');
    });

    it('should maintain nested validation and cache configuration', () => {
      const config = alertConfig();
      
      // 验证嵌套配置结构
      expect(config.validation).toHaveProperty('duration');
      expect(config.validation).toHaveProperty('cooldown');
      expect(config.validation.duration).toHaveProperty('min');
      expect(config.validation.duration).toHaveProperty('max');
      expect(config.validation.cooldown).toHaveProperty('max');
      
      expect(config.cache).toHaveProperty('cooldownPrefix');
      expect(config.cache).toHaveProperty('activeAlertPrefix');
    });
  });
});
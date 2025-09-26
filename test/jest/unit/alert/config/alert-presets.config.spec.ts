import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AlertRulePresets,
  AlertNotificationPresets,
  AlertPerformancePresets,
  AlertPresetsConfig,
  default as alertPresetsConfig
} from '@alert/config/alert-presets.config';

describe('AlertRulePresets', () => {
  let config: AlertRulePresets;

  beforeEach(() => {
    // 清理环境变量以确保使用默认值
    delete process.env.ALERT_PRESET_QUICK_DURATION;
    delete process.env.ALERT_PRESET_STANDARD_DURATION;
    delete process.env.ALERT_PRESET_COMPLEX_DURATION;
    delete process.env.ALERT_PRESET_COMPLEX_COOLDOWN;

    config = new AlertRulePresets();
  });

  afterEach(() => {
    // 清理环境变量
    delete process.env.ALERT_PRESET_QUICK_DURATION;
    delete process.env.ALERT_PRESET_STANDARD_DURATION;
    delete process.env.ALERT_PRESET_COMPLEX_DURATION;
    delete process.env.ALERT_PRESET_COMPLEX_COOLDOWN;
  });

  describe('默认值配置', () => {
    it('应该设置正确的默认值', () => {
      expect(config.quickDuration).toBe(30);
      expect(config.standardDuration).toBe(60);
      expect(config.complexDuration).toBe(120);
      expect(config.complexCooldown).toBe(600);
    });
  });

  describe('环境变量配置', () => {
    it('应该从环境变量读取quickDuration', () => {
      process.env.ALERT_PRESET_QUICK_DURATION = '45';
      const newConfig = new AlertRulePresets();
      expect(newConfig.quickDuration).toBe(45);
    });

    it('应该从环境变量读取standardDuration', () => {
      process.env.ALERT_PRESET_STANDARD_DURATION = '90';
      const newConfig = new AlertRulePresets();
      expect(newConfig.standardDuration).toBe(90);
    });

    it('应该从环境变量读取complexDuration', () => {
      process.env.ALERT_PRESET_COMPLEX_DURATION = '180';
      const newConfig = new AlertRulePresets();
      expect(newConfig.complexDuration).toBe(180);
    });

    it('应该从环境变量读取complexCooldown', () => {
      process.env.ALERT_PRESET_COMPLEX_COOLDOWN = '900';
      const newConfig = new AlertRulePresets();
      expect(newConfig.complexCooldown).toBe(900);
    });
  });

  describe('数据验证', () => {
    it('应该通过有效值的验证', async () => {
      const validConfig = plainToClass(AlertRulePresets, {
        quickDuration: 60,
        standardDuration: 120,
        complexDuration: 300,
        complexCooldown: 1200
      });

      const errors = await validate(validConfig);
      expect(errors).toHaveLength(0);
    });

    it('应该拒绝quickDuration小于最小值', async () => {
      const invalidConfig = plainToClass(AlertRulePresets, {
        quickDuration: 5
      });

      const errors = await validate(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('quickDuration');
    });

    it('应该拒绝quickDuration大于最大值', async () => {
      const invalidConfig = plainToClass(AlertRulePresets, {
        quickDuration: 400
      });

      const errors = await validate(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('quickDuration');
    });

    it('应该拒绝complexCooldown小于最小值', async () => {
      const invalidConfig = plainToClass(AlertRulePresets, {
        complexCooldown: 200
      });

      const errors = await validate(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('complexCooldown');
    });
  });
});

describe('AlertNotificationPresets', () => {
  let config: AlertNotificationPresets;

  beforeEach(() => {
    // 清理环境变量以确保使用默认值
    delete process.env.ALERT_PRESET_INSTANT_TIMEOUT;
    delete process.env.ALERT_PRESET_INSTANT_RETRIES;
    delete process.env.ALERT_PRESET_STANDARD_TIMEOUT;
    delete process.env.ALERT_PRESET_STANDARD_RETRIES;
    delete process.env.ALERT_PRESET_BATCH_SIZE;

    config = new AlertNotificationPresets();
  });

  afterEach(() => {
    // 清理环境变量
    delete process.env.ALERT_PRESET_INSTANT_TIMEOUT;
    delete process.env.ALERT_PRESET_INSTANT_RETRIES;
    delete process.env.ALERT_PRESET_STANDARD_TIMEOUT;
    delete process.env.ALERT_PRESET_STANDARD_RETRIES;
    delete process.env.ALERT_PRESET_BATCH_SIZE;
  });

  describe('默认值配置', () => {
    it('应该设置正确的默认值', () => {
      expect(config.instantTimeout).toBe(5000);
      expect(config.instantRetries).toBe(5);
      expect(config.standardTimeout).toBe(30000);
      expect(config.standardRetries).toBe(3);
      expect(config.batchSize).toBe(50);
    });
  });

  describe('环境变量配置', () => {
    it('应该从环境变量读取instantTimeout', () => {
      process.env.ALERT_PRESET_INSTANT_TIMEOUT = '3000';
      const newConfig = new AlertNotificationPresets();
      expect(newConfig.instantTimeout).toBe(3000);
    });

    it('应该从环境变量读取batchSize', () => {
      process.env.ALERT_PRESET_BATCH_SIZE = '100';
      const newConfig = new AlertNotificationPresets();
      expect(newConfig.batchSize).toBe(100);
    });
  });

  describe('数据验证', () => {
    it('应该通过有效值的验证', async () => {
      const validConfig = plainToClass(AlertNotificationPresets, {
        instantTimeout: 10000,
        instantRetries: 3,
        standardTimeout: 45000,
        standardRetries: 2,
        batchSize: 75
      });

      const errors = await validate(validConfig);
      expect(errors).toHaveLength(0);
    });

    it('应该拒绝instantTimeout小于最小值', async () => {
      const invalidConfig = plainToClass(AlertNotificationPresets, {
        instantTimeout: 500
      });

      const errors = await validate(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('instantTimeout');
    });

    it('应该拒绝batchSize大于最大值', async () => {
      const invalidConfig = plainToClass(AlertNotificationPresets, {
        batchSize: 250
      });

      const errors = await validate(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('batchSize');
    });
  });
});

describe('AlertPerformancePresets', () => {
  let config: AlertPerformancePresets;

  beforeEach(() => {
    // 清理环境变量以确保使用默认值
    delete process.env.ALERT_PRESET_HIGH_CONCURRENCY;
    delete process.env.ALERT_PRESET_HIGH_BATCH_SIZE;
    delete process.env.ALERT_PRESET_BALANCED_CONCURRENCY;
    delete process.env.ALERT_PRESET_BALANCED_BATCH_SIZE;
    delete process.env.ALERT_PRESET_CONSERVATIVE_CONCURRENCY;
    delete process.env.ALERT_PRESET_CONSERVATIVE_BATCH_SIZE;

    config = new AlertPerformancePresets();
  });

  afterEach(() => {
    // 清理环境变量
    delete process.env.ALERT_PRESET_HIGH_CONCURRENCY;
    delete process.env.ALERT_PRESET_HIGH_BATCH_SIZE;
    delete process.env.ALERT_PRESET_BALANCED_CONCURRENCY;
    delete process.env.ALERT_PRESET_BALANCED_BATCH_SIZE;
    delete process.env.ALERT_PRESET_CONSERVATIVE_CONCURRENCY;
    delete process.env.ALERT_PRESET_CONSERVATIVE_BATCH_SIZE;
  });

  describe('默认值配置', () => {
    it('应该设置正确的默认值', () => {
      expect(config.highPerformanceConcurrency).toBe(20);
      expect(config.highPerformanceBatchSize).toBe(1000);
      expect(config.balancedConcurrency).toBe(5);
      expect(config.balancedBatchSize).toBe(100);
      expect(config.conservativeConcurrency).toBe(3);
      expect(config.conservativeBatchSize).toBe(50);
    });
  });

  describe('环境变量配置', () => {
    it('应该从环境变量读取highPerformanceConcurrency', () => {
      process.env.ALERT_PRESET_HIGH_CONCURRENCY = '30';
      const newConfig = new AlertPerformancePresets();
      expect(newConfig.highPerformanceConcurrency).toBe(30);
    });

    it('应该从环境变量读取balancedBatchSize', () => {
      process.env.ALERT_PRESET_BALANCED_BATCH_SIZE = '150';
      const newConfig = new AlertPerformancePresets();
      expect(newConfig.balancedBatchSize).toBe(150);
    });
  });

  describe('数据验证', () => {
    it('应该通过有效值的验证', async () => {
      const validConfig = plainToClass(AlertPerformancePresets, {
        highPerformanceConcurrency: 25,
        highPerformanceBatchSize: 1500,
        balancedConcurrency: 10,
        balancedBatchSize: 200,
        conservativeConcurrency: 5,
        conservativeBatchSize: 75
      });

      const errors = await validate(validConfig);
      expect(errors).toHaveLength(0);
    });

    it('应该拒绝conservativeConcurrency小于最小值', async () => {
      const invalidConfig = plainToClass(AlertPerformancePresets, {
        conservativeConcurrency: 0
      });

      const errors = await validate(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('conservativeConcurrency');
    });

    it('应该拒绝highPerformanceBatchSize大于最大值', async () => {
      const invalidConfig = plainToClass(AlertPerformancePresets, {
        highPerformanceBatchSize: 3000
      });

      const errors = await validate(invalidConfig);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].property).toBe('highPerformanceBatchSize');
    });
  });
});

describe('AlertPresetsConfig', () => {
  let config: AlertPresetsConfig;

  beforeEach(() => {
    config = new AlertPresetsConfig();
  });

  describe('组合配置', () => {
    it('应该包含所有预设配置子类', () => {
      expect(config.rulePresets).toBeInstanceOf(AlertRulePresets);
      expect(config.notificationPresets).toBeInstanceOf(AlertNotificationPresets);
      expect(config.performancePresets).toBeInstanceOf(AlertPerformancePresets);
    });

    it('应该通过嵌套验证', async () => {
      const errors = await validate(config);
      expect(errors).toHaveLength(0);
    });
  });
});

describe('alertPresetsConfig factory', () => {
  let module: TestingModule;
  let configService: ConfigService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [alertPresetsConfig],
        }),
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await module.close();
  });

  it('应该成功注册alertPresets配置', () => {
    const config = configService.get('alertPresets');
    expect(config).toBeInstanceOf(AlertPresetsConfig);
  });

  it('应该包含完整的配置结构', () => {
    const config = configService.get<AlertPresetsConfig>('alertPresets');

    expect(config.rulePresets).toBeDefined();
    expect(config.notificationPresets).toBeDefined();
    expect(config.performancePresets).toBeDefined();

    // 验证具体配置值
    expect(config.rulePresets.quickDuration).toBe(30);
    expect(config.notificationPresets.instantTimeout).toBe(5000);
    expect(config.performancePresets.highPerformanceConcurrency).toBe(20);
  });
});
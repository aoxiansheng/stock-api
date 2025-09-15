/**
 * NotificationEnhancedConfig单元测试
 * 🎯 测试配置类的验证和环境变量集成
 */

import { validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { NotificationEnhancedConfig } from '../notification-enhanced.config';

describe('NotificationEnhancedConfig', () => {
  
  describe('默认配置值', () => {
    it('应该使用正确的默认配置值', () => {
      const config = new NotificationEnhancedConfig();
      
      // 批处理配置
      expect(config.defaultBatchSize).toBe(10);
      expect(config.maxBatchSize).toBe(100);
      expect(config.maxConcurrency).toBe(5);
      expect(config.batchTimeout).toBe(60000);
      
      // 超时配置
      expect(config.emailTimeout).toBe(30000);
      expect(config.smsTimeout).toBe(5000);
      expect(config.webhookTimeout).toBe(10000);
      expect(config.slackTimeout).toBe(15000);
      expect(config.dingtalkTimeout).toBe(10000);
      expect(config.defaultTimeout).toBe(15000);
      
      // 重试配置
      expect(config.maxRetryAttempts).toBe(3);
      expect(config.initialRetryDelay).toBe(1000);
      expect(config.retryBackoffMultiplier).toBe(2);
      expect(config.maxRetryDelay).toBe(30000);
      expect(config.jitterFactor).toBe(0.1);
      
      // 优先级权重
      expect(config.criticalPriorityWeight).toBe(100);
      expect(config.urgentPriorityWeight).toBe(80);
      expect(config.highPriorityWeight).toBe(60);
      expect(config.normalPriorityWeight).toBe(40);
      expect(config.lowPriorityWeight).toBe(20);
      
      // 验证配置
      expect(config.variableNameMinLength).toBe(1);
      expect(config.variableNameMaxLength).toBe(50);
      expect(config.minTemplateLength).toBe(1);
      expect(config.maxTemplateLength).toBe(10000);
      expect(config.titleMaxLength).toBe(200);
      expect(config.contentMaxLength).toBe(2000);
      
      // 功能开关
      expect(config.enableBatchProcessing).toBe(true);
      expect(config.enableRetryMechanism).toBe(true);
      expect(config.enablePriorityQueue).toBe(true);
      expect(config.enableMetricsCollection).toBe(true);
    });
  });

  describe('环境变量覆盖', () => {
    beforeEach(() => {
      // 清理环境变量
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('NOTIFICATION_')) {
          delete process.env[key];
        }
      });
    });

    it('应该正确读取批处理相关环境变量', () => {
      process.env.NOTIFICATION_DEFAULT_BATCH_SIZE = '20';
      process.env.NOTIFICATION_MAX_BATCH_SIZE = '200';
      process.env.NOTIFICATION_MAX_CONCURRENCY = '10';
      process.env.NOTIFICATION_BATCH_TIMEOUT = '120000';

      const config = new NotificationEnhancedConfig();
      
      expect(config.defaultBatchSize).toBe(20);
      expect(config.maxBatchSize).toBe(200);
      expect(config.maxConcurrency).toBe(10);
      expect(config.batchTimeout).toBe(120000);
    });

    it('应该正确读取超时相关环境变量', () => {
      process.env.NOTIFICATION_EMAIL_TIMEOUT = '60000';
      process.env.NOTIFICATION_SMS_TIMEOUT = '8000';
      process.env.NOTIFICATION_DEFAULT_TIMEOUT = '25000';

      const config = new NotificationEnhancedConfig();
      
      expect(config.emailTimeout).toBe(60000);
      expect(config.smsTimeout).toBe(8000);
      expect(config.defaultTimeout).toBe(25000);
    });

    it('应该正确读取功能开关环境变量', () => {
      process.env.NOTIFICATION_ENABLE_BATCH_PROCESSING = 'false';
      process.env.NOTIFICATION_ENABLE_RETRY_MECHANISM = 'false';

      const config = new NotificationEnhancedConfig();
      
      expect(config.enableBatchProcessing).toBe(false);
      expect(config.enableRetryMechanism).toBe(false);
      expect(config.enablePriorityQueue).toBe(true); // 默认值
    });
  });

  describe('配置验证', () => {
    it('应该通过有效配置的验证', () => {
      const validConfig = {
        defaultBatchSize: 15,
        maxBatchSize: 150,
        maxConcurrency: 8,
        emailTimeout: 45000,
        maxRetryAttempts: 5,
        variableNameMinLength: 2,
        variableNameMaxLength: 75,
        minTemplateLength: 5,
      };

      const config = plainToClass(NotificationEnhancedConfig, validConfig);
      const errors = validateSync(config);

      expect(errors).toHaveLength(0);
    });

    it('应该拒绝无效的批处理大小配置', () => {
      const invalidConfig = {
        defaultBatchSize: 0, // 无效：小于最小值1
        maxBatchSize: 600, // 无效：大于最大值500
      };

      const config = plainToClass(NotificationEnhancedConfig, invalidConfig);
      const errors = validateSync(config);

      expect(errors.length).toBeGreaterThan(0);
      
      const defaultBatchSizeError = errors.find(e => e.property === 'defaultBatchSize');
      const maxBatchSizeError = errors.find(e => e.property === 'maxBatchSize');
      
      expect(defaultBatchSizeError).toBeDefined();
      expect(maxBatchSizeError).toBeDefined();
    });

    it('应该拒绝无效的超时配置', () => {
      const invalidConfig = {
        emailTimeout: 500, // 无效：小于最小值1000
        webhookTimeout: 200000, // 无效：大于最大值60000
      };

      const config = plainToClass(NotificationEnhancedConfig, invalidConfig);
      const errors = validateSync(config);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('应该拒绝无效的重试配置', () => {
      const invalidConfig = {
        maxRetryAttempts: 15, // 无效：大于最大值10
        retryBackoffMultiplier: 10, // 无效：大于最大值5
      };

      const config = plainToClass(NotificationEnhancedConfig, invalidConfig);
      const errors = validateSync(config);

      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('辅助方法', () => {
    let config;

    beforeEach(() => {
      config = new NotificationEnhancedConfig();
    });

    describe('getChannelTimeout', () => {
      it('应该返回对应渠道的超时配置', () => {
        expect(config.getChannelTimeout('email')).toBe(30000);
        expect(config.getChannelTimeout('sms')).toBe(5000);
        expect(config.getChannelTimeout('webhook')).toBe(10000);
        expect(config.getChannelTimeout('slack')).toBe(15000);
        expect(config.getChannelTimeout('dingtalk')).toBe(10000);
      });

      it('应该对未知渠道返回默认超时', () => {
        expect(config.getChannelTimeout('unknown')).toBe(15000);
        expect(config.getChannelTimeout('')).toBe(15000);
      });

      it('应该支持大小写不敏感', () => {
        expect(config.getChannelTimeout('EMAIL')).toBe(30000);
        expect(config.getChannelTimeout('Email')).toBe(30000);
      });
    });

    describe('getPriorityWeight', () => {
      it('应该返回对应优先级的权重', () => {
        expect(config.getPriorityWeight('critical')).toBe(100);
        expect(config.getPriorityWeight('urgent')).toBe(80);
        expect(config.getPriorityWeight('high')).toBe(60);
        expect(config.getPriorityWeight('normal')).toBe(40);
        expect(config.getPriorityWeight('low')).toBe(20);
      });

      it('应该对未知优先级返回普通权重', () => {
        expect(config.getPriorityWeight('unknown')).toBe(40);
        expect(config.getPriorityWeight('')).toBe(40);
      });

      it('应该支持大小写不敏感', () => {
        expect(config.getPriorityWeight('CRITICAL')).toBe(100);
        expect(config.getPriorityWeight('Critical')).toBe(100);
      });
    });
  });

  describe('集成环境变量的完整配置测试', () => {
    beforeEach(() => {
      // 设置完整的开发环境变量
      process.env.NOTIFICATION_DEFAULT_BATCH_SIZE = '10';
      process.env.NOTIFICATION_MAX_BATCH_SIZE = '100';
      process.env.NOTIFICATION_MAX_CONCURRENCY = '5';
      process.env.NOTIFICATION_EMAIL_TIMEOUT = '60000';
      process.env.NOTIFICATION_DEFAULT_TIMEOUT = '30000';
      process.env.NOTIFICATION_MAX_RETRY_ATTEMPTS = '5';
      process.env.NOTIFICATION_ENABLE_BATCH_PROCESSING = 'true';
    });

    afterEach(() => {
      // 清理环境变量
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('NOTIFICATION_')) {
          delete process.env[key];
        }
      });
    });

    it('应该正确加载开发环境的完整配置', () => {
      const config = new NotificationEnhancedConfig();
      
      // 验证开发环境优化的配置值
      expect(config.defaultBatchSize).toBe(10);
      expect(config.maxBatchSize).toBe(100);
      expect(config.maxConcurrency).toBe(5);
      expect(config.emailTimeout).toBe(60000);
      expect(config.defaultTimeout).toBe(30000);
      expect(config.maxRetryAttempts).toBe(5);
      expect(config.enableBatchProcessing).toBe(true);
      
      // 验证辅助方法正常工作
      expect(config.getChannelTimeout('email')).toBe(60000);
      expect(config.getPriorityWeight('critical')).toBe(100);
    });
  });
});
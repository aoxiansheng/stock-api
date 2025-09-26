/**
 * MonitoringUnifiedTtlConfig Unit Tests
 * 测试监控统一TTL配置的验证、环境适配和计算逻辑
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { MonitoringUnifiedTtlConfig } from '@monitoring/config/unified/monitoring-unified-ttl.config';

describe('MonitoringUnifiedTtlConfig', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new MonitoringUnifiedTtlConfig();

      expect(config.health).toBe(300);
      expect(config.trend).toBe(600);
      expect(config.performance).toBe(180);
      expect(config.alert).toBe(60);
      expect(config.cacheStats).toBe(120);
    });

    it('should validate default configuration', async () => {
      const config = new MonitoringUnifiedTtlConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Validation Rules', () => {
    describe('Health TTL Validation', () => {
      it('should accept valid health TTL values', async () => {
        const config = plainToInstance(MonitoringUnifiedTtlConfig, { health: 300 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.health).toBe(300);
      });

      it('should reject health TTL below minimum', async () => {
        const config = plainToInstance(MonitoringUnifiedTtlConfig, { health: 0 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('健康检查TTL最小值为1秒');
      });

      it('should reject health TTL above maximum', async () => {
        const config = plainToInstance(MonitoringUnifiedTtlConfig, { health: 3601 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('健康检查TTL最大值为1小时');
      });

      it('should transform string values to numbers', () => {
        const config = plainToInstance(MonitoringUnifiedTtlConfig, { health: '450' });
        expect(config.health).toBe(450);
      });

      it('should use default for invalid string values', () => {
        const config = plainToInstance(MonitoringUnifiedTtlConfig, { health: 'invalid' });
        expect(config.health).toBe(300);
      });
    });

    describe('Trend TTL Validation', () => {
      it('should accept valid trend TTL values', async () => {
        const config = plainToInstance(MonitoringUnifiedTtlConfig, { trend: 900 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.trend).toBe(900);
      });

      it('should reject trend TTL below minimum', async () => {
        const config = plainToInstance(MonitoringUnifiedTtlConfig, { trend: 0 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('趋势分析TTL最小值为1秒');
      });

      it('should reject trend TTL above maximum', async () => {
        const config = plainToInstance(MonitoringUnifiedTtlConfig, { trend: 3601 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('趋势分析TTL最大值为1小时');
      });
    });

    describe('Performance TTL Validation', () => {
      it('should accept valid performance TTL values', async () => {
        const config = plainToInstance(MonitoringUnifiedTtlConfig, { performance: 240 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.performance).toBe(240);
      });

      it('should reject performance TTL above maximum (30 minutes)', async () => {
        const config = plainToInstance(MonitoringUnifiedTtlConfig, { performance: 1801 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('性能指标TTL最大值为30分钟');
      });
    });

    describe('Alert TTL Validation', () => {
      it('should accept valid alert TTL values', async () => {
        const config = plainToInstance(MonitoringUnifiedTtlConfig, { alert: 90 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.alert).toBe(90);
      });

      it('should reject alert TTL above maximum (10 minutes)', async () => {
        const config = plainToInstance(MonitoringUnifiedTtlConfig, { alert: 601 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('告警数据TTL最大值为10分钟');
      });
    });

    describe('Cache Stats TTL Validation', () => {
      it('should accept valid cache stats TTL values', async () => {
        const config = plainToInstance(MonitoringUnifiedTtlConfig, { cacheStats: 200 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.cacheStats).toBe(200);
      });

      it('should reject cache stats TTL above maximum (10 minutes)', async () => {
        const config = plainToInstance(MonitoringUnifiedTtlConfig, { cacheStats: 601 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('缓存统计TTL最大值为10分钟');
      });
    });
  });

  describe('Environment-Based Default TTL Methods', () => {
    describe('getDefaultHealthTtl', () => {
      it('should return production TTL for production environment', () => {
        process.env.NODE_ENV = 'production';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultHealthTtl()).toBe(600);
      });

      it('should return test TTL for test environment', () => {
        process.env.NODE_ENV = 'test';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultHealthTtl()).toBe(10);
      });

      it('should return development TTL for development environment', () => {
        process.env.NODE_ENV = 'development';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultHealthTtl()).toBe(300);
      });

      it('should return development TTL for undefined NODE_ENV', () => {
        delete process.env.NODE_ENV;
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultHealthTtl()).toBe(300);
      });
    });

    describe('getDefaultTrendTtl', () => {
      it('should return production TTL for production environment', () => {
        process.env.NODE_ENV = 'production';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultTrendTtl()).toBe(1200);
      });

      it('should return test TTL for test environment', () => {
        process.env.NODE_ENV = 'test';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultTrendTtl()).toBe(20);
      });

      it('should return development TTL for default case', () => {
        process.env.NODE_ENV = 'development';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultTrendTtl()).toBe(600);
      });
    });

    describe('getDefaultPerformanceTtl', () => {
      it('should return production TTL for production environment', () => {
        process.env.NODE_ENV = 'production';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultPerformanceTtl()).toBe(300);
      });

      it('should return test TTL for test environment', () => {
        process.env.NODE_ENV = 'test';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultPerformanceTtl()).toBe(10);
      });

      it('should return development TTL for default case', () => {
        process.env.NODE_ENV = 'development';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultPerformanceTtl()).toBe(180);
      });
    });

    describe('getDefaultAlertTtl', () => {
      it('should return production TTL for production environment', () => {
        process.env.NODE_ENV = 'production';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultAlertTtl()).toBe(120);
      });

      it('should return test TTL for test environment', () => {
        process.env.NODE_ENV = 'test';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultAlertTtl()).toBe(5);
      });

      it('should return development TTL for default case', () => {
        process.env.NODE_ENV = 'development';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultAlertTtl()).toBe(60);
      });
    });

    describe('getDefaultCacheStatsTtl', () => {
      it('should return production TTL for production environment', () => {
        process.env.NODE_ENV = 'production';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultCacheStatsTtl()).toBe(240);
      });

      it('should return test TTL for test environment', () => {
        process.env.NODE_ENV = 'test';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultCacheStatsTtl()).toBe(10);
      });

      it('should return development TTL for default case', () => {
        process.env.NODE_ENV = 'development';
        const config = new MonitoringUnifiedTtlConfig();

        expect(config.getDefaultCacheStatsTtl()).toBe(120);
      });
    });
  });

  describe('Environment Adjustment', () => {
    describe('adjustForEnvironment - Production', () => {
      it('should adjust TTL values for production environment', () => {
        process.env.NODE_ENV = 'production';
        const config = new MonitoringUnifiedTtlConfig();

        // Set lower values than production minimums
        config.health = 100;
        config.trend = 300;
        config.performance = 60;
        config.alert = 30;
        config.cacheStats = 100;

        config.adjustForEnvironment();

        expect(config.health).toBe(300); // Increased to minimum
        expect(config.trend).toBe(600); // Increased to minimum
        expect(config.performance).toBe(180); // Increased to minimum
        expect(config.alert).toBe(60); // Increased to minimum
        expect(config.cacheStats).toBe(240); // Increased to minimum
      });

      it('should not decrease already high values in production', () => {
        process.env.NODE_ENV = 'production';
        const config = new MonitoringUnifiedTtlConfig();

        config.health = 800;
        config.trend = 1000;
        config.performance = 500;
        config.alert = 200;
        config.cacheStats = 400;

        config.adjustForEnvironment();

        expect(config.health).toBe(800); // Unchanged (already above minimum)
        expect(config.trend).toBe(1000); // Unchanged
        expect(config.performance).toBe(500); // Unchanged
        expect(config.alert).toBe(200); // Unchanged
        expect(config.cacheStats).toBe(400); // Unchanged
      });
    });

    describe('adjustForEnvironment - Test', () => {
      it('should adjust TTL values for test environment', () => {
        process.env.NODE_ENV = 'test';
        const config = new MonitoringUnifiedTtlConfig();

        // Set higher values than test maximums
        config.health = 300;
        config.trend = 600;
        config.performance = 180;
        config.alert = 60;
        config.cacheStats = 120;

        config.adjustForEnvironment();

        expect(config.health).toBe(60); // Decreased to maximum
        expect(config.trend).toBe(120); // Decreased to maximum
        expect(config.performance).toBe(30); // Decreased to maximum
        expect(config.alert).toBe(10); // Decreased to maximum
        expect(config.cacheStats).toBe(30); // Decreased to maximum
      });

      it('should not increase already low values in test', () => {
        process.env.NODE_ENV = 'test';
        const config = new MonitoringUnifiedTtlConfig();

        config.health = 20;
        config.trend = 50;
        config.performance = 15;
        config.alert = 5;
        config.cacheStats = 15;

        config.adjustForEnvironment();

        expect(config.health).toBe(20); // Unchanged (already below maximum)
        expect(config.trend).toBe(50); // Unchanged
        expect(config.performance).toBe(15); // Unchanged
        expect(config.alert).toBe(5); // Unchanged
        expect(config.cacheStats).toBe(15); // Unchanged
      });
    });

    describe('adjustForEnvironment - Development', () => {
      it('should not modify values for development environment', () => {
        process.env.NODE_ENV = 'development';
        const config = new MonitoringUnifiedTtlConfig();

        const originalValues = {
          health: config.health,
          trend: config.trend,
          performance: config.performance,
          alert: config.alert,
          cacheStats: config.cacheStats,
        };

        config.adjustForEnvironment();

        expect(config.health).toBe(originalValues.health);
        expect(config.trend).toBe(originalValues.trend);
        expect(config.performance).toBe(originalValues.performance);
        expect(config.alert).toBe(originalValues.alert);
        expect(config.cacheStats).toBe(originalValues.cacheStats);
      });
    });
  });

  describe('Transform Functionality', () => {
    it('should handle numeric string transformations correctly', () => {
      const plainConfig = {
        health: '250',
        trend: '750',
        performance: '200',
        alert: '90',
        cacheStats: '150',
      };

      const config = plainToInstance(MonitoringUnifiedTtlConfig, plainConfig);

      expect(config.health).toBe(250);
      expect(config.trend).toBe(750);
      expect(config.performance).toBe(200);
      expect(config.alert).toBe(90);
      expect(config.cacheStats).toBe(150);
    });

    it('should use defaults for non-numeric string values', () => {
      const plainConfig = {
        health: 'invalid',
        trend: 'not-a-number',
        performance: 'bad-value',
        alert: 'wrong',
        cacheStats: 'invalid-input',
      };

      const config = plainToInstance(MonitoringUnifiedTtlConfig, plainConfig);

      expect(config.health).toBe(300); // Default
      expect(config.trend).toBe(600); // Default
      expect(config.performance).toBe(180); // Default
      expect(config.alert).toBe(60); // Default
      expect(config.cacheStats).toBe(120); // Default
    });
  });

  describe('Business Logic Consistency', () => {
    it('should maintain proper TTL hierarchy for different data types', () => {
      const config = new MonitoringUnifiedTtlConfig();

      // Alert data should have shortest TTL (most time-sensitive)
      expect(config.alert).toBeLessThan(config.cacheStats);
      expect(config.alert).toBeLessThan(config.performance);
      expect(config.alert).toBeLessThan(config.health);
      expect(config.alert).toBeLessThan(config.trend);

      // Trend data should have longest TTL (least time-sensitive)
      expect(config.trend).toBeGreaterThan(config.alert);
      expect(config.trend).toBeGreaterThan(config.cacheStats);
      expect(config.trend).toBeGreaterThan(config.performance);
      expect(config.trend).toBeGreaterThan(config.health);
    });

    it('should provide reasonable defaults for different deployment environments', () => {
      const productionConfig = new MonitoringUnifiedTtlConfig();
      process.env.NODE_ENV = 'production';

      const testConfig = new MonitoringUnifiedTtlConfig();
      process.env.NODE_ENV = 'test';

      const developmentConfig = new MonitoringUnifiedTtlConfig();
      process.env.NODE_ENV = 'development';

      // Production should have longer TTL than test for better performance
      expect(productionConfig.getDefaultHealthTtl()).toBeGreaterThan(testConfig.getDefaultHealthTtl());
      expect(productionConfig.getDefaultTrendTtl()).toBeGreaterThan(testConfig.getDefaultTrendTtl());

      // Development should be between test and production
      expect(developmentConfig.getDefaultHealthTtl()).toBeGreaterThan(testConfig.getDefaultHealthTtl());
      expect(developmentConfig.getDefaultHealthTtl()).toBeLessThan(productionConfig.getDefaultHealthTtl());
    });
  });
});

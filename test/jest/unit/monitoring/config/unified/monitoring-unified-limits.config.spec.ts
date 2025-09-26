/**
 * Monitoring Unified Limits Configuration Unit Tests
 * 测试监控统一批量限制配置的验证、环境适配和计算逻辑
 */

import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  MonitoringUnifiedLimitsConfig,
  AlertBatchConfig,
  DataProcessingBatchConfig,
  DataCleanupBatchConfig,
  SystemLimitsConfig,
  monitoringUnifiedLimitsConfig,
  MonitoringLimitsUtils,
} from '@monitoring/config/unified/monitoring-unified-limits.config';

describe('AlertBatchConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new AlertBatchConfig();

      expect(config.small).toBe(5);
      expect(config.medium).toBe(10);
      expect(config.large).toBe(20);
      expect(config.max).toBe(50);
    });

    it('should validate default configuration', async () => {
      const config = new AlertBatchConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Validation Rules', () => {
    describe('Small Batch Validation', () => {
      it('should accept valid small batch values', async () => {
        const config = plainToInstance(AlertBatchConfig, { small: 10 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.small).toBe(10);
      });

      it('should reject small batch below minimum', async () => {
        const config = plainToInstance(AlertBatchConfig, { small: 0 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('告警小批量大小最小值为1');
      });

      it('should reject small batch above maximum', async () => {
        const config = plainToInstance(AlertBatchConfig, { small: 21 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('告警小批量大小最大值为20');
      });
    });

    describe('Medium Batch Validation', () => {
      it('should accept valid medium batch values', async () => {
        const config = plainToInstance(AlertBatchConfig, { medium: 25 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.medium).toBe(25);
      });

      it('should reject medium batch below minimum', async () => {
        const config = plainToInstance(AlertBatchConfig, { medium: 4 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('告警中批量大小最小值为5');
      });

      it('should reject medium batch above maximum', async () => {
        const config = plainToInstance(AlertBatchConfig, { medium: 51 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('告警中批量大小最大值为50');
      });
    });

    describe('Large Batch Validation', () => {
      it('should accept valid large batch values', async () => {
        const config = plainToInstance(AlertBatchConfig, { large: 50 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.large).toBe(50);
      });

      it('should reject large batch below minimum', async () => {
        const config = plainToInstance(AlertBatchConfig, { large: 9 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('告警大批量大小最小值为10');
      });

      it('should reject large batch above maximum', async () => {
        const config = plainToInstance(AlertBatchConfig, { large: 101 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('告警大批量大小最大值为100');
      });
    });

    describe('Max Batch Validation', () => {
      it('should accept valid max batch values', async () => {
        const config = plainToInstance(AlertBatchConfig, { max: 100 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.max).toBe(100);
      });

      it('should reject max batch below minimum', async () => {
        const config = plainToInstance(AlertBatchConfig, { max: 19 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('告警最大批量大小最小值为20');
      });

      it('should reject max batch above maximum', async () => {
        const config = plainToInstance(AlertBatchConfig, { max: 201 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('告警最大批量大小最大值为200');
      });
    });
  });

  describe('Transform Functionality', () => {
    it('should transform string values to numbers', () => {
      const config = plainToInstance(AlertBatchConfig, {
        small: '3',
        medium: '15',
        large: '30',
        max: '100'
      });

      expect(config.small).toBe(3);
      expect(config.medium).toBe(15);
      expect(config.large).toBe(30);
      expect(config.max).toBe(100);
    });

    it('should use defaults for invalid string values', () => {
      const config = plainToInstance(AlertBatchConfig, {
        small: 'invalid',
        medium: 'not-a-number',
        large: 'bad-value',
        max: 'wrong'
      });

      expect(config.small).toBe(5); // Default
      expect(config.medium).toBe(10); // Default
      expect(config.large).toBe(20); // Default
      expect(config.max).toBe(50); // Default
    });
  });
});

describe('DataProcessingBatchConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new DataProcessingBatchConfig();

      expect(config.standard).toBe(10);
      expect(config.highFrequency).toBe(50);
      expect(config.analysis).toBe(100);
      expect(config.recentMetrics).toBe(5);
    });

    it('should validate default configuration', async () => {
      const config = new DataProcessingBatchConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Validation Rules', () => {
    describe('Standard Batch Validation', () => {
      it('should accept valid standard batch values', async () => {
        const config = plainToInstance(DataProcessingBatchConfig, { standard: 50 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.standard).toBe(50);
      });

      it('should reject standard batch below minimum', async () => {
        const config = plainToInstance(DataProcessingBatchConfig, { standard: 0 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('数据收集批量大小最小值为1');
      });

      it('should reject standard batch above maximum', async () => {
        const config = plainToInstance(DataProcessingBatchConfig, { standard: 101 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('数据收集批量大小最大值为100');
      });
    });

    describe('High Frequency Batch Validation', () => {
      it('should accept valid high frequency batch values', async () => {
        const config = plainToInstance(DataProcessingBatchConfig, { highFrequency: 100 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.highFrequency).toBe(100);
      });

      it('should reject high frequency batch below minimum', async () => {
        const config = plainToInstance(DataProcessingBatchConfig, { highFrequency: 4 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('高频数据批量大小最小值为5');
      });

      it('should reject high frequency batch above maximum', async () => {
        const config = plainToInstance(DataProcessingBatchConfig, { highFrequency: 201 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('高频数据批量大小最大值为200');
      });
    });

    describe('Analysis Batch Validation', () => {
      it('should accept valid analysis batch values', async () => {
        const config = plainToInstance(DataProcessingBatchConfig, { analysis: 250 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.analysis).toBe(250);
      });

      it('should reject analysis batch below minimum', async () => {
        const config = plainToInstance(DataProcessingBatchConfig, { analysis: 9 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('数据分析批量大小最小值为10');
      });

      it('should reject analysis batch above maximum', async () => {
        const config = plainToInstance(DataProcessingBatchConfig, { analysis: 501 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('数据分析批量大小最大值为500');
      });
    });

    describe('Recent Metrics Validation', () => {
      it('should accept valid recent metrics values', async () => {
        const config = plainToInstance(DataProcessingBatchConfig, { recentMetrics: 10 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.recentMetrics).toBe(10);
      });

      it('should reject recent metrics below minimum', async () => {
        const config = plainToInstance(DataProcessingBatchConfig, { recentMetrics: 0 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('最近指标采样数量最小值为1');
      });

      it('should reject recent metrics above maximum', async () => {
        const config = plainToInstance(DataProcessingBatchConfig, { recentMetrics: 21 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('最近指标采样数量最大值为20');
      });
    });
  });
});

describe('DataCleanupBatchConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new DataCleanupBatchConfig();

      expect(config.standard).toBe(1000);
      expect(config.large).toBe(10000);
      expect(config.small).toBe(100);
    });

    it('should validate default configuration', async () => {
      const config = new DataCleanupBatchConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Validation Rules', () => {
    describe('Standard Cleanup Validation', () => {
      it('should accept valid standard cleanup values', async () => {
        const config = plainToInstance(DataCleanupBatchConfig, { standard: 2500 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.standard).toBe(2500);
      });

      it('should reject standard cleanup below minimum', async () => {
        const config = plainToInstance(DataCleanupBatchConfig, { standard: 99 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('标准清理批量大小最小值为100');
      });

      it('should reject standard cleanup above maximum', async () => {
        const config = plainToInstance(DataCleanupBatchConfig, { standard: 5001 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('标准清理批量大小最大值为5000');
      });
    });

    describe('Large Cleanup Validation', () => {
      it('should accept valid large cleanup values', async () => {
        const config = plainToInstance(DataCleanupBatchConfig, { large: 15000 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.large).toBe(15000);
      });

      it('should reject large cleanup below minimum', async () => {
        const config = plainToInstance(DataCleanupBatchConfig, { large: 999 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('大量清理批量大小最小值为1000');
      });

      it('should reject large cleanup above maximum', async () => {
        const config = plainToInstance(DataCleanupBatchConfig, { large: 20001 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('大量清理批量大小最大值为20000');
      });
    });

    describe('Small Cleanup Validation', () => {
      it('should accept valid small cleanup values', async () => {
        const config = plainToInstance(DataCleanupBatchConfig, { small: 250 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.small).toBe(250);
      });

      it('should reject small cleanup below minimum', async () => {
        const config = plainToInstance(DataCleanupBatchConfig, { small: 9 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('小量清理批量大小最小值为10');
      });

      it('should reject small cleanup above maximum', async () => {
        const config = plainToInstance(DataCleanupBatchConfig, { small: 501 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('小量清理批量大小最大值为500');
      });
    });
  });
});

describe('SystemLimitsConfig', () => {
  describe('Default Configuration', () => {
    it('should initialize with default values', () => {
      const config = new SystemLimitsConfig();

      expect(config.maxQueueSize).toBe(10000);
      expect(config.maxBufferSize).toBe(1000);
      expect(config.maxRetryAttempts).toBe(3);
      expect(config.maxConcurrentProcessing).toBe(10);
    });

    it('should validate default configuration', async () => {
      const config = new SystemLimitsConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Validation Rules', () => {
    describe('Max Queue Size Validation', () => {
      it('should accept valid max queue size values', async () => {
        const config = plainToInstance(SystemLimitsConfig, { maxQueueSize: 25000 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.maxQueueSize).toBe(25000);
      });

      it('should reject max queue size below minimum', async () => {
        const config = plainToInstance(SystemLimitsConfig, { maxQueueSize: 999 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('最大队列大小最小值为1000');
      });

      it('should reject max queue size above maximum', async () => {
        const config = plainToInstance(SystemLimitsConfig, { maxQueueSize: 50001 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('最大队列大小最大值为50000');
      });
    });

    describe('Max Buffer Size Validation', () => {
      it('should accept valid max buffer size values', async () => {
        const config = plainToInstance(SystemLimitsConfig, { maxBufferSize: 2500 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.maxBufferSize).toBe(2500);
      });

      it('should reject max buffer size below minimum', async () => {
        const config = plainToInstance(SystemLimitsConfig, { maxBufferSize: 99 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('最大缓冲区大小最小值为100');
      });

      it('should reject max buffer size above maximum', async () => {
        const config = plainToInstance(SystemLimitsConfig, { maxBufferSize: 5001 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('最大缓冲区大小最大值为5000');
      });
    });

    describe('Max Retry Attempts Validation', () => {
      it('should accept valid max retry attempts values', async () => {
        const config = plainToInstance(SystemLimitsConfig, { maxRetryAttempts: 5 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.maxRetryAttempts).toBe(5);
      });

      it('should reject max retry attempts below minimum', async () => {
        const config = plainToInstance(SystemLimitsConfig, { maxRetryAttempts: 0 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('最大重试次数最小值为1');
      });

      it('should reject max retry attempts above maximum', async () => {
        const config = plainToInstance(SystemLimitsConfig, { maxRetryAttempts: 11 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('最大重试次数最大值为10');
      });
    });

    describe('Max Concurrent Processing Validation', () => {
      it('should accept valid max concurrent processing values', async () => {
        const config = plainToInstance(SystemLimitsConfig, { maxConcurrentProcessing: 50 });
        const errors = await validate(config);

        expect(errors).toHaveLength(0);
        expect(config.maxConcurrentProcessing).toBe(50);
      });

      it('should reject max concurrent processing below minimum', async () => {
        const config = plainToInstance(SystemLimitsConfig, { maxConcurrentProcessing: 0 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.min).toContain('最大并发处理数最小值为1');
      });

      it('should reject max concurrent processing above maximum', async () => {
        const config = plainToInstance(SystemLimitsConfig, { maxConcurrentProcessing: 101 });
        const errors = await validate(config);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints?.max).toContain('最大并发处理数最大值为100');
      });
    });
  });
});

describe('MonitoringUnifiedLimitsConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Default Configuration', () => {
    it('should initialize with default nested configurations', () => {
      const config = new MonitoringUnifiedLimitsConfig();

      expect(config.alertBatch).toBeInstanceOf(AlertBatchConfig);
      expect(config.dataProcessingBatch).toBeInstanceOf(DataProcessingBatchConfig);
      expect(config.dataCleanupBatch).toBeInstanceOf(DataCleanupBatchConfig);
      expect(config.systemLimits).toBeInstanceOf(SystemLimitsConfig);

      expect(config.alertBatch.small).toBe(5);
      expect(config.dataProcessingBatch.standard).toBe(10);
      expect(config.dataCleanupBatch.standard).toBe(1000);
      expect(config.systemLimits.maxQueueSize).toBe(10000);
    });

    it('should validate default configuration', async () => {
      const config = new MonitoringUnifiedLimitsConfig();
      const errors = await validate(config);

      expect(errors).toHaveLength(0);
    });
  });

  describe('Environment Adjustment', () => {
    describe('Production Environment', () => {
      it('should adjust configuration for production environment', () => {
        process.env.NODE_ENV = 'production';
        const config = new MonitoringUnifiedLimitsConfig();

        config.adjustForEnvironment();

        expect(config.alertBatch.medium).toBe(15);
        expect(config.alertBatch.large).toBe(30);
        expect(config.alertBatch.max).toBe(100);
        expect(config.dataProcessingBatch.standard).toBe(20);
        expect(config.dataProcessingBatch.highFrequency).toBe(100);
        expect(config.dataProcessingBatch.analysis).toBe(200);
        expect(config.systemLimits.maxQueueSize).toBe(20000);
        expect(config.systemLimits.maxBufferSize).toBe(2000);
        expect(config.systemLimits.maxConcurrentProcessing).toBe(20);
      });
    });

    describe('Test Environment', () => {
      it('should adjust configuration for test environment', () => {
        process.env.NODE_ENV = 'test';
        const config = new MonitoringUnifiedLimitsConfig();

        config.adjustForEnvironment();

        expect(config.alertBatch.small).toBe(2);
        expect(config.alertBatch.medium).toBe(5);
        expect(config.alertBatch.large).toBe(10);
        expect(config.alertBatch.max).toBe(20);
        expect(config.dataProcessingBatch.standard).toBe(3);
        expect(config.dataProcessingBatch.highFrequency).toBe(10);
        expect(config.dataProcessingBatch.analysis).toBe(20);
        expect(config.dataCleanupBatch.standard).toBe(100);
        expect(config.dataCleanupBatch.large).toBe(500);
        expect(config.dataCleanupBatch.small).toBe(10);
        expect(config.systemLimits.maxQueueSize).toBe(1000);
        expect(config.systemLimits.maxBufferSize).toBe(100);
        expect(config.systemLimits.maxConcurrentProcessing).toBe(3);
      });
    });

    describe('Development Environment', () => {
      it('should not modify configuration for development environment', () => {
        process.env.NODE_ENV = 'development';
        const config = new MonitoringUnifiedLimitsConfig();
        const originalValues = {
          alertBatch: { ...config.alertBatch },
          dataProcessingBatch: { ...config.dataProcessingBatch },
          dataCleanupBatch: { ...config.dataCleanupBatch },
          systemLimits: { ...config.systemLimits }
        };

        config.adjustForEnvironment();

        expect(config.alertBatch).toEqual(originalValues.alertBatch);
        expect(config.dataProcessingBatch).toEqual(originalValues.dataProcessingBatch);
        expect(config.dataCleanupBatch).toEqual(originalValues.dataCleanupBatch);
        expect(config.systemLimits).toEqual(originalValues.systemLimits);
      });
    });
  });
});

describe('monitoringUnifiedLimitsConfig Factory', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('should create configuration with default values', () => {
    const config = monitoringUnifiedLimitsConfig();

    expect(config.alertBatch.small).toBe(5);
    expect(config.alertBatch.medium).toBe(10);
    expect(config.alertBatch.large).toBe(20);
    expect(config.alertBatch.max).toBe(50);
    expect(config.dataProcessingBatch.standard).toBe(10);
    expect(config.dataProcessingBatch.highFrequency).toBe(50);
    expect(config.dataProcessingBatch.analysis).toBe(100);
  });

  it('should create configuration with environment variables', () => {
    process.env.MONITORING_DEFAULT_BATCH_SIZE = '20';

    const config = monitoringUnifiedLimitsConfig();

    // Based on multipliers in the factory function
    expect(config.alertBatch.small).toBe(10); // 0.5x
    expect(config.alertBatch.medium).toBe(20); // 1.0x
    expect(config.alertBatch.large).toBe(40); // 2.0x
    expect(config.alertBatch.max).toBe(100); // 5.0x
    expect(config.dataProcessingBatch.standard).toBe(20); // 1.0x
    expect(config.dataProcessingBatch.highFrequency).toBe(100); // 5.0x
    expect(config.dataProcessingBatch.analysis).toBe(200); // 10.0x
    expect(config.dataCleanupBatch.standard).toBe(2000); // 100.0x
    expect(config.dataCleanupBatch.large).toBe(20000); // 1000.0x
    expect(config.dataCleanupBatch.small).toBe(200); // 10.0x
  });

  it('should adjust configuration for environment after creation', () => {
    process.env.NODE_ENV = 'production';

    const config = monitoringUnifiedLimitsConfig();

    // Should be adjusted for production
    expect(config.alertBatch.medium).toBe(15);
    expect(config.alertBatch.large).toBe(30);
    expect(config.alertBatch.max).toBe(100);
    expect(config.systemLimits.maxQueueSize).toBe(20000);
  });
});

describe('MonitoringLimitsUtils', () => {
  describe('selectBatchSize', () => {
    it('should select appropriate batch size based on data count', () => {
      const batchConfig = { small: 5, medium: 10, large: 20, max: 50 };

      expect(MonitoringLimitsUtils.selectBatchSize(8, batchConfig)).toBe(5); // small
      expect(MonitoringLimitsUtils.selectBatchSize(25, batchConfig)).toBe(10); // medium
      expect(MonitoringLimitsUtils.selectBatchSize(150, batchConfig)).toBe(20); // large
      expect(MonitoringLimitsUtils.selectBatchSize(1000, batchConfig)).toBe(50); // max
    });

    it('should use large size when max is not provided', () => {
      const batchConfig = { small: 5, medium: 10, large: 20 };

      expect(MonitoringLimitsUtils.selectBatchSize(1000, batchConfig)).toBe(20); // large
    });
  });

  describe('calculateBatchCount', () => {
    it('should calculate correct batch count', () => {
      expect(MonitoringLimitsUtils.calculateBatchCount(100, 10)).toBe(10);
      expect(MonitoringLimitsUtils.calculateBatchCount(101, 10)).toBe(11);
      expect(MonitoringLimitsUtils.calculateBatchCount(99, 10)).toBe(10);
      expect(MonitoringLimitsUtils.calculateBatchCount(0, 10)).toBe(0);
    });
  });

  describe('isValidBatchSize', () => {
    it('should validate batch size within range', () => {
      expect(MonitoringLimitsUtils.isValidBatchSize(50, 1, 100)).toBe(true);
      expect(MonitoringLimitsUtils.isValidBatchSize(0, 1, 100)).toBe(false);
      expect(MonitoringLimitsUtils.isValidBatchSize(101, 1, 100)).toBe(false);
      expect(MonitoringLimitsUtils.isValidBatchSize(1, 1, 100)).toBe(true);
      expect(MonitoringLimitsUtils.isValidBatchSize(100, 1, 100)).toBe(true);
    });

    it('should use default min and max values', () => {
      expect(MonitoringLimitsUtils.isValidBatchSize(500)).toBe(true); // Within 1-1000
      expect(MonitoringLimitsUtils.isValidBatchSize(1500)).toBe(false); // Above 1000
    });
  });

  describe('adjustBatchSizeForLoad', () => {
    it('should adjust batch size based on system load', () => {
      expect(MonitoringLimitsUtils.adjustBatchSizeForLoad(100, 0)).toBe(100); // No load
      expect(MonitoringLimitsUtils.adjustBatchSizeForLoad(100, 0.5)).toBe(75); // 50% load
      expect(MonitoringLimitsUtils.adjustBatchSizeForLoad(100, 1)).toBe(50); // 100% load
      expect(MonitoringLimitsUtils.adjustBatchSizeForLoad(100, 0.2)).toBe(90); // 20% load
    });

    it('should ensure minimum batch size of 1', () => {
      expect(MonitoringLimitsUtils.adjustBatchSizeForLoad(1, 1)).toBe(1); // Should not go below 1
    });
  });

  describe('getRecommendedBatchInterval', () => {
    it('should return appropriate interval based on batch size', () => {
      expect(MonitoringLimitsUtils.getRecommendedBatchInterval(5)).toBe(100);
      expect(MonitoringLimitsUtils.getRecommendedBatchInterval(25)).toBe(200);
      expect(MonitoringLimitsUtils.getRecommendedBatchInterval(75)).toBe(500);
      expect(MonitoringLimitsUtils.getRecommendedBatchInterval(150)).toBe(1000);
    });
  });
});

describe('Type Exports', () => {
  it('should export MonitoringUnifiedLimitsType correctly', () => {
    const config: import('@monitoring/config/unified/monitoring-unified-limits.config').MonitoringUnifiedLimitsType = 
      new MonitoringUnifiedLimitsConfig();

    expect(config.alertBatch).toBeDefined();
    expect(config.dataProcessingBatch).toBeDefined();
    expect(config.dataCleanupBatch).toBeDefined();
    expect(config.systemLimits).toBeDefined();
  });

  it('should export BatchSizeType correctly', () => {
    const batchSize: import('@monitoring/config/unified/monitoring-unified-limits.config').BatchSizeType = 'small';
    expect(['small', 'medium', 'large', 'max']).toContain(batchSize);
  });

  it('should export ProcessingType correctly', () => {
    const processingType: import('@monitoring/config/unified/monitoring-unified-limits.config').ProcessingType = 'alert';
    expect(['alert', 'data', 'cleanup', 'analysis']).toContain(processingType);
  });
});
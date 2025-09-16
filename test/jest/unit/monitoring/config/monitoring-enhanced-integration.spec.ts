/**
 * 监控增强配置系统集成测试
 * 验证新的统一配置系统的集成性和完整性
 * 
 * 测试目标：
 * - 配置系统的整体集成
 * - 环境变量支持
 * - 配置验证和错误处理
 * - 与旧系统的兼容性
 * - 性能和内存使用
 */

import {
  MonitoringEnhancedConfig,
  MonitoringConfigFactory,
  MonitoringConfigService,
  MONITORING_ENHANCED_CONFIG_ENV_MAPPING
} from '../../../../../src/monitoring/config/unified/monitoring-enhanced.config';

import {
  MONITORING_UNIFIED_LIMITS_CONSTANTS,
  MonitoringLimitsUtils
} from '../../../../../src/monitoring/config/unified/monitoring-unified-limits.config';

import {
  MonitoringTtlUtils
} from '../../../../../src/monitoring/config/unified/monitoring-unified-ttl.config';

import {
  MonitoringPerformanceThresholdsUtils
} from '../../../../../src/monitoring/config/unified/monitoring-performance-thresholds.config';

import { MONITORING_BUSINESS } from '../../../../../src/monitoring/constants/business';

describe('监控增强配置系统集成测试', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let testConfig: MonitoringEnhancedConfig;
  let configService: MonitoringConfigService;

  beforeEach(() => {
    // 保存原始环境变量
    originalEnv = { ...process.env };
    
    // 创建测试配置
    testConfig = MonitoringConfigFactory.createForTesting();
    configService = new MonitoringConfigService(testConfig);
  });

  afterEach(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  describe('配置系统整体集成', () => {
    it('应该创建完整的配置结构', () => {
      expect(testConfig.base).toBeDefined();
      expect(testConfig.environment).toBeDefined();
      expect(testConfig.ttl).toBeDefined();
      expect(testConfig.limits).toBeDefined();
      expect(testConfig.performanceThresholds).toBeDefined();
      expect(testConfig.events).toBeDefined();
    });

    it('应该通过配置验证', () => {
      const validation = testConfig.validateConfiguration();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('应该生成完整的配置摘要', () => {
      const summary = testConfig.getConfigurationSummary();
      
      expect(summary.environment).toBe('test');
      expect(summary.version).toBeDefined();
      expect(summary.enabledFeatures).toBeInstanceOf(Array);
      expect(summary.keyMetrics).toBeDefined();
      expect(summary.keyMetrics.ttlHealthSeconds).toBeGreaterThan(0);
      expect(summary.keyMetrics.maxAlertsPerMinute).toBeGreaterThan(0);
    });

    it('应该支持配置导出和导入', () => {
      const exported = testConfig.exportConfiguration();
      expect(exported.base).toBeDefined();
      expect(exported.environment).toBeDefined();
      expect(exported.ttl).toBeDefined();
      expect(exported.limits).toBeDefined();
      expect(exported.performanceThresholds).toBeDefined();
      expect(exported.events).toBeDefined();
      
      // 验证导出的配置可以重新创建
      const reimportedConfig = MonitoringConfigFactory.createFromObject(exported);
      expect(reimportedConfig).toBeInstanceOf(MonitoringEnhancedConfig);
    });
  });

  describe('环境变量支持', () => {
    it('应该支持通过环境变量配置基础设置', () => {
      process.env.MONITORING_CACHE_NAMESPACE = 'test_monitoring';
      process.env.MONITORING_COMPRESSION_THRESHOLD = '2048';
      process.env.MONITORING_DEBUG_ENABLED = 'true';
      
      const envConfig = MonitoringConfigFactory.createFromEnvironment();
      
      expect(envConfig.base.namespace).toContain('test');
      expect(envConfig.base.debugEnabled).toBe(true);
    });

    it('应该支持通过环境变量配置性能阈值', () => {
      process.env.MONITORING_API_RESPONSE_EXCELLENT_MS = '50';
      process.env.MONITORING_CPU_USAGE_HIGH = '0.6';
      
      const envConfig = MonitoringConfigFactory.createFromEnvironment();
      
      expect(envConfig.performanceThresholds.apiResponse.apiExcellentMs).toBe(50);
      expect(envConfig.performanceThresholds.systemResource.cpuUsageHigh).toBe(0.6);
    });

    it('应该支持核心环境变量MONITORING_DEFAULT_BATCH_SIZE', () => {
      process.env.MONITORING_DEFAULT_BATCH_SIZE = '20';
      
      const envConfig = MonitoringConfigFactory.createFromEnvironment();
      
      // 验证核心环境变量影响多个批量配置
      expect(envConfig.limits.alertBatch.medium).toBe(20); // 1.0x
      expect(envConfig.limits.alertBatch.large).toBe(40); // 2.0x
      expect(envConfig.limits.dataProcessingBatch.highFrequency).toBe(100); // 5.0x
    });

    it('应该显示弃用警告对于旧环境变量', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      process.env.MONITORING_ALERT_BATCH_SMALL = '3';
      
      MonitoringConfigFactory.createFromEnvironment();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEPRECATED] MONITORING_ALERT_BATCH_SMALL is deprecated')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('配置验证和错误处理', () => {
    it('应该捕获无效的配置值', () => {
      const invalidConfig = MonitoringConfigFactory.createDefault();
      invalidConfig.base.namespace = ''; // 无效的空命名空间
      
      const validation = invalidConfig.validateConfiguration();
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Redis命名空间不能为空');
    });

    it('应该生成配置警告', () => {
      const prodConfig = MonitoringConfigFactory.createDefault();
      prodConfig.environment.environment = 'production';
      prodConfig.base.debugEnabled = true; // 生产环境启用调试模式
      
      const validation = prodConfig.validateConfiguration();
      expect(validation.warnings).toContain('生产环境建议关闭调试模式');
    });

    it('应该验证阈值的逻辑一致性', () => {
      const validation = testConfig.validateConfiguration();
      expect(validation.isValid).toBe(true);
      
      // 验证性能阈值的递增性
      const apiResponse = testConfig.performanceThresholds.apiResponse;
      expect(apiResponse.apiExcellentMs).toBeLessThan(apiResponse.apiGoodMs);
      expect(apiResponse.apiGoodMs).toBeLessThan(apiResponse.apiWarningMs);
      expect(apiResponse.apiWarningMs).toBeLessThan(apiResponse.apiPoorMs);
    });
  });

  describe('与旧系统的兼容性', () => {
    it('应该保持与旧常量的向后兼容', () => {
      // 旧的采样配置仍然存在
      expect(MONITORING_BUSINESS.SAMPLING_CONFIG).toBeDefined();
      expect(MONITORING_BUSINESS.SAMPLING_CONFIG.RECENT_METRICS_COUNT).toBe(5);
      
      // 新的配置系统提供了替代方案
      expect(testConfig.performanceThresholds.errorRateAvailability).toBeDefined();
      expect(testConfig.performanceThresholds.systemResource).toBeDefined();
    });

    it('应该提供常量形式的配置访问', () => {
      expect(MONITORING_UNIFIED_LIMITS_CONSTANTS.ALERT_BATCH).toBeDefined();
      expect(MONITORING_UNIFIED_LIMITS_CONSTANTS.SYSTEM_LIMITS).toBeDefined();
      expect(MONITORING_UNIFIED_LIMITS_CONSTANTS.SYSTEM_LIMITS.MAX_BUFFER_SIZE).toBe(1000);
    });

    it('应该支持配置迁移路径', () => {
      // 环境变量映射表应该完整
      expect(MONITORING_ENHANCED_CONFIG_ENV_MAPPING).toBeDefined();
      expect(MONITORING_ENHANCED_CONFIG_ENV_MAPPING['base.namespace']).toBe('MONITORING_CACHE_NAMESPACE');
      expect(MONITORING_ENHANCED_CONFIG_ENV_MAPPING['ttl.health']).toBe('MONITORING_TTL_HEALTH');
    });
  });

  describe('配置服务功能', () => {
    it('应该提供便捷的配置访问方法', () => {
      expect(configService.getTtl('health')).toBeGreaterThan(0);
      expect(configService.getTtl('performance')).toBeGreaterThan(0);
      expect(configService.getBatchSize('alert', 'medium')).toBeGreaterThan(0);
      expect(configService.getBatchSize('data', 'large')).toBeGreaterThan(0);
    });

    it('应该提供性能级别判断', () => {
      const responseLevel = configService.getPerformanceLevel('response_time', 50);
      expect(['excellent', 'good', 'warning', 'poor', 'critical']).toContain(responseLevel);
      
      const errorLevel = configService.getPerformanceLevel('error_rate', 0.01);
      expect(['excellent', 'good', 'warning', 'poor', 'critical']).toContain(errorLevel);
    });

    it('应该支持告警控制', () => {
      // 测试告警发送判断
      const canSend = configService.canSendAlert('warning', 2, 1);
      expect(typeof canSend).toBe('boolean');
      
      // 测试静默时间判断
      const isQuiet = configService.isQuietHours();
      expect(typeof isQuiet).toBe('boolean');
    });

    it('应该支持配置热重载', async () => {
      await expect(configService.reloadConfig()).resolves.toBeUndefined();
    });
  });

  describe('工具类集成', () => {
    it('应该集成限制工具类', () => {
      const dataCount = 150;
      const batchConfig = testConfig.limits.alertBatch;
      const selectedSize = MonitoringLimitsUtils.selectBatchSize(dataCount, batchConfig);
      
      expect(selectedSize).toBeGreaterThan(0);
      expect(selectedSize).toBeLessThanOrEqual(batchConfig.max);
    });

    it('应该集成TTL工具类', () => {
      const ttlConfig = testConfig.ttl;
      const smartTtl = MonitoringTtlUtils.getSmartTtl('health', 'high_frequency');
      
      expect(smartTtl).toBeGreaterThan(0);
      expect(smartTtl).toBeLessThanOrEqual(ttlConfig.health);
    });

    it('应该集成性能阈值工具类', () => {
      const thresholds = testConfig.performanceThresholds;
      const level = MonitoringPerformanceThresholdsUtils.getResponseTimeLevel(
        100, 'api', thresholds
      );
      
      expect(['excellent', 'good', 'warning', 'poor', 'critical']).toContain(level);
    });
  });

  describe('环境特定配置', () => {
    it('应该为不同环境应用不同的配置', () => {
      const devConfig = MonitoringConfigFactory.createDefault();
      devConfig.environment.environment = 'development';
      devConfig.adjustForEnvironment();
      
      const prodConfig = MonitoringConfigFactory.createDefault();
      prodConfig.environment.environment = 'production';
      prodConfig.adjustForEnvironment();
      
      // 生产环境应该有更严格的阈值
      expect(prodConfig.performanceThresholds.apiResponse.apiExcellentMs)
        .toBeLessThanOrEqual(devConfig.performanceThresholds.apiResponse.apiExcellentMs);
      
      // 生产环境应该有更大的批量大小
      expect(prodConfig.limits.alertBatch.large)
        .toBeGreaterThanOrEqual(devConfig.limits.alertBatch.large);
    });

    it('应该为测试环境优化配置', () => {
      expect(testConfig.environment.isTest).toBe(true);
      expect(testConfig.base.debugEnabled).toBe(true);
      expect(testConfig.events.enableAutoAnalysis).toBe(false);
    });
  });

  describe('性能和内存使用', () => {
    it('配置创建应该是高效的', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        MonitoringConfigFactory.createForTesting();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 100次配置创建应该在合理时间内完成（< 100ms）
      expect(duration).toBeLessThan(100);
    });

    it('配置访问应该是高效的', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        configService.getTtl('health');
        configService.getBatchSize('alert', 'medium');
        configService.getPerformanceLevel('response_time', 100);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 3000次配置访问应该在合理时间内完成（< 50ms）
      expect(duration).toBeLessThan(50);
    });

    it('配置验证应该是高效的', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        testConfig.validateConfiguration();
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // 100次配置验证应该在合理时间内完成（< 100ms）
      expect(duration).toBeLessThan(100);
    });
  });

  describe('配置完整性检查', () => {
    it('应该覆盖所有必要的配置域', () => {
      const summary = testConfig.getConfigurationSummary();
      
      // 验证关键指标都有定义
      expect(summary.keyMetrics.ttlHealthSeconds).toBeDefined();
      expect(summary.keyMetrics.maxAlertsPerMinute).toBeDefined();
      expect(summary.keyMetrics.apiResponseExcellentMs).toBeDefined();
      expect(summary.keyMetrics.redisHitRateExcellent).toBeDefined();
      expect(summary.keyMetrics.maxRetryAttempts).toBeDefined();
      expect(summary.keyMetrics.dataRetentionDays).toBeDefined();
      expect(summary.keyMetrics.compressionThreshold).toBeDefined();
      expect(summary.keyMetrics.namespace).toBeDefined();
    });

    it('应该提供完整的环境变量映射', () => {
      const mapping = MONITORING_ENHANCED_CONFIG_ENV_MAPPING;
      
      // 验证主要配置域都有环境变量支持
      expect(mapping['base.namespace']).toBeDefined();
      expect(mapping['ttl.health']).toBeDefined();
      expect(mapping['limits.alertBatch.medium']).toBeDefined();
      expect(mapping['performanceThresholds.apiResponse.apiExcellentMs']).toBeDefined();
      expect(mapping['events.alertFrequency.maxAlertsPerMinute']).toBeDefined();
    });

    it('应该支持所有配置的序列化', () => {
      const exported = testConfig.exportConfiguration();
      const serialized = JSON.stringify(exported);
      const deserialized = JSON.parse(serialized);
      
      expect(deserialized.base).toEqual(exported.base);
      expect(deserialized.environment).toEqual(exported.environment);
      expect(deserialized.ttl).toEqual(exported.ttl);
      expect(deserialized.limits).toEqual(exported.limits);
      expect(deserialized.performanceThresholds).toEqual(exported.performanceThresholds);
      expect(deserialized.events).toEqual(exported.events);
    });
  });
});
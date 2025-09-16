/**
 * 监控组件配置一致性测试
 * 
 * 📋 测试范围：
 * ==========================================
 * 本测试文件验证监控组件配置系统的一致性和正确性：
 * 
 * ✅ TTL配置一致性测试：
 * - 验证无TTL配置重复
 * - 验证环境变量正确映射
 * - 验证TTL逻辑一致性
 * - 验证环境特定默认值
 * 
 * ✅ 批量配置一致性测试：
 * - 验证无批量大小配置重复
 * - 验证批量大小逻辑关系
 * - 验证系统限制配置
 * - 验证环境变量映射
 * 
 * ✅ 配置继承和组合测试：
 * - 验证配置类正确组合
 * - 验证配置继承关系
 * - 验证配置优先级
 * - 验证环境变量覆盖逻辑
 * 
 * ✅ 向后兼容性测试：
 * - 验证旧环境变量仍然工作
 * - 验证弃用警告正确显示
 * - 验证配置迁移路径
 * - 验证渐进式升级支持
 * 
 * @version 1.0.0
 * @since 2025-09-16
 * @author Claude Code
 */

import {
  MonitoringUnifiedTtlConfig,
  monitoringUnifiedTtlConfig,
  MonitoringTtlUtils,
  MONITORING_UNIFIED_TTL_CONSTANTS
} from '../../../../../src/monitoring/config/unified/monitoring-unified-ttl.config';

import {
  MonitoringUnifiedLimitsConfig,
  AlertBatchConfig,
  DataProcessingBatchConfig,
  DataCleanupBatchConfig,
  SystemLimitsConfig,
  monitoringUnifiedLimitsConfig,
  MONITORING_UNIFIED_LIMITS_CONSTANTS
} from '../../../../../src/monitoring/config/unified/monitoring-unified-limits.config';

import {
  MonitoringCoreEnvConfig,
  monitoringCoreEnvConfig,
  MONITORING_CORE_ENV_CONSTANTS
} from '../../../../../src/monitoring/config/unified/monitoring-core-env.config';

import {
  MonitoringConfigValidator,
  validateMonitoringConfiguration
} from '../../../../../src/monitoring/config/monitoring-config.validator';

describe('监控组件配置一致性测试', () => {
  // 保存原始环境变量
  const originalEnv = process.env;

  beforeEach(() => {
    // 重置环境变量
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // 恢复原始环境变量
    process.env = originalEnv;
  });

  describe('TTL配置一致性测试', () => {
    describe('TTL配置重复检测', () => {
      it('应该无重复的TTL配置定义', () => {
        // 创建TTL配置实例
        const ttlConfig = new MonitoringUnifiedTtlConfig();

        // 验证所有TTL字段都存在且唯一
        const ttlFields = ['health', 'trend', 'performance', 'alert', 'cacheStats'];
        
        ttlFields.forEach(field => {
          expect(ttlConfig).toHaveProperty(field);
          expect(typeof ttlConfig[field]).toBe('number');
          expect(ttlConfig[field]).toBeGreaterThan(0);
        });

        // 验证配置实例的唯一性
        const config1 = new MonitoringUnifiedTtlConfig();
        const config2 = new MonitoringUnifiedTtlConfig();
        
        // 修改一个实例不应影响另一个
        config1.health = 500;
        expect(config2.health).not.toBe(500);
      });

      it('应该消除原有的TTL常量重复', () => {
        // 验证统一的TTL常量存在
        expect(MONITORING_UNIFIED_TTL_CONSTANTS).toBeDefined();
        expect(MONITORING_UNIFIED_TTL_CONSTANTS.DEFAULTS).toBeDefined();
        expect(MONITORING_UNIFIED_TTL_CONSTANTS.PRODUCTION).toBeDefined();
        expect(MONITORING_UNIFIED_TTL_CONSTANTS.TEST).toBeDefined();

        // 验证所有TTL类型都有对应的常量定义
        const expectedTtlTypes = ['health', 'trend', 'performance', 'alert', 'cacheStats'];
        
        expectedTtlTypes.forEach(type => {
          expect(MONITORING_UNIFIED_TTL_CONSTANTS.DEFAULTS).toHaveProperty(type.toUpperCase());
          expect(MONITORING_UNIFIED_TTL_CONSTANTS.PRODUCTION).toHaveProperty(type.toUpperCase());
          expect(MONITORING_UNIFIED_TTL_CONSTANTS.TEST).toHaveProperty(type.toUpperCase());
        });
      });

      it('应该验证TTL配置的数据类型一致性', () => {
        const ttlConfig = new MonitoringUnifiedTtlConfig();

        // 所有TTL配置应该是正整数
        expect(Number.isInteger(ttlConfig.health)).toBe(true);
        expect(Number.isInteger(ttlConfig.trend)).toBe(true);
        expect(Number.isInteger(ttlConfig.performance)).toBe(true);
        expect(Number.isInteger(ttlConfig.alert)).toBe(true);
        expect(Number.isInteger(ttlConfig.cacheStats)).toBe(true);

        // 所有TTL配置应该是正数
        expect(ttlConfig.health).toBeGreaterThan(0);
        expect(ttlConfig.trend).toBeGreaterThan(0);
        expect(ttlConfig.performance).toBeGreaterThan(0);
        expect(ttlConfig.alert).toBeGreaterThan(0);
        expect(ttlConfig.cacheStats).toBeGreaterThan(0);
      });
    });

    describe('环境变量正确映射', () => {
      it('应该正确映射新的核心环境变量', () => {
        // 设置核心环境变量
        process.env.MONITORING_DEFAULT_TTL = '600';
        
        const config = monitoringUnifiedTtlConfig();

        // 验证基于核心TTL的倍数关系
        expect(config.health).toBe(600);  // 1.0x
        expect(config.trend).toBe(1200);  // 2.0x
        expect(config.performance).toBe(360);  // 0.6x
        expect(config.alert).toBe(120);   // 0.2x
        expect(config.cacheStats).toBe(240);   // 0.4x
      });

      it('应该支持旧环境变量的向后兼容', () => {
        // 设置旧的环境变量
        process.env.MONITORING_TTL_HEALTH = '400';
        process.env.MONITORING_TTL_TREND = '800';
        process.env.MONITORING_TTL_PERFORMANCE = '200';
        process.env.MONITORING_TTL_ALERT = '80';
        process.env.MONITORING_TTL_CACHE_STATS = '160';

        // 捕获控制台警告
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const config = monitoringUnifiedTtlConfig();

        // 验证旧环境变量仍然生效
        expect(config.health).toBe(400);
        expect(config.trend).toBe(800);
        expect(config.performance).toBe(200);
        expect(config.alert).toBe(80);
        expect(config.cacheStats).toBe(160);

        // 验证弃用警告被显示
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[DEPRECATED] MONITORING_TTL_HEALTH is deprecated')
        );

        consoleSpy.mockRestore();
      });

      it('应该正确处理环境变量优先级', () => {
        // 同时设置新旧环境变量
        process.env.MONITORING_DEFAULT_TTL = '600';
        process.env.MONITORING_TTL_HEALTH = '900';  // 旧变量应该覆盖新变量

        const config = monitoringUnifiedTtlConfig();

        // 旧环境变量应该有更高优先级（向后兼容）
        expect(config.health).toBe(900);
        // 其他值应该使用新环境变量的倍数
        expect(config.trend).toBe(1200);  // 600 * 2.0
      });

      it('应该处理无效的环境变量值', () => {
        // 设置无效的环境变量
        process.env.MONITORING_DEFAULT_TTL = 'invalid';
        process.env.MONITORING_TTL_HEALTH = 'not-a-number';

        const config = monitoringUnifiedTtlConfig();

        // 应该使用默认值
        expect(config.health).toBe(300);  // 默认值
        expect(config.trend).toBe(600);   // 默认值
      });
    });

    describe('TTL逻辑一致性验证', () => {
      it('应该验证TTL配置的业务逻辑一致性', () => {
        const ttlConfig = new MonitoringUnifiedTtlConfig();
        const validationResult = MonitoringConfigValidator.validateTtlConfig(ttlConfig);

        // 基础验证应该通过
        expect(validationResult.isValid).toBe(true);
        expect(validationResult.summary.configurationName).toBe('MonitoringUnifiedTtlConfig');
      });

      it('应该检测TTL配置的潜在问题', () => {
        const ttlConfig = new MonitoringUnifiedTtlConfig();
        
        // 设置可能引起警告的值
        ttlConfig.alert = 1000;  // 告警TTL大于健康检查TTL
        ttlConfig.health = 500;

        const validationResult = MonitoringConfigValidator.validateTtlConfig(ttlConfig);

        // 应该有警告但仍然有效
        expect(validationResult.isValid).toBe(true);
        expect(validationResult.warnings.length).toBeGreaterThan(0);
        expect(validationResult.warnings.some(w => w.includes('告警数据TTL不应大于健康检查TTL'))).toBe(true);
      });

      it('应该验证环境特定的TTL推荐值', () => {
        const environments = ['development', 'test', 'production'];

        environments.forEach(env => {
          const originalEnv = process.env.NODE_ENV;
          process.env.NODE_ENV = env;

          const healthTtl = MonitoringTtlUtils.getRecommendedTtl('health', env);
          const alertTtl = MonitoringTtlUtils.getRecommendedTtl('alert', env);
          const trendTtl = MonitoringTtlUtils.getRecommendedTtl('trend', env);

          // 验证推荐值符合环境特点
          if (env === 'test') {
            expect(healthTtl).toBeLessThanOrEqual(60);  // 测试环境应该更短
            expect(alertTtl).toBeLessThanOrEqual(10);
          } else if (env === 'production') {
            expect(healthTtl).toBeGreaterThanOrEqual(300);  // 生产环境应该更长
            expect(trendTtl).toBeGreaterThanOrEqual(600);
          }

          // 恢复环境
          process.env.NODE_ENV = originalEnv;
        });
      });
    });
  });

  describe('批量配置一致性测试', () => {
    describe('批量大小配置重复检测', () => {
      it('应该无重复的批量大小配置定义', () => {
        const limitsConfig = new MonitoringUnifiedLimitsConfig();

        // 验证所有批量配置都存在
        expect(limitsConfig.alertBatch).toBeDefined();
        expect(limitsConfig.dataProcessingBatch).toBeDefined();
        expect(limitsConfig.dataCleanupBatch).toBeDefined();
        expect(limitsConfig.systemLimits).toBeDefined();

        // 验证告警批量配置的层次关系
        expect(limitsConfig.alertBatch.small).toBeLessThanOrEqual(limitsConfig.alertBatch.medium);
        expect(limitsConfig.alertBatch.medium).toBeLessThanOrEqual(limitsConfig.alertBatch.large);
        expect(limitsConfig.alertBatch.large).toBeLessThanOrEqual(limitsConfig.alertBatch.max);
      });

      it('应该消除原有的批量配置重复', () => {
        // 验证统一的批量常量存在
        expect(MONITORING_UNIFIED_LIMITS_CONSTANTS).toBeDefined();
        expect(MONITORING_UNIFIED_LIMITS_CONSTANTS.ALERT_BATCH).toBeDefined();
        expect(MONITORING_UNIFIED_LIMITS_CONSTANTS.DATA_BATCH).toBeDefined();
        expect(MONITORING_UNIFIED_LIMITS_CONSTANTS.CLEANUP_BATCH).toBeDefined();
        expect(MONITORING_UNIFIED_LIMITS_CONSTANTS.SYSTEM_LIMITS).toBeDefined();

        // 验证所有批量类型都有对应的常量定义
        const alertBatchSizes = ['SMALL', 'MEDIUM', 'LARGE', 'MAX'];
        alertBatchSizes.forEach(size => {
          expect(MONITORING_UNIFIED_LIMITS_CONSTANTS.ALERT_BATCH).toHaveProperty(size);
        });
      });

      it('应该验证批量配置的数据类型一致性', () => {
        const limitsConfig = new MonitoringUnifiedLimitsConfig();

        // 验证告警批量配置类型
        expect(typeof limitsConfig.alertBatch.small).toBe('number');
        expect(typeof limitsConfig.alertBatch.medium).toBe('number');
        expect(typeof limitsConfig.alertBatch.large).toBe('number');
        expect(typeof limitsConfig.alertBatch.max).toBe('number');

        // 验证所有批量大小都是正整数
        expect(Number.isInteger(limitsConfig.alertBatch.small)).toBe(true);
        expect(Number.isInteger(limitsConfig.alertBatch.medium)).toBe(true);
        expect(Number.isInteger(limitsConfig.alertBatch.large)).toBe(true);
        expect(Number.isInteger(limitsConfig.alertBatch.max)).toBe(true);

        // 验证所有批量大小都是正数
        expect(limitsConfig.alertBatch.small).toBeGreaterThan(0);
        expect(limitsConfig.alertBatch.medium).toBeGreaterThan(0);
        expect(limitsConfig.alertBatch.large).toBeGreaterThan(0);
        expect(limitsConfig.alertBatch.max).toBeGreaterThan(0);
      });
    });

    describe('批量配置逻辑关系验证', () => {
      it('应该验证告警批量大小的逻辑关系', () => {
        const limitsConfig = new MonitoringUnifiedLimitsConfig();
        const validationResult = MonitoringConfigValidator.validateLimitsConfig(limitsConfig);

        // 基础验证应该通过
        expect(validationResult.isValid).toBe(true);
        expect(validationResult.summary.configurationName).toBe('MonitoringUnifiedLimitsConfig');

        // 验证告警批量大小的递增关系
        expect(limitsConfig.alertBatch.small).toBeLessThanOrEqual(limitsConfig.alertBatch.medium);
        expect(limitsConfig.alertBatch.medium).toBeLessThanOrEqual(limitsConfig.alertBatch.large);
        expect(limitsConfig.alertBatch.large).toBeLessThanOrEqual(limitsConfig.alertBatch.max);
      });

      it('应该检测批量配置的潜在问题', () => {
        const limitsConfig = new MonitoringUnifiedLimitsConfig();
        
        // 设置可能引起警告的值
        limitsConfig.alertBatch.small = 50;
        limitsConfig.alertBatch.medium = 30;  // 中等小于小批量

        const validationResult = MonitoringConfigValidator.validateLimitsConfig(limitsConfig);

        // 应该有警告
        expect(validationResult.warnings.length).toBeGreaterThan(0);
        expect(validationResult.warnings.some(w => w.includes('告警小批量大小不应大于中等批量大小'))).toBe(true);
      });

      it('应该验证系统限制配置的合理性', () => {
        const limitsConfig = new MonitoringUnifiedLimitsConfig();
        
        // 设置过小的系统限制
        limitsConfig.systemLimits.maxQueueSize = 50;  // 过小的队列

        const validationResult = MonitoringConfigValidator.validateLimitsConfig(limitsConfig);

        // 应该有关于队列大小的警告
        expect(validationResult.warnings.some(w => w.includes('系统队列大小过小'))).toBe(true);
      });
    });

    describe('环境变量映射验证', () => {
      it('应该正确映射批量配置环境变量', () => {
        // 设置环境变量
        process.env.MONITORING_ALERT_BATCH_SMALL = '8';
        process.env.MONITORING_ALERT_BATCH_MEDIUM = '15';
        process.env.MONITORING_ALERT_BATCH_LARGE = '30';
        process.env.MONITORING_ALERT_BATCH_MAX = '60';

        const config = monitoringUnifiedLimitsConfig();

        // 验证环境变量正确映射
        expect(config.alertBatch.small).toBe(8);
        expect(config.alertBatch.medium).toBe(15);
        expect(config.alertBatch.large).toBe(30);
        expect(config.alertBatch.max).toBe(60);
      });

      it('应该处理无效的批量配置环境变量', () => {
        // 设置无效的环境变量
        process.env.MONITORING_ALERT_BATCH_SMALL = 'invalid';
        process.env.MONITORING_ALERT_BATCH_MEDIUM = '-5';

        const config = monitoringUnifiedLimitsConfig();

        // 应该使用默认值
        expect(config.alertBatch.small).toBe(5);   // 默认值
        expect(config.alertBatch.medium).toBe(10); // 默认值
      });
    });
  });

  describe('配置继承和组合测试', () => {
    describe('配置类组合验证', () => {
      it('应该正确组合所有配置类', () => {
        const ttlConfig = new MonitoringUnifiedTtlConfig();
        const limitsConfig = new MonitoringUnifiedLimitsConfig();
        const coreEnvConfig = new MonitoringCoreEnvConfig();

        // 验证所有配置类都可以独立实例化
        expect(ttlConfig).toBeInstanceOf(MonitoringUnifiedTtlConfig);
        expect(limitsConfig).toBeInstanceOf(MonitoringUnifiedLimitsConfig);
        expect(coreEnvConfig).toBeInstanceOf(MonitoringCoreEnvConfig);

        // 验证配置类没有相互依赖
        const ttlValidation = MonitoringConfigValidator.validateTtlConfig(ttlConfig);
        const limitsValidation = MonitoringConfigValidator.validateLimitsConfig(limitsConfig);
        const coreEnvValidation = MonitoringConfigValidator.validateCoreEnvConfig(coreEnvConfig);

        expect(ttlValidation.isValid).toBe(true);
        expect(limitsValidation.isValid).toBe(true);
        expect(coreEnvValidation.isValid).toBe(true);
      });

      it('应该支持配置的完整验证', () => {
        const completeValidation = MonitoringConfigValidator.validateCompleteConfiguration();

        // 验证完整验证结果结构
        expect(completeValidation).toHaveProperty('isValid');
        expect(completeValidation).toHaveProperty('results');
        expect(completeValidation).toHaveProperty('summary');

        expect(completeValidation.results).toHaveProperty('ttl');
        expect(completeValidation.results).toHaveProperty('limits');
        expect(completeValidation.results).toHaveProperty('coreEnv');
        expect(completeValidation.results).toHaveProperty('environment');
        expect(completeValidation.results).toHaveProperty('overlaps');

        expect(completeValidation.summary).toHaveProperty('totalErrors');
        expect(completeValidation.summary).toHaveProperty('totalWarnings');
        expect(completeValidation.summary).toHaveProperty('overallScore');
        expect(completeValidation.summary).toHaveProperty('recommendations');
      });
    });

    describe('配置优先级验证', () => {
      it('应该验证环境变量优先级高于默认值', () => {
        // 设置环境变量
        process.env.MONITORING_DEFAULT_TTL = '500';
        
        const ttlConfig = monitoringUnifiedTtlConfig();
        
        // 环境变量应该覆盖默认值
        expect(ttlConfig.health).toBe(500);
        expect(ttlConfig.health).not.toBe(300); // 不是默认值
      });

      it('应该验证特定环境变量优先级高于通用环境变量', () => {
        // 同时设置通用和特定环境变量
        process.env.MONITORING_DEFAULT_TTL = '600';
        process.env.MONITORING_TTL_HEALTH = '800';

        const ttlConfig = monitoringUnifiedTtlConfig();

        // 特定环境变量应该有更高优先级
        expect(ttlConfig.health).toBe(800);
        expect(ttlConfig.trend).toBe(1200); // 使用通用环境变量的倍数
      });
    });

    describe('环境变量覆盖逻辑验证', () => {
      it('应该支持部分环境变量覆盖', () => {
        // 只设置部分环境变量
        process.env.MONITORING_TTL_HEALTH = '400';
        // 不设置其他TTL环境变量

        const ttlConfig = monitoringUnifiedTtlConfig();

        // 已设置的环境变量应该生效
        expect(ttlConfig.health).toBe(400);
        // 未设置的应该使用默认值
        expect(ttlConfig.trend).toBe(600);    // 默认值
        expect(ttlConfig.performance).toBe(180); // 默认值
      });

      it('应该支持环境特定的配置调整', () => {
        const originalEnv = process.env.NODE_ENV;

        // 测试生产环境
        process.env.NODE_ENV = 'production';
        const prodConfig = new MonitoringUnifiedTtlConfig();
        prodConfig.adjustForEnvironment();

        expect(prodConfig.health).toBeGreaterThanOrEqual(300);
        expect(prodConfig.trend).toBeGreaterThanOrEqual(600);

        // 测试测试环境
        process.env.NODE_ENV = 'test';
        const testConfig = new MonitoringUnifiedTtlConfig();
        testConfig.adjustForEnvironment();

        expect(testConfig.health).toBeLessThanOrEqual(60);
        expect(testConfig.performance).toBeLessThanOrEqual(30);

        // 恢复环境
        process.env.NODE_ENV = originalEnv;
      });
    });
  });

  describe('向后兼容性测试', () => {
    describe('旧环境变量支持', () => {
      it('应该支持所有旧TTL环境变量', () => {
        const oldEnvVars = {
          'MONITORING_TTL_HEALTH': '350',
          'MONITORING_TTL_TREND': '700',
          'MONITORING_TTL_PERFORMANCE': '200',
          'MONITORING_TTL_ALERT': '70',
          'MONITORING_TTL_CACHE_STATS': '140'
        };

        // 设置所有旧环境变量
        Object.entries(oldEnvVars).forEach(([key, value]) => {
          process.env[key] = value;
        });

        const config = monitoringUnifiedTtlConfig();

        // 验证所有旧环境变量都生效
        expect(config.health).toBe(350);
        expect(config.trend).toBe(700);
        expect(config.performance).toBe(200);
        expect(config.alert).toBe(70);
        expect(config.cacheStats).toBe(140);
      });

      it('应该支持旧批量配置环境变量', () => {
        const oldBatchEnvVars = {
          'MONITORING_ALERT_BATCH_SMALL': '7',
          'MONITORING_ALERT_BATCH_MEDIUM': '14',
          'MONITORING_DATA_BATCH_STANDARD': '25',
          'MONITORING_CLEANUP_BATCH_STANDARD': '2000'
        };

        // 设置旧环境变量
        Object.entries(oldBatchEnvVars).forEach(([key, value]) => {
          process.env[key] = value;
        });

        const config = monitoringUnifiedLimitsConfig();

        // 验证旧环境变量生效
        expect(config.alertBatch.small).toBe(7);
        expect(config.alertBatch.medium).toBe(14);
        expect(config.dataProcessingBatch.standard).toBe(25);
        expect(config.dataCleanupBatch.standard).toBe(2000);
      });
    });

    describe('弃用警告验证', () => {
      it('应该为旧环境变量显示弃用警告', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        // 设置旧环境变量
        process.env.MONITORING_TTL_HEALTH = '300';
        process.env.MONITORING_TTL_TREND = '600';

        monitoringUnifiedTtlConfig();

        // 验证弃用警告被显示
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[DEPRECATED] MONITORING_TTL_HEALTH is deprecated')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[DEPRECATED] MONITORING_TTL_TREND is deprecated')
        );

        consoleSpy.mockRestore();
      });

      it('应该检测弃用的环境变量', () => {
        // 设置一些弃用的环境变量
        process.env.MONITORING_TTL_HEALTH = '300';
        process.env.MONITORING_ALERT_BATCH_SMALL = '5';

        const envValidation = MonitoringConfigValidator.validateEnvironmentVariables();

        // 应该检测到弃用的环境变量
        expect(envValidation.deprecated.length).toBeGreaterThan(0);
        expect(envValidation.deprecated).toContain('MONITORING_TTL_HEALTH');
        expect(envValidation.deprecated).toContain('MONITORING_ALERT_BATCH_SMALL');
      });
    });

    describe('配置迁移路径验证', () => {
      it('应该提供从旧配置到新配置的平滑迁移', () => {
        // 模拟混合配置场景
        process.env.MONITORING_DEFAULT_TTL = '400';  // 新配置
        process.env.MONITORING_TTL_HEALTH = '500';   // 旧配置覆盖

        const config = monitoringUnifiedTtlConfig();

        // 新旧配置应该可以共存
        expect(config.health).toBe(500);  // 旧配置优先
        expect(config.trend).toBe(800);   // 新配置的倍数 (400 * 2.0)
      });

      it('应该支持渐进式配置升级', () => {
        // 设置部分新配置和部分旧配置
        process.env.MONITORING_DEFAULT_TTL = '300';
        process.env.MONITORING_TTL_PERFORMANCE = '150';  // 只覆盖性能TTL

        const config = monitoringUnifiedTtlConfig();

        // 混合配置应该正常工作
        expect(config.health).toBe(300);      // 新配置
        expect(config.trend).toBe(600);       // 新配置的倍数
        expect(config.performance).toBe(150); // 旧配置覆盖
        expect(config.alert).toBe(60);        // 新配置的倍数
      });
    });
  });

  describe('配置验证器完整性测试', () => {
    it('应该提供完整的配置验证功能', () => {
      const validationFunction = validateMonitoringConfiguration;
      
      expect(typeof validationFunction).toBe('function');
      
      // 这个函数会打印报告到控制台，我们主要验证它不会崩溃
      const result = validationFunction();
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('summary');
      expect(typeof result.isValid).toBe('boolean');
    });

    it('应该生成详细的验证报告', () => {
      const completeValidation = MonitoringConfigValidator.validateCompleteConfiguration();
      const report = MonitoringConfigValidator.generateValidationReport(completeValidation);

      // 验证报告包含预期的部分
      expect(report).toContain('监控组件配置验证报告');
      expect(report).toContain('TTL配置验证结果');
      expect(report).toContain('批量限制配置验证结果');
      expect(report).toContain('环境变量验证结果');
      expect(report).toContain('配置重复检测结果');
      expect(report).toContain('建议和总结');

      // 验证报告格式
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(100);
    });

    it('应该计算合理的配置质量分数', () => {
      const completeValidation = MonitoringConfigValidator.validateCompleteConfiguration();

      expect(completeValidation.summary.overallScore).toBeGreaterThanOrEqual(0);
      expect(completeValidation.summary.overallScore).toBeLessThanOrEqual(100);
      expect(Number.isInteger(completeValidation.summary.overallScore)).toBe(true);
    });
  });
});
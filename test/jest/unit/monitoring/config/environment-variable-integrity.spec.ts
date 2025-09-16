/**
 * 监控组件环境变量完整性测试
 * 
 * 📋 测试范围：
 * ==========================================
 * 本测试文件验证监控组件环境变量系统的完整性和正确性：
 * 
 * ✅ 核心环境变量测试：
 * - 验证8个核心环境变量正确工作
 * - 验证环境变量类型转换和验证
 * - 验证环境变量范围检查
 * - 验证环境变量默认值逻辑
 * 
 * ✅ 向后兼容性测试：
 * - 验证旧环境变量仍然工作
 * - 验证弃用警告机制
 * - 验证渐进式迁移支持
 * - 验证新旧变量优先级
 * 
 * ✅ 环境特定默认值测试：
 * - 验证开发环境默认值
 * - 验证测试环境默认值
 * - 验证生产环境默认值
 * - 验证环境切换行为
 * 
 * ✅ 环境变量完整性验证：
 * - 验证必需变量检测
 * - 验证可选变量处理
 * - 验证无效值处理
 * - 验证缺失值处理
 * 
 * @version 1.0.0
 * @since 2025-09-16
 * @author Claude Code
 */

import {
  MonitoringUnifiedTtlConfig,
  monitoringUnifiedTtlConfig,
  MONITORING_UNIFIED_TTL_CONSTANTS,
  type EnvironmentType
} from '../../../../../src/monitoring/config/unified/monitoring-unified-ttl.config';

import {
  MonitoringUnifiedLimitsConfig,
  monitoringUnifiedLimitsConfig,
  MONITORING_UNIFIED_LIMITS_CONSTANTS
} from '../../../../../src/monitoring/config/unified/monitoring-unified-limits.config';

import {
  MonitoringCoreEnvConfig,
  monitoringCoreEnvConfig,
  MONITORING_CORE_ENV_CONSTANTS,
  type MonitoringCoreEnvType
} from '../../../../../src/monitoring/config/unified/monitoring-core-env.config';

import {
  MonitoringConfigValidator,
  type EnvironmentValidationResult
} from '../../../../../src/monitoring/config/monitoring-config.validator';

describe('监控组件环境变量完整性测试', () => {
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

  describe('核心环境变量测试', () => {
    describe('8个核心环境变量功能验证', () => {
      it('应该正确处理 MONITORING_DEFAULT_TTL 环境变量', () => {
        // 测试有效值
        process.env.MONITORING_DEFAULT_TTL = '450';
        
        const config = monitoringUnifiedTtlConfig();
        
        // 验证TTL倍数逻辑
        expect(config.health).toBe(450);           // 1.0x
        expect(config.trend).toBe(900);           // 2.0x
        expect(config.performance).toBe(270);     // 0.6x
        expect(config.alert).toBe(90);            // 0.2x
        expect(config.cacheStats).toBe(180);      // 0.4x
      });

      it('应该正确处理 MONITORING_DEFAULT_BATCH_SIZE 环境变量', () => {
        // 测试批量大小环境变量
        process.env.MONITORING_DEFAULT_BATCH_SIZE = '25';
        
        const config = monitoringUnifiedLimitsConfig();
        
        // 验证批量大小基础值被正确应用
        expect(config.dataProcessingBatch.standard).toBe(25);
        
        // 验证相关的批量配置被正确计算
        expect(config.alertBatch.medium).toBeGreaterThanOrEqual(10);
        expect(config.dataCleanupBatch.standard).toBeGreaterThanOrEqual(100);
      });

      it('应该正确处理 MONITORING_PERFORMANCE_ENABLE 环境变量', () => {
        // 测试布尔环境变量
        const testCases = [
          { value: 'true', expected: true },
          { value: 'false', expected: false },
          { value: '1', expected: true },
          { value: '0', expected: false },
          { value: 'yes', expected: true },
          { value: 'no', expected: false },
          { value: 'TRUE', expected: true },
          { value: 'FALSE', expected: false }
        ];

        testCases.forEach(({ value, expected }) => {
          process.env.MONITORING_PERFORMANCE_ENABLE = value;
          
          const config = monitoringCoreEnvConfig();
          
          expect(config.performanceEnable).toBe(expected);
        });
      });

      it('应该正确处理 MONITORING_ALERT_ENABLE 环境变量', () => {
        // 测试告警启用开关
        process.env.MONITORING_ALERT_ENABLE = 'true';
        
        const config = monitoringCoreEnvConfig();
        
        expect(config.alertEnable).toBe(true);
        expect(typeof config.alertEnable).toBe('boolean');
      });

      it('应该正确处理 MONITORING_CACHE_ENABLE 环境变量', () => {
        // 测试缓存启用开关
        process.env.MONITORING_CACHE_ENABLE = 'false';
        
        const config = monitoringCoreEnvConfig();
        
        expect(config.cacheEnable).toBe(false);
        expect(typeof config.cacheEnable).toBe('boolean');
      });

      it('应该正确处理 MONITORING_COMPRESSION_ENABLE 环境变量', () => {
        // 测试压缩启用开关
        process.env.MONITORING_COMPRESSION_ENABLE = 'true';
        
        const config = monitoringCoreEnvConfig();
        
        expect(config.compressionEnable).toBe(true);
        expect(typeof config.compressionEnable).toBe('boolean');
      });

      it('应该正确处理 MONITORING_MAX_MEMORY_MB 环境变量', () => {
        // 测试内存限制
        process.env.MONITORING_MAX_MEMORY_MB = '1024';
        
        const config = monitoringCoreEnvConfig();
        
        expect(config.maxMemoryMb).toBe(1024);
        expect(typeof config.maxMemoryMb).toBe('number');
        expect(config.maxMemoryMb).toBeGreaterThan(0);
      });

      it('应该正确处理 MONITORING_MAX_CONNECTIONS 环境变量', () => {
        // 测试最大连接数
        process.env.MONITORING_MAX_CONNECTIONS = '100';
        
        const config = monitoringCoreEnvConfig();
        
        expect(config.maxConnections).toBe(100);
        expect(typeof config.maxConnections).toBe('number');
        expect(config.maxConnections).toBeGreaterThan(0);
      });
    });

    describe('环境变量类型转换和验证', () => {
      it('应该正确转换数字类型环境变量', () => {
        const numericEnvVars = {
          'MONITORING_DEFAULT_TTL': '600',
          'MONITORING_DEFAULT_BATCH_SIZE': '20',
          'MONITORING_MAX_MEMORY_MB': '2048',
          'MONITORING_MAX_CONNECTIONS': '150'
        };

        Object.entries(numericEnvVars).forEach(([key, value]) => {
          process.env[key] = value;
        });

        const coreConfig = monitoringCoreEnvConfig();
        const ttlConfig = monitoringUnifiedTtlConfig();
        const limitsConfig = monitoringUnifiedLimitsConfig();

        // 验证数字转换
        expect(typeof coreConfig.defaultTtl).toBe('number');
        expect(typeof coreConfig.defaultBatchSize).toBe('number');
        expect(typeof coreConfig.maxMemoryMb).toBe('number');
        expect(typeof coreConfig.maxConnections).toBe('number');

        expect(coreConfig.defaultTtl).toBe(600);
        expect(coreConfig.maxMemoryMb).toBe(2048);
      });

      it('应该正确转换布尔类型环境变量', () => {
        const booleanEnvVars = {
          'MONITORING_PERFORMANCE_ENABLE': 'true',
          'MONITORING_ALERT_ENABLE': 'false',
          'MONITORING_CACHE_ENABLE': '1',
          'MONITORING_COMPRESSION_ENABLE': '0'
        };

        Object.entries(booleanEnvVars).forEach(([key, value]) => {
          process.env[key] = value;
        });

        const config = monitoringCoreEnvConfig();

        // 验证布尔转换
        expect(typeof config.performanceEnable).toBe('boolean');
        expect(typeof config.alertEnable).toBe('boolean');
        expect(typeof config.cacheEnable).toBe('boolean');
        expect(typeof config.compressionEnable).toBe('boolean');

        expect(config.performanceEnable).toBe(true);
        expect(config.alertEnable).toBe(false);
        expect(config.cacheEnable).toBe(true);
        expect(config.compressionEnable).toBe(false);
      });

      it('应该处理无效的环境变量值', () => {
        // 设置无效值
        process.env.MONITORING_DEFAULT_TTL = 'invalid-number';
        process.env.MONITORING_PERFORMANCE_ENABLE = 'invalid-boolean';
        process.env.MONITORING_MAX_MEMORY_MB = 'not-a-number';

        const coreConfig = monitoringCoreEnvConfig();
        const ttlConfig = monitoringUnifiedTtlConfig();

        // 无效值应该使用默认值
        expect(coreConfig.defaultTtl).toBe(300); // 默认值
        expect(coreConfig.performanceEnable).toBe(true); // 默认值
        expect(coreConfig.maxMemoryMb).toBe(512); // 默认值

        // TTL配置也应该使用默认值
        expect(ttlConfig.health).toBe(300);
        expect(ttlConfig.trend).toBe(600);
      });

      it('应该验证环境变量值的范围', () => {
        // 测试边界值
        const testCases = [
          { var: 'MONITORING_DEFAULT_TTL', value: '1', expectValid: true },
          { var: 'MONITORING_DEFAULT_TTL', value: '3600', expectValid: true },
          { var: 'MONITORING_DEFAULT_TTL', value: '0', expectValid: false },
          { var: 'MONITORING_DEFAULT_TTL', value: '7200', expectValid: false },
          { var: 'MONITORING_MAX_MEMORY_MB', value: '64', expectValid: true },
          { var: 'MONITORING_MAX_MEMORY_MB', value: '8192', expectValid: true },
          { var: 'MONITORING_MAX_MEMORY_MB', value: '0', expectValid: false }
        ];

        testCases.forEach(({ var: envVar, value, expectValid }) => {
          process.env[envVar] = value;
          
          const config = monitoringCoreEnvConfig();
          const validation = MonitoringConfigValidator.validateCoreEnvConfig(config);

          if (expectValid) {
            expect(validation.errors.length).toBe(0);
          } else {
            // 无效值应该触发验证错误或使用默认值
            const parsedValue = parseInt(value, 10);
            if (isNaN(parsedValue) || parsedValue <= 0) {
              // 应该使用默认值而不是无效值
              expect(config.defaultTtl).toBeGreaterThan(0);
            }
          }
        });
      });
    });

    describe('环境变量默认值逻辑', () => {
      it('应该在未设置环境变量时使用正确的默认值', () => {
        // 清除所有监控相关环境变量
        Object.keys(process.env).forEach(key => {
          if (key.startsWith('MONITORING_')) {
            delete process.env[key];
          }
        });

        const coreConfig = monitoringCoreEnvConfig();
        const ttlConfig = monitoringUnifiedTtlConfig();
        const limitsConfig = monitoringUnifiedLimitsConfig();

        // 验证核心配置默认值
        expect(coreConfig.defaultTtl).toBe(300);
        expect(coreConfig.defaultBatchSize).toBe(10);
        expect(coreConfig.performanceEnable).toBe(true);
        expect(coreConfig.alertEnable).toBe(true);
        expect(coreConfig.cacheEnable).toBe(true);
        expect(coreConfig.compressionEnable).toBe(false);
        expect(coreConfig.maxMemoryMb).toBe(512);
        expect(coreConfig.maxConnections).toBe(50);

        // 验证TTL配置默认值
        expect(ttlConfig.health).toBe(300);
        expect(ttlConfig.trend).toBe(600);
        expect(ttlConfig.performance).toBe(180);
        expect(ttlConfig.alert).toBe(60);
        expect(ttlConfig.cacheStats).toBe(120);

        // 验证批量配置默认值
        expect(limitsConfig.alertBatch.small).toBe(5);
        expect(limitsConfig.alertBatch.medium).toBe(10);
        expect(limitsConfig.dataProcessingBatch.standard).toBe(10);
      });

      it('应该正确应用部分环境变量设置', () => {
        // 只设置部分环境变量
        process.env.MONITORING_DEFAULT_TTL = '500';
        process.env.MONITORING_PERFORMANCE_ENABLE = 'false';
        // 其他变量使用默认值

        const coreConfig = monitoringCoreEnvConfig();
        const ttlConfig = monitoringUnifiedTtlConfig();

        // 已设置的变量应该生效
        expect(coreConfig.defaultTtl).toBe(500);
        expect(coreConfig.performanceEnable).toBe(false);
        expect(ttlConfig.health).toBe(500);

        // 未设置的变量应该使用默认值
        expect(coreConfig.defaultBatchSize).toBe(10);
        expect(coreConfig.alertEnable).toBe(true);
        expect(coreConfig.maxMemoryMb).toBe(512);
      });
    });
  });

  describe('向后兼容性测试', () => {
    describe('旧环境变量支持验证', () => {
      it('应该支持所有旧TTL环境变量', () => {
        const legacyTtlVars = {
          'MONITORING_TTL_HEALTH': '400',
          'MONITORING_TTL_TREND': '800',
          'MONITORING_TTL_PERFORMANCE': '200',
          'MONITORING_TTL_ALERT': '80',
          'MONITORING_TTL_CACHE_STATS': '160'
        };

        Object.entries(legacyTtlVars).forEach(([key, value]) => {
          process.env[key] = value;
        });

        const config = monitoringUnifiedTtlConfig();

        // 验证旧环境变量仍然工作
        expect(config.health).toBe(400);
        expect(config.trend).toBe(800);
        expect(config.performance).toBe(200);
        expect(config.alert).toBe(80);
        expect(config.cacheStats).toBe(160);
      });

      it('应该支持旧批量配置环境变量', () => {
        const legacyBatchVars = {
          'MONITORING_ALERT_BATCH_SMALL': '8',
          'MONITORING_ALERT_BATCH_MEDIUM': '16',
          'MONITORING_ALERT_BATCH_LARGE': '32',
          'MONITORING_DATA_BATCH_STANDARD': '25',
          'MONITORING_CLEANUP_BATCH_STANDARD': '1500'
        };

        Object.entries(legacyBatchVars).forEach(([key, value]) => {
          process.env[key] = value;
        });

        const config = monitoringUnifiedLimitsConfig();

        // 验证旧批量环境变量仍然工作
        expect(config.alertBatch.small).toBe(8);
        expect(config.alertBatch.medium).toBe(16);
        expect(config.alertBatch.large).toBe(32);
        expect(config.dataProcessingBatch.standard).toBe(25);
        expect(config.dataCleanupBatch.standard).toBe(1500);
      });

      it('应该支持混合新旧环境变量', () => {
        // 混合设置新旧环境变量
        process.env.MONITORING_DEFAULT_TTL = '350';        // 新变量
        process.env.MONITORING_TTL_HEALTH = '450';         // 旧变量覆盖
        process.env.MONITORING_DEFAULT_BATCH_SIZE = '15';  // 新变量
        process.env.MONITORING_ALERT_BATCH_SMALL = '12';   // 旧变量覆盖

        const ttlConfig = monitoringUnifiedTtlConfig();
        const limitsConfig = monitoringUnifiedLimitsConfig();

        // 旧变量应该有更高优先级
        expect(ttlConfig.health).toBe(450);          // 旧变量覆盖
        expect(ttlConfig.trend).toBe(700);           // 新变量的倍数 (350 * 2.0)
        expect(ttlConfig.performance).toBe(210);     // 新变量的倍数 (350 * 0.6)

        expect(limitsConfig.alertBatch.small).toBe(12); // 旧变量覆盖
        expect(limitsConfig.dataProcessingBatch.standard).toBe(15); // 新变量生效
      });
    });

    describe('弃用警告机制验证', () => {
      it('应该为每个旧环境变量显示弃用警告', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const legacyVars = [
          'MONITORING_TTL_HEALTH',
          'MONITORING_TTL_TREND',
          'MONITORING_TTL_PERFORMANCE',
          'MONITORING_TTL_ALERT',
          'MONITORING_TTL_CACHE_STATS'
        ];

        // 设置所有旧环境变量
        legacyVars.forEach(varName => {
          process.env[varName] = '300';
        });

        monitoringUnifiedTtlConfig();

        // 验证每个旧变量都有弃用警告
        legacyVars.forEach(varName => {
          expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining(`[DEPRECATED] ${varName} is deprecated`)
          );
        });

        expect(consoleSpy).toHaveBeenCalledTimes(legacyVars.length);
        consoleSpy.mockRestore();
      });

      it('应该只为实际使用的旧环境变量显示警告', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        // 只设置部分旧环境变量
        process.env.MONITORING_TTL_HEALTH = '300';
        process.env.MONITORING_TTL_ALERT = '60';

        monitoringUnifiedTtlConfig();

        // 只应该有两个警告
        expect(consoleSpy).toHaveBeenCalledTimes(2);
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[DEPRECATED] MONITORING_TTL_HEALTH')
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[DEPRECATED] MONITORING_TTL_ALERT')
        );

        consoleSpy.mockRestore();
      });

      it('应该在不使用旧环境变量时不显示警告', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        // 只使用新环境变量
        process.env.MONITORING_DEFAULT_TTL = '400';
        process.env.MONITORING_DEFAULT_BATCH_SIZE = '20';

        monitoringUnifiedTtlConfig();
        monitoringUnifiedLimitsConfig();

        // 不应该有弃用警告
        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe('渐进式迁移支持验证', () => {
      it('应该支持渐进式环境变量迁移', () => {
        // 第一阶段：添加新环境变量，保留旧环境变量
        process.env.MONITORING_DEFAULT_TTL = '300';
        process.env.MONITORING_TTL_HEALTH = '350';    // 还未迁移
        process.env.MONITORING_TTL_TREND = '700';     // 还未迁移

        const config = monitoringUnifiedTtlConfig();

        // 旧变量应该仍然工作
        expect(config.health).toBe(350);
        expect(config.trend).toBe(700);
        // 新变量应该为其他字段提供默认值
        expect(config.performance).toBe(180); // 300 * 0.6
        expect(config.alert).toBe(60);         // 300 * 0.2
      });

      it('应该支持分批迁移环境变量', () => {
        // 模拟分批迁移过程
        const migrationSteps = [
          // 步骤1：迁移TTL配置
          {
            newVars: { 'MONITORING_DEFAULT_TTL': '400' },
            legacyVars: { 'MONITORING_ALERT_BATCH_SMALL': '8' }
          },
          // 步骤2：迁移批量配置
          {
            newVars: { 'MONITORING_DEFAULT_BATCH_SIZE': '15' },
            legacyVars: {}
          }
        ];

        migrationSteps.forEach((step, index) => {
          // 清理环境
          Object.keys(process.env).forEach(key => {
            if (key.startsWith('MONITORING_')) {
              delete process.env[key];
            }
          });

          // 应用当前步骤的配置
          Object.entries(step.newVars).forEach(([key, value]) => {
            process.env[key] = value;
          });
          Object.entries(step.legacyVars).forEach(([key, value]) => {
            process.env[key] = value;
          });

          const ttlConfig = monitoringUnifiedTtlConfig();
          const limitsConfig = monitoringUnifiedLimitsConfig();

          // 配置应该正常工作，不管迁移到哪个步骤
          expect(ttlConfig.health).toBeGreaterThan(0);
          expect(limitsConfig.alertBatch.small).toBeGreaterThan(0);
        });
      });
    });

    describe('新旧变量优先级验证', () => {
      it('应该验证旧环境变量的优先级高于新环境变量', () => {
        // 设置冲突的新旧环境变量
        process.env.MONITORING_DEFAULT_TTL = '300';
        process.env.MONITORING_TTL_HEALTH = '500';     // 旧变量应该优先

        const config = monitoringUnifiedTtlConfig();

        // 旧环境变量应该有更高优先级
        expect(config.health).toBe(500);               // 使用旧变量值
        expect(config.trend).toBe(600);                // 使用新变量的倍数 (300 * 2.0)
      });

      it('应该验证新环境变量在没有旧变量时生效', () => {
        // 只设置新环境变量
        process.env.MONITORING_DEFAULT_TTL = '400';

        const config = monitoringUnifiedTtlConfig();

        // 新环境变量应该为所有TTL提供基础值
        expect(config.health).toBe(400);      // 1.0x
        expect(config.trend).toBe(800);       // 2.0x
        expect(config.performance).toBe(240); // 0.6x
        expect(config.alert).toBe(80);        // 0.2x
        expect(config.cacheStats).toBe(160);  // 0.4x
      });

      it('应该验证优先级顺序：特定旧变量 > 通用新变量 > 默认值', () => {
        const testCases = [
          {
            name: '只有默认值',
            env: {},
            expectedHealth: 300 // 默认值
          },
          {
            name: '通用新变量',
            env: { 'MONITORING_DEFAULT_TTL': '500' },
            expectedHealth: 500 // 新变量值
          },
          {
            name: '特定旧变量覆盖',
            env: { 
              'MONITORING_DEFAULT_TTL': '500',
              'MONITORING_TTL_HEALTH': '600' 
            },
            expectedHealth: 600 // 旧变量优先
          }
        ];

        testCases.forEach(({ name, env, expectedHealth }) => {
          // 清理环境
          Object.keys(process.env).forEach(key => {
            if (key.startsWith('MONITORING_')) {
              delete process.env[key];
            }
          });

          // 设置测试环境变量
          Object.entries(env).forEach(([key, value]) => {
            process.env[key] = value;
          });

          const config = monitoringUnifiedTtlConfig();

          expect(config.health).toBe(expectedHealth);
        });
      });
    });
  });

  describe('环境特定默认值测试', () => {
    describe('开发环境默认值', () => {
      it('应该在开发环境使用适当的默认值', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const ttlConfig = new MonitoringUnifiedTtlConfig();
        ttlConfig.adjustForEnvironment();

        // 开发环境应该使用中等的TTL值
        expect(ttlConfig.health).toBe(300);   // 5分钟，平衡响应性和缓存效率
        expect(ttlConfig.trend).toBe(600);    // 10分钟，适合开发调试
        expect(ttlConfig.performance).toBe(180); // 3分钟，便于性能测试
        expect(ttlConfig.alert).toBe(60);     // 1分钟，快速告警反馈

        process.env.NODE_ENV = originalEnv;
      });

      it('应该在开发环境应用合理的系统限制', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        const limitsConfig = new MonitoringUnifiedLimitsConfig();
        limitsConfig.adjustForEnvironment();

        // 开发环境应该有适中的限制
        expect(limitsConfig.systemLimits.maxQueueSize).toBeGreaterThanOrEqual(1000);
        expect(limitsConfig.systemLimits.maxQueueSize).toBeLessThanOrEqual(5000);
        expect(limitsConfig.alertBatch.medium).toBeGreaterThanOrEqual(5);
        expect(limitsConfig.alertBatch.medium).toBeLessThanOrEqual(20);

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('测试环境默认值', () => {
      it('应该在测试环境使用快速响应的默认值', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';

        const ttlConfig = new MonitoringUnifiedTtlConfig();
        ttlConfig.adjustForEnvironment();

        // 测试环境应该使用较短的TTL值以快速验证
        expect(ttlConfig.health).toBeLessThanOrEqual(60);    // 最大1分钟
        expect(ttlConfig.trend).toBeLessThanOrEqual(120);    // 最大2分钟
        expect(ttlConfig.performance).toBeLessThanOrEqual(30); // 最大30秒
        expect(ttlConfig.alert).toBeLessThanOrEqual(10);     // 最大10秒

        process.env.NODE_ENV = originalEnv;
      });

      it('应该在测试环境使用较小的批量大小', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'test';

        const limitsConfig = new MonitoringUnifiedLimitsConfig();
        limitsConfig.adjustForEnvironment();

        // 测试环境应该使用较小的批量以便快速测试
        expect(limitsConfig.alertBatch.small).toBeLessThanOrEqual(5);
        expect(limitsConfig.alertBatch.medium).toBeLessThanOrEqual(10);
        expect(limitsConfig.dataProcessingBatch.standard).toBeLessThanOrEqual(10);

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('生产环境默认值', () => {
      it('应该在生产环境使用优化的默认值', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const ttlConfig = new MonitoringUnifiedTtlConfig();
        ttlConfig.adjustForEnvironment();

        // 生产环境应该使用较长的TTL值以提高效率
        expect(ttlConfig.health).toBeGreaterThanOrEqual(300);    // 最小5分钟
        expect(ttlConfig.trend).toBeGreaterThanOrEqual(600);     // 最小10分钟
        expect(ttlConfig.performance).toBeGreaterThanOrEqual(180); // 最小3分钟
        expect(ttlConfig.alert).toBeGreaterThanOrEqual(60);      // 最小1分钟

        process.env.NODE_ENV = originalEnv;
      });

      it('应该在生产环境使用较大的批量大小', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        const limitsConfig = new MonitoringUnifiedLimitsConfig();
        limitsConfig.adjustForEnvironment();

        // 生产环境应该使用较大的批量以提高效率
        expect(limitsConfig.alertBatch.medium).toBeGreaterThanOrEqual(10);
        expect(limitsConfig.alertBatch.large).toBeGreaterThanOrEqual(20);
        expect(limitsConfig.systemLimits.maxQueueSize).toBeGreaterThanOrEqual(5000);

        process.env.NODE_ENV = originalEnv;
      });
    });

    describe('环境切换行为验证', () => {
      it('应该在环境切换时正确调整配置', () => {
        const environments: EnvironmentType[] = ['development', 'test', 'production'];
        const originalEnv = process.env.NODE_ENV;

        const results: { [key: string]: any } = {};

        environments.forEach(env => {
          process.env.NODE_ENV = env;

          const ttlConfig = new MonitoringUnifiedTtlConfig();
          ttlConfig.adjustForEnvironment();

          results[env] = {
            health: ttlConfig.health,
            trend: ttlConfig.trend,
            performance: ttlConfig.performance,
            alert: ttlConfig.alert
          };
        });

        // 验证环境间的TTL值关系
        expect(results.test.health).toBeLessThan(results.development.health);
        expect(results.development.health).toBeLessThanOrEqual(results.production.health);
        
        expect(results.test.alert).toBeLessThan(results.development.alert);
        expect(results.development.alert).toBeLessThanOrEqual(results.production.alert);

        process.env.NODE_ENV = originalEnv;
      });

      it('应该在无效环境时使用开发环境默认值', () => {
        const originalEnv = process.env.NODE_ENV;
        
        // 设置无效环境
        process.env.NODE_ENV = 'invalid-environment';

        const ttlConfig = new MonitoringUnifiedTtlConfig();
        
        // 应该使用开发环境的默认值
        expect(ttlConfig.getDefaultHealthTtl()).toBe(300);
        expect(ttlConfig.getDefaultTrendTtl()).toBe(600);
        expect(ttlConfig.getDefaultPerformanceTtl()).toBe(180);

        process.env.NODE_ENV = originalEnv;
      });
    });
  });

  describe('环境变量完整性验证', () => {
    describe('必需变量检测', () => {
      it('应该检测缺失的必需环境变量', () => {
        // 清除所有监控环境变量
        Object.keys(process.env).forEach(key => {
          if (key.startsWith('MONITORING_')) {
            delete process.env[key];
          }
        });

        const validation = MonitoringConfigValidator.validateEnvironmentVariables();

        // 验证检测结果结构
        expect(validation).toHaveProperty('isValid');
        expect(validation).toHaveProperty('missing');
        expect(validation).toHaveProperty('invalid');
        expect(validation).toHaveProperty('deprecated');
        expect(validation).toHaveProperty('recommendations');

        // 在当前设计中，大部分环境变量是可选的
        // 但应该有推荐设置的提示
        expect(Array.isArray(validation.missing)).toBe(true);
        expect(Array.isArray(validation.recommendations)).toBe(true);
      });

      it('应该区分必需和可选环境变量', () => {
        const coreEnvVars = MONITORING_CORE_ENV_CONSTANTS.ENV_VARS;

        Object.entries(coreEnvVars).forEach(([varName, config]) => {
          if (config.required) {
            // 必需变量缺失时应该有明确提示
            delete process.env[varName];
            
            const validation = MonitoringConfigValidator.validateEnvironmentVariables();
            expect(validation.missing).toContain(varName);
          }
        });
      });
    });

    describe('可选变量处理', () => {
      it('应该正确处理可选环境变量', () => {
        // 只设置部分可选变量
        process.env.MONITORING_PERFORMANCE_ENABLE = 'false';
        process.env.MONITORING_CACHE_ENABLE = 'true';
        // 其他可选变量不设置

        const config = monitoringCoreEnvConfig();

        // 已设置的变量应该生效
        expect(config.performanceEnable).toBe(false);
        expect(config.cacheEnable).toBe(true);

        // 未设置的变量应该使用默认值
        expect(config.alertEnable).toBe(true);     // 默认值
        expect(config.compressionEnable).toBe(false); // 默认值
      });

      it('应该在所有可选变量都缺失时正常工作', () => {
        // 清除所有可选环境变量
        const optionalVars = [
          'MONITORING_PERFORMANCE_ENABLE',
          'MONITORING_ALERT_ENABLE',
          'MONITORING_CACHE_ENABLE',
          'MONITORING_COMPRESSION_ENABLE'
        ];

        optionalVars.forEach(varName => {
          delete process.env[varName];
        });

        const config = monitoringCoreEnvConfig();

        // 应该使用合理的默认值
        expect(typeof config.performanceEnable).toBe('boolean');
        expect(typeof config.alertEnable).toBe('boolean');
        expect(typeof config.cacheEnable).toBe('boolean');
        expect(typeof config.compressionEnable).toBe('boolean');
      });
    });

    describe('无效值处理', () => {
      it('应该检测和处理无效的环境变量值', () => {
        // 设置各种无效值
        const invalidValues = {
          'MONITORING_DEFAULT_TTL': 'not-a-number',
          'MONITORING_PERFORMANCE_ENABLE': 'maybe',
          'MONITORING_MAX_MEMORY_MB': '-100',
          'MONITORING_MAX_CONNECTIONS': '0'
        };

        Object.entries(invalidValues).forEach(([key, value]) => {
          process.env[key] = value;
        });

        const validation = MonitoringConfigValidator.validateEnvironmentVariables();

        // 应该检测到无效值
        expect(validation.invalid.length).toBeGreaterThan(0);
        
        // 无效值应该在数组中
        expect(validation.invalid.some(invalid => 
          invalid.includes('MONITORING_DEFAULT_TTL')
        )).toBe(true);
      });

      it('应该在有无效值时仍能创建有效配置', () => {
        // 设置混合的有效和无效值
        process.env.MONITORING_DEFAULT_TTL = 'invalid';  // 无效
        process.env.MONITORING_PERFORMANCE_ENABLE = 'true'; // 有效

        const coreConfig = monitoringCoreEnvConfig();
        const ttlConfig = monitoringUnifiedTtlConfig();

        // 应该使用默认值替代无效值
        expect(coreConfig.defaultTtl).toBe(300); // 默认值
        expect(ttlConfig.health).toBe(300);       // 对应的默认值

        // 有效值应该正常工作
        expect(coreConfig.performanceEnable).toBe(true);
      });
    });

    describe('缺失值处理', () => {
      it('应该在环境变量完全缺失时提供合理默认值', () => {
        // 完全清除环境变量
        const originalEnv = process.env;
        process.env = {};

        const coreConfig = monitoringCoreEnvConfig();
        const ttlConfig = monitoringUnifiedTtlConfig();
        const limitsConfig = monitoringUnifiedLimitsConfig();

        // 所有配置都应该有合理的默认值
        expect(coreConfig.defaultTtl).toBeGreaterThan(0);
        expect(coreConfig.defaultBatchSize).toBeGreaterThan(0);
        expect(typeof coreConfig.performanceEnable).toBe('boolean');

        expect(ttlConfig.health).toBeGreaterThan(0);
        expect(ttlConfig.trend).toBeGreaterThan(0);

        expect(limitsConfig.alertBatch.small).toBeGreaterThan(0);
        expect(limitsConfig.systemLimits.maxQueueSize).toBeGreaterThan(0);

        process.env = originalEnv;
      });

      it('应该为缺失的环境变量提供有用的建议', () => {
        // 清除所有监控环境变量
        Object.keys(process.env).forEach(key => {
          if (key.startsWith('MONITORING_')) {
            delete process.env[key];
          }
        });

        const validation = MonitoringConfigValidator.validateEnvironmentVariables();

        // 应该有建设性的建议
        expect(validation.recommendations.length).toBeGreaterThan(0);
        expect(validation.recommendations.some(r => 
          r.includes('设置') || r.includes('配置')
        )).toBe(true);
      });
    });
  });
});
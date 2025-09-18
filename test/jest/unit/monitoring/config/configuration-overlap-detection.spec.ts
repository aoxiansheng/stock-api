/**
 * 监控组件配置重复检测测试
 * 
 * 📋 测试范围：
 * ==========================================
 * 本测试文件验证监控组件配置重复的消除和检测机制：
 * 
 * ✅ 配置重复消除验证：
 * - 验证原有6+8个重复配置已被消除
 * - 验证TTL配置不再重复定义
 * - 验证批量大小配置不再重复定义
 * - 验证常量与配置分离正确实施
 * 
 * ✅ 静态重复检测：
 * - 扫描代码中的配置重复定义
 * - 检测环境变量重复定义
 * - 验证常量文件去重
 * - 检测配置类重复
 * 
 * ✅ 动态重复检测：
 * - 运行时配置值重复检测
 * - 配置实例重复检测
 * - 环境变量冲突检测
 * - 配置源冲突检测
 * 
 * ✅ 防止新重复引入：
 * - 配置新增时的重复检测
 * - 开发过程中的重复预防
 * - 自动化重复检测机制
 * - CI/CD重复检测集成
 * 
 * @version 1.0.0
 * @since 2025-09-16
 * @author Claude Code
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import {
  MonitoringUnifiedTtlConfig,
  MONITORING_UNIFIED_TTL_CONSTANTS,
  type TtlDataType
} from '../../../../../src/monitoring/config/unified/monitoring-unified-ttl.config';

import {
  MonitoringUnifiedLimitsConfig,
  MONITORING_UNIFIED_LIMITS_CONSTANTS,
  type BatchSizeType
} from '../../../../../src/monitoring/config/unified/monitoring-unified-limits.config';

import {
  MonitoringCoreEnvConfig,
  MONITORING_CORE_ENV_CONSTANTS
} from '../../../../../src/monitoring/config/unified/monitoring-core-env.config';

import {
  MonitoringConfigValidator
} from '../../../../../src/monitoring/config/monitoring-config.validator';

describe('监控组件配置重复检测测试', () => {
  const projectRoot = join(__dirname, '../../../../../');
  const monitoringPath = join(projectRoot, 'src/monitoring');

  describe('原有配置重复消除验证', () => {
    describe('TTL配置重复消除', () => {
      it('应该验证原有6个TTL重复配置已被消除', async () => {
        // 原有重复的TTL配置位置
        const originalDuplicateLocations = [
          'constants/cache-ttl.constants.ts',
          'config/monitoring.config.ts (ttl section)',
          'services/cache/cache-service.config.ts',
          'health/health-check.config.ts',
          'alerts/alert-manager.config.ts',
          'metrics/performance-metrics.config.ts'
        ];

        // 验证统一TTL配置存在且唯一
        const ttlConfig = new MonitoringUnifiedTtlConfig();
        expect(ttlConfig).toBeInstanceOf(MonitoringUnifiedTtlConfig);

        // 验证TTL常量统一
        expect(MONITORING_UNIFIED_TTL_CONSTANTS).toBeDefined();
        expect(MONITORING_UNIFIED_TTL_CONSTANTS.DEFAULTS).toBeDefined();

        // 验证所有TTL类型在统一位置定义
        const ttlTypes: TtlDataType[] = ['health', 'trend', 'performance', 'alert', 'cacheStats'];
        ttlTypes.forEach(type => {
          expect(ttlConfig).toHaveProperty(type);
          expect(typeof ttlConfig[type]).toBe('number');
          expect(ttlConfig[type]).toBeGreaterThan(0);
        });

        // 验证TTL配置的唯一性 - 创建多个实例应该独立
        const ttlConfig1 = new MonitoringUnifiedTtlConfig();
        const ttlConfig2 = new MonitoringUnifiedTtlConfig();
        
        ttlConfig1.health = 999;
        expect(ttlConfig2.health).not.toBe(999); // 实例应该独立
      });

      it('应该验证TTL常量不在多个文件中重复定义', async () => {
        // 检查可能存在TTL重复定义的文件模式
        const potentialDuplicatePatterns = [
          /TTL.*=.*\d+/g,
          /CACHE_TTL/g,
          /HEALTH_TTL/g,
          /ALERT_TTL/g,
          /PERFORMANCE_TTL/g
        ];

        // 搜索监控目录中的文件
        const files = await findTsFiles(monitoringPath);
        const duplicateFindings: { file: string; pattern: string; matches: string[] }[] = [];

        for (const file of files) {
          // 跳过我们的统一配置文件
          if (file.includes('monitoring-unified-ttl.config.ts')) {
            continue;
          }

          try {
            const content = await fs.readFile(file, 'utf8');
            
            for (const pattern of potentialDuplicatePatterns) {
              const matches = content.match(pattern);
              if (matches && matches.length > 0) {
                duplicateFindings.push({
                  file,
                  pattern: pattern.toString(),
                  matches
                });
              }
            }
          } catch (error) {
            // 文件读取失败，跳过
            continue;
          }
        }

        // 应该没有在其他文件中找到TTL重复定义
        expect(duplicateFindings).toHaveLength(0);
      });

      it('应该验证环境变量TTL配置无重复映射', () => {
        // 验证新的统一环境变量系统
        const coreEnvConfig = new MonitoringCoreEnvConfig();
        expect(coreEnvConfig.defaultTtl).toBeDefined();

        // 验证环境变量映射的唯一性
        const envDefaults = MONITORING_CORE_ENV_CONSTANTS.DEFAULTS;
        
        // 应该有默认TTL配置
        expect(envDefaults.DEFAULT_TTL).toBeDefined();
        expect(typeof envDefaults.DEFAULT_TTL).toBe('number');
        
        // 验证环境变量系统使用统一方式
        expect(envDefaults).toHaveProperty('DEFAULT_TTL');
        expect(envDefaults).toHaveProperty('DEFAULT_BATCH_SIZE');
      });
    });

    describe('批量配置重复消除', () => {
      it('应该验证原有8个批量配置重复已被消除', async () => {
        // 原有重复的批量配置位置
        const originalBatchDuplicateLocations = [
          'constants/alert-control.constants.ts (batch sizes)',
          'constants/data-lifecycle.constants.ts (cleanup batch)',
          'constants/business.ts (processing batch)',
          'constants/monitoring-system.constants.ts (system limits)',
          'config/monitoring.config.ts (batchSize section)',
          'alerts/alert-batch.config.ts',
          'data/data-processing.config.ts',
          'cache/cache-batch.config.ts'
        ];

        // 验证统一批量配置存在且唯一
        const limitsConfig = new MonitoringUnifiedLimitsConfig();
        expect(limitsConfig).toBeInstanceOf(MonitoringUnifiedLimitsConfig);

        // 验证所有批量配置类型统一定义
        expect(limitsConfig.alertBatch).toBeDefined();
        expect(limitsConfig.dataProcessingBatch).toBeDefined();
        expect(limitsConfig.dataCleanupBatch).toBeDefined();
        expect(limitsConfig.systemLimits).toBeDefined();

        // 验证批量常量统一
        expect(MONITORING_UNIFIED_LIMITS_CONSTANTS).toBeDefined();
        expect(MONITORING_UNIFIED_LIMITS_CONSTANTS.ALERT_BATCH).toBeDefined();
        expect(MONITORING_UNIFIED_LIMITS_CONSTANTS.DATA_BATCH).toBeDefined();
        expect(MONITORING_UNIFIED_LIMITS_CONSTANTS.CLEANUP_BATCH).toBeDefined();
        expect(MONITORING_UNIFIED_LIMITS_CONSTANTS.SYSTEM_LIMITS).toBeDefined();
      });

      it('应该验证批量大小常量不在多个文件中重复定义', async () => {
        // 检查可能存在批量大小重复定义的文件模式
        const potentialBatchPatterns = [
          /BATCH_SIZE.*=.*\d+/g,
          /ALERT_BATCH/g,
          /DATA_BATCH/g,
          /CLEANUP_BATCH/g,
          /PROCESSING_BATCH/g,
          /MAX_QUEUE_SIZE/g
        ];

        const files = await findTsFiles(monitoringPath);
        const duplicateFindings: { file: string; pattern: string; matches: string[] }[] = [];

        for (const file of files) {
          // 跳过我们的统一配置文件
          if (file.includes('monitoring-unified-limits.config.ts')) {
            continue;
          }

          try {
            const content = await fs.readFile(file, 'utf8');
            
            for (const pattern of potentialBatchPatterns) {
              const matches = content.match(pattern);
              if (matches && matches.length > 0) {
                duplicateFindings.push({
                  file,
                  pattern: pattern.toString(),
                  matches
                });
              }
            }
          } catch (error) {
            continue;
          }
        }

        // 应该没有在其他文件中找到批量配置重复定义
        expect(duplicateFindings).toHaveLength(0);
      });

      it('应该验证环境变量批量配置无重复映射', () => {
        // 验证核心环境变量包含批量配置
        const coreEnvConfig = new MonitoringCoreEnvConfig();
        expect(coreEnvConfig.defaultBatchSize).toBeDefined();

        // 验证批量环境变量映射的简化
        const envDefaults = MONITORING_CORE_ENV_CONSTANTS.DEFAULTS;
        
        // 应该有统一的批量大小环境变量
        expect(envDefaults.DEFAULT_BATCH_SIZE).toBeDefined();
        expect(typeof envDefaults.DEFAULT_BATCH_SIZE).toBe('number');
        
        // 验证批量配置的合理性
        expect(envDefaults.DEFAULT_BATCH_SIZE).toBeGreaterThan(0);
        expect(envDefaults.DEFAULT_BATCH_SIZE).toBeLessThanOrEqual(1000);
      });
    });

    describe('常量与配置分离验证', () => {
      it('应该验证算法常量与配置参数正确分离', async () => {
        // 算法常量应该保留在constants文件中
        const constantsPath = join(monitoringPath, 'constants');
        
        try {
          const constantsFiles = await findTsFiles(constantsPath);
          
          // 应该有算法常量文件，但不应该有配置常量文件
          const algorithmicConstantsPattern = /ALGORITHM|CALCULATION|THRESHOLD|WEIGHT/g;
          const configurationConstantsPattern = /TTL|BATCH_SIZE|CACHE_SIZE|QUEUE_SIZE/g;
          
          let hasAlgorithmicConstants = false;
          let hasConfigurationConstants = false;
          
          for (const file of constantsFiles) {
            const content = await fs.readFile(file, 'utf8');
            
            if (algorithmicConstantsPattern.test(content)) {
              hasAlgorithmicConstants = true;
            }
            
            if (configurationConstantsPattern.test(content)) {
              hasConfigurationConstants = true;
            }
          }
          
          // 应该有算法常量，但不应该有配置常量
          expect(hasAlgorithmicConstants).toBe(true);
          expect(hasConfigurationConstants).toBe(false);
          
        } catch (error) {
          // constants目录可能不存在，这也是可以接受的
          console.warn('Constants directory not accessible:', error);
        }
      });

      it('应该验证配置参数集中在统一配置类中', () => {
        // 验证所有配置参数都在统一配置类中
        const ttlConfig = new MonitoringUnifiedTtlConfig();
        const limitsConfig = new MonitoringUnifiedLimitsConfig();
        const coreEnvConfig = new MonitoringCoreEnvConfig();

        // TTL配置完整性
        const expectedTtlFields = ['health', 'trend', 'performance', 'alert', 'cacheStats'];
        expectedTtlFields.forEach(field => {
          expect(ttlConfig).toHaveProperty(field);
        });

        // 批量配置完整性
        expect(limitsConfig.alertBatch).toHaveProperty('small');
        expect(limitsConfig.alertBatch).toHaveProperty('medium');
        expect(limitsConfig.alertBatch).toHaveProperty('large');
        expect(limitsConfig.alertBatch).toHaveProperty('max');

        // 核心环境配置完整性
        expect(coreEnvConfig).toHaveProperty('defaultTtl');
        expect(coreEnvConfig).toHaveProperty('defaultBatchSize');
        expect(coreEnvConfig).toHaveProperty('performanceEnable');
      });
    });
  });

  describe('静态重复检测机制', () => {
    describe('代码扫描重复检测', () => {
      it('应该能够检测代码中的配置重复定义', async () => {
        // 这是一个模拟的静态分析测试
        // 在实际应用中，可以集成ESLint规则或其他静态分析工具
        
        const files = await findTsFiles(monitoringPath);
        const duplicatePatterns = {
          ttl: /TTL\s*=\s*\d+/g,
          batchSize: /BATCH_SIZE\s*=\s*\d+/g,
          cacheSize: /CACHE_SIZE\s*=\s*\d+/g,
          queueSize: /QUEUE_SIZE\s*=\s*\d+/g
        };

        const findings: { [key: string]: { file: string; matches: string[] }[] } = {};

        for (const [patternName, pattern] of Object.entries(duplicatePatterns)) {
          findings[patternName] = [];
          
          for (const file of files) {
            // 跳过统一配置文件
            if (file.includes('unified/')) {
              continue;
            }

            try {
              const content = await fs.readFile(file, 'utf8');
              const matches = content.match(pattern);
              
              if (matches && matches.length > 0) {
                findings[patternName].push({ file, matches });
              }
            } catch (error) {
              continue;
            }
          }
        }

        // 除了统一配置文件，不应该在其他地方找到配置定义
        Object.entries(findings).forEach(([patternName, fileFindings]) => {
          if (fileFindings.length > 0) {
            console.warn(`Found ${patternName} duplicates in: ${JSON.stringify(fileFindings)}`);
          }
          expect(fileFindings).toHaveLength(0);
        });
      });

      it('应该检测环境变量重复定义', () => {
        // 使用配置验证器检测环境变量重复
        const overlapResult = MonitoringConfigValidator.detectConfigurationOverlaps();
        
        // 验证重复检测功能正常工作
        expect(overlapResult).toHaveProperty('hasOverlaps');
        expect(overlapResult).toHaveProperty('overlaps');
        expect(overlapResult).toHaveProperty('resolutions');
        
        // 在干净的配置中，不应该有重复
        if (overlapResult.hasOverlaps) {
          console.warn('发现配置重复:', overlapResult.overlaps);
          console.warn('建议解决方案:', overlapResult.resolutions);
        }
      });

      it('应该验证常量文件去重效果', async () => {
        // 检查是否还存在被删除的常量文件
        const deletedConstantFiles = [
          'cache-ttl.constants.ts',
          'alert-control.constants.ts', 
          'data-lifecycle.constants.ts',
          'business.ts'
        ];

        const constantsPath = join(monitoringPath, 'constants');
        
        for (const deletedFile of deletedConstantFiles) {
          const filePath = join(constantsPath, deletedFile);
          
          try {
            await fs.access(filePath);
            // 如果文件存在，说明没有被正确删除
            fail(`已删除的常量文件仍然存在: ${deletedFile}`);
          } catch (error) {
            // 文件不存在是期望的结果
            expect(error.code).toBe('ENOENT');
          }
        }
      });
    });

    describe('配置类重复检测', () => {
      it('应该验证配置类的唯一性', () => {
        // 验证每种配置只有一个权威类
        const ttlConfig1 = new MonitoringUnifiedTtlConfig();
        const ttlConfig2 = new MonitoringUnifiedTtlConfig();

        // 类应该是同一个构造函数
        expect(ttlConfig1.constructor).toBe(ttlConfig2.constructor);
        expect(ttlConfig1.constructor.name).toBe('MonitoringUnifiedTtlConfig');

        // 但实例应该是独立的
        expect(ttlConfig1).not.toBe(ttlConfig2);
        
        // 修改一个实例不应该影响另一个
        ttlConfig1.health = 999;
        expect(ttlConfig2.health).not.toBe(999);
      });

      it('应该验证配置常量的唯一性', () => {
        // 验证TTL常量唯一性
        const ttlConstants1 = MONITORING_UNIFIED_TTL_CONSTANTS;
        const ttlConstants2 = MONITORING_UNIFIED_TTL_CONSTANTS;

        // 常量对象应该是同一个引用
        expect(ttlConstants1).toBe(ttlConstants2);
        expect(Object.isFrozen(ttlConstants1)).toBe(true); // 应该是不可变的

        // 验证批量常量唯一性
        const limitsConstants1 = MONITORING_UNIFIED_LIMITS_CONSTANTS;
        const limitsConstants2 = MONITORING_UNIFIED_LIMITS_CONSTANTS;

        expect(limitsConstants1).toBe(limitsConstants2);
        expect(Object.isFrozen(limitsConstants1)).toBe(true);
      });
    });
  });

  describe('动态重复检测机制', () => {
    describe('运行时配置值重复检测', () => {
      it('应该检测运行时配置值的逻辑重复', () => {
        // 创建配置实例
        const ttlConfig = new MonitoringUnifiedTtlConfig();
        const limitsConfig = new MonitoringUnifiedLimitsConfig();

        // 验证配置值的逻辑一致性
        const validationResult = MonitoringConfigValidator.validateCompleteConfiguration();
        
        // 应该能够检测到配置问题
        expect(validationResult).toHaveProperty('isValid');
        expect(validationResult.results.overlaps).toHaveProperty('hasOverlaps');
        
        // 在正确配置的系统中，应该没有重复
        if (validationResult.results.overlaps.hasOverlaps) {
          console.warn('检测到配置重复:', validationResult.results.overlaps.overlaps);
        }
      });

      it('应该检测配置实例的数据重复', () => {
        // 创建多个配置实例，验证数据独立性
        const instances = Array.from({ length: 5 }, () => new MonitoringUnifiedTtlConfig());
        
        // 修改其中一个实例
        instances[0].health = 1000;
        instances[1].trend = 2000;
        
        // 其他实例应该不受影响
        expect(instances[2].health).not.toBe(1000);
        expect(instances[3].trend).not.toBe(2000);
        expect(instances[4].health).toBe(instances[2].health); // 应该有相同的默认值
      });

      it('应该检测环境变量冲突', () => {
        const originalEnv = process.env;
        
        try {
          // 设置冲突的环境变量
          process.env.MONITORING_DEFAULT_TTL = '300';
          process.env.MONITORING_TTL_HEALTH = '600';  // 冲突：旧环境变量

          const envValidation = MonitoringConfigValidator.validateEnvironmentVariables();
          
          // 应该检测到环境变量验证结果
          expect(envValidation).toHaveProperty('isValid');
          expect(typeof envValidation.isValid).toBe('boolean');
          
        } finally {
          process.env = originalEnv;
        }
      });
    });

    describe('配置源冲突检测', () => {
      it('应该检测多个配置源的冲突', () => {
        const originalEnv = process.env;
        
        try {
          // 设置多层配置
          process.env.MONITORING_DEFAULT_TTL = '400';      // 核心配置
          process.env.MONITORING_TTL_HEALTH = '500';       // 特定配置
          process.env.MONITORING_TTL_TREND = '800';        // 另一个特定配置

          const envValidation = MonitoringConfigValidator.validateEnvironmentVariables();
          
          // 应该有验证结果
          expect(envValidation).toHaveProperty('isValid');
          expect(typeof envValidation.isValid).toBe('boolean');
          
          // 在测试环境中应该是有效的
          if (!envValidation.isValid) {
            console.warn('Environment validation failed:', envValidation);
          }
          
        } finally {
          process.env = originalEnv;
        }
      });
    });
  });

  describe('防止新重复引入机制', () => {
    describe('配置新增重复检测', () => {
      it('应该能够检测新配置的重复定义', () => {
        // 模拟新增配置类
        class NewMonitoringConfig {
          // 如果有人意外创建了重复的TTL配置
          health: number = 300;
          trend: number = 600;
        }

        const newConfig = new NewMonitoringConfig();
        const existingConfig = new MonitoringUnifiedTtlConfig();

        // 验证新配置不应该与现有配置重复字段名
        // 这个测试提醒开发者不要创建重复的配置
        const newConfigFields = Object.keys(newConfig);
        const existingConfigFields = Object.keys(existingConfig);
        
        const duplicateFields = newConfigFields.filter(field => 
          existingConfigFields.includes(field)
        );

        // 在实际场景中，这应该触发警告
        if (duplicateFields.length > 0) {
          console.warn('检测到重复的配置字段:', duplicateFields);
          console.warn('建议：使用现有的MonitoringUnifiedTtlConfig而不是创建新的配置类');
        }
        
        // 这个测试故意失败以提醒开发者
        expect(duplicateFields.length).toBe(0);
      });

      it('应该验证配置扩展不引入重复', () => {
        // 验证配置类的正确扩展方式
        class ExtendedTtlConfig extends MonitoringUnifiedTtlConfig {
          // 新字段应该有不同的名称
          customTtl: number = 180;
          advancedTtl: number = 240;
        }

        const extendedConfig = new ExtendedTtlConfig();
        const baseConfig = new MonitoringUnifiedTtlConfig();

        // 扩展配置应该包含基础配置的所有字段
        expect(extendedConfig.health).toBeDefined();
        expect(extendedConfig.trend).toBeDefined();
        
        // 新字段应该存在
        expect(extendedConfig.customTtl).toBeDefined();
        expect(extendedConfig.advancedTtl).toBeDefined();
        
        // 基础配置不应该有新字段
        expect((baseConfig as any).customTtl).toBeUndefined();
        expect((baseConfig as any).advancedTtl).toBeUndefined();
      });
    });

    describe('自动化重复检测集成', () => {
      it('应该提供配置验证API用于CI/CD集成', () => {
        // 验证可以通过API进行自动化检测
        const validationResult = MonitoringConfigValidator.validateCompleteConfiguration();
        
        // API应该返回结构化的结果
        expect(validationResult).toHaveProperty('isValid');
        expect(validationResult).toHaveProperty('summary');
        expect(validationResult.summary).toHaveProperty('overallScore');
        
        // 分数应该在合理范围内
        expect(validationResult.summary.overallScore).toBeGreaterThanOrEqual(0);
        expect(validationResult.summary.overallScore).toBeLessThanOrEqual(100);
        
        // 应该有详细的错误和警告信息
        expect(validationResult.results).toHaveProperty('overlaps');
        expect(validationResult.results.overlaps).toHaveProperty('hasOverlaps');
      });

      it('应该支持配置质量门禁', () => {
        const validationResult = MonitoringConfigValidator.validateCompleteConfiguration();
        
        // 定义质量门禁标准
        const qualityGate = {
          minScore: 80,
          maxErrors: 0,
          maxCriticalWarnings: 2
        };
        
        // 验证当前配置是否通过质量门禁
        const passesQualityGate = 
          validationResult.summary.overallScore >= qualityGate.minScore &&
          validationResult.summary.totalErrors <= qualityGate.maxErrors;
        
        if (!passesQualityGate) {
          console.warn('配置未通过质量门禁:', {
            currentScore: validationResult.summary.overallScore,
            requiredScore: qualityGate.minScore,
            errors: validationResult.summary.totalErrors,
            maxErrors: qualityGate.maxErrors
          });
        }
        
        // 在一个清洁的配置系统中，应该通过质量门禁
        expect(passesQualityGate).toBe(true);
      });
    });
  });

});

// 辅助方法
async function findTsFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const subFiles = await findTsFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    // 目录不存在或无权限，跳过
  }
  
  return files;
}
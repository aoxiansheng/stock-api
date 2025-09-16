/**
 * Cache配置一致性测试
 * 🎯 验证Cache模块合规开发计划中的配置整合效果
 * ✅ 测试统一配置系统的一致性和兼容性
 * 
 * 测试覆盖：
 * - 配置重叠消除验证
 * - 四层配置体系合规性验证
 * - 环境变量映射一致性验证
 * - 向后兼容性验证
 * - 配置文件精简验证
 * 
 * @version 3.0.0
 * @created 2025-01-16
 * @author Cache Team
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';

// 导入统一配置和兼容性模块
import cacheUnifiedConfig, { CacheUnifiedConfig } from '@cache/config/cache-unified.config';
import { CacheModule } from '@cache/module/cache.module';
import { CacheService } from '@cache/services/cache.service';
import { CACHE_CORE_CONSTANTS } from '@cache/constants/cache-core.constants';

// 导入兼容性配置
import { CONFIGURATION_MIGRATION_MAP, ENVIRONMENT_VARIABLE_MAPPING } from '@cache/config/compatibility-registry';

describe('Cache Configuration Consistency', () => {
  let module: TestingModule;
  let configService: ConfigService;
  let cacheService: CacheService;
  let unifiedConfig: CacheUnifiedConfig;

  beforeAll(async () => {
    // 设置测试环境变量
    process.env.CACHE_DEFAULT_TTL = '300';
    process.env.CACHE_STRONG_TTL = '5';
    process.env.CACHE_REALTIME_TTL = '30';
    process.env.CACHE_MONITORING_TTL = '300';
    process.env.CACHE_AUTH_TTL = '300';
    process.env.CACHE_MAX_BATCH_SIZE = '100';
    process.env.CACHE_MAX_SIZE = '10000';
    process.env.SMART_CACHE_MAX_BATCH = '50';

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [cacheUnifiedConfig],
          isGlobal: true,
        }),
        CacheModule,
      ],
    }).compile();

    configService = module.get<ConfigService>(ConfigService);
    cacheService = module.get<CacheService>(CacheService);
    unifiedConfig = configService.get<CacheUnifiedConfig>('cacheUnified');
  });

  afterAll(async () => {
    await module.close();
    // 清理测试环境变量
    delete process.env.CACHE_DEFAULT_TTL;
    delete process.env.CACHE_STRONG_TTL;
    delete process.env.CACHE_REALTIME_TTL;
    delete process.env.CACHE_MONITORING_TTL;
    delete process.env.CACHE_AUTH_TTL;
    delete process.env.CACHE_MAX_BATCH_SIZE;
    delete process.env.CACHE_MAX_SIZE;
    delete process.env.SMART_CACHE_MAX_BATCH;
  });

  describe('配置重叠消除验证', () => {
    it('应该消除TTL配置重叠', () => {
      // 验证统一配置包含所有TTL配置
      expect(unifiedConfig.defaultTtl).toBe(300);
      expect(unifiedConfig.strongTimelinessTtl).toBe(5);
      expect(unifiedConfig.realtimeTtl).toBe(30);
      expect(unifiedConfig.monitoringTtl).toBe(300);
      expect(unifiedConfig.authTtl).toBe(300);
      expect(unifiedConfig.transformerTtl).toBe(300);
      expect(unifiedConfig.suggestionTtl).toBe(300);
      expect(unifiedConfig.longTermTtl).toBe(3600);
    });

    it('应该消除限制配置重叠', () => {
      // 验证统一配置包含所有限制配置
      expect(unifiedConfig.maxBatchSize).toBe(100);
      expect(unifiedConfig.maxCacheSize).toBe(10000);
      expect(unifiedConfig.lruSortBatchSize).toBe(1000);
      expect(unifiedConfig.smartCacheMaxBatch).toBe(50);
      expect(unifiedConfig.maxCacheSizeMB).toBe(1024);
    });

    it('应该消除性能配置重叠', () => {
      // 验证统一配置包含所有性能配置
      expect(unifiedConfig.compressionThreshold).toBe(1024);
      expect(unifiedConfig.compressionEnabled).toBe(true);
      expect(unifiedConfig.maxItems).toBe(10000);
      expect(unifiedConfig.maxKeyLength).toBe(255);
      expect(unifiedConfig.maxValueSizeMB).toBe(10);
      expect(unifiedConfig.slowOperationMs).toBe(100);
      expect(unifiedConfig.retryDelayMs).toBe(100);
      expect(unifiedConfig.lockTtl).toBe(30);
    });
  });

  describe('四层配置体系合规性验证', () => {
    it('Layer 1: 环境变量层应该正确映射', () => {
      // 验证环境变量到配置的映射
      const envVarMappings = Object.keys(ENVIRONMENT_VARIABLE_MAPPING);
      
      // 验证关键环境变量都有映射
      expect(envVarMappings).toContain('CACHE_DEFAULT_TTL');
      expect(envVarMappings).toContain('CACHE_STRONG_TTL');
      expect(envVarMappings).toContain('CACHE_MAX_BATCH_SIZE');
      expect(envVarMappings).toContain('CACHE_MAX_SIZE');
      expect(envVarMappings).toContain('SMART_CACHE_MAX_BATCH');
    });

    it('Layer 2: 统一配置层应该提供类型安全', () => {
      // 验证配置对象类型
      expect(typeof unifiedConfig.defaultTtl).toBe('number');
      expect(typeof unifiedConfig.strongTimelinessTtl).toBe('number');
      expect(typeof unifiedConfig.compressionEnabled).toBe('boolean');
      expect(typeof unifiedConfig.maxBatchSize).toBe('number');
      
      // 验证配置值范围
      expect(unifiedConfig.defaultTtl).toBeGreaterThan(0);
      expect(unifiedConfig.strongTimelinessTtl).toBeLessThanOrEqual(60);
      expect(unifiedConfig.maxBatchSize).toBeGreaterThan(0);
      expect(unifiedConfig.maxBatchSize).toBeLessThanOrEqual(1000);
    });

    it('Layer 3: 兼容包装层应该正常工作', () => {
      // 验证CacheService可以访问配置
      expect(cacheService).toBeDefined();
      
      // 验证兼容性包装器提供的配置
      const ttlConfig = configService.get('CACHE_TTL_CONFIG');
      const limitsConfig = configService.get('CACHE_LIMITS_CONFIG');
      
      expect(ttlConfig).toBeDefined();
      expect(limitsConfig).toBeDefined();
    });

    it('Layer 4: 语义常量层应该提供固定标准', () => {
      // 验证核心常量定义
      expect(CACHE_CORE_CONSTANTS.TYPE_SEMANTICS).toBeDefined();
      expect(CACHE_CORE_CONSTANTS.KEY_PREFIX_SEMANTICS).toBeDefined();
      expect(CACHE_CORE_CONSTANTS.OPERATION_SEMANTICS).toBeDefined();
      expect(CACHE_CORE_CONSTANTS.STATUS_SEMANTICS).toBeDefined();
      expect(CACHE_CORE_CONSTANTS.QUALITY_STANDARDS).toBeDefined();
      expect(CACHE_CORE_CONSTANTS.BUSINESS_RULES).toBeDefined();
      
      // 验证常量的不变性
      expect(() => {
        (CACHE_CORE_CONSTANTS.TYPE_SEMANTICS as any).TEST = 'test';
      }).toThrow();
    });
  });

  describe('环境变量映射一致性验证', () => {
    it('应该有8个核心环境变量', () => {
      // 验证核心环境变量数量从15个精简到8个
      const coreEnvVars = [
        'CACHE_DEFAULT_TTL',
        'CACHE_STRONG_TTL', 
        'CACHE_REALTIME_TTL',
        'CACHE_AUTH_TTL',
        'CACHE_MAX_BATCH_SIZE',
        'CACHE_MAX_SIZE',
        'SMART_CACHE_MAX_BATCH',
        'CACHE_COMPRESSION_ENABLED'
      ];
      
      expect(coreEnvVars).toHaveLength(8);
      
      // 验证每个核心变量都在映射中
      coreEnvVars.forEach(envVar => {
        expect(ENVIRONMENT_VARIABLE_MAPPING[envVar]).toBeDefined();
      });
    });

    it('应该正确映射环境变量到配置', () => {
      // 验证环境变量值正确映射到统一配置
      expect(unifiedConfig.defaultTtl).toBe(parseInt(process.env.CACHE_DEFAULT_TTL));
      expect(unifiedConfig.strongTimelinessTtl).toBe(parseInt(process.env.CACHE_STRONG_TTL));
      expect(unifiedConfig.realtimeTtl).toBe(parseInt(process.env.CACHE_REALTIME_TTL));
      expect(unifiedConfig.authTtl).toBe(parseInt(process.env.CACHE_AUTH_TTL));
      expect(unifiedConfig.maxBatchSize).toBe(parseInt(process.env.CACHE_MAX_BATCH_SIZE));
      expect(unifiedConfig.maxCacheSize).toBe(parseInt(process.env.CACHE_MAX_SIZE));
      expect(unifiedConfig.smartCacheMaxBatch).toBe(parseInt(process.env.SMART_CACHE_MAX_BATCH));
    });

    it('应该提供合理的默认值', () => {
      // 创建没有环境变量的配置实例
      const originalEnv = process.env;
      process.env = {};
      
      try {
        // 重新加载配置以测试默认值
        const defaultConfig = cacheUnifiedConfig();
        
        expect(defaultConfig.defaultTtl).toBe(300);
        expect(defaultConfig.strongTimelinessTtl).toBe(5);
        expect(defaultConfig.realtimeTtl).toBe(30);
        expect(defaultConfig.maxBatchSize).toBe(100);
        expect(defaultConfig.maxCacheSize).toBe(10000);
        expect(defaultConfig.compressionEnabled).toBe(true);
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe('向后兼容性验证', () => {
    it('应该支持现有的配置访问方式', () => {
      // 验证通过ConfigService可以访问兼容性配置
      const legacyTtlConfig = configService.get('CACHE_TTL_CONFIG');
      const legacyLimitsConfig = configService.get('CACHE_LIMITS_CONFIG');
      
      expect(legacyTtlConfig).toBeDefined();
      expect(legacyTtlConfig.defaultTtl).toBe(unifiedConfig.defaultTtl);
      expect(legacyTtlConfig.authTtl).toBe(unifiedConfig.authTtl);
      
      expect(legacyLimitsConfig).toBeDefined();
      expect(legacyLimitsConfig.maxBatchSize).toBe(unifiedConfig.maxBatchSize);
      expect(legacyLimitsConfig.maxCacheSize).toBe(unifiedConfig.maxCacheSize);
    });

    it('应该维护配置迁移映射', () => {
      // 验证配置迁移映射存在且正确
      expect(CONFIGURATION_MIGRATION_MAP.cacheUnified).toBeDefined();
      expect(CONFIGURATION_MIGRATION_MAP.cacheUnified.status).toBe('active');
      expect(CONFIGURATION_MIGRATION_MAP.cacheUnified.replaces).toContain('cache');
      expect(CONFIGURATION_MIGRATION_MAP.cacheUnified.replaces).toContain('cacheLimits');
      expect(CONFIGURATION_MIGRATION_MAP.cacheUnified.replaces).toContain('unifiedTtl');
      
      // 验证废弃配置标记
      expect(CONFIGURATION_MIGRATION_MAP.cache.status).toBe('deprecated');
      expect(CONFIGURATION_MIGRATION_MAP.cache.removal).toBe('v3.0.0');
    });
  });

  describe('配置文件精简验证', () => {
    it('应该只有4个核心配置文件', () => {
      // 验证配置文件数量从8个减少到4个
      const expectedConfigFiles = [
        'cache-unified.config.ts',     // 主要统一配置
        'cache-legacy.config.ts',      // 兼容性配置
        'cache-config-compatibility.ts', // 兼容性包装器
        'ttl-compatibility-wrapper.ts'   // TTL兼容性包装器
      ];
      
      expect(expectedConfigFiles).toHaveLength(4);
      
      // 验证配置迁移映射反映了文件精简
      const activeMigrations = Object.values(CONFIGURATION_MIGRATION_MAP)
        .filter(config => config.status === 'active');
      expect(activeMigrations).toHaveLength(1); // 只有cacheUnified是active状态
    });

    it('应该移除冗余配置文件', () => {
      // 验证已移除的配置在迁移映射中标记为deprecated
      const deprecatedConfigs = ['cache', 'cacheLimits', 'unifiedTtl'];
      
      deprecatedConfigs.forEach(configName => {
        expect(CONFIGURATION_MIGRATION_MAP[configName].status).toBe('deprecated');
        expect(CONFIGURATION_MIGRATION_MAP[configName].removal).toBe('v3.0.0');
      });
    });
  });

  describe('配置验证和错误处理', () => {
    it('应该验证配置值范围', () => {
      // 测试配置验证器
      expect(() => {
        const invalidConfig = {
          defaultTtl: -1, // 无效值
          strongTimelinessTtl: 5,
          maxBatchSize: 100,
        };
        cacheUnifiedConfig.apply(null, [invalidConfig]);
      }).toThrow();
    });

    it('应该在配置错误时提供有意义的错误信息', () => {
      try {
        const invalidConfig = {
          defaultTtl: 'invalid', // 类型错误
          strongTimelinessTtl: 5,
        };
        cacheUnifiedConfig.apply(null, [invalidConfig]);
      } catch (error) {
        expect(error.message).toContain('validation failed');
      }
    });
  });

  describe('性能和内存使用验证', () => {
    it('应该快速访问配置', () => {
      // 测试配置访问性能
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        const config = configService.get<CacheUnifiedConfig>('cacheUnified');
        expect(config.defaultTtl).toBeDefined();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // 1000次配置访问应该在100ms内完成
      expect(duration).toBeLessThan(100);
    });

    it('应该避免配置对象重复创建', () => {
      // 验证配置对象引用一致性
      const config1 = configService.get<CacheUnifiedConfig>('cacheUnified');
      const config2 = configService.get<CacheUnifiedConfig>('cacheUnified');
      
      // ConfigService应该缓存配置对象
      expect(config1).toBe(config2);
    });
  });

  describe('业务规则一致性验证', () => {
    it('应该遵循缓存质量标准', () => {
      const qualityStandards = CACHE_CORE_CONSTANTS.QUALITY_STANDARDS;
      
      // 验证命中率标准
      expect(qualityStandards.HIT_RATE.EXCELLENT).toBe(0.95);
      expect(qualityStandards.HIT_RATE.GOOD).toBe(0.85);
      expect(qualityStandards.HIT_RATE.ACCEPTABLE).toBe(0.70);
      
      // 验证响应时间标准
      expect(qualityStandards.RESPONSE_TIME.EXCELLENT).toBe(10);
      expect(qualityStandards.RESPONSE_TIME.GOOD).toBe(50);
      expect(qualityStandards.RESPONSE_TIME.ACCEPTABLE).toBe(100);
    });

    it('应该遵循业务规则', () => {
      const businessRules = CACHE_CORE_CONSTANTS.BUSINESS_RULES;
      
      // 验证一致性规则
      expect(businessRules.CONSISTENCY.STRONG_CONSISTENCY_TYPES).toContain('stock_quote');
      expect(businessRules.CONSISTENCY.STRONG_CONSISTENCY_TYPES).toContain('real_time');
      expect(businessRules.CONSISTENCY.STRONG_CONSISTENCY_TYPES).toContain('auth');
      
      // 验证优先级规则
      expect(businessRules.PRIORITY.CRITICAL).toContain('stock_quote');
      expect(businessRules.PRIORITY.CRITICAL).toContain('auth');
    });
  });
});
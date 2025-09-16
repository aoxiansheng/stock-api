/**
 * Cache配置兼容性注册中心
 * 🎯 统一管理所有配置的向后兼容性映射
 * ✅ 确保现有代码100%兼容，零破坏性更改
 * 
 * 迁移路径：
 * 1. Phase 1: 同时支持新旧配置（当前阶段）
 * 2. Phase 2: 逐步迁移服务到新配置（v2.1-v2.9）
 * 3. Phase 3: 完全移除旧配置（v3.0）
 */

import { ConfigModule } from '@nestjs/config';
import { Module, Provider } from '@nestjs/common';

// 导入统一配置
import cacheUnifiedConfig from './cache-unified.config';

// 导入兼容性配置提供者
import cacheConfig from './cache-legacy.config';
import unifiedTtlConfig from './unified-ttl.config';

// 导入兼容性包装器
import { CacheConfigCompatibilityWrapper } from './cache-config-compatibility';
import { TtlCompatibilityWrapper } from './ttl-compatibility-wrapper';

/**
 * 配置映射关系文档
 */
export const CONFIGURATION_MIGRATION_MAP = {
  // 主要配置迁移
  'cacheUnified': {
    description: '🆕 统一配置 - 推荐使用',
    source: 'cache-unified.config.ts',
    replaces: ['cache', 'cacheLimits', 'unifiedTtl'],
    status: 'active'
  },
  
  // 兼容性配置
  'cache': {
    description: '🔄 基础配置 - 兼容模式',
    source: 'cache.config.ts',
    status: 'deprecated',
    migration: 'Use cacheUnified config for new code',
    removal: 'v3.0.0'
  },
  
  'cacheLimits': {
    description: '🔄 限制配置 - 兼容模式',
    source: 'cache-limits.config.ts',
    status: 'deprecated',
    migration: 'Use cacheUnified config for new code',
    removal: 'v3.0.0'
  },
  
  'unifiedTtl': {
    description: '🔄 TTL配置 - 兼容模式',
    source: 'unified-ttl.config.ts → ttl-compatibility-wrapper.ts',
    status: 'deprecated',
    migration: 'Use cacheUnified config for new code',
    removal: 'v3.0.0'
  }
} as const;

/**
 * Cache配置兼容性模块
 * 🎯 提供所有Cache相关配置的统一注册和兼容性支持
 */
@Module({
  imports: [
    ConfigModule.forFeature(cacheUnifiedConfig),     // 🆕 主要配置
    ConfigModule.forFeature(cacheConfig),            // 🔄 兼容性配置
    ConfigModule.forFeature(unifiedTtlConfig),       // 🔄 TTL兼容性配置
  ],
  providers: [
    // 兼容性包装器服务
    CacheConfigCompatibilityWrapper,
    TtlCompatibilityWrapper,
    
    // 配置迁移信息提供者
    {
      provide: 'CACHE_CONFIG_MIGRATION_MAP',
      useValue: CONFIGURATION_MIGRATION_MAP,
    },
  ],
  exports: [
    CacheConfigCompatibilityWrapper,
    TtlCompatibilityWrapper,
    'CACHE_CONFIG_MIGRATION_MAP',
  ],
})
export class CacheConfigCompatibilityModule {}

/**
 * 环境变量映射指南
 * 🎯 帮助开发者了解新旧环境变量的对应关系
 */
export const ENVIRONMENT_VARIABLE_MAPPING = {
  // TTL配置
  'CACHE_DEFAULT_TTL': {
    newVar: 'CACHE_DEFAULT_TTL',
    description: '默认缓存TTL（秒）',
    default: 300,
    usedBy: ['cacheUnified', 'cache', 'unifiedTtl']
  },
  'CACHE_STRONG_TTL': {
    newVar: 'CACHE_STRONG_TTL',
    description: '强时效性TTL（秒）',
    default: 5,
    usedBy: ['cacheUnified', 'unifiedTtl']
  },
  'CACHE_AUTH_TTL': {
    newVar: 'CACHE_AUTH_TTL',
    description: '认证TTL（秒）',
    default: 300,
    usedBy: ['cacheUnified', 'unifiedTtl']
  },
  'CACHE_MONITORING_TTL': {
    newVar: 'CACHE_MONITORING_TTL',
    description: '监控TTL（秒）',
    default: 300,
    usedBy: ['cacheUnified', 'unifiedTtl']
  },
  
  // 限制配置
  'CACHE_MAX_BATCH_SIZE': {
    newVar: 'CACHE_MAX_BATCH_SIZE',
    description: '最大批量大小',
    default: 100,
    usedBy: ['cacheUnified', 'cacheLimits']
  },
  'CACHE_MAX_SIZE': {
    newVar: 'CACHE_MAX_SIZE',
    description: '最大缓存大小',
    default: 10000,
    usedBy: ['cacheUnified', 'cacheLimits']
  },
  'SMART_CACHE_MAX_BATCH': {
    newVar: 'SMART_CACHE_MAX_BATCH',
    description: 'Smart Cache最大批量',
    default: 50,
    usedBy: ['cacheUnified', 'cacheLimits']
  },
  
  // Alert配置（待迁移）
  'ALERT_BATCH_SIZE': {
    newVar: 'ALERT_BATCH_SIZE',
    description: 'Alert批量大小',
    default: 100,
    usedBy: ['cacheUnified', 'cacheLimits'],
    migration: 'Will move to Alert module in v2.1'
  }
} as const;

/**
 * 配置使用示例
 */
export const USAGE_EXAMPLES = {
  // 新代码示例（推荐）
  newCode: `
    // 🆕 推荐用法 - 使用统一配置
    @Injectable()
    export class ModernCacheService {
      constructor(
        @Inject('cacheUnified') 
        private readonly config: CacheUnifiedConfig,
      ) {}
      
      getTtl(): number {
        return this.config.defaultTtl;
      }
      
      getMaxBatchSize(): number {
        return this.config.maxBatchSize;
      }
    }
  `,
  
  // 现有代码示例（继续工作）
  legacyCode: `
    // 🔄 现有代码 - 继续正常工作
    @Injectable()
    export class LegacyCacheService {
      constructor(
        @Inject('cache') 
        private readonly cacheConfig: CacheConfig,
        @Inject('unifiedTtl')
        private readonly ttlConfig: UnifiedTtlConfig,
      ) {}
      
      getTtl(): number {
        return this.cacheConfig.defaultTtl; // 自动映射到统一配置
      }
      
      getAuthTtl(): number {
        return this.ttlConfig.authTtl; // 自动映射到统一配置
      }
    }
  `,
  
  // 混合用法示例
  mixedCode: `
    // 🔄 渐进式迁移 - 新功能用新配置，现有功能保持兼容
    @Injectable()
    export class TransitionCacheService {
      constructor(
        @Inject('cacheUnified') 
        private readonly unifiedConfig: CacheUnifiedConfig,
        @Inject('cache') 
        private readonly legacyConfig: CacheConfig, // 保留向后兼容
      ) {}
      
      // 新功能使用统一配置
      getRealtimeTtl(): number {
        return this.unifiedConfig.realtimeTtl;
      }
      
      // 现有功能保持兼容
      getCompressionThreshold(): number {
        return this.legacyConfig.compressionThreshold;
      }
    }
  `
} as const;
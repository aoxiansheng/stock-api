/**
 * TTL统一配置（兼容性导出）
 * 🚨 此文件仅为向后兼容性而存在
 *
 * @deprecated 此文件已被cache-unified.config.ts完全替代
 * @migration 使用cache-unified.config.ts替代
 * @compatibility 通过TtlCompatibilityWrapper自动提供向后兼容
 *
 * 新服务推荐使用：
 * ```typescript
 * @Inject('cacheUnified') private readonly config: CacheUnifiedConfig
 * ```
 *
 * 现有服务继续使用：
 * ```typescript
 * @Inject('unifiedTtl') private readonly ttlConfig: UnifiedTtlConfig
 * ```
 */

// 重新导出兼容性接口和配置
export type { UnifiedTtlConfig } from "./ttl-compatibility-wrapper";
export { TtlCompatibilityWrapper } from "./ttl-compatibility-wrapper";
export { default } from "./ttl-compatibility-wrapper";

/**
 * 环境变量映射指南
 * 🎯 帮助开发者了解TTL相关环境变量
 */
export const TTL_ENVIRONMENT_MAPPING = {
  // 基础TTL配置
  CACHE_DEFAULT_TTL: {
    description: "默认缓存TTL（秒）",
    default: 300,
    usage: "defaultTtl",
  },
  CACHE_STRONG_TTL: {
    description: "强时效性TTL（秒）",
    default: 5,
    usage: "strongTimelinessTtl",
  },

  // 组件特定TTL
  CACHE_AUTH_TTL: {
    description: "认证TTL（秒）",
    default: 300,
    usage: "authTtl",
  },
  CACHE_MONITORING_TTL: {
    description: "监控TTL（秒）",
    default: 300,
    usage: "monitoringTtl",
  },

  // Alert模块TTL配置
  CACHE_ALERT_ACTIVE_TTL: {
    description: "Alert活跃数据TTL（秒）",
    default: 300,
    usage: "alertActiveDataTtl",
  },
  CACHE_ALERT_HISTORICAL_TTL: {
    description: "Alert历史数据TTL（秒）",
    default: 3600,
    usage: "alertHistoricalDataTtl",
  },
  CACHE_ALERT_COOLDOWN_TTL: {
    description: "Alert冷却期TTL（秒）",
    default: 300,
    usage: "alertCooldownTtl",
  },
  CACHE_ALERT_CONFIG_TTL: {
    description: "Alert配置缓存TTL（秒）",
    default: 600,
    usage: "alertConfigCacheTtl",
  },
  CACHE_ALERT_STATS_TTL: {
    description: "Alert统计缓存TTL（秒）",
    default: 300,
    usage: "alertStatsCacheTtl",
  },
} as const;

/**
 * 迁移示例
 */
export const MIGRATION_EXAMPLES = {
  // 新代码示例（推荐）
  newCode: `
    // 🆕 推荐用法 - 使用统一配置
    @Injectable()
    export class ModernService {
      constructor(
        @Inject('cacheUnified') 
        private readonly config: CacheUnifiedConfig,
      ) {}
      
      getTtl(): number {
        return this.config.defaultTtl;
      }
    }
  `,

  // 现有代码示例（继续工作）
  legacyCode: `
    // 🔄 现有代码 - 继续正常工作
    @Injectable()
    export class LegacyService {
      constructor(
        @Inject('unifiedTtl') 
        private readonly ttlConfig: UnifiedTtlConfig,
      ) {}
      
      getTtl(): number {
        return this.ttlConfig.defaultTtl; // 自动映射到统一配置
      }
    }
  `,
} as const;

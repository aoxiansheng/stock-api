/**
 * 监控组件缓存统计替换功能TTL配置常量
 * 
 * ⚠️ 已废弃 - 请使用统一TTL配置
 * ==========================================
 * 本文件的配置已迁移到统一配置系统中：
 * 
 * 🔄 迁移路径：
 * - 原配置：src/monitoring/constants/cache-ttl.constants.ts
 * - 新配置：src/monitoring/config/unified/monitoring-unified-ttl.config.ts
 * 
 * 📋 使用新的统一配置：
 * ```typescript
 * import { MonitoringUnifiedTtlConfig } from '../config/unified/monitoring-unified-ttl.config';
 * 
 * // 在服务中注入配置
 * constructor(
 *   @Inject('monitoringUnifiedTtl') 
 *   private readonly ttlConfig: MonitoringUnifiedTtlConfig
 * ) {}
 * 
 * // 使用配置
 * const healthTtl = this.ttlConfig.health;
 * const trendTtl = this.ttlConfig.trend;
 * ```
 * 
 * ✅ 新配置的优势：
 * - 环境变量支持
 * - 类型安全验证
 * - 统一配置管理
 * - 环境特定默认值
 * 
 * @deprecated 使用 MonitoringUnifiedTtlConfig 替代
 * @version 1.0.0
 * @since 2025-09-16
 */

import { MONITORING_UNIFIED_TTL_CONSTANTS } from '../config/unified/monitoring-unified-ttl.config';

/**
 * @deprecated 使用 MonitoringUnifiedTtlConfig 替代
 * 兼容性支持，将逐步移除
 */
export const MONITORING_CACHE_TTL = {
  /** @deprecated 使用 ttlConfig.health 替代 */
  HEALTH: MONITORING_UNIFIED_TTL_CONSTANTS.DEFAULTS.HEALTH,
  
  /** @deprecated 使用 ttlConfig.trend 替代 */
  TREND: MONITORING_UNIFIED_TTL_CONSTANTS.DEFAULTS.TREND,
  
  /** @deprecated 使用 ttlConfig.performance 替代 */
  PERFORMANCE: MONITORING_UNIFIED_TTL_CONSTANTS.DEFAULTS.PERFORMANCE,
  
  /** @deprecated 使用 ttlConfig.alert 替代 */
  ALERT: MONITORING_UNIFIED_TTL_CONSTANTS.DEFAULTS.ALERT,
  
  /** @deprecated 使用 ttlConfig.cacheStats 替代 */
  CACHE_STATS: MONITORING_UNIFIED_TTL_CONSTANTS.DEFAULTS.CACHE_STATS,
} as const;

/**
 * @deprecated 使用 TtlDataType 替代
 * 缓存统计TTL类型定义，确保类型安全
 */
export type MonitoringCacheTTLType = typeof MONITORING_CACHE_TTL[keyof typeof MONITORING_CACHE_TTL];
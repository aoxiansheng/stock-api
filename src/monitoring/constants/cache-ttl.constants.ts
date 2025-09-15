/**
 * 监控组件缓存统计替换功能TTL配置常量
 * 
 * 职责边界说明：
 * ==========================================
 * 本文件专门用于缓存统计替换功能，与 monitoring.config.ts 的监控数据缓存功能区分：
 * 
 * 📋 cache-ttl.constants.ts (本文件):
 * - 用途：缓存统计数据的替换和过期管理
 * - 场景：替代 MonitoringCacheService.getTTL() 功能
 * - 特点：固定常量值，基于统计替换算法的技术需求
 * - TTL策略：基于统计数据访问频率和替换策略
 * 
 * 📋 monitoring.config.ts:
 * - 用途：监控业务数据的存储和检索缓存
 * - 场景：健康检查、性能监控、趋势分析等业务数据
 * - 特点：可配置参数，支持环境变量覆盖
 * - TTL策略：基于业务实时性需求和用户体验
 * 
 * ❓ 为什么有相似但不同的TTL值？
 * - 缓存统计替换：基于算法效率，注重内存管理
 * - 监控数据缓存：基于业务需求，注重数据时效性
 */
export const MONITORING_CACHE_TTL = {
  /** 健康统计替换TTL - 30秒，用于健康检查统计的缓存替换 */
  HEALTH: 30,
  
  /** 趋势统计替换TTL - 5分钟（300秒），用于趋势分析统计的缓存替换 */
  TREND: 300,
  
  /** 性能统计替换TTL - 1分钟（60秒），用于性能指标统计的缓存替换 */
  PERFORMANCE: 60,
  
  /** 告警统计替换TTL - 10分钟（600秒），用于告警统计的缓存替换 */
  ALERT: 600,
  
  /** 缓存统计替换TTL - 2分钟（120秒），用于缓存命中率等元统计的替换 */
  CACHE_STATS: 120,
} as const;

/**
 * 缓存统计TTL类型定义，确保类型安全
 * 用于缓存统计替换功能的类型约束
 */
export type MonitoringCacheTTLType = typeof MONITORING_CACHE_TTL[keyof typeof MONITORING_CACHE_TTL];
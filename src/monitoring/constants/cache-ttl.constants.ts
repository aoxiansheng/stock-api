/**
 * 监控组件缓存TTL配置常量
 * 替代 MonitoringCacheService.getTTL() 功能
 * 提供各类监控数据的统一TTL管理
 */
export const MONITORING_CACHE_TTL = {
  /** 健康数据TTL - 30秒，需要较快的刷新频率 */
  HEALTH: 30,
  
  /** 趋势数据TTL - 5分钟，中等刷新频率 */
  TREND: 300,
  
  /** 性能数据TTL - 1分钟，需要较频繁的更新 */
  PERFORMANCE: 60,
  
  /** 告警数据TTL - 10分钟，相对稳定的数据 */
  ALERT: 600,
  
  /** 缓存统计数据TTL - 2分钟，用于监控缓存本身的性能 */
  CACHE_STATS: 120,
} as const;

/**
 * TTL类型定义，确保类型安全
 */
export type MonitoringCacheTTLType = typeof MONITORING_CACHE_TTL[keyof typeof MONITORING_CACHE_TTL];
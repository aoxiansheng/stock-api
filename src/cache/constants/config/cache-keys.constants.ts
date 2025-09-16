/**
 * 缓存键值常量 - 统一配置体系
 * 🎯 符合开发规范指南 - 统一缓存键命名规范
 * ✅ 提供标准化的缓存键模板和前缀定义
 * 🔄 配合cache-unified.config.ts使用，确保键值和配置的一致性
 * 
 * 使用指南：
 * - 键前缀：使用CACHE_KEYS.PREFIXES定义的标准前缀
 * - 配置获取：通过CacheUnifiedConfig或CacheService.getTtlByTimeliness()
 * - 命名规范：{module}:{category}:{specific_key}
 */

export const CACHE_KEYS = Object.freeze({
  /**
   * 统一缓存键前缀定义
   * 🎯 遵循四层配置体系的键值命名规范
   */
  PREFIXES: {
    // Cache模块基础前缀
    HEALTH: "cache:health:",
    METRICS: "cache:metrics:",
    LOCK: "cache:lock:",
    CONFIG: "cache:config:",
    
    // 新增：与统一配置对应的前缀
    UNIFIED: "cache:unified:",
    COMPATIBILITY: "cache:compat:",
    MIGRATION: "cache:migration:",
  },
  
  /**
   * 配置相关键值模板
   * 🎯 与cache-unified.config.ts配置项对应
   */
  TEMPLATES: {
    TTL_CONFIG: (component: string) => `cache:config:ttl:${component}`,
    LIMITS_CONFIG: (type: string) => `cache:config:limits:${type}`,
    PERFORMANCE_CONFIG: (metric: string) => `cache:config:perf:${metric}`,
  },
  
  /**
   * 兼容性键值
   * 🔄 用于配置迁移期间的键值映射
   */
  LEGACY: {
    DEFAULT_TTL: "cache:ttl:default",  // 映射到unified.defaultTtl
    STRONG_TTL: "cache:ttl:strong",    // 映射到unified.strongTimelinessTtl
    BATCH_SIZE: "cache:limits:batch",  // 映射到unified.maxBatchSize
  }
} as const);

/**
 * 键值构建辅助函数
 * 🎯 标准化缓存键的构建过程
 */
export const buildCacheKey = {
  /**
   * 构建健康检查键
   */
  health: (checkType: string, id?: string): string => 
    `${CACHE_KEYS.PREFIXES.HEALTH}${checkType}${id ? `:${id}` : ''}`,
  
  /**
   * 构建指标键
   */
  metrics: (metricType: string, timeframe?: string): string =>
    `${CACHE_KEYS.PREFIXES.METRICS}${metricType}${timeframe ? `:${timeframe}` : ''}`,
  
  /**
   * 构建锁键
   */
  lock: (resource: string, operation?: string): string =>
    `${CACHE_KEYS.PREFIXES.LOCK}${resource}${operation ? `:${operation}` : ''}`,
  
  /**
   * 构建配置键
   */
  config: (configType: string, version?: string): string =>
    `${CACHE_KEYS.PREFIXES.CONFIG}${configType}${version ? `:v${version}` : ''}`,
} as const;


/**
 * 缓存键值常量
 * 🎯 符合开发规范指南 - 统一缓存键命名规范
 * 提供标准化的缓存键模板和前缀定义
 */

export const CACHE_KEYS = Object.freeze({
  /**
   * 缓存键前缀定义
   */
  PREFIXES: {
    HEALTH: "cache:health:",
    STATS: "cache:stats:",
    METRICS: "cache:metrics:",
    LOCK: "cache:lock:",
    CONFIG: "cache:config:",
  },
  
  /**
   * 健康检查相关键值
   */
  HEALTH: {
    STATUS: "cache:health:status",
    LAST_CHECK: "cache:health:last-check",
    CHECK_HISTORY: "cache:health:check-history",
  },
  
  /**
   * 统计信息相关键值
   */
  STATS: {
    HIT_RATE: "cache:stats:hit-rate",
    MISS_COUNT: "cache:stats:miss-count",
    ERROR_COUNT: "cache:stats:error-count",
    OPERATION_COUNT: "cache:stats:operation-count",
  },
  
  /**
   * 分布式锁相关键值
   */
  LOCKS: {
    HEALTH_CHECK: "cache:lock:health-check",
    STATS_UPDATE: "cache:lock:stats-update",
    CLEANUP: "cache:lock:cleanup",
  },
  
  /**
   * 配置相关键值
   */
  CONFIG: {
    TTL_SETTINGS: "cache:config:ttl-settings",
    COMPRESSION_SETTINGS: "cache:config:compression",
    SERIALIZATION_SETTINGS: "cache:config:serialization",
  }
} as const);

/**
 * 缓存键生成工具函数
 */
export const CACHE_KEY_GENERATORS = Object.freeze({
  /**
   * 生成带时间戳的键
   */
  withTimestamp: (baseKey: string): string => `${baseKey}:${Date.now()}`,
  
  /**
   * 生成带用户ID的键
   */
  withUserId: (baseKey: string, userId: string): string => `${baseKey}:user:${userId}`,
  
  /**
   * 生成带环境的键
   */
  withEnvironment: (baseKey: string, env: string): string => `${baseKey}:env:${env}`,
} as const);
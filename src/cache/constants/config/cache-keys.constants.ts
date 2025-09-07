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
  }
} as const);



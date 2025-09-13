/**
 * 简化的TTL配置常量
 * 🎯 消除多层间接引用，直接使用数值定义
 * 提供明确的TTL用途分类，易于理解和维护
 */

/**
 * 缓存TTL直接配置
 * 所有值均为秒数，直接定义避免多层引用
 */
export const SIMPLIFIED_TTL_CONFIG = Object.freeze({
  /**
   * 实时数据TTL（秒）
   * 用于股票报价、市场数据等需要高频更新的信息
   */
  REALTIME: {
    STOCK_QUOTE: 5,        // 实时报价：5秒
    INDEX_QUOTE: 5,        // 指数报价：5秒
  },
  
  /**
   * 准静态数据TTL（秒）
   * 用于基础信息、配置等不频繁变更的数据
   */
  SEMI_STATIC: {
    STOCK_INFO: 3600,        // 股票基础信息：1小时
    MARKET_CONFIG: 86400,    // 市场配置：24小时
  },
  
  /**
   * 系统运维TTL（秒）
   * 用于健康检查、锁机制等系统功能
   */
  SYSTEM: {
    DISTRIBUTED_LOCK: 30,  // 分布式锁：30秒
    METRICS_COLLECTION: 300, // 指标收集：5分钟
  },
  
  /**
   * 默认TTL（秒）
   * 用于未明确分类的缓存场景
   * 注意：实际默认值现在通过 ConfigService 获取，支持环境变量覆盖
   */
  DEFAULT: {
    GENERAL: 300,         // 通用默认：5分钟（与环境变量保持一致）
  }
} as const);

/**
 * TTL配置类型定义
 */
export type TTLConfigCategory = keyof typeof SIMPLIFIED_TTL_CONFIG;
export type RealtimeTTL = keyof typeof SIMPLIFIED_TTL_CONFIG.REALTIME;
export type SemiStaticTTL = keyof typeof SIMPLIFIED_TTL_CONFIG.SEMI_STATIC;
export type SystemTTL = keyof typeof SIMPLIFIED_TTL_CONFIG.SYSTEM;
export type DefaultTTL = keyof typeof SIMPLIFIED_TTL_CONFIG.DEFAULT;

/**
 * 快速TTL访问常量
 * 提供扁平化访问方式，避免嵌套层级
 */
export const TTL_VALUES = Object.freeze({
  // 实时数据
  STOCK_QUOTE: SIMPLIFIED_TTL_CONFIG.REALTIME.STOCK_QUOTE,
  INDEX_QUOTE: SIMPLIFIED_TTL_CONFIG.REALTIME.INDEX_QUOTE,
  
  // 准静态数据
  STOCK_INFO: SIMPLIFIED_TTL_CONFIG.SEMI_STATIC.STOCK_INFO,
  MARKET_CONFIG: SIMPLIFIED_TTL_CONFIG.SEMI_STATIC.MARKET_CONFIG,
  
  // 系统运维
  LOCK: SIMPLIFIED_TTL_CONFIG.SYSTEM.DISTRIBUTED_LOCK,
  LOCK_TTL: SIMPLIFIED_TTL_CONFIG.SYSTEM.DISTRIBUTED_LOCK, // 添加 LOCK_TTL 别名
  METRICS: SIMPLIFIED_TTL_CONFIG.SYSTEM.METRICS_COLLECTION,
  
  // 默认值（注意：实际使用时通过 ConfigService 获取）
  DEFAULT: SIMPLIFIED_TTL_CONFIG.DEFAULT.GENERAL,
  
} as const);
/**
 * 缓存TTL配置常量
 * 🎯 符合开发规范指南 - 解决TTL值语义不明确问题
 * 提供明确的TTL用途分类，避免硬编码数值
 */

import { CACHE_CONSTANTS } from "../../../common/constants/unified/unified-cache-config.constants";

/**
 * 缓存TTL语义化配置
 */
export const CACHE_TTL_CONFIG = Object.freeze({
  /**
   * 实时数据TTL配置
   * 用于股票报价、市场数据等需要高频更新的信息
   */
  REALTIME: {
    STOCK_QUOTE: CACHE_CONSTANTS.TTL_SETTINGS.REALTIME_DATA_TTL, // 实时报价
    INDEX_QUOTE: CACHE_CONSTANTS.TTL_SETTINGS.REALTIME_DATA_TTL, // 指数报价
    MARKET_STATUS: 60, // 市场状态，1分钟更新
  },
  
  /**
   * 准静态数据TTL配置
   * 用于基础信息、配置等不频繁变更的数据
   */
  SEMI_STATIC: {
    BASIC_INFO: CACHE_CONSTANTS.TTL_SETTINGS.BASIC_INFO_TTL, // 股票基本信息
    MAPPING_RULES: CACHE_CONSTANTS.TTL_SETTINGS.MAPPING_CONFIG_TTL, // 映射规则
    SYMBOL_MAPPING: CACHE_CONSTANTS.TTL_SETTINGS.MAPPING_CONFIG_TTL, // 符号映射
  },
  
  /**
   * 系统运维TTL配置
   * 用于健康检查、锁机制等系统功能
   */
  SYSTEM: {
    HEALTH_CHECK: CACHE_CONSTANTS.TTL_SETTINGS.HEALTH_CHECK_TTL, // 健康检查
    DISTRIBUTED_LOCK: 30, // 分布式锁，30秒
    METRICS_COLLECTION: 300, // 指标收集，5分钟
  },
  
  /**
   * 默认TTL配置
   * 用于未明确分类的缓存场景
   */
  DEFAULT: {
    GENERAL: CACHE_CONSTANTS.TTL_SETTINGS.DEFAULT_TTL, // 通用默认TTL
    FALLBACK: 3600, // 降级场景，1小时
  }
} as const);

/**
 * 缓存TTL常量 - 模块特定TTL设置
 * @deprecated 使用 CACHE_TTL_CONFIG 替代，提供更明确的语义分类
 */
export const CACHE_TTL = Object.freeze({
  REALTIME_DATA: CACHE_TTL_CONFIG.REALTIME.STOCK_QUOTE,
  BASIC_INFO: CACHE_TTL_CONFIG.SEMI_STATIC.BASIC_INFO,
  MARKET_STATUS: CACHE_TTL_CONFIG.REALTIME.MARKET_STATUS,
  MAPPING_RULES: CACHE_TTL_CONFIG.SEMI_STATIC.MAPPING_RULES,
  DEFAULT: CACHE_TTL_CONFIG.DEFAULT.GENERAL,
  LOCK_TTL: CACHE_TTL_CONFIG.SYSTEM.DISTRIBUTED_LOCK,
  HEALTH_CHECK_TTL: CACHE_TTL_CONFIG.SYSTEM.HEALTH_CHECK,
} as const);
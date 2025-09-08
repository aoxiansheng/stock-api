/**
 * 核心超时常量
 * 🏛️ Foundation层 - 超时配置的基础定义
 * ⏰ 解决RETRY_DELAY_MS、CONNECTION_TIMEOUT等命名不一致问题
 */

import { CORE_VALUES } from './core-values.constants';

/**
 * 核心超时配置
 * 基于CORE_VALUES构建，提供标准化的超时定义
 */
export const CORE_TIMEOUTS = Object.freeze({
  /**
   * 连接相关超时 (毫秒)
   * 🎯 统一CONNECTION_TIMEOUT命名
   */
  CONNECTION: {
    ESTABLISH_MS: CORE_VALUES.TIME_MS.TEN_SECONDS,     // 建立连接
    KEEP_ALIVE_MS: CORE_VALUES.TIME_MS.ONE_MINUTE,     // 连接保活
  },

  /**
   * 请求相关超时 (毫秒)
   * 🎯 统一REQUEST_TIMEOUT命名
   */
  REQUEST: {
    FAST_MS: CORE_VALUES.TIME_MS.FIVE_SECONDS,         // 快速请求
    NORMAL_MS: CORE_VALUES.TIME_MS.THIRTY_SECONDS,     // 普通请求
    SLOW_MS: CORE_VALUES.TIME_MS.ONE_MINUTE,           // 慢请求
  },

  /**
   * 网关相关超时 (毫秒)  
   * 🎯 统一GATEWAY_TIMEOUT命名
   */
  GATEWAY: {
  },

  /**
   * 数据库相关超时 (毫秒)
   * 🎯 统一DATABASE_TIMEOUT命名
   */
  DATABASE: {
    QUERY_MS: CORE_VALUES.TIME_MS.TEN_SECONDS,         // 查询超时
    TRANSACTION_MS: CORE_VALUES.TIME_MS.THIRTY_SECONDS, // 事务超时
  },

  /**
   * 重试相关延迟 (毫秒)
   * 🎯 统一RETRY_DELAY_MS命名，解决重复定义
   */
  RETRY: {
    INITIAL_DELAY_MS: CORE_VALUES.TIME_MS.ONE_SECOND,  // 初始延迟
    MIN_DELAY_MS: CORE_VALUES.TIME_MS.ONE_SECOND,      // 最小延迟
    MAX_DELAY_MS: CORE_VALUES.TIME_MS.TEN_SECONDS,     // 最大延迟
    EXPONENTIAL_BASE_MS: CORE_VALUES.TIME_MS.ONE_SECOND, // 指数退避基数
  },

  /**
   * 操作相关超时 (毫秒)
   * 🎯 统一OPERATION_TIMEOUT命名
   */
  OPERATION: {
    QUICK_MS: CORE_VALUES.TIME_MS.ONE_SECOND,          // 快速操作
    STANDARD_MS: CORE_VALUES.TIME_MS.TEN_SECONDS,      // 标准操作
    LONG_RUNNING_MS: CORE_VALUES.TIME_MS.ONE_MINUTE,   // 长时间运行
    BACKGROUND_MS: CORE_VALUES.TIME_MS.TEN_MINUTES,    // 后台操作
  },

  /**
   * 缓存相关超时 (毫秒)
   * 🎯 统一CACHE_TIMEOUT命名
   */
  CACHE: {
    GET_MS: CORE_VALUES.TIME_MS.ONE_SECOND,            // 缓存读取
  },
});

/**
 * TTL相关配置 (秒)
 * 用于缓存、会话等生存时间配置
 */
export const CORE_TTL = Object.freeze({
  /**
   * 缓存TTL配置 (秒)
   */
  CACHE: {
    REALTIME_SEC: 5,        // 实时数据缓存5秒
    FREQUENT_SEC: 60,       // 频繁访问数据缓存60秒
    NORMAL_SEC: 300,        // 普通数据缓存300秒
    STATIC_SEC: 86400,      // 静态数据缓存1天
  },

  /**
   * 会话TTL配置 (秒)  
   */
  SESSION: {
  },
});

/**
 * 类型定义
 */
export type CoreTimeouts = typeof CORE_TIMEOUTS;
export type CoreTTL = typeof CORE_TTL;
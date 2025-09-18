/**
 * 核心超时常量
 * 🏛️ Foundation层 - 超时配置的基础定义
 * ⏰ 解决RETRY_DELAY_MS、CONNECTION_TIMEOUT等命名不一致问题
 */

import { NUMERIC_CONSTANTS } from "../core";

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
    ESTABLISH_MS: NUMERIC_CONSTANTS.N_10000, // 建立连接
    KEEP_ALIVE_MS: NUMERIC_CONSTANTS.N_60000, // 连接保活
  },

  /**
   * 请求相关超时 (毫秒)
   * 🎯 统一REQUEST_TIMEOUT命名
   */
  REQUEST: {
    FAST_MS: NUMERIC_CONSTANTS.N_5000, // 快速请求
    NORMAL_MS: NUMERIC_CONSTANTS.N_30000, // 普通请求
    SLOW_MS: NUMERIC_CONSTANTS.N_60000, // 慢请求
  },

  /**
   * 数据库相关超时 (毫秒)
   * 🎯 统一DATABASE_TIMEOUT命名
   */
  DATABASE: {
    QUERY_MS: NUMERIC_CONSTANTS.N_10000, // 查询超时
    TRANSACTION_MS: NUMERIC_CONSTANTS.N_30000, // 事务超时
  },

  /**
   * 重试相关延迟 (毫秒)
   * 🎯 统一RETRY_DELAY_MS命名，解决重复定义
   */
  RETRY: {
    INITIAL_DELAY_MS: NUMERIC_CONSTANTS.N_1000, // 初始延迟
    MIN_DELAY_MS: NUMERIC_CONSTANTS.N_1000, // 最小延迟
    MAX_DELAY_MS: NUMERIC_CONSTANTS.N_10000, // 最大延迟
    EXPONENTIAL_BASE_MS: NUMERIC_CONSTANTS.N_1000, // 指数退避基数
  },

  /**
   * 操作相关超时 (毫秒)
   * 🎯 统一OPERATION_TIMEOUT命名
   */
  OPERATION: {
    QUICK_MS: NUMERIC_CONSTANTS.N_1000, // 快速操作
    STANDARD_MS: NUMERIC_CONSTANTS.N_10000, // 标准操作
    LONG_RUNNING_MS: NUMERIC_CONSTANTS.N_60000, // 长时间运行
    BACKGROUND_MS: NUMERIC_CONSTANTS.N_600000, // 后台操作
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
    REALTIME_SEC: 5, // 实时数据缓存5秒
    FREQUENT_SEC: 60, // 频繁访问数据缓存60秒
    NORMAL_SEC: 300, // 普通数据缓存300秒
    STATIC_SEC: 86400, // 静态数据缓存1天
  },
});

/**
 * 类型定义
 */
export type CoreTTL = typeof CORE_TTL;

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
    IDLE_MS: CORE_VALUES.TIME_MS.THIRTY_SECONDS,       // 空闲连接
    KEEP_ALIVE_MS: CORE_VALUES.TIME_MS.ONE_MINUTE,     // 连接保活
    POOL_ACQUIRE_MS: CORE_VALUES.TIME_MS.TEN_SECONDS,  // 连接池获取
  },

  /**
   * 请求相关超时 (毫秒)
   * 🎯 统一REQUEST_TIMEOUT命名
   */
  REQUEST: {
    FAST_MS: CORE_VALUES.TIME_MS.FIVE_SECONDS,         // 快速请求
    NORMAL_MS: CORE_VALUES.TIME_MS.THIRTY_SECONDS,     // 普通请求
    SLOW_MS: CORE_VALUES.TIME_MS.ONE_MINUTE,           // 慢请求
    BATCH_MS: CORE_VALUES.TIME_MS.FIVE_MINUTES,        // 批量请求
  },

  /**
   * 网关相关超时 (毫秒)  
   * 🎯 统一GATEWAY_TIMEOUT命名
   */
  GATEWAY: {
    PROXY_MS: CORE_VALUES.TIME_MS.ONE_MINUTE,          // 代理超时
    LOAD_BALANCER_MS: CORE_VALUES.TIME_MS.THIRTY_SECONDS, // 负载均衡
    API_GATEWAY_MS: CORE_VALUES.TIME_MS.ONE_MINUTE,    // API网关
  },

  /**
   * 数据库相关超时 (毫秒)
   * 🎯 统一DATABASE_TIMEOUT命名
   */
  DATABASE: {
    QUERY_MS: CORE_VALUES.TIME_MS.TEN_SECONDS,         // 查询超时
    TRANSACTION_MS: CORE_VALUES.TIME_MS.THIRTY_SECONDS, // 事务超时
    MIGRATION_MS: CORE_VALUES.TIME_MS.TEN_MINUTES,     // 迁移超时
    BACKUP_MS: CORE_VALUES.TIME_MS.ONE_HOUR,           // 备份超时
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
    SET_MS: CORE_VALUES.TIME_MS.ONE_SECOND,            // 缓存写入
    DELETE_MS: CORE_VALUES.TIME_MS.ONE_SECOND,         // 缓存删除
    FLUSH_MS: CORE_VALUES.TIME_MS.TEN_SECONDS,         // 缓存刷新
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
    VERY_SHORT_SEC: CORE_VALUES.TIME_SECONDS.FIVE_SECONDS,    // 极短期
    SHORT_SEC: CORE_VALUES.TIME_SECONDS.FIVE_MINUTES,         // 短期
    MEDIUM_SEC: CORE_VALUES.TIME_SECONDS.THIRTY_MINUTES,      // 中期
    LONG_SEC: CORE_VALUES.TIME_SECONDS.ONE_HOUR,              // 长期
    VERY_LONG_SEC: CORE_VALUES.TIME_SECONDS.ONE_DAY,          // 极长期
  },

  /**
   * 会话TTL配置 (秒)  
   */
  SESSION: {
    ACCESS_TOKEN_SEC: CORE_VALUES.TIME_SECONDS.TEN_MINUTES,   // 访问令牌
    REFRESH_TOKEN_SEC: CORE_VALUES.TIME_SECONDS.THIRTY_DAYS,  // 刷新令牌
    API_KEY_SEC: CORE_VALUES.TIME_SECONDS.NINETY_DAYS,        // API Key
    SESSION_SEC: CORE_VALUES.TIME_SECONDS.ONE_HOUR,           // 会话
  },
});

/**
 * 类型定义
 */
export type CoreTimeouts = typeof CORE_TIMEOUTS;
export type CoreTTL = typeof CORE_TTL;
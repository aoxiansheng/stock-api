/**
 * 核心限制常量
 * 🏛️ Foundation层 - 系统边界值和限制的统一定义
 * 📏 解决MAX_BATCH_SIZE、MAX_PAGE_SIZE等重复和命名不一致问题
 */

import { CORE_VALUES } from './core-values.constants';

/**
 * 核心限制配置
 * 基于CORE_VALUES构建，提供标准化的限制定义
 */
export const CORE_LIMITS = Object.freeze({
  /**
   * 字符串长度限制
   * 🎯 统一命名规范：MAX_LENGTH结尾
   */
  STRING_LENGTH: {
    MIN_LENGTH: CORE_VALUES.QUANTITIES.ONE,
    
    // 不同用途的长度限制
    TAG_MAX_LENGTH: CORE_VALUES.SIZES.SMALL,           // 50 - 标签最大长度
    NAME_MAX_LENGTH: CORE_VALUES.SIZES.MEDIUM,         // 100 - 名称最大长度  
    DESCRIPTION_MAX_LENGTH: CORE_VALUES.SIZES.LARGE,   // 500 - 描述最大长度
    MESSAGE_MAX_LENGTH: CORE_VALUES.SIZES.HUGE,        // 1000 - 消息最大长度
    TEMPLATE_MAX_LENGTH: CORE_VALUES.SIZES.MASSIVE,    // 10000 - 模板最大长度
    
    // 特殊用途长度限制
    URL_MAX_LENGTH: CORE_VALUES.SIZES.URL_MAX,         // 2048 - URL最大长度
    EMAIL_MAX_LENGTH: CORE_VALUES.SIZES.EMAIL_MAX,     // 320 - 邮箱最大长度
    FILENAME_MAX_LENGTH: CORE_VALUES.SIZES.FILENAME_MAX, // 255 - 文件名最大长度
  },

  /**
   * ID长度限制
   */
  ID_LENGTH: {
    MIN_LENGTH: CORE_VALUES.QUANTITIES.ONE,            // 1 - 最小ID长度
    MAX_LENGTH: CORE_VALUES.SIZES.MEDIUM,              // 100 - 最大ID长度
    TYPICAL_MIN_LENGTH: 15,                            // 15 - 典型最小ID长度
    TYPICAL_MAX_LENGTH: CORE_VALUES.SIZES.SMALL,       // 50 - 典型最大ID长度
    RANDOM_PART_LENGTH: CORE_VALUES.SIZES.TINY,        // 6 - ID随机部分长度
  },

  /**
   * 数值范围限制
   */
  NUMERIC_RANGE: {
    MIN_VALUE: CORE_VALUES.QUANTITIES.ZERO,
    MAX_VALUE: CORE_VALUES.MATH.MAX_SAFE_INTEGER,
    
    // 百分比范围
    PERCENTAGE_MIN: CORE_VALUES.PERCENTAGES.MIN,       // 0
    PERCENTAGE_MAX: CORE_VALUES.PERCENTAGES.MAX,       // 100
    
    // 计数器范围
    COUNT_MIN: CORE_VALUES.QUANTITIES.ZERO,
    COUNT_MAX: CORE_VALUES.MATH.MAX_SAFE_INTEGER,
    
    // 阈值范围
    THRESHOLD_MIN: CORE_VALUES.QUANTITIES.ZERO,
    THRESHOLD_MAX: CORE_VALUES.MATH.MAX_SAFE_INTEGER,
  },

  /**
   * 批量操作限制
   * 🎯 解决MAX_BATCH_SIZE重复定义问题
   */
  BATCH_LIMITS: {
    // 通用批量大小
    DEFAULT_BATCH_SIZE: CORE_VALUES.SIZES.MEDIUM,      // 100 - 默认批量大小
    MIN_BATCH_SIZE: CORE_VALUES.QUANTITIES.ONE,        // 1 - 最小批量大小
    MAX_BATCH_SIZE: CORE_VALUES.SIZES.HUGE,            // 1000 - 最大批量大小 🎯
    OPTIMAL_BATCH_SIZE: CORE_VALUES.SIZES.SMALL,       // 50 - 最优批量大小
    
    // 特定场景批量限制
    TINY_BATCH_SIZE: CORE_VALUES.SIZES.TINY,           // 6 - 微批量
    SMALL_BATCH_SIZE: CORE_VALUES.SIZES.SMALL,         // 50 - 小批量
    LARGE_BATCH_SIZE: CORE_VALUES.SIZES.LARGE,         // 500 - 大批量
    MASSIVE_BATCH_SIZE: CORE_VALUES.SIZES.MASSIVE,     // 10000 - 超大批量
  },

  /**
   * 分页限制
   * 🎯 解决MAX_PAGE_SIZE命名不一致问题
   */
  PAGINATION: {
    DEFAULT_PAGE_SIZE: CORE_VALUES.SIZES.TINY,         // 6 - 默认分页大小
    MIN_PAGE_SIZE: CORE_VALUES.QUANTITIES.ONE,         // 1 - 最小分页大小
    MAX_PAGE_SIZE: CORE_VALUES.SIZES.MEDIUM,           // 100 - 最大分页大小 🎯
    OPTIMAL_PAGE_SIZE: CORE_VALUES.SIZES.SMALL,        // 50 - 最优分页大小
    
    // 页码限制
    MIN_PAGE_NUMBER: CORE_VALUES.QUANTITIES.ONE,       // 1 - 最小页码
    MAX_PAGE_NUMBER: CORE_VALUES.SIZES.MASSIVE,        // 10000 - 最大页码
  },

  /**
   * 并发限制
   */
  CONCURRENCY: {
    DEFAULT_WORKERS: CORE_VALUES.SIZES.TINY,           // 6 - 默认工作进程数
    MIN_WORKERS: CORE_VALUES.QUANTITIES.ONE,           // 1 - 最小工作进程数
    MAX_WORKERS: CORE_VALUES.SIZES.SMALL,              // 50 - 最大工作进程数
    
    DEFAULT_CONNECTIONS: CORE_VALUES.SIZES.MEDIUM,     // 100 - 默认连接数
    MIN_CONNECTIONS: CORE_VALUES.QUANTITIES.ONE,       // 1 - 最小连接数
    MAX_CONNECTIONS: CORE_VALUES.SIZES.HUGE,           // 1000 - 最大连接数 🎯
  },

  /**
   * 频率限制
   * 🎯 统一频率限制命名
   */
  RATE_LIMITS: {
    // 每分钟请求限制
    DEFAULT_REQUESTS_PER_MINUTE: CORE_VALUES.SIZES.MEDIUM,     // 100
    MIN_REQUESTS_PER_MINUTE: CORE_VALUES.QUANTITIES.ONE,       // 1
    MAX_REQUESTS_PER_MINUTE: CORE_VALUES.SIZES.HUGE,           // 1000 🎯
    
    // 每小时请求限制
    DEFAULT_REQUESTS_PER_HOUR: CORE_VALUES.SIZES.MASSIVE,      // 10000 🎯
    MAX_REQUESTS_PER_HOUR: CORE_VALUES.QUANTITIES.ONE_HUNDRED_THOUSAND,   // 100000
    
    // 重试次数限制
    DEFAULT_RETRIES: CORE_VALUES.NETWORK.DEFAULT_RETRIES,      // 3
    MIN_RETRIES: CORE_VALUES.QUANTITIES.ZERO,                  // 0
    MAX_RETRIES: CORE_VALUES.SIZES.TINY,                       // 6
  },

  /**
   * 存储限制
   */
  STORAGE: {
    // 缓存条目数限制
    DEFAULT_CACHE_ENTRIES: CORE_VALUES.SIZES.HUGE,             // 1000
    MIN_CACHE_ENTRIES: CORE_VALUES.SIZES.MEDIUM,               // 100
    MAX_CACHE_ENTRIES: CORE_VALUES.SIZES.MASSIVE,              // 10000
    
    // 文件大小限制 (字节)
    MAX_FILE_SIZE_BYTES: CORE_VALUES.SIZES.MASSIVE * 1024,     // 10MB
    MAX_JSON_SIZE_BYTES: CORE_VALUES.SIZES.HUGE * 1024,        // 1MB
    MAX_LOG_SIZE_BYTES: CORE_VALUES.SIZES.LARGE * 1024,        // 500KB
  },

  /**
   * 搜索和查询限制
   */
  SEARCH: {
    DEFAULT_SEARCH_RESULTS: CORE_VALUES.SIZES.MEDIUM,          // 100
    MIN_SEARCH_RESULTS: CORE_VALUES.QUANTITIES.ONE,            // 1
    MAX_SEARCH_RESULTS: CORE_VALUES.SIZES.HUGE,                // 1000 🎯
    
    MAX_EXPORT_RECORDS: CORE_VALUES.QUANTITIES.ONE_HUNDRED_THOUSAND,      // 100000 🎯
    DEFAULT_EXPORT_BATCH: CORE_VALUES.SIZES.HUGE,              // 1000
  },

  /**
   * 安全限制
   */
  SECURITY: {
    // 密码长度限制
    MIN_PASSWORD_LENGTH: CORE_VALUES.QUANTITIES.TEN,           // 10
    MAX_PASSWORD_LENGTH: CORE_VALUES.SIZES.MEDIUM,             // 100
    
    // 登录尝试限制
    MAX_LOGIN_ATTEMPTS: CORE_VALUES.QUANTITIES.FIVE,           // 5
    LOCKOUT_DURATION_MINUTES: CORE_VALUES.SIZES.SMALL,        // 50
    
    // Token长度限制
    MIN_TOKEN_LENGTH: CORE_VALUES.SIZES.SMALL,                 // 50
    MAX_TOKEN_LENGTH: CORE_VALUES.SIZES.LARGE,                 // 500
  },
});

/**
 * 类型定义
 */
export type CoreLimits = typeof CORE_LIMITS;
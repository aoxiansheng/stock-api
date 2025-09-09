/**
 * Core 模块限制常量
 * 🎯 从 common/constants/foundation/core-limits.constants.ts 剥离的核心限制配置
 * 专用于 Core 模块的系统边界值和限制定义
 */

import { NUMERIC_CONSTANTS } from '../../../common/constants/core';

/**
 * 核心限制配置
 * 基于数值常量构建，提供标准化的限制定义
 */
export const CORE_LIMITS = Object.freeze({
  /**
   * 字符串长度限制
   * 🎯 统一命名规范：MAX_LENGTH结尾
   */
  STRING_LENGTH: {
    MIN_LENGTH: NUMERIC_CONSTANTS.N_1,
    SHORT_MAX_LENGTH: NUMERIC_CONSTANTS.N_50,        // 50 - 短字符串
    MEDIUM_MAX_LENGTH: NUMERIC_CONSTANTS.N_100,      // 100 - 中等字符串
    LONG_MAX_LENGTH: NUMERIC_CONSTANTS.N_500,        // 500 - 长字符串
    EXTRA_LONG_MAX_LENGTH: NUMERIC_CONSTANTS.N_1000, // 1000 - 超长字符串
    
    // 不同用途的长度限制
    NAME_MAX_LENGTH: NUMERIC_CONSTANTS.N_100,         // 100 - 名称最大长度
    DESCRIPTION_MAX_LENGTH: NUMERIC_CONSTANTS.N_500,  // 500 - 描述最大长度
    COMMENT_MAX_LENGTH: NUMERIC_CONSTANTS.N_1000,     // 1000 - 评论最大长度
    
    // 特殊用途长度限制
    URL_MAX_LENGTH: NUMERIC_CONSTANTS.N_2048,         // 2048 - URL最大长度
    EMAIL_MAX_LENGTH: NUMERIC_CONSTANTS.N_255,        // 255 - 邮箱最大长度（接近RFC标准）
    PHONE_MAX_LENGTH: NUMERIC_CONSTANTS.N_20,         // 20 - 电话号码最大长度
  },

  /**
   * ID长度限制
   */
  ID_LENGTH: {
    UUID_LENGTH: NUMERIC_CONSTANTS.N_36,              // 36 - UUID长度
    SHORTID_LENGTH: 12,                               // 12 - ShortID长度
    MONGODB_ID_LENGTH: 24,                            // 24 - MongoDB ObjectId长度
    CUSTOM_ID_MIN: NUMERIC_CONSTANTS.N_3,             // 3 - 自定义ID最小长度
    CUSTOM_ID_MAX: NUMERIC_CONSTANTS.N_50,            // 50 - 自定义ID最大长度
  },

  /**
   * 数值范围限制
   */
  NUMERIC_RANGE: {
    MIN_VALUE: NUMERIC_CONSTANTS.N_0,
    MAX_VALUE: NUMERIC_CONSTANTS.N_MAX_SAFE_INTEGER,
    
    // 百分比范围
    PERCENTAGE_MIN: NUMERIC_CONSTANTS.N_0,       // 0
    PERCENTAGE_MAX: NUMERIC_CONSTANTS.N_100,       // 100
    
    // 计数器范围
    COUNT_MIN: NUMERIC_CONSTANTS.N_0,
    COUNT_MAX: NUMERIC_CONSTANTS.N_MAX_SAFE_INTEGER,
    
    // 阈值范围
    THRESHOLD_MIN: NUMERIC_CONSTANTS.N_0,
    THRESHOLD_MAX: NUMERIC_CONSTANTS.N_MAX_SAFE_INTEGER,
    
    // 优先级范围
    PRIORITY_MIN: NUMERIC_CONSTANTS.N_1,              // 1 - 最高优先级
    PRIORITY_MAX: NUMERIC_CONSTANTS.N_10,             // 10 - 最低优先级
  },

  /**
   * 批量操作限制
   * 🎯 解决MAX_BATCH_SIZE重复定义问题
   */
  BATCH_LIMITS: {
    // 通用批量大小
    DEFAULT_BATCH_SIZE: NUMERIC_CONSTANTS.N_100,      // 100 - 默认批量大小
    MIN_BATCH_SIZE: NUMERIC_CONSTANTS.N_1,            // 1 - 最小批量大小
    MAX_BATCH_SIZE: NUMERIC_CONSTANTS.N_1000,         // 1000 - 最大批量大小 🎯
    OPTIMAL_BATCH_SIZE: NUMERIC_CONSTANTS.N_50,       // 50 - 最优批量大小
    
    // 特定场景批量限制
    TINY_BATCH_SIZE: NUMERIC_CONSTANTS.N_6,           // 6 - 微批量
    SMALL_BATCH_SIZE: NUMERIC_CONSTANTS.N_50,         // 50 - 小批量
    MEDIUM_BATCH_SIZE: NUMERIC_CONSTANTS.N_100,       // 100 - 中等批量
    LARGE_BATCH_SIZE: NUMERIC_CONSTANTS.N_500,        // 500 - 大批量
    
    // 数据处理批量限制
    DB_BATCH_SIZE: NUMERIC_CONSTANTS.N_100,           // 100 - 数据库批量操作
    CACHE_BATCH_SIZE: NUMERIC_CONSTANTS.N_50,         // 50 - 缓存批量操作
    API_BATCH_SIZE: NUMERIC_CONSTANTS.N_20,           // 20 - API批量操作
  },

  /**
   * 分页限制
   * 🎯 解决MAX_PAGE_SIZE命名不一致问题
   */
  PAGINATION: {
    DEFAULT_PAGE_SIZE: NUMERIC_CONSTANTS.N_20,        // 20 - 默认分页大小
    MIN_PAGE_SIZE: NUMERIC_CONSTANTS.N_1,             // 1 - 最小分页大小
    MAX_PAGE_SIZE: NUMERIC_CONSTANTS.N_100,           // 100 - 最大分页大小
    SMALL_PAGE_SIZE: NUMERIC_CONSTANTS.N_6,           // 6 - 小分页大小
    LARGE_PAGE_SIZE: NUMERIC_CONSTANTS.N_50,          // 50 - 大分页大小
    
    // 页码限制
    MIN_PAGE_NUMBER: NUMERIC_CONSTANTS.N_1,           // 1 - 最小页码
    MAX_PAGE_NUMBER: NUMERIC_CONSTANTS.N_10000,       // 10000 - 最大页码
    
    // 分页偏移量限制
    MIN_OFFSET: NUMERIC_CONSTANTS.N_0,                // 0 - 最小偏移量
    MAX_OFFSET: NUMERIC_CONSTANTS.N_100000,           // 100000 - 最大偏移量
  },

  /**
   * 并发限制
   */
  CONCURRENCY: {
    DEFAULT_WORKERS: NUMERIC_CONSTANTS.N_6,           // 6 - 默认工作进程数
    MIN_WORKERS: NUMERIC_CONSTANTS.N_1,               // 1 - 最小工作进程数
    MAX_WORKERS: NUMERIC_CONSTANTS.N_50,              // 50 - 最大工作进程数
    
    // 线程池限制
    THREAD_POOL_SIZE: NUMERIC_CONSTANTS.N_10,         // 10 - 线程池大小
    
    // 并发请求限制
    MAX_CONCURRENT_REQUESTS: NUMERIC_CONSTANTS.N_100, // 100 - 最大并发请求
    
    // 队列大小限制
    MAX_QUEUE_SIZE: NUMERIC_CONSTANTS.N_1000,         // 1000 - 最大队列大小
  },

  /**
   * 频率限制
   * 🎯 统一频率限制命名
   */
  RATE_LIMITS: {
    // 每分钟请求限制
    DEFAULT_PER_MINUTE: NUMERIC_CONSTANTS.N_100,      // 100 - 默认每分钟请求
    HIGH_PER_MINUTE: NUMERIC_CONSTANTS.N_1000,        // 1000 - 高频每分钟请求
    LOW_PER_MINUTE: NUMERIC_CONSTANTS.N_10,           // 10 - 低频每分钟请求
    
    // 每小时请求限制
    DEFAULT_PER_HOUR: NUMERIC_CONSTANTS.N_5000,       // 5000 - 默认每小时请求
    HIGH_PER_HOUR: NUMERIC_CONSTANTS.N_50 * 1000,     // 50000 - 高频每小时请求
    
    // 重试次数限制
    DEFAULT_RETRIES: NUMERIC_CONSTANTS.N_3,           // 3
    MIN_RETRIES: NUMERIC_CONSTANTS.N_0,               // 0
    MAX_RETRIES: NUMERIC_CONSTANTS.N_10,              // 10
    
    // 重试间隔限制 (毫秒)
    MIN_RETRY_INTERVAL: NUMERIC_CONSTANTS.N_100,      // 100ms
    MAX_RETRY_INTERVAL: NUMERIC_CONSTANTS.N_10000,    // 10000ms
  },

  /**
   * 存储限制
   */
  STORAGE: {
    // 缓存条目数限制
    MAX_CACHE_ENTRIES: NUMERIC_CONSTANTS.N_10000,     // 10000 - 最大缓存条目
    DEFAULT_CACHE_ENTRIES: NUMERIC_CONSTANTS.N_1000,  // 1000 - 默认缓存条目
    
    // 文件大小限制 (字节)
    MAX_FILE_SIZE_BYTES: NUMERIC_CONSTANTS.N_10 * 1024 * 1024,    // 10MB
    MAX_JSON_SIZE_BYTES: NUMERIC_CONSTANTS.N_1000 * 1024,         // 1MB
    MAX_LOG_SIZE_BYTES: NUMERIC_CONSTANTS.N_100 * 1024 * 1024,    // 100MB
    
    // 数据库限制
    MAX_QUERY_RESULTS: NUMERIC_CONSTANTS.N_10000,     // 10000 - 最大查询结果数
    MAX_INDEX_SIZE: NUMERIC_CONSTANTS.N_64,           // 64 - 最大索引大小 (MB)
  },

  /**
   * 搜索和查询限制
   */
  SEARCH: {
    MIN_SEARCH_LENGTH: NUMERIC_CONSTANTS.N_1,         // 1 - 最小搜索长度
    MAX_SEARCH_LENGTH: NUMERIC_CONSTANTS.N_100,       // 100 - 最大搜索长度
    MAX_SEARCH_RESULTS: NUMERIC_CONSTANTS.N_1000,     // 1000 - 最大搜索结果
    DEFAULT_SEARCH_RESULTS: NUMERIC_CONSTANTS.N_50,   // 50 - 默认搜索结果
    
    // 搜索字段限制
    MAX_SEARCH_FIELDS: NUMERIC_CONSTANTS.N_10,        // 10 - 最大搜索字段数
    
    // 搜索条件限制
    MAX_SEARCH_CONDITIONS: NUMERIC_CONSTANTS.N_20,    // 20 - 最大搜索条件数
  },

  /**
   * 安全限制
   */
  SECURITY: {
    // 密码长度限制
    PASSWORD_MIN_LENGTH: NUMERIC_CONSTANTS.N_8,       // 8 - 密码最小长度
    PASSWORD_MAX_LENGTH: 128,                         // 128 - 密码最大长度
    
    // 登录尝试限制
    MAX_LOGIN_ATTEMPTS: NUMERIC_CONSTANTS.N_5,        // 5 - 最大登录尝试次数
    LOCKOUT_DURATION_MINUTES: NUMERIC_CONSTANTS.N_30, // 30 - 锁定时间（分钟）
    
    // Token长度限制
    TOKEN_MIN_LENGTH: 32,                             // 32 - Token最小长度
    TOKEN_MAX_LENGTH: 512,                            // 512 - Token最大长度
    
    // 会话限制
    SESSION_TIMEOUT_MINUTES: NUMERIC_CONSTANTS.N_30,  // 30 - 会话超时（分钟）
    MAX_SESSIONS_PER_USER: NUMERIC_CONSTANTS.N_5,     // 5 - 每用户最大会话数
  },

  /**
   * 时间限制
   */
  TIME_LIMITS: {
    // 超时限制 (秒)
    DEFAULT_TIMEOUT: NUMERIC_CONSTANTS.N_30,          // 30 - 默认超时
    SHORT_TIMEOUT: NUMERIC_CONSTANTS.N_5,             // 5 - 短超时
    LONG_TIMEOUT: NUMERIC_CONSTANTS.N_300,            // 300 - 长超时
    
    // TTL限制 (秒)
    MIN_TTL: NUMERIC_CONSTANTS.N_60,                  // 60 - 最小TTL（1分钟）
    MAX_TTL: NUMERIC_CONSTANTS.N_86400 * 7,           // 7天 - 最大TTL
    DEFAULT_TTL: NUMERIC_CONSTANTS.N_3600,            // 3600 - 默认TTL（1小时）
  },

  /**
   * 网络限制
   */
  NETWORK: {
    // 连接限制
    MAX_CONNECTIONS: NUMERIC_CONSTANTS.N_1000,        // 1000 - 最大连接数
    CONNECTION_TIMEOUT: NUMERIC_CONSTANTS.N_30,       // 30 - 连接超时（秒）
    
    // 传输限制
    MAX_PAYLOAD_SIZE: NUMERIC_CONSTANTS.N_10 * 1024 * 1024, // 10MB - 最大负载大小
    MAX_HEADERS_SIZE: NUMERIC_CONSTANTS.N_8 * 1024,   // 8KB - 最大头部大小
    
    // 带宽限制
    MAX_BANDWIDTH_MBPS: NUMERIC_CONSTANTS.N_100,      // 100 - 最大带宽（Mbps）
  },
});

/**
 * Core 限制工具类
 * 🎯 提供限制相关的工具函数
 */
export class CoreLimitsUtil {
  /**
   * 验证字符串长度
   */
  static validateStringLength(value: string, type: 'short' | 'medium' | 'long' | 'extra_long' = 'medium'): boolean {
    const limits = CORE_LIMITS.STRING_LENGTH;
    const maxLengths = {
      short: limits.SHORT_MAX_LENGTH,
      medium: limits.MEDIUM_MAX_LENGTH,
      long: limits.LONG_MAX_LENGTH,
      extra_long: limits.EXTRA_LONG_MAX_LENGTH,
    };
    
    return value.length >= limits.MIN_LENGTH && value.length <= maxLengths[type];
  }

  /**
   * 获取推荐的批量大小
   */
  static getRecommendedBatchSize(operation: 'tiny' | 'small' | 'medium' | 'large' | 'default'): number {
    const limits = CORE_LIMITS.BATCH_LIMITS;
    switch (operation) {
      case 'tiny': return limits.TINY_BATCH_SIZE;
      case 'small': return limits.SMALL_BATCH_SIZE;
      case 'medium': return limits.MEDIUM_BATCH_SIZE;
      case 'large': return limits.LARGE_BATCH_SIZE;
      default: return limits.DEFAULT_BATCH_SIZE;
    }
  }

  /**
   * 验证分页参数
   */
  static validatePagination(page: number, size: number): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const limits = CORE_LIMITS.PAGINATION;
    
    if (page < limits.MIN_PAGE_NUMBER) {
      errors.push(`页码不能小于 ${limits.MIN_PAGE_NUMBER}`);
    }
    
    if (page > limits.MAX_PAGE_NUMBER) {
      errors.push(`页码不能大于 ${limits.MAX_PAGE_NUMBER}`);
    }
    
    if (size < limits.MIN_PAGE_SIZE) {
      errors.push(`页面大小不能小于 ${limits.MIN_PAGE_SIZE}`);
    }
    
    if (size > limits.MAX_PAGE_SIZE) {
      errors.push(`页面大小不能大于 ${limits.MAX_PAGE_SIZE}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 计算分页偏移量
   */
  static calculateOffset(page: number, size: number): number {
    const offset = (page - 1) * size;
    return Math.min(offset, CORE_LIMITS.PAGINATION.MAX_OFFSET);
  }

  /**
   * 验证ID格式
   */
  static validateId(id: string, type: 'uuid' | 'shortid' | 'mongodb' | 'custom'): boolean {
    const limits = CORE_LIMITS.ID_LENGTH;
    
    switch (type) {
      case 'uuid':
        return id.length === limits.UUID_LENGTH && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      case 'shortid':
        return id.length === limits.SHORTID_LENGTH && /^[A-Za-z0-9_-]+$/.test(id);
      case 'mongodb':
        return id.length === limits.MONGODB_ID_LENGTH && /^[0-9a-f]{24}$/i.test(id);
      case 'custom':
        return id.length >= limits.CUSTOM_ID_MIN && id.length <= limits.CUSTOM_ID_MAX;
      default:
        return false;
    }
  }

  /**
   * 检查是否超出存储限制
   */
  static checkStorageLimit(sizeBytes: number, type: 'file' | 'json' | 'log'): boolean {
    const limits = CORE_LIMITS.STORAGE;
    
    switch (type) {
      case 'file': return sizeBytes <= limits.MAX_FILE_SIZE_BYTES;
      case 'json': return sizeBytes <= limits.MAX_JSON_SIZE_BYTES;
      case 'log': return sizeBytes <= limits.MAX_LOG_SIZE_BYTES;
      default: return false;
    }
  }

  /**
   * 格式化大小显示
   */
  static formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * 获取安全的数组切片
   */
  static safeSlice<T>(array: T[], start: number, end?: number): T[] {
    const maxLength = CORE_LIMITS.BATCH_LIMITS.MAX_BATCH_SIZE;
    const actualEnd = end !== undefined ? Math.min(end, start + maxLength) : Math.min(array.length, start + maxLength);
    
    return array.slice(start, actualEnd);
  }
}

/**
 * 类型定义
 */
export type CoreLimits = typeof CORE_LIMITS;
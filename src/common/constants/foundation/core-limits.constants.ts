/**
 * 核心限制常量
 * 🏛️ Foundation层 - 系统边界值和限制的统一定义
 * 📏 解决MAX_BATCH_SIZE、MAX_PAGE_SIZE等重复和命名不一致问题
 */

import { NUMERIC_CONSTANTS } from '../core';
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
    MIN_LENGTH: NUMERIC_CONSTANTS.N_1,
    
    // 不同用途的长度限制
    
    // 特殊用途长度限制
    URL_MAX_LENGTH: NUMERIC_CONSTANTS.N_2048,         // 2048 - URL最大长度
  },

  /**
   * ID长度限制
   */
  ID_LENGTH: {
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
  },

  /**
   * 批量操作限制
   * 🎯 解决MAX_BATCH_SIZE重复定义问题
   */
  BATCH_LIMITS: {
    // 通用批量大小
    DEFAULT_BATCH_SIZE: NUMERIC_CONSTANTS.N_100,      // 100 - 默认批量大小
    MIN_BATCH_SIZE: NUMERIC_CONSTANTS.N_1,        // 1 - 最小批量大小
    MAX_BATCH_SIZE: NUMERIC_CONSTANTS.N_1000,            // 1000 - 最大批量大小 🎯
    OPTIMAL_BATCH_SIZE: NUMERIC_CONSTANTS.N_50,       // 50 - 最优批量大小
    
    // 特定场景批量限制
    TINY_BATCH_SIZE: NUMERIC_CONSTANTS.N_6,           // 6 - 微批量
    SMALL_BATCH_SIZE: NUMERIC_CONSTANTS.N_50,         // 50 - 小批量
  },

  /**
   * 分页限制
   * 🎯 解决MAX_PAGE_SIZE命名不一致问题
   */
  PAGINATION: {
    DEFAULT_PAGE_SIZE: NUMERIC_CONSTANTS.N_6,         // 6 - 默认分页大小
    
    // 页码限制
  },

  /**
   * 并发限制
   */
  CONCURRENCY: {
    DEFAULT_WORKERS: NUMERIC_CONSTANTS.N_6,           // 6 - 默认工作进程数
    MIN_WORKERS: NUMERIC_CONSTANTS.N_1,           // 1 - 最小工作进程数
    MAX_WORKERS: NUMERIC_CONSTANTS.N_50,              // 50 - 最大工作进程数
    
  },

  /**
   * 频率限制
   * 🎯 统一频率限制命名
   */
  RATE_LIMITS: {
    // 每分钟请求限制
    
    // 每小时请求限制
    
    // 重试次数限制
    DEFAULT_RETRIES: NUMERIC_CONSTANTS.N_3,      // 3
    MIN_RETRIES: NUMERIC_CONSTANTS.N_0,                  // 0
    MAX_RETRIES: NUMERIC_CONSTANTS.N_6,                       // 6
  },

  /**
   * 存储限制
   */
  STORAGE: {
    // 缓存条目数限制
    
    // 文件大小限制 (字节)
    MAX_JSON_SIZE_BYTES: NUMERIC_CONSTANTS.N_1000 * 1024,        // 1MB
  },

  /**
   * 搜索和查询限制
   */
  SEARCH: {
    
  },

  /**
   * 安全限制
   */
  SECURITY: {
    // 密码长度限制
    
    // 登录尝试限制
    
    // Token长度限制
  },
});

/**
 * 类型定义
 */
export type CoreLimits = typeof CORE_LIMITS;
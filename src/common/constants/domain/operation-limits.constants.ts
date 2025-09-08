/**
 * 操作限制常量
 * 🎯 Domain层 - 操作相关的业务领域专用常量
 * ⏱️ 统一超时时间、批量大小、缓存TTL等重复数字
 * 
 * 解决的重复问题：
 * - 1000ms 快速操作超时 (261次重复)
 * - 5000ms 监控请求超时 (85次重复)  
 * - 10000ms 数据库操作超时 (100次重复)
 * - 30000ms API请求超时 (55次重复)
 * - 100 默认分页大小 (361次重复)
 * - 3600, 86400 缓存TTL (46, 32次重复)
 */

import { CORE_VALUES } from '../foundation';

/**
 * 操作限制配置常量
 * 🎯 解决系统中大量重复的超时、大小、TTL等配置数字
 */
export const OPERATION_LIMITS = Object.freeze({
  /**
   * 超时时间配置 (毫秒)
   * 🔥 解决大量超时时间的重复定义
   */
  TIMEOUTS_MS: {
    // 快速操作 - 1秒内完成
    QUICK_OPERATION: 1000,         // 1秒 - 快速操作 (261次重复)
    CACHE_LOOKUP: 1000,            // 1秒 - 缓存查询
    VALIDATION: 1000,              // 1秒 - 数据验证
    
    // 监控相关操作 - 5秒内完成  
    MONITORING_REQUEST: 5000,      // 5秒 - 监控请求 (85次重复)
    
    // 数据库操作 - 10秒内完成
    DATABASE_OPERATION: 10000,     // 10秒 - 数据库操作 (100次重复)  
    
    // API请求操作 - 30秒内完成
    API_REQUEST: 30000,            // 30秒 - API请求超时 (55次重复)
    
    // 长时间操作 - 60秒内完成
    BATCH_PROCESSING: 60000,       // 60秒 - 批量处理
    FILE_PROCESSING: 60000,        // 60秒 - 文件处理
    
    // 超长操作 - 5分钟内完成
  },
  
  /**
   * 批量处理大小配置
   * 🔥 解决批量大小的重复定义
   */
  BATCH_SIZES: {
    // 分页相关
    DEFAULT_PAGE_SIZE: 100,        // 默认分页大小 (361次重复)
    
    // 批量处理
    SMALL_BATCH: 10,               // 小批量处理
    STANDARD_BATCH: 100,           // 标准批量处理 (361次重复)
    MEDIUM_BATCH: 500,             // 中等批量处理
    LARGE_BATCH: 1000,             // 大批量处理 (261次重复)
    ENTERPRISE_BATCH: 10000,       // 企业级批量 (100次重复)
    
    // 数据库操作批量
    
    // 缓存操作批量
  },
  
  /**
   * 缓存TTL配置 (秒)
   * 🔥 解决缓存时间的重复定义
   */
  CACHE_TTL_SECONDS: {
    // 极短期缓存 - 秒级
    VERY_SHORT: 5,                 // 5秒 - 极短期
    SHORT: 30,                     // 30秒 - 短期
    
    // 短期缓存 - 分钟级
    SHORT_CACHE: 300,              // 5分钟短期缓存 (61次重复)
    MEDIUM: 1800,                  // 30分钟
    
    // 中期缓存 - 小时级
    HOURLY_CACHE: 3600,            // 1小时缓存 (46次重复)
    
    // 长期缓存 - 天级
    DAILY_CACHE: 86400,            // 1天缓存 (32次重复)
    
    // 特殊用途
    SESSION: 7200,                 // 2小时 - 会话缓存
    TOKEN: 3600,                   // 1小时 - 令牌缓存
    CONFIG: 86400,                 // 1天 - 配置缓存
    METADATA: 43200,               // 12小时 - 元数据缓存
  },
  
  /**
   * 并发控制配置
   * 🔥 统一并发处理限制
   */
  CONCURRENCY_LIMITS: {
    // 请求并发
    
    // 处理并发
    
    // 连接池
  },
  
  /**
   * 重试配置
   * 🔥 统一重试策略配置
   */
  RETRY_LIMITS: {
    // 基础重试配置
    MAX_RETRIES: CORE_VALUES.RETRY.MAX_ATTEMPTS,           // 最大重试次数 - 3
    RETRY_DELAY_MS: CORE_VALUES.RETRY.DELAY_MS,            // 重试延迟 - 1000ms
    MAX_RETRY_DELAY_MS: CORE_VALUES.RETRY.MAX_DELAY_MS,    // 最大重试延迟 - 10000ms
    BACKOFF_MULTIPLIER: CORE_VALUES.RETRY.BACKOFF_BASE,    // 退避乘数 - 2
    
    // 特殊场景重试
  },
  
  /**
   * 内存使用限制
   * 🔥 统一内存使用控制
   */
  MEMORY_LIMITS: {
    // 内存使用阈值 (MB)
    HIGH_MEMORY_MB: CORE_VALUES.MEMORY_MB.HIGH_USAGE,     // 200MB
    CRITICAL_MEMORY_MB: CORE_VALUES.MEMORY_MB.CRITICAL_USAGE, // 500MB
    
    // 对象大小限制 (MB)
    
    // 缓存大小限制
  }
} as const);

/**
 * 操作限制工具函数
 * 🛠️ 提供基于常量的操作控制逻辑
 */
export class OperationLimitsUtil {
  /**
   * 根据操作类型获取推荐超时时间
   */
  static getRecommendedTimeout(operationType: OperationType): number {
    switch (operationType) {
      case 'cache': return OPERATION_LIMITS.TIMEOUTS_MS.CACHE_LOOKUP;
      case 'validation': return OPERATION_LIMITS.TIMEOUTS_MS.VALIDATION;
      case 'monitoring': return OPERATION_LIMITS.TIMEOUTS_MS.MONITORING_REQUEST;
      case 'database': return OPERATION_LIMITS.TIMEOUTS_MS.DATABASE_OPERATION;
      case 'api': return OPERATION_LIMITS.TIMEOUTS_MS.API_REQUEST;
      case 'batch': return OPERATION_LIMITS.TIMEOUTS_MS.BATCH_PROCESSING;
      case 'file': return OPERATION_LIMITS.TIMEOUTS_MS.FILE_PROCESSING;
      default: return OPERATION_LIMITS.TIMEOUTS_MS.QUICK_OPERATION;
    }
  }
  
  /**
   * 根据数据量获取推荐批量大小
   */
  static getRecommendedBatchSize(dataVolume: DataVolume): number {
    switch (dataVolume) {
      case 'small': return OPERATION_LIMITS.BATCH_SIZES.SMALL_BATCH;
      case 'medium': return OPERATION_LIMITS.BATCH_SIZES.MEDIUM_BATCH;
      case 'large': return OPERATION_LIMITS.BATCH_SIZES.LARGE_BATCH;
      case 'enterprise': return OPERATION_LIMITS.BATCH_SIZES.ENTERPRISE_BATCH;
      default: return OPERATION_LIMITS.BATCH_SIZES.STANDARD_BATCH;
    }
  }
  
  /**
   * 根据数据类型获取推荐缓存TTL
   */
  static getRecommendedCacheTTL(dataType: CacheDataType): number {
    switch (dataType) {
      case 'realtime': return OPERATION_LIMITS.CACHE_TTL_SECONDS.VERY_SHORT;
      case 'frequent': return OPERATION_LIMITS.CACHE_TTL_SECONDS.SHORT_CACHE;
      case 'session': return OPERATION_LIMITS.CACHE_TTL_SECONDS.SESSION;
      case 'config': return OPERATION_LIMITS.CACHE_TTL_SECONDS.CONFIG;
      case 'metadata': return OPERATION_LIMITS.CACHE_TTL_SECONDS.METADATA;
      case 'static': return OPERATION_LIMITS.CACHE_TTL_SECONDS.DAILY_CACHE;
      default: return OPERATION_LIMITS.CACHE_TTL_SECONDS.HOURLY_CACHE;
    }
  }
  
  /**
   * 检查内存使用是否超限
   */
  static isMemoryUsageHigh(usageMB: number): boolean {
    return usageMB >= OPERATION_LIMITS.MEMORY_LIMITS.HIGH_MEMORY_MB;
  }
  
  /**
   * 检查内存使用是否危险
   */
  static isMemoryUsageCritical(usageMB: number): boolean {
    return usageMB >= OPERATION_LIMITS.MEMORY_LIMITS.CRITICAL_MEMORY_MB;
  }
  
  /**
   * 根据失败次数计算重试延迟
   */
  static calculateRetryDelay(attempt: number, baseDelay: number = OPERATION_LIMITS.RETRY_LIMITS.RETRY_DELAY_MS): number {
    const delay = baseDelay * Math.pow(OPERATION_LIMITS.RETRY_LIMITS.BACKOFF_MULTIPLIER, attempt - 1);
    return Math.min(delay, OPERATION_LIMITS.RETRY_LIMITS.MAX_RETRY_DELAY_MS);
  }
  
  /**
   * 检查是否应该重试
   */
  static shouldRetry(attempt: number, maxRetries: number = OPERATION_LIMITS.RETRY_LIMITS.MAX_RETRIES): boolean {
    return attempt <= maxRetries;
  }
}

/**
 * 类型定义
 */
export type OperationType = 'cache' | 'validation' | 'monitoring' | 'database' | 'api' | 'batch' | 'file';
export type DataVolume = 'small' | 'medium' | 'large' | 'enterprise';
export type CacheDataType = 'realtime' | 'frequent' | 'session' | 'config' | 'metadata' | 'static';

export type OperationLimitsConstants = typeof OPERATION_LIMITS;
export type TimeoutsMS = typeof OPERATION_LIMITS.TIMEOUTS_MS;
export type BatchSizes = typeof OPERATION_LIMITS.BATCH_SIZES;
export type CacheTTL = typeof OPERATION_LIMITS.CACHE_TTL_SECONDS;
export type ConcurrencyLimits = typeof OPERATION_LIMITS.CONCURRENCY_LIMITS;
export type RetryLimits = typeof OPERATION_LIMITS.RETRY_LIMITS;
export type MemoryLimits = typeof OPERATION_LIMITS.MEMORY_LIMITS;
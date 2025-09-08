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
    HEALTH_CHECK: 5000,            // 5秒 - 健康检查
    METRICS_COLLECTION: 5000,      // 5秒 - 指标收集
    
    // 数据库操作 - 10秒内完成
    DATABASE_OPERATION: 10000,     // 10秒 - 数据库操作 (100次重复)  
    DATABASE_QUERY: 10000,         // 10秒 - 数据库查询
    DATABASE_WRITE: 10000,         // 10秒 - 数据库写入
    
    // API请求操作 - 30秒内完成
    API_REQUEST: 30000,            // 30秒 - API请求超时 (55次重复)
    EXTERNAL_SERVICE: 30000,       // 30秒 - 外部服务调用
    PROVIDER_REQUEST: 30000,       // 30秒 - 数据提供商请求
    
    // 长时间操作 - 60秒内完成
    LONG_OPERATION: 60000,         // 60秒 - 长时间操作 (43次重复)
    BATCH_PROCESSING: 60000,       // 60秒 - 批量处理
    FILE_PROCESSING: 60000,        // 60秒 - 文件处理
    
    // 超长操作 - 5分钟内完成
    BULK_OPERATION: 300000,        // 5分钟 - 批量操作
    MIGRATION: 300000,             // 5分钟 - 数据迁移
    BACKUP: 300000,                // 5分钟 - 备份操作
  },
  
  /**
   * 批量处理大小配置
   * 🔥 解决批量大小的重复定义
   */
  BATCH_SIZES: {
    // 分页相关
    DEFAULT_PAGE_SIZE: 100,        // 默认分页大小 (361次重复)
    MIN_PAGE_SIZE: 1,              // 最小分页大小
    MAX_PAGE_SIZE: 1000,           // 最大分页大小
    
    // 批量处理
    SMALL_BATCH: 10,               // 小批量处理
    STANDARD_BATCH: 100,           // 标准批量处理 (361次重复)
    MEDIUM_BATCH: 500,             // 中等批量处理
    LARGE_BATCH: 1000,             // 大批量处理 (261次重复)
    ENTERPRISE_BATCH: 10000,       // 企业级批量 (100次重复)
    
    // 数据库操作批量
    DB_INSERT_BATCH: 500,          // 数据库插入批量
    DB_UPDATE_BATCH: 200,          // 数据库更新批量
    DB_DELETE_BATCH: 100,          // 数据库删除批量
    
    // 缓存操作批量
    CACHE_SET_BATCH: 100,          // 缓存设置批量
    CACHE_GET_BATCH: 200,          // 缓存获取批量
    CACHE_DELETE_BATCH: 50,        // 缓存删除批量
  },
  
  /**
   * 缓存TTL配置 (秒)
   * 🔥 解决缓存时间的重复定义
   */
  CACHE_TTL_SECONDS: {
    // 极短期缓存 - 秒级
    IMMEDIATE: 1,                  // 1秒 - 立即过期
    VERY_SHORT: 5,                 // 5秒 - 极短期
    SHORT: 30,                     // 30秒 - 短期
    
    // 短期缓存 - 分钟级
    SHORT_CACHE: 300,              // 5分钟短期缓存 (61次重复)
    MEDIUM_SHORT: 900,             // 15分钟
    MEDIUM: 1800,                  // 30分钟
    
    // 中期缓存 - 小时级
    HOURLY_CACHE: 3600,            // 1小时缓存 (46次重复)
    HALF_DAY: 43200,               // 12小时
    
    // 长期缓存 - 天级
    DAILY_CACHE: 86400,            // 1天缓存 (32次重复)
    WEEKLY_CACHE: 604800,          // 7天缓存
    MONTHLY_CACHE: 2592000,        // 30天缓存
    
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
    MAX_CONCURRENT_REQUESTS: 10,   // 最大并发请求数 (324次重复)
    MAX_CONCURRENT_DB: 5,          // 最大并发数据库连接
    MAX_CONCURRENT_API: 3,         // 最大并发API调用
    
    // 处理并发
    MAX_CONCURRENT_WORKERS: 4,     // 最大并发工作线程
    MAX_CONCURRENT_JOBS: 2,        // 最大并发任务
    MAX_CONCURRENT_UPLOADS: 3,     // 最大并发上传
    
    // 连接池
    MIN_POOL_SIZE: CORE_VALUES.CONNECTION_POOL.MIN_SIZE,  // 最小连接池大小 - 5
    MAX_POOL_SIZE: CORE_VALUES.CONNECTION_POOL.MAX_SIZE,  // 最大连接池大小 - 20
    POOL_ACQUIRE_TIMEOUT: 10000,   // 连接池获取超时
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
    CRITICAL_MAX_RETRIES: CORE_VALUES.RETRY.CRITICAL_MAX_ATTEMPTS,     // 关键操作重试 - 5
    NETWORK_MAX_RETRIES: 3,        // 网络操作重试
    DATABASE_MAX_RETRIES: 2,       // 数据库操作重试
    API_MAX_RETRIES: 3,            // API调用重试
  },
  
  /**
   * 内存使用限制
   * 🔥 统一内存使用控制
   */
  MEMORY_LIMITS: {
    // 内存使用阈值 (MB)
    LOW_MEMORY_MB: CORE_VALUES.MEMORY_MB.LOW_USAGE,       // 50MB
    NORMAL_MEMORY_MB: CORE_VALUES.MEMORY_MB.NORMAL_USAGE, // 100MB
    HIGH_MEMORY_MB: CORE_VALUES.MEMORY_MB.HIGH_USAGE,     // 200MB
    CRITICAL_MEMORY_MB: CORE_VALUES.MEMORY_MB.CRITICAL_USAGE, // 500MB
    
    // 对象大小限制 (MB)
    MAX_OBJECT_SIZE_MB: CORE_VALUES.MEMORY_MB.MAX_OBJECT_SIZE,   // 10MB
    MAX_REQUEST_SIZE_MB: CORE_VALUES.MEMORY_MB.MAX_REQUEST_SIZE, // 50MB
    
    // 缓存大小限制
    MAX_CACHE_SIZE_MB: 100,        // 最大缓存大小
    MAX_BUFFER_SIZE_MB: 50,        // 最大缓冲区大小
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
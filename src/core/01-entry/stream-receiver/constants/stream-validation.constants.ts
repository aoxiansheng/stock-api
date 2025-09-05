/**
 * Stream Receiver 验证相关常量
 * 统一管理配置验证的阈值和规则
 */
export const STREAM_VALIDATION_LIMITS = {
  // 时间间隔限制 (毫秒)
  MIN_CLEANUP_INTERVAL_MS: 10000,         // 最小清理间隔: 10秒
  MAX_CLEANUP_INTERVAL_MS: 30 * 60 * 1000, // 最大清理间隔: 30分钟
  
  MIN_STALE_TIMEOUT_MS: 30000,            // 最小过期超时: 30秒
  MAX_STALE_TIMEOUT_MS: 10 * 60 * 1000,   // 最大过期超时: 10分钟
  
  MIN_BATCH_INTERVAL_MS: 100,             // 最小批处理间隔: 100毫秒
  MAX_BATCH_INTERVAL_MS: 5000,            // 最大批处理间隔: 5秒
  
  // 频率控制
  MIN_ADJUSTMENT_FREQUENCY_MS: 1000,       // 最小调整频率: 1秒
  MAX_ADJUSTMENT_FREQUENCY_MS: 60000,      // 最大调整频率: 60秒
  
  // 内存限制 (字节)
  MIN_MEMORY_CHECK_INTERVAL_MS: 5000,      // 最小内存检查间隔: 5秒
  MIN_MEMORY_WARNING_BYTES: 100 * 1024 * 1024, // 最小内存警告: 100MB
  MAX_MEMORY_LIMIT_BYTES: 512 * 1024 * 1024,   // 最大内存限制: 512MB
  
  // 速率限制
  MIN_RATE_LIMIT_WINDOW_MS: 1000,         // 最小速率限制窗口: 1秒
  MAX_RATE_LIMIT_WINDOW_MS: 60000,        // 最大速率限制窗口: 60秒
  
  MIN_RATE_LIMIT_COUNT: 1,                // 最小速率限制计数
  MAX_RATE_LIMIT_COUNT: 10000,            // 最大速率限制计数
} as const;

/**
 * 验证函数集合
 */
export const STREAM_VALIDATORS = {
  isValidCleanupInterval: (value: number): boolean => 
    value >= STREAM_VALIDATION_LIMITS.MIN_CLEANUP_INTERVAL_MS && 
    value <= STREAM_VALIDATION_LIMITS.MAX_CLEANUP_INTERVAL_MS,
    
  isValidStaleTimeout: (value: number): boolean =>
    value >= STREAM_VALIDATION_LIMITS.MIN_STALE_TIMEOUT_MS &&
    value <= STREAM_VALIDATION_LIMITS.MAX_STALE_TIMEOUT_MS,
    
  isValidBatchInterval: (value: number): boolean =>
    value >= STREAM_VALIDATION_LIMITS.MIN_BATCH_INTERVAL_MS &&
    value <= STREAM_VALIDATION_LIMITS.MAX_BATCH_INTERVAL_MS,
    
  isValidAdjustmentFrequency: (value: number): boolean =>
    value >= STREAM_VALIDATION_LIMITS.MIN_ADJUSTMENT_FREQUENCY_MS &&
    value <= STREAM_VALIDATION_LIMITS.MAX_ADJUSTMENT_FREQUENCY_MS,
    
  isValidMemoryCheckInterval: (value: number): boolean =>
    value >= STREAM_VALIDATION_LIMITS.MIN_MEMORY_CHECK_INTERVAL_MS,
    
  isValidMemoryLimit: (value: number): boolean =>
    value >= STREAM_VALIDATION_LIMITS.MIN_MEMORY_WARNING_BYTES &&
    value <= STREAM_VALIDATION_LIMITS.MAX_MEMORY_LIMIT_BYTES,
    
  isValidRateLimitWindow: (value: number): boolean =>
    value >= STREAM_VALIDATION_LIMITS.MIN_RATE_LIMIT_WINDOW_MS &&
    value <= STREAM_VALIDATION_LIMITS.MAX_RATE_LIMIT_WINDOW_MS,
    
  isValidRateLimitCount: (value: number): boolean =>
    value >= STREAM_VALIDATION_LIMITS.MIN_RATE_LIMIT_COUNT &&
    value <= STREAM_VALIDATION_LIMITS.MAX_RATE_LIMIT_COUNT,
} as const;
/**
 * 批量处理基础配置常量
 * 提供批量处理和重试策略的通用基础配置
 * 
 * 设计原则：
 * - 基础抽象：提供可继承的通用配置模板
 * - 合理默认：平衡性能和资源使用的默认值
 * - 可扩展性：支持业务层扩展和覆盖
 * - 防护策略：内置防止过载和雪崩的保护机制
 */

import { deepFreeze } from "@common/utils/object-immutability.util";

// 基础批量处理配置
export const BASE_BATCH_SETTINGS = deepFreeze({
  // 通用批量配置
  DEFAULT_BATCH_SIZE: 100,             // 默认批量大小
  MIN_BATCH_SIZE: 1,                   // 最小批量大小
  MAX_BATCH_SIZE: 1000,               // 最大批量大小
  OPTIMAL_BATCH_SIZE: 50,             // 最优批量大小（平衡性能与资源）

  // 并发控制基础配置
  MAX_CONCURRENT_OPERATIONS: 10,       // 最大并发操作数
  MAX_CONCURRENT_BATCHES: 5,          // 最大并发批次数

  // 分页基础配置
  DEFAULT_PAGE_SIZE: 10,              // 默认分页大小
  MAX_PAGE_SIZE: 100,                 // 最大分页大小
  MIN_PAGE_SIZE: 1,                   // 最小分页大小

  // 基础限制配置
  MAX_MEMORY_PER_BATCH_MB: 100,       // 每批次最大内存使用
  MAX_BATCH_PROCESSING_TIME_MS: 30000, // 单批次最大处理时间
  BATCH_TIMEOUT_MS: 60000,            // 批处理超时时间
});

// 基础重试配置
export const BASE_RETRY_SETTINGS = deepFreeze({
  // 重试次数配置
  MAX_RETRY_ATTEMPTS: 3,              // 默认最大重试次数
  MIN_RETRY_ATTEMPTS: 0,              // 最小重试次数
  CRITICAL_MAX_RETRY_ATTEMPTS: 5,     // 关键操作最大重试次数

  // 延迟配置
  RETRY_DELAY_MS: 1000,               // 初始重试延迟：1秒
  MIN_RETRY_DELAY_MS: 100,            // 最小重试延迟
  MAX_RETRY_DELAY_MS: 10000,          // 最大重试延迟：10秒
  CRITICAL_MAX_RETRY_DELAY_MS: 30000, // 关键操作最大延迟

  // 退避策略配置
  BACKOFF_MULTIPLIER: 2,              // 指数退避倍数
  MIN_BACKOFF_MULTIPLIER: 1.1,        // 最小退避倍数
  MAX_BACKOFF_MULTIPLIER: 3,          // 最大退避倍数

  // 抖动配置
  JITTER_FACTOR: 0.1,                 // 抖动因子（±10%）
  MAX_JITTER_FACTOR: 0.5,             // 最大抖动因子
});

// 基础处理策略
export const BASE_PROCESSING_STRATEGIES = deepFreeze({
  // 批量处理策略类型
  BATCH_STRATEGY_TYPES: {
    FIXED: 'FIXED',                   // 固定大小策略
    DYNAMIC: 'DYNAMIC',               // 动态调整策略
    ADAPTIVE: 'ADAPTIVE',             // 自适应策略
    TIME_WINDOW: 'TIME_WINDOW',       // 时间窗口策略
  },

  // 重试策略类型
  RETRY_STRATEGY_TYPES: {
    LINEAR: 'LINEAR',                 // 线性重试
    EXPONENTIAL: 'EXPONENTIAL',       // 指数退避
    FIBONACCI: 'FIBONACCI',           // 斐波那契退避
    CUSTOM: 'CUSTOM',                 // 自定义策略
  },

  // 失败处理策略
  FAILURE_STRATEGIES: {
    FAIL_FAST: 'FAIL_FAST',          // 快速失败
    CONTINUE: 'CONTINUE',             // 继续处理
    CIRCUIT_BREAKER: 'CIRCUIT_BREAKER', // 熔断策略
  },
});

// 基础错误处理配置
export const BASE_ERROR_HANDLING = deepFreeze({
  // 错误限制
  MAX_ERRORS_PER_BATCH: 10,           // 每批次最大错误数
  ERROR_RATE_THRESHOLD: 0.1,          // 错误率阈值（10%）
  CIRCUIT_BREAKER_THRESHOLD: 0.5,     // 熔断器阈值（50%）

  // 可重试的错误类型
  RETRYABLE_ERROR_TYPES: [
    'ECONNREFUSED',                   // 连接被拒绝
    'ENOTFOUND',                      // 域名解析失败
    'ETIMEDOUT',                      // 连接超时
    'ECONNRESET',                     // 连接重置
    'EPIPE',                          // 管道错误
    'EHOSTUNREACH',                   // 主机不可达
    'EAI_AGAIN',                      // 临时DNS失败
  ],

  // 可重试的HTTP状态码
  RETRYABLE_HTTP_CODES: [
    408,  // Request Timeout
    429,  // Too Many Requests
    500,  // Internal Server Error
    502,  // Bad Gateway
    503,  // Service Unavailable
    504,  // Gateway Timeout
  ],

  // 不可重试的业务错误
  NON_RETRYABLE_BUSINESS_CODES: [
    'INVALID_CREDENTIALS',            // 无效凭证
    'PERMISSION_DENIED',              // 权限被拒绝
    'RESOURCE_NOT_FOUND',             // 资源未找到
    'INVALID_PARAMETERS',             // 无效参数
    'QUOTA_EXCEEDED',                 // 配额超限
  ],
});

// 基础性能配置
export const BASE_PERFORMANCE_SETTINGS = deepFreeze({
  // 负载阈值
  LOAD_THRESHOLDS: {
    LOW: 0.3,                         // 低负载阈值
    MEDIUM: 0.6,                      // 中负载阈值
    HIGH: 0.8,                        // 高负载阈值
    CRITICAL: 0.9,                    // 临界负载阈值
  },

  // 调整参数
  ADJUSTMENT_FACTORS: {
    MIN_ADJUSTMENT: 0.5,              // 最小调整比例
    MAX_ADJUSTMENT: 2.0,              // 最大调整比例
    ADJUSTMENT_INTERVAL_MS: 60000,    // 调整间隔：1分钟
  },

  // 时间窗口配置
  TIME_WINDOWS: {
    DEFAULT_WINDOW_MS: 1000,          // 默认时间窗口：1秒
    MIN_WINDOW_MS: 100,               // 最小时间窗口
    MAX_WINDOW_MS: 60000,             // 最大时间窗口：1分钟
  },
});

// 导出统一的基础配置
export const PROCESSING_BASE_CONSTANTS = deepFreeze({
  BATCH: BASE_BATCH_SETTINGS,
  RETRY: BASE_RETRY_SETTINGS,
  STRATEGIES: BASE_PROCESSING_STRATEGIES,
  ERROR_HANDLING: BASE_ERROR_HANDLING,
  PERFORMANCE: BASE_PERFORMANCE_SETTINGS,
});

// 导出类型定义
export type BatchStrategyType = keyof typeof BASE_PROCESSING_STRATEGIES.BATCH_STRATEGY_TYPES;
export type RetryStrategyType = keyof typeof BASE_PROCESSING_STRATEGIES.RETRY_STRATEGY_TYPES;
export type FailureStrategyType = keyof typeof BASE_PROCESSING_STRATEGIES.FAILURE_STRATEGIES;

/**
 * 基础批量大小计算工具
 * @param totalItems 总项目数
 * @param maxBatchSize 最大批量大小
 * @param optimalBatches 理想批次数（默认5）
 */
export function calculateBaseBatchSize(
  totalItems: number,
  maxBatchSize: number = BASE_BATCH_SETTINGS.MAX_BATCH_SIZE,
  optimalBatches: number = 5
): number {
  if (totalItems <= BASE_BATCH_SETTINGS.DEFAULT_BATCH_SIZE) {
    return totalItems;
  }

  const calculatedSize = Math.ceil(totalItems / optimalBatches);
  return Math.min(maxBatchSize, Math.max(BASE_BATCH_SETTINGS.MIN_BATCH_SIZE, calculatedSize));
}

/**
 * 基础重试延迟计算工具
 * @param attempt 当前重试次数（从0开始）
 * @param baseDelay 基础延迟
 * @param multiplier 退避倍数
 * @param maxDelay 最大延迟
 * @param jitterFactor 抖动因子
 */
export function calculateBaseRetryDelay(
  attempt: number,
  baseDelay: number = BASE_RETRY_SETTINGS.RETRY_DELAY_MS,
  multiplier: number = BASE_RETRY_SETTINGS.BACKOFF_MULTIPLIER,
  maxDelay: number = BASE_RETRY_SETTINGS.MAX_RETRY_DELAY_MS,
  jitterFactor: number = BASE_RETRY_SETTINGS.JITTER_FACTOR
): number {
  // 指数退避计算
  const exponentialDelay = baseDelay * Math.pow(multiplier, attempt);
  
  // 添加抖动
  const jitterRange = exponentialDelay * jitterFactor;
  const jitter = (Math.random() - 0.5) * 2 * jitterRange;
  const delayWithJitter = exponentialDelay + jitter;
  
  // 限制在合理范围内
  return Math.min(Math.max(BASE_RETRY_SETTINGS.MIN_RETRY_DELAY_MS, delayWithJitter), maxDelay);
}

/**
 * 基础错误类型判断工具
 * @param error 错误对象或错误码
 */
export function isBaseRetryableError(error: string | Error | { code?: string }): boolean {
  if (typeof error === 'string') {
    return BASE_ERROR_HANDLING.RETRYABLE_ERROR_TYPES.includes(error);
  }
  
  if (error?.code) {
    return BASE_ERROR_HANDLING.RETRYABLE_ERROR_TYPES.includes(error.code);
  }
  
  return false;
}

/**
 * 基础HTTP状态码判断工具
 * @param statusCode HTTP状态码
 */
export function isBaseRetryableHttpCode(statusCode: number): boolean {
  return BASE_ERROR_HANDLING.RETRYABLE_HTTP_CODES.includes(statusCode);
}
/**
 * 处理基础常量配置
 * 🏛️ Foundation层 - 批量处理和重试策略的基础配置
 * 📊 提供可继承的通用配置模板和防护策略
 * 🆕 从Unified层processing-base.constants.ts迁移
 */

import { NUMERIC_CONSTANTS } from '../core';
import { BATCH_SIZE_SEMANTICS } from '../semantic';
import { CORE_TIMEOUTS } from './core-timeouts.constants';

/**
 * 基础批量处理配置
 * 🎯 提供标准化的批量处理配置
 */
export const PROCESSING_BATCH_SETTINGS = Object.freeze({
  // 通用批量配置 - 基于Foundation层核心值
  DEFAULT_BATCH_SIZE: NUMERIC_CONSTANTS.N_100,                         // 100
  MIN_BATCH_SIZE: NUMERIC_CONSTANTS.N_1,                               // 1
  MAX_BATCH_SIZE: NUMERIC_CONSTANTS.N_1000,                            // 1000

  // 并发控制配置 - 基于Foundation层核心值

  // 分页配置 - 基于Foundation层核心值
  DEFAULT_PAGE_SIZE: NUMERIC_CONSTANTS.N_6,                            // 6

  // 性能和资源限制 - 基于Foundation层核心值
});

/**
 * 基础重试配置
 * 🎯 提供详细的重试策略配置
 */
export const PROCESSING_RETRY_SETTINGS = Object.freeze({
  // 重试次数配置 - 基于Foundation层核心值

  // 延迟配置 - 基于Foundation层核心值
  RETRY_DELAY_MS: CORE_TIMEOUTS.RETRY.INITIAL_DELAY_MS,               // 1000ms
  MIN_RETRY_DELAY_MS: NUMERIC_CONSTANTS.N_1000 / 10,                // 100ms
  MAX_RETRY_DELAY_MS: CORE_TIMEOUTS.RETRY.MAX_DELAY_MS,               // 10000ms

  // 退避策略配置 - 基于Foundation层核心值
  BACKOFF_MULTIPLIER: 2,                  // 2

  // 抖动配置 - 基于Foundation层核心值
  JITTER_FACTOR: 10 / 100, // 0.1 (10%)
});

/**
 * 基础处理策略
 * 🎯 提供标准化的处理策略类型定义
 */
export const PROCESSING_STRATEGIES = Object.freeze({
  // 批量处理策略类型
  BATCH_STRATEGY_TYPES: {
    ADAPTIVE: 'ADAPTIVE',             // 自适应策略
  },

  // 重试策略类型
  RETRY_STRATEGY_TYPES: {
  },

  // 失败处理策略
  FAILURE_STRATEGIES: {
  },
});

/**
 * 基础错误处理配置
 * 🎯 提供标准化的错误处理配置和可重试错误定义
 */
export const PROCESSING_ERROR_HANDLING = Object.freeze({
  // 错误限制 - 基于Foundation层核心值

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
  NON_RETRYABLE_ERRORS: [
    'INVALID_CREDENTIALS',            // 无效凭证
    'PERMISSION_DENIED',              // 权限被拒绝
    'RESOURCE_NOT_FOUND',             // 资源未找到
    'INVALID_PARAMETERS',             // 无效参数
    'QUOTA_EXCEEDED',                 // 配额超限
  ],
});

/**
 * 基础性能配置
 * 🎯 提供标准化的负载阈值和调整参数
 */
export const PROCESSING_PERFORMANCE_SETTINGS = Object.freeze({
  // 负载阈值 - 基于Foundation层百分比值
  LOAD_THRESHOLDS: {
    LOW: 30 / 100,    // 0.3 (30%)
    MEDIUM: 60 / 100, // 0.6 (60%)
    HIGH: 80 / 100, // 0.8 (80%)
  },

  // 调整参数 - 基于Foundation层核心值
  ADJUSTMENT_FACTORS: {
  },

  // 时间窗口配置 - 基于Foundation层时间值
  TIME_WINDOWS: {
  },
});

/**
 * 统一的处理基础配置导出
 * 🎯 提供Foundation层统一的处理基础配置
 */
export const PROCESSING_BASE_CONSTANTS = Object.freeze({
  BATCH: PROCESSING_BATCH_SETTINGS,
  RETRY: PROCESSING_RETRY_SETTINGS,
  PERFORMANCE: PROCESSING_PERFORMANCE_SETTINGS,
});

/**
 * 类型定义
 */
export type ProcessingBatchSettings = typeof PROCESSING_BATCH_SETTINGS;
export type ProcessingRetrySettings = typeof PROCESSING_RETRY_SETTINGS;
export type ProcessingStrategies = typeof PROCESSING_STRATEGIES;
export type ProcessingErrorHandling = typeof PROCESSING_ERROR_HANDLING;
export type ProcessingPerformanceSettings = typeof PROCESSING_PERFORMANCE_SETTINGS;
export type ProcessingBaseConstants = typeof PROCESSING_BASE_CONSTANTS;

// 策略类型的字符串字面量类型
export type BatchStrategyType = keyof typeof PROCESSING_STRATEGIES.BATCH_STRATEGY_TYPES;
export type RetryStrategyType = keyof typeof PROCESSING_STRATEGIES.RETRY_STRATEGY_TYPES;
export type FailureStrategyType = keyof typeof PROCESSING_STRATEGIES.FAILURE_STRATEGIES;

/**
 * 基础批量大小计算工具
 * @param totalItems 总项目数
 * @param maxBatchSize 最大批量大小
 * @param optimalBatches 理想批次数（默认5）
 */
export function calculateBaseBatchSize(
  totalItems: number,
  maxBatchSize: number = BATCH_SIZE_SEMANTICS.PERFORMANCE.LARGE_BATCH,
  optimalBatches: number = NUMERIC_CONSTANTS.N_5
): number {
  if (totalItems <= BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE) {
    return totalItems;
  }

  const calculatedSize = Math.ceil(totalItems / optimalBatches);
  return Math.min(maxBatchSize, Math.max(PROCESSING_BATCH_SETTINGS.MIN_BATCH_SIZE, calculatedSize));
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
  baseDelay: number = PROCESSING_RETRY_SETTINGS.RETRY_DELAY_MS,
  multiplier: number = PROCESSING_RETRY_SETTINGS.BACKOFF_MULTIPLIER,
  maxDelay: number = PROCESSING_RETRY_SETTINGS.MAX_RETRY_DELAY_MS,
  jitterFactor: number = PROCESSING_RETRY_SETTINGS.JITTER_FACTOR
): number {
  // 指数退避计算
  const exponentialDelay = baseDelay * Math.pow(multiplier, attempt);
  
  // 添加抖动
  const jitterRange = exponentialDelay * jitterFactor;
  const jitter = (Math.random() - 0.5) * 2 * jitterRange;
  const delayWithJitter = exponentialDelay + jitter;
  
  // 限制在合理范围内
  return Math.min(Math.max(PROCESSING_RETRY_SETTINGS.MIN_RETRY_DELAY_MS, delayWithJitter), maxDelay);
}

/**
 * 基础错误类型判断工具
 * @param error 错误对象或错误码
 */
export function isBaseRetryableError(error: string | Error | { code?: string }): boolean {
  if (typeof error === 'string') {
    return PROCESSING_ERROR_HANDLING.RETRYABLE_ERROR_TYPES.includes(error);
  }
  
  if (error && typeof error === 'object' && 'code' in error) {
    return PROCESSING_ERROR_HANDLING.RETRYABLE_ERROR_TYPES.includes((error as { code: string }).code);
  }
  
  return false;
}

/**
 * 基础HTTP状态码判断工具
 * @param statusCode HTTP状态码
 */
export function isBaseRetryableHttpCode(statusCode: number): boolean {
  return PROCESSING_ERROR_HANDLING.RETRYABLE_HTTP_CODES.includes(statusCode);
}
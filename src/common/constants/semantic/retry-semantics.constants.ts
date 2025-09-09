/**
 * 重试语义常量
 * 🎯 Semantic层 - 重试相关的业务无关语义分类
 * 🔄 基于Foundation层构建，解决RETRY_DELAY_MS等重复定义问题
 */

import { NUMERIC_CONSTANTS } from '../core';
import { CORE_VALUES, CORE_TIMEOUTS, CORE_LIMITS } from '../foundation';

/**
 * 重试延迟语义配置
 * 🎯 解决RETRY_DELAY_MS重复定义问题，统一重试延迟命名
 */
export const RETRY_DELAY_SEMANTICS = Object.freeze({
  // 基础延迟配置（毫秒）
  BASIC: {
    INITIAL_MS: CORE_TIMEOUTS.RETRY.INITIAL_DELAY_MS,           // 1000ms - 初始延迟
    MIN_MS: CORE_TIMEOUTS.RETRY.MIN_DELAY_MS,                   // 1000ms - 最小延迟
    MAX_MS: CORE_TIMEOUTS.RETRY.MAX_DELAY_MS,                   // 10000ms - 最大延迟
    BASE_MS: CORE_TIMEOUTS.RETRY.EXPONENTIAL_BASE_MS,           // 1000ms - 指数退避基数
  },

  // 场景特定延迟（毫秒）
  SCENARIO: {
    NETWORK_FAILURE_MS: NUMERIC_CONSTANTS.N_1000,         // 1000ms - 网络故障
    RATE_LIMIT_MS: NUMERIC_CONSTANTS.N_10000,             // 10000ms - 频率限制
    DATABASE_ERROR_MS: NUMERIC_CONSTANTS.N_1000 * 2,      // 2000ms - 数据库错误
  },

  // 退避策略延迟（毫秒）
  BACKOFF: {
    LINEAR_STEP_MS: NUMERIC_CONSTANTS.N_1000,             // 1000ms - 线性退避步长
    EXPONENTIAL_MAX_MS: NUMERIC_CONSTANTS.N_30000,     // 30000ms - 指数退避上限
    RANDOM_JITTER_MAX_MS: NUMERIC_CONSTANTS.N_1000,       // 1000ms - 随机抖动上限
  },
});

/**
 * 重试次数语义配置
 * 🎯 统一重试次数配置，避免魔术数字
 */
export const RETRY_COUNT_SEMANTICS = Object.freeze({
  // 基础重试次数
  BASIC: {
    DEFAULT: CORE_LIMITS.RATE_LIMITS.DEFAULT_RETRIES,           // 3 - 默认重试次数
    MIN: CORE_LIMITS.RATE_LIMITS.MIN_RETRIES,                   // 0 - 最小重试次数
    MAX: CORE_LIMITS.RATE_LIMITS.MAX_RETRIES,                   // 6 - 最大重试次数
  },

  // 场景特定重试次数
  SCENARIO: {
    NETWORK_OPERATION: NUMERIC_CONSTANTS.N_3,            // 3 - 网络操作
    DATABASE_OPERATION: NUMERIC_CONSTANTS.N_2,             // 2 - 数据库操作
    EXTERNAL_API: NUMERIC_CONSTANTS.N_5,                  // 5 - 外部API调用
    CACHE_OPERATION: NUMERIC_CONSTANTS.N_2,                // 2 - 缓存操作
  },

  // 严重程度分级重试次数
  SEVERITY: {
    CRITICAL: NUMERIC_CONSTANTS.N_1,                       // 1 - 关键操作（快速失败）
    HIGH: NUMERIC_CONSTANTS.N_2,                           // 2 - 高优先级
    MEDIUM: NUMERIC_CONSTANTS.N_3,                       // 3 - 中等优先级
    LOW: NUMERIC_CONSTANTS.N_5,                           // 5 - 低优先级（多次重试）
  },
});

/**
 * 重试策略语义分类
 * 🎯 统一重试策略配置
 */
export const RETRY_STRATEGY_SEMANTICS = Object.freeze({
  // 退避策略类型
  BACKOFF_STRATEGIES: {
    FIXED: 'fixed',                      // 固定延迟
    LINEAR: 'linear',                    // 线性退避
    EXPONENTIAL: 'exponential',          // 指数退避
    EXPONENTIAL_JITTER: 'exponential-jitter', // 带抖动的指数退避
  },

  // 重试条件
  RETRY_CONDITIONS: {
    ON_FAILURE: 'on-failure',           // 任何失败都重试
    ON_TIMEOUT: 'on-timeout',           // 仅超时重试
    ON_NETWORK_ERROR: 'on-network-error', // 仅网络错误重试
    ON_SERVER_ERROR: 'on-server-error', // 仅服务器错误重试
  },

  // 重试终止条件
  STOP_CONDITIONS: {
    SUCCESS: 'success',                  // 成功执行
  },
});

/**
 * 可重试错误语义分类
 * 🎯 统一可重试错误判断逻辑
 */
export const RETRYABLE_ERROR_SEMANTICS = Object.freeze({
  // HTTP状态码（可重试）
  HTTP_STATUS_CODES: {
    RETRYABLE: [
      408, // Request Timeout
      429, // Too Many Requests
      502, // Bad Gateway
      503, // Service Unavailable
      504, // Gateway Timeout
      507, // Insufficient Storage
      520, // Unknown Error
      521, // Web Server Is Down
      522, // Connection Timed Out
      523, // Origin Is Unreachable
      524, // A Timeout Occurred
    ],
    
    // 不可重试的HTTP状态码 (客户端错误)
    NON_RETRYABLE: [
      400, // Bad Request
      401, // Unauthorized
      403, // Forbidden
      404, // Not Found
      405, // Method Not Allowed
      409, // Conflict
      410, // Gone
      422, // Unprocessable Entity
    ],
  },

  // 错误类型（可重试）
  ERROR_TYPES: {
    RETRYABLE: [
      'TimeoutError',
      'NetworkError', 
      'ConnectionError',
      'ServiceUnavailableError',
      'TooManyRequestsError',
      'GatewayTimeoutError',
      'ServerError',
    ],
    
    NON_RETRYABLE: [
      'ValidationError',
      'AuthenticationError', 
      'AuthorizationError',
      'NotFoundError',
      'ConflictError',
      'BadRequestError',
    ],
  },

  // 网络错误码（可重试）
  NETWORK_ERROR_CODES: {
    RETRYABLE: [
      'ECONNRESET',    // 连接重置
      'ECONNREFUSED',  // 连接拒绝
      'ETIMEDOUT',     // 连接超时
      'ENOTFOUND',     // DNS解析失败
      'ECONNABORTED',  // 连接中止
    ],
    
    NON_RETRYABLE: [
      'EACCES',        // 权限拒绝
      'EADDRINUSE',    // 地址已使用
      'EINVAL',        // 无效参数
    ],
  },
});

/**
 * 重试配置模板
 * 🎯 提供预定义的重试配置模板
 */
export const RETRY_CONFIG_TEMPLATES = Object.freeze({
  // 网络操作重试配置
  NETWORK_OPERATION: {
    maxAttempts: RETRY_COUNT_SEMANTICS.SCENARIO.NETWORK_OPERATION,
    initialDelayMs: RETRY_DELAY_SEMANTICS.BASIC.INITIAL_MS,
    maxDelayMs: RETRY_DELAY_SEMANTICS.BASIC.MAX_MS,
    backoffStrategy: RETRY_STRATEGY_SEMANTICS.BACKOFF_STRATEGIES.EXPONENTIAL_JITTER,
    retryOn: RETRY_STRATEGY_SEMANTICS.RETRY_CONDITIONS.ON_NETWORK_ERROR,
  },

  // 数据库操作重试配置
  DATABASE_OPERATION: {
    maxAttempts: RETRY_COUNT_SEMANTICS.SCENARIO.DATABASE_OPERATION,
    initialDelayMs: RETRY_DELAY_SEMANTICS.SCENARIO.DATABASE_ERROR_MS,
    maxDelayMs: RETRY_DELAY_SEMANTICS.BACKOFF.LINEAR_STEP_MS * 3,
    backoffStrategy: RETRY_STRATEGY_SEMANTICS.BACKOFF_STRATEGIES.LINEAR,
    retryOn: RETRY_STRATEGY_SEMANTICS.RETRY_CONDITIONS.ON_FAILURE,
  },

  // 缓存操作重试配置
  CACHE_OPERATION: {
    maxAttempts: RETRY_COUNT_SEMANTICS.SCENARIO.CACHE_OPERATION,
    initialDelayMs: RETRY_DELAY_SEMANTICS.BASIC.INITIAL_MS,
    maxDelayMs: RETRY_DELAY_SEMANTICS.BACKOFF.LINEAR_STEP_MS * 2,
    backoffStrategy: RETRY_STRATEGY_SEMANTICS.BACKOFF_STRATEGIES.LINEAR,
    retryOn: RETRY_STRATEGY_SEMANTICS.RETRY_CONDITIONS.ON_FAILURE,
  },

  // 外部API调用重试配置
  EXTERNAL_API: {
    maxAttempts: RETRY_COUNT_SEMANTICS.SCENARIO.EXTERNAL_API,
    initialDelayMs: RETRY_DELAY_SEMANTICS.BASIC.INITIAL_MS,
    maxDelayMs: RETRY_DELAY_SEMANTICS.BACKOFF.EXPONENTIAL_MAX_MS,
    backoffStrategy: RETRY_STRATEGY_SEMANTICS.BACKOFF_STRATEGIES.EXPONENTIAL,
    retryOn: RETRY_STRATEGY_SEMANTICS.RETRY_CONDITIONS.ON_SERVER_ERROR,
  },

  // 关键操作重试配置（快速失败）
  CRITICAL_OPERATION: {
    maxAttempts: RETRY_COUNT_SEMANTICS.SEVERITY.CRITICAL,
    initialDelayMs: RETRY_DELAY_SEMANTICS.BASIC.MIN_MS,
    maxDelayMs: RETRY_DELAY_SEMANTICS.BASIC.MIN_MS,
    backoffStrategy: RETRY_STRATEGY_SEMANTICS.BACKOFF_STRATEGIES.FIXED,
    retryOn: RETRY_STRATEGY_SEMANTICS.RETRY_CONDITIONS.ON_TIMEOUT,
  },
});

/**
 * 重试语义工具函数
 */
export class RetrySemanticsUtil {
  /**
   * 判断HTTP状态码是否可重试
   */
  static isRetryableHttpStatus(statusCode: number): boolean {
    return RETRYABLE_ERROR_SEMANTICS.HTTP_STATUS_CODES.RETRYABLE.includes(statusCode);
  }

  /**
   * 判断错误类型是否可重试
   */
  static isRetryableError(error: Error): boolean {
    return RETRYABLE_ERROR_SEMANTICS.ERROR_TYPES.RETRYABLE.includes(error.constructor.name);
  }

  /**
   * 计算指数退避延迟
   */
  static calculateExponentialDelay(attempt: number, baseDelayMs: number = RETRY_DELAY_SEMANTICS.BASIC.BASE_MS): number {
    const delay = baseDelayMs * Math.pow(2, attempt - 1);
    return Math.min(delay, RETRY_DELAY_SEMANTICS.BASIC.MAX_MS);
  }

  /**
   * 计算带抖动的指数退避延迟
   */
  static calculateExponentialJitterDelay(attempt: number, baseDelayMs: number = RETRY_DELAY_SEMANTICS.BASIC.BASE_MS): number {
    const baseDelay = this.calculateExponentialDelay(attempt, baseDelayMs);
    const jitter = Math.random() * RETRY_DELAY_SEMANTICS.BACKOFF.RANDOM_JITTER_MAX_MS;
    return baseDelay + jitter;
  }

  /**
   * 获取推荐的重试配置
   */
  static getRecommendedConfig(operationType: keyof typeof RETRY_CONFIG_TEMPLATES) {
    return RETRY_CONFIG_TEMPLATES[operationType];
  }

  /**
   * 判断是否应该停止重试
   */
  static shouldStopRetrying(attempt: number, maxAttempts: number, elapsedMs: number, maxDurationMs?: number): boolean {
    if (attempt >= maxAttempts) return true;
    if (maxDurationMs && elapsedMs >= maxDurationMs) return true;
    return false;
  }
}

/**
 * 业务场景重试配置
 * 🎯 从Unified层迁移的业务场景特定重试策略，提供差异化策略
 */
export const RETRY_BUSINESS_SCENARIOS = Object.freeze({
  // 数据获取场景 - 快速失败
  DATA_FETCHER: {
    maxAttempts: RETRY_COUNT_SEMANTICS.SEVERITY.CRITICAL,        // 1 - 快速失败
    initialDelayMs: RETRY_DELAY_SEMANTICS.SCENARIO.NETWORK_FAILURE_MS / 2, // 500ms
    backoffMultiplier: 1.5,
    explanation: "数据获取失败快速响应，避免累积延迟",
  },

  // 接收器场景 - 标准重试
  RECEIVER: {
    maxAttempts: RETRY_COUNT_SEMANTICS.BASIC.DEFAULT,            // 3
    initialDelayMs: RETRY_DELAY_SEMANTICS.BASIC.INITIAL_MS,      // 1000ms
    backoffMultiplier: 2,
  },

  // 存储操作场景 - 标准重试
  STORAGE: {
    maxAttempts: RETRY_COUNT_SEMANTICS.BASIC.DEFAULT,            // 3
    initialDelayMs: RETRY_DELAY_SEMANTICS.BASIC.INITIAL_MS,      // 1000ms
    backoffMultiplier: 2,
    explanation: "存储操作需要合理的重试机会",
  },

  // 符号映射场景
  SYMBOL_MAPPER: {
    maxAttempts: RETRY_COUNT_SEMANTICS.BASIC.DEFAULT,            // 3
    initialDelayMs: RETRY_DELAY_SEMANTICS.SCENARIO.NETWORK_FAILURE_MS / 2, // 500ms
    backoffMultiplier: 1.5,
  },

  // 数据映射场景
  DATA_MAPPER: {
    maxAttempts: RETRY_COUNT_SEMANTICS.BASIC.DEFAULT,            // 3
    initialDelayMs: RETRY_DELAY_SEMANTICS.SCENARIO.NETWORK_FAILURE_MS / 2, // 500ms
    backoffMultiplier: 1.5,
  },

  // 通知发送场景
  NOTIFICATION: {
    maxAttempts: RETRY_COUNT_SEMANTICS.BASIC.DEFAULT,            // 3
    initialDelayMs: RETRY_DELAY_SEMANTICS.SCENARIO.DATABASE_ERROR_MS, // 2000ms
    backoffMultiplier: 2,
  },

  // 关键操作场景 - 更多重试
  CRITICAL_OPERATIONS: {
    maxAttempts: RETRY_COUNT_SEMANTICS.SCENARIO.EXTERNAL_API,    // 5
    initialDelayMs: RETRY_DELAY_SEMANTICS.SCENARIO.DATABASE_ERROR_MS, // 2000ms
    backoffMultiplier: 2,
    maxDelayMs: RETRY_DELAY_SEMANTICS.BACKOFF.EXPONENTIAL_MAX_MS, // 30000ms
    explanation: "关键业务操作需要更多重试机会",
  },

  // 快速失败场景
  QUICK_FAIL: {
    maxAttempts: RETRY_COUNT_SEMANTICS.BASIC.MIN,                // 0
    explanation: "某些场景需要立即失败，如实时性要求极高的操作",
  },

  // 外部API调用场景
  EXTERNAL_API: {
    maxAttempts: RETRY_COUNT_SEMANTICS.SCENARIO.EXTERNAL_API,    // 5
    initialDelayMs: RETRY_DELAY_SEMANTICS.BASIC.INITIAL_MS,      // 1000ms
    backoffMultiplier: 2,
    maxDelayMs: RETRY_DELAY_SEMANTICS.SCENARIO.RATE_LIMIT_MS,    // 10000ms
    explanation: "外部API调用的标准重试策略",
  },

  // WebSocket重连场景
  WEBSOCKET_RECONNECT: {
    maxAttempts: 10,                                             // WebSocket需要更多重连尝试
    initialDelayMs: RETRY_DELAY_SEMANTICS.BASIC.INITIAL_MS,      // 1000ms
    backoffMultiplier: 1.5,
    maxDelayMs: NUMERIC_CONSTANTS.N_60000,                  // 60000ms
    explanation: "WebSocket连接需要持续重连能力",
  },
});

/**
 * 重试条件语义配置
 * 🎯 从Unified层迁移的重试条件配置
 */
export const RETRY_CONDITION_SEMANTICS = Object.freeze({
  // 基础重试开关

  // 重试默认设置
  DEFAULT_SETTINGS: {
    maxAttempts: RETRY_COUNT_SEMANTICS.BASIC.DEFAULT,
    initialDelayMs: RETRY_DELAY_SEMANTICS.BASIC.INITIAL_MS,
    backoffMultiplier: 2,
    maxDelayMs: RETRY_DELAY_SEMANTICS.BASIC.MAX_MS,
    jitterFactor: 0.1,
  },
});

/**
 * 类型定义
 */
export type RetryDelaySemantics = typeof RETRY_DELAY_SEMANTICS;
export type RetryCountSemantics = typeof RETRY_COUNT_SEMANTICS;
export type RetryStrategySemantics = typeof RETRY_STRATEGY_SEMANTICS;
export type RetryBusinessScenarios = typeof RETRY_BUSINESS_SCENARIOS;
export type RetryConditionSemantics = typeof RETRY_CONDITION_SEMANTICS;
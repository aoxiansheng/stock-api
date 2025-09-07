/**
 * 重试相关统一常量
 * 统一管理系统中的重试策略配置
 * 
 * 设计原则：
 * - 差异化策略：不同业务场景使用不同重试策略
 * - 防止雪崩：通过指数退避和抖动避免集中重试
 * - 快速失败：关键路径使用较少重试次数
 * - 可配置性：支持环境变量覆盖
 */

import { deepFreeze } from "@common/utils/object-immutability.util";
import { 
  PROCESSING_BASE_CONSTANTS,
  calculateBaseRetryDelay,
  isBaseRetryableError,
  isBaseRetryableHttpCode
} from "./processing-base.constants";

export const RETRY_CONSTANTS = deepFreeze({
  // 默认重试配置（继承基础配置）
  DEFAULT_SETTINGS: {
    ...PROCESSING_BASE_CONSTANTS.RETRY,
    
    // 重试特定的扩展配置
    CIRCUIT_BREAKER_ENABLED: false,   // 熔断器默认关闭
    RETRY_ON_TIMEOUT_ENABLED: true,   // 超时重试默认开启
  },
  
  // 业务场景特定重试策略
  BUSINESS_SCENARIOS: {
    // 数据获取场景
    DATA_FETCHER: {
      MAX_RETRY_ATTEMPTS: 1,          // 保留当前业务逻辑：快速失败
      EXPLANATION: "数据获取失败快速响应，避免累积延迟",
      RETRY_DELAY_MS: 500,
      BACKOFF_MULTIPLIER: 1.5,
    },
    
    // 接收器场景
    RECEIVER: {
      MAX_RETRY_ATTEMPTS: 3,          // 标准重试策略
      RETRY_DELAY_MS: 1000,
      BACKOFF_MULTIPLIER: 2,
    },
    
    // 存储操作场景
    STORAGE: {
      MAX_RETRY_ATTEMPTS: 3,          // 存储操作标准重试
      RETRY_DELAY_MS: 1000,
      BACKOFF_MULTIPLIER: 2,
      EXPLANATION: "存储操作需要合理的重试机会",
    },
    
    // 符号映射场景
    SYMBOL_MAPPER: {
      MAX_RETRY_ATTEMPTS: 3,          // 映射操作标准重试
      RETRY_DELAY_MS: 500,             // 较短延迟
      BACKOFF_MULTIPLIER: 1.5,
    },
    
    // 数据映射场景
    DATA_MAPPER: {
      MAX_RETRY_ATTEMPTS: 3,          // 映射操作标准重试
      RETRY_DELAY_MS: 500,
      BACKOFF_MULTIPLIER: 1.5,
    },
    
    // 通知发送场景
    NOTIFICATION: {
      MAX_RETRY_ATTEMPTS: 3,          // 通知发送标准重试
      RETRY_DELAY_MS: 2000,            // 较长延迟，避免频繁通知
      BACKOFF_MULTIPLIER: 2,
    },
    
    // 关键操作场景
    CRITICAL_OPERATIONS: {
      MAX_RETRY_ATTEMPTS: 5,          // 关键操作更多重试
      RETRY_DELAY_MS: 2000,
      BACKOFF_MULTIPLIER: 2,
      MAX_RETRY_DELAY_MS: 30000,      // 最大延迟30秒
      EXPLANATION: "关键业务操作需要更多重试机会",
    },
    
    // 快速失败场景
    QUICK_FAIL: {
      MAX_RETRY_ATTEMPTS: 0,          // 不重试
      EXPLANATION: "某些场景需要立即失败，如实时性要求极高的操作",
    },
    
    // 外部API调用场景
    EXTERNAL_API: {
      MAX_RETRY_ATTEMPTS: 3,
      RETRY_DELAY_MS: 1000,
      BACKOFF_MULTIPLIER: 2,
      MAX_RETRY_DELAY_MS: 10000,
      EXPLANATION: "外部API调用的标准重试策略",
    },
    
    // WebSocket重连场景
    WEBSOCKET_RECONNECT: {
      MAX_RETRY_ATTEMPTS: 10,         // WebSocket需要更多重连尝试
      RETRY_DELAY_MS: 1000,
      BACKOFF_MULTIPLIER: 1.5,
      MAX_RETRY_DELAY_MS: 60000,      // 最大延迟1分钟
      EXPLANATION: "WebSocket连接需要持续重连能力",
    },
  },
  
  // 重试条件配置（继承基础错误处理配置）
  RETRY_CONDITIONS: {
    ...PROCESSING_BASE_CONSTANTS.ERROR_HANDLING,
    
    // 重试特定的额外条件
    RETRY_ON_BUSINESS_ERROR: false,   // 业务错误默认不重试
    RETRY_ON_VALIDATION_ERROR: false, // 验证错误不重试
  },
});

// 导出类型定义
export type RetryScenario = keyof typeof RETRY_CONSTANTS.BUSINESS_SCENARIOS;
export type RetrySettings = typeof RETRY_CONSTANTS.DEFAULT_SETTINGS;

/**
 * 计算带抖动的重试延迟（基于基础配置）
 * @param attempt 当前重试次数（从0开始）
 * @param scenario 业务场景
 */
export function calculateRetryDelay(
  attempt: number,
  scenario: RetryScenario = 'DATA_FETCHER'
): number {
  const settings = RETRY_CONSTANTS.BUSINESS_SCENARIOS[scenario];
  const {
    RETRY_DELAY_MS = RETRY_CONSTANTS.DEFAULT_SETTINGS.RETRY_DELAY_MS,
    BACKOFF_MULTIPLIER = RETRY_CONSTANTS.DEFAULT_SETTINGS.BACKOFF_MULTIPLIER,
    MAX_RETRY_DELAY_MS = RETRY_CONSTANTS.DEFAULT_SETTINGS.MAX_RETRY_DELAY_MS,
    JITTER_FACTOR = RETRY_CONSTANTS.DEFAULT_SETTINGS.JITTER_FACTOR,
  } = settings;
  
  // 使用基础配置的计算方法
  return calculateBaseRetryDelay(attempt, RETRY_DELAY_MS, BACKOFF_MULTIPLIER, MAX_RETRY_DELAY_MS, JITTER_FACTOR);
}

/**
 * 判断是否应该重试
 * @param attempt 当前尝试次数（从1开始）
 * @param scenario 业务场景
 */
export function shouldRetry(
  attempt: number,
  scenario: RetryScenario = 'DATA_FETCHER'
): boolean {
  const settings = RETRY_CONSTANTS.BUSINESS_SCENARIOS[scenario];
  const maxAttempts = settings?.MAX_RETRY_ATTEMPTS ?? RETRY_CONSTANTS.DEFAULT_SETTINGS.MAX_RETRY_ATTEMPTS;
  return attempt <= maxAttempts;
}

/**
 * 判断HTTP状态码是否可重试（基于基础配置）
 * @param statusCode HTTP状态码
 */
export function isRetryableHttpCode(statusCode: number): boolean {
  return isBaseRetryableHttpCode(statusCode);
}

/**
 * 判断错误类型是否可重试（基于基础配置）
 * @param errorCode 错误代码
 */
export function isRetryableError(errorCode: string): boolean {
  return isBaseRetryableError(errorCode);
}

/**
 * 判断业务错误是否可重试（基于基础配置）
 * @param businessCode 业务错误码
 */
export function isRetryableBusinessError(businessCode: string): boolean {
  return !PROCESSING_BASE_CONSTANTS.ERROR_HANDLING.NON_RETRYABLE_BUSINESS_CODES.includes(businessCode);
}

/**
 * 获取特定场景的重试配置
 * @param scenario 业务场景
 */
export function getRetrySettings(scenario: RetryScenario): Record<string, unknown> {
  return RETRY_CONSTANTS.BUSINESS_SCENARIOS[scenario] || RETRY_CONSTANTS.DEFAULT_SETTINGS;
}
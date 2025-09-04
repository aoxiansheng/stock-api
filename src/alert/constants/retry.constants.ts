/**
 * 共享重试配置常量
 * 用于统一管理所有重试相关的配置，避免重复定义
 */

import { PERFORMANCE_CONSTANTS } from "@common/constants/unified/performance.constants";

/**
 * 基础重试配置
 * 包含所有通用的重试参数
 */
export const BASE_RETRY_CONFIG = Object.freeze({
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,
  BACKOFF_MULTIPLIER: 2,
  MAX_DELAY_MS: 10000,
});

/**
 * 通知系统重试配置
 * 在基础配置基础上添加抖动因子
 */
export const NOTIFICATION_RETRY_CONFIG = Object.freeze({
  ...BASE_RETRY_CONFIG,
  JITTER_FACTOR: 0.1,
});

/**
 * 告警系统重试配置
 * 在基础配置基础上添加超时设置
 */
export const ALERTING_RETRY_CONFIG = Object.freeze({
  ...BASE_RETRY_CONFIG,
  TIMEOUT_MS: PERFORMANCE_CONSTANTS.TIMEOUTS.DEFAULT_TIMEOUT_MS,
});

/**
 * 重试配置类型定义
 */
export type BaseRetryConfig = typeof BASE_RETRY_CONFIG;
export type NotificationRetryConfig = typeof NOTIFICATION_RETRY_CONFIG;
export type AlertingRetryConfig = typeof ALERTING_RETRY_CONFIG;

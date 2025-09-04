/**
 * DataFetcher模块常量定义
 */

import { PERFORMANCE_CONSTANTS, RETRY_CONSTANTS, BATCH_CONSTANTS } from "@common/constants/unified";

/**
 * 数据获取操作类型
 */
export const DATA_FETCHER_OPERATIONS = {
  FETCH_RAW_DATA: "fetchRawData",
  CHECK_CAPABILITY: "checkCapability",
  GET_PROVIDER_CONTEXT: "getProviderContext",
} as const;

/**
 * 数据获取错误消息
 */
export const DATA_FETCHER_ERROR_MESSAGES = {
  PROVIDER_NOT_FOUND: "未找到指定的数据提供商: {provider}",
  CAPABILITY_NOT_SUPPORTED: "提供商 {provider} 不支持能力 {capability}",
  CONTEXT_SERVICE_NOT_AVAILABLE: "提供商 {provider} 的上下文服务不可用",
  DATA_FETCH_FAILED: "数据获取失败: {error}",
  INVALID_SYMBOLS: "无效的股票代码: {symbols}",
  EXECUTION_TIMEOUT: "数据获取超时",
  PARTIAL_FAILURE: "部分股票代码获取失败: {failedSymbols}",
} as const;

/**
 * 数据获取警告消息
 */
export const DATA_FETCHER_WARNING_MESSAGES = {
  SLOW_RESPONSE: "数据获取响应较慢，处理时间: {processingTime}ms",
  PARTIAL_SUCCESS: "数据获取部分成功，失败数量: {failedCount}",
  CONTEXT_SERVICE_WARNING: "提供商上下文服务警告: {warning}",
} as const;

/**
 * 数据获取性能阈值
 */
export const DATA_FETCHER_PERFORMANCE_THRESHOLDS = {
  /** 慢响应阈值 (毫秒) - 使用统一配置 */
  SLOW_RESPONSE_MS: PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.DATA_FETCHER.SLOW_RESPONSE_MS,

  /** 每个符号的最大处理时间 (毫秒) */
  MAX_TIME_PER_SYMBOL_MS: 500,

  /** 批量处理的最大符号数量 - 使用统一配置 */
  MAX_SYMBOLS_PER_BATCH: BATCH_CONSTANTS.BUSINESS_SCENARIOS.DATA_FETCHER.MAX_BATCH_SIZE,

  /** 日志记录的符号数量限制 */
  LOG_SYMBOLS_LIMIT: 10,
} as const;

/**
 * 数据获取默认配置
 */
export const DATA_FETCHER_DEFAULT_CONFIG = {
  /** 默认API类型 */
  DEFAULT_API_TYPE: "rest",

  /** 默认超时时间 (毫秒) - 使用统一配置 */
  DEFAULT_TIMEOUT_MS: PERFORMANCE_CONSTANTS.TIMEOUTS.DATA_FETCHER.BASE_TIMEOUT_MS,

  /** 默认重试次数 - 使用统一配置 */
  DEFAULT_RETRY_COUNT: RETRY_CONSTANTS.BUSINESS_SCENARIOS.DATA_FETCHER.MAX_RETRY_ATTEMPTS,

  /** 默认批量大小 - 使用统一配置 */
  DEFAULT_BATCH_SIZE: BATCH_CONSTANTS.BUSINESS_SCENARIOS.DATA_FETCHER.DEFAULT_BATCH_SIZE,
} as const;

/**
 * 数据获取模块名称
 */
export const DATA_FETCHER_MODULE_NAME = "DataFetcher";

/**
 * 数据获取服务令牌
 */
export const DATA_FETCHER_SERVICE_TOKEN = "DataFetcherService";

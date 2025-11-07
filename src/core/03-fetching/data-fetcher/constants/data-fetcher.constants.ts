/**
 * DataFetcher 模块常量（极简统一版）
 * 仅保留本模块实际使用到的字段，减少跨模块耦合
 */

/**
 * Операции компонента Data Fetcher
 */
export const DATA_FETCHER_OPERATIONS = Object.freeze({
  FETCH_RAW_DATA: "fetchRawData",
  CHECK_CAPABILITY: "checkCapability",
  GET_PROVIDER_CONTEXT: "getProviderContext",
} as const);

/**
 * Сообщения об ошибках компонента Data Fetcher
 */
export const DATA_FETCHER_ERROR_MESSAGES = Object.freeze({
  PROVIDER_NOT_FOUND: "Provider not found: {provider}",
  CAPABILITY_NOT_SUPPORTED: "Provider {provider} does not support capability {capability}",
  CONTEXT_SERVICE_NOT_AVAILABLE: "Context service for provider {provider} is not available",
  DATA_FETCH_FAILED: "Data fetch failed: {error}",
  INVALID_SYMBOLS: "Invalid symbols: {symbols}",
  EXECUTION_TIMEOUT: "Data fetch operation timed out",
  PARTIAL_FAILURE: "Partial failure for symbols: {failedSymbols}",
} as const);

/**
 * Предупреждающие сообщения компонента Data Fetcher
 */
export const DATA_FETCHER_WARNING_MESSAGES = Object.freeze({
  SLOW_RESPONSE: "Slow response detected, processing time: {processingTimeMs}ms",
  PARTIAL_SUCCESS: "Partial success, failed count: {failedCount}",
  CONTEXT_SERVICE_WARNING: "Provider context service warning: {warning}",
} as const);

/**
 * Пороговые значения производительности
 */
export const DATA_FETCHER_PERFORMANCE_THRESHOLDS = Object.freeze({
  /** 慢响应阈值（毫秒） */
  SLOW_RESPONSE_MS: 1000,
  /** 日志中符号数量限制 */
  LOG_SYMBOLS_LIMIT: 10,
} as const);

/**
 * Конфигурация по умолчанию
 */
export const DATA_FETCHER_DEFAULT_CONFIG = Object.freeze({
  /** 默认 API 类型（rest / stream） */
  DEFAULT_API_TYPE: "rest",
} as const);

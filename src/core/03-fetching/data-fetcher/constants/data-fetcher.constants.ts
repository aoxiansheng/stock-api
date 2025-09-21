/**
 * DataFetcher модуль константы
 */

import { NUMERIC_CONSTANTS } from "@common/constants/core";
import {
  HTTP_TIMEOUTS,
  BATCH_SIZE_SEMANTICS,
} from "@common/constants/semantic";
import { RETRY_BUSINESS_SCENARIOS } from "@common/constants/semantic/retry-semantics.constants";

/**
 * Операции компонента Data Fetcher
 */
export const DATA_FETCHER_OPERATIONS = {
  FETCH_RAW_DATA: "fetchRawData",
  CHECK_CAPABILITY: "checkCapability",
  GET_PROVIDER_CONTEXT: "getProviderContext",
} as const;

/**
 * Сообщения об ошибках компонента Data Fetcher
 */
export const DATA_FETCHER_ERROR_MESSAGES = {
  PROVIDER_NOT_FOUND: "Provider not found: {provider}",
  CAPABILITY_NOT_SUPPORTED: "Provider {provider} does not support capability {capability}",
  CONTEXT_SERVICE_NOT_AVAILABLE: "Context service for provider {provider} is not available",
  DATA_FETCH_FAILED: "Data fetch failed: {error}",
  INVALID_SYMBOLS: "Invalid symbols: {symbols}",
  EXECUTION_TIMEOUT: "Data fetch operation timed out",
  PARTIAL_FAILURE: "Partial failure for symbols: {failedSymbols}",
} as const;

/**
 * Предупреждающие сообщения компонента Data Fetcher
 */
export const DATA_FETCHER_WARNING_MESSAGES = {
  SLOW_RESPONSE: "Slow response detected, processing time: {processingTimeMs}ms",
  PARTIAL_SUCCESS: "Partial success, failed count: {failedCount}",
  CONTEXT_SERVICE_WARNING: "Provider context service warning: {warning}",
} as const;

/**
 * Пороговые значения производительности
 */
export const DATA_FETCHER_PERFORMANCE_THRESHOLDS = {
  /** Порог медленного ответа (мс) - использует единую конфигурацию */
  SLOW_RESPONSE_MS: NUMERIC_CONSTANTS.N_1000,

  /** Максимальное время обработки на один символ (мс) */
  MAX_TIME_PER_SYMBOL_MS: NUMERIC_CONSTANTS.N_500,

  /** Максимальное количество символов в пакете - использует единую конфигурацию */
  MAX_SYMBOLS_PER_BATCH: BATCH_SIZE_SEMANTICS.BASIC.MAX_SIZE,

  /** Ограничение количества символов для логирования */
  LOG_SYMBOLS_LIMIT: 10,
} as const;

/**
 * Конфигурация по умолчанию
 */
export const DATA_FETCHER_DEFAULT_CONFIG = {
  /** Тип API по умолчанию */
  DEFAULT_API_TYPE: "rest",

  /** Тайм-аут по умолчанию (мс) - использует единую конфигурацию */
  DEFAULT_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS,

  /** Количество повторных попыток по умолчанию - использует единую конфигурацию */
  DEFAULT_RETRY_COUNT: RETRY_BUSINESS_SCENARIOS.DATA_FETCHER.maxAttempts,

  /** Размер пакета по умолчанию - использует единую конфигурацию */
  DEFAULT_BATCH_SIZE: BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE,
} as const;

/**
 * Имя модуля Data Fetcher
 */
export const DATA_FETCHER_MODULE_NAME = "DataFetcher";

/**
 * Токен сервиса Data Fetcher
 */
export const DATA_FETCHER_SERVICE_TOKEN = "DataFetcherService";

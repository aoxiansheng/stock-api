/**
 * 查询服务常量
 * 🎯 统一定义查询相关的常量，确保系统一致性
 */

/**
 * 查询错误消息常量
 */
export const QUERY_ERROR_MESSAGES = Object.freeze({
  QUERY_TYPE_REQUIRED: "查询类型不能为空",
  UNSUPPORTED_QUERY_TYPE: "不支持的查询类型: {queryType}。支持的类型: {supportedTypes}",
  SYMBOLS_REQUIRED_FOR_BY_SYMBOLS: "按股票代码查询时，股票代码列表不能为空",
  TOO_MANY_SYMBOLS: "单次查询股票代码数量不能超过{maxCount}个",
  INVALID_SYMBOL_FORMAT: "股票代码不能为空字符串",
  INVALID_QUERY_LIMIT: "查询限制必须在1-1000之间",
  INVALID_QUERY_OFFSET: "查询偏移量不能为负数",
  QUERY_VALIDATION_FAILED: "查询请求参数验证失败",
  BULK_QUERIES_REQUIRED: "批量查询请求列表不能为空",
  TOO_MANY_BULK_QUERIES: "单次批量查询不能超过100个子查询",
  MISSING_QUERY_TYPE_IN_BULK: "第{index}个查询缺少查询类型",
  UNSUPPORTED_QUERY_TYPE_IN_EXECUTION: "不支持的查询类型: {queryType}",
  SYMBOLS_REQUIRED_FOR_SYMBOL_QUERY: "股票代码查询需要提供股票代码列表",
  SYMBOL_DATA_NOT_FOUND: "未找到股票 {symbol} 的数据",
  QUERY_EXECUTION_FAILED: "查询执行失败",
  BULK_QUERY_EXECUTION_FAILED: "批量查询执行失败",
  CACHE_RETRIEVAL_FAILED: "从缓存获取数据失败",
  REALTIME_DATA_FETCH_FAILED: "从实时数据源获取数据失败",
  RECEIVER_SERVICE_CALL_FAILED: "调用接收服务获取实时数据失败",
  CACHE_STORAGE_FAILED: "查询结果缓存失败",
} as const);

/**
 * 查询警告消息常量
 */
export const QUERY_WARNING_MESSAGES = Object.freeze({
  QUERY_REQUEST_VALIDATION_FAILED: "查询请求验证失败",
  SYMBOL_DATA_FETCH_FAILED: "获取股票数据失败",
  CACHE_DATA_EXPIRED: "缓存数据已过期",
  CACHE_RETRIEVAL_WARNING: "从缓存获取数据失败",
  CACHE_STORAGE_WARNING: "查询结果缓存失败",
  BULK_QUERY_SINGLE_FAILED: "批量查询中的单个查询失败",
  PARTIAL_RESULTS_WARNING: "部分股票数据获取失败，实际返回 {actualCount} 条记录",
  SLOW_QUERY_DETECTED: "检测到慢查询",
  LARGE_RESULT_SET_WARNING: "查询结果集较大，可能影响性能",
  CACHE_MISS_WARNING: "缓存未命中，从实时数据源获取",
} as const);

/**
 * 查询成功消息常量
 */
export const QUERY_SUCCESS_MESSAGES = Object.freeze({
  QUERY_SERVICE_INITIALIZED: "查询服务初始化完成",
  QUERY_EXECUTION_STARTED: "开始执行查询",
  QUERY_EXECUTION_SUCCESS: "查询执行成功",
  BULK_QUERY_EXECUTION_STARTED: "开始执行批量查询",
  BULK_QUERY_EXECUTION_COMPLETED: "批量查询执行完成",
  SYMBOL_QUERY_PROCESSING_STARTED: "开始处理股票代码查询",
  CACHE_DATA_RETRIEVED: "从缓存获取数据成功",
  REALTIME_DATA_RETRIEVED: "从实时数据源获取数据成功",
  QUERY_RESULT_CACHED: "查询结果缓存成功",
  QUERY_RESULTS_PROCESSED: "查询结果处理完成",
  QUERY_STATS_RETRIEVED: "获取查询统计信息",
} as const);

/**
 * 查询性能配置常量
 */
export const QUERY_PERFORMANCE_CONFIG = Object.freeze({
  SLOW_QUERY_THRESHOLD_MS: 1000,              // 慢查询阈值（毫秒）
  DEFAULT_CACHE_TTL_SECONDS: 3600,            // 默认缓存TTL（1小时）
  DEFAULT_MAX_CACHE_AGE_SECONDS: 300,         // 默认最大缓存年龄（5分钟）
  DEFAULT_QUERY_LIMIT: 100,                   // 默认查询限制
  MAX_SYMBOLS_PER_QUERY: 100,                 // 单次查询最大股票数量
  LOG_SYMBOLS_LIMIT: 3,                       // 日志中显示的股票数量限制
  MAX_BULK_QUERIES: 100,                      // 最大批量查询数量
  QUERY_TIMEOUT_MS: 30000,                    // 查询超时时间（30秒）
  CACHE_TIMEOUT_MS: 5000,                     // 缓存操作超时时间（5秒）
  REALTIME_FETCH_TIMEOUT_MS: 15000,           // 实时数据获取超时时间（15秒）
} as const);

/**
 * 查询配置常量
 */
export const QUERY_CONFIG = Object.freeze({
  DEFAULT_STORAGE_KEY_SEPARATOR: ":",         // 默认存储键分隔符
  QUERY_ID_LENGTH: 8,                         // 查询ID长度
  MAX_QUERY_LIMIT: 1000,                      // 最大查询限制
  MIN_QUERY_LIMIT: 1,                         // 最小查询限制
  DEFAULT_DATA_TYPE: "stock-quote",           // 默认数据类型
  DEFAULT_PROVIDER: "unknown",                // 默认提供商
  DEFAULT_MARKET: "unknown",                  // 默认市场
  CACHE_SOURCE_TAG: "realtime",               // 缓存源标签
  QPS_CALCULATION_WINDOW_SECONDS: 60,         // QPS计算时间窗口（秒）
} as const);

/**
 * 查询验证规则常量
 */
export const QUERY_VALIDATION_RULES = Object.freeze({
  MIN_SYMBOL_LENGTH: 1,                       // 最小股票代码长度
  MAX_SYMBOL_LENGTH: 20,                      // 最大股票代码长度
  MIN_QUERY_LIMIT: 1,                         // 最小查询限制
  MAX_QUERY_LIMIT: 1000,                      // 最大查询限制
  MIN_QUERY_OFFSET: 0,                        // 最小查询偏移量
  MAX_BULK_QUERIES: 100,                      // 最大批量查询数量
  SYMBOL_PATTERN: /^[A-Za-z0-9._-]+$/,        // 股票代码格式模式
  QUERY_ID_PATTERN: /^[a-zA-Z0-9-]+$/,        // 查询ID格式模式
} as const);

/**
 * 查询操作常量
 */
export const QUERY_OPERATIONS = Object.freeze({
  ON_MODULE_INIT: "onModuleInit",
  EXECUTE_QUERY: "executeQuery",
  EXECUTE_BULK_QUERY: "executeBulkQuery",
  VALIDATE_QUERY_REQUEST: "validateQueryRequest",
  VALIDATE_BULK_QUERY_REQUEST: "validateBulkQueryRequest",
  PERFORM_QUERY_EXECUTION: "performQueryExecution",
  EXECUTE_SYMBOL_BASED_QUERY: "executeSymbolBasedQuery",
  PROCESS_SINGLE_SYMBOL: "processSingleSymbol",
  FETCH_SYMBOL_DATA: "fetchSymbolData",
  TRY_GET_FROM_CACHE: "tryGetFromCache",
  FETCH_FROM_REALTIME_AND_CACHE: "fetchFromRealtimeAndCache",
  RETRIEVE_FROM_CACHE: "retrieveFromCache",
  FETCH_FROM_REALTIME_SOURCE: "fetchFromRealtimeSource",
  FETCH_REALTIME_DATA: "fetchRealtimeData",
  PROCESS_QUERY_RESULTS: "processQueryResults",
  EXECUTE_BULK_QUERIES_IN_PARALLEL: "executeBulkQueriesInParallel",
  EXECUTE_BULK_QUERIES_SEQUENTIALLY: "executeBulkQueriesSequentially",
  APPLY_POST_PROCESSING: "applyPostProcessing",
  APPLY_FIELD_SELECTION: "applyFieldSelection",
  APPLY_SORTING: "applySorting",
  VALIDATE_DATA_FRESHNESS: "validateDataFreshness",
  CACHE_QUERY_RESULT: "cacheQueryResult",
  BUILD_STORAGE_KEY: "buildStorageKey",
  GENERATE_QUERY_ID: "generateQueryId",
  GENERATE_SIMPLE_HASH: "generateSimpleHash",
  BUILD_QUERY_PARAMS_SUMMARY: "buildQueryParamsSummary",
  RECORD_QUERY_PERFORMANCE: "recordQueryPerformance",
  GET_QUERY_STATS: "getQueryStats",
  CALCULATE_QUERIES_PER_SECOND: "calculateQueriesPerSecond",
} as const);

/**
 * 查询指标常量
 */
export const QUERY_METRICS = Object.freeze({
  TOTAL_QUERIES: "query_total_queries",
  QUERY_DURATION: "query_duration",
  CACHE_HIT_RATE: "query_cache_hit_rate",
  ERROR_RATE: "query_error_rate",
  SUCCESS_RATE: "query_success_rate",
  QUERIES_PER_SECOND: "query_qps",
  SLOW_QUERIES: "query_slow_queries",
  BULK_QUERIES: "query_bulk_queries",
  SYMBOL_QUERIES: "query_symbol_queries",
  CACHE_QUERIES: "query_cache_queries",
  REALTIME_QUERIES: "query_realtime_queries",
  PERSISTENT_QUERIES: "query_persistent_queries",
  AVERAGE_EXECUTION_TIME: "query_avg_execution_time",
  RESULTS_PROCESSED: "query_results_processed",
  SYMBOLS_PROCESSED: "query_symbols_processed",
} as const);

/**
 * 查询状态常量
 */
export const QUERY_STATUS = Object.freeze({
  PENDING: "pending",
  VALIDATING: "validating",
  EXECUTING: "executing",
  PROCESSING_RESULTS: "processing_results",
  CACHING: "caching",
  COMPLETED: "completed",
  FAILED: "failed",
  TIMEOUT: "timeout",
  CANCELLED: "cancelled",
} as const);

/**
 * 查询数据源类型常量
 */
export const QUERY_DATA_SOURCE_TYPES = Object.freeze({
  CACHE: "cache",
  PERSISTENT: "persistent",
  REALTIME: "realtime",
  HYBRID: "hybrid",
} as const);

/**
 * 查询默认值常量
 */
export const QUERY_DEFAULTS = Object.freeze({
  PAGE_SIZE: 100,
  PAGE_OFFSET: 0,
  CACHE_TTL_SECONDS: 3600,
  MAX_CACHE_AGE_SECONDS: 300,
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  LOG_LEVEL: "info",
  ENABLE_CACHING: true,
  ENABLE_PERFORMANCE_MONITORING: true,
  PARALLEL_EXECUTION: false,
  CONTINUE_ON_ERROR: false,
  INCLUDE_METADATA: false,
  UPDATE_CACHE: true,
  USE_CACHE: true,
} as const);

/**
 * 查询事件常量
 */
export const QUERY_EVENTS = Object.freeze({
  QUERY_STARTED: "query.started",
  QUERY_COMPLETED: "query.completed",
  QUERY_FAILED: "query.failed",
  BULK_QUERY_STARTED: "query.bulk_started",
  BULK_QUERY_COMPLETED: "query.bulk_completed",
  BULK_QUERY_FAILED: "query.bulk_failed",
  SLOW_QUERY_DETECTED: "query.slow_detected",
  CACHE_HIT: "query.cache_hit",
  CACHE_MISS: "query.cache_miss",
  REALTIME_FETCH: "query.realtime_fetch",
  PERFORMANCE_WARNING: "query.performance_warning",
} as const);

/**
 * 查询缓存配置常量
 */
export const QUERY_CACHE_CONFIG = Object.freeze({
  DEFAULT_TTL_SECONDS: 3600,                  // 默认缓存TTL（1小时）
  MAX_CACHE_AGE_SECONDS: 300,                 // 最大缓存年龄（5分钟）
  CACHE_KEY_PREFIX: "query:",                 // 缓存键前缀
  CACHE_TAG_SEPARATOR: ":",                   // 缓存标签分隔符
  MAX_CACHE_KEY_LENGTH: 250,                  // 最大缓存键长度
  CACHE_COMPRESSION_THRESHOLD: 1024,          // 缓存压缩阈值（字节）
} as const);

/**
 * 查询健康检查配置常量
 */
export const QUERY_HEALTH_CONFIG = Object.freeze({
  CHECK_INTERVAL_MS: 30000,                   // 健康检查间隔（30秒）
  TIMEOUT_MS: 5000,                           // 健康检查超时（5秒）
  MAX_FAILURES: 3,                            // 最大失败次数
  RECOVERY_THRESHOLD: 5,                      // 恢复阈值
  METRICS_WINDOW_SIZE: 100,                   // 指标窗口大小
  ERROR_RATE_THRESHOLD: 0.1,                  // 错误率阈值（10%）
  RESPONSE_TIME_THRESHOLD: 2000,              // 响应时间阈值（2秒）
} as const);

// =============================================================================
// 🔄 统一常量兼容性层 - Query模块
// 为了支持常量合并优化计划，以下常量引用新的统一常量系统
// 这些导出确保向后兼容性，同时逐步迁移到统一架构
// =============================================================================

import { 
  PERFORMANCE_CONSTANTS, 
  CACHE_CONSTANTS, 
  SYSTEM_CONSTANTS,
  HTTP_CONSTANTS,
  OPERATION_CONSTANTS 
} from '@common/constants/unified';

/**
 * @deprecated 请使用 PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.SLOW_QUERY_MS
 * 保持向后兼容性的性能阈值映射
 */
export const UNIFIED_PERFORMANCE_THRESHOLDS = Object.freeze({
  SLOW_QUERY_MS: PERFORMANCE_CONSTANTS.RESPONSE_TIME_THRESHOLDS.SLOW_QUERY_MS,
  DEFAULT_TIMEOUT_MS: PERFORMANCE_CONSTANTS.TIMEOUTS.DEFAULT_TIMEOUT_MS,
  QUERY_TIMEOUT_MS: PERFORMANCE_CONSTANTS.TIMEOUTS.DEFAULT_TIMEOUT_MS,
  CACHE_TIMEOUT_MS: PERFORMANCE_CONSTANTS.TIMEOUTS.CACHE_TIMEOUT_MS,
  MAX_RETRY_ATTEMPTS: PERFORMANCE_CONSTANTS.RETRY_SETTINGS.MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS: PERFORMANCE_CONSTANTS.RETRY_SETTINGS.RETRY_DELAY_MS,
  MAX_BATCH_SIZE: PERFORMANCE_CONSTANTS.BATCH_LIMITS.MAX_BATCH_SIZE,
  DEFAULT_PAGE_SIZE: PERFORMANCE_CONSTANTS.BATCH_LIMITS.DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE: PERFORMANCE_CONSTANTS.BATCH_LIMITS.MAX_PAGE_SIZE,
});

/**
 * @deprecated 请使用 CACHE_CONSTANTS.TTL_SETTINGS 和 KEY_PREFIXES
 * 保持向后兼容性的缓存配置映射
 */
export const UNIFIED_CACHE_CONFIG = Object.freeze({
  DEFAULT_TTL: CACHE_CONSTANTS.TTL_SETTINGS.DEFAULT_TTL,
  SHORT_TTL: CACHE_CONSTANTS.TTL_SETTINGS.SHORT_TTL,
  MEDIUM_TTL: CACHE_CONSTANTS.TTL_SETTINGS.MEDIUM_TTL,
  CACHE_KEY_PREFIX: CACHE_CONSTANTS.KEY_PREFIXES.QUERY,
  MAX_CACHE_SIZE: CACHE_CONSTANTS.SIZE_LIMITS.MAX_CACHE_SIZE,
  MAX_KEY_LENGTH: CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH,
});

/**
 * @deprecated 请使用 SYSTEM_CONSTANTS.OPERATION_STATUS
 * 保持向后兼容性的状态映射
 */
export const UNIFIED_STATUS = Object.freeze({
  SUCCESS: SYSTEM_CONSTANTS.OPERATION_STATUS.SUCCESS,
  FAILED: SYSTEM_CONSTANTS.OPERATION_STATUS.FAILED,
  PENDING: SYSTEM_CONSTANTS.OPERATION_STATUS.PENDING,
  PROCESSING: SYSTEM_CONSTANTS.OPERATION_STATUS.PROCESSING,
  TIMEOUT: SYSTEM_CONSTANTS.OPERATION_STATUS.TIMEOUT,
  CANCELLED: SYSTEM_CONSTANTS.OPERATION_STATUS.CANCELLED,
  COMPLETED: SYSTEM_CONSTANTS.OPERATION_STATUS.COMPLETED,
});

/**
 * @deprecated 请使用 HTTP_CONSTANTS.ERROR_MESSAGES 和 OPERATION_CONSTANTS.CRUD_MESSAGES
 * 保持向后兼容性的错误消息映射
 */
export const UNIFIED_ERROR_MESSAGES = Object.freeze({
  VALIDATION_FAILED: HTTP_CONSTANTS.ERROR_MESSAGES.VALIDATION_FAILED,
  QUERY_FAILED: OPERATION_CONSTANTS.CRUD_MESSAGES.QUERY_FAILED,
  PROCESSING_FAILED: OPERATION_CONSTANTS.CRUD_MESSAGES.PROCESSING_FAILED,
  TIMEOUT_ERROR: HTTP_CONSTANTS.ERROR_MESSAGES.TIMEOUT_ERROR,
  NOT_FOUND: HTTP_CONSTANTS.ERROR_MESSAGES.NOT_FOUND,
  INTERNAL_SERVER_ERROR: HTTP_CONSTANTS.ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
});

/**
 * @deprecated 请使用 OPERATION_CONSTANTS.CRUD_MESSAGES
 * 保持向后兼容性的成功消息映射
 */
export const UNIFIED_SUCCESS_MESSAGES = Object.freeze({
  QUERY_SUCCESS: OPERATION_CONSTANTS.CRUD_MESSAGES.QUERY_SUCCESS,
  PROCESSING_COMPLETED: OPERATION_CONSTANTS.CRUD_MESSAGES.PROCESSING_COMPLETED,
  OPERATION_SUCCESS: OPERATION_CONSTANTS.CRUD_MESSAGES.QUERY_SUCCESS,
});

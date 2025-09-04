/**
 * 数据接收操作相关常量
 * 包含能力类型、操作类型、状态、事件、指标等
 */

/**
 * 支持的能力类型常量（用于数据提供商路由和能力匹配）
 * 重构说明：从 SUPPORTED_DATA_TYPES 重命名为 SUPPORTED_CAPABILITY_TYPES
 * 以更准确地反映其在能力映射中的作用
 */
export const SUPPORTED_CAPABILITY_TYPES = Object.freeze([
  "get-stock-quote",
  "get-stock-basic-info",
  "get-index-quote",
  "get-market-status",
  "get-trading-days",
  "get-global-state",
  "get-crypto-quote",
  "get-crypto-basic-info",
  "get-stock-logo",
  "get-crypto-logo",
  "get-stock-news",
  "get-crypto-news",
] as const);

/**
 * 数据接收操作类型常量
 */
export const RECEIVER_OPERATIONS = Object.freeze({
  HANDLE_REQUEST: "handleRequest",
  VALIDATE_REQUEST: "validateRequest",
  DETERMINE_PROVIDER: "determineOptimalProvider",
  VALIDATE_PREFERRED_PROVIDER: "validatePreferredProvider",
  TRANSFORM_SYMBOLS: "transformSymbols",
  EXECUTE_DATA_FETCHING: "executeDataFetching",
  RECORD_PERFORMANCE: "recordPerformanceMetrics",
  INFER_MARKET: "inferMarketFromSymbols",
  GET_MARKET_FROM_SYMBOL: "getMarketFromSymbol",
} as const);

/**
 * 数据接收状态常量
 */
export const RECEIVER_STATUS = Object.freeze({
  PENDING: "pending",
  VALIDATING: "validating",
  SELECTING_PROVIDER: "selecting_provider",
  TRANSFORMING_SYMBOLS: "transforming_symbols",
  FETCHING_DATA: "fetching_data",
  SUCCESS: "success",
  FAILED: "failed",
  TIMEOUT: "timeout",
  CANCELLED: "cancelled",
} as const);

/**
 * 数据接收事件常量
 */
export const RECEIVER_EVENTS = Object.freeze({
  REQUEST_RECEIVED: "receiver.request_received",
  VALIDATION_COMPLETED: "receiver.validation_completed",
  PROVIDER_SELECTED: "receiver.provider_selected",
  SYMBOLS_TRANSFORMED: "receiver.symbols_transformed",
  DATA_FETCHED: "receiver.data_fetched",
  REQUEST_COMPLETED: "receiver.request_completed",
  REQUEST_FAILED: "receiver.request_failed",
  SLOW_REQUEST_DETECTED: "receiver.slow_request_detected",
  PERFORMANCE_WARNING: "receiver.performance_warning",
} as const);

/**
 * 数据接收指标常量
 */
export const RECEIVER_METRICS = Object.freeze({
  REQUESTS_TOTAL: "receiver_requests_total",
  REQUEST_DURATION: "receiver_request_duration",
  VALIDATION_ERRORS: "receiver_validation_errors",
  PROVIDER_SELECTION_TIME: "receiver_provider_selection_time",
  SYMBOL_TRANSFORMATION_TIME: "receiver_symbol_transformation_time",
  DATA_FETCHING_TIME: "receiver_data_fetching_time",
  SUCCESS_RATE: "receiver_success_rate",
  ERROR_RATE: "receiver_error_rate",
  SYMBOLS_PROCESSED: "receiver_symbols_processed",
  SLOW_REQUESTS: "receiver_slow_requests",
} as const);
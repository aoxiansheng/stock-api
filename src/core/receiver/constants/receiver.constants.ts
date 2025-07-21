/**
 * 数据接收服务常量
 * 🎯 统一定义数据接收相关的常量，确保系统一致性
 */

/**
 * 数据接收错误消息常量
 */
export const RECEIVER_ERROR_MESSAGES = Object.freeze({
  VALIDATION_FAILED: "请求参数验证失败",
  SYMBOLS_REQUIRED: "股票代码列表不能为空",
  DATA_TYPE_REQUIRED: "数据类型参数必须为非空字符串",
  INVALID_SYMBOL_FORMAT: "股票代码格式无效，代码不能为空且长度不能超过{maxLength}个字符",
  TOO_MANY_SYMBOLS: "单次请求股票代码数量不能超过{maxCount}个",
  UNSUPPORTED_DATA_TYPE: "不支持的数据类型: {dataType}。支持的类型: {supportedTypes}",
  PREFERRED_PROVIDER_INVALID: "首选提供商参数必须为字符串类型",
  REALTIME_PARAM_INVALID: "实时数据参数必须为布尔类型",
  FIELDS_PARAM_INVALID: "字段列表参数必须为字符串数组",
  MARKET_PARAM_INVALID: "市场参数必须为字符串类型",
  NO_PROVIDER_FOUND: "无法找到支持数据类型 '{dataType}' 和市场 '{market}' 的数据提供商",
  PROVIDER_SELECTION_FAILED: "数据提供商选择过程中发生内部错误",
  PROVIDER_NOT_SUPPORT_CAPABILITY: "提供商 '{provider}' 不支持 '{capability}' 能力",
  DATA_FETCHING_FAILED: "数据获取失败: {error}",
  SYMBOL_TRANSFORMATION_FAILED: "股票代码转换失败",
  SOME_SYMBOLS_FAILED_TO_MAP: "部分股票代码转换失败: {failedSymbols}",
} as const);

/**
 * 数据接收警告消息常量
 */
export const RECEIVER_WARNING_MESSAGES = Object.freeze({
  DUPLICATE_SYMBOLS: "请求中包含重复的股票代码",
  SYMBOLS_WITH_WHITESPACE: "部分股票代码包含前后空白字符，已自动去除",
  PREFERRED_PROVIDER_NOT_SUPPORT: "首选提供商不支持请求的能力",
  PREFERRED_PROVIDER_NOT_SUPPORT_MARKET: "首选提供商不支持指定市场",
  SYMBOL_TRANSFORMATION_FALLBACK: "股票代码转换失败，使用原始代码",
  SLOW_REQUEST_DETECTED: "检测到慢请求",
  LARGE_SYMBOL_COUNT: "请求的股票代码数量较多，可能影响性能",
  PARTIAL_SUCCESS_DETECTED: "请求部分成功，部分股票代码处理失败",
} as const);

/**
 * 数据接收成功消息常量
 */
export const RECEIVER_SUCCESS_MESSAGES = Object.freeze({
  REQUEST_PROCESSED: "数据请求处理成功",
  REQUEST_PARTIALLY_PROCESSED: "数据请求部分处理成功",
  PROVIDER_SELECTED: "自动选择最优提供商",
  PREFERRED_PROVIDER_USED: "使用首选提供商",
  SYMBOLS_TRANSFORMED: "股票代码转换完成",
  DATA_FETCHED: "数据获取成功",
  VALIDATION_PASSED: "请求参数验证通过",
} as const);

/**
 * 数据类型到能力映射常量
 */
export const DATA_TYPE_TO_CAPABILITY_MAP = Object.freeze({
  "stock-quote": "get-stock-quote",
  "stock-basic-info": "get-stock-basic-info",
  "index-quote": "get-index-quote",
  "market-status": "get-market-status",
  "trading-days": "get-trading-days",
  "global-state": "get-global-state",
  "crypto-quote": "get-crypto-quote",
  "crypto-basic-info": "get-crypto-basic-info",
  "stock-logo": "get-stock-logo",
  "crypto-logo": "get-crypto-logo",
  "stock-news": "get-stock-news",
  "crypto-news": "get-crypto-news",
} as const);

/**
 * 数据接收性能阈值常量
 */
export const RECEIVER_PERFORMANCE_THRESHOLDS = Object.freeze({
  SLOW_REQUEST_MS: 1000,                      // 慢请求阈值（毫秒）
  MAX_SYMBOLS_PER_REQUEST: 100,               // 单次请求最大股票数量
  LOG_SYMBOLS_LIMIT: 10,                      // 日志中显示的股票数量限制
  LARGE_SYMBOL_COUNT_WARNING: 50,             // 大量股票代码警告阈值
  PROVIDER_SELECTION_TIMEOUT_MS: 5000,        // 提供商选择超时（5秒）
  SYMBOL_TRANSFORMATION_TIMEOUT_MS: 10000,    // 股票代码转换超时（10秒）
  DATA_FETCHING_TIMEOUT_MS: 30000,            // 数据获取超时（30秒）
} as const);

/**
 * 数据接收验证规则常量
 */
export const RECEIVER_VALIDATION_RULES = Object.freeze({
  MIN_SYMBOL_LENGTH: 1,                       // 最小股票代码长度
  MAX_SYMBOL_LENGTH: 20,                      // 最大股票代码长度
  MAX_SYMBOLS_COUNT: 100,                     // 最大股票代码数量
  MIN_DATA_TYPE_LENGTH: 1,                    // 最小数据类型长度
  MAX_DATA_TYPE_LENGTH: 50,                   // 最大数据类型长度
  SYMBOL_PATTERN: /^[A-Za-z0-9._-]+$/,        // 股票代码格式模式
  DATA_TYPE_PATTERN: /^[a-z-]+$/,             // 数据类型格式模式
} as const);

/**
 * 市场识别规则常量
 */
export const MARKET_RECOGNITION_RULES = Object.freeze({
  HK_PATTERNS: Object.freeze({
    SUFFIX: ".HK",
    NUMERIC_PATTERN: /^\d{5}$/,               // 5位数字（如：00700）
    MARKET_CODE: "HK",
  }),
  US_PATTERNS: Object.freeze({
    SUFFIX: ".US",
    ALPHA_PATTERN: /^[A-Z]{1,5}$/,            // 1-5位字母（如：AAPL）
    MARKET_CODE: "US",
  }),
  SZ_PATTERNS: Object.freeze({
    SUFFIX: ".SZ",
    PREFIX_PATTERNS: Object.freeze(["00", "30"]),            // 深圳市场前缀
    MARKET_CODE: "SZ",
  }),
  SH_PATTERNS: Object.freeze({
    SUFFIX: ".SH",
    PREFIX_PATTERNS: Object.freeze(["60", "68"]),            // 上海市场前缀
    MARKET_CODE: "SH",
  }),
} as const);

/**
 * 数据接收配置常量
 */
export const RECEIVER_CONFIG = Object.freeze({
  DEFAULT_TIMEOUT_MS: 30000,                  // 默认超时时间（30秒）
  MAX_RETRY_ATTEMPTS: 3,                      // 最大重试次数
  RETRY_DELAY_MS: 1000,                       // 重试延迟（1秒）
  MAX_CONCURRENT_REQUESTS: 10,                // 最大并发请求数
  REQUEST_ID_LENGTH: 36,                      // 请求ID长度（UUID）
  LOG_TRUNCATE_LENGTH: 1000,                  // 日志截断长度
  PERFORMANCE_SAMPLE_SIZE: 100,               // 性能样本大小
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
 * 数据接收默认值常量
 */
export const RECEIVER_DEFAULTS = Object.freeze({
  TIMEOUT_MS: 30000,                          // 默认超时时间
  RETRY_ATTEMPTS: 3,                          // 默认重试次数
  LOG_LEVEL: "info",                          // 默认日志级别
  ENABLE_PERFORMANCE_MONITORING: true,        // 默认启用性能监控
  ENABLE_METRICS_COLLECTION: true,            // 默认启用指标收集
  ENABLE_SYMBOL_TRANSFORMATION: true,         // 默认启用股票代码转换
  ENABLE_PROVIDER_FALLBACK: true,             // 默认启用提供商回退
  MAX_LOG_SYMBOLS: RECEIVER_PERFORMANCE_THRESHOLDS.LOG_SYMBOLS_LIMIT,
} as const);

/**
 * 请求选项验证规则常量
 */
export const REQUEST_OPTIONS_VALIDATION = Object.freeze({
  PREFERRED_PROVIDER: {
    TYPE: "string",
    REQUIRED: false,
    MAX_LENGTH: 50,
  },
  REALTIME: {
    TYPE: "boolean",
    REQUIRED: false,
  },
  FIELDS: {
    TYPE: "array",
    REQUIRED: false,
    ITEM_TYPE: "string",
    MAX_ITEMS: 50,
  },
  MARKET: {
    TYPE: "string",
    REQUIRED: false,
    MAX_LENGTH: 10,
    PATTERN: /^[A-Z]{2,5}$/,
  },
} as const);

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
 * 数据接收缓存配置常量
 */
export const RECEIVER_CACHE_CONFIG = Object.freeze({
  PROVIDER_SELECTION_CACHE_TTL: 300,          // 提供商选择缓存TTL（5分钟）
  MARKET_INFERENCE_CACHE_TTL: 600,            // 市场推断缓存TTL（10分钟）
  VALIDATION_CACHE_TTL: 60,                   // 验证结果缓存TTL（1分钟）
  MAX_CACHE_SIZE: 1000,                       // 最大缓存条目数
  CACHE_KEY_PREFIX: "receiver:",              // 缓存键前缀
} as const);

/**
 * 数据接收健康检查配置常量
 */
export const RECEIVER_HEALTH_CONFIG = Object.freeze({
  CHECK_INTERVAL_MS: 30000,                   // 健康检查间隔（30秒）
  TIMEOUT_MS: 5000,                           // 健康检查超时（5秒）
  MAX_FAILURES: 3,                            // 最大失败次数
  RECOVERY_THRESHOLD: 5,                      // 恢复阈值
  METRICS_WINDOW_SIZE: 100,                   // 指标窗口大小
} as const);


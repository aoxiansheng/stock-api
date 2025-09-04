/**
 * 数据接收消息常量
 * 包含错误、警告、成功消息的定义
 */

/**
 * 数据接收错误消息常量
 */
export const RECEIVER_ERROR_MESSAGES = Object.freeze({
  VALIDATION_FAILED: "请求参数验证失败",
  SYMBOLS_REQUIRED: "股票代码列表不能为空",
  DATA_TYPE_REQUIRED: "数据类型参数必须为非空字符串",
  INVALID_SYMBOL_FORMAT:
    "股票代码格式无效，代码不能为空且长度不能超过{maxLength}个字符",
  TOO_MANY_SYMBOLS: "单次请求股票代码数量不能超过{maxCount}个",
  UNSUPPORTED_DATA_TYPE:
    "不支持的数据类型: {receiverType}。支持的类型: {supportedTypes}",
  PREFERRED_PROVIDER_INVALID: "首选提供商参数必须为字符串类型",
  REALTIME_PARAM_INVALID: "实时数据参数必须为布尔类型",
  FIELDS_PARAM_INVALID: "字段列表参数必须为字符串数组",
  MARKET_PARAM_INVALID: "市场参数必须为字符串类型",
  NO_PROVIDER_FOUND:
    "无法找到支持数据类型 '{receiverType}' 和市场 '{market}' 的数据提供商",
  PROVIDER_SELECTION_FAILED: "数据提供商选择过程中发生内部错误",
  PROVIDER_NOT_SUPPORT_CAPABILITY:
    "提供商 '{provider}' 不支持 '{capability}' 能力",
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
  PREFERRED_PROVIDER_NOT_SUPPORT_MARKET:
    "提供商 '{provider}' 不支持市场 '{market}'",
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
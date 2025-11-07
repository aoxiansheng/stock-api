import { API_OPERATIONS } from "@common/constants/domain";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
/**
 * 数据接收操作相关常量（精简版）
 * 仅保留本组件实际使用的导出
 */

/**
 * 支持的能力类型常量（用于数据提供商路由和能力匹配）
 * 重构说明：从 SUPPORTED_DATA_TYPES 重命名为 SUPPORTED_CAPABILITY_TYPES
 * 以更准确地反映其在能力映射中的作用
 */
export const SUPPORTED_CAPABILITY_TYPES = Object.freeze([
  CAPABILITY_NAMES.GET_STOCK_QUOTE,
  CAPABILITY_NAMES.GET_STOCK_BASIC_INFO,
  CAPABILITY_NAMES.GET_INDEX_QUOTE,
  CAPABILITY_NAMES.GET_MARKET_STATUS,
  CAPABILITY_NAMES.GET_TRADING_DAYS,
  CAPABILITY_NAMES.GET_GLOBAL_STATE,
  CAPABILITY_NAMES.GET_CRYPTO_QUOTE,
  CAPABILITY_NAMES.GET_CRYPTO_BASIC_INFO,
  CAPABILITY_NAMES.GET_STOCK_LOGO,
  CAPABILITY_NAMES.GET_CRYPTO_LOGO,
  CAPABILITY_NAMES.GET_STOCK_NEWS,
  CAPABILITY_NAMES.GET_CRYPTO_NEWS,
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

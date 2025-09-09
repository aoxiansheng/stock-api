/**
 * 数据接收验证规则常量
 * 包含验证规则、性能阈值等配置
 */

import { NUMERIC_CONSTANTS } from "@common/constants/core";
import { HTTP_TIMEOUTS, BATCH_SIZE_SEMANTICS } from "@common/constants/semantic";

/**
 * 数据接收验证规则常量
 */
export const RECEIVER_VALIDATION_RULES = Object.freeze({
  MIN_SYMBOL_LENGTH: 1, // 最小股票代码长度
  MAX_SYMBOL_LENGTH: 20, // 最大股票代码长度
  MAX_SYMBOLS_COUNT: BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE, // 最大股票代码数量 - 使用统一配置
  MIN_DATA_TYPE_LENGTH: 1, // 最小数据类型长度
  MAX_DATA_TYPE_LENGTH: 50, // 最大数据类型长度
  SYMBOL_PATTERN: /^[A-Za-z0-9._-]+$/, // 股票代码格式模式
  DATA_TYPE_PATTERN: /^[a-z-]+$/, // 数据类型格式模式
} as const);

/**
 * 数据接收性能阈值常量
 */
export const RECEIVER_PERFORMANCE_THRESHOLDS = Object.freeze({
  SLOW_REQUEST_MS: NUMERIC_CONSTANTS.N_1000, // 慢请求阈值（毫秒）
  MAX_SYMBOLS_PER_REQUEST: BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE, // 单次请求最大股票数量 - 使用统一配置
  LOG_SYMBOLS_LIMIT: NUMERIC_CONSTANTS.N_10, // 日志中显示的股票数量限制
  LARGE_SYMBOL_COUNT_WARNING: NUMERIC_CONSTANTS.N_50, // 大量股票代码警告阈值
  PROVIDER_SELECTION_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS, // 提供商选择超时 - 使用统一配置
  SYMBOL_TRANSFORMATION_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS, // 股票代码转换超时 - 使用统一配置
  DATA_FETCHING_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS, // 数据获取超时 - 使用统一配置
} as const);

/**
 * 市场识别规则常量 - 消除重复的配置结构
 */
export const MARKET_RECOGNITION_RULES = Object.freeze({
  // 统一的市场配置，消除重复的结构定义
  MARKETS: Object.freeze({
    HK: Object.freeze({
      SUFFIX: ".HK",
      NUMERIC_PATTERN: /^\d{5}$/, // 5位数字（如：00700）
      MARKET_CODE: "HK",
    }),
    US: Object.freeze({
      SUFFIX: ".US",
      ALPHA_PATTERN: /^[A-Z]{1,5}$/, // 1-5位字母（如：AAPL）
      MARKET_CODE: "US",
    }),
    SZ: Object.freeze({
      SUFFIX: ".SZ",
      PREFIX_PATTERNS: Object.freeze(["00", "30"]), // 深圳市场前缀
      MARKET_CODE: "SZ",
    }),
    SH: Object.freeze({
      SUFFIX: ".SH",
      PREFIX_PATTERNS: Object.freeze(["60", "68"]), // 上海市场前缀
      MARKET_CODE: "SH",
    }),
  }),
} as const);

/**
 * 请求选项验证规则常量 - 扁平化结构提升可读性
 */
export const REQUEST_OPTIONS_PREFERRED_PROVIDER_MAX_LENGTH = 50;
export const REQUEST_OPTIONS_FIELDS_MAX_ITEMS = 50;
export const REQUEST_OPTIONS_MARKET_MAX_LENGTH = 10;
export const REQUEST_OPTIONS_MARKET_PATTERN = /^[A-Z]{2,5}$/;
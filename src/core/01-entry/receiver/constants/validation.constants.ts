/**
 * 数据接收验证规则常量（精简版）
 * 仅保留 DTO 校验所需配置
 */

import { BATCH_SIZE_SEMANTICS } from "@common/constants/semantic";

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
 * 市场识别规则常量（被 common/utils/symbol-validation.util 使用）
 * 注意：该常量为通用工具所依赖，暂保留于此，后续可迁移至 shared/constants 统一出处
 */
export const MARKET_RECOGNITION_RULES = Object.freeze({
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
 * 若未来需要请求选项的额外校验常量，请在被实际使用时再添加（YAGNI）。
 */

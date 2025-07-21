/**
 * 市场相关定义 - 统一市场枚举和常量
 */

/**
 * 市场枚举
 */
export enum Market {
  HK = "HK",
  US = "US",
  SZ = "SZ",
  SH = "SH",
  CN = "CN", // A股市场的统称
  CRYPTO = "CRYPTO", // 加密货币市场
}

/**
 * 市场常量 - 兼容原有代码
 */
export const MARKETS = Object.freeze({
  HK: Market.HK,
  SZ: Market.SZ,
  SH: Market.SH,
  US: Market.US,
  CRYPTO: Market.CRYPTO,
} as const);

/**
 * 市场名称映射
 */
export const MARKET_NAMES = {
  [Market.HK]: "香港市场",
  [Market.SZ]: "深圳市场",
  [Market.SH]: "上海市场",
  [Market.US]: "美国市场",
  [Market.CRYPTO]: "加密货币市场",
  [Market.CN]: "中国A股市场",
} as const;

/**
 * 市场时区映射
 */
export const MARKET_TIMEZONES = {
  [Market.HK]: "Asia/Hong_Kong",
  [Market.SZ]: "Asia/Shanghai",
  [Market.SH]: "Asia/Shanghai",
  [Market.US]: "America/New_York",
  [Market.CRYPTO]: "UTC",
  [Market.CN]: "Asia/Shanghai",
} as const;

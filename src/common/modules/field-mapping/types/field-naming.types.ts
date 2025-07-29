/**
 * 字段命名重构相关的类型定义
 * 用于统一管理和映射不同组件间的字段关系
 */

// Receiver 组件的能力类型
export type CapabilityType = 
  | "get-stock-quote"
  | "get-stock-basic-info"
  | "get-index-quote"
  | "get-market-status"
  | "get-trading-days"
  | "get-global-state"
  | "get-crypto-quote"
  | "get-crypto-basic-info"
  | "get-stock-logo"
  | "get-crypto-logo"
  | "get-stock-news"
  | "get-crypto-news";

// Storage 组件的数据分类
export enum DataClassification {
  STOCK_QUOTE = "stock_quote",
  STOCK_CANDLE = "stock_candle",
  STOCK_TICK = "stock_tick",
  FINANCIAL_STATEMENT = "financial_statement",
  COMPANY_PROFILE = "company_profile",
  MARKET_NEWS = "market_news",
  TRADING_ORDER = "trading_order",
  USER_PORTFOLIO = "user_portfolio",
  GENERAL = "general",
  INDEX_QUOTE = "index_quote",
  MARKET_STATUS = "market_status",
  TRADING_DAYS = "trading_days",
  GLOBAL_STATE = "global_state",
  CRYPTO_QUOTE = "crypto_quote",
  CRYPTO_BASIC_INFO = "crypto_basic_info",
  STOCK_LOGO = "stock_logo",
  CRYPTO_LOGO = "crypto_logo",
  STOCK_NEWS = "stock_news",
  CRYPTO_NEWS = "crypto_news",
}

// Query 组件的过滤类型 (可以使用 CapabilityType 或 DataClassification 的字符串值)
export type DataTypeFilter = string;

/**
 * 字段映射关系配置
 */
export const FIELD_MAPPING_CONFIG = {
  // Receiver 能力类型到 Storage 数据分类的映射
  CAPABILITY_TO_CLASSIFICATION: {
    "get-stock-quote": DataClassification.STOCK_QUOTE,
    "get-stock-basic-info": DataClassification.COMPANY_PROFILE,
    "get-index-quote": DataClassification.INDEX_QUOTE,
    "get-market-status": DataClassification.MARKET_STATUS,
    "get-trading-days": DataClassification.TRADING_DAYS,
    "get-global-state": DataClassification.GLOBAL_STATE,
    "get-crypto-quote": DataClassification.CRYPTO_QUOTE,
    "get-crypto-basic-info": DataClassification.CRYPTO_BASIC_INFO,
    "get-stock-logo": DataClassification.STOCK_LOGO,
    "get-crypto-logo": DataClassification.CRYPTO_LOGO,
    "get-stock-news": DataClassification.STOCK_NEWS,
    "get-crypto-news": DataClassification.CRYPTO_NEWS,
  } as const,

  // Storage 数据分类到 Receiver 能力类型的反向映射
  CLASSIFICATION_TO_CAPABILITY: {
    [DataClassification.STOCK_QUOTE]: "get-stock-quote",
    [DataClassification.COMPANY_PROFILE]: "get-stock-basic-info",
    [DataClassification.INDEX_QUOTE]: "get-index-quote",
    [DataClassification.MARKET_STATUS]: "get-market-status",
    [DataClassification.TRADING_DAYS]: "get-trading-days",
    [DataClassification.GLOBAL_STATE]: "get-global-state",
    [DataClassification.CRYPTO_QUOTE]: "get-crypto-quote",
    [DataClassification.CRYPTO_BASIC_INFO]: "get-crypto-basic-info",
    [DataClassification.STOCK_LOGO]: "get-stock-logo",
    [DataClassification.CRYPTO_LOGO]: "get-crypto-logo",
    [DataClassification.STOCK_NEWS]: "get-stock-news",
    [DataClassification.CRYPTO_NEWS]: "get-crypto-news",
  } as const,
} as const;


/**
 * 字段命名重构相关的类型定义
 * 用于统一管理和映射不同组件间的字段关系
 */

// Receiver 组件的能力类型
export type ReceiverType = 
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
export enum StorageClassification {
  STOCK_QUOTE = "stock_quote",
  STOCK_CANDLE = "stock_candle",
  STOCK_TICK = "stock_tick",
  FINANCIAL_STATEMENT = "financial_statement",
  STOCK_BASIC_INFO = "stock_basic_info",
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

// Query 组件的过滤类型 (可以使用 ReceiverType 或 StorageClassification 的字符串值)
export type QueryTypeFilter = string;

/**
 * 字段映射关系配置
 */
export const FIELD_MAPPING_CONFIG = {
  // Receiver 能力类型到 Storage 数据分类的映射
  CAPABILITY_TO_CLASSIFICATION: {
    "get-stock-quote": StorageClassification.STOCK_QUOTE,
    "get-stock-basic-info": StorageClassification.STOCK_BASIC_INFO,
    "get-index-quote": StorageClassification.INDEX_QUOTE,
    "get-market-status": StorageClassification.MARKET_STATUS,
    "get-trading-days": StorageClassification.TRADING_DAYS,
    "get-global-state": StorageClassification.GLOBAL_STATE,
    "get-crypto-quote": StorageClassification.CRYPTO_QUOTE,
    "get-crypto-basic-info": StorageClassification.CRYPTO_BASIC_INFO,
    "get-stock-logo": StorageClassification.STOCK_LOGO,
    "get-crypto-logo": StorageClassification.CRYPTO_LOGO,
    "get-stock-news": StorageClassification.STOCK_NEWS,
    "get-crypto-news": StorageClassification.CRYPTO_NEWS,
  } as const,

  // Storage 数据分类到 Receiver 能力类型的反向映射
  CLASSIFICATION_TO_CAPABILITY: {
    [StorageClassification.STOCK_QUOTE]: "get-stock-quote",
    [StorageClassification.STOCK_BASIC_INFO]: "get-stock-basic-info",
    [StorageClassification.INDEX_QUOTE]: "get-index-quote",
    [StorageClassification.MARKET_STATUS]: "get-market-status",
    [StorageClassification.TRADING_DAYS]: "get-trading-days",
    [StorageClassification.GLOBAL_STATE]: "get-global-state",
    [StorageClassification.CRYPTO_QUOTE]: "get-crypto-quote",
    [StorageClassification.CRYPTO_BASIC_INFO]: "get-crypto-basic-info",
    [StorageClassification.STOCK_LOGO]: "get-stock-logo",
    [StorageClassification.CRYPTO_LOGO]: "get-crypto-logo",
    [StorageClassification.STOCK_NEWS]: "get-stock-news",
    [StorageClassification.CRYPTO_NEWS]: "get-crypto-news",
    // Add missing mappings
    [StorageClassification.STOCK_CANDLE]: "get-stock-quote",
    [StorageClassification.STOCK_TICK]: "get-stock-quote",
    [StorageClassification.FINANCIAL_STATEMENT]: "get-stock-basic-info",
    [StorageClassification.MARKET_NEWS]: "get-stock-news",
    [StorageClassification.TRADING_ORDER]: "get-global-state",
    [StorageClassification.USER_PORTFOLIO]: "get-global-state",
    [StorageClassification.GENERAL]: "get-global-state",
  } as const,
} as const;


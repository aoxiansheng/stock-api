/**
 * 存储类型枚举
 */
export enum StorageType {
  CACHE = "cache",
  PERSISTENT = "persistent",
  BOTH = "both",
}

/**
 * 数据分类枚举
 *
 * 用于标识不同类型的业务数据，便于分类存储和管理
 */
export enum StorageClassification {
  STOCK_QUOTE = "stock_quote",
  STOCK_CANDLE = "stock_candle",
  STOCK_TICK = "stock_tick",
  FINANCIAL_STATEMENT = "financial_statement",
  COMPANY_PROFILE = "company_profile",
  MARKET_NEWS = "market_news",
  TRADING_ORDER = "trading_order",
  USER_PORTFOLIO = "user_portfolio",
  GENERAL = "general", // 默认/通用类别
}

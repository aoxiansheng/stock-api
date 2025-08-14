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
  STOCK_BASIC_INFO = "stock_basic_info",
  MARKET_NEWS = "market_news",
  TRADING_ORDER = "trading_order",
  USER_PORTFOLIO = "user_portfolio",
  INDEX_QUOTE = "index_quote",
  MARKET_STATUS = "market_status",
  GENERAL = "general", // 默认/通用类别
}

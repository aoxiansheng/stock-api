/**
 * 统一的存储分类枚举 (Core内部共享)
 *
 * 此枚举整合了Core组件内的重复定义：
 * - /src/core/shared/types/field-naming.types.ts (19个值，完整)
 * - /src/core/04-storage/storage/enums/storage-type.enum.ts (11个值，不完整)
 *
 * 设计原则：
 * - 🔒 Core内部封装：仅供Core内7个组件使用
 * - 🎯 单一数据源：解决Core内部重复定义问题
 * - 📍 问题本地化：在问题发生的同一层级解决
 * - 🏗️ 架构一致性：与field-naming.types.ts保持同级
 *
 * 使用范围：
 * - ✅ core/01-entry (receiver, query)
 * - ✅ core/04-storage (storage services, DTOs)
 * - ✅ core/shared (field-mapping service)
 * - ❌ 外部模块 (alert, auth, cache, monitoring, providers)
 */
export enum StorageClassification {
  // 股票相关数据类型
  STOCK_QUOTE = "stock_quote",
  STOCK_CANDLE = "stock_candle",
  STOCK_TICK = "stock_tick",
  STOCK_BASIC_INFO = "stock_basic_info",
  STOCK_LOGO = "stock_logo",
  STOCK_NEWS = "stock_news",

  // 财务数据
  FINANCIAL_STATEMENT = "financial_statement",

  // 指数数据
  INDEX_QUOTE = "index_quote",

  // 市场数据
  MARKET_NEWS = "market_news",
  MARKET_STATUS = "market_status",
  TRADING_DAYS = "trading_days",

  // 交易相关
  TRADING_ORDER = "trading_order",
  USER_PORTFOLIO = "user_portfolio",

  // 加密货币数据类型
  CRYPTO_QUOTE = "crypto_quote",
  CRYPTO_BASIC_INFO = "crypto_basic_info",
  CRYPTO_LOGO = "crypto_logo",
  CRYPTO_NEWS = "crypto_news",

  // 系统通用
  GENERAL = "general",
  GLOBAL_STATE = "global_state",
}


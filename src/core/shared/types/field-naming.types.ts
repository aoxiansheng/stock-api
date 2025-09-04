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

// 从统一位置导入
import { StorageClassification } from "./storage-classification.enum";

// 重新导出以保持向后兼容
export { StorageClassification };

/**
 * Query 组件的过滤类型
 * 支持直接使用 StorageClassification 或 ReceiverType，以及特殊值
 */
export type QueryTypeFilter = StorageClassification | ReceiverType | 'all' | 'none';

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

import { API_OPERATIONS } from "@common/constants/domain";
import { CAPABILITY_NAMES } from "@providersv2/providers/constants/capability-names.constants";
/**
 * 字段命名重构相关的类型定义
 * 用于统一管理和映射不同组件间的字段关系
 */

// Receiver 组件的能力类型
export type ReceiverType =
  | "get-stock-quote" // API_OPERATIONS.STOCK_DATA.GET_QUOTE
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

/**
 * Query 组件的过滤类型
 * 支持直接使用 StorageClassification 或 ReceiverType，以及特殊值
 */
export type QueryTypeFilter =
  | StorageClassification
  | ReceiverType
  | "all"
  | "none";

/**
 * 字段映射关系配置
 */
export const FIELD_MAPPING_CONFIG = {
  // Receiver 能力类型到 Storage 数据分类的映射
  CAPABILITY_TO_CLASSIFICATION: {
    [CAPABILITY_NAMES.GET_STOCK_QUOTE]: StorageClassification.STOCK_QUOTE,
    [CAPABILITY_NAMES.GET_STOCK_BASIC_INFO]: StorageClassification.STOCK_BASIC_INFO,
    [CAPABILITY_NAMES.GET_INDEX_QUOTE]: StorageClassification.INDEX_QUOTE,
    [CAPABILITY_NAMES.GET_MARKET_STATUS]: StorageClassification.MARKET_STATUS,
    [CAPABILITY_NAMES.GET_TRADING_DAYS]: StorageClassification.TRADING_DAYS,
    [CAPABILITY_NAMES.GET_GLOBAL_STATE]: StorageClassification.GLOBAL_STATE,
    [CAPABILITY_NAMES.GET_CRYPTO_QUOTE]: StorageClassification.CRYPTO_QUOTE,
    [CAPABILITY_NAMES.GET_CRYPTO_BASIC_INFO]: StorageClassification.CRYPTO_BASIC_INFO,
    [CAPABILITY_NAMES.GET_STOCK_LOGO]: StorageClassification.STOCK_LOGO,
    [CAPABILITY_NAMES.GET_CRYPTO_LOGO]: StorageClassification.CRYPTO_LOGO,
    [CAPABILITY_NAMES.GET_STOCK_NEWS]: StorageClassification.STOCK_NEWS,
    [CAPABILITY_NAMES.GET_CRYPTO_NEWS]: StorageClassification.CRYPTO_NEWS,
  } as const,

  // Storage 数据分类到 Receiver 能力类型的反向映射
  CLASSIFICATION_TO_CAPABILITY: {
    [StorageClassification.STOCK_QUOTE]: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
    [StorageClassification.STOCK_BASIC_INFO]: CAPABILITY_NAMES.GET_STOCK_BASIC_INFO,
    [StorageClassification.INDEX_QUOTE]: CAPABILITY_NAMES.GET_INDEX_QUOTE,
    [StorageClassification.MARKET_STATUS]: CAPABILITY_NAMES.GET_MARKET_STATUS,
    [StorageClassification.TRADING_DAYS]: CAPABILITY_NAMES.GET_TRADING_DAYS,
    [StorageClassification.GLOBAL_STATE]: CAPABILITY_NAMES.GET_GLOBAL_STATE,
    [StorageClassification.CRYPTO_QUOTE]: CAPABILITY_NAMES.GET_CRYPTO_QUOTE,
    [StorageClassification.CRYPTO_BASIC_INFO]: CAPABILITY_NAMES.GET_CRYPTO_BASIC_INFO,
    [StorageClassification.STOCK_LOGO]: CAPABILITY_NAMES.GET_STOCK_LOGO,
    [StorageClassification.CRYPTO_LOGO]: CAPABILITY_NAMES.GET_CRYPTO_LOGO,
    [StorageClassification.STOCK_NEWS]: CAPABILITY_NAMES.GET_STOCK_NEWS,
    [StorageClassification.CRYPTO_NEWS]: CAPABILITY_NAMES.GET_CRYPTO_NEWS,
    // Add missing mappings
    [StorageClassification.STOCK_CANDLE]: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
    [StorageClassification.STOCK_TICK]: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
    [StorageClassification.FINANCIAL_STATEMENT]: "get-stock-basic-info",
    [StorageClassification.MARKET_NEWS]: "get-stock-news",
    [StorageClassification.TRADING_ORDER]: "get-global-state",
    [StorageClassification.USER_PORTFOLIO]: "get-global-state",
    [StorageClassification.GENERAL]: "get-global-state",
  } as const,

  // Receiver 能力类型到 Transformer 规则表名的映射（用于 transDataRuleListType）
  TRANS_RULE_TYPE_BY_CAPABILITY: {
    [CAPABILITY_NAMES.GET_STOCK_QUOTE]: "quote_fields",
    [CAPABILITY_NAMES.STREAM_STOCK_QUOTE]: "quote_fields",
    [CAPABILITY_NAMES.GET_STOCK_BASIC_INFO]: "basic_info_fields",
    [CAPABILITY_NAMES.GET_INDEX_QUOTE]: "index_fields",
    [CAPABILITY_NAMES.GET_MARKET_STATUS]: "market_status_fields",
    // 合理默认：无明确规则时使用报价字段
    [CAPABILITY_NAMES.GET_STOCK_REALTIME]: "quote_fields",
    [CAPABILITY_NAMES.GET_STOCK_HISTORY]: "quote_fields",
  } as const,
} as const;

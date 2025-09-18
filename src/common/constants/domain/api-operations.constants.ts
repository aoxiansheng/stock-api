/**
 * API操作常量
 * 🎯 Domain层 - API操作相关的业务领域专用常量
 * 🔧 统一API操作类型、数据类型、业务场景等重复字符串
 *
 * 解决的重复问题：
 * - "get-stock-quote" API操作类型 (26次重复)
 * - "quote" 数据类型标识 (32次重复)
 * - "stream-stock-quote" 流式操作 (多次重复)
 * - 其他API操作类型的字符串硬编码
 */

import { CORE_VALUES } from "../foundation";

/**
 * API操作配置常量
 * 🎯 解决系统中大量重复的API操作类型字符串
 */
export const API_OPERATIONS = Object.freeze({
  /**
   * 股票数据操作类型
   * 🔥 解决股票相关API操作的字符串重复
   */
  STOCK_DATA: {
    // 基础查询操作
    GET_QUOTE: "get-stock-quote", // 获取股票报价 (26次重复)
    GET_INFO: "get-stock-info", // 获取股票基本信息
    GET_REALTIME: "get-stock-realtime", // 获取股票实时数据

    // 流式数据操作
    STREAM_QUOTE: "stream-stock-quote", // 流式股票报价

    // 批量操作
  },

  /**
   * 指数数据操作类型
   * 🔧 统一指数相关API操作
   */
  INDEX_DATA: {},

  /**
   * 数据类型标识
   * 🔥 解决 "quote" 等数据类型的32次重复
   */
  DATA_TYPES: {
    QUOTE: "quote", // 报价数据 (32次重复)
  },

  /**
   * 市场类型标识
   * 🔧 统一不同市场的标识符
   */
  MARKET_TYPES: {
    HK: "hk", // 香港市场
    US: "us", // 美国市场
    CN: "cn", // 中国市场
  },

  /**
   * 数据获取方式
   * 🔧 统一数据获取模式标识
   */
  FETCH_MODES: {
    STREAM: "stream", // 流式数据
    BATCH: "batch", // 批量获取
  },

  /**
   * 业务场景标识
   * 🔧 统一不同业务场景的操作类型
   */
  BUSINESS_SCENARIOS: {
    // 交易相关
    TRADING: "trading", // 交易场景

    // 监控相关
    MONITORING: "monitoring", // 系统监控

    // 研发相关
  },

  /**
   * 操作优先级
   * 🔧 统一操作优先级标识
   */
  PRIORITIES: {
    HIGH: "high", // 高优先级
    LOW: "low", // 低优先级
  },

  /**
   * 缓存策略标识
   * 🔧 统一缓存策略类型
   */
  CACHE_STRATEGIES: {},
} as const);


/**
 * 类型定义
 */
export type ApiDataType =
  | "quote"
  | "info"
  | "basic-info"
  | "realtime"
  | "chart"
  | "news"
  | "fundamental"
  | "technical"
  | "historical"
  | "intraday";
export type ApiMarketType = "hk" | "us" | "cn" | "sg" | "uk" | "jp";
export type ApiFetchMode =
  | "rest"
  | "websocket"
  | "stream"
  | "batch"
  | "poll"
  | "push";
export type ApiBusinessScenario =
  | "trading"
  | "portfolio"
  | "watchlist"
  | "analysis"
  | "monitoring"
  | "alerting"
  | "reporting"
  | "dashboard"
  | "testing"
  | "debugging"
  | "development"
  | "benchmarking";
export type ApiPriority =
  | "real-time"
  | "high"
  | "normal"
  | "low"
  | "background"
  | "batch-low";
export type ApiCacheStrategy =
  | "strong-timeliness"
  | "weak-timeliness"
  | "market-aware"
  | "no-cache"
  | "force-refresh"
  | "cache-first"
  | "normal";

export type ApiOperationsConstants = typeof API_OPERATIONS;
export type StockDataOperations = typeof API_OPERATIONS.STOCK_DATA;
export type IndexDataOperations = typeof API_OPERATIONS.INDEX_DATA;
export type DataTypes = typeof API_OPERATIONS.DATA_TYPES;
export type MarketTypes = typeof API_OPERATIONS.MARKET_TYPES;
export type FetchModes = typeof API_OPERATIONS.FETCH_MODES;
export type BusinessScenarios = typeof API_OPERATIONS.BUSINESS_SCENARIOS;
export type Priorities = typeof API_OPERATIONS.PRIORITIES;
export type CacheStrategies = typeof API_OPERATIONS.CACHE_STRATEGIES;

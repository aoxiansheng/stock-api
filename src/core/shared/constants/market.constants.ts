/**
 * 市场常量
 * 🏢 Core模块 - 市场相关的核心常量
 * 📈 市场交易时间、状态、配置等核心定义
 */

import {
  HTTP_TIMEOUTS,
  BATCH_SIZE_SEMANTICS,
} from "../../../common/constants/semantic";
import {
  CORE_TIMEZONES,
  CORE_TRADING_TIMES,
} from "../../../common/constants/foundation";

/**
 * 市场枚举
 * 🎯 统一市场标识符
 */
export enum Market {
  HK = "HK", // 香港市场
  US = "US", // 美国市场
  SZ = "SZ", // 深圳市场
  SH = "SH", // 上海市场
  CN = "CN", // A股市场统称
  CRYPTO = "CRYPTO", // 加密货币市场
}

/**
 * 市场状态枚举
 * 🎯 统一市场交易状态
 */
export enum MarketStatus {
  MARKET_CLOSED = "MARKET_CLOSED", // 休市
  PRE_MARKET = "PRE_MARKET", // 盘前交易
  TRADING = "TRADING", // 正常交易
  LUNCH_BREAK = "LUNCH_BREAK", // 午休（港股、A股）
  AFTER_HOURS = "AFTER_HOURS", // 盘后交易
  HOLIDAY = "HOLIDAY", // 法定假日
  WEEKEND = "WEEKEND", // 周末
}


/**
 * 市场数据缓存配置
 * 🎯 基于Semantic层的缓存策略，针对市场数据特化
 */
export const MARKET_CACHE_CONFIG = Object.freeze({
  // 实时数据缓存TTL（秒）
  REALTIME_DATA: {
    QUOTE_TTL_SEC: 5, // 5秒 - 股价数据（实时数据）
  },

  // 基础信息缓存TTL（秒）
  BASIC_INFO: {
    COMPANY_INFO_TTL_SEC: 86400, // 1天 - 公司基本信息（静态数据）
  },

  // 历史数据缓存TTL（秒）
  HISTORICAL: {
    DAILY_KLINE_TTL_SEC: 86400, // 1天 - 日K线数据（静态数据）
  },
});

/**
 * 市场API超时配置
 * 🎯 基于Semantic层HTTP超时，针对市场API特化
 */
export const MARKET_API_TIMEOUTS = Object.freeze({
  // 实时数据API超时 (强时效性要求)
  REALTIME: {
    QUOTE_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS, // 5秒 - 股价查询
    MARKET_STATUS_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS, // 5秒 - 市场状态
    STREAM_CONNECT_TIMEOUT_MS: HTTP_TIMEOUTS.CONNECTION.ESTABLISH_MS, // 10秒 - 流连接
    STREAM_HEARTBEAT_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS, // 5秒 - 心跳检测
  },

  // 历史数据API超时 (中等时效性要求)
  HISTORICAL: {
    KLINE_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS, // 30秒 - K线数据
    DAILY_DATA_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS, // 30秒 - 日度数据
    FINANCIAL_REPORT_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.SLOW_MS, // 60秒 - 财务报告
    COMPANY_INFO_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS, // 30秒 - 公司信息
  },

  // 批量操作超时 (弱时效性要求，但数据量大)
  BATCH: {
    BULK_QUOTE_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.SLOW_MS, // 60秒 - 批量股价查询
    SYMBOL_LOOKUP_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS, // 30秒 - 股票代码查询
    MARKET_OVERVIEW_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.SLOW_MS, // 60秒 - 市场概览
    DATA_SYNC_TIMEOUT_MS: HTTP_TIMEOUTS.REQUEST.SLOW_MS, // 60秒 - 数据同步
  },
});

/**
 * 市场数据批量处理配置
 * 🎯 基于Semantic层批量配置，针对市场数据特化
 */
export const MARKET_BATCH_CONFIG = Object.freeze({
  // 股票数据批量处理
  STOCK_DATA: {
    QUOTE_BATCH_SIZE: BATCH_SIZE_SEMANTICS.SCENARIO.API_REQUEST_PROCESSING, // 100 - 股价批量大小
    SYMBOL_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.LARGE_BATCH, // 100 - 股票代码批量
    KLINE_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.MEDIUM_BATCH, // 50 - K线数据批量
  },

  // 市场概览批量处理 (大规模数据获取和聚合)
  MARKET_OVERVIEW: {
    SECTOR_ANALYSIS_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.LARGE_BATCH, // 100 - 板块分析批量
    TOP_MOVERS_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.MEDIUM_BATCH, // 50 - 涨跌榜批量
    MARKET_INDEX_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.SMALL_BATCH, // 20 - 市场指数批量
    VOLUME_LEADERS_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.MEDIUM_BATCH, // 50 - 成交量排行批量
  },

  // 数据同步批量处理 (后台批量同步和更新)
  DATA_SYNC: {
    COMPANY_INFO_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.LARGE_BATCH, // 100 - 公司信息批量同步
    FINANCIAL_DATA_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.MEDIUM_BATCH, // 50 - 财务数据批量同步
    HISTORICAL_PRICE_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.LARGE_BATCH, // 100 - 历史价格批量同步
    SYMBOL_MAPPING_BATCH_SIZE: BATCH_SIZE_SEMANTICS.SCENARIO.DATABASE_INSERT, // 50 - 股票代码映射批量同步 (适用于数据库插入)
  },
});

/**
 * 交易时段接口
 * 🎯 统一交易时段定义
 */
export interface TradingSession {
  start: string; // HH:mm 格式
  end: string; // HH:mm 格式
  name: string; // 时段名称
}

/**
 * 市场交易时间配置接口
 * 🎯 完整的市场交易时间结构定义
 */
export interface MarketTradingHours {
  market: Market;
  timezone: string;
  tradingSessions: TradingSession[];
  preMarket?: TradingSession;
  afterHours?: TradingSession;
  tradingDays: number[]; // 0=周日, 1=周一, ..., 6=周六
  dstSupport: boolean; // 夏令时支持
  dstStart?: string; // MM-DD 格式
  dstEnd?: string; // MM-DD 格式
  dstOffset?: number; // 夏令时偏移小时数
}

/**
 * 市场交易时间详细配置
 * 🎯 各市场的完整交易时间安排，包含夏令时支持
 */
export const MARKET_TRADING_HOURS: Record<Market, MarketTradingHours> =
  Object.freeze({
    // 🇭🇰 香港市场
    [Market.HK]: {
      market: Market.HK,
      timezone: CORE_TIMEZONES.ASIA.HONG_KONG,
      tradingSessions: [
        {
          start: CORE_TRADING_TIMES.HONG_KONG.MARKET_OPEN,
          end: CORE_TRADING_TIMES.HONG_KONG.LUNCH_BREAK_START,
          name: "上午交易",
        },
        {
          start: CORE_TRADING_TIMES.HONG_KONG.LUNCH_BREAK_END,
          end: CORE_TRADING_TIMES.HONG_KONG.MARKET_CLOSE,
          name: "下午交易",
        },
      ],
      preMarket: {
        start: CORE_TRADING_TIMES.HONG_KONG.PRE_MARKET_START,
        end: CORE_TRADING_TIMES.HONG_KONG.MARKET_OPEN,
        name: "盘前竞价",
      },
      tradingDays: [1, 2, 3, 4, 5], // 周一到周五
      dstSupport: false, // 香港不使用夏令时
    },

    // 🇺🇸 美国市场
    [Market.US]: {
      market: Market.US,
      timezone: CORE_TIMEZONES.AMERICA.NEW_YORK,
      tradingSessions: [
        {
          start: CORE_TRADING_TIMES.US.MARKET_OPEN,
          end: CORE_TRADING_TIMES.US.MARKET_CLOSE,
          name: "正常交易",
        },
      ],
      preMarket: {
        start: CORE_TRADING_TIMES.US.PRE_MARKET_START,
        end: CORE_TRADING_TIMES.US.MARKET_OPEN,
        name: "盘前交易",
      },
      afterHours: {
        start: CORE_TRADING_TIMES.US.MARKET_CLOSE,
        end: CORE_TRADING_TIMES.US.AFTER_HOURS_END,
        name: "盘后交易",
      },
      tradingDays: [1, 2, 3, 4, 5],
      dstSupport: true,
      dstStart: "03-08", // 3月第二个周日
      dstEnd: "11-01", // 11月第一个周日
      dstOffset: 1, // 夏令时向前1小时
    },

    // 🇨🇳 深圳市场
    [Market.SZ]: {
      market: Market.SZ,
      timezone: CORE_TIMEZONES.ASIA.SHANGHAI,
      tradingSessions: [
        {
          start: CORE_TRADING_TIMES.CHINA.MARKET_OPEN,
          end: CORE_TRADING_TIMES.CHINA.MORNING_CLOSE,
          name: "上午交易",
        },
        {
          start: CORE_TRADING_TIMES.CHINA.AFTERNOON_OPEN,
          end: CORE_TRADING_TIMES.CHINA.MARKET_CLOSE,
          name: "下午交易",
        },
      ],
      preMarket: {
        start: CORE_TRADING_TIMES.CHINA.PRE_MARKET_START,
        end: CORE_TRADING_TIMES.CHINA.MARKET_OPEN,
        name: "集合竞价",
      },
      tradingDays: [1, 2, 3, 4, 5],
      dstSupport: false, // 中国不使用夏令时
    },

    // 🇨🇳 上海市场
    [Market.SH]: {
      market: Market.SH,
      timezone: CORE_TIMEZONES.ASIA.SHANGHAI,
      tradingSessions: [
        {
          start: CORE_TRADING_TIMES.CHINA.MARKET_OPEN,
          end: CORE_TRADING_TIMES.CHINA.MORNING_CLOSE,
          name: "上午交易",
        },
        {
          start: CORE_TRADING_TIMES.CHINA.AFTERNOON_OPEN,
          end: CORE_TRADING_TIMES.CHINA.MARKET_CLOSE,
          name: "下午交易",
        },
      ],
      preMarket: {
        start: CORE_TRADING_TIMES.CHINA.PRE_MARKET_START,
        end: CORE_TRADING_TIMES.CHINA.MARKET_OPEN,
        name: "集合竞价",
      },
      tradingDays: [1, 2, 3, 4, 5],
      dstSupport: false,
    },

    // 🇨🇳 中国A股市场（统称）
    [Market.CN]: {
      market: Market.CN,
      timezone: CORE_TIMEZONES.ASIA.SHANGHAI,
      tradingSessions: [
        {
          start: CORE_TRADING_TIMES.CHINA.MARKET_OPEN,
          end: CORE_TRADING_TIMES.CHINA.MORNING_CLOSE,
          name: "上午交易",
        },
        {
          start: CORE_TRADING_TIMES.CHINA.AFTERNOON_OPEN,
          end: CORE_TRADING_TIMES.CHINA.MARKET_CLOSE,
          name: "下午交易",
        },
      ],
      preMarket: {
        start: CORE_TRADING_TIMES.CHINA.PRE_MARKET_START,
        end: CORE_TRADING_TIMES.CHINA.MARKET_OPEN,
        name: "集合竞价",
      },
      tradingDays: [1, 2, 3, 4, 5],
      dstSupport: false,
    },

    // 🪙 加密货币市场
    [Market.CRYPTO]: {
      market: Market.CRYPTO,
      timezone: CORE_TIMEZONES.UTC,
      tradingSessions: [{ start: "00:00", end: "23:59", name: "24小时交易" }],
      tradingDays: [0, 1, 2, 3, 4, 5, 6], // 7天24小时
      dstSupport: false,
    },
  });

/**
 * 基于市场状态的缓存TTL配置
 * 🎯 动态缓存策略，根据市场状态调整TTL
 */
export const CACHE_TTL_BY_MARKET_STATUS = Object.freeze({
  // 强时效接口缓存策略（秒）
  REALTIME: {
    [MarketStatus.TRADING]: 1, // 交易时间：1秒
    [MarketStatus.PRE_MARKET]: 5, // 盘前：5秒
    [MarketStatus.AFTER_HOURS]: 10, // 盘后：10秒
    [MarketStatus.LUNCH_BREAK]: 30, // 午休：30秒
    [MarketStatus.MARKET_CLOSED]: 60, // 休市：1分钟
    [MarketStatus.WEEKEND]: 300, // 周末：5分钟
    [MarketStatus.HOLIDAY]: 600, // 假日：10分钟
  },

  // 弱时效接口缓存策略（秒）
  ANALYTICAL: {
    [MarketStatus.TRADING]: 60, // 交易时间：1分钟
    [MarketStatus.PRE_MARKET]: 300, // 盘前：5分钟
    [MarketStatus.AFTER_HOURS]: 600, // 盘后：10分钟
    [MarketStatus.LUNCH_BREAK]: 900, // 午休：15分钟
    [MarketStatus.MARKET_CLOSED]: 3600, // 休市：1小时
    [MarketStatus.WEEKEND]: 7200, // 周末：2小时
    [MarketStatus.HOLIDAY]: 14400, // 假日：4小时
  },
});

/**
 * 数据变化检测阈值配置
 * 🎯 基于市场状态的敏感度配置
 */
export const CHANGE_DETECTION_THRESHOLDS = Object.freeze({
  // 价格变化阈值（百分比）
  PRICE_CHANGE: {
    [MarketStatus.TRADING]: 0.0001, // 交易时间：0.01%
    [MarketStatus.PRE_MARKET]: 0.001, // 盘前：0.1%
    [MarketStatus.AFTER_HOURS]: 0.001, // 盘后：0.1%
    [MarketStatus.LUNCH_BREAK]: 0.005, // 午休：0.5%
    [MarketStatus.MARKET_CLOSED]: 0.01, // 休市：1%
    [MarketStatus.WEEKEND]: 0.02, // 周末：2%
    [MarketStatus.HOLIDAY]: 0.02, // 假日：2%
  },

  // 成交量变化阈值（百分比）
  VOLUME_CHANGE: {
    [MarketStatus.TRADING]: 0.001, // 交易时间：0.1%
    [MarketStatus.PRE_MARKET]: 0.01, // 盘前：1%
    [MarketStatus.AFTER_HOURS]: 0.01, // 盘后：1%
    [MarketStatus.LUNCH_BREAK]: 0.05, // 午休：5%
    [MarketStatus.MARKET_CLOSED]: 0.1, // 休市：10%
    [MarketStatus.WEEKEND]: 0.2, // 周末：20%
    [MarketStatus.HOLIDAY]: 0.2, // 假日：20%
  },
});



/**
 * 类型定义
 */
// Removed unused type aliases: MarketCacheConfig, MarketApiTimeouts

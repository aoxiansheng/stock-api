/**
 * 市场领域常量
 * 🏢 Domain层 - 市场相关的业务领域专用常量
 * 📈 基于Semantic层构建，专注于金融市场业务逻辑
 */

import { 
  HTTP_TIMEOUTS,
  CACHE_TTL_SEMANTICS,
  BATCH_SIZE_SEMANTICS 
} from '../semantic';
import { 
  CORE_TIMEZONES, 
  CORE_TRADING_TIMES 
} from '../foundation';

/**
 * 市场枚举
 * 🎯 统一市场标识符
 */
export enum Market {
  HK = "HK",          // 香港市场
  US = "US",          // 美国市场
  SZ = "SZ",          // 深圳市场
  SH = "SH",          // 上海市场
  CN = "CN",          // A股市场统称
  CRYPTO = "CRYPTO",  // 加密货币市场
}

/**
 * 市场状态枚举
 * 🎯 统一市场交易状态
 */
export enum MarketStatus {
  MARKET_CLOSED = "MARKET_CLOSED",     // 休市
  PRE_MARKET = "PRE_MARKET",           // 盘前交易
  TRADING = "TRADING",                 // 正常交易
  LUNCH_BREAK = "LUNCH_BREAK",         // 午休（港股、A股）
  AFTER_HOURS = "AFTER_HOURS",         // 盘后交易
  HOLIDAY = "HOLIDAY",                 // 法定假日
  WEEKEND = "WEEKEND",                 // 周末
}

/**
 * 市场基础信息配置
 * 🎯 基于Semantic层构建的市场特定配置
 */
export const MARKET_DOMAIN_CONFIG = Object.freeze({
  // 市场名称映射
  NAMES: {
    [Market.HK]: "香港市场",
    [Market.SZ]: "深圳市场", 
    [Market.SH]: "上海市场",
    [Market.US]: "美国市场",
    [Market.CRYPTO]: "加密货币市场",
    [Market.CN]: "中国A股市场",
  } as const,

  // 市场时区映射
  TIMEZONES: {
    [Market.HK]: CORE_TIMEZONES.ASIA.HONG_KONG,
    [Market.SZ]: CORE_TIMEZONES.ASIA.SHANGHAI,
    [Market.SH]: CORE_TIMEZONES.ASIA.SHANGHAI, 
    [Market.US]: CORE_TIMEZONES.AMERICA.NEW_YORK,
    [Market.CRYPTO]: CORE_TIMEZONES.UTC,
    [Market.CN]: CORE_TIMEZONES.ASIA.SHANGHAI,
  } as const,

  // 市场货币映射
  CURRENCIES: {
    [Market.HK]: "HKD",     // 港币
    [Market.SZ]: "CNY",     // 人民币
    [Market.SH]: "CNY",     // 人民币
    [Market.US]: "USD",     // 美元
    [Market.CRYPTO]: "USDT", // 泰达币
    [Market.CN]: "CNY",     // 人民币
  } as const,

  // 市场语言映射
  LANGUAGES: {
    [Market.HK]: ["zh-HK", "en-US"],    // 繁体中文、英文
    [Market.SZ]: ["zh-CN"],             // 简体中文
    [Market.SH]: ["zh-CN"],             // 简体中文
    [Market.US]: ["en-US"],             // 英文
    [Market.CRYPTO]: ["en-US", "zh-CN"], // 英文、简体中文
    [Market.CN]: ["zh-CN"],             // 简体中文
  } as const,
});

/**
 * 市场数据缓存配置
 * 🎯 基于Semantic层的缓存策略，针对市场数据特化
 */
export const MARKET_CACHE_CONFIG = Object.freeze({
  // 实时数据缓存TTL（秒）
  REALTIME_DATA: {
    QUOTE_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.REALTIME_SEC,        // 5秒 - 股价数据
    ORDER_BOOK_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.REALTIME_SEC,   // 5秒 - 订单簿数据
    TRADE_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.REALTIME_SEC,        // 5秒 - 交易数据
  },

  // 基础信息缓存TTL（秒）
  BASIC_INFO: {
    COMPANY_INFO_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.STATIC_SEC,   // 1天 - 公司基本信息
    FINANCIAL_DATA_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.SLOW_UPDATE_SEC, // 1小时 - 财务数据
    MARKET_STATUS_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.NORMAL_UPDATE_SEC,  // 10分钟 - 市场状态
  },

  // 历史数据缓存TTL（秒）
  HISTORICAL: {
    DAILY_KLINE_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.STATIC_SEC,    // 1天 - 日K线数据
    MINUTE_KLINE_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.FREQUENT_UPDATE_SEC, // 1分钟 - 分钟K线
    VOLUME_TTL_SEC: CACHE_TTL_SEMANTICS.DATA_TYPE.NORMAL_UPDATE_SEC,         // 10分钟 - 成交量数据
  },
});

/**
 * 市场API超时配置
 * 🎯 基于Semantic层HTTP超时，针对市场API特化
 */
export const MARKET_API_TIMEOUTS = Object.freeze({
  // 实时数据API超时
  REALTIME: {
    QUOTE_REQUEST_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS,          // 5秒 - 股价请求
    ORDER_BOOK_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS,             // 5秒 - 订单簿请求
    TRADE_STREAM_MS: HTTP_TIMEOUTS.CONNECTION.KEEP_ALIVE_MS,  // 60秒 - 交易流连接
  },

  // 历史数据API超时
  HISTORICAL: {
    KLINE_REQUEST_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS,        // 30秒 - K线数据请求
    VOLUME_REQUEST_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS,       // 30秒 - 成交量请求
    FINANCIAL_REQUEST_MS: HTTP_TIMEOUTS.REQUEST.SLOW_MS,      // 60秒 - 财务数据请求
  },

  // 批量操作超时
  BATCH: {
    MULTI_QUOTE_MS: HTTP_TIMEOUTS.REQUEST.SLOW_MS,            // 60秒 - 批量股价请求
    SYMBOL_LIST_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS,          // 30秒 - 股票列表请求
    MARKET_OVERVIEW_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS,      // 30秒 - 市场概览请求
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
    SYMBOL_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.LARGE_BATCH,        // 100 - 股票代码批量
    KLINE_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.MEDIUM_BATCH,        // 50 - K线数据批量
  },

  // 市场概览批量处理
  MARKET_OVERVIEW: {
    SECTOR_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.SMALL_BATCH,        // 25 - 行业数据批量
    INDEX_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.SMALL_BATCH,         // 25 - 指数数据批量
    TOP_STOCKS_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.MEDIUM_BATCH,         // 50 - 热门股票数量
  },

  // 数据同步批量处理
  DATA_SYNC: {
    REALTIME_SYNC_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.HUGE_BATCH,        // 500 - 实时同步批量
    HISTORICAL_SYNC_SIZE: BATCH_SIZE_SEMANTICS.BASIC.MAX_SIZE,              // 1000 - 历史同步批量
    CLEANUP_BATCH_SIZE: BATCH_SIZE_SEMANTICS.PERFORMANCE.LARGE_BATCH,       // 100 - 清理批量
  },
});

/**
 * 交易时段接口
 * 🎯 统一交易时段定义
 */
export interface TradingSession {
  start: string;    // HH:mm 格式
  end: string;      // HH:mm 格式  
  name: string;     // 时段名称
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
  tradingDays: number[];  // 0=周日, 1=周一, ..., 6=周六
  dstSupport: boolean;    // 夏令时支持
  dstStart?: string;      // MM-DD 格式
  dstEnd?: string;        // MM-DD 格式
  dstOffset?: number;     // 夏令时偏移小时数
}

/**
 * 市场交易时间详细配置
 * 🎯 各市场的完整交易时间安排，包含夏令时支持
 */
export const MARKET_TRADING_HOURS: Record<Market, MarketTradingHours> = Object.freeze({
  // 🇭🇰 香港市场
  [Market.HK]: {
    market: Market.HK,
    timezone: CORE_TIMEZONES.ASIA.HONG_KONG,
    tradingSessions: [
      { start: CORE_TRADING_TIMES.HONG_KONG.MARKET_OPEN, end: CORE_TRADING_TIMES.HONG_KONG.LUNCH_BREAK_START, name: "上午交易" },
      { start: CORE_TRADING_TIMES.HONG_KONG.LUNCH_BREAK_END, end: CORE_TRADING_TIMES.HONG_KONG.MARKET_CLOSE, name: "下午交易" },
    ],
    preMarket: { start: CORE_TRADING_TIMES.HONG_KONG.PRE_MARKET_START, end: CORE_TRADING_TIMES.HONG_KONG.MARKET_OPEN, name: "盘前竞价" },
    tradingDays: [1, 2, 3, 4, 5], // 周一到周五
    dstSupport: false, // 香港不使用夏令时
  },

  // 🇺🇸 美国市场
  [Market.US]: {
    market: Market.US,
    timezone: CORE_TIMEZONES.AMERICA.NEW_YORK,
    tradingSessions: [{ start: CORE_TRADING_TIMES.US.MARKET_OPEN, end: CORE_TRADING_TIMES.US.MARKET_CLOSE, name: "正常交易" }],
    preMarket: { start: CORE_TRADING_TIMES.US.PRE_MARKET_START, end: CORE_TRADING_TIMES.US.MARKET_OPEN, name: "盘前交易" },
    afterHours: { start: CORE_TRADING_TIMES.US.MARKET_CLOSE, end: CORE_TRADING_TIMES.US.AFTER_HOURS_END, name: "盘后交易" },
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
      { start: CORE_TRADING_TIMES.CHINA.MARKET_OPEN, end: CORE_TRADING_TIMES.CHINA.MORNING_CLOSE, name: "上午交易" },
      { start: CORE_TRADING_TIMES.CHINA.AFTERNOON_OPEN, end: CORE_TRADING_TIMES.CHINA.MARKET_CLOSE, name: "下午交易" },
    ],
    preMarket: { start: CORE_TRADING_TIMES.CHINA.PRE_MARKET_START, end: CORE_TRADING_TIMES.CHINA.MARKET_OPEN, name: "集合竞价" },
    tradingDays: [1, 2, 3, 4, 5],
    dstSupport: false, // 中国不使用夏令时
  },

  // 🇨🇳 上海市场
  [Market.SH]: {
    market: Market.SH,
    timezone: CORE_TIMEZONES.ASIA.SHANGHAI,
    tradingSessions: [
      { start: CORE_TRADING_TIMES.CHINA.MARKET_OPEN, end: CORE_TRADING_TIMES.CHINA.MORNING_CLOSE, name: "上午交易" },
      { start: CORE_TRADING_TIMES.CHINA.AFTERNOON_OPEN, end: CORE_TRADING_TIMES.CHINA.MARKET_CLOSE, name: "下午交易" },
    ],
    preMarket: { start: CORE_TRADING_TIMES.CHINA.PRE_MARKET_START, end: CORE_TRADING_TIMES.CHINA.MARKET_OPEN, name: "集合竞价" },
    tradingDays: [1, 2, 3, 4, 5],
    dstSupport: false,
  },

  // 🇨🇳 中国A股市场（统称）
  [Market.CN]: {
    market: Market.CN,
    timezone: CORE_TIMEZONES.ASIA.SHANGHAI,
    tradingSessions: [
      { start: CORE_TRADING_TIMES.CHINA.MARKET_OPEN, end: CORE_TRADING_TIMES.CHINA.MORNING_CLOSE, name: "上午交易" },
      { start: CORE_TRADING_TIMES.CHINA.AFTERNOON_OPEN, end: CORE_TRADING_TIMES.CHINA.MARKET_CLOSE, name: "下午交易" },
    ],
    preMarket: { start: CORE_TRADING_TIMES.CHINA.PRE_MARKET_START, end: CORE_TRADING_TIMES.CHINA.MARKET_OPEN, name: "集合竞价" },
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
});;

/**
 * 基于市场状态的缓存TTL配置
 * 🎯 动态缓存策略，根据市场状态调整TTL
 */
export const CACHE_TTL_BY_MARKET_STATUS = Object.freeze({
  // 强时效接口缓存策略（秒）
  REALTIME: {
    [MarketStatus.TRADING]: 1,         // 交易时间：1秒
    [MarketStatus.PRE_MARKET]: 5,      // 盘前：5秒
    [MarketStatus.AFTER_HOURS]: 10,    // 盘后：10秒
    [MarketStatus.LUNCH_BREAK]: 30,    // 午休：30秒
    [MarketStatus.MARKET_CLOSED]: 60,  // 休市：1分钟
    [MarketStatus.WEEKEND]: 300,       // 周末：5分钟
    [MarketStatus.HOLIDAY]: 600,       // 假日：10分钟
  },

  // 弱时效接口缓存策略（秒）
  ANALYTICAL: {
    [MarketStatus.TRADING]: 60,        // 交易时间：1分钟
    [MarketStatus.PRE_MARKET]: 300,    // 盘前：5分钟
    [MarketStatus.AFTER_HOURS]: 600,   // 盘后：10分钟
    [MarketStatus.LUNCH_BREAK]: 900,   // 午休：15分钟
    [MarketStatus.MARKET_CLOSED]: 3600,// 休市：1小时
    [MarketStatus.WEEKEND]: 7200,      // 周末：2小时
    [MarketStatus.HOLIDAY]: 14400,     // 假日：4小时
  },
});

/**
 * 数据变化检测阈值配置
 * 🎯 基于市场状态的敏感度配置
 */
export const CHANGE_DETECTION_THRESHOLDS = Object.freeze({
  // 价格变化阈值（百分比）
  PRICE_CHANGE: {
    [MarketStatus.TRADING]: 0.0001,       // 交易时间：0.01%
    [MarketStatus.PRE_MARKET]: 0.001,     // 盘前：0.1%
    [MarketStatus.AFTER_HOURS]: 0.001,    // 盘后：0.1%
    [MarketStatus.LUNCH_BREAK]: 0.005,    // 午休：0.5%
    [MarketStatus.MARKET_CLOSED]: 0.01,   // 休市：1%
    [MarketStatus.WEEKEND]: 0.02,         // 周末：2%
    [MarketStatus.HOLIDAY]: 0.02,         // 假日：2%
  },

  // 成交量变化阈值（百分比）
  VOLUME_CHANGE: {
    [MarketStatus.TRADING]: 0.001,        // 交易时间：0.1%
    [MarketStatus.PRE_MARKET]: 0.01,      // 盘前：1%
    [MarketStatus.AFTER_HOURS]: 0.01,     // 盘后：1%
    [MarketStatus.LUNCH_BREAK]: 0.05,     // 午休：5%
    [MarketStatus.MARKET_CLOSED]: 0.1,    // 休市：10%
    [MarketStatus.WEEKEND]: 0.2,          // 周末：20%
    [MarketStatus.HOLIDAY]: 0.2,          // 假日：20%
  },
});

/**
 * 市场数据质量配置
 * 🎯 数据质量检查和验证标准
 */
export const MARKET_DATA_QUALITY = Object.freeze({
  // 数据完整性检查
  COMPLETENESS: {
    MIN_REQUIRED_FIELDS: 5,        // 最少必需字段数
    MAX_MISSING_RATE: 0.05,        // 最大缺失率 5%
    REQUIRED_FIELDS: ['symbol', 'price', 'volume', 'timestamp', 'market'],
  },

  // 数据时效性检查
  TIMELINESS: {
    MAX_DELAY_SECONDS: 30,         // 最大延迟30秒
    STALE_DATA_THRESHOLD: 300,     // 过期数据阈值5分钟
    REALTIME_THRESHOLD: 10,        // 实时数据阈值10秒
  },

  // 数据准确性检查
  ACCURACY: {
    PRICE_CHANGE_THRESHOLD: 0.5,   // 价格变动阈值50%
    VOLUME_SPIKE_THRESHOLD: 10,    // 成交量突增阈值10倍
    OUTLIER_DETECTION: true,       // 启用异常值检测
  },
});

/**
 * 市场域工具函数
 */
export class MarketDomainUtil {
  /**
   * 判断市场是否开盘
   */
  static isMarketOpen(market: Market, currentTime: Date = new Date()): boolean {
    const marketConfig = MARKET_TRADING_HOURS[market];
    if (!marketConfig?.tradingSessions) return false;

    const timeStr = currentTime.toTimeString().slice(0, 5); // HH:mm格式
    return marketConfig.tradingSessions.some(session => 
      timeStr >= session.start && timeStr <= session.end
    );
  }

  /**
   * 获取市场当前状态
   */
  static getMarketStatus(market: Market, currentTime: Date = new Date()): MarketStatus {
    const day = currentTime.getDay();
    
    // 周末检查
    if (day === 0 || day === 6) {
      return MarketStatus.WEEKEND;
    }

    // 加密货币市场始终交易
    if (market === Market.CRYPTO) {
      return MarketStatus.TRADING;
    }

    if (this.isMarketOpen(market, currentTime)) {
      return MarketStatus.TRADING;
    }

    return MarketStatus.MARKET_CLOSED;
  }

  /**
   * 获取推荐的缓存TTL
   */
  static getRecommendedCacheTTL(dataType: 'realtime' | 'basic' | 'historical', market: Market): number {
    if (market === Market.CRYPTO) {
      // 加密货币市场数据更新更频繁
      return Math.floor(MARKET_CACHE_CONFIG.REALTIME_DATA.QUOTE_TTL_SEC / 2);
    }

    switch (dataType) {
      case 'realtime':
        return MARKET_CACHE_CONFIG.REALTIME_DATA.QUOTE_TTL_SEC;
      case 'basic':
        return MARKET_CACHE_CONFIG.BASIC_INFO.COMPANY_INFO_TTL_SEC;
      case 'historical':
        return MARKET_CACHE_CONFIG.HISTORICAL.DAILY_KLINE_TTL_SEC;
      default:
        return MARKET_CACHE_CONFIG.REALTIME_DATA.QUOTE_TTL_SEC;
    }
  }

  /**
   * 验证股票代码格式
   */
  static isValidSymbol(symbol: string, market: Market): boolean {
    const patterns: Record<Market, RegExp> = {
      [Market.HK]: /^\d{5}\.HK$/,           // 00700.HK
      [Market.US]: /^[A-Z]{1,5}$/,          // AAPL
      [Market.SZ]: /^\d{6}\.SZ$/,           // 000001.SZ
      [Market.SH]: /^\d{6}\.SH$/,           // 600000.SH
      [Market.CN]: /^\d{6}\.(SZ|SH)$/,      // 通用A股格式
      [Market.CRYPTO]: /^[A-Z]+USDT$/,      // BTCUSDT
    };

    return patterns[market]?.test(symbol) || false;
  }

  /**
   * 获取批量请求推荐大小
   */
  static getRecommendedBatchSize(operation: 'quote' | 'symbol' | 'kline'): number {
    switch (operation) {
      case 'quote':
        return MARKET_BATCH_CONFIG.STOCK_DATA.QUOTE_BATCH_SIZE;
      case 'symbol':
        return MARKET_BATCH_CONFIG.STOCK_DATA.SYMBOL_BATCH_SIZE;
      case 'kline':
        return MARKET_BATCH_CONFIG.STOCK_DATA.KLINE_BATCH_SIZE;
      default:
        return MARKET_BATCH_CONFIG.STOCK_DATA.QUOTE_BATCH_SIZE;
    }
  }
}

/**
 * 类型定义
 */
export type MarketDomainConfig = typeof MARKET_DOMAIN_CONFIG;
export type MarketCacheConfig = typeof MARKET_CACHE_CONFIG;
export type MarketApiTimeouts = typeof MARKET_API_TIMEOUTS;
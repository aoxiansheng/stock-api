/**
 * 市场交易时间配置
 * 🕐 支持多市场、夏令时、节假日等复杂交易时间管理
 */

import { Market } from "./market.constants";

/**
 * 市场状态枚举
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
 * 交易时段配置
 */
export interface TradingSession {
  start: string; // HH:mm 格式
  end: string; // HH:mm 格式
  name: string; // 时段名称
}

/**
 * 市场交易时间配置
 */
export interface MarketTradingHours {
  market: Market;
  timezone: string;

  // 正常交易时段
  tradingSessions: TradingSession[];

  // 盘前交易（可选）
  preMarket?: TradingSession;

  // 盘后交易（可选）
  afterHours?: TradingSession;

  // 交易日（周一到周五为默认）
  tradingDays: number[]; // 0=周日, 1=周一, ..., 6=周六

  // 夏令时支持
  dstSupport: boolean;
  dstStart?: string; // MM-DD 格式，如 "03-08"（3月第二个周日）
  dstEnd?: string; // MM-DD 格式，如 "11-01"（11月第一个周日）
  dstOffset?: number; // 夏令时偏移小时数
}

/**
 * 各市场交易时间配置
 */
export const MARKET_TRADING_HOURS: Record<Market, MarketTradingHours> = {
  // 🇭🇰 香港市场
  [Market.HK]: {
    market: Market.HK,
    timezone: "Asia/Hong_Kong",
    tradingSessions: [
      { start: "09:30", end: "12:00", name: "上午交易" },
      { start: "13:00", end: "16:00", name: "下午交易" },
    ],
    preMarket: { start: "09:00", end: "09:30", name: "盘前竞价" },
    tradingDays: [1, 2, 3, 4, 5], // 周一到周五
    dstSupport: false, // 香港不使用夏令时
  },

  // 🇺🇸 美国市场
  [Market.US]: {
    market: Market.US,
    timezone: "America/New_York",
    tradingSessions: [{ start: "09:30", end: "16:00", name: "正常交易" }],
    preMarket: { start: "04:00", end: "09:30", name: "盘前交易" },
    afterHours: { start: "16:00", end: "20:00", name: "盘后交易" },
    tradingDays: [1, 2, 3, 4, 5],
    dstSupport: true,
    dstStart: "03-08", // 3月第二个周日
    dstEnd: "11-01", // 11月第一个周日
    dstOffset: 1, // 夏令时向前1小时
  },

  // 🇨🇳 深圳市场
  [Market.SZ]: {
    market: Market.SZ,
    timezone: "Asia/Shanghai",
    tradingSessions: [
      { start: "09:30", end: "11:30", name: "上午交易" },
      { start: "13:00", end: "15:00", name: "下午交易" },
    ],
    preMarket: { start: "09:15", end: "09:30", name: "集合竞价" },
    tradingDays: [1, 2, 3, 4, 5],
    dstSupport: false, // 中国不使用夏令时
  },

  // 🇨🇳 上海市场
  [Market.SH]: {
    market: Market.SH,
    timezone: "Asia/Shanghai",
    tradingSessions: [
      { start: "09:30", end: "11:30", name: "上午交易" },
      { start: "13:00", end: "15:00", name: "下午交易" },
    ],
    preMarket: { start: "09:15", end: "09:30", name: "集合竞价" },
    tradingDays: [1, 2, 3, 4, 5],
    dstSupport: false,
  },

  // 🇨🇳 中国A股市场（统称）
  [Market.CN]: {
    market: Market.CN,
    timezone: "Asia/Shanghai",
    tradingSessions: [
      { start: "09:30", end: "11:30", name: "上午交易" },
      { start: "13:00", end: "15:00", name: "下午交易" },
    ],
    preMarket: { start: "09:15", end: "09:30", name: "集合竞价" },
    tradingDays: [1, 2, 3, 4, 5],
    dstSupport: false,
  },

  // 🪙 加密货币市场
  [Market.CRYPTO]: {
    market: Market.CRYPTO,
    timezone: "UTC",
    tradingSessions: [{ start: "00:00", end: "23:59", name: "24小时交易" }],
    tradingDays: [0, 1, 2, 3, 4, 5, 6], // 7天24小时
    dstSupport: false,
  },
};

/**
 * 缓存TTL配置 - 基于市场状态的动态缓存策略
 */
export const CACHE_TTL_BY_MARKET_STATUS = {
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
} as const;

/**
 * 数据变化检测阈值 - 基于市场状态的敏感度配置
 */
export const CHANGE_DETECTION_THRESHOLDS = {
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
} as const;

/**
 * Provider能力映射 - 支持市场状态查询
 */
export const MARKET_STATUS_CAPABILITY_MAP = {
  "market-status": "get-market-status",
  "trading-hours": "get-trading-hours",
  "market-holidays": "get-market-holidays",
  "market-calendar": "get-market-calendar",
} as const;

/**
 * 常见假日配置（需要从Provider获取实时数据补充）
 */
export const COMMON_HOLIDAYS = {
  [Market.US]: [
    "01-01", // 新年
    "07-04", // 独立日
    "12-25", // 圣诞节
    // 感恩节等变动假日需要从Provider获取
  ],
  [Market.HK]: [
    "01-01", // 新年
    "10-01", // 国庆节
    "12-25", // 圣诞节
    // 农历新年等变动假日需要从Provider获取
  ],
  [Market.CN]: [
    "01-01", // 新年
    "10-01", // 国庆节
    "05-01", // 劳动节
    // 春节等变动假日需要从Provider获取
  ],
} as const;

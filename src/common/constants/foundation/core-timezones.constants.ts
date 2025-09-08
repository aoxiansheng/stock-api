/**
 * 核心时区常量配置
 * 🌍 Foundation层 - 全球时区标准化定义
 * 📍 提供统一的时区标识符，避免硬编码重复
 */

/**
 * 标准时区标识符
 * 🎯 统一时区定义，解决"Asia/Shanghai"等重复问题
 */
export const CORE_TIMEZONES = Object.freeze({
  // 亚洲时区
  ASIA: {
    SHANGHAI: "Asia/Shanghai",       // 中国标准时间 (CST) UTC+8
    HONG_KONG: "Asia/Hong_Kong",     // 香港时间 (HKT) UTC+8  
    TOKYO: "Asia/Tokyo",             // 日本标准时间 (JST) UTC+9
    SINGAPORE: "Asia/Singapore",     // 新加坡时间 (SGT) UTC+8
    SEOUL: "Asia/Seoul",             // 韩国标准时间 (KST) UTC+9
  },

  // 美洲时区
  AMERICA: {
    NEW_YORK: "America/New_York",    // 美国东部时间 (EST/EDT) UTC-5/-4
    CHICAGO: "America/Chicago",      // 美国中部时间 (CST/CDT) UTC-6/-5
    LOS_ANGELES: "America/Los_Angeles", // 美国太平洋时间 (PST/PDT) UTC-8/-7
    TORONTO: "America/Toronto",      // 加拿大东部时间 (EST/EDT) UTC-5/-4
  },

  // 欧洲时区  
  EUROPE: {
    LONDON: "Europe/London",         // 格林威治时间 (GMT/BST) UTC+0/+1
    PARIS: "Europe/Paris",           // 中欧时间 (CET/CEST) UTC+1/+2
    ZURICH: "Europe/Zurich",         // 中欧时间 (CET/CEST) UTC+1/+2
    FRANKFURT: "Europe/Berlin",      // 中欧时间 (CET/CEST) UTC+1/+2
  },

  // 特殊时区
  UTC: "UTC",                        // 协调世界时 UTC+0
  GMT: "GMT",                        // 格林威治标准时间 UTC+0
} as const);

/**
 * 交易时间相关常量
 * 🎯 统一交易时间定义，解决"09:30"等重复问题
 */
export const CORE_TRADING_TIMES = Object.freeze({
  // 中国市场标准时间
  CHINA: {
    PRE_MARKET_START: "09:15",       // 集合竞价开始
    MARKET_OPEN: "09:30",            // 开市时间
    MORNING_CLOSE: "11:30",          // 上午收市
    AFTERNOON_OPEN: "13:00",         // 下午开市  
    MARKET_CLOSE: "15:00",           // 收市时间
  },

  // 香港市场时间
  HONG_KONG: {
    PRE_MARKET_START: "09:00",       // 竞价时段开始
    MARKET_OPEN: "09:30",            // 开市时间
    LUNCH_BREAK_START: "12:00",      // 午休开始
    LUNCH_BREAK_END: "13:00",        // 午休结束  
    MARKET_CLOSE: "16:00",           // 收市时间
  },

  // 美国市场时间
  US: {
    PRE_MARKET_START: "04:00",       // 盘前交易开始 (ET)
    MARKET_OPEN: "09:30",            // 开市时间 (ET)
    MARKET_CLOSE: "16:00",           // 收市时间 (ET)
    AFTER_HOURS_END: "20:00",        // 盘后交易结束 (ET)
  },
} as const);

/**
 * 类型定义
 */
export type CoreTimezones = typeof CORE_TIMEZONES;
export type CoreTradingTimes = typeof CORE_TRADING_TIMES;

/**
 * 时区工具函数
 */
export class TimezoneUtil {
  /**
   * 检查是否为有效的时区标识符
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取时区的UTC偏移量（分钟）
   */
  static getTimezoneOffset(timezone: string): number {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const targetTime = new Date(utc.toLocaleString('en-US', { timeZone: timezone }));
    return (targetTime.getTime() - utc.getTime()) / (1000 * 60);
  }

  /**
   * 判断时区是否支持夏令时
   */
  static supportsDST(timezone: string): boolean {
    const jan = new Date(2023, 0, 1);
    const jul = new Date(2023, 6, 1);
    
    const janOffset = TimezoneUtil.getTimezoneOffset(timezone);
    const julOffset = TimezoneUtil.getTimezoneOffset(timezone);
    
    return janOffset !== julOffset;
  }

  /**
   * 获取常用的中国相关时区
   */
  static getChinaTimezones(): string[] {
    return [
      CORE_TIMEZONES.ASIA.SHANGHAI,
      CORE_TIMEZONES.ASIA.HONG_KONG,
    ];
  }
}
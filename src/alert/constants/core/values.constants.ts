/**
 * 核心数值常量
 * 🎯 基础层 - 纯数值定义，避免重复
 * 📋 所有magic number的单一真实来源
 */

/**
 * 基础数值常量 - 系统底层配置
 */
export const CORE_VALUES = Object.freeze({
  /**
   * 数量相关基础值
   */
  QUANTITIES: {
    ZERO: 0,
    ONE: 1,
    TEN: 10,
    FIFTY: 50,
    HUNDRED: 100,
    THOUSAND: 1000,
    TEN_THOUSAND: 10000,
  },

  /**
   * 时间相关基础值 (秒)
   */
  TIME_SECONDS: {
    ONE_SECOND: 1,
    TEN_SECONDS: 10,
    THIRTY_SECONDS: 30,
    ONE_MINUTE: 60,
    FIVE_MINUTES: 300,
    THIRTY_MINUTES: 1800,
    ONE_HOUR: 3600,
    ONE_DAY: 86400,
    THIRTY_DAYS: 2628000,
    NINETY_DAYS: 7884000,
    ONE_YEAR: 31536000,
  },

  /**
   * 时间相关基础值 (毫秒)
   */
  TIME_MILLISECONDS: {
    ONE_SECOND: 1000,
    TEN_SECONDS: 10000,
    ONE_MINUTE: 60000,
    FIVE_MINUTES: 300000,
    TEN_MINUTES: 600000,
  },

  /**
   * 长度和大小限制基础值
   */
  SIZES: {
    TINY: 6,         // 用于短ID、随机数等
    SMALL: 50,       // 用于标签、名称等
    MEDIUM: 100,     // 用于规则名等
    LARGE: 500,      // 用于描述等
    HUGE: 1000,      // 用于消息内容等
    MASSIVE: 2000,   // 用于模板等
    URL_MAX: 2048,   // URL最大长度
    EMAIL_MAX: 320,  // 邮箱最大长度
    FILENAME_MAX: 255, // 文件名最大长度
  },

  /**
   * 百分比基础值
   */
  PERCENTAGES: {
    MIN: 0,
    MAX: 100,
    HALF: 50,
  },

  /**
   * 数学常量
   */
  MATH: {
    MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
    MIN_SAFE_INTEGER: Number.MIN_SAFE_INTEGER,
  },

  /**
   * 基数值 - 用于进制转换
   */
  RADIX: {
    DECIMAL: 10,
    HEX: 16,
    BASE_36: 36,
  },
});

/**
 * 类型定义
 */
export type CoreValues = typeof CORE_VALUES;
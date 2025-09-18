/**
 * 核心数值常量
 * 🏛️ Foundation层 - 纯数值定义，零依赖
 * 📋 所有重复数值的单一真实来源，解决1000、10000等重复定义问题
 */

/**
 * 基础数值常量 - 系统底层配置
 * 所有其他常量文件都应该基于这些基础值构建
 */
export const CORE_VALUES = Object.freeze({
  /**
   * 数量相关基础值
   */
  QUANTITIES: {
    ZERO: 0,
    ONE: 1,
    TWO: 2,
    THREE: 3,
    FIVE: 5,
    TEN: 10,
    TWENTY: 20,
    FIFTY: 50,
    HUNDRED: 100,
    TWO_HUNDRED: 200,
    THREE_HUNDRED: 300,
    FIVE_HUNDRED: 500,
    THOUSAND: 1000, // 🎯 解决1000重复定义
    TWO_THOUSAND: 2000,
    FIVE_THOUSAND: 5000,
    TEN_THOUSAND: 10000, // 🎯 解决10000重复定义
    ONE_HUNDRED_THOUSAND: 100000,
  },

  /**
   * 时间转换常量 - 数学固定值
   * 🎯 这些是数学常量，不是可配置的TTL/超时值
   */
  TIME_MS: {
    ONE_SECOND: 1000, // 1秒 = 1000毫秒（数学常量）
    ONE_MINUTE: 60 * 1000, // 1分钟 = 60000毫秒（数学常量）
    ONE_HOUR: 60 * 60 * 1000, // 1小时 = 3600000毫秒（数学常量）
  },

  /**
   * 协议标准长度限制
   */
  PROTOCOL_LIMITS: {
    URL_MAX: 2048, // RFC标准URL最大长度
    EMAIL_MAX: 320, // RFC 5321标准邮箱最大长度
    FILENAME_MAX: 255, // 文件系统标准文件名最大长度
  },

  /**
   * 百分比基础值
   */
  PERCENTAGES: {
    MIN: 0,
    MAX: 100,
    QUARTER: 25,
    HALF: 50,
    THREE_QUARTERS: 75,
  },

  /**
   * 数学常量
   */
  MATH: {
    MAX_SAFE_INTEGER: Number.MAX_SAFE_INTEGER,
  },

  /**
   * 基数值 - 用于进制转换
   */
  RADIX: {
    BASE_36: 36,
  },

  /**
   * 文件大小基础值 (字节)
   * 文件大小相关定义
   */
  FILE_SIZE_BYTES: {
    FIVE_HUNDRED_MB: 524288000, // 500MB
  },
});

/**
 * 类型定义
 */
export type CoreValues = typeof CORE_VALUES;
export type Quantities = typeof CORE_VALUES.QUANTITIES;
export type TimeMS = typeof CORE_VALUES.TIME_MS;
export type Percentages = typeof CORE_VALUES.PERCENTAGES;
export type ProtocolLimits = typeof CORE_VALUES.PROTOCOL_LIMITS;
export type MathConstants = typeof CORE_VALUES.MATH;
export type RadixConstants = typeof CORE_VALUES.RADIX;
export type FileSizeConstants = typeof CORE_VALUES.FILE_SIZE_BYTES;

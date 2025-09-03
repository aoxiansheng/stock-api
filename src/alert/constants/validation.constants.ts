/**
 * Alert模块验证规则常量
 * 用于统一管理DTO验证装饰器中的数值限制，避免重复定义
 */

/**
 * 时间相关验证限制
 */
export const TIME_VALIDATION_LIMITS = {
  /** 持续时间限制（秒） */
  DURATION: {
    MIN: 1, // 最短1秒
    MAX: 3600, // 最长1小时
  },
  /** 冷却时间限制（秒） */
  COOLDOWN: {
    MIN: 0, // 最短0秒（无冷却）
    MAX: 86400, // 最长24小时
  },
  /** 超时时间限制（秒） */
  TIMEOUT: {
    MIN: 1, // 最短1秒
    MAX: 300, // 最长5分钟
  },
} as const;

/**
 * 重试和次数相关验证限制
 */
export const COUNT_VALIDATION_LIMITS = {
  /** 重试次数限制 */
  RETRIES: {
    MIN: 0, // 最少0次重试
    MAX: 10, // 最多10次重试
  },
  /** 百分比限制 */
  PERCENTAGE: {
    MIN: 1, // 最小1%
    MAX: 100, // 最大100%
  },
} as const;

/**
 * 所有验证限制的统一导出
 */
export const VALIDATION_LIMITS = {
  ...TIME_VALIDATION_LIMITS,
  ...COUNT_VALIDATION_LIMITS,
} as const;

/**
 * 验证限制类型定义
 */
export type ValidationLimits = typeof VALIDATION_LIMITS;

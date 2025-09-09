/**
 * 核心基础层常量统一导出
 * 🎯 基础层索引 - 导出所有核心基础常量
 */

// 核心数值常量


// 核心模式常量  
export * from './patterns.constants';

// 核心限制常量
export * from './limits.constants';

// 核心超时常量
export * from './timeouts.constants';

// 导入用于重新导出

import { CORE_PATTERNS, STRING_FORMATS, PatternValidator } from './patterns.constants';
import { CORE_LIMITS, LimitValidator } from './limits.constants';
import { ALERT_CORE_TIMEOUTS, TimeConverter, TimeValidator } from './timeouts.constants';

/**
 * 核心层常量汇总
 * 便于统一访问所有核心常量
 */
export const CORE_CONSTANTS = {

  PATTERNS: CORE_PATTERNS,
  LIMITS: CORE_LIMITS,
  TIMEOUTS: ALERT_CORE_TIMEOUTS,
} as const;

/**
 * 核心层工具类汇总
 * 便于统一访问所有工具类
 */
export const CORE_UTILS = {
  PatternValidator,
  LimitValidator,
  TimeConverter,
  TimeValidator,
} as const;
// 核心数字常量
export { NUMERIC_CONSTANTS, NUMERIC_VALUE_MAP } from './numeric.constants';
export type { NumericConstantsType } from './numeric.constants';

/**
 * 快速访问常用数值
 * 提供最常用的数值常量，避免深层导入
 */
export const QUICK_NUMBERS = Object.freeze({
  // 最高频使用的数值 (基于分析结果)
  ONE_SECOND_MS: 1000,        // 🎯 18次重复统一
  TEN_SECONDS_MS: 10000,      // 🎯 14次重复统一  
  ONE_MINUTE_MS: 60000,       // 4次重复统一
  DEFAULT_BATCH: 100,         // 🎯 18次重复统一
  LARGE_BATCH: 1000,          // 🎯 18次重复统一
  HUGE_BATCH: 10000,          // 🎯 14次重复统一
  
  // 常用超时时间
  QUICK_TIMEOUT: 5000,        // 快速操作超时
  NORMAL_TIMEOUT: 30000,      // 正常操作超时
  SLOW_TIMEOUT: 60000,        // 慢操作超时
  
  // 常用限制
  DEFAULT_RETRIES: 3,         // 默认重试次数
  MAX_RETRIES: 5,             // 🎯 15次重复统一
  DEFAULT_PAGE_SIZE: 10,      // 🎯 14次重复统一
  MAX_PAGE_SIZE: 100,         // 🎯 18次重复统一
  
  // 性能阈值
  FAST_RESPONSE: 100,         // 🎯 18次重复统一
  SLOW_RESPONSE: 1000,        // 🎯 18次重复统一
} as const);
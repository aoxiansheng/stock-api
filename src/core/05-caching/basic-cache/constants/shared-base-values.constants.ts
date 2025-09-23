/**
 * 缓存系统基础数值常量
 * 作为整个缓存体系的数值标准，防止魔法数字重复
 */
export const CACHE_BASE_VALUES = {
  // 基础时间单位（毫秒）
  ONE_SECOND_MS: 1000,
  FIVE_SECONDS_MS: 5000,           // 统一 5秒标准
  TEN_SECONDS_MS: 10000,
  THIRTY_SECONDS_MS: 30000,        // 统一 30秒标准
  ONE_MINUTE_MS: 60000,
  FIVE_MINUTES_MS: 300000,         // 统一 5分钟标准

  // 基础时间单位（秒）
  FIVE_SECONDS: 5,
  THIRTY_SECONDS: 30,              // 统一 30秒标准
  ONE_MINUTE: 60,
  FIVE_MINUTES: 300,               // 统一 5分钟标准
  ONE_HOUR: 3600,
  ONE_DAY: 86400,

  // 基础数量标准
  SMALL_COUNT: 10,                 // 小批次标准
  MEDIUM_COUNT: 50,                // 中批次标准
  LARGE_COUNT: 100,                // 大批次标准
  EXTRA_LARGE_COUNT: 200,          // 特大批次标准

  // 基础比例标准
  LOW_THRESHOLD: 0.2,              // 低阈值标准
  MEDIUM_THRESHOLD: 0.5,           // 中等阈值标准
  HIGH_THRESHOLD: 0.8,             // 高阈值标准
  CRITICAL_THRESHOLD: 0.9,         // 严重阈值标准
} as const;
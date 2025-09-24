/**
 * 缓存常量定义
 */

/**
 * 缓存键前缀
 */
export const CACHE_KEY_PREFIXES = {
  STOCK_QUOTE: "stock_quote",
  MARKET_STATUS: "market_status",
  SYMBOL_MAPPING: "symbol_mapping",
  PROVIDER_DATA: "provider_data",
  USER_SESSION: "user_session",
  API_RATE_LIMIT: "api_rate_limit",
} as const;

/**
 * 缓存结果状态
 */
export const CACHE_RESULT_STATUS = {
  HIT: "hit",
  MISS: "miss",
  ERROR: "error",
  TIMEOUT: "timeout",
} as const;

/**
 * 缓存优先级
 */
export const CACHE_PRIORITY = {
  HIGH: "high",
  NORMAL: "normal",
  LOW: "low",
} as const;

/**
 * 数据来源类型
 */
export const DATA_SOURCE = {
  CACHE: "cache",
  FETCH: "fetch",
  FALLBACK: "fallback",
  DATABASE: "database",
} as const;

/**
 * 压缩算法
 */
export const COMPRESSION_ALGORITHMS = {
  GZIP: "gzip",
  DEFLATE: "deflate",
  BROTLI: "brotli",
} as const;

/**
 * 默认值常量
 * 注意：TTL_SECONDS、OPERATION_TIMEOUT、BATCH_SIZE_LIMIT 已统一到 CACHE_CONFIG 中
 */
export const CACHE_DEFAULTS = {
  MIN_TTL_SECONDS: 30, // 30秒
  MAX_TTL_SECONDS: 86400, // 24小时
  COMPRESSION_THRESHOLD: 10240, // 10KB
} as const;

/**
 * Redis特殊值
 */
export const REDIS_SPECIAL_VALUES = {
  PTTL_KEY_NOT_EXISTS: -2, // key不存在
  PTTL_NO_EXPIRE: -1, // key存在但无过期时间
  SET_SUCCESS: "OK", // set操作成功
} as const;

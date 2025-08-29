/**
 * Symbol Transformer 配置常量
 * 统一管理所有硬编码值，提高可维护性和扩展性
 */

// 预编译正则表达式，避免每次调用重新编译
export const SYMBOL_FORMAT_PATTERNS = {
  /** 6位数字（A股格式）- 如 000001, 600000 */
  CN_STOCK: /^\d{6}$/,
  
  /** 纯字母（美股格式）- 如 AAPL, GOOGL */
  US_STOCK: /^[A-Z]+$/,
  
  /** 港股格式 - 如 700.HK, 0700.HK */
  HK_STOCK: /\.HK$/i,
  
  /** 新加坡股票格式 */
  SG_STOCK: /\.SI$/i,
  
  /** 通用市场后缀格式 */
  MARKET_SUFFIX: /\.[A-Z]{2,3}$/i,
} as const;

// 市场类型常量
export const MARKET_TYPES = {
  CN: 'CN',
  US: 'US', 
  HK: 'HK',
  SG: 'SG',
  MIXED: 'mixed',
  UNKNOWN: 'unknown',
} as const;

export type MarketType = typeof MARKET_TYPES[keyof typeof MARKET_TYPES];

// 监控配置
export const MONITORING_CONFIG = {
  /** 监控端点 */
  ENDPOINT: '/internal/symbol-transformation',
  
  /** HTTP方法 */
  METHOD: 'POST',
  
  /** 成功状态码 */
  SUCCESS_STATUS: 200,
  
  /** 错误状态码 */
  ERROR_STATUS: 500,
} as const;

// 性能配置
export const PERFORMANCE_CONFIG = {
  /** 纳秒到毫秒转换因子 */
  NS_TO_MS_FACTOR: 1e6,
  
  /** 批处理阈值 */
  BATCH_THRESHOLD: 100,
  
  /** 最大符号长度（防DoS攻击） */
  MAX_SYMBOL_LENGTH: 50,
  
  /** 最大批处理大小 */
  MAX_BATCH_SIZE: 1000,
} as const;

// RequestId 生成配置
export const REQUEST_ID_CONFIG = {
  /** RequestId前缀 */
  PREFIX: 'transform',
  
  /** 高精度时间戳生成 */
  USE_HIGH_PRECISION: true,
  
  /** 随机数位数 */
  RANDOM_DIGITS: 4,
} as const;

// 错误重试配置
export const RETRY_CONFIG = {
  /** 最大重试次数 */
  MAX_ATTEMPTS: 3,
  
  /** 基础延迟（毫秒） */
  BASE_DELAY: 100,
  
  /** 指数退避因子 */
  BACKOFF_FACTOR: 2,
  
  /** 最大延迟（毫秒） */
  MAX_DELAY: 2000,
  
  /** 抖动因子 */
  JITTER_FACTOR: 0.1,
} as const;

// 日志配置
export const LOGGING_CONFIG = {
  /** 业务操作标识 */
  OPERATION_NAME: 'symbol-transformation',
  
  /** Debug日志的最大符号数量 */
  MAX_DEBUG_SYMBOLS: 10,
} as const;
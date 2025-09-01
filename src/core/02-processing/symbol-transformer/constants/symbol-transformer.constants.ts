/**
 * Symbol Transformer Constants
 * 预编译的正则表达式和配置常量，避免运行时重复编译
 */

// 预编译的股票代码格式正则表达式
export const SYMBOL_PATTERNS = {
  CN: /^\d{6}$/,      // A股：6位数字 (例如: 000001, 600000)
  US: /^[A-Z]+$/,     // 美股：纯字母 (例如: AAPL, GOOGL)  
  HK: /\.HK$/i,       // 港股：.HK后缀 (例如: 700.HK, 0700.HK)
} as const;

// 市场类型常量
export const MARKET_TYPES = {
  CN: 'CN',           // 中国A股市场
  US: 'US',           // 美国股票市场
  HK: 'HK',           // 香港股票市场
  MIXED: 'mixed',     // 混合市场（多个市场的股票）
  UNKNOWN: 'unknown'  // 未知市场
} as const;

// 系统配置常量
export const CONFIG = {
  MAX_SYMBOL_LENGTH: 50,        // 防DoS攻击 - 单个股票代码最大长度
  MAX_BATCH_SIZE: 1000,         // 批处理限制 - 最大批量处理数量
  REQUEST_TIMEOUT: 10000,       // 请求超时时间 (10秒)
  ENDPOINT: '/internal/symbol-transformation',  // 内部转换端点
} as const;

// 转换方向常量
export const TRANSFORM_DIRECTIONS = {
  TO_STANDARD: 'to_standard' as const,      // 转换为标准格式
  FROM_STANDARD: 'from_standard' as const   // 从标准格式转换
} as const;

// 错误类型常量
export const ERROR_TYPES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',     // 验证错误
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',           // 超时错误
  NETWORK_ERROR: 'NETWORK_ERROR',           // 网络错误
  SYSTEM_ERROR: 'SYSTEM_ERROR'              // 系统错误
} as const;

// 监控配置
export const MONITORING_CONFIG = {
  // 移除 METRICS_ENDPOINT：事件驱动模式下不再需要直接端点
  PERFORMANCE_THRESHOLD_MS: 200,    // 性能阈值（毫秒），用于业务判断
  ERROR_RATE_THRESHOLD: 0.01,       // 错误率阈值（1%），用于业务判断
} as const;

// 重试配置
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,                  // 最大重试次数
  BASE_DELAY: 1000,                 // 基础延迟时间（毫秒）
  BACKOFF_FACTOR: 2,                // 指数退避因子
  MAX_DELAY: 10000,                 // 最大延迟时间（毫秒）
  JITTER_FACTOR: 0.1,               // 抖动因子
} as const;

// 类型定义
export type MarketType = typeof MARKET_TYPES[keyof typeof MARKET_TYPES];
export type TransformDirection = typeof TRANSFORM_DIRECTIONS[keyof typeof TRANSFORM_DIRECTIONS];
export type ErrorType = typeof ERROR_TYPES[keyof typeof ERROR_TYPES];
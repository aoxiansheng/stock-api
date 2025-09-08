/**
 * Symbol Transformer Enhanced Constants
 * 基于BaseConstants的增强版符号转换器常量定义
 * 
 * @description
 * - 继承BaseConstants提供的标准化管理功能
 * - 保持与原有constants的完全兼容性
 * - 增加模块元数据和分组管理
 * - 支持运行时验证和调试功能
 */

import { deepFreeze } from '@common/utils/object-immutability.util';
import { CONSTANTS } from '@common/constants';

// Extract constants for backward compatibility
const RETRY_CONSTANTS = CONSTANTS.SEMANTIC.RETRY;
// Performance constants can be referenced from other semantic constants if needed
import { ErrorType as RetryErrorType } from '../utils/retry.utils';

/**
 * 模块元数据定义
 */
export const SYMBOL_TRANSFORMER_METADATA = deepFreeze({
  moduleName: 'symbol-transformer',
  version: '2.1.0',
  createdAt: '2024-01-15T00:00:00Z',
  lastUpdated: new Date().toISOString(),
  description: '符号转换器模块常量配置，支持多市场股票代码转换',
  dependencies: ['retry-semantics.constants', 'core-values.constants', 'circuit-breaker-domain.constants'],
} as const);

// ====================== 预编译的股票代码格式正则表达式 ======================
export const SYMBOL_PATTERNS = deepFreeze({
  CN: /^\d{6}$/, // A股：6位数字 (例如: 000001, 600000)
  US: /^[A-Z]+$/, // 美股：纯字母 (例如: AAPL, GOOGL)
  HK: /\.HK$/i, // 港股：.HK后缀 (例如: 700.HK, 0700.HK)
} as const);

// ====================== 市场类型常量 ======================
export const MARKET_TYPES = deepFreeze({
  CN: "CN", // 中国A股市场
  US: "US", // 美国股票市场
  HK: "HK", // 香港股票市场
  MIXED: "mixed", // 混合市场（多个市场的股票）
  UNKNOWN: "unknown", // 未知市场
} as const);

// ====================== 系统配置常量 ======================
export const CONFIG = deepFreeze({
  MAX_SYMBOL_LENGTH: 50, // 防DoS攻击 - 单个股票代码最大长度
  MAX_BATCH_SIZE: 1000, // 批处理限制 - 最大批量处理数量
  REQUEST_TIMEOUT: 5000, // HTTP request timeout in milliseconds
  ENDPOINT: "/internal/symbol-transformation", // 内部转换端点
} as const);

// ====================== 转换方向常量 ======================
export const TRANSFORM_DIRECTIONS = deepFreeze({
  TO_STANDARD: "to_standard", // 转换为标准格式
  FROM_STANDARD: "from_standard", // 从标准格式转换
} as const);

// ====================== 错误类型常量 - 统一使用枚举定义，保持向后兼容 ======================
export const ERROR_TYPES = deepFreeze({
  VALIDATION_ERROR: RetryErrorType.VALIDATION, // 验证错误
  TIMEOUT_ERROR: RetryErrorType.TIMEOUT, // 超时错误
  NETWORK_ERROR: RetryErrorType.NETWORK, // 网络错误
  SYSTEM_ERROR: RetryErrorType.SYSTEM, // 系统错误
} as const);

// ====================== 监控配置 ======================
export const MONITORING_CONFIG = deepFreeze({
  // 移除 METRICS_ENDPOINT：事件驱动模式下不再需要直接端点
  PERFORMANCE_THRESHOLD_MS: 200, // 性能阈值（毫秒），用于业务判断
  ERROR_RATE_THRESHOLD: 0.01, // 错误率阈值（1%），用于业务判断
} as const);

// ====================== 重试配置 - 引用统一配置，保持向后兼容 ======================
export const RETRY_CONFIG = {
  MAX_RETRY_ATTEMPTS: RETRY_CONSTANTS.COUNTS.BASIC.DEFAULT,
  RETRY_DELAY_MS: RETRY_CONSTANTS.DELAYS.BASIC.INITIAL_MS,
  BACKOFF_MULTIPLIER: 2, // Standard exponential backoff multiplier
  MAX_RETRY_DELAY_MS: RETRY_CONSTANTS.DELAYS.BASIC.MAX_MS,
  JITTER_FACTOR: 0.1, // 10% jitter factor
};

// ====================== 工具函数 ======================
/**
 * 获取业务场景特定的配置
 * @param scenario 业务场景
 * @returns 场景配置
 */
export const getScenarioConfig = (scenario: 'high-frequency' | 'batch-processing' | 'real-time') => {
  switch (scenario) {
    case 'high-frequency':
      return {
        ...CONFIG,
        MAX_BATCH_SIZE: 100, // 高频场景减小批次
        REQUEST_TIMEOUT: 3000, // 更严格的超时
      };
    case 'batch-processing':
      return {
        ...CONFIG,
        MAX_BATCH_SIZE: 5000, // 批处理增大批次
        REQUEST_TIMEOUT: 60000, // 更宽松的超时
      };
    case 'real-time':
      return {
        ...CONFIG,
        MAX_BATCH_SIZE: 10, // 实时场景小批次
        REQUEST_TIMEOUT: 1000, // 极严格的超时
      };
    default:
      return CONFIG;
  }
};

/**
 * 验证符号格式
 * @param symbol 符号字符串
 * @param market 市场类型
 * @returns 是否有效
 */
export const validateSymbolFormat = (symbol: string, market?: keyof typeof MARKET_TYPES): boolean => {
  if (!symbol || symbol.length > CONFIG.MAX_SYMBOL_LENGTH) {
    return false;
  }

  if (market && SYMBOL_PATTERNS[market]) {
    return SYMBOL_PATTERNS[market].test(symbol);
  }

  // 如果没有指定市场，检查是否匹配任一市场格式
  return Object.values(SYMBOL_PATTERNS).some(pattern => pattern.test(symbol));
};

/**
 * 推断符号的市场类型
 * @param symbol 符号字符串
 * @returns 市场类型
 */
export const inferMarketType = (symbol: string): keyof typeof MARKET_TYPES => {
  for (const [market, pattern] of Object.entries(SYMBOL_PATTERNS)) {
    if (pattern.test(symbol)) {
      return market as keyof typeof MARKET_TYPES;
    }
  }
  return 'UNKNOWN';
};

/**
 * 检查错误类型是否可重试
 * @param errorType 错误类型
 * @returns 是否可重试
 */
export const isRetryableError = (errorType: string): boolean => {
  const retryableTypes = [
    ERROR_TYPES.NETWORK_ERROR,
    ERROR_TYPES.TIMEOUT_ERROR,
    ERROR_TYPES.SYSTEM_ERROR,
  ];
  return retryableTypes.includes(errorType as any);
};

// ====================== 类型定义 ======================
export type MarketType = typeof MARKET_TYPES[keyof typeof MARKET_TYPES];
export type TransformDirection = typeof TRANSFORM_DIRECTIONS[keyof typeof TRANSFORM_DIRECTIONS];
export type ErrorType = typeof ERROR_TYPES[keyof typeof ERROR_TYPES];

// ====================== 汇总导出 ======================
/**
 * 符号转换器增强常量汇总对象
 * 提供完整的常量访问点
 */
export const SYMBOL_TRANSFORMER_ENHANCED = deepFreeze({
  METADATA: SYMBOL_TRANSFORMER_METADATA,
  SYMBOL_PATTERNS,
  MARKET_TYPES,
  CONFIG,
  TRANSFORM_DIRECTIONS,
  ERROR_TYPES,
  MONITORING_CONFIG,
  RETRY_CONFIG,
  
  // 工具函数
  getScenarioConfig,
  validateSymbolFormat,
  inferMarketType,
  isRetryableError,
} as const);
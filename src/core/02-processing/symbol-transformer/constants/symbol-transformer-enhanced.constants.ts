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

import { deepFreeze } from "@common/utils/object-immutability.util";
import { CONSTANTS } from "@common/constants";

// Unified error handling constants
export * from "./symbol-transformer-error-codes.constants";
export {
  SYMBOL_TRANSFORMER_ERROR_CODES,
  type SymbolTransformerErrorCode,
} from "./symbol-transformer-error-codes.constants";

// Extract constants for backward compatibility
const RETRY_CONSTANTS = CONSTANTS.SEMANTIC.RETRY;

/**
 * 错误类型枚举
 * 从utils/retry.utils.ts迁移到常量文件，统一管理
 */
export enum ErrorType {
  NETWORK = "NETWORK",
  TIMEOUT = "TIMEOUT",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  VALIDATION = "VALIDATION",
  SYSTEM = "SYSTEM",
  UNKNOWN = "UNKNOWN",
}


// ====================== 预编译的股票代码格式正则表达式 ======================
export const SYMBOL_PATTERNS = deepFreeze({
  CN: /^\d{6}$/, // A股：6位数字 (例如: 000001, 600000)
  US: /^[A-Z]+$/, // 美股：纯字母 (例如: AAPL, GOOGL)
  HK: /^.+\.HK$/i, // 港股：.HK后缀 (例如: 700.HK, 0700.HK)
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


// ====================== ERROR_TYPES 常量已移除 ======================
// 该常量在整个代码库中未被使用，已安全删除
// ErrorType 枚举继续提供类型安全的错误类型定义

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


// ====================== 类型定义 ======================
export type MarketType = (typeof MARKET_TYPES)[keyof typeof MARKET_TYPES];
// ErrorType is already defined as enum above

// ====================== 汇总导出已移除 ======================
// SYMBOL_TRANSFORMER_ENHANCED 汇总对象已删除，因为未被使用
// 各个常量继续作为独立导出提供，保持向后兼容性

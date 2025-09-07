/**
 * Symbol Transformer Constants (Legacy Export)
 * 为保持向后兼容性，从增强版常量重新导出所有原有常量
 * 
 * @deprecated 建议直接使用 symbol-transformer-enhanced.constants.ts 中的增强版本
 * @description 
 * - 完全兼容原有API
 * - 所有常量值保持不变
 * - 新功能请使用增强版常量类
 */

// 从增强版常量重新导出所有原有常量，确保完全向后兼容
export {
  // 主要常量导出
  SYMBOL_PATTERNS,
  MARKET_TYPES,
  CONFIG,
  TRANSFORM_DIRECTIONS,
  ERROR_TYPES,
  MONITORING_CONFIG,
  RETRY_CONFIG,
  
  // 类型导出
  type MarketType,
  type TransformDirection,
  type ErrorType,
  
  // 增强功能导出
  SYMBOL_TRANSFORMER_ENHANCED,
} from './symbol-transformer-enhanced.constants';

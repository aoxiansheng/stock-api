/**
 * 提供商能力名称常量
 * 职责：统一管理所有能力名称字符串，避免重复和拼写错误
 */

export const CAPABILITY_NAMES = {
  // 股票相关能力
  GET_STOCK_QUOTE: 'get-stock-quote',
  GET_STOCK_BASIC_INFO: 'get-stock-basic-info', 
  STREAM_STOCK_QUOTE: 'stream-stock-quote',
  
  // 指数相关能力  
  GET_INDEX_QUOTE: 'get-index-quote',
  STREAM_INDEX_QUOTE: 'stream-index-quote',
  
  // 美股相关能力
  GET_US_STOCK_QUOTE: 'get-us-stock-quote',
  STREAM_US_STOCK_QUOTE: 'stream-us-stock-quote',
  
  // 新加坡股票能力
  GET_SG_STOCK_QUOTE: 'get-sg-stock-quote',
  GET_SG_STOCK_INFO: 'get-sg-stock-info',
  STREAM_SG_STOCK_QUOTE: 'stream-sg-stock-quote',
  
  // 扩展能力（预留）
  GET_OPTION_QUOTE: 'get-option-quote',
  GET_FUTURES_QUOTE: 'get-futures-quote',
} as const;

// 能力名称类型
export type CapabilityName = typeof CAPABILITY_NAMES[keyof typeof CAPABILITY_NAMES];

// 导出便捷访问的值数组
export const CapabilityNameValues = Object.values(CAPABILITY_NAMES);

/**
 * 能力名称验证函数
 */
export function isValidCapabilityName(name: string): name is CapabilityName {
  return Object.values(CAPABILITY_NAMES).includes(name as CapabilityName);
}

/**
 * 根据市场获取相关能力名称
 */
export const MARKET_CAPABILITIES = {
  HK: [
    CAPABILITY_NAMES.GET_STOCK_QUOTE,
    CAPABILITY_NAMES.GET_STOCK_BASIC_INFO,
    CAPABILITY_NAMES.STREAM_STOCK_QUOTE,
  ],
  US: [
    CAPABILITY_NAMES.GET_US_STOCK_QUOTE,
    CAPABILITY_NAMES.STREAM_US_STOCK_QUOTE,
  ],
  SG: [
    CAPABILITY_NAMES.GET_SG_STOCK_QUOTE,
    CAPABILITY_NAMES.GET_SG_STOCK_INFO,
    CAPABILITY_NAMES.STREAM_SG_STOCK_QUOTE,
  ],
} as const;
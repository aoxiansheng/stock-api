import { API_OPERATIONS } from '@common/constants/domain';
/**
 * 提供商能力名称常量
 * 职责：统一管理所有能力名称字符串，避免重复和拼写错误
 */

export const CAPABILITY_NAMES = {
  // 股票相关能力
  GET_STOCK_QUOTE: API_OPERATIONS.STOCK_DATA.GET_QUOTE,
  GET_STOCK_BASIC_INFO: 'get-stock-basic-info', 
  STREAM_STOCK_QUOTE: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
  
  // 指数相关能力  
  GET_INDEX_QUOTE: 'get-index-quote',
} as const;

// 能力名称类型
export type CapabilityName = typeof CAPABILITY_NAMES[keyof typeof CAPABILITY_NAMES];

/**
 * 能力名称验证函数
 */
export function isValidCapabilityName(name: string): name is CapabilityName {
  return Object.values(CAPABILITY_NAMES).includes(name as CapabilityName);
}


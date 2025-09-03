/**
 * 健康状态常量和类型定义
 * 🎯 符合开发规范指南 - 解决健康状态枚举不一致问题
 * 提供基础状态（DTO使用）和扩展状态（内部使用）的分层架构
 */

import { CACHE_STATUS } from './cache-status.constants';

/**
 * 基础健康状态类型
 * 用于对外API和DTO定义，保持简洁
 */
export type BasicHealthStatus = 
  | typeof CACHE_STATUS.HEALTHY
  | typeof CACHE_STATUS.WARNING
  | typeof CACHE_STATUS.UNHEALTHY;

/**
 * 扩展健康状态类型  
 * 用于内部系统，包含更详细的状态信息
 */
export type ExtendedHealthStatus = typeof CACHE_STATUS[keyof typeof CACHE_STATUS];

/**
 * 基础健康状态值数组
 * 用于DTO验证装饰器
 */
export const BASIC_HEALTH_STATUS_VALUES: BasicHealthStatus[] = [
  CACHE_STATUS.HEALTHY,
  CACHE_STATUS.WARNING,
  CACHE_STATUS.UNHEALTHY
];

/**
 * 扩展健康状态值数组
 * 用于内部状态验证
 */
export const EXTENDED_HEALTH_STATUS_VALUES: ExtendedHealthStatus[] = Object.values(CACHE_STATUS);

/**
 * 状态映射函数
 * 🎯 符合开发规范指南 - 解决内部状态与外部DTO状态不一致问题
 * 将内部扩展健康状态映射到外部基础健康状态
 */
export function mapInternalToExternalStatus(internalStatus: ExtendedHealthStatus): BasicHealthStatus {
  switch (internalStatus) {
    case CACHE_STATUS.HEALTHY:
    case CACHE_STATUS.CONNECTED:
      return CACHE_STATUS.HEALTHY;
      
    case CACHE_STATUS.WARNING:
    case CACHE_STATUS.DEGRADED:
      return CACHE_STATUS.WARNING;
      
    case CACHE_STATUS.UNHEALTHY:
    case CACHE_STATUS.DISCONNECTED:
      return CACHE_STATUS.UNHEALTHY;
      
    default:
      // 类型安全：永远不应该到达这里，但为了健壮性返回unhealthy
      return CACHE_STATUS.UNHEALTHY;
  }
}
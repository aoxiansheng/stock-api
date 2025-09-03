/**
 * 监控系统状态常量
 * 🎯 复用缓存模块已实现的健康状态分层架构，确保系统一致性
 * 避免重复造轮子，保持健康状态定义的系统级统一
 */

import { 
  BASIC_HEALTH_STATUS_VALUES, 
  EXTENDED_HEALTH_STATUS_VALUES 
} from '../../../cache/constants/status/health-status.constants';

import { CACHE_STATUS } from '../../../cache/constants/status/cache-status.constants';

// 复用缓存模块的健康状态定义，避免重复
export {
  BASIC_HEALTH_STATUS_VALUES,
  EXTENDED_HEALTH_STATUS_VALUES,
  mapInternalToExternalStatus
} from '../../../cache/constants/status/health-status.constants';

export { CACHE_STATUS as MONITORING_HEALTH_STATUS } from '../../../cache/constants/status/cache-status.constants';

// 监控模块的类型定义 - 基于缓存模块的常量结构
export type BasicHealthStatus = 
  | typeof CACHE_STATUS.HEALTHY
  | typeof CACHE_STATUS.WARNING
  | typeof CACHE_STATUS.UNHEALTHY;

export type ExtendedHealthStatus = typeof CACHE_STATUS[keyof typeof CACHE_STATUS];

// 监控模块特定的状态值数组（基于复用的类型）
export const MONITORING_BASIC_HEALTH_STATUS_VALUES: BasicHealthStatus[] = BASIC_HEALTH_STATUS_VALUES;
export const MONITORING_EXTENDED_HEALTH_STATUS_VALUES: ExtendedHealthStatus[] = EXTENDED_HEALTH_STATUS_VALUES;

/**
 * 监控组件健康状态验证函数
 * 🎯 基于复用的状态类型，提供监控模块特定的验证逻辑
 */
export function isValidMonitoringStatus(status: any): status is BasicHealthStatus {
  return BASIC_HEALTH_STATUS_VALUES.includes(status);
}

/**
 * 监控状态严重性评分
 * 🎯 为监控模块提供健康状态的严重性量化
 */
export function getMonitoringStatusSeverity(status: BasicHealthStatus): number {
  switch (status) {
    case CACHE_STATUS.HEALTHY:
      return 0; // 正常
    case CACHE_STATUS.WARNING:
      return 1; // 警告
    case CACHE_STATUS.UNHEALTHY:
      return 2; // 严重
    default:
      return 2; // 未知状态视为严重
  }
}
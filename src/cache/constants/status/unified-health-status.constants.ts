/**
 * 统一健康状态常量和类型定义
 * 🎯 符合开发规范指南 - 消除健康状态类型重复定义
 * 提供单一的健康状态结构，支持基础和扩展用法
 */

import { CACHE_STATUS } from "./cache-status.constants";

/**
 * 统一健康状态类型
 * 支持基础状态（对外API）和扩展状态（内部使用）
 */
export type CacheHealthStatus =
  (typeof CACHE_STATUS)[keyof typeof CACHE_STATUS];

/**
 * 基础健康状态子集
 * 用于对外API和DTO定义
 */
export const BASIC_HEALTH_STATUSES = Object.freeze([
  CACHE_STATUS.HEALTHY,
  CACHE_STATUS.WARNING,
  CACHE_STATUS.UNHEALTHY,
] as const);

/**
 * 基础健康状态类型
 * 从统一类型中提取基础状态
 */
export type BasicHealthStatus = (typeof BASIC_HEALTH_STATUSES)[number];

/**
 * 扩展健康状态数组
 * 包含所有可用状态
 */
export const EXTENDED_HEALTH_STATUSES = Object.values(CACHE_STATUS);

/**
 * 扩展健康状态类型
 * 等同于统一健康状态类型
 */
export type CacheExtendedHealthStatus = CacheHealthStatus;

/**
 * 状态映射配置对象
 * 将扩展状态映射到基础状态
 */
const STATUS_MAPPING = Object.freeze({
  [CACHE_STATUS.HEALTHY]: CACHE_STATUS.HEALTHY,
  [CACHE_STATUS.CONNECTED]: CACHE_STATUS.HEALTHY,
  [CACHE_STATUS.WARNING]: CACHE_STATUS.WARNING,
  [CACHE_STATUS.DEGRADED]: CACHE_STATUS.WARNING,
  [CACHE_STATUS.UNHEALTHY]: CACHE_STATUS.UNHEALTHY,
  [CACHE_STATUS.DISCONNECTED]: CACHE_STATUS.UNHEALTHY,
} as const);

/**
 * 状态映射函数
 * 将扩展健康状态映射到基础健康状态
 */
export function mapToBasicStatus(
  status: CacheExtendedHealthStatus,
): BasicHealthStatus {
  return STATUS_MAPPING[status] ?? CACHE_STATUS.UNHEALTHY;
}

/**
 * 状态映射表导出
 * 供外部自定义映射使用
 */
export { STATUS_MAPPING };

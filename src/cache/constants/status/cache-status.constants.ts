/**
 * 缓存状态常量
 * 🎯 符合开发规范指南 - 统一缓存状态枚举定义
 * 提供系统运行状态的标准化枚举值
 */

export const CACHE_STATUS = Object.freeze({
  HEALTHY: "healthy",
  WARNING: "warning",
  UNHEALTHY: "unhealthy",
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  DEGRADED: "degraded",
} as const);

/**
 * 缓存状态类型定义
 */
export type CacheStatus = (typeof CACHE_STATUS)[keyof typeof CACHE_STATUS];

/**
 * 缓存状态值数组 - 用于验证装饰器
 */
export const CACHE_STATUS_VALUES: CacheStatus[] = Object.values(CACHE_STATUS);

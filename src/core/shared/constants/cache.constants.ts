/**
 * Shared 组件缓存相关常量定义
 * 遵循项目架构的.constants.ts模式
 */
export const SHARED_CACHE_CONSTANTS = {
  /**
   * 最大缓存大小限制（防止内存溢出）
   */
  MAX_CACHE_SIZE: 10000,
  
  /**
   * 缓存清理阈值（可扩展）
   */
  CLEANUP_THRESHOLD: 0.8,
} as const;

export type SharedCacheConstants = typeof SHARED_CACHE_CONSTANTS;
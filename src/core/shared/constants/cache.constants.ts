/**
 * Core Shared 层缓存相关常量
 *
 * 仅提供跨模块通用的、与具体缓存实现无关的常量集合。
 *
 * 当前仅用于 DataChangeDetector 的内存快照上限控制，数值来源与 CORE_LIMITS 对齐，避免魔法数。
 */

import { CORE_LIMITS } from './limits';
import { MappingDirection, MappingDirectionType } from './mapping.constants';

export const SHARED_CACHE_CONSTANTS = Object.freeze({
  /**
   * 内存快照最大条目数
   * 与 CORE_LIMITS.STORAGE.MAX_CACHE_ENTRIES 对齐，确保限制的一致性
   */
  MAX_CACHE_SIZE: CORE_LIMITS.STORAGE.MAX_CACHE_ENTRIES,
});

// 兼容导出：提供 MappingDirection 与类型别名（历史测试引用）
export { MappingDirection } from './mapping.constants';
export type { MappingDirectionType } from './mapping.constants';

// 兼容导出：缓存清理策略（供测试使用）
export const CACHE_CLEANUP = Object.freeze({
  RETENTION_RATIO: 0.25,
  CLEANUP_STRATEGY: 'incremental',
});

// 兼容导出：内存监控配置（供测试使用）
export const MEMORY_MONITORING = Object.freeze({
  CHECK_INTERVAL: 60_000, // 1 minute
  CLEANUP_THRESHOLD: 0.85, // 85%
  MIN_RECONNECT_DELAY: 1_000, // 1s
  MAX_RECONNECT_DELAY: 30_000, // 30s
});

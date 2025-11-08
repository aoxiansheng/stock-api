/**
 * Caching 模块共享资源统一导出
 *
 * 🎯 使用指南：
 * - 所有 05-caching 子模块必须从此文件导入共享资源
 * - 禁止直接从子文件导入（保持导入路径一致性）
 * - 禁止在其他文件重复定义相同语义的常量/类型
 *
 * @example 正确的导入方式
 * import {
 *   CACHE_KEY_PREFIXES,
 *   CACHE_OPERATIONS,
 *   BaseCacheConfig,
 *   CacheResult
 * } from '@core/05-caching/foundation';
 *
 * @example 错误的导入方式 (禁止)
 * import { CACHE_KEY_PREFIXES } from './constants/cache-unified.constants';
 *
 * @module core/05-caching/shared
 */

// ============================================================
// 常量导出
// ============================================================

export {
  // 映射常量（上移到领域层 shared）
  MappingDirection,
  type MappingDirectionType,
} from '@core/shared/constants/mapping.constants';

export {
  // 缓存键前缀
  CACHE_KEY_PREFIXES,
  // 缓存操作
  CACHE_OPERATIONS,
  // 缓存策略
  CACHE_STRATEGIES,
  // 缓存状态
  CACHE_STATUS,
  // 错误代码
  CACHE_ERROR_CODES,
  // 监控指标
  CACHE_METRICS,
  // 结果状态
  CACHE_RESULT_STATUS,
  // 优先级
  CACHE_PRIORITY,
  // 常量类型
  type CacheKeyPrefix,
  type CacheOperationType,
  type CacheStrategyType,
  type CacheStatusType,
  type CacheErrorCode,
  type CacheMetricType,
  type CacheResultStatusType,
  type CachePriorityType,
} from './constants/cache-unified.constants';

// ============================================================
// 核心数值/TTL/间隔 常量导出（统一入口）
// ============================================================
export {
  CACHE_CORE_VALUES,
  CACHE_CORE_TTL,
  CACHE_CORE_BATCH_SIZES,
  CACHE_CORE_INTERVALS,
} from './constants/core-values.constants';

// ============================================================
// 类型导出
// ============================================================

// 配置类型统一出口
export {
  type BaseCacheConfig,
  type TtlStrategyConfig,
  type PerformanceConfig,
  type IntervalConfig,
  type LimitConfig,
  type RetryConfig,
  type CacheUnifiedConfigInterface,
  type CacheConfigCreateOptions,
  type CacheConfigValidationResult,
} from './types/cache-config.types';

// 结果/操作类型统一出口
export {
  type CacheOperationOptions,
  type CacheBatchResult,
} from './types/cache-result.types';

// 别名以保持向后兼容
export type BatchCacheResult<T = unknown> = import('./types/cache-result.types').CacheBatchResult<T>;

// 其余高级类型与枚举
export {
  CacheStrategy,
  type CacheResult,
  type CacheKeyBuilder,
  type CacheSerializer,
  type TtlCalculator,
} from './types/cache-unified.types';

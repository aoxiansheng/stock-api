/**
 * Symbol Mapper Cache 相关常量
 */

/**
 * 符号映射方向枚举
 * 按项目惯例创建枚举定义，提供类型安全的方向控制
 */
export enum MappingDirection {
  /** 从原始符号转换为标准符号 */
  TO_STANDARD = 'to_standard',
  /** 从标准符号转换为原始符号 */
  FROM_STANDARD = 'from_standard'
}

/**
 * 映射方向类型 - 按项目惯例创建
 * 使用 keyof typeof 模式保持与其他模块一致性
 */
export type MappingDirectionType = keyof typeof MappingDirection;

/**
 * 缓存层级常量定义
 * 三层缓存架构：L1(规则) → L2(符号映射) → L3(批量结果)
 */
export const CACHE_LAYERS = {
  L1: "provider_rules", // 规则缓存
  L2: "symbol_mapping", // 符号映射缓存
  L3: "batch_result", // 批量结果缓存
} as const;

/**
 * 缓存层级类型 - 按项目惯例创建
 * 使用 keyof typeof 模式保持与其他模块一致性
 */
export type CacheLayerType = keyof typeof CACHE_LAYERS;

/**
 * 缓存指标名称
 */
export const CACHE_METRICS = {
  HIT_RATIO: "symbol_mapper_cache_hit_ratio",
  OPERATION_DURATION: "symbol_mapper_cache_operation_duration",
  CACHE_SIZE: "symbol_mapper_cache_size",
  MEMORY_USAGE: "symbol_mapper_cache_memory_usage",
} as const;

// 缓存操作类型已迁移到系统级统一定义
// 使用: import { CACHE_CORE_OPERATIONS, CACHE_EXTENDED_OPERATIONS } from '../../../cache/constants/cache.constants'
// 注意: DELETE 已统一使用 "del" 以保持与 Redis 一致

/**
 * 缓存清理配置
 * 用于LRU增量清理算法的核心参数
 */
export const CACHE_CLEANUP = {
  RETENTION_RATIO: 0.25, // 内存压力时保留25%的缓存条目
  LRU_SORT_BATCH_SIZE: 1000, // 避免大数据集排序性能问题，单次最多处理1000条目
  CLEANUP_STRATEGY: 'incremental' // 标识使用增量清理而非全清空
} as const;

/**
 * 内存监控配置
 */
export const MEMORY_MONITORING = {
  CHECK_INTERVAL: 60000, // 内存检查间隔 (60秒/1分钟) - 与FeatureFlags保持一致
  CLEANUP_THRESHOLD: 0.85, // 内存清理阈值 (85%)
  MAX_RECONNECT_DELAY: 30000, // 最大重连延迟 (30秒)
  MIN_RECONNECT_DELAY: 1000, // 最小重连延迟 (1秒)
} as const;

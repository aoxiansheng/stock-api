/**
 * Symbol Mapper Cache 相关常量
 */

/**
 * 缓存层级
 */
export const CACHE_LAYERS = {
  L1: 'provider_rules',    // 规则缓存
  L2: 'symbol_mapping',    // 符号映射缓存
  L3: 'batch_result'       // 批量结果缓存
} as const;

/**
 * 缓存指标名称
 */
export const CACHE_METRICS = {
  HIT_RATIO: 'symbol_mapper_cache_hit_ratio',
  OPERATION_DURATION: 'symbol_mapper_cache_operation_duration',
  CACHE_SIZE: 'symbol_mapper_cache_size',
  MEMORY_USAGE: 'symbol_mapper_cache_memory_usage'
} as const;

/**
 * 缓存操作类型
 */
export const CACHE_OPERATIONS = {
  GET: 'get',
  SET: 'set',
  DELETE: 'delete',
  CLEAR: 'clear',
  BATCH_GET: 'batch_get',
  BATCH_SET: 'batch_set'
} as const;

/**
 * 内存监控配置
 */
export const MEMORY_MONITORING = {
  CHECK_INTERVAL: 30000,        // 内存检查间隔 (30秒)
  CLEANUP_THRESHOLD: 0.85,      // 内存清理阈值 (85%)
  MAX_RECONNECT_DELAY: 30000,   // 最大重连延迟 (30秒)
  MIN_RECONNECT_DELAY: 1000     // 最小重连延迟 (1秒)
} as const;
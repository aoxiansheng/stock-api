// 现有常量（保持不变）
export * from './cache.constants';
export * from './cache-config.constants';

// 新增共享常量
export * from './shared-base-values.constants';
export * from './shared-ttl.constants';
export * from './shared-intervals.constants';
export * from './shared-batch-sizes.constants';

// 便利性重导出
export {
  CACHE_BASE_VALUES as BASE_VALUES,
} from './shared-base-values.constants';
export {
  CACHE_SHARED_TTL,
  CACHE_SHARED_TTL as SHARED_TTL,
} from './shared-ttl.constants';
export {
  CACHE_SHARED_INTERVALS,
  CACHE_SHARED_INTERVALS as SHARED_INTERVALS,
} from './shared-intervals.constants';
export {
  CACHE_SHARED_BATCH_SIZES,
  CACHE_SHARED_BATCH_SIZES as SHARED_BATCH_SIZES,
} from './shared-batch-sizes.constants';
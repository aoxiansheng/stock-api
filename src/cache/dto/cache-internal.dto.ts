/**
 * 缓存内部DTO - 统一导出
 */
export { CacheConfigDto } from "./config/cache-config.dto";
export { CacheOperationResultDto } from "./operations/cache-operation-result.dto";
export { BatchCacheOperationDto } from "./operations/batch-operation.dto";
export { CacheWarmupConfigDto } from "./operations/warmup-config.dto";
export { CacheHealthCheckResultDto } from "./health/health-check-result.dto";
export { CacheCompressionInfoDto } from "./data-processing/compression-info.dto";
export { CacheSerializationInfoDto } from "./data-processing/serialization-info.dto";
export { DistributedLockInfoDto } from "./locking/distributed-lock-info.dto";
export {
  CacheKeyPatternAnalysisQueryDto,
  CacheKeyPatternAnalysisDto,
} from "./analytics/key-pattern-analysis.dto";
export {
  CachePerformanceMonitoringQueryDto,
  CachePerformanceMonitoringDto,
} from "./monitoring/performance-monitoring.dto";
export { CacheMetricsUpdateDto } from "./metrics/metrics-update.dto";

// 废弃的DTO
export { RedisCacheRuntimeStatsDto } from "./redis-cache-runtime-stats.dto";

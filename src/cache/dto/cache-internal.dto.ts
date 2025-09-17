/**
 * 缓存内部DTO - 向后兼容接口
 * 🎯 统一定义缓存相关的DTO，确保系统一致性
 * ⚠️  本文件保持向后兼容，推荐使用模块化导入
 *
 * 新的模块化结构：
 * - config/ : 配置相关DTO（缓存配置）
 * - operations/ : 操作相关DTO（操作结果、批量操作、预热配置）
 * - health/ : 健康检查相关DTO（健康状态）
 * - data-processing/ : 数据处理相关DTO（压缩、序列化）
 * - locking/ : 分布式锁相关DTO（锁信息）
 * - analytics/ : 分析统计相关DTO（键模式分析）
 * - monitoring/ : 监控相关DTO（性能监控）
 * - metrics/ : 指标相关DTO（指标更新）
 */

// ============================================================================
// 向后兼容导出 - 重新导出模块化DTO
// ============================================================================

// 重新导出所有模块化DTO，确保现有代码不受影响
export { CacheConfigDto } from "./config/cache-config.dto";
export { CacheOperationResultDto } from "./operations/cache-operation-result.dto";
export { BatchCacheOperationDto } from "./operations/batch-operation.dto";
export { CacheWarmupConfigDto } from "./operations/warmup-config.dto";
export { CacheHealthCheckResultDto } from "./health/health-check-result.dto";
export { CacheCompressionInfoDto } from "./data-processing/compression-info.dto";
export { CacheSerializationInfoDto } from "./data-processing/serialization-info.dto";
export { DistributedLockInfoDto } from "./locking/distributed-lock-info.dto";
export { CacheKeyPatternAnalysisDto } from "./analytics/key-pattern-analysis.dto";
export { CachePerformanceMonitoringDto } from "./monitoring/performance-monitoring.dto";
export { CacheMetricsUpdateDto } from "./metrics/metrics-update.dto";

// ============================================================================
// 废弃的DTO（过渡期保留）
// ============================================================================

// 重新导出废弃的DTO，保持兼容性
export { RedisCacheRuntimeStatsDto } from "./redis-cache-runtime-stats.dto";

// ============================================================================
// 过渡期辅助工具
// ============================================================================

/**
 * 模块化导入指南
 *
 * 推荐使用模块化导入方式，详见统一接口配置
 *
 * ```typescript
 * // 推荐方式：直接从具体模块导入
 * import { CacheConfigDto } from './config/cache-config.dto'
 * import { CacheOperationResultDto } from './operations/cache-operation-result.dto'
 *
 * // 统一接口：使用cache-shared.interfaces
 * import { CacheStatistics, TTLFields } from './shared/cache-shared.interfaces'
 * ```
 */

/**
 * 缓存DTO统一导出
 * 🎯 符合开发规范指南 - 提供向后兼容的统一导出接口
 * 
 * 导出策略：
 * 1. 保持原有导出名称不变，确保现有代码不受影响
 * 2. 按功能分类组织新的模块化导出
 * 3. 提供过渡期的 @deprecated 标注
 */

// ============================================================================
// 向后兼容导出 - 保持原有接口不变
// ============================================================================

// 重新导出原有的所有定义，确保现有代码不受影响
export * from './cache-internal.dto';

// ============================================================================
// 新的模块化导出 - 按功能分类组织
// ============================================================================

// 配置相关DTO
export { CacheConfigDto } from './config/cache-config.dto';

// 操作相关DTO  
export { CacheOperationResultDto } from './operations/cache-operation-result.dto';
export { BatchCacheOperationDto } from './operations/batch-operation.dto';
export { CacheWarmupConfigDto } from './operations/warmup-config.dto';

// 健康检查相关DTO
export { CacheHealthCheckResultDto } from './health/health-check-result.dto';

// 数据处理相关DTO
export { CacheCompressionInfoDto } from './data-processing/compression-info.dto';
export { CacheSerializationInfoDto } from './data-processing/serialization-info.dto';

// 分布式锁相关DTO
export { DistributedLockInfoDto } from './locking/distributed-lock-info.dto';

// 分析统计相关DTO
export { CacheKeyPatternAnalysisDto } from './analytics/key-pattern-analysis.dto';

// 监控相关DTO 
export { CachePerformanceMonitoringDto } from './monitoring/performance-monitoring.dto';

// 指标相关DTO
export { CacheMetricsUpdateDto } from './metrics/metrics-update.dto';

// 废弃的DTO（过渡期保留）
export { CacheStatsDto, RedisCacheRuntimeStatsDto } from './deprecated/cache-stats.dto';

// ============================================================================
// 命名空间导出 - 提供结构化访问方式
// ============================================================================

import { CacheConfigDto } from './config/cache-config.dto';
import { CacheOperationResultDto } from './operations/cache-operation-result.dto';
import { BatchCacheOperationDto } from './operations/batch-operation.dto';
import { CacheWarmupConfigDto } from './operations/warmup-config.dto';
import { CacheHealthCheckResultDto } from './health/health-check-result.dto';
import { CacheCompressionInfoDto } from './data-processing/compression-info.dto';
import { CacheSerializationInfoDto } from './data-processing/serialization-info.dto';
import { DistributedLockInfoDto } from './locking/distributed-lock-info.dto';
import { CacheKeyPatternAnalysisDto } from './analytics/key-pattern-analysis.dto';
import { CachePerformanceMonitoringDto } from './monitoring/performance-monitoring.dto';
import { CacheMetricsUpdateDto } from './metrics/metrics-update.dto';
// CacheStatsDto is a type alias, not a class, so we don't import it as a value

/**
 * 结构化的缓存DTO命名空间
 * 提供清晰的分类访问方式
 */
export const CacheDTOs = Object.freeze({
  // 配置
  Config: {
    CacheConfig: CacheConfigDto,
  },
  
  // 操作
  Operations: {
    OperationResult: CacheOperationResultDto,
    BatchOperation: BatchCacheOperationDto,
    WarmupConfig: CacheWarmupConfigDto,
  },
  
  // 健康检查
  Health: {
    HealthCheckResult: CacheHealthCheckResultDto,
  },
  
  // 数据处理
  DataProcessing: {
    CompressionInfo: CacheCompressionInfoDto,
    SerializationInfo: CacheSerializationInfoDto,
  },
  
  // 分布式锁
  Locking: {
    DistributedLockInfo: DistributedLockInfoDto,
  },
  
  // 分析统计
  Analytics: {
    KeyPatternAnalysis: CacheKeyPatternAnalysisDto,
  },
  
  // 监控
  Monitoring: {
    PerformanceMonitoring: CachePerformanceMonitoringDto,
  },
  
  // 指标
  Metrics: {
    MetricsUpdate: CacheMetricsUpdateDto,
  },
  
  // 废弃的（兼容性）
  // 注：CacheStatsDto 是类型别名，无法作为值使用
} as const);

// ============================================================================
// 过渡期辅助工具
// ============================================================================

/**
 * 模块化迁移指南
 * 
 * @deprecated 推荐使用模块化导入方式：
 * 
 * ```typescript
 * // 旧方式（仍然支持）
 * import { CacheConfigDto, CacheOperationResultDto } from '@/cache/dto';
 * 
 * // 新方式（推荐）
 * import { CacheConfigDto } from '@/cache/dto/config/cache-config.dto';
 * import { CacheOperationResultDto } from '@/cache/dto/operations/cache-operation-result.dto';
 * 
 * // 命名空间方式
 * import { CacheDTOs } from '@/cache/dto';
 * const ConfigDto = CacheDTOs.Config.CacheConfig;
 * ```
 */
export const DTO_MIGRATION_GUIDE = Object.freeze({
  "从cache-internal.dto.ts迁移到模块化结构": {
    "CacheConfigDto": "config/cache-config.dto.ts",
    "CacheOperationResultDto": "operations/cache-operation-result.dto.ts", 
    "BatchCacheOperationDto": "operations/batch-operation.dto.ts",
    "CacheWarmupConfigDto": "operations/warmup-config.dto.ts",
    "CacheHealthCheckResultDto": "health/health-check-result.dto.ts",
    "CacheCompressionInfoDto": "data-processing/compression-info.dto.ts",
    "CacheSerializationInfoDto": "data-processing/serialization-info.dto.ts",
    "DistributedLockInfoDto": "locking/distributed-lock-info.dto.ts",
    "CacheKeyPatternAnalysisDto": "analytics/key-pattern-analysis.dto.ts",
    "CachePerformanceMonitoringDto": "monitoring/performance-monitoring.dto.ts",
    "CacheMetricsUpdateDto": "metrics/metrics-update.dto.ts",
    "CacheStatsDto": "deprecated/cache-stats.dto.ts (已废弃)",
  }
} as const);
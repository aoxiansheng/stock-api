/**
 * 缓存配置类型定义
 * 统一缓存系统的配置类型，支持类型安全和编译时检查
 */

import { CACHE_OPERATIONS, CACHE_STRATEGIES, CACHE_STATUS } from '../constants/cache-operations.constants';

/**
 * 缓存操作类型联合类型
 */
export type CacheOperationType = typeof CACHE_OPERATIONS[keyof typeof CACHE_OPERATIONS];

/**
 * 缓存策略类型联合类型
 */
export type CacheStrategyType = typeof CACHE_STRATEGIES[keyof typeof CACHE_STRATEGIES];

/**
 * 缓存状态类型联合类型
 */
export type CacheStatusType = typeof CACHE_STATUS[keyof typeof CACHE_STATUS];

/**
 * 基础缓存配置接口
 * Foundation 层的标准配置定义
 */
export interface BaseCacheConfig {
  /** 缓存实例名称 */
  readonly name: string;

  /** 默认TTL (秒) */
  readonly defaultTtlSeconds: number;

  /** 最大TTL (秒) */
  readonly maxTtlSeconds: number;

  /** 最小TTL (秒) */
  readonly minTtlSeconds: number;

  /** 是否启用压缩 */
  readonly compressionEnabled: boolean;

  /** 压缩阈值 (字节) */
  readonly compressionThresholdBytes: number;

  /** 是否启用监控 */
  readonly metricsEnabled: boolean;

  /** 是否启用性能监控 */
  readonly performanceMonitoringEnabled: boolean;
}

/**
 * TTL策略配置接口
 */
export interface TtlStrategyConfig {
  /** 实时数据TTL (秒) */
  readonly realTimeTtlSeconds: number;

  /** 准实时数据TTL (秒) */
  readonly nearRealTimeTtlSeconds: number;

  /** 批量查询TTL (秒) */
  readonly batchQueryTtlSeconds: number;

  /** 非交易时段TTL (秒) */
  readonly offHoursTtlSeconds: number;

  /** 周末TTL (秒) */
  readonly weekendTtlSeconds: number;
}

/**
 * 性能配置接口
 */
export interface PerformanceConfig {
  /** 最大内存使用 (MB) */
  readonly maxMemoryMb: number;

  /** 默认批次大小 */
  readonly defaultBatchSize: number;

  /** 最大并发操作数 */
  readonly maxConcurrentOperations: number;

  /** 慢操作阈值 (毫秒) */
  readonly slowOperationThresholdMs: number;

  /** 连接超时 (毫秒) */
  readonly connectionTimeoutMs: number;

  /** 操作超时 (毫秒) */
  readonly operationTimeoutMs: number;
}

/**
 * 间隔配置接口
 */
export interface IntervalConfig {
  /** 清理间隔 (毫秒) */
  readonly cleanupIntervalMs: number;

  /** 健康检查间隔 (毫秒) */
  readonly healthCheckIntervalMs: number;

  /** 监控指标收集间隔 (毫秒) */
  readonly metricsCollectionIntervalMs: number;

  /** 统计日志间隔 (毫秒) */
  readonly statsLogIntervalMs: number;

  /** 心跳间隔 (毫秒) */
  readonly heartbeatIntervalMs: number;
}

/**
 * 限制配置接口
 */
export interface LimitConfig {
  /** 最大键长度 */
  readonly maxKeyLength: number;

  /** 最大值大小 (字节) */
  readonly maxValueSizeBytes: number;

  /** 最大缓存条目数 */
  readonly maxCacheEntries: number;

  /** 内存阈值比例 */
  readonly memoryThresholdRatio: number;

  /** 错误率告警阈值 */
  readonly errorRateAlertThreshold: number;
}

/**
 * 重试配置接口
 */
export interface RetryConfig {
  /** 最大重试次数 */
  readonly maxRetryAttempts: number;

  /** 基础重试延迟 (毫秒) */
  readonly baseRetryDelayMs: number;

  /** 重试延迟倍数 */
  readonly retryDelayMultiplier: number;

  /** 最大重试延迟 (毫秒) */
  readonly maxRetryDelayMs: number;

  /** 是否启用指数退避 */
  readonly exponentialBackoffEnabled: boolean;
}

/**
 * 统一缓存配置接口
 * 整合所有配置子类型，提供完整的配置类型定义
 */
export interface CacheUnifiedConfigInterface extends BaseCacheConfig {
  /** TTL策略配置 */
  readonly ttl: TtlStrategyConfig;

  /** 性能配置 */
  readonly performance: PerformanceConfig;

  /** 间隔配置 */
  readonly intervals: IntervalConfig;

  /** 限制配置 */
  readonly limits: LimitConfig;

  /** 重试配置 */
  readonly retry: RetryConfig;
}

/**
 * 环境变量配置映射类型
 * 用于从环境变量创建缓存配置
 */
export interface CacheEnvVarMapping {
  // === TTL配置映射 ===
  readonly CACHE_REAL_TIME_TTL_SECONDS: string;
  readonly CACHE_NEAR_REAL_TIME_TTL_SECONDS: string;
  readonly CACHE_BATCH_QUERY_TTL_SECONDS: string;
  readonly CACHE_OFF_HOURS_TTL_SECONDS: string;
  readonly CACHE_DEFAULT_TTL_SECONDS: string;

  // === 性能配置映射 ===
  readonly CACHE_MAX_MEMORY_MB: string;
  readonly CACHE_DEFAULT_BATCH_SIZE: string;
  readonly CACHE_MAX_CONCURRENT_OPERATIONS: string;
  readonly CACHE_SLOW_OPERATION_THRESHOLD_MS: string;

  // === 间隔配置映射 ===
  readonly CACHE_CLEANUP_INTERVAL_MS: string;
  readonly CACHE_HEALTH_CHECK_INTERVAL_MS: string;
  readonly CACHE_METRICS_COLLECTION_INTERVAL_MS: string;
  readonly CACHE_CONNECTION_TIMEOUT_MS: string;

  // === 功能开关映射 ===
  readonly CACHE_COMPRESSION_ENABLED: string;
  readonly CACHE_METRICS_ENABLED: string;
  readonly CACHE_PERFORMANCE_MONITORING_ENABLED: string;

  // === 限制配置映射 ===
  readonly CACHE_MAX_KEY_LENGTH: string;
  readonly CACHE_MAX_VALUE_SIZE_MB: string;
}

/**
 * 缓存配置验证结果类型
 */
export interface CacheConfigValidationResult {
  /** 验证是否通过 */
  readonly isValid: boolean;

  /** 验证错误信息 */
  readonly errors: string[];

  /** 验证警告信息 */
  readonly warnings: string[];

  /** 修正后的配置 (如果有自动修正) */
  readonly correctedConfig?: Partial<CacheUnifiedConfigInterface>;
}

/**
 * 缓存配置创建选项
 */
export interface CacheConfigCreateOptions {
  /** 配置名称 */
  readonly name: string;

  /** 环境变量前缀 */
  readonly envPrefix?: string;

  /** 是否严格模式 (严格验证) */
  readonly strictMode?: boolean;

  /** 默认值覆盖 */
  readonly defaultOverrides?: Partial<CacheUnifiedConfigInterface>;

  /** 是否启用自动修正 */
  readonly autoCorrection?: boolean;
}
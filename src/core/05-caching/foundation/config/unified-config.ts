/**
 * 缓存系统统一配置类
 * 基于Foundation层的统一配置管理，消除配置重复和魔法数字
 * 遵循NestJS配置最佳实践和class-validator验证标准
 */

import { registerAs } from '@nestjs/config';
import { IsNumber, IsBoolean, IsString, Min, Max, validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';

// 引入foundation层常量
import {
  CACHE_CORE_VALUES,
  CACHE_CORE_TTL,
  CACHE_CORE_BATCH_SIZES,
  CACHE_CORE_INTERVALS
} from '../constants/core-values.constants';

// 引入foundation层类型
import type {
  CacheUnifiedConfigInterface,
  CacheEnvVarMapping,
  CacheConfigValidationResult,
  CacheConfigCreateOptions
} from '../types/cache-config.types';

/**
 * 缓存系统统一配置验证类
 * 使用class-validator进行运行时验证
 */
export class CacheUnifiedConfigValidation implements CacheUnifiedConfigInterface {
  // ========================================
  // 基础配置 (BaseCacheConfig)
  // ========================================

  @IsString()
  readonly name: string = 'cache-foundation';

  @IsNumber()
  @Min(CACHE_CORE_TTL.MIN_TTL_SECONDS)
  @Max(CACHE_CORE_TTL.MAX_TTL_SECONDS)
  readonly defaultTtlSeconds: number = CACHE_CORE_TTL.DEFAULT_TTL_SECONDS;

  @IsNumber()
  @Min(CACHE_CORE_TTL.MIN_TTL_SECONDS)
  @Max(CACHE_CORE_TTL.MAX_TTL_SECONDS)
  readonly maxTtlSeconds: number = CACHE_CORE_TTL.MAX_TTL_SECONDS;

  @IsNumber()
  @Min(1)
  @Max(CACHE_CORE_TTL.DEFAULT_TTL_SECONDS)
  readonly minTtlSeconds: number = CACHE_CORE_TTL.MIN_TTL_SECONDS;

  @IsBoolean()
  readonly compressionEnabled: boolean = true;

  @IsNumber()
  @Min(100)
  @Max(10 * 1024 * 1024) // 10MB
  readonly compressionThresholdBytes: number = CACHE_CORE_VALUES.DEFAULT_COMPRESSION_THRESHOLD;

  @IsBoolean()
  readonly metricsEnabled: boolean = true;

  @IsBoolean()
  readonly performanceMonitoringEnabled: boolean = true;

  // ========================================
  // TTL策略配置 (TtlStrategyConfig)
  // ========================================

  readonly ttl = {
    realTimeTtlSeconds: CACHE_CORE_TTL.REAL_TIME_TTL_SECONDS,
    nearRealTimeTtlSeconds: CACHE_CORE_TTL.NEAR_REAL_TIME_TTL_SECONDS,
    batchQueryTtlSeconds: CACHE_CORE_TTL.BATCH_QUERY_TTL_SECONDS,
    offHoursTtlSeconds: CACHE_CORE_TTL.OFF_HOURS_TTL_SECONDS,
    weekendTtlSeconds: CACHE_CORE_TTL.WEEKEND_TTL_SECONDS,
  };

  // ========================================
  // 性能配置 (PerformanceConfig)
  // ========================================

  readonly performance = {
    maxMemoryMb: 512,
    defaultBatchSize: CACHE_CORE_BATCH_SIZES.DEFAULT_BATCH_SIZE,
    maxConcurrentOperations: CACHE_CORE_VALUES.MAX_CONCURRENT_OPERATIONS,
    slowOperationThresholdMs: CACHE_CORE_VALUES.SLOW_OPERATION_THRESHOLD_MS,
    connectionTimeoutMs: CACHE_CORE_INTERVALS.CONNECTION_TIMEOUT_MS,
    operationTimeoutMs: CACHE_CORE_INTERVALS.OPERATION_TIMEOUT_MS,
  };

  // ========================================
  // 间隔配置 (IntervalConfig)
  // ========================================

  readonly intervals = {
    cleanupIntervalMs: CACHE_CORE_INTERVALS.CLEANUP_INTERVAL_MS,
    healthCheckIntervalMs: CACHE_CORE_INTERVALS.HEALTH_CHECK_INTERVAL_MS,
    metricsCollectionIntervalMs: CACHE_CORE_INTERVALS.METRICS_COLLECTION_INTERVAL_MS,
    statsLogIntervalMs: CACHE_CORE_INTERVALS.STATS_LOG_INTERVAL_MS,
    heartbeatIntervalMs: CACHE_CORE_INTERVALS.HEARTBEAT_INTERVAL_MS,
  };

  // ========================================
  // 限制配置 (LimitConfig)
  // ========================================

  readonly limits = {
    maxKeyLength: CACHE_CORE_VALUES.MAX_KEY_LENGTH,
    maxValueSizeBytes: CACHE_CORE_VALUES.MAX_VALUE_SIZE_BYTES,
    maxCacheEntries: CACHE_CORE_VALUES.DEFAULT_MAX_CACHE_SIZE,
    memoryThresholdRatio: CACHE_CORE_VALUES.DEFAULT_MEMORY_THRESHOLD,
    errorRateAlertThreshold: CACHE_CORE_VALUES.ERROR_RATE_ALERT_THRESHOLD,
  };

  // ========================================
  // 重试配置 (RetryConfig)
  // ========================================

  readonly retry = {
    maxRetryAttempts: CACHE_CORE_VALUES.DEFAULT_RETRY_ATTEMPTS,
    baseRetryDelayMs: 1000,
    retryDelayMultiplier: CACHE_CORE_VALUES.EXPONENTIAL_BACKOFF_BASE,
    maxRetryDelayMs: 30000,
    exponentialBackoffEnabled: true,
  };
}

/**
 * 创建缓存配置工厂函数
 * 基于18个核心环境变量创建统一配置
 */
export function createCacheConfig(options?: CacheConfigCreateOptions): CacheUnifiedConfigValidation {
  const envPrefix = options?.envPrefix || 'CACHE_';

  const rawConfig = {
    // === 基础配置 ===
    name: options?.name || 'cache-foundation',
    defaultTtlSeconds: parseInt(process.env[`${envPrefix}DEFAULT_TTL_SECONDS`] as string, 10)
      || CACHE_CORE_TTL.DEFAULT_TTL_SECONDS,
    maxTtlSeconds: parseInt(process.env[`${envPrefix}MAX_TTL_SECONDS`] as string, 10)
      || CACHE_CORE_TTL.MAX_TTL_SECONDS,
    minTtlSeconds: parseInt(process.env[`${envPrefix}MIN_TTL_SECONDS`] as string, 10)
      || CACHE_CORE_TTL.MIN_TTL_SECONDS,
    compressionEnabled: process.env[`${envPrefix}COMPRESSION_ENABLED`] !== 'false',
    compressionThresholdBytes: parseInt(process.env[`${envPrefix}COMPRESSION_THRESHOLD_BYTES`] as string, 10)
      || CACHE_CORE_VALUES.DEFAULT_COMPRESSION_THRESHOLD,
    metricsEnabled: process.env[`${envPrefix}METRICS_ENABLED`] !== 'false',
    performanceMonitoringEnabled: process.env[`${envPrefix}PERFORMANCE_MONITORING_ENABLED`] !== 'false',

    // === TTL策略配置 ===
    ttl: {
      realTimeTtlSeconds: parseInt(process.env[`${envPrefix}REAL_TIME_TTL_SECONDS`] as string, 10)
        || CACHE_CORE_TTL.REAL_TIME_TTL_SECONDS,
      nearRealTimeTtlSeconds: parseInt(process.env[`${envPrefix}NEAR_REAL_TIME_TTL_SECONDS`] as string, 10)
        || CACHE_CORE_TTL.NEAR_REAL_TIME_TTL_SECONDS,
      batchQueryTtlSeconds: parseInt(process.env[`${envPrefix}BATCH_QUERY_TTL_SECONDS`] as string, 10)
        || CACHE_CORE_TTL.BATCH_QUERY_TTL_SECONDS,
      offHoursTtlSeconds: parseInt(process.env[`${envPrefix}OFF_HOURS_TTL_SECONDS`] as string, 10)
        || CACHE_CORE_TTL.OFF_HOURS_TTL_SECONDS,
      weekendTtlSeconds: parseInt(process.env[`${envPrefix}WEEKEND_TTL_SECONDS`] as string, 10)
        || CACHE_CORE_TTL.WEEKEND_TTL_SECONDS,
    },

    // === 性能配置 ===
    performance: {
      maxMemoryMb: parseInt(process.env[`${envPrefix}MAX_MEMORY_MB`] as string, 10) || 512,
      defaultBatchSize: parseInt(process.env[`${envPrefix}DEFAULT_BATCH_SIZE`] as string, 10)
        || CACHE_CORE_BATCH_SIZES.DEFAULT_BATCH_SIZE,
      maxConcurrentOperations: parseInt(process.env[`${envPrefix}MAX_CONCURRENT_OPERATIONS`] as string, 10)
        || CACHE_CORE_VALUES.MAX_CONCURRENT_OPERATIONS,
      slowOperationThresholdMs: parseInt(process.env[`${envPrefix}SLOW_OPERATION_THRESHOLD_MS`] as string, 10)
        || CACHE_CORE_VALUES.SLOW_OPERATION_THRESHOLD_MS,
      connectionTimeoutMs: parseInt(process.env[`${envPrefix}CONNECTION_TIMEOUT_MS`] as string, 10)
        || CACHE_CORE_INTERVALS.CONNECTION_TIMEOUT_MS,
      operationTimeoutMs: parseInt(process.env[`${envPrefix}OPERATION_TIMEOUT_MS`] as string, 10)
        || CACHE_CORE_INTERVALS.OPERATION_TIMEOUT_MS,
    },

    // === 间隔配置 ===
    intervals: {
      cleanupIntervalMs: parseInt(process.env[`${envPrefix}CLEANUP_INTERVAL_MS`] as string, 10)
        || CACHE_CORE_INTERVALS.CLEANUP_INTERVAL_MS,
      healthCheckIntervalMs: parseInt(process.env[`${envPrefix}HEALTH_CHECK_INTERVAL_MS`] as string, 10)
        || CACHE_CORE_INTERVALS.HEALTH_CHECK_INTERVAL_MS,
      metricsCollectionIntervalMs: parseInt(process.env[`${envPrefix}METRICS_COLLECTION_INTERVAL_MS`] as string, 10)
        || CACHE_CORE_INTERVALS.METRICS_COLLECTION_INTERVAL_MS,
      statsLogIntervalMs: parseInt(process.env[`${envPrefix}STATS_LOG_INTERVAL_MS`] as string, 10)
        || CACHE_CORE_INTERVALS.STATS_LOG_INTERVAL_MS,
      heartbeatIntervalMs: parseInt(process.env[`${envPrefix}HEARTBEAT_INTERVAL_MS`] as string, 10)
        || CACHE_CORE_INTERVALS.HEARTBEAT_INTERVAL_MS,
    },

    // === 限制配置 ===
    limits: {
      maxKeyLength: parseInt(process.env[`${envPrefix}MAX_KEY_LENGTH`] as string, 10)
        || CACHE_CORE_VALUES.MAX_KEY_LENGTH,
      maxValueSizeBytes: parseInt(process.env[`${envPrefix}MAX_VALUE_SIZE_MB`] as string, 10) * 1024 * 1024
        || CACHE_CORE_VALUES.MAX_VALUE_SIZE_BYTES,
      maxCacheEntries: parseInt(process.env[`${envPrefix}MAX_CACHE_ENTRIES`] as string, 10)
        || CACHE_CORE_VALUES.DEFAULT_MAX_CACHE_SIZE,
      memoryThresholdRatio: parseFloat(process.env[`${envPrefix}MEMORY_THRESHOLD_RATIO`] as string)
        || CACHE_CORE_VALUES.DEFAULT_MEMORY_THRESHOLD,
      errorRateAlertThreshold: parseFloat(process.env[`${envPrefix}ERROR_RATE_ALERT_THRESHOLD`] as string)
        || CACHE_CORE_VALUES.ERROR_RATE_ALERT_THRESHOLD,
    },

    // === 重试配置 ===
    retry: {
      maxRetryAttempts: parseInt(process.env[`${envPrefix}MAX_RETRY_ATTEMPTS`] as string, 10)
        || CACHE_CORE_VALUES.DEFAULT_RETRY_ATTEMPTS,
      baseRetryDelayMs: parseInt(process.env[`${envPrefix}BASE_RETRY_DELAY_MS`] as string, 10) || 1000,
      retryDelayMultiplier: parseFloat(process.env[`${envPrefix}RETRY_DELAY_MULTIPLIER`] as string)
        || CACHE_CORE_VALUES.EXPONENTIAL_BACKOFF_BASE,
      maxRetryDelayMs: parseInt(process.env[`${envPrefix}MAX_RETRY_DELAY_MS`] as string, 10) || 30000,
      exponentialBackoffEnabled: process.env[`${envPrefix}EXPONENTIAL_BACKOFF_ENABLED`] !== 'false',
    },

    // 应用默认值覆盖
    ...options?.defaultOverrides,
  };

  // 转换为验证类实例
  const config = plainToInstance(CacheUnifiedConfigValidation, rawConfig);

  // 执行验证
  if (options?.strictMode !== false) {
    const validationResult = validateCacheConfig(config);
    if (!validationResult.isValid) {
      throw new Error(`Cache configuration validation failed: ${validationResult.errors.join(', ')}`);
    }
  }

  return config;
}

/**
 * 验证缓存配置
 */
export function validateCacheConfig(config: Partial<CacheUnifiedConfigValidation>): CacheConfigValidationResult {
  const errors = validateSync(config as object, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  const validationErrors = errors.map(error =>
    Object.values(error.constraints || {}).join(', ')
  );

  const warnings: string[] = [];

  // 业务逻辑验证
  if (config.ttl && config.performance) {
    if (config.ttl.realTimeTtlSeconds > config.ttl.nearRealTimeTtlSeconds) {
      warnings.push('Real-time TTL is greater than near-real-time TTL');
    }
  }

  if (config.performance && config.intervals) {
    if (config.performance.slowOperationThresholdMs > config.intervals.healthCheckIntervalMs) {
      warnings.push('Slow operation threshold is greater than health check interval');
    }
  }

  return {
    isValid: validationErrors.length === 0,
    errors: validationErrors,
    warnings,
  };
}

/**
 * NestJS配置注册
 * 使用命名空间 'cacheUnified' 注册配置
 */
export default registerAs('cacheUnified', (): CacheUnifiedConfigValidation => {
  return createCacheConfig({
    name: 'cache-unified-foundation',
    strictMode: true,
    autoCorrection: false,
  });
});

/**
 * 18个核心环境变量列表
 * 用于文档和环境配置参考
 */
export const CORE_ENV_VARIABLES: (keyof CacheEnvVarMapping)[] = [
  // TTL配置 (5个)
  'CACHE_REAL_TIME_TTL_SECONDS',
  'CACHE_NEAR_REAL_TIME_TTL_SECONDS',
  'CACHE_BATCH_QUERY_TTL_SECONDS',
  'CACHE_OFF_HOURS_TTL_SECONDS',
  'CACHE_DEFAULT_TTL_SECONDS',

  // 性能配置 (4个)
  'CACHE_MAX_MEMORY_MB',
  'CACHE_DEFAULT_BATCH_SIZE',
  'CACHE_MAX_CONCURRENT_OPERATIONS',
  'CACHE_SLOW_OPERATION_THRESHOLD_MS',

  // 间隔配置 (4个)
  'CACHE_CLEANUP_INTERVAL_MS',
  'CACHE_HEALTH_CHECK_INTERVAL_MS',
  'CACHE_METRICS_COLLECTION_INTERVAL_MS',
  'CACHE_CONNECTION_TIMEOUT_MS',

  // 功能开关 (3个)
  'CACHE_COMPRESSION_ENABLED',
  'CACHE_METRICS_ENABLED',
  'CACHE_PERFORMANCE_MONITORING_ENABLED',

  // 限制配置 (2个)
  'CACHE_MAX_KEY_LENGTH',
  'CACHE_MAX_VALUE_SIZE_MB',
];
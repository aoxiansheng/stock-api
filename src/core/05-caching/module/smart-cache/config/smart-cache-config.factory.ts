import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import type { CacheUnifiedConfigInterface } from "../../../foundation/types/cache-config.types";
import { SMART_CACHE_CONSTANTS } from "../constants/smart-cache.constants";
import { SMART_CACHE_ENV_VARS, getEnvVar } from "../constants/smart-cache.env-vars.constants";
import { SMART_CACHE_COMPONENT } from "../constants/smart-cache.component.constants";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier
} from '@common/core/exceptions';
import { SMART_CACHE_ERROR_CODES } from '../constants/smart-cache-error-codes.constants';
import { CACHE_CORE_INTERVALS, CACHE_CORE_BATCH_SIZES } from "../../../foundation/constants/core-values.constants";

/**
 * SmartCache配置工厂类
 *
 * 核心功能：
 * - 环境变量驱动的配置生成，支持容器化部署
 * - 完整的配置验证和类型安全
 * - 12-Factor App配置外部化最佳实践
 *
 * 支持的环境变量：
 * - SMART_CACHE_TTL_STRONG_S / TTL_WEAK_S / TTL_OPEN_S / TTL_CLOSED_S
 * - SMART_CACHE_MAX_CONCURRENCY
 *
 * 使用场景：
 * - Docker容器环境配置
 * - Kubernetes ConfigMap/Secret集成
 * - 开发/测试/生产环境差异化配置
 */
@Injectable()
export class SmartCacheConfigFactory {
  private static readonly logger = createLogger(
    SMART_CACHE_COMPONENT.LOG_CONTEXTS.CONFIG_FACTORY,
  );

  /**
   * 创建SmartCache配置实例
   * 基于最小环境变量集合生成配置
  */
  static createConfig(): CacheUnifiedConfigInterface {
    this.logger.log(`Creating SmartCache config`);

    // 从环境变量获取基础配置值
    const strongTtl = this.parseIntEnv(
      getEnvVar("TTL_STRONG_S"),
      SMART_CACHE_CONSTANTS.TTL.STRONG_TIMELINESS_DEFAULT_S,
    );

    const weakTtl = this.parseIntEnv(
      getEnvVar("TTL_WEAK_S"),
      SMART_CACHE_CONSTANTS.TTL.WEAK_TIMELINESS_DEFAULT_S,
    );

    const openTtl = this.parseIntEnv(
      getEnvVar("TTL_OPEN_S"),
      Math.round(strongTtl * 2),
    );

    const closedTtl = this.parseIntEnv(
      getEnvVar("TTL_CLOSED_S"),
      SMART_CACHE_CONSTANTS.TTL.MARKET_CLOSED_DEFAULT_S,
    );

    const maxConcurrentOps = this.parseIntEnv(
      getEnvVar("MAX_CONCURRENCY"),
      SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.MIN_CONCURRENT_UPDATES_COUNT +
        Math.floor(
          (SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.DEFAULT_BATCH_SIZE_COUNT) / 5
        ),
      SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.MIN_CONCURRENT_UPDATES_COUNT,
      SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.MAX_CONCURRENT_UPDATES_COUNT,
    );

    // 映射到CacheUnifiedConfigInterface
    const unifiedConfig: CacheUnifiedConfigInterface = {
      // BaseCacheConfig fields
      name: 'smart-cache',
      defaultTtlSeconds: weakTtl, // 使用弱时效性TTL作为默认值
      maxTtlSeconds: SMART_CACHE_CONSTANTS.TTL.ADAPTIVE_MAX_S, // 3600秒
      minTtlSeconds: strongTtl, // 使用强时效性TTL作为最小值
      compressionEnabled: true,
      compressionThresholdBytes: 1024,
      metricsEnabled: false,
      performanceMonitoringEnabled: false,

      // TTL策略配置
      ttl: {
        realTimeTtlSeconds: strongTtl, // 强时效性：实时数据
        nearRealTimeTtlSeconds: openTtl, // 市场开市/近实时TTL
        batchQueryTtlSeconds: weakTtl, // 批量查询：弱时效性
        offHoursTtlSeconds: closedTtl, // 非交易时间
        weekendTtlSeconds: closedTtl * 2, // 周末更长缓存
      },

      // 性能配置
      performance: {
        maxMemoryMb: 512, // 固定默认 512MB（KISS）
        defaultBatchSize: CACHE_CORE_BATCH_SIZES.MEDIUM_BATCH_SIZE,
        maxConcurrentOperations: maxConcurrentOps,
        slowOperationThresholdMs: 1000,
        connectionTimeoutMs: CACHE_CORE_INTERVALS.CONNECTION_TIMEOUT_MS,
        operationTimeoutMs: CACHE_CORE_INTERVALS.OPERATION_TIMEOUT_MS,
      },

      // 间隔配置
      intervals: {
        cleanupIntervalMs: CACHE_CORE_INTERVALS.CLEANUP_INTERVAL_MS,
        healthCheckIntervalMs: CACHE_CORE_INTERVALS.HEALTH_CHECK_INTERVAL_MS,
        metricsCollectionIntervalMs: CACHE_CORE_INTERVALS.METRICS_COLLECTION_INTERVAL_MS,
        statsLogIntervalMs: CACHE_CORE_INTERVALS.STATS_LOG_INTERVAL_MS,
        heartbeatIntervalMs: CACHE_CORE_INTERVALS.HEARTBEAT_INTERVAL_MS,
      },

      // 限制配置
      limits: {
        maxKeyLength: 500, // 智能缓存键可能较长，包含策略信息
        maxValueSizeBytes: 10 * 1024 * 1024, // 10MB
        maxCacheEntries: 100000, // 10万条缓存条目
        memoryThresholdRatio: 0.85, // 85%内存阈值
        errorRateAlertThreshold: 0.05, // 5%错误率告警
      },

      // 重试配置
      retry: {
        maxRetryAttempts: 3,
        baseRetryDelayMs: 100,
        retryDelayMultiplier: 2,
        maxRetryDelayMs: 5000,
        exponentialBackoffEnabled: true,
      },
    };

    // 配置验证
    const validationErrors = this.validateUnifiedConfig(unifiedConfig);
    if (validationErrors.length > 0) {
      this.logger.error(
        `SmartCache configuration validation failed:`,
        validationErrors,
      );
      throw UniversalExceptionFactory.createBusinessException({
        component: ComponentIdentifier.SMART_CACHE,
        errorCode: BusinessErrorCode.CONFIGURATION_ERROR,
        operation: 'createConfig',
        message: `SmartCache configuration validation failed: ${validationErrors.join(", ")}`,
        context: {
          validationErrors,
          errorType: SMART_CACHE_ERROR_CODES.CONFIG_VALIDATION_FAILED
        }
      });
    }

    // 记录配置摘要
    this.logger.log(`SmartCache configuration created successfully:`, {
      maxConcurrentOperations: unifiedConfig.performance.maxConcurrentOperations,
      enableMetrics: unifiedConfig.metricsEnabled,
      strongTtl: unifiedConfig.ttl.realTimeTtlSeconds,
      weakTtl: unifiedConfig.ttl.batchQueryTtlSeconds,
      maxMemoryMb: unifiedConfig.performance.maxMemoryMb,
    });

    return unifiedConfig;
  }

  /**
   * 解析整数型环境变量
   * @param key 环境变量键名
   * @param defaultValue 默认值
   * @param min 最小值（可选）
   * @param max 最大值（可选）
   */
  private static parseIntEnv(
    key: string,
    defaultValue: number,
    min?: number,
    max?: number,
  ): number {
    const value = process.env[key];
    if (!value) {
      return defaultValue;
    }

    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      this.logger.warn(
        `Invalid integer value for ${key}: '${value}', using default: ${defaultValue}`,
      );
      return defaultValue;
    }

    // 边界检查
    if (min !== undefined && parsed < min) {
      this.logger.warn(
        `Value for ${key} (${parsed}) below minimum (${min}), using minimum`,
      );
      return min;
    }
    if (max !== undefined && parsed > max) {
      this.logger.warn(
        `Value for ${key} (${parsed}) above maximum (${max}), using maximum`,
      );
      return max;
    }

    // 使用者如需详细日志，请在外层记录；此处保持最小实现
    return parsed;
  }

  /**
   * 解析浮点数型环境变量
   * @param key 环境变量键名
   * @param defaultValue 默认值
   * @param min 最小值（可选）
   * @param max 最大值（可选）
   */
  // 去除 parseFloatEnv/parseBoolEnv，保持最小实现（KISS）

  /**
   * 配置验证
   * @param config 统一配置对象
   * @returns 验证错误数组
   */
  private static validateUnifiedConfig(
    config: CacheUnifiedConfigInterface,
  ): string[] {
    const errors: string[] = [];

    // 基础配置验证
    if (!config.name || config.name.trim().length === 0) {
      errors.push("name must be a non-empty string");
    }

    if (config.defaultTtlSeconds <= 0) {
      errors.push("defaultTtlSeconds must be positive");
    }

    if (config.minTtlSeconds <= 0) {
      errors.push("minTtlSeconds must be positive");
    }

    if (config.maxTtlSeconds <= config.minTtlSeconds) {
      errors.push("maxTtlSeconds must be greater than minTtlSeconds");
    }

    if (config.compressionThresholdBytes <= 0) {
      errors.push("compressionThresholdBytes must be positive");
    }

    // TTL策略验证
    const ttl = config.ttl;
    if (ttl.realTimeTtlSeconds <= 0) {
      errors.push("ttl.realTimeTtlSeconds must be positive");
    }
    if (ttl.nearRealTimeTtlSeconds <= 0) {
      errors.push("ttl.nearRealTimeTtlSeconds must be positive");
    }
    if (ttl.batchQueryTtlSeconds <= 0) {
      errors.push("ttl.batchQueryTtlSeconds must be positive");
    }
    if (ttl.offHoursTtlSeconds <= 0) {
      errors.push("ttl.offHoursTtlSeconds must be positive");
    }
    if (ttl.weekendTtlSeconds <= 0) {
      errors.push("ttl.weekendTtlSeconds must be positive");
    }

    // 性能配置验证
    const performance = config.performance;
    if (performance.maxMemoryMb <= 0) {
      errors.push("performance.maxMemoryMb must be positive");
    }
    if (performance.maxMemoryMb > 8192) {
      errors.push("performance.maxMemoryMb should not exceed 8GB for stability");
    }
    if (performance.defaultBatchSize <= 0) {
      errors.push("performance.defaultBatchSize must be positive");
    }
    if (performance.maxConcurrentOperations <= 0) {
      errors.push("performance.maxConcurrentOperations must be positive");
    }
    if (performance.maxConcurrentOperations > 100) {
      errors.push(
        "performance.maxConcurrentOperations should not exceed 100 for performance reasons",
      );
    }
    if (performance.slowOperationThresholdMs <= 0) {
      errors.push("performance.slowOperationThresholdMs must be positive");
    }
    if (performance.connectionTimeoutMs <= 0) {
      errors.push("performance.connectionTimeoutMs must be positive");
    }
    if (performance.operationTimeoutMs <= 0) {
      errors.push("performance.operationTimeoutMs must be positive");
    }

    // 间隔配置验证
    const intervals = config.intervals;
    if (intervals.cleanupIntervalMs <= 0) {
      errors.push("intervals.cleanupIntervalMs must be positive");
    }
    if (intervals.healthCheckIntervalMs <= 0) {
      errors.push("intervals.healthCheckIntervalMs must be positive");
    }
    if (intervals.metricsCollectionIntervalMs <= 0) {
      errors.push("intervals.metricsCollectionIntervalMs must be positive");
    }
    if (intervals.statsLogIntervalMs <= 0) {
      errors.push("intervals.statsLogIntervalMs must be positive");
    }
    if (intervals.heartbeatIntervalMs <= 0) {
      errors.push("intervals.heartbeatIntervalMs must be positive");
    }

    // 限制配置验证
    const limits = config.limits;
    if (limits.maxKeyLength <= 0) {
      errors.push("limits.maxKeyLength must be positive");
    }
    if (limits.maxValueSizeBytes <= 0) {
      errors.push("limits.maxValueSizeBytes must be positive");
    }
    if (limits.maxCacheEntries <= 0) {
      errors.push("limits.maxCacheEntries must be positive");
    }
    if (limits.memoryThresholdRatio <= 0 || limits.memoryThresholdRatio > 1) {
      errors.push("limits.memoryThresholdRatio must be between 0 and 1");
    }
    if (limits.errorRateAlertThreshold < 0 || limits.errorRateAlertThreshold > 1) {
      errors.push("limits.errorRateAlertThreshold must be between 0 and 1");
    }

    // 重试配置验证
    const retry = config.retry;
    if (retry.maxRetryAttempts < 0) {
      errors.push("retry.maxRetryAttempts must be non-negative");
    }
    if (retry.baseRetryDelayMs <= 0) {
      errors.push("retry.baseRetryDelayMs must be positive");
    }
    if (retry.retryDelayMultiplier <= 1) {
      errors.push("retry.retryDelayMultiplier must be greater than 1");
    }
    if (retry.maxRetryDelayMs <= retry.baseRetryDelayMs) {
      errors.push("retry.maxRetryDelayMs must be greater than baseRetryDelayMs");
    }

    return errors;
  }

}

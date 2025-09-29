import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import os from "os";
import type { CacheUnifiedConfigInterface } from "../../../foundation/types/cache-config.types";
import { CacheStrategy } from "../services/smart-cache-standardized.service";
import {
  SMART_CACHE_CONSTANTS,
  SmartCacheConstantsType,
} from "../constants/smart-cache.constants";
import {
  SMART_CACHE_ENV_VARS,
  SmartCacheEnvVarKey,
  getEnvVar,
} from "../constants/smart-cache.env-vars.constants";
import { SMART_CACHE_COMPONENT } from "../constants/smart-cache.component.constants";
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier
} from '@common/core/exceptions';
import { SMART_CACHE_ERROR_CODES } from '../constants/smart-cache-error-codes.constants';

/**
 * SmartCache配置工厂类
 *
 * 核心功能：
 * - 环境变量驱动的配置生成，支持容器化部署
 * - CPU核心数感知的智能默认值计算
 * - 完整的配置验证和类型安全
 * - 12-Factor App配置外部化最佳实践
 *
 * 支持的环境变量：
 * - SMART_CACHE_*: 基础配置参数
 * - CACHE_STRONG_*: 强时效性策略配置
 * - CACHE_WEAK_*: 弱时效性策略配置
 * - CACHE_MARKET_*: 市场感知策略配置
 * - CACHE_ADAPTIVE_*: 自适应策略配置
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
   * 基于环境变量和系统资源生成优化的配置
   */
  static createConfig(): CacheUnifiedConfigInterface {
    const cpuCores = os.cpus().length;
    const totalMemoryMB = Math.round(os.totalmem() / (1024 * 1024));

    this.logger.log(
      `Creating SmartCache config - CPU cores: ${cpuCores}, Total memory: ${totalMemoryMB}MB`,
    );

    // 从环境变量获取基础配置值
    const strongTtl = this.parseIntEnv(
      getEnvVar("STRONG_TTL_SECONDS"),
      SMART_CACHE_CONSTANTS.TTL.STRONG_TIMELINESS_DEFAULT_S,
    );

    const weakTtl = this.parseIntEnv(
      getEnvVar("WEAK_TTL_SECONDS"),
      SMART_CACHE_CONSTANTS.TTL.WEAK_TIMELINESS_DEFAULT_S,
    );

    const maxConcurrentOps = this.parseIntEnv(
      getEnvVar("MAX_CONCURRENT_UPDATES"),
      // 智能默认值：基于CPU核心数，使用常量定义范围
      Math.min(
        Math.max(
          SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.MIN_CONCURRENT_UPDATES_COUNT,
          cpuCores,
        ),
        SMART_CACHE_CONSTANTS.CONCURRENCY_LIMITS.MAX_CONCURRENT_UPDATES_COUNT,
      ),
    );

    const enableMetrics = this.parseBoolEnv(getEnvVar("ENABLE_METRICS"), true);

    // 映射到CacheUnifiedConfigInterface
    const unifiedConfig: CacheUnifiedConfigInterface = {
      // BaseCacheConfig fields
      name: 'smart-cache',
      defaultTtlSeconds: weakTtl, // 使用弱时效性TTL作为默认值
      maxTtlSeconds: SMART_CACHE_CONSTANTS.TTL.ADAPTIVE_MAX_S, // 3600秒
      minTtlSeconds: strongTtl, // 使用强时效性TTL作为最小值
      compressionEnabled: true,
      compressionThresholdBytes: 1024,
      metricsEnabled: enableMetrics,
      performanceMonitoringEnabled: enableMetrics,

      // TTL策略配置
      ttl: {
        realTimeTtlSeconds: strongTtl, // 强时效性：实时数据
        nearRealTimeTtlSeconds: Math.round(strongTtl * 2), // 近实时：强时效性的2倍
        batchQueryTtlSeconds: weakTtl, // 批量查询：弱时效性
        offHoursTtlSeconds: SMART_CACHE_CONSTANTS.TTL.MARKET_CLOSED_DEFAULT_S, // 非交易时间
        weekendTtlSeconds: SMART_CACHE_CONSTANTS.TTL.MARKET_CLOSED_DEFAULT_S * 2, // 周末更长缓存
      },

      // 性能配置
      performance: {
        maxMemoryMb: Math.min(Math.round(totalMemoryMB * 0.3), 2048), // 最多使用30%内存，不超过2GB
        defaultBatchSize: 50,
        maxConcurrentOperations: maxConcurrentOps,
        slowOperationThresholdMs: 1000,
        connectionTimeoutMs: 5000,
        operationTimeoutMs: this.parseIntEnv(
          getEnvVar("SHUTDOWN_TIMEOUT_MS"),
          SMART_CACHE_CONSTANTS.INTERVALS_MS.GRACEFUL_SHUTDOWN_TIMEOUT_MS,
        ),
      },

      // 间隔配置
      intervals: {
        cleanupIntervalMs: 300000, // 5分钟清理间隔
        healthCheckIntervalMs: this.parseIntEnv(
          getEnvVar("HEALTH_CHECK_INTERVAL_MS"),
          SMART_CACHE_CONSTANTS.TTL.WEAK_TIMELINESS_DEFAULT_S * 1000, // 300秒转毫秒
        ),
        metricsCollectionIntervalMs: 60000, // 1分钟收集指标
        statsLogIntervalMs: 300000, // 5分钟记录统计
        heartbeatIntervalMs: this.parseIntEnv(
          getEnvVar("MIN_UPDATE_INTERVAL_MS"),
          SMART_CACHE_CONSTANTS.INTERVALS_MS.DEFAULT_MIN_UPDATE_INTERVAL_MS,
        ),
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

    // 仅在有自定义环境变量时输出详细信息
    const customEnvVars = this.getCurrentEnvVars();
    const setEnvVars = Object.entries(customEnvVars).filter(
      ([, value]) => value !== undefined,
    );
    if (setEnvVars.length > 0) {
      this.logger.log(
        `Custom environment variables: ${setEnvVars.map(([key, value]) => `${key}=${value}`).join(", ")}`,
      );
    } else {
      this.logger.debug(
        `Using all default values for SmartCache configuration`,
      );
    }

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
      // 仅在详细模式时输出默认值日志
      if (process.env.SMART_CACHE_VERBOSE_CONFIG === "true") {
        this.logger.debug(`Using default value for ${key}: ${defaultValue}`);
      }
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

    // 仅在有自定义值时输出debug日志
    this.logger.debug(`Parsed ${key}: ${parsed}`);
    return parsed;
  }

  /**
   * 解析浮点数型环境变量
   * @param key 环境变量键名
   * @param defaultValue 默认值
   * @param min 最小值（可选）
   * @param max 最大值（可选）
   */
  private static parseFloatEnv(
    key: string,
    defaultValue: number,
    min?: number,
    max?: number,
  ): number {
    const value = process.env[key];
    if (!value) {
      // 仅在详细模式时输出默认值日志
      if (process.env.SMART_CACHE_VERBOSE_CONFIG === "true") {
        this.logger.debug(`Using default value for ${key}: ${defaultValue}`);
      }
      return defaultValue;
    }

    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      this.logger.warn(
        `Invalid float value for ${key}: '${value}', using default: ${defaultValue}`,
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

    // 仅在有自定义值时输出debug日志
    this.logger.debug(`Parsed ${key}: ${parsed}`);
    return parsed;
  }

  /**
   * 解析布尔型环境变量
   * @param key 环境变量键名
   * @param defaultValue 默认值
   */
  private static parseBoolEnv(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (!value) {
      // 仅在详细模式时输出默认值日志
      if (process.env.SMART_CACHE_VERBOSE_CONFIG === "true") {
        this.logger.debug(`Using default value for ${key}: ${defaultValue}`);
      }
      return defaultValue;
    }

    const lowerValue = value.toLowerCase();
    const parsedValue =
      lowerValue === "true" || lowerValue === "1" || lowerValue === "yes";

    // 仅在有自定义值时输出debug日志
    this.logger.debug(`Parsed ${key}: ${parsedValue}`);
    return parsedValue;
  }

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

  /**
   * 获取系统环境信息
   * 用于诊断和监控
   */
  static getSystemInfo() {
    return {
      cpuCores: os.cpus().length,
      totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemoryMB: Math.round(os.freemem() / (1024 * 1024)),
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
    };
  }

  /**
   * 获取当前生效的环境变量
   * 用于调试和配置检查
   */
  static getCurrentEnvVars(): Record<string, string | undefined> {
    const envKeys = [
      // 基础配置
      "SMART_CACHE_MIN_UPDATE_INTERVAL",
      "SMART_CACHE_MAX_CONCURRENT",
      "SMART_CACHE_SHUTDOWN_TIMEOUT",
      "SMART_CACHE_ENABLE_BACKGROUND_UPDATE",
      "SMART_CACHE_ENABLE_DATA_CHANGE_DETECTION",
      "SMART_CACHE_ENABLE_METRICS",

      // 强时效性策略
      "CACHE_STRONG_TTL",
      "CACHE_STRONG_BACKGROUND_UPDATE",
      "CACHE_STRONG_THRESHOLD",
      "CACHE_STRONG_REFRESH_INTERVAL",
      "CACHE_STRONG_DATA_CHANGE_DETECTION",

      // 弱时效性策略
      "CACHE_WEAK_TTL",
      "CACHE_WEAK_BACKGROUND_UPDATE",
      "CACHE_WEAK_THRESHOLD",
      "CACHE_WEAK_MIN_UPDATE",
      "CACHE_WEAK_DATA_CHANGE_DETECTION",

      // 市场感知策略
      "CACHE_MARKET_OPEN_TTL",
      "CACHE_MARKET_CLOSED_TTL",
      "CACHE_MARKET_BACKGROUND_UPDATE",
      "CACHE_MARKET_CHECK_INTERVAL",
      "CACHE_MARKET_OPEN_THRESHOLD",
      "CACHE_MARKET_CLOSED_THRESHOLD",
      "CACHE_MARKET_DATA_CHANGE_DETECTION",

      // 自适应策略
      "CACHE_ADAPTIVE_BASE_TTL",
      "CACHE_ADAPTIVE_MIN_TTL",
      "CACHE_ADAPTIVE_MAX_TTL",
      "CACHE_ADAPTIVE_FACTOR",
      "CACHE_ADAPTIVE_BACKGROUND_UPDATE",
      "CACHE_ADAPTIVE_DETECTION_WINDOW",
      "CACHE_ADAPTIVE_DATA_CHANGE_DETECTION",
    ];

    const result: Record<string, string | undefined> = {};
    envKeys.forEach((key) => {
      result[key] = process.env[key];
    });

    return result;
  }
}

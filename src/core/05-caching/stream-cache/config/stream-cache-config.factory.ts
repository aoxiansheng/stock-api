import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import {
  STREAM_CACHE_ENV_VARS,
  StreamCacheEnvVarKey,
  getEnvVar,
} from "../constants/stream-cache.env-vars.constants";
import { DEFAULT_STREAM_CACHE_CONFIG } from "../constants/stream-cache.constants";

/**
 * Stream Cache 配置工厂类
 *
 * 核心功能：
 * - 环境变量驱动的配置生成，支持容器化部署
 * - 流数据缓存特有配置的智能默认值
 * - 完整的配置验证和类型安全
 * - 与 basic-cache 共享常量的无缝集成
 *
 * 支持的环境变量：
 * - STREAM_CACHE_*: 流缓存特有配置
 * - CACHE_*: 共享配置（通过 basic-cache 常量映射）
 *
 * 使用场景：
 * - WebSocket 流数据缓存
 * - 实时数据流处理
 * - 热缓存和温缓存管理
 */
@Injectable()
export class StreamCacheConfigFactory {
  private static readonly logger = createLogger("StreamCacheConfigFactory");

  /**
   * 创建 Stream Cache 配置实例
   * 基于环境变量和默认值生成优化的配置
   */
  static createConfig() {
    this.logger.log("Creating Stream Cache configuration...");

    const config = {
      // 流缓存特有配置
      hotCacheTTL: this.parseIntEnv(
        getEnvVar("HOT_CACHE_TTL_SECONDS"),
        DEFAULT_STREAM_CACHE_CONFIG.hotCacheTTL,
      ),
      warmCacheTTL: this.parseIntEnv(
        getEnvVar("WARM_CACHE_TTL_SECONDS"),
        DEFAULT_STREAM_CACHE_CONFIG.warmCacheTTL,
      ),
      maxHotCacheSize: this.parseIntEnv(
        getEnvVar("MAX_HOT_CACHE_SIZE"),
        DEFAULT_STREAM_CACHE_CONFIG.maxHotCacheSize,
      ),
      streamBatchSize: this.parseIntEnv(
        getEnvVar("STREAM_BATCH_SIZE"),
        DEFAULT_STREAM_CACHE_CONFIG.streamBatchSize,
      ),
      connectionTimeout: this.parseIntEnv(
        getEnvVar("CONNECTION_TIMEOUT_MS"),
        DEFAULT_STREAM_CACHE_CONFIG.connectionTimeout,
      ),
      heartbeatInterval: this.parseIntEnv(
        getEnvVar("HEARTBEAT_INTERVAL_MS"),
        DEFAULT_STREAM_CACHE_CONFIG.heartbeatInterval,
      ),

      // 压缩配置
      compressionThreshold: this.parseIntEnv(
        getEnvVar("COMPRESSION_THRESHOLD_BYTES"),
        DEFAULT_STREAM_CACHE_CONFIG.compressionThreshold,
      ),
      compressionEnabled: this.parseBoolEnv(
        getEnvVar("COMPRESSION_ENABLED"),
        DEFAULT_STREAM_CACHE_CONFIG.compressionEnabled,
      ),
      compressionDataType: DEFAULT_STREAM_CACHE_CONFIG.compressionDataType,

      // 清理配置
      cleanupInterval: this.parseIntEnv(
        getEnvVar("CLEANUP_INTERVAL_MS"),
        DEFAULT_STREAM_CACHE_CONFIG.cleanupInterval,
      ),
      maxCleanupItems: this.parseIntEnv(
        getEnvVar("MAX_CLEANUP_ITEMS"),
        DEFAULT_STREAM_CACHE_CONFIG.maxCleanupItems,
      ),
      memoryCleanupThreshold: this.parseFloatEnv(
        getEnvVar("MEMORY_CLEANUP_THRESHOLD"),
        DEFAULT_STREAM_CACHE_CONFIG.memoryCleanupThreshold,
      ),

      // 性能监控配置
      slowOperationThreshold: this.parseIntEnv(
        getEnvVar("SLOW_OPERATION_THRESHOLD_MS"),
        DEFAULT_STREAM_CACHE_CONFIG.slowOperationThreshold,
      ),
      statsLogInterval: this.parseIntEnv(
        getEnvVar("STATS_LOG_INTERVAL_MS"),
        DEFAULT_STREAM_CACHE_CONFIG.statsLogInterval,
      ),
      performanceMonitoring: this.parseBoolEnv(
        getEnvVar("PERFORMANCE_MONITORING_ENABLED"),
        DEFAULT_STREAM_CACHE_CONFIG.performanceMonitoring,
      ),
      verboseLogging: this.parseBoolEnv(
        getEnvVar("VERBOSE_LOGGING_ENABLED"),
        DEFAULT_STREAM_CACHE_CONFIG.verboseLogging,
      ),

      // 错误处理配置
      maxRetryAttempts: this.parseIntEnv(
        getEnvVar("MAX_RETRY_ATTEMPTS"),
        DEFAULT_STREAM_CACHE_CONFIG.maxRetryAttempts,
      ),
      retryBaseDelay: this.parseIntEnv(
        getEnvVar("RETRY_BASE_DELAY_MS"),
        DEFAULT_STREAM_CACHE_CONFIG.retryBaseDelay,
      ),
      retryDelayMultiplier: this.parseFloatEnv(
        getEnvVar("RETRY_DELAY_MULTIPLIER"),
        DEFAULT_STREAM_CACHE_CONFIG.retryDelayMultiplier,
      ),
      enableFallback: this.parseBoolEnv(
        getEnvVar("ENABLE_FALLBACK"),
        DEFAULT_STREAM_CACHE_CONFIG.enableFallback,
      ),

      // 基础配置（从共享常量继承，支持环境变量覆盖）
      defaultTTL: this.parseIntEnv(
        getEnvVar("DEFAULT_TTL_SECONDS"),
        DEFAULT_STREAM_CACHE_CONFIG.defaultTTL,
      ),
      minTTL: this.parseIntEnv(
        getEnvVar("MIN_TTL_SECONDS"),
        DEFAULT_STREAM_CACHE_CONFIG.minTTL,
      ),
      maxTTL: this.parseIntEnv(
        getEnvVar("MAX_TTL_SECONDS"),
        DEFAULT_STREAM_CACHE_CONFIG.maxTTL,
      ),
      maxCacheSize: this.parseIntEnv(
        getEnvVar("MAX_HOT_CACHE_SIZE"), // 重用热缓存大小配置
        DEFAULT_STREAM_CACHE_CONFIG.maxCacheSize,
      ),
      maxBatchSize: this.parseIntEnv(
        getEnvVar("STREAM_BATCH_SIZE"), // 重用流批次大小配置
        DEFAULT_STREAM_CACHE_CONFIG.maxBatchSize,
      ),
    };

    // 配置验证
    const validationErrors = this.validateConfig(config);
    if (validationErrors.length > 0) {
      this.logger.error(
        `Stream Cache configuration validation failed:`,
        validationErrors,
      );
      throw new Error(
        `Stream Cache configuration validation failed: ${validationErrors.join(", ")}`,
      );
    }

    // 记录配置摘要
    this.logger.log(`Stream Cache configuration created successfully:`, {
      hotCacheTTL: config.hotCacheTTL,
      warmCacheTTL: config.warmCacheTTL,
      maxHotCacheSize: config.maxHotCacheSize,
      streamBatchSize: config.streamBatchSize,
      compressionEnabled: config.compressionEnabled,
      performanceMonitoring: config.performanceMonitoring,
    });

    return config;
  }

  /**
   * 解析整数型环境变量
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

    this.logger.debug(`Parsed ${key}: ${parsed}`);
    return parsed;
  }

  /**
   * 解析浮点数型环境变量
   */
  private static parseFloatEnv(
    key: string,
    defaultValue: number,
    min?: number,
    max?: number,
  ): number {
    const value = process.env[key];
    if (!value) {
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

    this.logger.debug(`Parsed ${key}: ${parsed}`);
    return parsed;
  }

  /**
   * 解析布尔型环境变量
   */
  private static parseBoolEnv(key: string, defaultValue: boolean): boolean {
    const value = process.env[key];
    if (!value) {
      return defaultValue;
    }

    const lowerValue = value.toLowerCase();
    const parsedValue =
      lowerValue === "true" || lowerValue === "1" || lowerValue === "yes";

    this.logger.debug(`Parsed ${key}: ${parsedValue}`);
    return parsedValue;
  }

  /**
   * 配置验证
   */
  private static validateConfig(config: any): string[] {
    const errors: string[] = [];

    // TTL 验证
    if (config.hotCacheTTL <= 0) {
      errors.push("hotCacheTTL must be positive");
    }
    if (config.warmCacheTTL <= 0) {
      errors.push("warmCacheTTL must be positive");
    }
    if (config.minTTL >= config.maxTTL) {
      errors.push("minTTL must be less than maxTTL");
    }

    // 大小验证
    if (config.maxHotCacheSize <= 0) {
      errors.push("maxHotCacheSize must be positive");
    }
    if (config.streamBatchSize <= 0) {
      errors.push("streamBatchSize must be positive");
    }

    // 超时验证
    if (config.connectionTimeout <= 0) {
      errors.push("connectionTimeout must be positive");
    }
    if (config.heartbeatInterval <= 0) {
      errors.push("heartbeatInterval must be positive");
    }

    // 阈值验证
    if (
      config.memoryCleanupThreshold < 0 ||
      config.memoryCleanupThreshold > 1
    ) {
      errors.push("memoryCleanupThreshold must be between 0 and 1");
    }

    // 重试配置验证
    if (config.maxRetryAttempts < 0) {
      errors.push("maxRetryAttempts must be non-negative");
    }
    if (config.retryBaseDelay <= 0) {
      errors.push("retryBaseDelay must be positive");
    }
    if (config.retryDelayMultiplier <= 0) {
      errors.push("retryDelayMultiplier must be positive");
    }

    return errors;
  }
}
import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import {
  SYMBOL_MAPPER_CACHE_ENV_VARS,
  SymbolMapperCacheEnvVarKey,
  getEnvVar,
} from "../constants/symbol-mapper-cache.env-vars.constants";
import { SYMBOL_MAPPER_CACHE_CONSTANTS } from "../constants/symbol-mapper-cache.constants";

/**
 * Symbol Mapper Cache 配置工厂类
 *
 * 核心功能：
 * - 环境变量驱动的配置生成，支持容器化部署
 * - 符号映射缓存特有配置的智能默认值
 * - 完整的配置验证和类型安全
 * - 与 basic-cache 共享常量的无缝集成
 * - 三层 LRU 缓存配置管理
 *
 * 支持的环境变量：
 * - SYMBOL_MAPPER_CACHE_*: 符号映射缓存特有配置
 * - CACHE_*: 共享配置（通过 basic-cache 常量映射）
 *
 * 使用场景：
 * - 符号映射规则缓存（L1: 提供商规则，L2: 单个映射，L3: 批量结果）
 * - 提供商特定规则缓存
 * - 批量映射结果缓存
 */
@Injectable()
export class SymbolMapperCacheConfigFactory {
  private static readonly logger = createLogger("SymbolMapperCacheConfigFactory");

  /**
   * 创建 Symbol Mapper Cache 配置实例
   * 基于环境变量和默认值生成优化的配置
   */
  static createConfig() {
    this.logger.log("Creating Symbol Mapper Cache configuration...");

    const config = {
      // TTL 配置 (秒)
      providerRulesTtl: this.parseIntEnv(
        getEnvVar("PROVIDER_RULES_TTL_SECONDS"),
        SYMBOL_MAPPER_CACHE_CONSTANTS.TTL.PROVIDER_RULES_TTL_S,
      ),
      symbolMappingTtl: this.parseIntEnv(
        getEnvVar("SYMBOL_MAPPING_TTL_SECONDS"),
        SYMBOL_MAPPER_CACHE_CONSTANTS.TTL.SYMBOL_MAPPING_TTL_S,
      ),
      batchResultTtl: this.parseIntEnv(
        getEnvVar("BATCH_RESULT_TTL_SECONDS"),
        SYMBOL_MAPPER_CACHE_CONSTANTS.TTL.BATCH_RESULT_TTL_S,
      ),

      // 批次配置
      defaultBatchSize: this.parseIntEnv(
        getEnvVar("DEFAULT_BATCH_SIZE"),
        SYMBOL_MAPPER_CACHE_CONSTANTS.BATCH.DEFAULT_BATCH_SIZE,
      ),
      lruSortBatchSize: this.parseIntEnv(
        getEnvVar("LRU_SORT_BATCH_SIZE"),
        SYMBOL_MAPPER_CACHE_CONSTANTS.BATCH.LRU_SORT_BATCH_SIZE,
      ),
      maxConcurrentOperations: this.parseIntEnv(
        getEnvVar("MAX_CONCURRENT_OPERATIONS"),
        SYMBOL_MAPPER_CACHE_CONSTANTS.BATCH.MAX_CONCURRENT_OPERATIONS,
      ),

      // 连接和重试配置 (毫秒)
      maxReconnectDelay: this.parseIntEnv(
        getEnvVar("MAX_RECONNECT_DELAY_MS"),
        SYMBOL_MAPPER_CACHE_CONSTANTS.CONNECTION.MAX_RECONNECT_DELAY_MS,
      ),
      baseRetryDelay: this.parseIntEnv(
        getEnvVar("BASE_RETRY_DELAY_MS"),
        SYMBOL_MAPPER_CACHE_CONSTANTS.CONNECTION.BASE_RETRY_DELAY_MS,
      ),
      connectionTimeout: this.parseIntEnv(
        getEnvVar("CONNECTION_TIMEOUT_MS"),
        SYMBOL_MAPPER_CACHE_CONSTANTS.CONNECTION.CONNECTION_TIMEOUT_MS,
      ),

      // 内存监控配置 (毫秒)
      memoryCheckInterval: this.parseIntEnv(
        getEnvVar("MEMORY_CHECK_INTERVAL_MS"),
        SYMBOL_MAPPER_CACHE_CONSTANTS.MEMORY.CHECK_INTERVAL_MS,
      ),
      memoryCleanupInterval: this.parseIntEnv(
        getEnvVar("MEMORY_CLEANUP_INTERVAL_MS"),
        SYMBOL_MAPPER_CACHE_CONSTANTS.MEMORY.CLEANUP_INTERVAL_MS,
      ),

      // LRU 缓存大小配置（三层架构）
      l1CacheSize: this.parseIntEnv(
        getEnvVar("L1_CACHE_SIZE"),
        100, // L1: 提供商规则缓存，默认 100 条规则
      ),
      l2CacheSize: this.parseIntEnv(
        getEnvVar("L2_CACHE_SIZE"),
        1000, // L2: 单个符号映射缓存，默认 1000 个映射
      ),
      l3CacheSize: this.parseIntEnv(
        getEnvVar("L3_CACHE_SIZE"),
        500, // L3: 批量结果缓存，默认 500 个批次结果
      ),

      // 性能监控配置
      slowOperationThreshold: this.parseIntEnv(
        getEnvVar("SLOW_OPERATION_THRESHOLD_MS"),
        100, // 默认 100ms 为慢操作阈值
      ),
      metricsCollectionEnabled: this.parseBoolEnv(
        getEnvVar("METRICS_COLLECTION_ENABLED"),
        true,
      ),
      performanceMonitoringEnabled: this.parseBoolEnv(
        getEnvVar("PERFORMANCE_MONITORING_ENABLED"),
        true,
      ),

      // 缓存键前缀
      cacheKeys: SYMBOL_MAPPER_CACHE_CONSTANTS.KEYS,

      // 事件类型
      events: SYMBOL_MAPPER_CACHE_CONSTANTS.EVENTS,
    };

    // 配置验证
    const validationErrors = this.validateConfig(config);
    if (validationErrors.length > 0) {
      this.logger.error(
        `Symbol Mapper Cache configuration validation failed:`,
        validationErrors,
      );
      throw new Error(
        `Symbol Mapper Cache configuration validation failed: ${validationErrors.join(", ")}`,
      );
    }

    // 记录配置摘要
    this.logger.log(`Symbol Mapper Cache configuration created successfully:`, {
      providerRulesTtl: config.providerRulesTtl,
      symbolMappingTtl: config.symbolMappingTtl,
      defaultBatchSize: config.defaultBatchSize,
      l1CacheSize: config.l1CacheSize,
      l2CacheSize: config.l2CacheSize,
      l3CacheSize: config.l3CacheSize,
      performanceMonitoringEnabled: config.performanceMonitoringEnabled,
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
    if (config.providerRulesTtl <= 0) {
      errors.push("providerRulesTtl must be positive");
    }
    if (config.symbolMappingTtl <= 0) {
      errors.push("symbolMappingTtl must be positive");
    }
    if (config.batchResultTtl <= 0) {
      errors.push("batchResultTtl must be positive");
    }

    // 批次配置验证
    if (config.defaultBatchSize <= 0) {
      errors.push("defaultBatchSize must be positive");
    }
    if (config.lruSortBatchSize <= 0) {
      errors.push("lruSortBatchSize must be positive");
    }
    if (config.maxConcurrentOperations <= 0) {
      errors.push("maxConcurrentOperations must be positive");
    }

    // 连接配置验证
    if (config.maxReconnectDelay <= 0) {
      errors.push("maxReconnectDelay must be positive");
    }
    if (config.baseRetryDelay <= 0) {
      errors.push("baseRetryDelay must be positive");
    }
    if (config.connectionTimeout <= 0) {
      errors.push("connectionTimeout must be positive");
    }

    // 内存监控配置验证
    if (config.memoryCheckInterval <= 0) {
      errors.push("memoryCheckInterval must be positive");
    }
    if (config.memoryCleanupInterval <= 0) {
      errors.push("memoryCleanupInterval must be positive");
    }

    // LRU 缓存大小验证
    if (config.l1CacheSize <= 0) {
      errors.push("l1CacheSize must be positive");
    }
    if (config.l2CacheSize <= 0) {
      errors.push("l2CacheSize must be positive");
    }
    if (config.l3CacheSize <= 0) {
      errors.push("l3CacheSize must be positive");
    }

    // 性能配置验证
    if (config.slowOperationThreshold <= 0) {
      errors.push("slowOperationThreshold must be positive");
    }

    // 逻辑关系验证
    if (config.l1CacheSize > config.l2CacheSize) {
      errors.push("l1CacheSize should not exceed l2CacheSize (L1 should be smallest)");
    }
    if (config.defaultBatchSize > config.l3CacheSize) {
      errors.push("defaultBatchSize should not exceed l3CacheSize");
    }
    if (config.maxConcurrentOperations > 50) {
      errors.push("maxConcurrentOperations should not exceed 50 for performance reasons");
    }

    return errors;
  }

  /**
   * 获取当前生效的环境变量（用于调试）
   */
  static getCurrentEnvVars(): Record<string, string | undefined> {
    const envKeys = Object.values(SYMBOL_MAPPER_CACHE_ENV_VARS);
    const result: Record<string, string | undefined> = {};

    envKeys.forEach((key) => {
      result[key] = process.env[key];
    });

    return result;
  }
}
import { Injectable } from "@nestjs/common";
import { createLogger } from "@common/logging/index";
import {
  DATA_MAPPER_CACHE_ENV_VARS,
  DataMapperCacheEnvVarKey,
  getEnvVar,
} from "../constants/data-mapper-cache.env-vars.constants";
import { DATA_MAPPER_CACHE_CONSTANTS } from "../constants/data-mapper-cache.constants";

/**
 * Data Mapper Cache 配置工厂类
 *
 * 核心功能：
 * - 环境变量驱动的配置生成，支持容器化部署
 * - 数据映射缓存特有配置的智能默认值
 * - 完整的配置验证和类型安全
 * - 与 basic-cache 共享常量的无缝集成
 *
 * 支持的环境变量：
 * - DATA_MAPPER_CACHE_*: 数据映射缓存特有配置
 * - CACHE_*: 共享配置（通过 basic-cache 常量映射）
 *
 * 使用场景：
 * - 数据映射规则缓存
 * - 提供商规则缓存
 * - 映射统计信息缓存
 */
@Injectable()
export class DataMapperCacheConfigFactory {
  private static readonly logger = createLogger("DataMapperCacheConfigFactory");

  /**
   * 创建 Data Mapper Cache 配置实例
   * 基于环境变量和默认值生成优化的配置
   */
  static createConfig() {
    this.logger.log("Creating Data Mapper Cache configuration...");

    const config = {
      // TTL 配置 (秒)
      bestRuleTtl: this.parseIntEnv(
        getEnvVar("BEST_RULE_TTL_SECONDS"),
        DATA_MAPPER_CACHE_CONSTANTS.TTL.BEST_RULE,
      ),
      ruleByIdTtl: this.parseIntEnv(
        getEnvVar("RULE_BY_ID_TTL_SECONDS"),
        DATA_MAPPER_CACHE_CONSTANTS.TTL.RULE_BY_ID,
      ),
      providerRulesTtl: this.parseIntEnv(
        getEnvVar("PROVIDER_RULES_TTL_SECONDS"),
        DATA_MAPPER_CACHE_CONSTANTS.TTL.PROVIDER_RULES,
      ),
      ruleStatsTtl: this.parseIntEnv(
        getEnvVar("RULE_STATS_TTL_SECONDS"),
        DATA_MAPPER_CACHE_CONSTANTS.TTL.RULE_STATS,
      ),

      // 性能配置
      slowOperationThreshold: this.parseIntEnv(
        getEnvVar("SLOW_OPERATION_THRESHOLD_MS"),
        DATA_MAPPER_CACHE_CONSTANTS.PERFORMANCE.SLOW_OPERATION_MS,
      ),
      maxBatchSize: this.parseIntEnv(
        getEnvVar("MAX_BATCH_SIZE"),
        DATA_MAPPER_CACHE_CONSTANTS.PERFORMANCE.MAX_BATCH_SIZE,
      ),
      statsCleanupInterval: this.parseIntEnv(
        getEnvVar("STATS_CLEANUP_INTERVAL_MS"),
        DATA_MAPPER_CACHE_CONSTANTS.PERFORMANCE.STATS_CLEANUP_INTERVAL_MS,
      ),

      // 操作超时配置 (毫秒)
      defaultScanTimeout: this.parseIntEnv(
        getEnvVar("DEFAULT_SCAN_TIMEOUT_MS"),
        DATA_MAPPER_CACHE_CONSTANTS.OPERATION_TIMEOUTS.DEFAULT_SCAN_MS,
      ),
      providerInvalidateTimeout: this.parseIntEnv(
        getEnvVar("PROVIDER_INVALIDATE_TIMEOUT_MS"),
        DATA_MAPPER_CACHE_CONSTANTS.OPERATION_TIMEOUTS.PROVIDER_INVALIDATE_MS,
      ),
      statsScanTimeout: this.parseIntEnv(
        getEnvVar("STATS_SCAN_TIMEOUT_MS"),
        DATA_MAPPER_CACHE_CONSTANTS.OPERATION_TIMEOUTS.STATS_SCAN_MS,
      ),
      clearAllTimeout: this.parseIntEnv(
        getEnvVar("CLEAR_ALL_TIMEOUT_MS"),
        DATA_MAPPER_CACHE_CONSTANTS.OPERATION_TIMEOUTS.CLEAR_ALL_MS,
      ),

      // 批处理操作配置
      redisScanCount: this.parseIntEnv(
        getEnvVar("REDIS_SCAN_COUNT"),
        DATA_MAPPER_CACHE_CONSTANTS.BATCH_OPERATIONS.REDIS_SCAN_COUNT,
      ),
      deleteBatchSize: this.parseIntEnv(
        getEnvVar("DELETE_BATCH_SIZE"),
        DATA_MAPPER_CACHE_CONSTANTS.BATCH_OPERATIONS.DELETE_BATCH_SIZE,
      ),
      maxKeysPrevention: this.parseIntEnv(
        getEnvVar("MAX_KEYS_PREVENTION"),
        DATA_MAPPER_CACHE_CONSTANTS.BATCH_OPERATIONS.MAX_KEYS_PREVENTION,
      ),
      interBatchDelay: this.parseIntEnv(
        getEnvVar("INTER_BATCH_DELAY_MS"),
        DATA_MAPPER_CACHE_CONSTANTS.BATCH_OPERATIONS.INTER_BATCH_DELAY_MS,
      ),

      // 大小限制配置
      maxKeyLength: this.parseIntEnv(
        getEnvVar("MAX_KEY_LENGTH"),
        DATA_MAPPER_CACHE_CONSTANTS.SIZE_LIMITS.MAX_KEY_LENGTH,
      ),
      maxRuleSizeKb: this.parseIntEnv(
        getEnvVar("MAX_RULE_SIZE_KB"),
        DATA_MAPPER_CACHE_CONSTANTS.SIZE_LIMITS.MAX_RULE_SIZE_KB,
      ),

      // 缓存键前缀
      cacheKeys: DATA_MAPPER_CACHE_CONSTANTS.CACHE_KEYS,

      // 错误和成功消息
      errorMessages: DATA_MAPPER_CACHE_CONSTANTS.ERROR_MESSAGES,
      successMessages: DATA_MAPPER_CACHE_CONSTANTS.SUCCESS_MESSAGES,
    };

    // 配置验证
    const validationErrors = this.validateConfig(config);
    if (validationErrors.length > 0) {
      this.logger.error(
        `Data Mapper Cache configuration validation failed:`,
        validationErrors,
      );
      throw new Error(
        `Data Mapper Cache configuration validation failed: ${validationErrors.join(", ")}`,
      );
    }

    // 记录配置摘要
    this.logger.log(`Data Mapper Cache configuration created successfully:`, {
      bestRuleTtl: config.bestRuleTtl,
      providerRulesTtl: config.providerRulesTtl,
      maxBatchSize: config.maxBatchSize,
      slowOperationThreshold: config.slowOperationThreshold,
      maxKeyLength: config.maxKeyLength,
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
   * 配置验证
   */
  private static validateConfig(config: any): string[] {
    const errors: string[] = [];

    // TTL 验证
    if (config.bestRuleTtl <= 0) {
      errors.push("bestRuleTtl must be positive");
    }
    if (config.ruleByIdTtl <= 0) {
      errors.push("ruleByIdTtl must be positive");
    }
    if (config.providerRulesTtl <= 0) {
      errors.push("providerRulesTtl must be positive");
    }
    if (config.ruleStatsTtl <= 0) {
      errors.push("ruleStatsTtl must be positive");
    }

    // 性能配置验证
    if (config.slowOperationThreshold <= 0) {
      errors.push("slowOperationThreshold must be positive");
    }
    if (config.maxBatchSize <= 0) {
      errors.push("maxBatchSize must be positive");
    }
    if (config.statsCleanupInterval <= 0) {
      errors.push("statsCleanupInterval must be positive");
    }

    // 超时配置验证
    if (config.defaultScanTimeout <= 0) {
      errors.push("defaultScanTimeout must be positive");
    }
    if (config.providerInvalidateTimeout <= 0) {
      errors.push("providerInvalidateTimeout must be positive");
    }
    if (config.statsScanTimeout <= 0) {
      errors.push("statsScanTimeout must be positive");
    }
    if (config.clearAllTimeout <= 0) {
      errors.push("clearAllTimeout must be positive");
    }

    // 批处理配置验证
    if (config.redisScanCount <= 0) {
      errors.push("redisScanCount must be positive");
    }
    if (config.deleteBatchSize <= 0) {
      errors.push("deleteBatchSize must be positive");
    }
    if (config.maxKeysPrevention <= 0) {
      errors.push("maxKeysPrevention must be positive");
    }
    if (config.interBatchDelay < 0) {
      errors.push("interBatchDelay must be non-negative");
    }

    // 大小限制验证
    if (config.maxKeyLength <= 0) {
      errors.push("maxKeyLength must be positive");
    }
    if (config.maxRuleSizeKb <= 0) {
      errors.push("maxRuleSizeKb must be positive");
    }

    // 逻辑关系验证
    if (config.maxBatchSize > config.maxKeysPrevention) {
      errors.push("maxBatchSize should not exceed maxKeysPrevention");
    }

    return errors;
  }
}
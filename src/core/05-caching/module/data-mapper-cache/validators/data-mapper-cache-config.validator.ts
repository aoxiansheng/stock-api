import { createLogger } from "@common/logging/index";
import { ValidationSubResult } from "../../../foundation/types/validation.types";

/**
 * Data Mapper Cache 配置验证器
 *
 * 提供独立的配置验证功能，专门针对数据映射缓存的特定需求：
 * - 运行时配置验证
 * - 数据映射规则缓存配置检查
 * - 提供商规则缓存配置验证
 * - 批处理操作配置合规性检查
 */
export class DataMapperCacheConfigValidator {
  private static readonly logger = createLogger("DataMapperCacheConfigValidator");

  /**
   * 验证完整的 Data Mapper Cache 配置
   * @param config 配置对象
   * @returns 验证结果，包含错误和警告信息
   */
  static validateConfig(config: any): DataMapperCacheValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基础配置验证
    const basicValidation = this.validateBasicConfig(config);
    errors.push(...basicValidation.errors);
    warnings.push(...basicValidation.warnings);

    // TTL 配置验证
    const ttlValidation = this.validateTtlConfig(config);
    errors.push(...ttlValidation.errors);
    warnings.push(...ttlValidation.warnings);

    // 性能配置验证
    const performanceValidation = this.validatePerformanceConfig(config);
    errors.push(...performanceValidation.errors);
    warnings.push(...performanceValidation.warnings);

    // 超时配置验证
    const timeoutValidation = this.validateTimeoutConfig(config);
    errors.push(...timeoutValidation.errors);
    warnings.push(...timeoutValidation.warnings);

    // 批处理配置验证
    const batchValidation = this.validateBatchConfig(config);
    errors.push(...batchValidation.errors);
    warnings.push(...batchValidation.warnings);

    // 大小限制配置验证
    const sizeValidation = this.validateSizeLimitsConfig(config);
    errors.push(...sizeValidation.errors);
    warnings.push(...sizeValidation.warnings);

    // 逻辑一致性验证
    const consistencyValidation = this.validateLogicalConsistency(config);
    errors.push(...consistencyValidation.errors);
    warnings.push(...consistencyValidation.warnings);

    const isValid = errors.length === 0;
    const result: DataMapperCacheValidationResult = {
      isValid,
      errors,
      warnings,
      summary: this.generateValidationSummary(config, isValid, errors.length, warnings.length),
    };

    // 记录验证结果
    if (!isValid) {
      this.logger.error("Data Mapper Cache configuration validation failed", {
        errors,
        warnings,
        config: this.sanitizeConfigForLogging(config),
      });
    } else if (warnings.length > 0) {
      this.logger.warn("Data Mapper Cache configuration validation completed with warnings", {
        warnings,
        config: this.sanitizeConfigForLogging(config),
      });
    } else {
      this.logger.debug("Data Mapper Cache configuration validation passed", {
        config: this.sanitizeConfigForLogging(config),
      });
    }

    return result;
  }

  /**
   * 验证基础配置
   */
  private static validateBasicConfig(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config) {
      errors.push("Configuration object is null or undefined");
      return { errors, warnings };
    }

    // 检查必需字段
    const requiredFields = [
      "bestRuleTtl",
      "ruleByIdTtl",
      "providerRulesTtl",
      "ruleStatsTtl",
      "slowOperationThreshold",
      "maxBatchSize",
    ];

    for (const field of requiredFields) {
      if (config[field] === undefined || config[field] === null) {
        errors.push(`Required field '${field}' is missing or null`);
      }
    }

    // 检查缓存键配置
    if (!config.cacheKeys || typeof config.cacheKeys !== "object") {
      warnings.push("cacheKeys configuration is missing or invalid");
    }

    return { errors, warnings };
  }

  /**
   * 验证 TTL 配置
   */
  private static validateTtlConfig(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基础检查：如果config为null或undefined，直接返回
    if (!config) {
      return { errors, warnings };
    }

    // 最佳规则 TTL 验证
    if (typeof config.bestRuleTtl !== "number" || config.bestRuleTtl <= 0) {
      errors.push("bestRuleTtl must be a positive number");
    } else if (config.bestRuleTtl > 3600) {
      warnings.push("bestRuleTtl > 1 hour may be too long for dynamic mapping rules");
    } else if (config.bestRuleTtl < 60) {
      warnings.push("bestRuleTtl < 1 minute may cause excessive cache invalidation");
    }

    // 规则按ID缓存 TTL 验证
    if (typeof config.ruleByIdTtl !== "number" || config.ruleByIdTtl <= 0) {
      errors.push("ruleByIdTtl must be a positive number");
    } else if (config.ruleByIdTtl > 3600) {
      warnings.push("ruleByIdTtl > 1 hour may be too long for individual rules");
    }

    // 提供商规则 TTL 验证
    if (typeof config.providerRulesTtl !== "number" || config.providerRulesTtl <= 0) {
      errors.push("providerRulesTtl must be a positive number");
    } else if (config.providerRulesTtl > 1800) {
      warnings.push("providerRulesTtl > 30 minutes may be too long for provider-specific rules");
    } else if (config.providerRulesTtl < 30) {
      warnings.push("providerRulesTtl < 30 seconds may cause frequent provider rule reloading");
    }

    // 规则统计 TTL 验证
    if (typeof config.ruleStatsTtl !== "number" || config.ruleStatsTtl <= 0) {
      errors.push("ruleStatsTtl must be a positive number");
    } else if (config.ruleStatsTtl > 1800) {
      warnings.push("ruleStatsTtl > 30 minutes may provide stale statistics");
    }

    // TTL 逻辑关系验证
    if (config.bestRuleTtl && config.ruleByIdTtl && config.providerRulesTtl) {
      // 提供商规则 TTL 应该是最短的，因为它们变化最频繁
      if (config.providerRulesTtl > config.bestRuleTtl) {
        warnings.push("providerRulesTtl should not exceed bestRuleTtl for consistency");
      }

      if (config.providerRulesTtl > config.ruleByIdTtl) {
        warnings.push("providerRulesTtl should not exceed ruleByIdTtl for consistency");
      }
    }

    return { errors, warnings };
  }

  /**
   * 验证性能配置
   */
  private static validatePerformanceConfig(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基础检查：如果config为null或undefined，直接返回
    if (!config) {
      return { errors, warnings };
    }

    // 慢操作阈值验证
    if (typeof config.slowOperationThreshold !== "number" || config.slowOperationThreshold <= 0) {
      errors.push("slowOperationThreshold must be a positive number");
    } else if (config.slowOperationThreshold > 1000) {
      warnings.push("slowOperationThreshold > 1000ms may be too high for data mapping operations");
    } else if (config.slowOperationThreshold < 10) {
      warnings.push("slowOperationThreshold < 10ms may generate too many slow operation alerts");
    }

    // 最大批处理大小验证
    if (typeof config.maxBatchSize !== "number" || config.maxBatchSize <= 0) {
      errors.push("maxBatchSize must be a positive number");
    } else if (config.maxBatchSize > 500) {
      warnings.push("maxBatchSize > 500 may cause memory issues during batch processing");
    } else if (config.maxBatchSize < 10) {
      warnings.push("maxBatchSize < 10 may result in inefficient batch processing");
    }

    // 统计清理间隔验证
    if (config.statsCleanupInterval !== undefined) {
      if (typeof config.statsCleanupInterval !== "number" || config.statsCleanupInterval <= 0) {
        errors.push("statsCleanupInterval must be a positive number");
      } else if (config.statsCleanupInterval < 60000) {
        warnings.push("statsCleanupInterval < 1 minute may cause frequent cleanup operations");
      }
    }

    return { errors, warnings };
  }

  /**
   * 验证超时配置
   */
  private static validateTimeoutConfig(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基础检查：如果config为null或undefined，直接返回
    if (!config) {
      return { errors, warnings };
    }

    const timeoutFields = [
      { name: "defaultScanTimeout", max: 30000, min: 1000 },
      { name: "providerInvalidateTimeout", max: 10000, min: 500 },
      { name: "statsScanTimeout", max: 5000, min: 500 },
      { name: "clearAllTimeout", max: 60000, min: 1000 },
    ];

    for (const field of timeoutFields) {
      const value = config[field.name];
      if (value !== undefined) {
        if (typeof value !== "number" || value <= 0) {
          errors.push(`${field.name} must be a positive number`);
        } else {
          if (value > field.max) {
            warnings.push(`${field.name} > ${field.max}ms may be too long`);
          }
          if (value < field.min) {
            warnings.push(`${field.name} < ${field.min}ms may be too short`);
          }
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * 验证批处理配置
   */
  private static validateBatchConfig(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基础检查：如果config为null或undefined，直接返回
    if (!config) {
      return { errors, warnings };
    }

    // Redis 扫描批次验证
    if (config.redisScanCount !== undefined) {
      if (typeof config.redisScanCount !== "number" || config.redisScanCount <= 0) {
        errors.push("redisScanCount must be a positive number");
      } else if (config.redisScanCount > 10000) {
        warnings.push("redisScanCount > 10000 may cause performance issues");
      } else if (config.redisScanCount < 10) {
        warnings.push("redisScanCount < 10 may result in too many Redis round trips");
      }
    }

    // 删除批次大小验证
    if (config.deleteBatchSize !== undefined) {
      if (typeof config.deleteBatchSize !== "number" || config.deleteBatchSize <= 0) {
        errors.push("deleteBatchSize must be a positive number");
      } else if (config.deleteBatchSize > 1000) {
        warnings.push("deleteBatchSize > 1000 may cause memory issues");
      }
    }

    // 最大键防护验证
    if (config.maxKeysPrevention !== undefined) {
      if (typeof config.maxKeysPrevention !== "number" || config.maxKeysPrevention <= 0) {
        errors.push("maxKeysPrevention must be a positive number");
      } else if (config.maxKeysPrevention < 1000) {
        warnings.push("maxKeysPrevention < 1000 may be too restrictive");
      }
    }

    // 批次间延迟验证
    if (config.interBatchDelay !== undefined) {
      if (typeof config.interBatchDelay !== "number" || config.interBatchDelay < 0) {
        errors.push("interBatchDelay must be a non-negative number");
      } else if (config.interBatchDelay > 1000) {
        warnings.push("interBatchDelay > 1000ms may slow down batch operations significantly");
      }
    }

    return { errors, warnings };
  }

  /**
   * 验证大小限制配置
   */
  private static validateSizeLimitsConfig(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基础检查：如果config为null或undefined，直接返回
    if (!config) {
      return { errors, warnings };
    }

    // 最大键长度验证
    if (config.maxKeyLength !== undefined) {
      if (typeof config.maxKeyLength !== "number" || config.maxKeyLength <= 0) {
        errors.push("maxKeyLength must be a positive number");
      } else if (config.maxKeyLength > 512) {
        warnings.push("maxKeyLength > 512 may cause Redis key issues");
      } else if (config.maxKeyLength < 50) {
        warnings.push("maxKeyLength < 50 may be too restrictive for mapping rules");
      }
    }

    // 最大规则大小验证
    if (config.maxRuleSizeKb !== undefined) {
      if (typeof config.maxRuleSizeKb !== "number" || config.maxRuleSizeKb <= 0) {
        errors.push("maxRuleSizeKb must be a positive number");
      } else if (config.maxRuleSizeKb > 100) {
        warnings.push("maxRuleSizeKb > 100KB may indicate overly complex mapping rules");
      } else if (config.maxRuleSizeKb < 1) {
        warnings.push("maxRuleSizeKb < 1KB may be too restrictive for complex rules");
      }
    }

    return { errors, warnings };
  }

  /**
   * 验证逻辑一致性
   */
  private static validateLogicalConsistency(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基础检查：如果config为null或undefined，直接返回
    if (!config) {
      return { errors, warnings };
    }

    // 批处理大小不应超过最大键防护限制
    if (config.maxBatchSize && config.maxKeysPrevention) {
      if (config.maxBatchSize > config.maxKeysPrevention) {
        errors.push("maxBatchSize should not exceed maxKeysPrevention");
      }
    }

    // 删除批次大小不应超过最大批处理大小
    if (config.deleteBatchSize && config.maxBatchSize) {
      if (config.deleteBatchSize > config.maxBatchSize) {
        warnings.push("deleteBatchSize should not exceed maxBatchSize");
      }
    }

    // Redis 扫描批次应该合理
    if (config.redisScanCount && config.maxBatchSize) {
      if (config.redisScanCount > config.maxBatchSize * 10) {
        warnings.push("redisScanCount seems disproportionately large compared to maxBatchSize");
      }
    }

    // 超时配置的逻辑关系
    if (config.defaultScanTimeout && config.clearAllTimeout) {
      if (config.defaultScanTimeout > config.clearAllTimeout) {
        warnings.push("defaultScanTimeout should not exceed clearAllTimeout");
      }
    }

    // TTL 和超时的关系
    if (config.bestRuleTtl && config.defaultScanTimeout) {
      const ttlMs = config.bestRuleTtl * 1000;
      if (config.defaultScanTimeout > ttlMs / 2) {
        warnings.push("defaultScanTimeout should be much less than bestRuleTtl to ensure cache effectiveness");
      }
    }

    return { errors, warnings };
  }

  /**
   * 生成验证摘要
   */
  private static generateValidationSummary(
    config: any,
    isValid: boolean,
    errorCount: number,
    warningCount: number,
  ): string {
    const status = isValid ? "PASSED" : "FAILED";
    const ruleCount = config?.maxBatchSize || "unknown";

    return `Data Mapper Cache (max batch: ${ruleCount}) configuration validation ${status}: ${errorCount} errors, ${warningCount} warnings`;
  }

  /**
   * 清理配置用于日志记录（移除敏感信息）
   */
  private static sanitizeConfigForLogging(config: any): any {
    if (!config) return null;

    // 创建配置的副本，移除或遮蔽敏感信息
    const sanitized = { ...config };

    // 移除可能包含敏感信息的字段
    delete sanitized.connectionString;
    delete sanitized.apiKey;
    delete sanitized.secret;
    delete sanitized.providerCredentials;

    // 移除完整的错误和成功消息对象（可能包含敏感信息）
    if (sanitized.errorMessages) {
      sanitized.errorMessages = "[REDACTED]";
    }
    if (sanitized.successMessages) {
      sanitized.successMessages = "[REDACTED]";
    }

    return sanitized;
  }

  /**
   * 快速验证（仅返回是否有效）
   */
  static isValidConfig(config: any): boolean {
    const result = this.validateConfig(config);
    return result.isValid;
  }

  /**
   * 验证特定字段
   */
  static validateField(fieldName: string, value: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (fieldName) {
      case "bestRuleTtl":
        if (typeof value !== "number" || value <= 0) {
          errors.push("bestRuleTtl must be a positive number");
        } else if (value > 3600) {
          warnings.push("bestRuleTtl > 1 hour may be too long for dynamic mapping rules");
        }
        break;

      case "providerRulesTtl":
        if (typeof value !== "number" || value <= 0) {
          errors.push("providerRulesTtl must be a positive number");
        } else if (value > 1800) {
          warnings.push("providerRulesTtl > 30 minutes may be too long for provider-specific rules");
        }
        break;

      case "maxBatchSize":
        if (typeof value !== "number" || value <= 0) {
          errors.push("maxBatchSize must be a positive number");
        } else if (value > 500) {
          warnings.push("maxBatchSize > 500 may cause memory issues during batch processing");
        }
        break;

      default:
        warnings.push(`Unknown field '${fieldName}' - validation skipped`);
    }

    return { errors, warnings };
  }
}

/**
 * 验证结果接口
 */
export interface DataMapperCacheValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: string;
}

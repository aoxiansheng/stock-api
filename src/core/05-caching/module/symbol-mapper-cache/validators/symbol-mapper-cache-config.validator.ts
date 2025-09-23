import { createLogger } from "@common/logging/index";

/**
 * Symbol Mapper Cache 配置验证器
 *
 * 提供独立的配置验证功能，专门针对符号映射缓存的特定需求：
 * - 三层 LRU 缓存架构配置验证
 * - 符号映射规则配置检查
 * - 批量映射处理配置验证
 * - 内存管理和性能监控配置合规性检查
 */
export class SymbolMapperCacheConfigValidator {
  private static readonly logger = createLogger("SymbolMapperCacheConfigValidator");

  /**
   * 验证完整的 Symbol Mapper Cache 配置
   * @param config 配置对象
   * @returns 验证结果，包含错误和警告信息
   */
  static validateConfig(config: any): SymbolMapperCacheValidationResult {
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

    // LRU 缓存层配置验证
    const lruValidation = this.validateLruCacheConfig(config);
    errors.push(...lruValidation.errors);
    warnings.push(...lruValidation.warnings);

    // 批处理配置验证
    const batchValidation = this.validateBatchConfig(config);
    errors.push(...batchValidation.errors);
    warnings.push(...batchValidation.warnings);

    // 连接和重试配置验证
    const connectionValidation = this.validateConnectionConfig(config);
    errors.push(...connectionValidation.errors);
    warnings.push(...connectionValidation.warnings);

    // 内存监控配置验证
    const memoryValidation = this.validateMemoryConfig(config);
    errors.push(...memoryValidation.errors);
    warnings.push(...memoryValidation.warnings);

    // 性能监控配置验证
    const performanceValidation = this.validatePerformanceConfig(config);
    errors.push(...performanceValidation.errors);
    warnings.push(...performanceValidation.warnings);

    // 逻辑一致性验证
    const consistencyValidation = this.validateLogicalConsistency(config);
    errors.push(...consistencyValidation.errors);
    warnings.push(...consistencyValidation.warnings);

    const isValid = errors.length === 0;
    const result: SymbolMapperCacheValidationResult = {
      isValid,
      errors,
      warnings,
      summary: this.generateValidationSummary(config, isValid, errors.length, warnings.length),
    };

    // 记录验证结果
    if (!isValid) {
      this.logger.error("Symbol Mapper Cache configuration validation failed", {
        errors,
        warnings,
        config: this.sanitizeConfigForLogging(config),
      });
    } else if (warnings.length > 0) {
      this.logger.warn("Symbol Mapper Cache configuration validation completed with warnings", {
        warnings,
        config: this.sanitizeConfigForLogging(config),
      });
    } else {
      this.logger.debug("Symbol Mapper Cache configuration validation passed", {
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
      "providerRulesTtl",
      "symbolMappingTtl",
      "batchResultTtl",
      "defaultBatchSize",
      "l1CacheSize",
      "l2CacheSize",
      "l3CacheSize",
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

    // 检查事件配置
    if (!config.events || typeof config.events !== "object") {
      warnings.push("events configuration is missing or invalid");
    }

    return { errors, warnings };
  }

  /**
   * 验证 TTL 配置
   */
  private static validateTtlConfig(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 提供商规则 TTL 验证
    if (typeof config.providerRulesTtl !== "number" || config.providerRulesTtl <= 0) {
      errors.push("providerRulesTtl must be a positive number");
    } else if (config.providerRulesTtl > 3600) {
      warnings.push("providerRulesTtl > 1 hour may be too long for dynamic provider rules");
    } else if (config.providerRulesTtl < 60) {
      warnings.push("providerRulesTtl < 1 minute may cause excessive rule reloading");
    }

    // 符号映射 TTL 验证
    if (typeof config.symbolMappingTtl !== "number" || config.symbolMappingTtl <= 0) {
      errors.push("symbolMappingTtl must be a positive number");
    } else if (config.symbolMappingTtl > 3600) {
      warnings.push("symbolMappingTtl > 1 hour may be too long for symbol mappings");
    } else if (config.symbolMappingTtl < 60) {
      warnings.push("symbolMappingTtl < 1 minute may cause frequent mapping refreshes");
    }

    // 批量结果 TTL 验证
    if (typeof config.batchResultTtl !== "number" || config.batchResultTtl <= 0) {
      errors.push("batchResultTtl must be a positive number");
    } else if (config.batchResultTtl > 1800) {
      warnings.push("batchResultTtl > 30 minutes may provide stale batch results");
    } else if (config.batchResultTtl < 30) {
      warnings.push("batchResultTtl < 30 seconds may cause inefficient batch caching");
    }

    // TTL 逻辑关系验证
    if (config.providerRulesTtl && config.symbolMappingTtl && config.batchResultTtl) {
      // 提供商规则 TTL 应该是最长的，因为它们变化相对较少
      if (config.providerRulesTtl < config.symbolMappingTtl) {
        warnings.push("providerRulesTtl should typically be longer than symbolMappingTtl");
      }

      // 批量结果 TTL 通常应该比单个映射 TTL 短，因为批量结果可能包含多个符号
      if (config.batchResultTtl > config.symbolMappingTtl) {
        warnings.push("batchResultTtl should typically be shorter than symbolMappingTtl for freshness");
      }
    }

    return { errors, warnings };
  }

  /**
   * 验证 LRU 缓存层配置
   */
  private static validateLruCacheConfig(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // L1 缓存大小验证（提供商规则）
    if (typeof config.l1CacheSize !== "number" || config.l1CacheSize <= 0) {
      errors.push("l1CacheSize must be a positive number");
    } else if (config.l1CacheSize > 1000) {
      warnings.push("l1CacheSize > 1000 may be unnecessarily large for provider rules");
    } else if (config.l1CacheSize < 10) {
      warnings.push("l1CacheSize < 10 may be too small for effective caching");
    }

    // L2 缓存大小验证（单个符号映射）
    if (typeof config.l2CacheSize !== "number" || config.l2CacheSize <= 0) {
      errors.push("l2CacheSize must be a positive number");
    } else if (config.l2CacheSize > 10000) {
      warnings.push("l2CacheSize > 10000 may consume excessive memory");
    } else if (config.l2CacheSize < 100) {
      warnings.push("l2CacheSize < 100 may be too small for symbol mappings");
    }

    // L3 缓存大小验证（批量结果）
    if (typeof config.l3CacheSize !== "number" || config.l3CacheSize <= 0) {
      errors.push("l3CacheSize must be a positive number");
    } else if (config.l3CacheSize > 5000) {
      warnings.push("l3CacheSize > 5000 may be unnecessarily large for batch results");
    } else if (config.l3CacheSize < 50) {
      warnings.push("l3CacheSize < 50 may be too small for batch result caching");
    }

    // LRU 层级关系验证
    if (config.l1CacheSize && config.l2CacheSize && config.l3CacheSize) {
      // L1 应该是最小的（提供商规则数量相对较少）
      if (config.l1CacheSize > config.l2CacheSize) {
        errors.push("l1CacheSize should not exceed l2CacheSize (L1 is for provider rules)");
      }

      // L2 应该是最大的（单个符号映射是最频繁的）
      if (config.l2CacheSize < config.l3CacheSize) {
        warnings.push("l2CacheSize should typically be larger than l3CacheSize for optimal performance");
      }

      // 总内存使用量警告
      const totalCacheItems = config.l1CacheSize + config.l2CacheSize + config.l3CacheSize;
      if (totalCacheItems > 15000) {
        warnings.push(`Total cache items (${totalCacheItems}) may consume significant memory`);
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

    // 默认批次大小验证
    if (typeof config.defaultBatchSize !== "number" || config.defaultBatchSize <= 0) {
      errors.push("defaultBatchSize must be a positive number");
    } else if (config.defaultBatchSize > 1000) {
      warnings.push("defaultBatchSize > 1000 may cause performance issues");
    } else if (config.defaultBatchSize < 10) {
      warnings.push("defaultBatchSize < 10 may result in inefficient batch processing");
    }

    // LRU 排序批次大小验证
    if (config.lruSortBatchSize !== undefined) {
      if (typeof config.lruSortBatchSize !== "number" || config.lruSortBatchSize <= 0) {
        errors.push("lruSortBatchSize must be a positive number");
      } else if (config.lruSortBatchSize > 5000) {
        warnings.push("lruSortBatchSize > 5000 may cause memory issues during sorting");
      } else if (config.lruSortBatchSize < 100) {
        warnings.push("lruSortBatchSize < 100 may result in frequent sort operations");
      }
    }

    // 最大并发操作验证
    if (config.maxConcurrentOperations !== undefined) {
      if (typeof config.maxConcurrentOperations !== "number" || config.maxConcurrentOperations <= 0) {
        errors.push("maxConcurrentOperations must be a positive number");
      } else if (config.maxConcurrentOperations > 50) {
        warnings.push("maxConcurrentOperations > 50 may overwhelm the system");
      } else if (config.maxConcurrentOperations < 2) {
        warnings.push("maxConcurrentOperations < 2 may limit parallel processing benefits");
      }
    }

    return { errors, warnings };
  }

  /**
   * 验证连接和重试配置
   */
  private static validateConnectionConfig(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 最大重连延迟验证
    if (config.maxReconnectDelay !== undefined) {
      if (typeof config.maxReconnectDelay !== "number" || config.maxReconnectDelay <= 0) {
        errors.push("maxReconnectDelay must be a positive number");
      } else if (config.maxReconnectDelay > 60000) {
        warnings.push("maxReconnectDelay > 60 seconds may be too long for symbol mapping");
      }
    }

    // 基础重试延迟验证
    if (config.baseRetryDelay !== undefined) {
      if (typeof config.baseRetryDelay !== "number" || config.baseRetryDelay <= 0) {
        errors.push("baseRetryDelay must be a positive number");
      } else if (config.baseRetryDelay > 10000) {
        warnings.push("baseRetryDelay > 10 seconds may be too long");
      }
    }

    // 连接超时验证
    if (config.connectionTimeout !== undefined) {
      if (typeof config.connectionTimeout !== "number" || config.connectionTimeout <= 0) {
        errors.push("connectionTimeout must be a positive number");
      } else if (config.connectionTimeout > 30000) {
        warnings.push("connectionTimeout > 30 seconds may be too long for symbol mapping operations");
      } else if (config.connectionTimeout < 1000) {
        warnings.push("connectionTimeout < 1 second may be too short");
      }
    }

    return { errors, warnings };
  }

  /**
   * 验证内存监控配置
   */
  private static validateMemoryConfig(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 内存检查间隔验证
    if (config.memoryCheckInterval !== undefined) {
      if (typeof config.memoryCheckInterval !== "number" || config.memoryCheckInterval <= 0) {
        errors.push("memoryCheckInterval must be a positive number");
      } else if (config.memoryCheckInterval < 10000) {
        warnings.push("memoryCheckInterval < 10 seconds may cause excessive monitoring overhead");
      } else if (config.memoryCheckInterval > 300000) {
        warnings.push("memoryCheckInterval > 5 minutes may not detect memory issues quickly enough");
      }
    }

    // 内存清理间隔验证
    if (config.memoryCleanupInterval !== undefined) {
      if (typeof config.memoryCleanupInterval !== "number" || config.memoryCleanupInterval <= 0) {
        errors.push("memoryCleanupInterval must be a positive number");
      } else if (config.memoryCleanupInterval < 30000) {
        warnings.push("memoryCleanupInterval < 30 seconds may cause frequent cleanup operations");
      }
    }

    return { errors, warnings };
  }

  /**
   * 验证性能监控配置
   */
  private static validatePerformanceConfig(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 慢操作阈值验证
    if (config.slowOperationThreshold !== undefined) {
      if (typeof config.slowOperationThreshold !== "number" || config.slowOperationThreshold <= 0) {
        errors.push("slowOperationThreshold must be a positive number");
      } else if (config.slowOperationThreshold > 1000) {
        warnings.push("slowOperationThreshold > 1000ms may be too high for symbol mapping operations");
      } else if (config.slowOperationThreshold < 10) {
        warnings.push("slowOperationThreshold < 10ms may generate too many alerts");
      }
    }

    // 性能监控启用验证
    if (config.performanceMonitoringEnabled !== undefined) {
      if (typeof config.performanceMonitoringEnabled !== "boolean") {
        errors.push("performanceMonitoringEnabled must be a boolean");
      }
    }

    // 指标收集启用验证
    if (config.metricsCollectionEnabled !== undefined) {
      if (typeof config.metricsCollectionEnabled !== "boolean") {
        errors.push("metricsCollectionEnabled must be a boolean");
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

    // 批次大小不应超过 L3 缓存大小
    if (config.defaultBatchSize && config.l3CacheSize) {
      if (config.defaultBatchSize > config.l3CacheSize) {
        warnings.push("defaultBatchSize should not exceed l3CacheSize to ensure effective caching");
      }
    }

    // 最大并发操作与批次大小的关系
    if (config.maxConcurrentOperations && config.defaultBatchSize) {
      const totalConcurrentItems = config.maxConcurrentOperations * config.defaultBatchSize;
      if (totalConcurrentItems > config.l2CacheSize) {
        warnings.push("maxConcurrentOperations * defaultBatchSize may exceed l2CacheSize capacity");
      }
    }

    // 内存检查和清理间隔的关系
    if (config.memoryCheckInterval && config.memoryCleanupInterval) {
      if (config.memoryCheckInterval > config.memoryCleanupInterval) {
        warnings.push("memoryCheckInterval should typically be less than memoryCleanupInterval");
      }
    }

    // 重试配置的合理性
    if (config.baseRetryDelay && config.maxReconnectDelay) {
      if (config.baseRetryDelay >= config.maxReconnectDelay) {
        errors.push("baseRetryDelay should be less than maxReconnectDelay");
      }
    }

    // TTL 和缓存大小的关系
    if (config.symbolMappingTtl && config.l2CacheSize) {
      // 如果 TTL 很短但缓存很大，可能浪费内存
      if (config.symbolMappingTtl < 300 && config.l2CacheSize > 5000) {
        warnings.push("Short symbolMappingTtl with large l2CacheSize may waste memory");
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
    const cacheInfo = `L1:${config.l1CacheSize || "?"},L2:${config.l2CacheSize || "?"},L3:${config.l3CacheSize || "?"}`;

    return `Symbol Mapper Cache (${cacheInfo}) configuration validation ${status}: ${errorCount} errors, ${warningCount} warnings`;
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
      case "l1CacheSize":
        if (typeof value !== "number" || value <= 0) {
          errors.push("l1CacheSize must be a positive number");
        } else if (value > 1000) {
          warnings.push("l1CacheSize > 1000 may be unnecessarily large for provider rules");
        }
        break;

      case "l2CacheSize":
        if (typeof value !== "number" || value <= 0) {
          errors.push("l2CacheSize must be a positive number");
        } else if (value > 10000) {
          warnings.push("l2CacheSize > 10000 may consume excessive memory");
        }
        break;

      case "l3CacheSize":
        if (typeof value !== "number" || value <= 0) {
          errors.push("l3CacheSize must be a positive number");
        } else if (value > 5000) {
          warnings.push("l3CacheSize > 5000 may be unnecessarily large for batch results");
        }
        break;

      case "defaultBatchSize":
        if (typeof value !== "number" || value <= 0) {
          errors.push("defaultBatchSize must be a positive number");
        } else if (value > 1000) {
          warnings.push("defaultBatchSize > 1000 may cause performance issues");
        }
        break;

      default:
        warnings.push(`Unknown field '${fieldName}' - validation skipped`);
    }

    return { errors, warnings };
  }

  /**
   * 验证 LRU 缓存层级关系
   */
  static validateLruHierarchy(l1Size: number, l2Size: number, l3Size: number): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (l1Size > l2Size) {
      errors.push("L1 cache size should not exceed L2 cache size");
    }

    if (l2Size < l3Size) {
      warnings.push("L2 cache size should typically be larger than L3 cache size");
    }

    const totalSize = l1Size + l2Size + l3Size;
    if (totalSize > 20000) {
      warnings.push(`Total LRU cache size (${totalSize}) may consume excessive memory`);
    }

    return { errors, warnings };
  }
}

/**
 * 验证结果接口
 */
export interface SymbolMapperCacheValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: string;
}

/**
 * 子验证结果接口
 */
interface ValidationSubResult {
  errors: string[];
  warnings: string[];
}
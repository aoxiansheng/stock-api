import { createLogger } from "@common/logging/index";

/**
 * Stream Cache 配置验证器
 *
 * 提供独立的配置验证功能，可用于：
 * - 运行时配置验证
 * - 配置更新前的预检查
 * - 测试环境中的配置合规性检查
 * - CI/CD 管道中的配置验证
 */
export class StreamCacheConfigValidator {
  private static readonly logger = createLogger("StreamCacheConfigValidator");

  /**
   * 验证完整的 Stream Cache 配置
   * @param config 配置对象
   * @returns 验证结果，包含错误和警告信息
   */
  static validateConfig(config: any): StreamCacheValidationResult {
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

    // 缓存大小配置验证
    const sizeValidation = this.validateSizeConfig(config);
    errors.push(...sizeValidation.errors);
    warnings.push(...sizeValidation.warnings);

    // 网络配置验证
    const networkValidation = this.validateNetworkConfig(config);
    errors.push(...networkValidation.errors);
    warnings.push(...networkValidation.warnings);

    // 逻辑一致性验证
    const consistencyValidation = this.validateLogicalConsistency(config);
    errors.push(...consistencyValidation.errors);
    warnings.push(...consistencyValidation.warnings);

    const isValid = errors.length === 0;
    const result: StreamCacheValidationResult = {
      isValid,
      errors,
      warnings,
      summary: this.generateValidationSummary(config, isValid, errors.length, warnings.length),
    };

    // 记录验证结果
    if (!isValid) {
      this.logger.error("Stream Cache configuration validation failed", {
        errors,
        warnings,
        config: this.sanitizeConfigForLogging(config),
      });
    } else if (warnings.length > 0) {
      this.logger.warn("Stream Cache configuration validation completed with warnings", {
        warnings,
        config: this.sanitizeConfigForLogging(config),
      });
    } else {
      this.logger.debug("Stream Cache configuration validation passed", {
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
      "hotCacheTTL",
      "warmCacheTTL",
      "maxHotCacheSize",
      "streamBatchSize",
      "connectionTimeout",
      "heartbeatInterval",
    ];

    for (const field of requiredFields) {
      if (config[field] === undefined || config[field] === null) {
        errors.push(`Required field '${field}' is missing or null`);
      }
    }

    return { errors, warnings };
  }

  /**
   * 验证 TTL 配置
   */
  private static validateTtlConfig(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 热缓存 TTL 验证
    if (typeof config.hotCacheTTL !== "number" || config.hotCacheTTL <= 0) {
      errors.push("hotCacheTTL must be a positive number");
    } else if (config.hotCacheTTL > 300) {
      warnings.push("hotCacheTTL > 300 seconds may not be suitable for hot cache");
    }

    // 温缓存 TTL 验证
    if (typeof config.warmCacheTTL !== "number" || config.warmCacheTTL <= 0) {
      errors.push("warmCacheTTL must be a positive number");
    } else if (config.warmCacheTTL > 3600) {
      warnings.push("warmCacheTTL > 1 hour may be too long for stream data");
    }

    // TTL 逻辑关系验证
    if (config.hotCacheTTL && config.warmCacheTTL) {
      if (config.hotCacheTTL >= config.warmCacheTTL) {
        errors.push("hotCacheTTL should be less than warmCacheTTL");
      }
    }

    // 默认、最小、最大 TTL 验证
    if (config.defaultTTL !== undefined) {
      if (typeof config.defaultTTL !== "number" || config.defaultTTL <= 0) {
        errors.push("defaultTTL must be a positive number");
      }
    }

    if (config.minTTL !== undefined && config.maxTTL !== undefined) {
      if (config.minTTL >= config.maxTTL) {
        errors.push("minTTL must be less than maxTTL");
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

    // 慢操作阈值验证
    if (config.slowOperationThreshold !== undefined) {
      if (typeof config.slowOperationThreshold !== "number" || config.slowOperationThreshold <= 0) {
        errors.push("slowOperationThreshold must be a positive number");
      } else if (config.slowOperationThreshold > 1000) {
        warnings.push("slowOperationThreshold > 1000ms may be too high");
      }
    }

    // 统计日志间隔验证
    if (config.statsLogInterval !== undefined) {
      if (typeof config.statsLogInterval !== "number" || config.statsLogInterval <= 0) {
        errors.push("statsLogInterval must be a positive number");
      } else if (config.statsLogInterval < 1000) {
        warnings.push("statsLogInterval < 1 second may generate too many logs");
      }
    }

    // 内存清理阈值验证
    if (config.memoryCleanupThreshold !== undefined) {
      if (typeof config.memoryCleanupThreshold !== "number" ||
          config.memoryCleanupThreshold < 0 ||
          config.memoryCleanupThreshold > 1) {
        errors.push("memoryCleanupThreshold must be a number between 0 and 1");
      } else if (config.memoryCleanupThreshold > 0.9) {
        warnings.push("memoryCleanupThreshold > 0.9 may cause frequent cleanups");
      }
    }

    return { errors, warnings };
  }

  /**
   * 验证大小配置
   */
  private static validateSizeConfig(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 最大热缓存大小验证
    if (typeof config.maxHotCacheSize !== "number" || config.maxHotCacheSize <= 0) {
      errors.push("maxHotCacheSize must be a positive number");
    } else if (config.maxHotCacheSize > 10000) {
      warnings.push("maxHotCacheSize > 10000 may consume too much memory");
    }

    // 流批处理大小验证
    if (typeof config.streamBatchSize !== "number" || config.streamBatchSize <= 0) {
      errors.push("streamBatchSize must be a positive number");
    } else if (config.streamBatchSize > 1000) {
      warnings.push("streamBatchSize > 1000 may cause performance issues");
    }

    // 最大清理项数验证
    if (config.maxCleanupItems !== undefined) {
      if (typeof config.maxCleanupItems !== "number" || config.maxCleanupItems <= 0) {
        errors.push("maxCleanupItems must be a positive number");
      }
    }

    // 压缩阈值验证
    if (config.compressionThreshold !== undefined) {
      if (typeof config.compressionThreshold !== "number" || config.compressionThreshold < 0) {
        errors.push("compressionThreshold must be a non-negative number");
      } else if (config.compressionThreshold < 512) {
        warnings.push("compressionThreshold < 512 bytes may cause unnecessary compression overhead");
      }
    }

    return { errors, warnings };
  }

  /**
   * 验证网络配置
   */
  private static validateNetworkConfig(config: any): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 连接超时验证
    if (typeof config.connectionTimeout !== "number" || config.connectionTimeout <= 0) {
      errors.push("connectionTimeout must be a positive number");
    } else if (config.connectionTimeout > 30000) {
      warnings.push("connectionTimeout > 30 seconds may be too long for stream data");
    }

    // 心跳间隔验证
    if (typeof config.heartbeatInterval !== "number" || config.heartbeatInterval <= 0) {
      errors.push("heartbeatInterval must be a positive number");
    } else if (config.heartbeatInterval > 60000) {
      warnings.push("heartbeatInterval > 60 seconds may be too long for real-time streams");
    }

    // 重试配置验证
    if (config.maxRetryAttempts !== undefined) {
      if (typeof config.maxRetryAttempts !== "number" || config.maxRetryAttempts < 0) {
        errors.push("maxRetryAttempts must be a non-negative number");
      } else if (config.maxRetryAttempts > 10) {
        warnings.push("maxRetryAttempts > 10 may cause long delays");
      }
    }

    if (config.retryBaseDelay !== undefined) {
      if (typeof config.retryBaseDelay !== "number" || config.retryBaseDelay <= 0) {
        errors.push("retryBaseDelay must be a positive number");
      }
    }

    if (config.retryDelayMultiplier !== undefined) {
      if (typeof config.retryDelayMultiplier !== "number" || config.retryDelayMultiplier <= 0) {
        errors.push("retryDelayMultiplier must be a positive number");
      } else if (config.retryDelayMultiplier > 5) {
        warnings.push("retryDelayMultiplier > 5 may cause exponential delays");
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

    // 心跳间隔不应超过连接超时
    if (config.heartbeatInterval && config.connectionTimeout) {
      if (config.heartbeatInterval >= config.connectionTimeout) {
        warnings.push("heartbeatInterval should be less than connectionTimeout");
      }
    }

    // 流批处理大小不应超过最大热缓存大小
    if (config.streamBatchSize && config.maxHotCacheSize) {
      if (config.streamBatchSize > config.maxHotCacheSize / 2) {
        warnings.push("streamBatchSize should not exceed half of maxHotCacheSize");
      }
    }

    // 清理间隔应合理
    if (config.cleanupInterval && config.statsLogInterval) {
      if (config.cleanupInterval < config.statsLogInterval) {
        warnings.push("cleanupInterval should not be less than statsLogInterval");
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
    const configType = config?.compressionDataType || "stream";

    return `Stream Cache (${configType}) configuration validation ${status}: ${errorCount} errors, ${warningCount} warnings`;
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
      case "hotCacheTTL":
        if (typeof value !== "number" || value <= 0) {
          errors.push("hotCacheTTL must be a positive number");
        } else if (value > 300) {
          warnings.push("hotCacheTTL > 300 seconds may not be suitable for hot cache");
        }
        break;

      case "warmCacheTTL":
        if (typeof value !== "number" || value <= 0) {
          errors.push("warmCacheTTL must be a positive number");
        } else if (value > 3600) {
          warnings.push("warmCacheTTL > 1 hour may be too long for stream data");
        }
        break;

      case "maxHotCacheSize":
        if (typeof value !== "number" || value <= 0) {
          errors.push("maxHotCacheSize must be a positive number");
        } else if (value > 10000) {
          warnings.push("maxHotCacheSize > 10000 may consume too much memory");
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
export interface StreamCacheValidationResult {
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
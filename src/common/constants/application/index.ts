/**
 * Application层统一导出
 * 🚀 应用层 - 集成和应用级配置
 * 🔧 整合所有层级，提供最终的统一配置接口
 */

// 导入环境配置
import {
  ENVIRONMENT_DETECTION,
  ENVIRONMENT_FEATURES,
  ENVIRONMENT_RESOURCE_LIMITS,
  EnvironmentConfigManager,
  EnvironmentConfigUtil,
} from "./environment-config.constants";

// 导入核心常量用于QUICK配置
import { NUMERIC_CONSTANTS } from "../core/numeric.constants";
import { CORE_VALUES } from "../foundation/core-values.constants";
import { HTTP_TIMEOUTS } from "../semantic/http-semantics.constants";
import { BATCH_SIZE_SEMANTICS } from "../semantic/batch-semantics.constants";
import { HTTP_STATUS_CODES } from "../semantic/http-semantics.constants";

// 导入枚举类型
const Environment = {
  DEVELOPMENT: "development",
  TEST: "test",
  STAGING: "staging",
  PRODUCTION: "production",
} as const;

const LogLevel = {
  ERROR: "error",
  WARN: "warn",
  INFO: "info",
  DEBUG: "debug",
} as const;

// 导出环境配置相关
export {
  ENVIRONMENT_DETECTION,
  ENVIRONMENT_FEATURES,
  ENVIRONMENT_RESOURCE_LIMITS,
  EnvironmentConfigManager,
  EnvironmentConfigUtil,
};

// 导出类型定义
/**
 * Application层完整常量对象
 * 🎯 提供整个常量系统的最终统一接口
 */
export const APPLICATION_CONSTANTS = Object.freeze({
  // 环境配置
  ENVIRONMENT: {
    ENUMS: { Environment, LogLevel },
    DETECTION: ENVIRONMENT_DETECTION,
    FEATURES: ENVIRONMENT_FEATURES,
    RESOURCE_LIMITS: ENVIRONMENT_RESOURCE_LIMITS,
  },

  // 元信息
  META: {
    VERSION: "1.0.0",
  },
} as const);

/**
 * 常量系统管理器
 * 🎯 提供整个常量系统的管理和访问功能
 */
export class ConstantSystemManager {
  private static instance: ConstantSystemManager;
  private environmentConfigManager: EnvironmentConfigManager;

  private constructor() {
    this.environmentConfigManager = EnvironmentConfigManager.getInstance();
  }

  /**
   * 获取常量系统管理器实例
   */
  static getInstance(): ConstantSystemManager {
    if (!ConstantSystemManager.instance) {
      ConstantSystemManager.instance = new ConstantSystemManager();
    }
    return ConstantSystemManager.instance;
  }

  /**
   * 获取完整的系统配置
   */
  getFullSystemConfig(): any {
    const environmentConfig = this.environmentConfigManager.getConfigSummary();

    return {
      environment: environmentConfig,
      meta: APPLICATION_CONSTANTS.META,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取优化的运行时配置
   */
  getRuntimeConfig(): any {
    const envConfig = this.environmentConfigManager.getEnvironmentFeatures();
    const resourceLimits = this.environmentConfigManager.getResourceLimits();

    return {
      // 环境特性
      features: envConfig,

      // 资源限制
      resourceLimits,

      // 环境信息
      environment: {
        current: this.environmentConfigManager.getCurrentEnvironment(),
        isDevelopment: this.environmentConfigManager.isDevelopment(),
        isProduction: this.environmentConfigManager.isProduction(),
        logLevel: this.environmentConfigManager.getRecommendedLogLevel(),
      },
    };
  }

  /**
   * 验证整个常量系统
   */
  validateSystem(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 验证环境配置
    const envValidation =
      this.environmentConfigManager.validateEnvironmentConfig();
    warnings.push(...envValidation.warnings);

    // 检查配置一致性
    const consistencyCheck = this.checkConfigConsistency();
    warnings.push(...consistencyCheck);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 检查配置一致性
   */
  private checkConfigConsistency(): string[] {
    const warnings: string[] = [];
    const env = this.environmentConfigManager.getCurrentEnvironment();
    const features = this.environmentConfigManager.getEnvironmentFeatures();

    // 检查生产环境安全配置
    if (env === Environment.PRODUCTION) {
      if (features.DEBUG?.ENABLE_DEBUG_LOGS) {
        warnings.push("Debug logs enabled in production environment");
      }
      if (features.DEV_TOOLS?.ENABLE_SWAGGER_UI) {
        warnings.push("Swagger UI enabled in production environment");
      }
      if (features.SECURITY?.CORS_ALLOW_ALL) {
        warnings.push("CORS allow all enabled in production environment");
      }
    }

    // 检查开发环境性能配置
    if (env === Environment.DEVELOPMENT) {
      if (!features.DEBUG?.ENABLE_DEBUG_LOGS) {
        warnings.push("Debug logs disabled in development environment");
      }
      if (!features.DEV_TOOLS?.ENABLE_API_DOCS) {
        warnings.push("API docs disabled in development environment");
      }
    }

    return warnings;
  }

  /**
   * 获取系统统计信息
   */
  getSystemStats(): any {
    const envStats = this.environmentConfigManager.getConfigSummary();

    return {
      // 常量系统统计
      system: {
        totalLayers: 3, // Foundation, Semantic, Domain
        totalDomains: 3, // Market, Alert, RateLimit
        architecture: "Foundation → Semantic → Domain → Application",
        version: APPLICATION_CONSTANTS.META.VERSION,
      },

      // 环境配置统计
      environmentConfig: {
        current: envStats.environment,
        features: envStats.features,
        resourceLimits: envStats.resourceLimits,
        logLevel: envStats.logLevel,
      },

      // 性能指标
      performance: {
        configLoadTime: Date.now(), // 简化的性能指标
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
      },

      // 验证状态
      validation: this.validateSystem(),
    };
  }

  /**
   * 获取推荐配置
   */
  getRecommendedConfig(_scenario?: string): any {
    const env = this.environmentConfigManager.getCurrentEnvironment();

    // 基于环境返回简化的推荐配置
    const baseConfig = {
      environment: env,
      features: this.environmentConfigManager.getEnvironmentFeatures(),
      resourceLimits: this.environmentConfigManager.getResourceLimits(),
      logLevel: this.environmentConfigManager.getRecommendedLogLevel(),
    };

    return baseConfig;
  }

  /**
   * 导出配置到文件
   */
  exportConfig(format: "json" | "yaml" | "env" = "json"): string {
    const config = this.getRuntimeConfig();

    switch (format) {
      case "json":
        return JSON.stringify(config, null, 2);
      case "yaml":
        // 简化的YAML导出（实际项目中可使用yaml库）
        return this.objectToYaml(config);
      case "env":
        return this.objectToEnvVars(config);
      default:
        return JSON.stringify(config, null, 2);
    }
  }

  /**
   * 简化的对象转YAML
   */
  private objectToYaml(obj: any, indent: number = 0): string {
    const spaces = "  ".repeat(indent);
    let yaml = "";

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "object" && value !== null) {
        yaml += `${spaces}${key}:\n${this.objectToYaml(value, indent + 1)}`;
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }

  /**
   * 简化的对象转环境变量
   */
  private objectToEnvVars(obj: any, prefix: string = ""): string {
    let envVars = "";

    for (const [key, value] of Object.entries(obj)) {
      const envKey = prefix
        ? `${prefix}_${key.toUpperCase()}`
        : key.toUpperCase();

      if (typeof value === "object" && value !== null) {
        envVars += this.objectToEnvVars(value, envKey);
      } else {
        envVars += `${envKey}=${value}\n`;
      }
    }

    return envVars;
  }
}

/**
 * 便捷导出 - 提供最常用的配置访问方式
 * 🎯 开发者最常使用的配置快捷方式
 */
export const CONFIG = {
  // 系统管理器实例
  SYSTEM: ConstantSystemManager.getInstance(),

  // 环境配置
  ENV: EnvironmentConfigManager.getInstance(),

  // 完整应用配置
  APP: APPLICATION_CONSTANTS,

  // 快速访问配置 - 修复TS2339错误
  QUICK: {
    // 超时配置
    TIMEOUTS: {
      FAST_REQUEST_MS: HTTP_TIMEOUTS.REQUEST.FAST_MS, // 5秒
      NORMAL_REQUEST_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS, // 30秒
      DATABASE_QUERY_MS: HTTP_TIMEOUTS.REQUEST.NORMAL_MS, // 30秒
      SLOW_OPERATION_MS: HTTP_TIMEOUTS.REQUEST.SLOW_MS, // 60秒
    },

    // 批量大小配置
    BATCH_SIZES: {
      SMALL: BATCH_SIZE_SEMANTICS.PERFORMANCE.SMALL_BATCH, // 25
      OPTIMAL: BATCH_SIZE_SEMANTICS.BASIC.OPTIMAL_SIZE, // 50
      MAX: BATCH_SIZE_SEMANTICS.BASIC.MAX_SIZE, // 1000
    },

    // 缓存TTL配置
    CACHE_TTL: {
      REALTIME_SEC: NUMERIC_CONSTANTS.N_5, // 5秒
      FREQUENT_SEC: NUMERIC_CONSTANTS.N_60, // 60秒 (1分钟)
      STATIC_SEC: NUMERIC_CONSTANTS.N_86400, // 86400秒 (1天)
    },

    // HTTP状态码
    HTTP_STATUS: {
      OK: HTTP_STATUS_CODES.SUCCESS.OK, // 200
      BAD_REQUEST: HTTP_STATUS_CODES.CLIENT_ERROR.BAD_REQUEST, // 400
      INTERNAL_ERROR: HTTP_STATUS_CODES.SERVER_ERROR.INTERNAL_SERVER_ERROR, // 500
    },

    // 常用数值
    VALUES: {
      ONE_SECOND_MS: NUMERIC_CONSTANTS.N_1000, // 1000ms
      TEN_SECONDS_MS: NUMERIC_CONSTANTS.N_10000, // 10000ms
      DEFAULT_RETRIES: NUMERIC_CONSTANTS.N_3, // 3
      MAX_RETRIES: NUMERIC_CONSTANTS.N_5, // 5
    },
  },
} as const;

/**
 * 默认导出 - 提供最简单的使用方式
 */
export default CONFIG;

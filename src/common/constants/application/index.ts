/**
 * Application层统一导出
 * 🚀 应用层 - 集成和应用级配置
 * 🔧 整合所有层级，提供最终的统一配置接口
 */

// 导出所有应用层常量和工具
export {
  UNIFIED_CONFIG,
  UnifiedConfigManager,
  UnifiedConfigUtil
} from './unified-config.constants';

export {
  ENVIRONMENT_DETECTION,
  ENVIRONMENT_FEATURES,
  ENVIRONMENT_RESOURCE_LIMITS,
  EnvironmentConfigManager,
  EnvironmentConfigUtil
} from './environment-config.constants';

export {
  BATCH_APPLICATION_CONFIG,
  BatchApplicationUtil
} from './batch-application.constants';

export {
  SYSTEM_OPERATION_STATUS,
  SYSTEM_LOG_LEVELS,
  SYSTEM_ENVIRONMENTS,
  SYSTEM_APPLICATION_CONFIG,
  SYSTEM_CONSTANTS,
  SystemApplicationUtil,
  getAllOperationStatuses,
  isValidOperationStatus,
  type SystemOperationStatus,
  type SystemConfig,
  type DataState,
  OperationStatus
} from './system-application.constants';

// 导出类型定义
export type {
  UnifiedConfigType,
  QuickAccessConfig,
  IntegrationConfig
} from './unified-config.constants';

export type {
  EnvironmentFeatures,
  EnvironmentResourceLimits
} from './environment-config.constants';

// 导入用于统一配置对象
import { UNIFIED_CONFIG, UnifiedConfigManager, UnifiedConfigUtil } from './unified-config.constants';
import {
  ENVIRONMENT_DETECTION,
  ENVIRONMENT_FEATURES,
  ENVIRONMENT_RESOURCE_LIMITS,
  EnvironmentConfigManager
} from './environment-config.constants';
import { Environment, LogLevel } from './system-application.constants';

/**
 * Application层完整常量对象
 * 🎯 提供整个常量系统的最终统一接口
 */
export const APPLICATION_CONSTANTS = Object.freeze({
  // 统一配置
  UNIFIED: UNIFIED_CONFIG,

  // 环境配置
  ENVIRONMENT: {
    ENUMS: { Environment, LogLevel },
    DETECTION: ENVIRONMENT_DETECTION,
    FEATURES: ENVIRONMENT_FEATURES,
    RESOURCE_LIMITS: ENVIRONMENT_RESOURCE_LIMITS,
  },

  // 元信息
  META: {
    VERSION: '1.0.0',
    ARCHITECTURE: 'Foundation → Semantic → Domain → Application',
    LAYER_COUNT: 4,
    CREATED_DATE: new Date().toISOString(),
  },
} as const);

/**
 * 常量系统管理器
 * 🎯 提供整个常量系统的管理和访问功能
 */
export class ConstantSystemManager {
  private static instance: ConstantSystemManager;
  private unifiedConfigManager: UnifiedConfigManager;
  private environmentConfigManager: EnvironmentConfigManager;

  private constructor() {
    this.unifiedConfigManager = UnifiedConfigManager.getInstance();
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
    const unifiedConfig = this.unifiedConfigManager.getFullConfig();
    const environmentConfig = this.environmentConfigManager.getConfigSummary();
    
    return {
      unified: unifiedConfig,
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
    const quickAccess = this.unifiedConfigManager.getQuickConfig();
    const integrations = this.unifiedConfigManager.getIntegrationConfig();

    return {
      // 快速访问配置（经过环境调整）
      quickAccess: {
        timeouts: {
          fastRequest: this.unifiedConfigManager.getAdjustedValue(
            quickAccess.TIMEOUTS.FAST_REQUEST_MS,
            'timeout'
          ),
          normalRequest: this.unifiedConfigManager.getAdjustedValue(
            quickAccess.TIMEOUTS.NORMAL_REQUEST_MS,
            'timeout'
          ),
          slowRequest: this.unifiedConfigManager.getAdjustedValue(
            quickAccess.TIMEOUTS.SLOW_REQUEST_MS,
            'timeout'
          ),
          databaseQuery: this.unifiedConfigManager.getAdjustedValue(
            quickAccess.TIMEOUTS.DATABASE_QUERY_MS,
            'timeout'
          ),
        },
        
        batchSizes: {
          small: this.unifiedConfigManager.getAdjustedValue(
            quickAccess.BATCH_SIZES.SMALL,
            'batch'
          ),
          medium: this.unifiedConfigManager.getAdjustedValue(
            quickAccess.BATCH_SIZES.MEDIUM,
            'batch'
          ),
          large: this.unifiedConfigManager.getAdjustedValue(
            quickAccess.BATCH_SIZES.LARGE,
            'batch'
          ),
          optimal: this.unifiedConfigManager.getAdjustedValue(
            quickAccess.BATCH_SIZES.OPTIMAL,
            'batch'
          ),
        },
        
        cacheTtl: {
          realtime: this.unifiedConfigManager.getAdjustedValue(
            quickAccess.CACHE_TTL.REALTIME_SEC,
            'cache_ttl'
          ),
          frequent: this.unifiedConfigManager.getAdjustedValue(
            quickAccess.CACHE_TTL.FREQUENT_SEC,
            'cache_ttl'
          ),
          normal: this.unifiedConfigManager.getAdjustedValue(
            quickAccess.CACHE_TTL.NORMAL_SEC,
            'cache_ttl'
          ),
          static: this.unifiedConfigManager.getAdjustedValue(
            quickAccess.CACHE_TTL.STATIC_SEC,
            'cache_ttl'
          ),
        },
      },

      // 环境特性
      features: envConfig,

      // 资源限制
      resourceLimits,

      // 集成配置
      integrations,

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

    // 验证统一配置
    const unifiedValidation = this.unifiedConfigManager.validateConfig();
    errors.push(...unifiedValidation.errors);

    // 验证环境配置
    const envValidation = this.environmentConfigManager.validateEnvironmentConfig();
    warnings.push(...envValidation.warnings);

    // 检查配置一致性
    const consistencyCheck = this.checkConfigConsistency();
    warnings.push(...consistencyCheck);

    return {
      valid: errors.length === 0,
      errors,
      warnings
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
        warnings.push('Debug logs enabled in production environment');
      }
      if (features.DEV_TOOLS?.ENABLE_SWAGGER_UI) {
        warnings.push('Swagger UI enabled in production environment');
      }
      if (features.SECURITY?.CORS_ALLOW_ALL) {
        warnings.push('CORS allow all enabled in production environment');
      }
    }

    // 检查开发环境性能配置
    if (env === Environment.DEVELOPMENT) {
      if (!features.DEBUG?.ENABLE_DEBUG_LOGS) {
        warnings.push('Debug logs disabled in development environment');
      }
      if (!features.DEV_TOOLS?.ENABLE_API_DOCS) {
        warnings.push('API docs disabled in development environment');
      }
    }

    return warnings;
  }

  /**
   * 获取系统统计信息
   */
  getSystemStats(): any {
    const unifiedStats = this.unifiedConfigManager.getConfigStats();
    const envStats = this.environmentConfigManager.getConfigSummary();

    return {
      // 常量系统统计
      system: {
        totalLayers: 4,
        totalDomains: 3, // Market, Alert, RateLimit
        architecture: 'Foundation → Semantic → Domain → Application',
        version: APPLICATION_CONSTANTS.META.VERSION,
      },

      // 统一配置统计
      unifiedConfig: unifiedStats,

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
  getRecommendedConfig(scenario?: string): any {
    if (scenario) {
      return UnifiedConfigUtil.getRecommendedConfig(scenario as any);
    }

    // 基于当前环境推荐配置
    const env = this.environmentConfigManager.getCurrentEnvironment();
    
    switch (env) {
      case Environment.DEVELOPMENT:
        return UnifiedConfigUtil.getRecommendedConfig('development');
      case Environment.TEST:
        return UnifiedConfigUtil.getRecommendedConfig('high_reliability');
      case Environment.STAGING:
        return UnifiedConfigUtil.getRecommendedConfig('high_reliability');
      case Environment.PRODUCTION:
        return UnifiedConfigUtil.getRecommendedConfig('high_performance');
      default:
        return UnifiedConfigUtil.getRecommendedConfig('development');
    }
  }

  /**
   * 导出配置到文件
   */
  exportConfig(format: 'json' | 'yaml' | 'env' = 'json'): string {
    const config = this.getRuntimeConfig();
    
    switch (format) {
      case 'json':
        return JSON.stringify(config, null, 2);
      case 'yaml':
        // 简化的YAML导出（实际项目中可使用yaml库）
        return this.objectToYaml(config);
      case 'env':
        return this.objectToEnvVars(config);
      default:
        return JSON.stringify(config, null, 2);
    }
  }

  /**
   * 简化的对象转YAML
   */
  private objectToYaml(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null) {
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
  private objectToEnvVars(obj: any, prefix: string = ''): string {
    let envVars = '';

    for (const [key, value] of Object.entries(obj)) {
      const envKey = prefix ? `${prefix}_${key.toUpperCase()}` : key.toUpperCase();
      
      if (typeof value === 'object' && value !== null) {
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
  
  // 快速访问配置
  QUICK: UnifiedConfigManager.getInstance().getQuickConfig(),
  
  // 环境配置
  ENV: EnvironmentConfigManager.getInstance(),
  
  // 完整应用配置
  APP: APPLICATION_CONSTANTS,
} as const;

/**
 * 默认导出 - 提供最简单的使用方式
 */
export default CONFIG;
/**
 * 统一配置常量
 * 🚀 Application层 - 应用级统一配置
 * 🔧 整合所有层级，提供统一的配置访问入口
 */

import { FOUNDATION_CONSTANTS } from '../foundation';
import { SEMANTIC_CONSTANTS } from '../semantic';
import { DOMAIN_CONSTANTS } from '../domain';

/**
 * 应用级统一常量配置
 * 🎯 整合所有层级的常量，提供便捷访问接口
 */
export const UNIFIED_CONFIG = Object.freeze({
  /**
   * 基础层配置 - 纯数值定义
   */
  FOUNDATION: {
    VALUES: FOUNDATION_CONSTANTS.VALUES,
    TIMEOUTS: FOUNDATION_CONSTANTS.TIMEOUTS,
    TTL: FOUNDATION_CONSTANTS.TTL,
    LIMITS: FOUNDATION_CONSTANTS.LIMITS,
  },

  /**
   * 语义层配置 - 业务无关语义分类
   * 🎯 避免重复导出，只导出常用的配置部分
   */
  SEMANTIC: {
    HTTP_STATUS_CODES: SEMANTIC_CONSTANTS.HTTP.STATUS_CODES,
    // 注意：HTTP_METHODS 不在这里重复导出，避免在 Application 层产生重复
    // 需要 HTTP_METHODS 时请直接使用 SEMANTIC_CONSTANTS.HTTP.METHODS
    CACHE: SEMANTIC_CONSTANTS.CACHE,
    RETRY: SEMANTIC_CONSTANTS.RETRY,
    BATCH: SEMANTIC_CONSTANTS.BATCH,
  },

  /**
   * 领域层配置 - 业务领域专用
   */
  DOMAIN: {
    MARKET: DOMAIN_CONSTANTS.MARKET,
    ALERT: DOMAIN_CONSTANTS.ALERT,
    RATE_LIMIT: DOMAIN_CONSTANTS.RATE_LIMIT,
  },

  /**
   * 应用级快捷访问配置
   * 🎯 提供最常用配置的便捷访问
   */
  QUICK_ACCESS: {
    // 常用超时配置
    TIMEOUTS: {
      FAST_REQUEST_MS: SEMANTIC_CONSTANTS.HTTP.TIMEOUTS.REQUEST.FAST_MS,           // 5000ms
      NORMAL_REQUEST_MS: SEMANTIC_CONSTANTS.HTTP.TIMEOUTS.REQUEST.NORMAL_MS,       // 30000ms
      SLOW_REQUEST_MS: SEMANTIC_CONSTANTS.HTTP.TIMEOUTS.REQUEST.SLOW_MS,           // 60000ms
      DATABASE_QUERY_MS: FOUNDATION_CONSTANTS.TIMEOUTS.DATABASE.QUERY_MS,          // 10000ms
      CACHE_OPERATION_MS: FOUNDATION_CONSTANTS.TIMEOUTS.CACHE.GET_MS,              // 1000ms
    },

    // 常用批量大小配置
    BATCH_SIZES: {
      SMALL: FOUNDATION_CONSTANTS.LIMITS.BATCH_LIMITS.MIN_BATCH_SIZE,              // 1
      MEDIUM: SEMANTIC_CONSTANTS.BATCH.SIZES.PERFORMANCE.MEDIUM_BATCH,             // 50
      LARGE: FOUNDATION_CONSTANTS.LIMITS.BATCH_LIMITS.MAX_BATCH_SIZE / 2,          // 500
      OPTIMAL: SEMANTIC_CONSTANTS.BATCH.SIZES.BASIC.OPTIMAL_SIZE,                  // 50
      MAX: FOUNDATION_CONSTANTS.LIMITS.BATCH_LIMITS.MAX_BATCH_SIZE,                // 1000
    },

    // 常用缓存TTL配置
    CACHE_TTL: {
      REALTIME_SEC: FOUNDATION_CONSTANTS.TTL.CACHE.REALTIME_SEC,                   // 5秒
      FREQUENT_SEC: FOUNDATION_CONSTANTS.TTL.CACHE.FREQUENT_SEC,                   // 60秒
      NORMAL_SEC: FOUNDATION_CONSTANTS.TTL.CACHE.NORMAL_SEC,                       // 300秒
      STATIC_SEC: FOUNDATION_CONSTANTS.TTL.CACHE.STATIC_SEC,                       // 86400秒
    },

    // 常用HTTP状态码
    HTTP_STATUS: {
      OK: SEMANTIC_CONSTANTS.HTTP.STATUS_CODES.SUCCESS.OK,                         // 200
      BAD_REQUEST: SEMANTIC_CONSTANTS.HTTP.STATUS_CODES.CLIENT_ERROR.BAD_REQUEST,  // 400
      UNAUTHORIZED: SEMANTIC_CONSTANTS.HTTP.STATUS_CODES.CLIENT_ERROR.UNAUTHORIZED, // 401
      FORBIDDEN: SEMANTIC_CONSTANTS.HTTP.STATUS_CODES.CLIENT_ERROR.FORBIDDEN,      // 403
      NOT_FOUND: SEMANTIC_CONSTANTS.HTTP.STATUS_CODES.CLIENT_ERROR.NOT_FOUND,      // 404
      TOO_MANY_REQUESTS: SEMANTIC_CONSTANTS.HTTP.STATUS_CODES.CLIENT_ERROR.TOO_MANY_REQUESTS, // 429
      INTERNAL_ERROR: SEMANTIC_CONSTANTS.HTTP.STATUS_CODES.SERVER_ERROR.INTERNAL_SERVER_ERROR, // 500
    },

    // 常用重试配置
    RETRY_CONFIG: {
      NETWORK_OPERATION: SEMANTIC_CONSTANTS.RETRY.TEMPLATES.NETWORK_OPERATION,     // 网络操作重试模板
      DATABASE_OPERATION: SEMANTIC_CONSTANTS.RETRY.TEMPLATES.DATABASE_OPERATION,   // 数据库操作重试模板
      CACHE_OPERATION: SEMANTIC_CONSTANTS.RETRY.TEMPLATES.CACHE_OPERATION,         // 缓存操作重试模板
    },
  },

  /**
   * 环境特定配置
   * 🎯 基于运行环境的配置调整
   */
  ENVIRONMENT_SPECIFIC: {
    // 开发环境配置
    DEVELOPMENT: {
    },

    // 测试环境配置
    TESTING: {
    },

    // 预发布环境配置
    STAGING: {
    },

    // 生产环境配置
    PRODUCTION: {
    },
  },

  /**
   * 特性开关配置
   * 🎯 功能特性的开关控制
   */
  FEATURE_FLAGS: {
    // 缓存特性
    CACHE_FEATURES: {
    },

    // 性能特性
    PERFORMANCE_FEATURES: {
    },

    // 安全特性
    SECURITY_FEATURES: {
    },

    // 监控特性
    MONITORING_FEATURES: {
    },
  },

  /**
   * 集成配置
   * 🎯 外部系统集成相关配置
   */
  INTEGRATIONS: {
    // 数据库集成
    DATABASE: {
      BATCH_SIZE: DOMAIN_CONSTANTS.ALERT.BATCH.RULE_PROCESSING.EVALUATION_BATCH_SIZE,        // 50
    },

    // 缓存集成
    CACHE: {
    },

    // 外部API集成
    EXTERNAL_API: {
      BATCH_SIZE: DOMAIN_CONSTANTS.MARKET.BATCH.STOCK_DATA.QUOTE_BATCH_SIZE,                  // 100
    },

    // 消息队列集成
    MESSAGE_QUEUE: {
      BATCH_SIZE: SEMANTIC_CONSTANTS.BATCH.SIZES.PERFORMANCE.MEDIUM_BATCH,                    // 50
    },
  },
} as const);

/**
 * 应用配置管理类
 * 🎯 提供配置访问和管理功能
 */
export class UnifiedConfigManager {
  private static instance: UnifiedConfigManager;
  private environment: string;
  private featureFlags: Map<string, boolean>;

  private constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.featureFlags = new Map<string, boolean>();
    this.initializeFeatureFlags();
  }

  /**
   * 获取配置管理器实例
   */
  static getInstance(): UnifiedConfigManager {
    if (!UnifiedConfigManager.instance) {
      UnifiedConfigManager.instance = new UnifiedConfigManager();
    }
    return UnifiedConfigManager.instance;
  }

  /**
   * 初始化特性开关
   */
  private initializeFeatureFlags(): void {
    const flags = UNIFIED_CONFIG.FEATURE_FLAGS;
    
    // 缓存特性开关
    Object.entries(flags.CACHE_FEATURES).forEach(([key, value]) => {
      this.featureFlags.set(`cache.${key.toLowerCase()}`, value as boolean);
    });

    // 性能特性开关
    Object.entries(flags.PERFORMANCE_FEATURES).forEach(([key, value]) => {
      this.featureFlags.set(`performance.${key.toLowerCase()}`, value as boolean);
    });

    // 安全特性开关
    Object.entries(flags.SECURITY_FEATURES).forEach(([key, value]) => {
      this.featureFlags.set(`security.${key.toLowerCase()}`, value as boolean);
    });

    // 监控特性开关
    Object.entries(flags.MONITORING_FEATURES).forEach(([key, value]) => {
      this.featureFlags.set(`monitoring.${key.toLowerCase()}`, value as boolean);
    });
  }

  /**
   * 获取当前环境配置
   */
  getEnvironmentConfig(): any {
    const envConfig = UNIFIED_CONFIG.ENVIRONMENT_SPECIFIC;
    switch (this.environment.toLowerCase()) {
      case 'development':
        return envConfig.DEVELOPMENT;
      case 'test':
      case 'testing':
        return envConfig.TESTING;
      case 'staging':
        return envConfig.STAGING;
      case 'production':
        return envConfig.PRODUCTION;
      default:
        return envConfig.DEVELOPMENT;
    }
  }

  /**
   * 获取调整后的配置值
   */
  getAdjustedValue<T extends number>(baseValue: T, type: 'timeout' | 'batch' | 'cache_ttl'): T {
    const envConfig = this.getEnvironmentConfig();
    
    switch (type) {
      case 'timeout':
        return (baseValue * envConfig.TIMEOUT_MULTIPLIER) as T;
      case 'batch':
        return Math.max(1, Math.floor(baseValue * envConfig.BATCH_SIZE_MULTIPLIER)) as T;
      case 'cache_ttl':
        return Math.max(1, Math.floor(baseValue * envConfig.CACHE_TTL_MULTIPLIER)) as T;
      default:
        return baseValue;
    }
  }

  /**
   * 检查特性开关状态
   */
  isFeatureEnabled(feature: string): boolean {
    return this.featureFlags.get(feature.toLowerCase()) || false;
  }

  /**
   * 设置特性开关状态
   */
  setFeatureFlag(feature: string, enabled: boolean): void {
    this.featureFlags.set(feature.toLowerCase(), enabled);
  }

  /**
   * 获取快捷访问配置
   */
  getQuickConfig(): typeof UNIFIED_CONFIG.QUICK_ACCESS {
    return UNIFIED_CONFIG.QUICK_ACCESS;
  }

  /**
   * 获取集成配置
   */
  getIntegrationConfig(): typeof UNIFIED_CONFIG.INTEGRATIONS {
    return UNIFIED_CONFIG.INTEGRATIONS;
  }

  /**
   * 获取完整配置
   */
  getFullConfig(): typeof UNIFIED_CONFIG {
    return UNIFIED_CONFIG;
  }

  /**
   * 验证配置完整性
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 验证基础配置
    if (!UNIFIED_CONFIG.FOUNDATION) {
      errors.push('Foundation layer configuration is missing');
    }

    // 验证语义配置
    if (!UNIFIED_CONFIG.SEMANTIC) {
      errors.push('Semantic layer configuration is missing');
    }

    // 验证领域配置
    if (!UNIFIED_CONFIG.DOMAIN) {
      errors.push('Domain layer configuration is missing');
    }

    // 验证环境配置
    const envConfig = this.getEnvironmentConfig();
    if (!envConfig) {
      errors.push(`Invalid environment configuration for: ${this.environment}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 获取配置统计信息
   */
  getConfigStats(): any {
    return {
      environment: this.environment,
      featureFlagsCount: this.featureFlags.size,
      enabledFeatures: Array.from(this.featureFlags.entries())
        .filter(([, enabled]) => enabled)
        .map(([feature]) => feature),
      layersCount: 4, // Foundation, Semantic, Domain, Application
      integrationCount: Object.keys(UNIFIED_CONFIG.INTEGRATIONS).length,
    };
  }

  /**
   * 重置配置到默认状态
   */
  resetToDefaults(): void {
    this.featureFlags.clear();
    this.initializeFeatureFlags();
  }
}

/**
 * 配置工具函数
 */
export class UnifiedConfigUtil {
  /**
   * 根据场景获取推荐配置
   */
  static getRecommendedConfig(scenario: 'high_performance' | 'high_reliability' | 'resource_efficient' | 'development'): any {
    const configManager = UnifiedConfigManager.getInstance();
    const baseConfig = configManager.getQuickConfig();

    switch (scenario) {
      case 'high_performance':
        return {
          timeouts: {
            request: baseConfig.TIMEOUTS.FAST_REQUEST_MS,
            database: baseConfig.TIMEOUTS.DATABASE_QUERY_MS / 2,
            cache: baseConfig.TIMEOUTS.CACHE_OPERATION_MS,
          },
          batch: {
            size: baseConfig.BATCH_SIZES.LARGE,
            concurrent: true,
          },
          cache: {
            ttl: baseConfig.CACHE_TTL.FREQUENT_SEC,
            aggressive: true,
          },
        };

      case 'high_reliability':
        return {
          timeouts: {
            request: baseConfig.TIMEOUTS.SLOW_REQUEST_MS,
            database: baseConfig.TIMEOUTS.DATABASE_QUERY_MS * 2,
            cache: baseConfig.TIMEOUTS.CACHE_OPERATION_MS * 2,
          },
          batch: {
            size: baseConfig.BATCH_SIZES.SMALL,
            concurrent: false,
          },
          cache: {
            ttl: baseConfig.CACHE_TTL.STATIC_SEC,
            conservative: true,
          },
          retry: baseConfig.RETRY_CONFIG.NETWORK_OPERATION,
        };

      case 'resource_efficient':
        return {
          timeouts: {
            request: baseConfig.TIMEOUTS.NORMAL_REQUEST_MS,
            database: baseConfig.TIMEOUTS.DATABASE_QUERY_MS,
            cache: baseConfig.TIMEOUTS.CACHE_OPERATION_MS,
          },
          batch: {
            size: baseConfig.BATCH_SIZES.SMALL,
            concurrent: false,
          },
          cache: {
            ttl: baseConfig.CACHE_TTL.STATIC_SEC,
            minimal: true,
          },
        };

      case 'development':
        return {
          timeouts: {
            request: baseConfig.TIMEOUTS.SLOW_REQUEST_MS,
            database: baseConfig.TIMEOUTS.DATABASE_QUERY_MS * 3,
            cache: baseConfig.TIMEOUTS.CACHE_OPERATION_MS * 5,
          },
          batch: {
            size: baseConfig.BATCH_SIZES.SMALL,
            concurrent: false,
          },
          cache: {
            ttl: baseConfig.CACHE_TTL.FREQUENT_SEC,
            debug: true,
          },
          logging: {
            level: 'debug',
            verbose: true,
          },
        };

      default:
        return baseConfig;
    }
  }

  /**
   * 合并配置对象
   */
  static mergeConfigs(...configs: any[]): any {
    return configs.reduce((merged, config) => {
      return this.deepMerge(merged, config);
    }, {});
  }

  /**
   * 深度合并对象
   */
  private static deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * 验证配置值范围
   */
  static validateConfigValue(value: any, type: 'timeout' | 'batch_size' | 'ttl' | 'port'): boolean {
    const limits = UNIFIED_CONFIG.FOUNDATION.LIMITS;
    
    switch (type) {
      case 'timeout':
        return typeof value === 'number' && value > 0 && value <= 600000; // 最大10分钟
      case 'batch_size':
        return typeof value === 'number' && 
               value >= limits.BATCH_LIMITS.MIN_BATCH_SIZE && 
               value <= limits.BATCH_LIMITS.MAX_BATCH_SIZE;
      case 'ttl':
        return typeof value === 'number' && value > 0 && value <= 86400; // 最大1天
      case 'port':
        return typeof value === 'number' && value >= 1024 && value <= 65535;
      default:
        return false;
    }
  }
}

/**
 * 类型定义
 */
export type UnifiedConfigType = typeof UNIFIED_CONFIG;
export type QuickAccessConfig = typeof UNIFIED_CONFIG.QUICK_ACCESS;
export type IntegrationConfig = typeof UNIFIED_CONFIG.INTEGRATIONS;
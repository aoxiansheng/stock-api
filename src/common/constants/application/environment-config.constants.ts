/**
 * 环境配置常量
 * 🚀 Application层 - 环境特定配置管理
 * 🌍 基于环境变量和部署环境的配置适配
 */

// Import shared enums instead of redefining them
import { Environment, LogLevel } from '../../types/enums/shared-base.enum';

/**
 * 环境检测配置
 * 🎯 自动检测和识别运行环境
 */
export const ENVIRONMENT_DETECTION = Object.freeze({
  // 环境变量映射
  ENV_VAR_MAPPING: {
    NODE_ENV: ['development', 'test', 'testing', 'staging', 'production'],
    APP_ENV: ['dev', 'test', 'stage', 'prod'],
    DEPLOY_ENV: ['local', 'dev', 'test', 'staging', 'production'],
  } as const,

  // 环境标识符映射
  IDENTIFIER_MAPPING: {
    [Environment.DEVELOPMENT]: ['dev', 'develop', 'development', 'local'],
    [Environment.TEST]: ['test', 'testing', 'spec'],
    [Environment.STAGING]: ['stage', 'staging', 'pre', 'preprod'],
    [Environment.PRODUCTION]: ['prod', 'production', 'live'],
  } as const,

  // 默认环境配置
  DEFAULT_ENVIRONMENT: Environment.DEVELOPMENT,

  // 环境检测优先级
  DETECTION_PRIORITY: [
    'NODE_ENV',
    'APP_ENV', 
    'DEPLOY_ENV',
    'ENVIRONMENT',
  ] as const,
});

/**
 * 环境特定功能配置
 * 🎯 不同环境下的功能开关和行为配置
 */
export const ENVIRONMENT_FEATURES = Object.freeze({
  // 开发环境特性
  [Environment.DEVELOPMENT]: {
    // 调试功能
    DEBUG: {
      ENABLE_DEBUG_LOGS: true,
      ENABLE_VERBOSE_ERRORS: true,
      ENABLE_STACK_TRACES: true,
      ENABLE_REQUEST_LOGGING: true,
      ENABLE_SQL_LOGGING: true,
      ENABLE_CACHE_LOGGING: true,
    },
    
    // 性能优化
    PERFORMANCE: {
      ENABLE_HOT_RELOAD: true,
      ENABLE_SOURCE_MAPS: true,
      DISABLE_MINIFICATION: true,
      DISABLE_COMPRESSION: true,
      SKIP_AUTH_FOR_TESTING: false, // 开发环境也要验证认证
    },
    
    // 开发工具
    DEV_TOOLS: {
      ENABLE_API_DOCS: true,
      ENABLE_SWAGGER_UI: true,
      ENABLE_GRAPHQL_PLAYGROUND: true,
      ENABLE_METRICS_ENDPOINT: true,
      ENABLE_DEBUG_ENDPOINT: true,
    },
    
    // 安全设置（开发环境宽松一些）
    SECURITY: {
      CORS_ALLOW_ALL: true,
      DISABLE_CSRF: true,
      ALLOW_HTTP: true,
      RELAXED_VALIDATION: true,
    },
  },

  // 测试环境特性
  [Environment.TEST]: {
    // 调试功能
    DEBUG: {
      ENABLE_DEBUG_LOGS: true,
      ENABLE_VERBOSE_ERRORS: true,
      ENABLE_STACK_TRACES: true,
      ENABLE_REQUEST_LOGGING: false, // 测试环境减少日志
      ENABLE_SQL_LOGGING: false,
      ENABLE_CACHE_LOGGING: false,
    },
    
    // 性能优化
    PERFORMANCE: {
      ENABLE_HOT_RELOAD: false,
      ENABLE_SOURCE_MAPS: true,
      DISABLE_MINIFICATION: false,
      DISABLE_COMPRESSION: false,
      SKIP_AUTH_FOR_TESTING: true, // 测试环境可以跳过认证
    },
    
    // 开发工具
    DEV_TOOLS: {
      ENABLE_API_DOCS: true,
      ENABLE_SWAGGER_UI: true,
      ENABLE_GRAPHQL_PLAYGROUND: false,
      ENABLE_METRICS_ENDPOINT: true,
      ENABLE_DEBUG_ENDPOINT: false,
    },
    
    // 安全设置
    SECURITY: {
      CORS_ALLOW_ALL: true,
      DISABLE_CSRF: true,
      ALLOW_HTTP: true,
      RELAXED_VALIDATION: false,
    },
  },

  // 预发布环境特性
  [Environment.STAGING]: {
    // 调试功能（生产环境类似，但保留一些调试能力）
    DEBUG: {
      ENABLE_DEBUG_LOGS: false,
      ENABLE_VERBOSE_ERRORS: false,
      ENABLE_STACK_TRACES: false,
      ENABLE_REQUEST_LOGGING: false,
      ENABLE_SQL_LOGGING: false,
      ENABLE_CACHE_LOGGING: false,
    },
    
    // 性能优化
    PERFORMANCE: {
      ENABLE_HOT_RELOAD: false,
      ENABLE_SOURCE_MAPS: false,
      DISABLE_MINIFICATION: false,
      DISABLE_COMPRESSION: false,
      SKIP_AUTH_FOR_TESTING: false,
    },
    
    // 开发工具
    DEV_TOOLS: {
      ENABLE_API_DOCS: true,
      ENABLE_SWAGGER_UI: false,
      ENABLE_GRAPHQL_PLAYGROUND: false,
      ENABLE_METRICS_ENDPOINT: true,
      ENABLE_DEBUG_ENDPOINT: false,
    },
    
    // 安全设置
    SECURITY: {
      CORS_ALLOW_ALL: false,
      DISABLE_CSRF: false,
      ALLOW_HTTP: false,
      RELAXED_VALIDATION: false,
    },
  },

  // 生产环境特性
  [Environment.PRODUCTION]: {
    // 调试功能（生产环境全部关闭）
    DEBUG: {
      ENABLE_DEBUG_LOGS: false,
      ENABLE_VERBOSE_ERRORS: false,
      ENABLE_STACK_TRACES: false,
      ENABLE_REQUEST_LOGGING: false,
      ENABLE_SQL_LOGGING: false,
      ENABLE_CACHE_LOGGING: false,
    },
    
    // 性能优化
    PERFORMANCE: {
      ENABLE_HOT_RELOAD: false,
      ENABLE_SOURCE_MAPS: false,
      DISABLE_MINIFICATION: false,
      DISABLE_COMPRESSION: false,
      SKIP_AUTH_FOR_TESTING: false,
    },
    
    // 开发工具（生产环境全部关闭）
    DEV_TOOLS: {
      ENABLE_API_DOCS: false,
      ENABLE_SWAGGER_UI: false,
      ENABLE_GRAPHQL_PLAYGROUND: false,
      ENABLE_METRICS_ENDPOINT: false, // 生产环境通过专门的监控系统
      ENABLE_DEBUG_ENDPOINT: false,
    },
    
    // 安全设置（生产环境最严格）
    SECURITY: {
      CORS_ALLOW_ALL: false,
      DISABLE_CSRF: false,
      ALLOW_HTTP: false,
      RELAXED_VALIDATION: false,
    },
  },
});

/**
 * 环境特定资源限制
 * 🎯 不同环境下的资源使用限制
 */
export const ENVIRONMENT_RESOURCE_LIMITS = Object.freeze({
  // 开发环境资源限制
  [Environment.DEVELOPMENT]: {
    MEMORY: {
      MAX_HEAP_SIZE_MB: 512,           // 512MB堆内存
      MAX_CACHE_SIZE_MB: 128,          // 128MB缓存
      GC_THRESHOLD_MB: 256,            // 256MB触发GC
    },
    CPU: {
      MAX_WORKERS: 2,                  // 最多2个工作进程
      MAX_CONCURRENT_REQUESTS: 10,     // 最多10个并发请求
      REQUEST_TIMEOUT_MS: 60000,       // 60秒请求超时
    },
    STORAGE: {
      MAX_LOG_SIZE_MB: 100,            // 100MB日志大小
      MAX_TEMP_SIZE_MB: 500,           // 500MB临时文件
      LOG_RETENTION_DAYS: 7,           // 7天日志保留
    },
    NETWORK: {
      MAX_CONNECTIONS: 50,             // 50个最大连接
      CONNECTION_POOL_SIZE: 5,         // 5个连接池大小
      SOCKET_TIMEOUT_MS: 30000,        // 30秒Socket超时
    },
  },

  // 测试环境资源限制
  [Environment.TEST]: {
    MEMORY: {
      MAX_HEAP_SIZE_MB: 256,           // 256MB堆内存（测试环境更小）
      MAX_CACHE_SIZE_MB: 64,           // 64MB缓存
      GC_THRESHOLD_MB: 128,            // 128MB触发GC
    },
    CPU: {
      MAX_WORKERS: 1,                  // 最多1个工作进程
      MAX_CONCURRENT_REQUESTS: 5,      // 最多5个并发请求
      REQUEST_TIMEOUT_MS: 30000,       // 30秒请求超时
    },
    STORAGE: {
      MAX_LOG_SIZE_MB: 50,             // 50MB日志大小
      MAX_TEMP_SIZE_MB: 200,           // 200MB临时文件
      LOG_RETENTION_DAYS: 3,           // 3天日志保留
    },
    NETWORK: {
      MAX_CONNECTIONS: 25,             // 25个最大连接
      CONNECTION_POOL_SIZE: 2,         // 2个连接池大小
      SOCKET_TIMEOUT_MS: 15000,        // 15秒Socket超时
    },
  },

  // 预发布环境资源限制
  [Environment.STAGING]: {
    MEMORY: {
      MAX_HEAP_SIZE_MB: 2048,          // 2GB堆内存
      MAX_CACHE_SIZE_MB: 512,          // 512MB缓存
      GC_THRESHOLD_MB: 1024,           // 1GB触发GC
    },
    CPU: {
      MAX_WORKERS: 4,                  // 最多4个工作进程
      MAX_CONCURRENT_REQUESTS: 100,    // 最多100个并发请求
      REQUEST_TIMEOUT_MS: 30000,       // 30秒请求超时
    },
    STORAGE: {
      MAX_LOG_SIZE_MB: 1000,           // 1GB日志大小
      MAX_TEMP_SIZE_MB: 2000,          // 2GB临时文件
      LOG_RETENTION_DAYS: 30,          // 30天日志保留
    },
    NETWORK: {
      MAX_CONNECTIONS: 200,            // 200个最大连接
      CONNECTION_POOL_SIZE: 20,        // 20个连接池大小
      SOCKET_TIMEOUT_MS: 30000,        // 30秒Socket超时
    },
  },

  // 生产环境资源限制
  [Environment.PRODUCTION]: {
    MEMORY: {
      MAX_HEAP_SIZE_MB: 4096,          // 4GB堆内存
      MAX_CACHE_SIZE_MB: 1024,         // 1GB缓存
      GC_THRESHOLD_MB: 2048,           // 2GB触发GC
    },
    CPU: {
      MAX_WORKERS: 8,                  // 最多8个工作进程
      MAX_CONCURRENT_REQUESTS: 1000,   // 最多1000个并发请求
      REQUEST_TIMEOUT_MS: 30000,       // 30秒请求超时
    },
    STORAGE: {
      MAX_LOG_SIZE_MB: 5000,           // 5GB日志大小
      MAX_TEMP_SIZE_MB: 10000,         // 10GB临时文件
      LOG_RETENTION_DAYS: 90,          // 90天日志保留
    },
    NETWORK: {
      MAX_CONNECTIONS: 1000,           // 1000个最大连接
      CONNECTION_POOL_SIZE: 100,       // 100个连接池大小
      SOCKET_TIMEOUT_MS: 30000,        // 30秒Socket超时
    },
  },
});

/**
 * 环境配置管理类
 */
export class EnvironmentConfigManager {
  private static instance: EnvironmentConfigManager;
  private currentEnvironment: Environment;
  private envVariables: Map<string, string>;
  
  private constructor() {
    this.currentEnvironment = this.detectEnvironment();
    this.envVariables = new Map();
    this.loadEnvironmentVariables();
  }

  /**
   * 获取环境配置管理器实例
   */
  static getInstance(): EnvironmentConfigManager {
    if (!EnvironmentConfigManager.instance) {
      EnvironmentConfigManager.instance = new EnvironmentConfigManager();
    }
    return EnvironmentConfigManager.instance;
  }

  /**
   * 自动检测当前环境
   */
  private detectEnvironment(): Environment {
    const { ENV_VAR_MAPPING, IDENTIFIER_MAPPING, DETECTION_PRIORITY, DEFAULT_ENVIRONMENT } = ENVIRONMENT_DETECTION;

    // 按优先级检测环境变量
    for (const envVar of DETECTION_PRIORITY) {
      const value = process.env[envVar]?.toLowerCase();
      if (value) {
        // 检查值是否匹配已知环境标识符
        for (const [env, identifiers] of Object.entries(IDENTIFIER_MAPPING) as [string, readonly string[]][]) {
          if ((identifiers as readonly string[]).includes(value)) {
            return env as Environment;
          }
        }
      }
    }

    return DEFAULT_ENVIRONMENT;
  }

  /**
   * 加载环境变量
   */
  private loadEnvironmentVariables(): void {
    // 加载所有环境变量
    Object.entries(process.env).forEach(([key, value]) => {
      if (value !== undefined) {
        this.envVariables.set(key, value);
      }
    });
  }

  /**
   * 获取当前环境
   */
  getCurrentEnvironment(): Environment {
    return this.currentEnvironment;
  }

  /**
   * 检查是否为指定环境
   */
  isEnvironment(env: Environment): boolean {
    return this.currentEnvironment === env;
  }

  /**
   * 检查是否为开发环境
   */
  isDevelopment(): boolean {
    return this.isEnvironment(Environment.DEVELOPMENT);
  }

  /**
   * 检查是否为测试环境
   */
  isTesting(): boolean {
    return this.isEnvironment(Environment.TEST);
  }

  /**
   * 检查是否为预发布环境
   */
  isStaging(): boolean {
    return this.isEnvironment(Environment.STAGING);
  }

  /**
   * 检查是否为生产环境
   */
  isProduction(): boolean {
    return this.isEnvironment(Environment.PRODUCTION);
  }

  /**
   * 获取环境特性配置
   */
  getEnvironmentFeatures(): any {
    return ENVIRONMENT_FEATURES[this.currentEnvironment] || ENVIRONMENT_FEATURES[Environment.DEVELOPMENT];
  }

  /**
   * 获取环境资源限制
   */
  getResourceLimits(): any {
    return ENVIRONMENT_RESOURCE_LIMITS[this.currentEnvironment] || ENVIRONMENT_RESOURCE_LIMITS[Environment.DEVELOPMENT];
  }

  /**
   * 获取环境变量值
   */
  getEnvVariable(key: string, defaultValue?: string): string | undefined {
    return this.envVariables.get(key) || defaultValue;
  }

  /**
   * 获取布尔型环境变量
   */
  getBooleanEnvVariable(key: string, defaultValue: boolean = false): boolean {
    const value = this.getEnvVariable(key);
    if (!value) return defaultValue;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }

  /**
   * 获取数字型环境变量
   */
  getNumberEnvVariable(key: string, defaultValue: number = 0): number {
    const value = this.getEnvVariable(key);
    if (!value) return defaultValue;
    const numValue = parseInt(value, 10);
    return isNaN(numValue) ? defaultValue : numValue;
  }

  /**
   * 检查特性是否启用
   */
  isFeatureEnabled(category: string, feature: string): boolean {
    const features = this.getEnvironmentFeatures();
    return features[category]?.[feature] || false;
  }

  /**
   * 获取推荐的日志级别
   */
  getRecommendedLogLevel(): LogLevel {
    switch (this.currentEnvironment) {
      case Environment.DEVELOPMENT:
        return LogLevel.DEBUG;
      case Environment.TEST:
        return LogLevel.INFO;
      case Environment.STAGING:
        return LogLevel.WARN;
      case Environment.PRODUCTION:
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  /**
   * 获取环境配置摘要
   */
  getConfigSummary(): any {
    return {
      environment: this.currentEnvironment,
      features: this.getEnvironmentFeatures(),
      resourceLimits: this.getResourceLimits(),
      logLevel: this.getRecommendedLogLevel(),
      isDevelopment: this.isDevelopment(),
      isProduction: this.isProduction(),
      envVariableCount: this.envVariables.size,
    };
  }

  /**
   * 验证环境配置
   */
  validateEnvironmentConfig(): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // 检查关键环境变量
    const requiredVars = ['NODE_ENV'];
    const recommendedVars = ['PORT', 'HOST', 'DATABASE_URL', 'REDIS_URL'];

    for (const varName of requiredVars) {
      if (!this.getEnvVariable(varName)) {
        warnings.push(`Missing required environment variable: ${varName}`);
      }
    }

    for (const varName of recommendedVars) {
      if (!this.getEnvVariable(varName)) {
        warnings.push(`Missing recommended environment variable: ${varName}`);
      }
    }

    // 检查生产环境特殊要求
    if (this.isProduction()) {
      if (this.isFeatureEnabled('DEBUG', 'ENABLE_DEBUG_LOGS')) {
        warnings.push('Debug logs are enabled in production environment');
      }
      if (this.isFeatureEnabled('DEV_TOOLS', 'ENABLE_SWAGGER_UI')) {
        warnings.push('Swagger UI is enabled in production environment');
      }
      if (this.isFeatureEnabled('SECURITY', 'CORS_ALLOW_ALL')) {
        warnings.push('CORS allow all is enabled in production environment');
      }
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }
}

/**
 * 环境配置工具函数
 */
export class EnvironmentConfigUtil {
  /**
   * 创建环境特定配置
   */
  static createEnvironmentConfig(environment: Environment): any {
    return {
      environment,
      features: ENVIRONMENT_FEATURES[environment],
      resourceLimits: ENVIRONMENT_RESOURCE_LIMITS[environment],
    };
  }

  /**
   * 比较环境配置差异
   */
  static compareEnvironmentConfigs(env1: Environment, env2: Environment): any {
    const config1 = this.createEnvironmentConfig(env1);
    const config2 = this.createEnvironmentConfig(env2);

    const differences: any = {
      features: {},
      resourceLimits: {},
    };

    // 比较特性配置
    this.deepCompare(config1.features, config2.features, differences.features);
    
    // 比较资源限制
    this.deepCompare(config1.resourceLimits, config2.resourceLimits, differences.resourceLimits);

    return differences;
  }

  /**
   * 深度比较对象
   */
  private static deepCompare(obj1: any, obj2: any, result: any): void {
    for (const key in obj1) {
      if (obj1[key] !== obj2[key]) {
        if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
          result[key] = {};
          this.deepCompare(obj1[key], obj2[key], result[key]);
        } else {
          result[key] = { from: obj1[key], to: obj2[key] };
        }
      }
    }
  }

  /**
   * 获取环境迁移建议
   */
  static getEnvironmentMigrationAdvice(fromEnv: Environment, toEnv: Environment): string[] {
    const advice: string[] = [];

    if (fromEnv === Environment.DEVELOPMENT && toEnv === Environment.PRODUCTION) {
      advice.push('禁用所有调试功能');
      advice.push('启用安全功能（CORS、CSRF等）');
      advice.push('增加资源限制配置');
      advice.push('禁用开发工具端点');
      advice.push('设置适当的日志级别');
    }

    if (fromEnv === Environment.TEST && toEnv === Environment.PRODUCTION) {
      advice.push('确保认证功能正常启用');
      advice.push('调整并发和资源限制');
      advice.push('禁用测试相关的特殊配置');
    }

    return advice;
  }
}

/**
 * 类型定义
 */
export type EnvironmentFeatures = typeof ENVIRONMENT_FEATURES;
export type EnvironmentResourceLimits = typeof ENVIRONMENT_RESOURCE_LIMITS;
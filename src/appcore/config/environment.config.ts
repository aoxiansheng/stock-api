/**
 * 环境配置
 * 🏛️ AppCore层 - 应用级环境配置管理
 * 🌍 基于环境变量和部署环境的配置适配
 * 
 * @description 
 * 从src/common/constants/application/environment-config.constants.ts迁移
 * 遵循四层配置体系，属于第二层应用配置
 * 
 * @author Claude Code Assistant
 * @date 2025-01-16
 */

import { registerAs } from '@nestjs/config';
import { IsEnum, IsBoolean, IsNumber, IsString, validateSync, IsOptional } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * 环境枚举
 */
export enum Environment {
  DEVELOPMENT = 'development',
  TEST = 'test',
  STAGING = 'staging',
  PRODUCTION = 'production',
}

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * 环境配置验证类
 * 🔒 运行时类型安全和环境验证
 */
export class EnvironmentConfigValidation {
  /**
   * 当前环境
   */
  @IsEnum(Environment, { message: '环境必须是 development, test, staging, production 之一' })
  environment: Environment = this.detectEnvironment();

  /**
   * 调试功能配置
   */
  @IsBoolean({ message: '调试日志开关必须是布尔值' })
  enableDebugLogs: boolean = this.getEnvironmentDefault('DEBUG_LOGS', false);

  @IsBoolean({ message: '详细错误开关必须是布尔值' })
  enableVerboseErrors: boolean = this.getEnvironmentDefault('VERBOSE_ERRORS', false);

  @IsBoolean({ message: '堆栈跟踪开关必须是布尔值' })
  enableStackTraces: boolean = this.getEnvironmentDefault('STACK_TRACES', false);

  @IsBoolean({ message: '请求日志开关必须是布尔值' })
  enableRequestLogging: boolean = this.getEnvironmentDefault('REQUEST_LOGGING', false);

  /**
   * 性能优化配置
   */
  @IsBoolean({ message: '热重载开关必须是布尔值' })
  enableHotReload: boolean = this.getEnvironmentDefault('HOT_RELOAD', false);

  @IsBoolean({ message: 'Source Map开关必须是布尔值' })
  enableSourceMaps: boolean = this.getEnvironmentDefault('SOURCE_MAPS', false);

  @IsBoolean({ message: '跳过认证开关必须是布尔值' })
  skipAuthForTesting: boolean = this.getEnvironmentDefault('SKIP_AUTH_TESTING', false);

  /**
   * 开发工具配置
   */
  @IsBoolean({ message: 'API文档开关必须是布尔值' })
  enableApiDocs: boolean = this.getEnvironmentDefault('API_DOCS', true);

  @IsBoolean({ message: 'Swagger UI开关必须是布尔值' })
  enableSwaggerUi: boolean = this.getEnvironmentDefault('SWAGGER_UI', false);

  @IsBoolean({ message: '指标端点开关必须是布尔值' })
  enableMetricsEndpoint: boolean = this.getEnvironmentDefault('METRICS_ENDPOINT', true);

  /**
   * 安全配置
   */
  @IsBoolean({ message: 'CORS全开开关必须是布尔值' })
  corsAllowAll: boolean = this.getEnvironmentDefault('CORS_ALLOW_ALL', false);

  @IsBoolean({ message: '禁用CSRF开关必须是布尔值' })
  disableCsrf: boolean = this.getEnvironmentDefault('DISABLE_CSRF', false);

  @IsBoolean({ message: '允许HTTP开关必须是布尔值' })
  allowHttp: boolean = this.getEnvironmentDefault('ALLOW_HTTP', false);

  /**
   * 资源限制配置
   */
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '最大堆内存必须是有效数字' })
  @IsOptional()
  maxHeapSizeMb?: number = this.getNumericEnvironmentDefault('MAX_HEAP_SIZE_MB');

  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '最大缓存大小必须是有效数字' })
  @IsOptional()
  maxCacheSizeMb?: number = this.getNumericEnvironmentDefault('MAX_CACHE_SIZE_MB');

  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '最大工作进程数必须是有效数字' })
  @IsOptional()
  maxWorkers?: number = this.getNumericEnvironmentDefault('MAX_WORKERS');

  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '最大并发请求数必须是有效数字' })
  @IsOptional()
  maxConcurrentRequests?: number = this.getNumericEnvironmentDefault('MAX_CONCURRENT_REQUESTS');

  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: '请求超时时间必须是有效数字' })
  @IsOptional()
  requestTimeoutMs?: number = this.getNumericEnvironmentDefault('REQUEST_TIMEOUT_MS', 30000);

  /**
   * 检测当前环境
   */
  private detectEnvironment(): Environment {
    const detectionPriority = ['NODE_ENV', 'APP_ENV', 'DEPLOY_ENV', 'ENVIRONMENT'];
    const identifierMapping = {
      [Environment.DEVELOPMENT]: ['dev', 'develop', 'development', 'local'],
      [Environment.TEST]: ['test', 'testing', 'spec'],
      [Environment.STAGING]: ['stage', 'staging', 'pre', 'preprod'],
      [Environment.PRODUCTION]: ['prod', 'production', 'live'],
    };

    for (const envVar of detectionPriority) {
      const value = process.env[envVar]?.toLowerCase();
      if (value) {
        for (const [env, identifiers] of Object.entries(identifierMapping)) {
          if (identifiers.includes(value)) {
            return env as Environment;
          }
        }
      }
    }

    return Environment.DEVELOPMENT;
  }

  /**
   * 获取环境特定的默认值
   */
  private getEnvironmentDefault(feature: string, fallback: boolean): boolean {
    const envValue = process.env[`ENV_${feature}`];
    if (envValue !== undefined) {
      return ['true', '1', 'yes', 'on'].includes(envValue.toLowerCase());
    }

    // 根据环境返回默认值
    switch (this.environment) {
      case Environment.DEVELOPMENT:
        return this.getDevelopmentDefault(feature, fallback);
      case Environment.TEST:
        return this.getTestDefault(feature, fallback);
      case Environment.STAGING:
        return this.getStagingDefault(feature, fallback);
      case Environment.PRODUCTION:
        return this.getProductionDefault(feature, fallback);
      default:
        return fallback;
    }
  }

  /**
   * 获取数值型环境变量
   */
  private getNumericEnvironmentDefault(envKey: string, fallback?: number): number | undefined {
    const envValue = process.env[`ENV_${envKey}`];
    if (envValue !== undefined) {
      const numValue = parseInt(envValue, 10);
      return isNaN(numValue) ? fallback : numValue;
    }
    return fallback;
  }

  /**
   * 开发环境默认值
   */
  private getDevelopmentDefault(feature: string, fallback: boolean): boolean {
    const devDefaults: Record<string, boolean> = {
      DEBUG_LOGS: true,
      VERBOSE_ERRORS: true,
      STACK_TRACES: true,
      REQUEST_LOGGING: true,
      HOT_RELOAD: true,
      SOURCE_MAPS: true,
      API_DOCS: true,
      SWAGGER_UI: true,
      METRICS_ENDPOINT: true,
      CORS_ALLOW_ALL: true,
      DISABLE_CSRF: true,
      ALLOW_HTTP: true,
    };
    return devDefaults[feature] ?? fallback;
  }

  /**
   * 测试环境默认值
   */
  private getTestDefault(feature: string, fallback: boolean): boolean {
    const testDefaults: Record<string, boolean> = {
      DEBUG_LOGS: true,
      VERBOSE_ERRORS: true,
      STACK_TRACES: true,
      REQUEST_LOGGING: false,
      SKIP_AUTH_TESTING: true,
      API_DOCS: true,
      SWAGGER_UI: true,
      METRICS_ENDPOINT: true,
      CORS_ALLOW_ALL: true,
      DISABLE_CSRF: true,
      ALLOW_HTTP: true,
    };
    return testDefaults[feature] ?? fallback;
  }

  /**
   * 预发布环境默认值
   */
  private getStagingDefault(feature: string, fallback: boolean): boolean {
    const stagingDefaults: Record<string, boolean> = {
      API_DOCS: true,
      METRICS_ENDPOINT: true,
    };
    return stagingDefaults[feature] ?? fallback;
  }

  /**
   * 生产环境默认值
   */
  private getProductionDefault(feature: string, fallback: boolean): boolean {
    // 生产环境所有调试和开发功能都默认关闭
    return fallback;
  }
}

/**
 * 环境配置注册
 * 🎯 NestJS标准配置模式，支持依赖注入
 */
export default registerAs('environment', (): EnvironmentConfigValidation => {
  const config = new EnvironmentConfigValidation();
  const errors = validateSync(config, { whitelist: true });

  if (errors.length > 0) {
    const errorMessages = errors
      .map(error => Object.values(error.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`环境配置验证失败: ${errorMessages}`);
  }

  return config;
});

/**
 * 类型导出
 */
export type EnvironmentConfig = EnvironmentConfigValidation;

/**
 * 环境配置助手类
 * 🛠️ 提供便捷的环境检查和配置访问方法
 */
export class EnvironmentHelper {
  /**
   * 检查是否为指定环境
   */
  static isEnvironment(env: Environment): boolean {
    const config = new EnvironmentConfigValidation();
    return config.environment === env;
  }

  /**
   * 检查是否为开发环境
   */
  static isDevelopment(): boolean {
    return this.isEnvironment(Environment.DEVELOPMENT);
  }

  /**
   * 检查是否为测试环境
   */
  static isTesting(): boolean {
    return this.isEnvironment(Environment.TEST);
  }

  /**
   * 检查是否为预发布环境
   */
  static isStaging(): boolean {
    return this.isEnvironment(Environment.STAGING);
  }

  /**
   * 检查是否为生产环境
   */
  static isProduction(): boolean {
    return this.isEnvironment(Environment.PRODUCTION);
  }

  /**
   * 获取推荐的日志级别
   */
  static getRecommendedLogLevel(): LogLevel {
    const config = new EnvironmentConfigValidation();
    switch (config.environment) {
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
   * 验证环境配置
   */
  static validateEnvironmentConfig(): { valid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const config = new EnvironmentConfigValidation();

    // 检查关键环境变量
    const requiredVars = ['NODE_ENV'];
    const recommendedVars = ['PORT', 'HOST', 'DATABASE_URL', 'REDIS_URL'];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        warnings.push(`Missing required environment variable: ${varName}`);
      }
    }

    for (const varName of recommendedVars) {
      if (!process.env[varName]) {
        warnings.push(`Missing recommended environment variable: ${varName}`);
      }
    }

    // 检查生产环境特殊要求
    if (config.environment === Environment.PRODUCTION) {
      if (config.enableDebugLogs) {
        warnings.push('Debug logs are enabled in production environment');
      }
      if (config.enableSwaggerUi) {
        warnings.push('Swagger UI is enabled in production environment');
      }
      if (config.corsAllowAll) {
        warnings.push('CORS allow all is enabled in production environment');
      }
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  /**
   * 获取环境配置摘要
   */
  static getConfigSummary(): any {
    const config = new EnvironmentConfigValidation();
    return {
      environment: config.environment,
      isDevelopment: this.isDevelopment(),
      isProduction: this.isProduction(),
      logLevel: this.getRecommendedLogLevel(),
      debug: {
        enableDebugLogs: config.enableDebugLogs,
        enableVerboseErrors: config.enableVerboseErrors,
        enableStackTraces: config.enableStackTraces,
        enableRequestLogging: config.enableRequestLogging,
      },
      security: {
        corsAllowAll: config.corsAllowAll,
        disableCsrf: config.disableCsrf,
        allowHttp: config.allowHttp,
      },
      devTools: {
        enableApiDocs: config.enableApiDocs,
        enableSwaggerUi: config.enableSwaggerUi,
        enableMetricsEndpoint: config.enableMetricsEndpoint,
      },
    };
  }
}

/**
 * 配置文档和使用说明
 * 
 * @example
 * ```typescript
 * // 在服务中注入使用
 * import { ConfigType } from '@nestjs/config';
 * import environmentConfig from '@appcore/config/environment.config';
 * 
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     @Inject(environmentConfig.KEY)
 *     private readonly envConfig: ConfigType<typeof environmentConfig>,
 *   ) {}
 * 
 *   async checkEnvironment() {
 *     if (this.envConfig.environment === Environment.PRODUCTION) {
 *       // 生产环境逻辑
 *     }
 *   }
 * }
 * ```
 * 
 * @environment
 * ```bash
 * # .env文件配置
 * NODE_ENV=development                   # 环境标识
 * ENV_DEBUG_LOGS=true                   # 调试日志开关
 * ENV_SWAGGER_UI=true                   # Swagger UI开关
 * ENV_CORS_ALLOW_ALL=true               # CORS全开开关
 * ENV_MAX_HEAP_SIZE_MB=1024            # 最大堆内存(MB)
 * ENV_REQUEST_TIMEOUT_MS=30000         # 请求超时(毫秒)
 * ```
 */
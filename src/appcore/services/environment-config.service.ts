/**
 * 环境配置服务
 * 🏛️ AppCore层 - 应用级环境配置管理服务
 *
 * @description
 * 从src/common/constants/application/environment-config.constants.ts中的
 * EnvironmentConfigManager迁移而来，现在使用NestJS依赖注入模式
 *
 * @author Claude Code Assistant
 * @date 2025-01-16
 */

import { Injectable, Inject } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import environmentConfig, {
  Environment,
  LogLevel,
  EnvironmentHelper,
} from "../config/environment.config";

/**
 * 环境配置服务
 * 🎯 提供便捷的环境配置访问和管理功能
 * 🔄 替代原有的EnvironmentConfigManager单例模式
 */
@Injectable()
export class EnvironmentConfigService {
  private readonly envVariables: Map<string, string>;

  constructor(
    @Inject(environmentConfig.KEY)
    private readonly envConfig: ConfigType<typeof environmentConfig>,
  ) {
    this.envVariables = new Map();
    this.loadEnvironmentVariables();
  }

  /**
   * 加载环境变量
   */
  private loadEnvironmentVariables(): void {
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
    return this.envConfig.environment;
  }

  /**
   * 检查是否为指定环境
   */
  isEnvironment(env: Environment): boolean {
    return this.envConfig.environment === env;
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
    return {
      debug: {
        enableDebugLogs: this.envConfig.enableDebugLogs,
        enableVerboseErrors: this.envConfig.enableVerboseErrors,
        enableStackTraces: this.envConfig.enableStackTraces,
        enableRequestLogging: this.envConfig.enableRequestLogging,
      },
      performance: {
        enableHotReload: this.envConfig.enableHotReload,
        enableSourceMaps: this.envConfig.enableSourceMaps,
        skipAuthForTesting: this.envConfig.skipAuthForTesting,
      },
      devTools: {
        enableApiDocs: this.envConfig.enableApiDocs,
        enableSwaggerUi: this.envConfig.enableSwaggerUi,
        enableMetricsEndpoint: this.envConfig.enableMetricsEndpoint,
      },
      security: {
        corsAllowAll: this.envConfig.corsAllowAll,
        disableCsrf: this.envConfig.disableCsrf,
        allowHttp: this.envConfig.allowHttp,
      },
    };
  }

  /**
   * 获取环境资源限制
   */
  getResourceLimits(): any {
    return {
      memory: {
        maxHeapSizeMb: this.envConfig.maxHeapSizeMb,
        maxCacheSizeMb: this.envConfig.maxCacheSizeMb,
      },
      cpu: {
        maxWorkers: this.envConfig.maxWorkers,
        maxConcurrentRequests: this.envConfig.maxConcurrentRequests,
        requestTimeoutMs: this.envConfig.requestTimeoutMs,
      },
    };
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
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
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
    return EnvironmentHelper.getRecommendedLogLevel();
  }

  /**
   * 获取环境配置摘要
   */
  getConfigSummary(): any {
    return {
      environment: this.envConfig.environment,
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
    return EnvironmentHelper.validateEnvironmentConfig();
  }

  /**
   * 刷新环境变量（用于热重载）
   */
  refreshEnvironmentVariables(): void {
    this.envVariables.clear();
    this.loadEnvironmentVariables();
  }

  /**
   * 获取环境变量统计
   */
  getEnvironmentStats(): any {
    const totalVars = this.envVariables.size;
    const appVars = Array.from(this.envVariables.keys()).filter(
      (key) => key.startsWith("APP_") || key.startsWith("ENV_"),
    ).length;
    const systemVars = totalVars - appVars;

    return {
      total: totalVars,
      application: appVars,
      system: systemVars,
      environment: this.envConfig.environment,
      configLoaded: true,
    };
  }

  /**
   * 检查是否为安全环境（生产或预发布）
   */
  isSecureEnvironment(): boolean {
    return this.isProduction() || this.isStaging();
  }

  /**
   * 检查是否为开发类环境（开发或测试）
   */
  isDevelopmentLike(): boolean {
    return this.isDevelopment() || this.isTesting();
  }

  /**
   * 获取环境迁移建议
   */
  getEnvironmentMigrationAdvice(targetEnv: Environment): string[] {
    const currentEnv = this.envConfig.environment;
    const advice: string[] = [];

    if (
      currentEnv === Environment.DEVELOPMENT &&
      targetEnv === Environment.PRODUCTION
    ) {
      advice.push("禁用所有调试功能");
      advice.push("启用安全功能（CORS、CSRF等）");
      advice.push("增加资源限制配置");
      advice.push("禁用开发工具端点");
      advice.push("设置适当的日志级别");
    }

    if (
      currentEnv === Environment.TEST &&
      targetEnv === Environment.PRODUCTION
    ) {
      advice.push("确保认证功能正常启用");
      advice.push("调整并发和资源限制");
      advice.push("禁用测试相关的特殊配置");
    }

    if (
      currentEnv === Environment.STAGING &&
      targetEnv === Environment.PRODUCTION
    ) {
      advice.push("最终安全检查");
      advice.push("禁用API文档端点");
      advice.push("确认监控和告警配置");
    }

    return advice;
  }

  /**
   * 获取环境特定的配置建议
   */
  getConfigurationRecommendations(): string[] {
    const recommendations: string[] = [];
    const validation = this.validateEnvironmentConfig();

    // 添加验证警告
    recommendations.push(...validation.warnings);

    // 环境特定建议
    if (this.isDevelopment()) {
      recommendations.push("开发环境：建议启用热重载和详细日志");
      recommendations.push("开发环境：可以使用宽松的安全配置");
    }

    if (this.isProduction()) {
      recommendations.push("生产环境：确保所有调试功能已关闭");
      recommendations.push("生产环境：使用严格的安全配置");
      recommendations.push("生产环境：配置适当的资源限制");
    }

    return recommendations;
  }
}

/**
 * 环境配置模块导出
 * 🎯 便于在其他模块中导入使用
 */
export const EnvironmentConfigServiceProvider = {
  provide: EnvironmentConfigService,
  useClass: EnvironmentConfigService,
};

/**
 * 使用说明
 *
 * @example
 * ```typescript
 * // 在模块中注册
 * @Module({
 *   imports: [ConfigModule.forFeature(environmentConfig)],
 *   providers: [EnvironmentConfigService],
 *   exports: [EnvironmentConfigService],
 * })
 * export class AppCoreModule {}
 *
 * // 在服务中使用
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     private readonly envConfigService: EnvironmentConfigService,
 *   ) {}
 *
 *   async doSomething() {
 *     if (this.envConfigService.isProduction()) {
 *       // 生产环境逻辑
 *     }
 *
 *     const features = this.envConfigService.getEnvironmentFeatures();
 *     if (features.debug.enableDebugLogs) {
 *       // 调试日志
 *     }
 *   }
 * }
 * ```
 */

import { Injectable } from '@nestjs/common';
import { createLogger } from '@app/config/logger.config';
import Redis from 'ioredis';
import { ConfigValidatorService, FullValidationResult } from '../config/validation/config-validator.service';
import { StartupConfig } from '../config/startup.config';

export interface StartupPhase {
  name: string;
  description: string;
  timeout: number;
  required: boolean;
  execute: () => Promise<void>;
}

export interface StartupResult {
  success: boolean;
  phases: Array<{
    name: string;
    success: boolean;
    duration: number;
    error?: string;
  }>;
  totalDuration: number;
  validationResult?: FullValidationResult;
}

@Injectable()
export class StartupHealthCheckerService {
  private readonly logger = createLogger(StartupHealthCheckerService.name);

  constructor(
    private readonly configValidator: ConfigValidatorService,
  ) {}

  /**
   * 执行完整的启动健康检查
   */
  async performStartupCheck(
    startupConfig: StartupConfig,
    customPhases: StartupPhase[] = []
  ): Promise<StartupResult> {
    const startTime = Date.now();
    
    this.logger.log('Starting application startup health check...');

    // 定义默认启动阶段
    const defaultPhases: StartupPhase[] = [
      {
        name: 'config-validation',
        description: 'Configuration validation',
        timeout: startupConfig.timeout.services,
        required: true,
        execute: () => this.validateConfiguration()
      },
      {
        name: 'database-connection',
        description: 'Database connectivity check',
        timeout: startupConfig.timeout.database,
        required: true,
        execute: () => this.checkDatabaseConnection()
      },
      {
        name: 'cache-connection',
        description: 'Cache service connectivity check',
        timeout: startupConfig.timeout.cache,
        required: true,
        execute: () => this.checkCacheConnection()
      },
      {
        name: 'external-services',
        description: 'External services availability check',
        timeout: startupConfig.timeout.services,
        required: false,
        execute: () => this.checkExternalServices()
      }
    ];

    // 合并自定义阶段
    const allPhases = [...defaultPhases, ...customPhases];
    const phaseResults: Array<{
      name: string;
      success: boolean;
      duration: number;
      error?: string;
    }> = [];

    let validationResult: FullValidationResult | undefined;
    let overallSuccess = true;

    // 执行所有阶段
    for (const phase of allPhases) {
      const phaseStartTime = Date.now();
      
      try {
        this.logger.debug(`Executing startup phase: ${phase.name}`, {
          description: phase.description,
          timeout: phase.timeout,
          required: phase.required
        });

        // 使用超时执行阶段
        await this.executeWithTimeout(phase.execute, phase.timeout);
        
        const duration = Date.now() - phaseStartTime;
        phaseResults.push({
          name: phase.name,
          success: true,
          duration
        });

        this.logger.debug(`Startup phase completed: ${phase.name}`, { duration });

        // 保存配置验证结果
        if (phase.name === 'config-validation' && this.configValidator) {
          validationResult = await this.configValidator.validateAll();
        }

      } catch (error) {
        const duration = Date.now() - phaseStartTime;
        const errorMessage = error.message || 'Unknown error';
        
        phaseResults.push({
          name: phase.name,
          success: false,
          duration,
          error: errorMessage
        });

        this.logger.error(`Startup phase failed: ${phase.name}`, {
          error: errorMessage,
          duration,
          required: phase.required
        });

        // 如果是必需阶段失败，整体失败
        if (phase.required) {
          overallSuccess = false;
          break;
        }
      }
    }

    const totalDuration = Date.now() - startTime;

    const result: StartupResult = {
      success: overallSuccess,
      phases: phaseResults,
      totalDuration,
      validationResult
    };

    this.logStartupSummary(result);

    return result;
  }

  /**
   * 快速启动检查（仅必需阶段）
   */
  async performQuickCheck(): Promise<StartupResult> {
    this.logger.log('Performing quick startup check...');
    
    const quickPhases: StartupPhase[] = [
      {
        name: 'critical-config',
        description: 'Critical configuration check',
        timeout: 5000,
        required: true,
        execute: () => this.validateCriticalConfig()
      }
    ];

    // 使用默认启动配置
    const defaultConfig: StartupConfig = {
      timeout: {
        database: 10000,
        cache: 5000,
        services: 30000,
        total: 60000
      },
      retry: {
        maxAttempts: 3,
        delay: 2000,
        backoff: 2.0
      },
      healthCheck: {
        enabled: true,
        interval: 30000,
        timeout: 5000,
        retries: 3
      },
      shutdown: {
        timeout: 10000,
        signals: ['SIGTERM', 'SIGINT']
      }
    };

    return this.performStartupCheck(defaultConfig, quickPhases);
  }

  /**
   * 验证配置
   */
  private async validateConfiguration(): Promise<void> {
    const result = await this.configValidator.validateStartupRequirements();
    
    if (!result.isValid) {
      throw new Error(`Configuration validation failed: ${result.errors.join(', ')}`);
    }

    if (result.warnings.length > 0) {
      this.logger.warn('Configuration warnings detected', {
        warnings: result.warnings
      });
    }
  }

  /**
   * 验证关键配置（快速检查用）
   */
  private async validateCriticalConfig(): Promise<void> {
    const criticalVars = ['NODE_ENV', 'MONGODB_URI', 'JWT_SECRET'];
    const missing = criticalVars.filter(v => !process.env[v]);
    
    if (missing.length > 0) {
      throw new Error(`Critical environment variables missing: ${missing.join(', ')}`);
    }
  }

  /**
   * 检查数据库连接
   */
  private async checkDatabaseConnection(): Promise<void> {
    try {
      const { MongoClient } = await import('mongodb');
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-stock-data';
      
      const client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });

      await client.connect();
      await client.db().admin().ping();
      await client.close();

      this.logger.debug('Database connection check passed');
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  /**
   * 检查缓存连接
   */
  private async checkCacheConnection(): Promise<void> {
    try {

      const host = process.env.REDIS_HOST || 'localhost';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);
      
      const client = new Redis({
        host,
        port,
        connectTimeout: 3000,
        lazyConnect: true
      });

      await client.connect();
      await client.ping();
      await client.disconnect();

      this.logger.debug('Cache connection check passed');
    } catch (error) {
      throw new Error(`Cache connection failed: ${error.message}`);
    }
  }

  /**
   * 检查外部服务
   */
  private async checkExternalServices(): Promise<void> {
    // 检查LongPort配置（可选服务）
    const longportConfigured = process.env.LONGPORT_APP_KEY && 
                              process.env.LONGPORT_APP_SECRET && 
                              process.env.LONGPORT_ACCESS_TOKEN;

    if (!longportConfigured) {
      this.logger.warn('LongPort API not configured - provider will be disabled');
    } else {
      this.logger.debug('External services check passed');
    }
  }

  /**
   * 使用超时执行函数
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>, 
    timeout: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout);
    });

    return Promise.race([fn(), timeoutPromise]);
  }

  /**
   * 记录启动摘要
   */
  private logStartupSummary(result: StartupResult): void {
    if (result.success) {
      this.logger.log('Startup health check completed successfully', {
        totalDuration: result.totalDuration,
        phases: result.phases.length,
        warnings: result.validationResult?.summary.totalWarnings || 0
      });
    } else {
      const failedPhases = result.phases.filter(p => !p.success);
      this.logger.error('Startup health check failed', {
        totalDuration: result.totalDuration,
        failedPhases: failedPhases.map(p => ({ name: p.name, error: p.error })),
        totalPhases: result.phases.length
      });
    }

    // 详细阶段信息
    result.phases.forEach(phase => {
      const logLevel = phase.success ? 'debug' : 'error';
      this.logger[logLevel](`Phase: ${phase.name}`, {
        success: phase.success,
        duration: phase.duration,
        error: phase.error
      });
    });
  }
}
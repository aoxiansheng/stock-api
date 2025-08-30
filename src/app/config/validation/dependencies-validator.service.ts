import { Injectable } from '@nestjs/common';
import { createLogger } from '@app/config/logger.config';
import {
  ValidationResult,
  DependencyValidationResult,
  ValidationOptions,
  ValidationMessage,
  ValidationSeverity
} from './validation.interfaces';

@Injectable()
export class DependenciesValidatorService {
  private readonly logger = createLogger(DependenciesValidatorService.name);

  /**
   * 验证外部依赖服务
   */
  async validateDependencies(options: ValidationOptions = {}): Promise<ValidationResult> {
    const { timeout = 5000, retries = 3 } = options;
    const messages: ValidationMessage[] = [];
    const dependencyResults: DependencyValidationResult[] = [];
    const startTime = Date.now();

    this.logger.debug('Starting dependency validation...', { timeout, retries });

    try {
      // 并行验证所有依赖
      const validationPromises = [
        this.validateMongoDB(timeout, retries),
        this.validateRedis(timeout, retries),
        this.validateLongPortAPI(timeout, retries)
      ];

      const results = await Promise.allSettled(validationPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          dependencyResults.push(result.value);
        } else {
          const services = ['MongoDB', 'Redis', 'LongPort API'];
          dependencyResults.push({
            service: services[index],
            endpoint: 'unknown',
            isAvailable: false,
            error: result.reason.message,
            validatedAt: new Date()
          });
        }
      });

      // 分析结果并生成消息
      dependencyResults.forEach(result => {
        if (!result.isAvailable) {
          const severity = this.getDependencySeverity(result.service);
          messages.push({
            severity,
            key: result.service.toLowerCase().replace(' ', '_'),
            message: `${result.service} is not available: ${result.error || 'Connection failed'}`,
            suggestion: this.getDependencySuggestion(result.service),
            value: result.endpoint
          });
        } else {
          this.logger.debug(`${result.service} validation successful`, {
            responseTime: result.responseTime,
            endpoint: result.endpoint
          });
        }
      });

      const errors = messages.filter(m => m.severity === ValidationSeverity.ERROR).map(m => m.message);
      const warnings = messages.filter(m => m.severity === ValidationSeverity.WARNING).map(m => m.message);

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        validatedAt: new Date()
      };

      const duration = Date.now() - startTime;
      this.logger.debug(`Dependency validation completed in ${duration}ms`, {
        valid: result.isValid,
        errorCount: errors.length,
        warningCount: warnings.length,
        availableServices: dependencyResults.filter(d => d.isAvailable).length,
        totalServices: dependencyResults.length
      });

      return result;

    } catch (error) {
      this.logger.error('Dependency validation failed', { error: error.message });
      return {
        isValid: false,
        errors: [`Dependency validation failed: ${error.message}`],
        warnings: [],
        validatedAt: new Date()
      };
    }
  }

  /**
   * 验证MongoDB连接
   */
  private async validateMongoDB(timeout: number, retries: number): Promise<DependencyValidationResult> {
    const startTime = Date.now();
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-stock-data';
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { MongoClient } = await import('mongodb');
        const client = new MongoClient(uri, {
          serverSelectionTimeoutMS: timeout,
          connectTimeoutMS: timeout
        });

        await client.connect();
        await client.db().admin().ping();
        await client.close();

        return {
          service: 'MongoDB',
          endpoint: this.sanitizeConnectionString(uri),
          isAvailable: true,
          responseTime: Date.now() - startTime,
          validatedAt: new Date()
        };

      } catch (error) {
        this.logger.warn(`MongoDB validation attempt ${attempt}/${retries} failed`, {
          error: error.message,
          attempt
        });

        if (attempt === retries) {
          return {
            service: 'MongoDB',
            endpoint: this.sanitizeConnectionString(uri),
            isAvailable: false,
            error: error.message,
            validatedAt: new Date()
          };
        }

        // 重试前等待
        await this.sleep(1000 * attempt);
      }
    }
  }

  /**
   * 验证Redis连接
   */
  private async validateRedis(timeout: number, retries: number): Promise<DependencyValidationResult> {
    const startTime = Date.now();
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { default: Redis } = await import('ioredis');
        const client = new Redis({
          host,
          port,
          connectTimeout: timeout,
          commandTimeout: timeout,
          lazyConnect: true,
          password
        });

        await client.connect();
        await client.ping();
        await client.disconnect();

        return {
          service: 'Redis',
          endpoint: `${host}:${port}`,
          isAvailable: true,
          responseTime: Date.now() - startTime,
          validatedAt: new Date()
        };

      } catch (error) {
        this.logger.warn(`Redis validation attempt ${attempt}/${retries} failed`, {
          error: error.message,
          attempt,
          endpoint: `${host}:${port}`
        });

        if (attempt === retries) {
          return {
            service: 'Redis',
            endpoint: `${host}:${port}`,
            isAvailable: false,
            error: error.message,
            validatedAt: new Date()
          };
        }

        // 重试前等待
        await this.sleep(1000 * attempt);
      }
    }
  }

  /**
   * 验证LongPort API连接
   */
  private async validateLongPortAPI(timeout: number, retries: number): Promise<DependencyValidationResult> {
    const startTime = Date.now();
    const appKey = process.env.LONGPORT_APP_KEY;
    const appSecret = process.env.LONGPORT_APP_SECRET;
    const accessToken = process.env.LONGPORT_ACCESS_TOKEN;

    // 如果没有配置，跳过验证（可选服务）
    if (!appKey || !appSecret || !accessToken) {
      return {
        service: 'LongPort API',
        endpoint: 'https://openapi.longportapp.com',
        isAvailable: false,
        error: 'LongPort credentials not configured',
        validatedAt: new Date()
      };
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // 简单的API健康检查（不实际调用，只检查能否创建配置）
        const endpoint = 'https://openapi.longportapp.com';
        
        // 这里可以添加实际的LongPort SDK健康检查
        // 目前只检查配置是否完整
        const isConfigured = appKey && appSecret && accessToken;
        
        if (isConfigured) {
          return {
            service: 'LongPort API',
            endpoint,
            isAvailable: true,
            responseTime: Date.now() - startTime,
            validatedAt: new Date()
          };
        }

        throw new Error('LongPort credentials incomplete');

      } catch (error) {
        this.logger.warn(`LongPort API validation attempt ${attempt}/${retries} failed`, {
          error: error.message,
          attempt
        });

        if (attempt === retries) {
          return {
            service: 'LongPort API',
            endpoint: 'https://openapi.longportapp.com',
            isAvailable: false,
            error: error.message,
            validatedAt: new Date()
          };
        }

        // 重试前等待
        await this.sleep(1000 * attempt);
      }
    }
  }

  /**
   * 获取依赖的严重性级别
   */
  private getDependencySeverity(service: string): ValidationSeverity {
    switch (service) {
      case 'MongoDB':
      case 'Redis':
        return ValidationSeverity.ERROR; // 核心服务，必须可用
      case 'LongPort API':
        return ValidationSeverity.WARNING; // 可选服务，不可用时给警告
      default:
        return ValidationSeverity.WARNING;
    }
  }

  /**
   * 获取依赖的修复建议
   */
  private getDependencySuggestion(service: string): string {
    switch (service) {
      case 'MongoDB':
        return 'Ensure MongoDB is running and accessible. Check MONGODB_URI configuration.';
      case 'Redis':
        return 'Ensure Redis is running and accessible. Check REDIS_HOST and REDIS_PORT configuration.';
      case 'LongPort API':
        return 'Check LONGPORT_APP_KEY, LONGPORT_APP_SECRET, and LONGPORT_ACCESS_TOKEN configuration.';
      default:
        return 'Check service configuration and network connectivity.';
    }
  }

  /**
   * 清理连接字符串中的敏感信息
   */
  private sanitizeConnectionString(connectionString: string): string {
    // 移除密码信息
    return connectionString.replace(/:([^:@]+)@/, ':***@');
  }

  /**
   * 等待指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
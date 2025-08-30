import { Injectable } from '@nestjs/common';
import { createLogger } from '@app/config/logger.config';
import {
  ValidationResult,
  ConfigValidationRule,
  ValidationMessage,
  ValidationSeverity
} from './validation.interfaces';

@Injectable()
export class EnvironmentValidatorService {
  private readonly logger = createLogger(EnvironmentValidatorService.name);

  /**
   * 环境变量验证规则
   */
  private readonly validationRules: ConfigValidationRule[] = [
    // 数据库配置
    {
      key: 'MONGODB_URI',
      required: true,
      validator: (value) => typeof value === 'string' && value.startsWith('mongodb://'),
      errorMessage: 'MONGODB_URI must be a valid MongoDB connection string starting with mongodb://'
    },
    {
      key: 'REDIS_HOST',
      required: false,
      validator: (value) => !value || typeof value === 'string',
      warningMessage: 'REDIS_HOST not set, using default localhost'
    },
    {
      key: 'REDIS_PORT',
      required: false,
      validator: (value) => !value || (!isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0),
      errorMessage: 'REDIS_PORT must be a valid positive integer'
    },

    // 安全配置
    {
      key: 'JWT_SECRET',
      required: true,
      validator: (value) => typeof value === 'string' && value.length >= 32,
      errorMessage: 'JWT_SECRET must be at least 32 characters long for security'
    },
    {
      key: 'JWT_EXPIRES_IN',
      required: false,
      validator: (value) => !value || /^(\d+[smhd]|\d+)$/.test(value),
      errorMessage: 'JWT_EXPIRES_IN must be in format like "1h", "30m", "7d", or "3600"'
    },

    // 应用配置
    {
      key: 'NODE_ENV',
      required: true,
      validator: (value) => ['development', 'production', 'test'].includes(value),
      errorMessage: 'NODE_ENV must be "development", "production", or "test"'
    },
    {
      key: 'PORT',
      required: false,
      validator: (value) => !value || (!isNaN(parseInt(value, 10)) && parseInt(value, 10) > 0 && parseInt(value, 10) < 65536),
      errorMessage: 'PORT must be a valid port number (1-65535)'
    },

    // LongPort API配置
    {
      key: 'LONGPORT_APP_KEY',
      required: false,
      validator: (value) => !value || (typeof value === 'string' && value.length > 0),
      warningMessage: 'LONGPORT_APP_KEY not set, LongPort provider will be disabled'
    },
    {
      key: 'LONGPORT_APP_SECRET',
      required: false,
      validator: (value) => !value || (typeof value === 'string' && value.length > 0),
      warningMessage: 'LONGPORT_APP_SECRET not set, LongPort provider will be disabled'
    },
    {
      key: 'LONGPORT_ACCESS_TOKEN',
      required: false,
      validator: (value) => !value || (typeof value === 'string' && value.length > 0),
      warningMessage: 'LONGPORT_ACCESS_TOKEN not set, LongPort provider will be disabled'
    },

    // 功能开关
    {
      key: 'AUTO_INIT_ENABLED',
      required: false,
      validator: (value) => !value || ['true', 'false'].includes(value.toLowerCase()),
      errorMessage: 'AUTO_INIT_ENABLED must be "true" or "false"'
    },
    {
      key: 'MONITORING_ENABLED',
      required: false,
      validator: (value) => !value || ['true', 'false'].includes(value.toLowerCase()),
      errorMessage: 'MONITORING_ENABLED must be "true" or "false"'
    }
  ];

  /**
   * 验证环境变量
   */
  async validateEnvironment(): Promise<ValidationResult> {
    const messages: ValidationMessage[] = [];
    const startTime = Date.now();

    this.logger.debug('Starting environment validation...');

    try {
      for (const rule of this.validationRules) {
        const value = process.env[rule.key];
        
        // 检查必需字段
        if (rule.required && !value) {
          messages.push({
            severity: ValidationSeverity.ERROR,
            key: rule.key,
            message: rule.errorMessage || `Required environment variable ${rule.key} is not set`,
            value,
            suggestion: `Set ${rule.key} in your environment variables`
          });
          continue;
        }

        // 如果有值，运行自定义验证器
        if (value && rule.validator && !rule.validator(value)) {
          messages.push({
            severity: ValidationSeverity.ERROR,
            key: rule.key,
            message: rule.errorMessage || `Invalid value for ${rule.key}`,
            value: this.sanitizeValue(rule.key, value),
            suggestion: `Check the format and value of ${rule.key}`
          });
          continue;
        }

        // 如果没有值但有警告消息
        if (!value && rule.warningMessage) {
          messages.push({
            severity: ValidationSeverity.WARNING,
            key: rule.key,
            message: rule.warningMessage,
            suggestion: `Consider setting ${rule.key} for production use`
          });
        }
      }

      // 检查开发环境特定配置
      this.validateDevelopmentConfig(messages);

      // 检查生产环境特定配置
      if (process.env.NODE_ENV === 'production') {
        this.validateProductionConfig(messages);
      }

      const errors = messages.filter(m => m.severity === ValidationSeverity.ERROR).map(m => m.message);
      const warnings = messages.filter(m => m.severity === ValidationSeverity.WARNING).map(m => m.message);

      const result: ValidationResult = {
        isValid: errors.length === 0,
        errors,
        warnings,
        validatedAt: new Date()
      };

      const duration = Date.now() - startTime;
      this.logger.debug(`Environment validation completed in ${duration}ms`, {
        valid: result.isValid,
        errorCount: errors.length,
        warningCount: warnings.length
      });

      return result;

    } catch (error) {
      this.logger.error('Environment validation failed', { error: error.message });
      return {
        isValid: false,
        errors: [`Environment validation failed: ${error.message}`],
        warnings: [],
        validatedAt: new Date()
      };
    }
  }

  /**
   * 验证开发环境配置
   */
  private validateDevelopmentConfig(messages: ValidationMessage[]): void {
    if (process.env.NODE_ENV === 'development') {
      // 开发环境可以使用弱密钥，但给出警告
      if (process.env.JWT_SECRET === 'dev-secret-key') {
        messages.push({
          severity: ValidationSeverity.WARNING,
          key: 'JWT_SECRET',
          message: 'Using default JWT_SECRET in development mode',
          suggestion: 'Use a strong secret key in production'
        });
      }
    }
  }

  /**
   * 验证生产环境配置
   */
  private validateProductionConfig(messages: ValidationMessage[]): void {
    // 生产环境必须设置的配置
    const productionRequired = [
      'LONGPORT_APP_KEY',
      'LONGPORT_APP_SECRET', 
      'LONGPORT_ACCESS_TOKEN'
    ];

    productionRequired.forEach(key => {
      if (!process.env[key]) {
        messages.push({
          severity: ValidationSeverity.WARNING,
          key,
          message: `${key} is recommended for production environment`,
          suggestion: `Set ${key} for full functionality in production`
        });
      }
    });

    // 检查是否使用默认值
    if (process.env.JWT_SECRET === 'dev-secret-key') {
      messages.push({
        severity: ValidationSeverity.ERROR,
        key: 'JWT_SECRET',
        message: 'Cannot use default JWT_SECRET in production',
        suggestion: 'Set a strong, unique JWT_SECRET for production'
      });
    }
  }

  /**
   * 清理敏感信息用于日志记录
   */
  private sanitizeValue(key: string, value: string): string {
    const sensitiveKeys = ['SECRET', 'TOKEN', 'PASSWORD', 'KEY'];
    const isSensitive = sensitiveKeys.some(sensitiveKey => key.toUpperCase().includes(sensitiveKey));
    
    if (isSensitive) {
      return value.length > 8 ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` : '[HIDDEN]';
    }
    
    return value;
  }
}
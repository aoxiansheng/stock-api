import { registerAs } from '@nestjs/config';
import { IsNumber, Min, Max, IsString, Length, validateSync, ValidateNested } from 'class-validator';
import { plainToClass, Type } from 'class-transformer';
import { 
  AlertValidationRules, 
  AlertCacheConfig, 
  AlertLimitsConfig,
  CompleteAlertValidation 
} from './alert-validation.config';

/**
 * 导出配置接口以供其他模块使用
 */
export interface AlertConfig {
  evaluationInterval: number;
  defaultCooldown: number;
  batchSize: number;
  evaluationTimeout: number;
  maxRetries: number;
  validation: {
    duration: {
      min: number;
      max: number;
    };
    cooldown: {
      max: number;
    };
  };
  cache: {
    cooldownPrefix: string;
    activeAlertPrefix: string;
  };
}

/**
 * Alert配置验证类
 * 🎯 使用增强标准模式统一管理Alert模块配置
 * 
 * 统一的配置项：
 * - evaluationInterval: Alert评估间隔配置
 * - defaultCooldown: 解决300秒TTL重复定义问题
 * - batchSize: 从defaults.constants.ts迁移的批处理配置
 * - evaluationTimeout: 从defaults.constants.ts迁移的超时配置
 * - maxRetries: 从defaults.constants.ts迁移的重试配置
 * - validation: 规则验证相关配置
 * - cache: 缓存相关配置（不包含TTL，已迁移到unified-ttl.config.ts）
 */
export class AlertConfigValidation {
  /**
   * Alert评估间隔（秒）
   * AlertEvaluationService使用此配置
   */
  @IsNumber()
  @Min(10)
  @Max(3600)
  evaluationInterval: number = 60;

  /**
   * 默认冷却期（秒）
   * 解决300秒TTL在多处重复定义的问题
   * 替换: schemas/alert-rule.schema.ts中的硬编码300
   * 替换: limits.constants.ts中的COOLDOWN_MIN: 300
   */
  @IsNumber()
  @Min(60)
  @Max(7200)
  defaultCooldown: number = 300;

  /**
   * 批处理大小
   * 从defaults.constants.ts迁移的BATCH_SIZE配置
   * 用于告警规则批处理操作
   */
  @IsNumber()
  @Min(10)
  @Max(1000)
  batchSize: number = 100;

  /**
   * 评估超时时间（毫秒）
   * 从defaults.constants.ts迁移的TIMEOUT_DEFAULT配置
   * 用于告警规则评估操作的超时控制
   */
  @IsNumber()
  @Min(1000)
  @Max(30000)
  evaluationTimeout: number = 5000;

  /**
   * 最大重试次数
   * 从defaults.constants.ts迁移的RETRY_COUNT配置
   * 用于告警操作的重试控制
   */
  @IsNumber()
  @Min(1)
  @Max(10)
  maxRetries: number = 3;

  /**
   * 验证配置
   * 使用嵌套验证类确保完整的配置验证覆盖
   */
  @ValidateNested()
  @Type(() => AlertValidationRules)
  validation: AlertValidationRules = new AlertValidationRules();

  /**
   * 缓存配置
   * 使用嵌套验证类确保完整的配置验证覆盖
   * 注意：TTL配置已迁移到unified-ttl.config.ts
   */
  @ValidateNested()
  @Type(() => AlertCacheConfig)
  cache: AlertCacheConfig = new AlertCacheConfig();

  /**
   * 限制配置
   * 从limits.constants.ts迁移的可配置参数
   */
  @ValidateNested()
  @Type(() => AlertLimitsConfig)
  limits: AlertLimitsConfig = new AlertLimitsConfig();
}

/**
 * Alert配置注册
 * 使用 NestJS ConfigModule registerAs 模式
 */
export default registerAs('alert', (): AlertConfig => {
  // 构建完整配置对象，包含嵌套验证对象
  const fullConfig = {
    evaluationInterval: parseInt(process.env.ALERT_EVALUATION_INTERVAL, 10) || 60,
    defaultCooldown: parseInt(process.env.ALERT_DEFAULT_COOLDOWN, 10) || 300,
    batchSize: parseInt(process.env.ALERT_BATCH_SIZE, 10) || 100,
    evaluationTimeout: parseInt(process.env.ALERT_EVALUATION_TIMEOUT, 10) || 5000,
    maxRetries: parseInt(process.env.ALERT_MAX_RETRIES, 10) || 3,
    validation: {
      durationMin: parseInt(process.env.ALERT_VALIDATION_DURATION_MIN, 10) || 30,
      durationMax: parseInt(process.env.ALERT_VALIDATION_DURATION_MAX, 10) || 600,
      cooldownMax: parseInt(process.env.ALERT_VALIDATION_COOLDOWN_MAX, 10) || 3000,
    },
    cache: {
      cooldownPrefix: process.env.ALERT_CACHE_COOLDOWN_PREFIX || 'alert:cooldown:',
      activeAlertPrefix: process.env.ALERT_CACHE_ACTIVE_PREFIX || 'alert:active',
    },
    limits: {
      maxConditionsPerRule: parseInt(process.env.ALERT_LIMITS_MAX_CONDITIONS, 10) || 10,
      maxRulesPerUser: parseInt(process.env.ALERT_LIMITS_MAX_RULES_PER_USER, 10) || 100,
      defaultPageSize: parseInt(process.env.ALERT_LIMITS_DEFAULT_PAGE_SIZE, 10) || 20,
      maxQueryResults: parseInt(process.env.ALERT_LIMITS_MAX_QUERY_RESULTS, 10) || 100,
    },
  };
  
  // 转换为完整验证类实例进行嵌套验证
  const validatedConfig = plainToClass(AlertConfigValidation, fullConfig);
  
  // 使用 class-validator 验证配置（包括嵌套对象）
  const errors = validateSync(validatedConfig);
  if (errors.length > 0) {
    const errorMessages = errors.map(error => {
      const constraints = error.constraints ? Object.values(error.constraints).join(', ') : '';
      const childErrors = error.children?.length > 0 
        ? error.children.map(child => 
            `${error.property}.${child.property}: ${Object.values(child.constraints || {}).join(', ')}`
          ).join('; ') 
        : '';
      return `${error.property}: ${constraints}${childErrors ? '; ' + childErrors : ''}`;
    }).join(' | ');
    
    throw new Error(`Alert configuration validation failed: ${errorMessages}`);
  }
  
  // 返回完整配置（所有字段都经过验证）
  return {
    evaluationInterval: validatedConfig.evaluationInterval,
    defaultCooldown: validatedConfig.defaultCooldown,
    batchSize: validatedConfig.batchSize,
    evaluationTimeout: validatedConfig.evaluationTimeout,
    maxRetries: validatedConfig.maxRetries,
    validation: {
      duration: {
        min: validatedConfig.validation.durationMin,
        max: validatedConfig.validation.durationMax,
      },
      cooldown: {
        max: validatedConfig.validation.cooldownMax,
      },
    },
    cache: {
      cooldownPrefix: validatedConfig.cache.cooldownPrefix,
      activeAlertPrefix: validatedConfig.cache.activeAlertPrefix,
    },
  };
});

import { registerAs } from "@nestjs/config";
import { BadRequestException } from "@nestjs/common";
import {
  IsNumber,
  Min,
  Max,
  IsString,
  Length,
  validateSync,
  ValidateNested,
} from "class-validator";
import { plainToClass, Type } from "class-transformer";

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
   * 最小持续时间（秒）
   * 用于告警规则duration字段的最小值验证
   */
  @IsNumber()
  @Min(30)
  @Max(600)
  validationDurationMin: number = 30;

  /**
   * 最大持续时间（秒）
   * 用于告警规则duration字段的最大值验证
   */
  @IsNumber()
  @Min(30)
  @Max(600)
  validationDurationMax: number = 600;

  /**
   * 最大冷却期（秒）
   * 用于告警规则cooldown字段的最大值验证
   */
  @IsNumber()
  @Min(60)
  @Max(3000)
  validationCooldownMax: number = 3000;

  /**
   * 冷却期缓存键前缀
   * 用于Redis缓存键命名
   */
  @IsString()
  @Length(1, 100)
  cacheCooldownPrefix: string = "alert:cooldown:";

  /**
   * 活跃告警缓存键前缀
   * 用于Redis缓存键命名
   */
  @IsString()
  @Length(1, 100)
  cacheActiveAlertPrefix: string = "alert:active";

  /**
   * 单规则最大条件数
   * 从limits.constants.ts的MAX_CONDITIONS_PER_RULE迁移
   */
  @IsNumber()
  @Min(1)
  @Max(50)
  limitsMaxConditionsPerRule: number = 10;

  /**
   * 单用户最大规则数
   * 从limits.constants.ts的MAX_RULES_PER_USER迁移
   */
  @IsNumber()
  @Min(10)
  @Max(1000)
  limitsMaxRulesPerUser: number = 100;

  /**
   * 默认分页大小
   * 从limits.constants.ts的DEFAULT_PAGE_SIZE迁移
   */
  @IsNumber()
  @Min(5)
  @Max(100)
  limitsDefaultPageSize: number = 20;

  /**
   * 单次查询最大结果数
   * 从limits.constants.ts的MAX_QUERY_RESULTS迁移
   */
  @IsNumber()
  @Min(10)
  @Max(1000)
  limitsMaxQueryResults: number = 100;
}

/**
 * Alert配置注册
 * 使用 NestJS ConfigModule registerAs 模式
 */
export default registerAs("alert", (): AlertConfig => {
  // 构建完整配置对象，包含嵌套验证对象
  const fullConfig = {
    evaluationInterval:
      parseInt(process.env.ALERT_EVALUATION_INTERVAL, 10) || 60,
    defaultCooldown: parseInt(process.env.ALERT_DEFAULT_COOLDOWN, 10) || 300,
    batchSize: parseInt(process.env.ALERT_BATCH_SIZE, 10) || 100,
    evaluationTimeout:
      parseInt(process.env.ALERT_EVALUATION_TIMEOUT, 10) || 5000,
    maxRetries: parseInt(process.env.ALERT_MAX_RETRIES, 10) || 3,
    validationDurationMin:
      parseInt(process.env.ALERT_VALIDATION_DURATION_MIN, 10) || 30,
    validationDurationMax:
      parseInt(process.env.ALERT_VALIDATION_DURATION_MAX, 10) || 600,
    validationCooldownMax:
      parseInt(process.env.ALERT_VALIDATION_COOLDOWN_MAX, 10) || 3000,
    cacheCooldownPrefix:
      process.env.ALERT_CACHE_COOLDOWN_PREFIX || "alert:cooldown:",
    cacheActiveAlertPrefix:
      process.env.ALERT_CACHE_ACTIVE_PREFIX || "alert:active",
    limitsMaxConditionsPerRule:
      parseInt(process.env.ALERT_LIMITS_MAX_CONDITIONS, 10) || 10,
    limitsMaxRulesPerUser:
      parseInt(process.env.ALERT_LIMITS_MAX_RULES_PER_USER, 10) || 100,
    limitsDefaultPageSize:
      parseInt(process.env.ALERT_LIMITS_DEFAULT_PAGE_SIZE, 10) || 20,
    limitsMaxQueryResults:
      parseInt(process.env.ALERT_LIMITS_MAX_QUERY_RESULTS, 10) || 100,
  };

  // 转换为验证类实例进行验证
  const validatedConfig = plainToClass(AlertConfigValidation, fullConfig);

  // 使用 class-validator 验证配置
  const errors = validateSync(validatedConfig);
  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(", ")
          : "";
        return `${error.property}: ${constraints}`;
      })
      .join(" | ");

    throw new BadRequestException(
      `Alert configuration validation failed: ${errorMessages}`,
    );
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
        min: validatedConfig.validationDurationMin,
        max: validatedConfig.validationDurationMax,
      },
      cooldown: {
        max: validatedConfig.validationCooldownMax,
      },
    },
    cache: {
      cooldownPrefix: validatedConfig.cacheCooldownPrefix,
      activeAlertPrefix: validatedConfig.cacheActiveAlertPrefix,
    },
  };
});

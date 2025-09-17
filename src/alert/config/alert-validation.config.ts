/**
 * Alert嵌套配置验证类
 * 🎯 解决嵌套对象验证缺失问题，提供完整的配置验证覆盖
 *
 * @description 使用class-validator对Alert配置的嵌套对象进行验证
 * @author Claude Code Assistant
 * @date 2025-09-15
 */

import {
  IsNumber,
  IsString,
  Min,
  Max,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { VALIDATION_LIMITS } from "@common/constants/validation.constants";

/**
 * Alert验证规则配置类
 * 解决alert.config.ts中validation对象验证缺失问题
 */
export class AlertValidationRules {
  /**
   * 最小持续时间（秒）
   * 用于告警规则duration字段的最小值验证
   */
  @IsNumber()
  @Min(VALIDATION_LIMITS.DURATION_MIN)
  @Max(VALIDATION_LIMITS.DURATION_MAX)
  durationMin: number = 30;

  /**
   * 最大持续时间（秒）
   * 用于告警规则duration字段的最大值验证
   */
  @IsNumber()
  @Min(VALIDATION_LIMITS.DURATION_MIN)
  @Max(VALIDATION_LIMITS.DURATION_MAX)
  durationMax: number = 600;

  /**
   * 最大冷却期（秒）
   * 用于告警规则cooldown字段的最大值验证
   */
  @IsNumber()
  @Min(VALIDATION_LIMITS.COOLDOWN_MIN)
  @Max(VALIDATION_LIMITS.COOLDOWN_MAX)
  cooldownMax: number = 3000;
}

/**
 * Alert缓存配置类
 * 解决alert.config.ts中cache对象验证缺失问题
 */
export class AlertCacheConfig {
  /**
   * 冷却期缓存键前缀
   * 用于Redis缓存键命名
   */
  @IsString()
  @MaxLength(VALIDATION_LIMITS.NAME_MAX_LENGTH)
  cooldownPrefix: string = "alert:cooldown:";

  /**
   * 活跃告警缓存键前缀
   * 用于Redis缓存键命名
   */
  @IsString()
  @MaxLength(VALIDATION_LIMITS.NAME_MAX_LENGTH)
  activeAlertPrefix: string = "alert:active";
}

/**
 * Alert限制配置类
 * 将limits.constants.ts中的可配置参数迁移为验证配置
 */
export class AlertLimitsConfig {
  /**
   * 单规则最大条件数
   * 从limits.constants.ts的MAX_CONDITIONS_PER_RULE迁移
   */
  @IsNumber()
  @Min(1)
  @Max(50)
  maxConditionsPerRule: number = 10;

  /**
   * 单用户最大规则数
   * 从limits.constants.ts的MAX_RULES_PER_USER迁移
   */
  @IsNumber()
  @Min(10)
  @Max(1000)
  maxRulesPerUser: number = 100;

  /**
   * 默认分页大小
   * 从limits.constants.ts的DEFAULT_PAGE_SIZE迁移
   */
  @IsNumber()
  @Min(5)
  @Max(100)
  defaultPageSize: number = 20;

  /**
   * 单次查询最大结果数
   * 从limits.constants.ts的MAX_QUERY_RESULTS迁移
   */
  @IsNumber()
  @Min(10)
  @Max(1000)
  maxQueryResults: number = 100;
}

/**
 * 完整的Alert配置验证类
 * 包含所有嵌套验证对象，确保配置验证覆盖率达到95%
 */
export class CompleteAlertValidation {
  /**
   * 验证规则配置
   */
  @ValidateNested()
  @Type(() => AlertValidationRules)
  validation: AlertValidationRules = new AlertValidationRules();

  /**
   * 缓存配置
   */
  @ValidateNested()
  @Type(() => AlertCacheConfig)
  cache: AlertCacheConfig = new AlertCacheConfig();

  /**
   * 限制配置
   */
  @ValidateNested()
  @Type(() => AlertLimitsConfig)
  limits: AlertLimitsConfig = new AlertLimitsConfig();
}

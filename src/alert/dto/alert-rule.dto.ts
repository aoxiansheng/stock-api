import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  IsObject,
  Matches,
} from "class-validator";

import { IsNumberInRange } from "@common/validators";

import { AlertSeverity } from "../types/alert.types";
import { VALID_OPERATORS, type Operator, ALERT_DEFAULTS } from "../constants";

// 🎯 过时代码清理: 逐步迁移到配置系统
import { VALIDATION_LIMITS } from "@common/constants/validation.constants";

/**
 * 配置迁移注释:
 * 🔄 正在将硬编码常量迁移到配置系统
 * 
 * 迁移目标:
 * - VALIDATION_LIMITS.NAME_MAX_LENGTH → commonConstantsConfig.validation.nameMaxLength
 * - VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH → commonConstantsConfig.validation.descriptionMaxLength  
 * - VALIDATION_LIMITS.DURATION_MIN/MAX → commonConstantsConfig.validation.durationMin/Max
 * - VALIDATION_LIMITS.COOLDOWN_MIN/MAX → commonConstantsConfig.validation.cooldownMin/Max
 * - VALIDATION_LIMITS.RETRIES_MIN/MAX → commonConstantsConfig.retry.minRetryAttempts/maxRetryAttempts
 * - VALIDATION_LIMITS.TIMEOUT_MIN/MAX → commonConstantsConfig.timeouts.quickTimeoutMs/longTimeoutMs
 * 
 * 注入配置服务的DTO重构将在Phase 3完成
 **/

/**
 * Alert模块的通知渠道类型枚举
 * 🎯 Alert模块领域内的通知渠道定义，保持事件驱动架构解耦
 */
export enum AlertNotificationChannelType {
  EMAIL = "email",
  SMS = "sms",
  WEBHOOK = "webhook",
  SLACK = "slack",
  DINGTALK = "dingtalk",
  LOG = "log",
  IN_APP = "in_app",
}

/**
 * Alert模块的通知渠道DTO
 * 🎯 用于告警规则创建/更新的通知渠道配置
 *
 * @description Alert模块的领域模型，与Notification模块完全解耦
 *              通过事件驱动架构进行通信，数据适配在Notification模块进行
 */
export class AlertNotificationChannelDto {
  @ApiPropertyOptional({ description: "渠道ID" })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: "渠道名称" })
  @IsString()
  @MaxLength(VALIDATION_LIMITS.NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({
    description: "通知类型",
    enum: AlertNotificationChannelType,
    enumName: "AlertNotificationChannelType",
  })
  @IsEnum(AlertNotificationChannelType)
  type: AlertNotificationChannelType;

  @ApiProperty({
    description: "渠道配置",
    type: "object",
    additionalProperties: true,
  })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({ description: "是否启用", default: true })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: "重试次数", default: 3 })
  @IsOptional()
  @IsNumber()
  @IsNumberInRange({
    min: VALIDATION_LIMITS.RETRIES_MIN,
    max: VALIDATION_LIMITS.RETRIES_MAX,
    message: `重试次数必须在${VALIDATION_LIMITS.RETRIES_MIN}-${VALIDATION_LIMITS.RETRIES_MAX}之间`,
  })
  retryCount?: number;

  @ApiPropertyOptional({ description: "超时时间（毫秒）", default: 30000 })
  @IsOptional()
  @IsNumber()
  @IsNumberInRange({
    min: VALIDATION_LIMITS.TIMEOUT_MIN,
    max: VALIDATION_LIMITS.TIMEOUT_MAX,
    message: `超时时间必须在${VALIDATION_LIMITS.TIMEOUT_MIN}-${VALIDATION_LIMITS.TIMEOUT_MAX}毫秒之间`,
  })
  timeout?: number;
}

export class CreateAlertRuleDto {
  @ApiProperty({ description: "告警规则名称" })
  @IsString({ message: "告警规则名称必须是字符串" })
  @MaxLength(VALIDATION_LIMITS.NAME_MAX_LENGTH, {
    message: `告警规则名称长度不能超过${VALIDATION_LIMITS.NAME_MAX_LENGTH}个字符`,
  })
  @Matches(/^[\u4e00-\u9fa5a-zA-Z0-9_\-\s]+$/, {
    message: "告警规则名称只能包含中英文字符、数字、下划线、短横线和空格",
  })
  name: string;

  @ApiPropertyOptional({ description: "告警规则描述" })
  @IsOptional()
  @IsString({ message: "告警规则描述必须是字符串" })
  @MaxLength(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH, {
    message: `告警规则描述长度不能超过${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH}个字符`,
  })
  description?: string;

  @ApiProperty({ description: "监控指标名称" })
  @IsString({ message: "监控指标名称必须是字符串" })
  @MaxLength(VALIDATION_LIMITS.NAME_MAX_LENGTH, {
    message: `监控指标名称长度不能超过${VALIDATION_LIMITS.NAME_MAX_LENGTH}个字符`,
  })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_\.]*$/, {
    message: "监控指标名称必须以字母开头，可包含字母、数字、下划线和点号",
  })
  metric: string;

  @ApiProperty({
    description: "比较操作符",
    enum: VALID_OPERATORS,
    default: ALERT_DEFAULTS.operator,
  })
  @IsEnum(VALID_OPERATORS)
  operator: Operator;

  @ApiProperty({ description: "阈值" })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "阈值必须是有效的数字（不能是NaN或Infinity）" },
  )
  threshold: number;

  @ApiProperty({
    description: "持续时间（秒）",
    default: ALERT_DEFAULTS.duration,
  })
  @IsNumber()
  @IsNumberInRange({
    min: VALIDATION_LIMITS.DURATION_MIN,
    max: VALIDATION_LIMITS.DURATION_MAX,
    message: `持续时间必须在${VALIDATION_LIMITS.DURATION_MIN}-${VALIDATION_LIMITS.DURATION_MAX}秒之间`,
  })
  duration: number;

  @ApiProperty({
    description: "告警严重级别",
    enum: AlertSeverity,
    default: ALERT_DEFAULTS.severity,
  })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiProperty({
    description: "是否启用",
    default: ALERT_DEFAULTS.enabled,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: "通知渠道列表",
    type: [AlertNotificationChannelDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlertNotificationChannelDto)
  channels: AlertNotificationChannelDto[];

  @ApiProperty({
    description: "冷却时间（秒）",
  })
  @IsNumber({}, { message: "冷却时间必须是数字" })
  @IsNumberInRange({
    min: VALIDATION_LIMITS.COOLDOWN_MIN,
    max: VALIDATION_LIMITS.COOLDOWN_MAX,
    message: `冷却时间必须在${VALIDATION_LIMITS.COOLDOWN_MIN}-${VALIDATION_LIMITS.COOLDOWN_MAX}秒之间`,
  })
  cooldown: number;

  @ApiPropertyOptional({
    description: "标签",
    type: "object",
    additionalProperties: { type: "string" },
  })
  @IsOptional()
  tags?: Record<string, string>;
}

export class UpdateAlertRuleDto {
  @ApiPropertyOptional({ description: "告警规则名称" })
  @IsOptional()
  @IsString({ message: "告警规则名称必须是字符串" })
  @MaxLength(VALIDATION_LIMITS.NAME_MAX_LENGTH, {
    message: `告警规则名称长度不能超过${VALIDATION_LIMITS.NAME_MAX_LENGTH}个字符`,
  })
  @Matches(/^[\u4e00-\u9fa5a-zA-Z0-9_\-\s]+$/, {
    message: "告警规则名称只能包含中英文字符、数字、下划线、短横线和空格",
  })
  name?: string;

  @ApiPropertyOptional({ description: "告警规则描述" })
  @IsOptional()
  @IsString({ message: "告警规则描述必须是字符串" })
  @MaxLength(VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH, {
    message: `告警规则描述长度不能超过${VALIDATION_LIMITS.DESCRIPTION_MAX_LENGTH}个字符`,
  })
  description?: string;

  @ApiPropertyOptional({ description: "监控指标名称" })
  @IsOptional()
  @IsString({ message: "监控指标名称必须是字符串" })
  @MaxLength(VALIDATION_LIMITS.NAME_MAX_LENGTH, {
    message: `监控指标名称长度不能超过${VALIDATION_LIMITS.NAME_MAX_LENGTH}个字符`,
  })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_\.]*$/, {
    message: "监控指标名称必须以字母开头，可包含字母、数字、下划线和点号",
  })
  metric?: string;

  @ApiPropertyOptional({
    description: "比较操作符",
    enum: VALID_OPERATORS,
  })
  @IsOptional()
  @IsEnum(VALID_OPERATORS)
  operator?: Operator;

  @ApiPropertyOptional({ description: "阈值" })
  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "阈值必须是有效的数字（不能是NaN或Infinity）" },
  )
  threshold?: number;

  @ApiPropertyOptional({ description: "持续时间（秒）" })
  @IsOptional()
  @IsNumber()
  @IsNumberInRange({
    min: VALIDATION_LIMITS.DURATION_MIN,
    max: VALIDATION_LIMITS.DURATION_MAX,
    message: `持续时间必须在${VALIDATION_LIMITS.DURATION_MIN}-${VALIDATION_LIMITS.DURATION_MAX}秒之间`,
  })
  duration?: number;

  @ApiPropertyOptional({
    description: "告警严重级别",
    enum: AlertSeverity,
  })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({ description: "是否启用" })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: "通知渠道列表",
    type: [AlertNotificationChannelDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlertNotificationChannelDto)
  channels?: AlertNotificationChannelDto[];

  @ApiPropertyOptional({ description: "冷却时间（秒）" })
  @IsOptional()
  @IsNumber({}, { message: "冷却时间必须是数字" })
  @IsNumberInRange({
    min: VALIDATION_LIMITS.COOLDOWN_MIN,
    max: VALIDATION_LIMITS.COOLDOWN_MAX,
    message: `冷却时间必须在${VALIDATION_LIMITS.COOLDOWN_MIN}-${VALIDATION_LIMITS.COOLDOWN_MAX}秒之间`,
  })
  cooldown?: number;

  @ApiPropertyOptional({
    description: "标签",
    type: "object",
    additionalProperties: { type: "string" },
  })
  @IsOptional()
  tags?: Record<string, string>;
}

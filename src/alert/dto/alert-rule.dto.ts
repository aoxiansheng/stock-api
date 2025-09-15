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
} from "class-validator";

import { AlertSeverity } from "../types/alert.types";
import { VALID_OPERATORS, type Operator, ALERT_DEFAULTS } from "../constants";
import { VALIDATION_LIMITS } from "@common/constants/validation.constants";

/**
 * Alert模块的通知渠道类型枚举
 * 🎯 Alert模块领域内的通知渠道定义，保持事件驱动架构解耦
 */
export enum AlertNotificationChannelType {
  EMAIL = 'email',
  SMS = 'sms',
  WEBHOOK = 'webhook', 
  SLACK = 'slack',
  DINGTALK = 'dingtalk',
  LOG = 'log',
  IN_APP = 'in_app',
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
    enumName: "AlertNotificationChannelType"
  })
  @IsEnum(AlertNotificationChannelType)
  type: AlertNotificationChannelType;

  @ApiProperty({ 
    description: "渠道配置",
    type: "object",
    additionalProperties: true 
  })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({ description: "是否启用", default: true })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: "重试次数", default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(VALIDATION_LIMITS.RETRIES_MIN)
  @Max(VALIDATION_LIMITS.RETRIES_MAX)
  retryCount?: number;

  @ApiPropertyOptional({ description: "超时时间（毫秒）", default: 30000 })
  @IsOptional()
  @IsNumber()
  @Min(VALIDATION_LIMITS.TIMEOUT_MIN)
  @Max(VALIDATION_LIMITS.TIMEOUT_MAX)
  timeout?: number;
}

export class CreateAlertRuleDto {
  @ApiProperty({ description: "告警规则名称" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: "告警规则描述" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "监控指标名称" })
  @IsString()
  metric: string;

  @ApiProperty({
    description: "比较操作符",
    enum: VALID_OPERATORS,
    default: ALERT_DEFAULTS.operator,
  })
  @IsEnum(VALID_OPERATORS)
  operator: Operator;

  @ApiProperty({ description: "阈值" })
  @IsNumber()
  threshold: number;

  @ApiProperty({ 
    description: "持续时间（秒）", 
    default: ALERT_DEFAULTS.duration 
  })
  @IsNumber()
  @Min(VALIDATION_LIMITS.DURATION_MIN)
  @Max(VALIDATION_LIMITS.DURATION_MAX)
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
    default: ALERT_DEFAULTS.enabled 
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: "通知渠道列表", type: [AlertNotificationChannelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AlertNotificationChannelDto)
  channels: AlertNotificationChannelDto[];

  @ApiProperty({ 
    description: "冷却时间（秒）"
  })
  @IsNumber()
  @Min(60)   // 最小1分钟冷却时间
  @Max(7200) // 最大2小时冷却时间
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
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "告警规则描述" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "监控指标名称" })
  @IsOptional()
  @IsString()
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
  @IsNumber()
  threshold?: number;

  @ApiPropertyOptional({ description: "持续时间（秒）" })
  @IsOptional()
  @IsNumber()
  @Min(VALIDATION_LIMITS.DURATION_MIN)
  @Max(VALIDATION_LIMITS.DURATION_MAX)
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
  @IsNumber()
  @Min(60)   // 最小1分钟冷却时间
  @Max(7200) // 最大2小时冷却时间
  cooldown?: number;

  @ApiPropertyOptional({
    description: "标签",
    type: "object",
    additionalProperties: { type: "string" },
  })
  @IsOptional()
  tags?: Record<string, string>;
}

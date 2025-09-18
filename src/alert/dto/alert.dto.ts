import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  Max,
  Matches,
  MaxLength,
  IsArray,
  ValidateNested,
  IsObject,
} from "class-validator";

import { IAlert, IAlertStats } from "../interfaces";
import { AlertSeverity, AlertStatus } from "../types/alert.types";
import { ALERT_DEFAULTS } from "../constants";

// 🎯 使用 Alert 模块内部的验证常量
import { ALERT_VALIDATION_LIMITS } from "../constants/validation.constants";
import { BaseQueryDto } from "../../common/dto/base-query.dto";

/**
 * 配置迁移注释:
 * 🔄 此文件中的VALIDATION_LIMITS使用将迁移到配置系统
 *
 * 迁移目标:
 * - VALIDATION_LIMITS.NAME_MAX_LENGTH → 注入的配置服务
 *
 * 当前阶段：标记过时代码，保持向后兼容性
 * 下个阶段：使用配置服务重构DTO验证逻辑
 **/

export class AlertQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({ description: "告警规则ID" })
  @IsOptional()
  @IsString({ message: "告警规则ID必须是字符串" })
  @MaxLength(ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH, {
    message: `告警规则ID长度不能超过${ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH}个字符`,
  })
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message: "规则ID只能包含字母、数字、横线和下划线",
  })
  ruleId?: string;

  @ApiPropertyOptional({
    description: "告警严重级别",
    enum: AlertSeverity,
  })
  @IsOptional()
  @IsEnum(AlertSeverity, { message: "严重级别必须是有效的枚举值" })
  severity?: AlertSeverity;

  @ApiPropertyOptional({
    description: "告警状态",
    enum: AlertStatus,
  })
  @IsOptional()
  @IsEnum(AlertStatus, { message: "告警状态必须是有效的枚举值" })
  status?: AlertStatus;

  @ApiPropertyOptional({ description: "开始时间" })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: "结束时间" })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: "监控指标名称" })
  @IsOptional()
  @IsString({ message: "监控指标名称必须是字符串" })
  @MaxLength(ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH, {
    message: `监控指标名称长度不能超过${ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH}个字符`,
  })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_\.]*$/, {
    message: "监控指标名称必须以字母开头，可包含字母、数字、下划线和点号",
  })
  metric?: string;

  @ApiPropertyOptional({ description: "排序字段", default: "startTime" })
  @IsOptional()
  @IsString({ message: "排序字段必须是字符串" })
  @MaxLength(ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH, {
    message: `排序字段长度不能超过${ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH}个字符`,
  })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: "排序字段只能包含字母、数字和下划线" })
  sortBy?: string = "startTime";

  @ApiPropertyOptional({
    description: "排序方向",
    enum: ["asc", "desc"],
    default: "desc",
  })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";
}

export class AcknowledgeAlertDto {
  @ApiProperty({ description: "确认人" })
  @IsString()
  acknowledgedBy: string;

  @ApiPropertyOptional({ description: "确认备注" })
  @IsOptional()
  @IsString()
  note?: string;
}

export class ResolveAlertDto {
  @ApiProperty({ description: "解决人" })
  @IsString()
  resolvedBy: string;

  @ApiPropertyOptional({ description: "解决方案描述" })
  @IsOptional()
  @IsString()
  solution?: string;

  @ApiPropertyOptional({ description: "解决备注" })
  @IsOptional()
  @IsString()
  note?: string;
}

export class AlertStatsDto implements IAlertStats {
  @ApiProperty({ description: "总规则数" })
  totalRules: number;

  @ApiProperty({ description: "启用规则数" })
  enabledRules: number;

  @ApiProperty({ description: "活跃告警数" })
  activeAlerts: number;

  @ApiProperty({ description: "严重告警数" })
  criticalAlerts: number;

  @ApiProperty({ description: "警告告警数" })
  warningAlerts: number;

  @ApiProperty({ description: "信息告警数" })
  infoAlerts: number;

  @ApiProperty({ description: "今日总告警数" })
  totalAlertsToday: number;

  @ApiProperty({ description: "今日已解决告警数" })
  resolvedAlertsToday: number;

  @ApiProperty({ description: "平均解决时间（分钟）" })
  averageResolutionTime: number;
}

class MetricDataDto {
  @ApiProperty({ description: "监控指标的名称", example: "cpu.usage" })
  @IsString({ message: "监控指标名称必须是字符串" })
  @MaxLength(ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH, {
    message: `监控指标名称长度不能超过${ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH}个字符`,
  })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_\.]*$/, {
    message: "监控指标名称必须以字母开头，可包含字母、数字、下划线和点号",
  })
  metric: string;

  @ApiProperty({ description: "指标的数值", example: 85.5 })
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: "指标数值必须是有效的数字（不能是NaN或Infinity）" },
  )
  value: number;

  @ApiProperty({ description: "指标的时间戳" })
  @IsDateString()
  timestamp: Date;

  @ApiPropertyOptional({
    description: "指标的标签（键值对）",
    example: { host: "server-1", region: "us-east" },
  })
  @IsOptional()
  @IsObject()
  tags?: Record<string, string>;
}

export class TriggerAlertDto {
  @ApiPropertyOptional({ description: "指定触发的规则ID" })
  @IsOptional()
  @IsString({ message: "规则ID必须是字符串" })
  @MaxLength(ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH, {
    message: `规则ID长度不能超过${ALERT_VALIDATION_LIMITS.NAME_MAX_LENGTH}个字符`,
  })
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message: "规则ID只能包含字母、数字、横线和下划线",
  })
  ruleId?: string;

  @ApiProperty({ type: [MetricDataDto], description: "用于评估的指标数据列表" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetricDataDto)
  metrics: MetricDataDto[];
}

export class AlertResponseDto {
  @ApiProperty({ description: "告警ID" })
  id: string;

  @ApiProperty({ description: "规则ID" })
  ruleId: string;

  @ApiProperty({ description: "规则名称" })
  ruleName: string;

  @ApiProperty({ description: "监控指标" })
  metric: string;

  @ApiProperty({ description: "当前值" })
  value: number;

  @ApiProperty({ description: "阈值" })
  threshold: number;

  @ApiProperty({ description: "严重级别", enum: AlertSeverity })
  severity: AlertSeverity;

  @ApiProperty({ description: "状态", enum: AlertStatus })
  status: AlertStatus;

  @ApiProperty({ description: "告警消息" })
  message: string;

  @ApiProperty({ description: "开始时间" })
  startTime: Date;

  @ApiPropertyOptional({ description: "结束时间" })
  endTime?: Date;

  @ApiPropertyOptional({ description: "确认人" })
  acknowledgedBy?: string;

  @ApiPropertyOptional({ description: "确认时间" })
  acknowledgedAt?: Date;

  @ApiPropertyOptional({ description: "解决人" })
  resolvedBy?: string;

  @ApiPropertyOptional({ description: "解决时间" })
  resolvedAt?: Date;

  @ApiPropertyOptional({
    description: "标签",
    type: "object",
    additionalProperties: { type: "string" },
  })
  tags?: Record<string, string>;

  @ApiPropertyOptional({
    description: "上下文信息",
    type: "object",
    additionalProperties: true,
  })
  context?: Record<string, any>;

  @ApiProperty({ description: "持续时间（毫秒）" })
  duration: number;

  @ApiProperty({ description: "是否活跃" })
  isActive: boolean;

  static fromEntity(alert: IAlert): AlertResponseDto {
    const endTime = alert.endTime || new Date();
    return {
      id: alert.id,
      ruleId: alert.ruleId,
      ruleName: alert.ruleName,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      severity: alert.severity,
      status: alert.status,
      message: alert.message,
      startTime: alert.startTime,
      endTime: alert.endTime,
      acknowledgedBy: alert.acknowledgedBy,
      acknowledgedAt: alert.acknowledgedAt,
      resolvedBy: alert.resolvedBy,
      resolvedAt: alert.resolvedAt,
      tags: alert.tags,
      context: alert.context,
      duration: endTime.getTime() - alert.startTime.getTime(),
      isActive:
        alert.status === AlertStatus.FIRING ||
        alert.status === AlertStatus.ACKNOWLEDGED,
    };
  }
}

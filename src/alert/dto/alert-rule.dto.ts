import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsString, IsNumber, IsEnum, IsBoolean, IsOptional, IsArray, ValidateNested, Min, Max } from "class-validator";

import { AlertSeverity } from "../types/alert.types";

import { NotificationChannelDto } from "./notification-channel.dto";

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
    enum: ["gt", "lt", "eq", "gte", "lte", "ne"],
    default: "gt"
  })
  @IsEnum(["gt", "lt", "eq", "gte", "lte", "ne"])
  operator: "gt" | "lt" | "eq" | "gte" | "lte" | "ne";

  @ApiProperty({ description: "阈值" })
  @IsNumber()
  threshold: number;

  @ApiProperty({ description: "持续时间（秒）", default: 60 })
  @IsNumber()
  @Min(1)
  @Max(3600)
  duration: number;

  @ApiProperty({ 
    description: "告警严重级别", 
    enum: AlertSeverity,
    default: AlertSeverity.WARNING
  })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiProperty({ description: "是否启用", default: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: "通知渠道列表", type: [NotificationChannelDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationChannelDto)
  channels: NotificationChannelDto[];

  @ApiProperty({ description: "冷却时间（秒）", default: 300 })
  @IsNumber()
  @Min(0)
  @Max(86400)
  cooldown: number;

  @ApiPropertyOptional({ description: "标签", type: "object", additionalProperties: { type: "string" } })
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
    enum: ["gt", "lt", "eq", "gte", "lte", "ne"]
  })
  @IsOptional()
  @IsEnum(["gt", "lt", "eq", "gte", "lte", "ne"])
  operator?: "gt" | "lt" | "eq" | "gte" | "lte" | "ne";

  @ApiPropertyOptional({ description: "阈值" })
  @IsOptional()
  @IsNumber()
  threshold?: number;

  @ApiPropertyOptional({ description: "持续时间（秒）" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3600)
  duration?: number;

  @ApiPropertyOptional({ 
    description: "告警严重级别", 
    enum: AlertSeverity
  })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional({ description: "是否启用" })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: "通知渠道列表", type: [NotificationChannelDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationChannelDto)
  channels?: NotificationChannelDto[];

  @ApiPropertyOptional({ description: "冷却时间（秒）" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(86400)
  cooldown?: number;

  @ApiPropertyOptional({ description: "标签", type: "object", additionalProperties: { type: "string" } })
  @IsOptional()
  tags?: Record<string, string>;
}

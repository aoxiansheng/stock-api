import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsObject,
} from "class-validator";

import { NotificationChannelType } from "../types/alert.types";

// ==================== 配置相关DTO ====================

export class EmailConfigDto {
  @ApiProperty({ description: "收件人邮箱" })
  @IsString()
  to: string;

  @ApiProperty({ description: "邮件主题" })
  @IsString()
  subject: string;

  @ApiPropertyOptional({ description: "抄送邮箱" })
  @IsOptional()
  @IsString()
  cc?: string;

  @ApiPropertyOptional({ description: "密送邮箱" })
  @IsOptional()
  @IsString()
  bcc?: string;
}

export class WebhookConfigDto {
  @ApiProperty({ description: "Webhook URL" })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: "HTTP方法", default: "POST" })
  @IsOptional()
  @IsString()
  method?: string;

  @ApiPropertyOptional({
    description: "请求头",
    type: "object",
    additionalProperties: { type: "string" },
  })
  @IsOptional()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ description: "认证令牌" })
  @IsOptional()
  @IsString()
  token?: string;
}

export class SlackConfigDto {
  @ApiProperty({ description: "Slack Webhook URL" })
  @IsString()
  webhook_url: string;

  @ApiProperty({ description: "频道名称" })
  @IsString()
  channel: string;

  @ApiPropertyOptional({ description: "用户名" })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: "图标表情" })
  @IsOptional()
  @IsString()
  icon_emoji?: string;
}

export class DingTalkConfigDto {
  @ApiProperty({ description: "钉钉 Webhook URL" })
  @IsString()
  webhook_url: string;

  @ApiProperty({ description: "安全密钥" })
  @IsString()
  secret: string;

  @ApiPropertyOptional({ description: "@所有人", default: false })
  @IsOptional()
  @IsBoolean()
  at_all?: boolean;

  @ApiPropertyOptional({ description: "@指定用户手机号列表" })
  @IsOptional()
  at_mobiles?: string[];
}

export class SmsConfigDto {
  @ApiProperty({ description: "手机号" })
  @IsString()
  phone: string;

  @ApiProperty({ description: "短信模板ID" })
  @IsString()
  template: string;

  @ApiPropertyOptional({
    description: "模板参数",
    type: "object",
    additionalProperties: { type: "string" },
  })
  @IsOptional()
  params?: Record<string, string>;
}

export class LogConfigDto {
  @ApiProperty({
    description: "日志级别",
    enum: ["error", "warn", "info", "debug"],
  })
  @IsEnum(["error", "warn", "info", "debug"])
  level: string;

  @ApiPropertyOptional({ description: "日志标签" })
  @IsOptional()
  @IsString()
  tag?: string;
}

// ==================== 核心通知渠道DTO（统一定义） ====================

/**
 * 基础通知渠道DTO - 用于告警规则中的嵌套使用
 * 这个是权威定义，替代alert-rule.dto.ts中的重复定义
 */
export class NotificationChannelDto {
  @ApiPropertyOptional({ description: "通知渠道ID" })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: "通知渠道名称" })
  @IsString()
  name: string;

  @ApiProperty({
    description: "通知类型",
    enum: NotificationChannelType,
    enumName: "NotificationChannelType",
  })
  @IsEnum(NotificationChannelType)
  type: NotificationChannelType;

  @ApiProperty({
    description: "通知配置",
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
  @Min(0)
  @Max(10)
  retryCount?: number;

  @ApiPropertyOptional({ description: "超时时间（秒）", default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(300)
  timeout?: number;
}

// ==================== 扩展DTO ====================

/**
 * 创建通知渠道DTO - 用于独立的通知渠道管理API（如果需要）
 */
export class CreateNotificationChannelDto extends NotificationChannelDto {
  // 继承所有字段，但移除可选的id字段的定义
  @ApiPropertyOptional({ description: "通知渠道ID" })
  @IsOptional()
  @IsString()
  id?: never; // 创建时不应该有ID
}

/**
 * 更新通知渠道DTO
 */
export class UpdateNotificationChannelDto {
  @ApiPropertyOptional({ description: "通知渠道名称" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: "通知类型",
    enum: NotificationChannelType,
    enumName: "NotificationChannelType",
  })
  @IsOptional()
  @IsEnum(NotificationChannelType)
  type?: NotificationChannelType;

  @ApiPropertyOptional({
    description: "通知配置",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: "是否启用" })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: "重试次数" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  retryCount?: number;

  @ApiPropertyOptional({ description: "超时时间（秒）" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(300)
  timeout?: number;
}

/**
 * 测试通知渠道DTO
 */
export class TestNotificationChannelDto {
  @ApiProperty({ description: "测试消息" })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: "测试数据",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  testData?: Record<string, any>;
}

/**
 * 通知渠道响应DTO
 */
export class NotificationChannelResponseDto {
  @ApiProperty({ description: "渠道ID" })
  id: string;

  @ApiProperty({ description: "渠道名称" })
  name: string;

  @ApiProperty({ description: "通知类型", enum: NotificationChannelType })
  type: NotificationChannelType;

  @ApiProperty({
    description: "通知配置",
    type: "object",
    additionalProperties: true,
  })
  config: Record<string, any>;

  @ApiProperty({ description: "是否启用" })
  enabled: boolean;

  @ApiProperty({ description: "重试次数" })
  retryCount: number;

  @ApiProperty({ description: "超时时间（秒）" })
  timeout: number;

  @ApiProperty({ description: "创建时间" })
  createdAt: Date;

  @ApiProperty({ description: "更新时间" })
  updatedAt: Date;
}

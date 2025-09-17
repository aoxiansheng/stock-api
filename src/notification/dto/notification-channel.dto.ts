/**
 * 通知渠道DTO
 * 🎯 提供通知渠道相关的数据传输对象
 *
 * @description 从Alert模块迁移的通知渠道DTO，更新为使用Notification类型
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

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
  IsDateString,
  IsUUID,
} from "class-validator";

// 使用Notification模块的类型
import {
  NotificationChannelType,
  NotificationPriority,
  NotificationStatus,
} from "../types/notification.types";

// 使用独立的验证限制常量
import { NOTIFICATION_VALIDATION_LIMITS } from "../constants/validation-limits.constants";

// 导入各类型通知配置DTO
export * from "./channels";

// 导入独立的查询DTO
export { NotificationQueryDto } from "./notification-query.dto";

// ==================== 核心通知渠道DTO ====================

/**
 * 基础通知渠道DTO
 * 用于告警规则中的嵌套使用
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
  @Min(NOTIFICATION_VALIDATION_LIMITS.SEND_RETRIES_MIN)
  @Max(NOTIFICATION_VALIDATION_LIMITS.SEND_RETRIES_MAX)
  retryCount?: number;

  @ApiPropertyOptional({ description: "超时时间（毫秒）", default: 30000 })
  @IsOptional()
  @IsNumber()
  @Min(NOTIFICATION_VALIDATION_LIMITS.SEND_TIMEOUT_MIN)
  @Max(NOTIFICATION_VALIDATION_LIMITS.SEND_TIMEOUT_MAX)
  timeout?: number;

  @ApiPropertyOptional({
    description: "优先级",
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;
}

/**
 * 创建通知渠道DTO
 */
export class CreateNotificationChannelDto {
  @ApiProperty({ description: "通知渠道名称" })
  @IsString()
  name: string;

  @ApiProperty({
    description: "通知渠道类型",
    enum: NotificationChannelType,
  })
  @IsEnum(NotificationChannelType)
  type: NotificationChannelType;

  @ApiProperty({ description: "通知渠道配置" })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({ description: "是否启用", default: true })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: "重试次数", default: 3 })
  @IsOptional()
  @IsNumber()
  @Min(NOTIFICATION_VALIDATION_LIMITS.SEND_RETRIES_MIN)
  @Max(NOTIFICATION_VALIDATION_LIMITS.SEND_RETRIES_MAX)
  retryCount?: number;

  @ApiPropertyOptional({ description: "超时时间（毫秒）", default: 30000 })
  @IsOptional()
  @IsNumber()
  @Min(NOTIFICATION_VALIDATION_LIMITS.SEND_TIMEOUT_MIN)
  @Max(NOTIFICATION_VALIDATION_LIMITS.SEND_TIMEOUT_MAX)
  timeout?: number;

  @ApiPropertyOptional({
    description: "优先级",
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ description: "描述信息" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "标签",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  tags?: Record<string, string>;
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
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: "是否启用" })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ description: "重试次数" })
  @IsOptional()
  @IsNumber()
  @Min(NOTIFICATION_VALIDATION_LIMITS.SEND_RETRIES_MIN)
  @Max(NOTIFICATION_VALIDATION_LIMITS.SEND_RETRIES_MAX)
  retryCount?: number;

  @ApiPropertyOptional({ description: "超时时间（毫秒）" })
  @IsOptional()
  @IsNumber()
  @Min(NOTIFICATION_VALIDATION_LIMITS.SEND_TIMEOUT_MIN)
  @Max(NOTIFICATION_VALIDATION_LIMITS.SEND_TIMEOUT_MAX)
  timeout?: number;

  @ApiPropertyOptional({
    description: "优先级",
    enum: NotificationPriority,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ description: "描述信息" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "标签",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  tags?: Record<string, string>;
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
  @IsObject()
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

  @ApiProperty({ description: "超时时间（毫秒）" })
  timeout: number;

  @ApiProperty({ description: "优先级", enum: NotificationPriority })
  priority: NotificationPriority;

  @ApiPropertyOptional({ description: "描述信息" })
  description?: string;

  @ApiPropertyOptional({
    description: "标签",
    type: "object",
    additionalProperties: true,
  })
  tags?: Record<string, string>;

  @ApiProperty({ description: "创建时间" })
  createdAt: Date;

  @ApiProperty({ description: "更新时间" })
  updatedAt: Date;
}

// ==================== 通知实例相关DTO ====================

/**
 * 创建通知DTO
 */
export class CreateNotificationDto {
  @ApiProperty({ description: "关联的警告ID" })
  @IsString()
  alertId: string;

  @ApiProperty({ description: "使用的通知渠道ID" })
  @IsString()
  channelId: string;

  @ApiProperty({ description: "通知标题" })
  @IsString()
  title: string;

  @ApiProperty({ description: "通知内容" })
  @IsString()
  content: string;

  @ApiProperty({
    description: "优先级",
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @ApiProperty({ description: "目标接收者" })
  @IsString()
  recipient: string;

  @ApiPropertyOptional({
    description: "扩展元数据",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}


/**
 * 通知响应DTO
 */
export class NotificationResponseDto {
  @ApiProperty({ description: "通知ID" })
  id: string;

  @ApiProperty({ description: "警告ID" })
  alertId: string;

  @ApiProperty({ description: "渠道ID" })
  channelId: string;

  @ApiProperty({ description: "渠道类型", enum: NotificationChannelType })
  channelType: NotificationChannelType;

  @ApiProperty({ description: "通知标题" })
  title: string;

  @ApiProperty({ description: "通知内容" })
  content: string;

  @ApiProperty({ description: "通知状态", enum: NotificationStatus })
  status: NotificationStatus;

  @ApiProperty({ description: "优先级", enum: NotificationPriority })
  priority: NotificationPriority;

  @ApiProperty({ description: "目标接收者" })
  recipient: string;

  @ApiPropertyOptional({ description: "发送时间" })
  sentAt?: Date;

  @ApiPropertyOptional({ description: "投递时间" })
  deliveredAt?: Date;

  @ApiPropertyOptional({ description: "失败时间" })
  failedAt?: Date;

  @ApiPropertyOptional({ description: "错误信息" })
  errorMessage?: string;

  @ApiProperty({ description: "重试次数" })
  retryCount: number;

  @ApiPropertyOptional({ description: "发送耗时(ms)" })
  duration?: number;

  @ApiPropertyOptional({
    description: "扩展元数据",
    type: "object",
    additionalProperties: true,
  })
  metadata?: Record<string, any>;

  @ApiProperty({ description: "创建时间" })
  createdAt: Date;

  @ApiProperty({ description: "更新时间" })
  updatedAt: Date;
}

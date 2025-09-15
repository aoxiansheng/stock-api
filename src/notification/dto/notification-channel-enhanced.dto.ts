/**
 * Notification Channel Enhanced DTO
 * 🎯 使用本地配置的增强型通知渠道DTO
 * 
 * @description 移除对@common/constants的依赖，使用通知配置系统的本地验证限制
 * @see docs/代码审查文档/配置文件标准/四层配置体系标准规则与开发指南.md
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

// 导入各类型通知配置DTO
export * from "./channels";

// ==================== 本地验证限制常量 ====================

/**
 * 通知验证限制 - 来自本地配置而非外部依赖
 * 🔒 这些限制值对应NotificationEnhancedConfig中的配置
 */
export const LOCAL_NOTIFICATION_VALIDATION_LIMITS = {
  // 重试次数限制
  SEND_RETRIES_MIN: 1,
  SEND_RETRIES_MAX: 10,
  
  // 超时时间限制（毫秒）
  SEND_TIMEOUT_MIN: 1000,
  SEND_TIMEOUT_MAX: 120000,
  
  // 变量名长度限制 
  VARIABLE_NAME_MIN_LENGTH: 1,
  VARIABLE_NAME_MAX_LENGTH: 100,
  
  // 模板长度限制
  MIN_TEMPLATE_LENGTH: 1,
  MAX_TEMPLATE_LENGTH: 20000,
  
  // 标题和内容长度限制
  TITLE_MAX_LENGTH: 500,
  CONTENT_MAX_LENGTH: 5000,
} as const;

// ==================== 核心通知渠道DTO ====================

/**
 * 基础通知渠道DTO
 * 用于告警规则中的嵌套使用
 */
export class NotificationChannelEnhancedDto {
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
  @Min(LOCAL_NOTIFICATION_VALIDATION_LIMITS.SEND_RETRIES_MIN)
  @Max(LOCAL_NOTIFICATION_VALIDATION_LIMITS.SEND_RETRIES_MAX)
  retryCount?: number;

  @ApiPropertyOptional({ description: "超时时间（毫秒）", default: 30000 })
  @IsOptional()
  @IsNumber()
  @Min(LOCAL_NOTIFICATION_VALIDATION_LIMITS.SEND_TIMEOUT_MIN)
  @Max(LOCAL_NOTIFICATION_VALIDATION_LIMITS.SEND_TIMEOUT_MAX)
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
 * 创建通知渠道DTO - 增强版本
 */
export class CreateNotificationChannelEnhancedDto {
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
  @Min(LOCAL_NOTIFICATION_VALIDATION_LIMITS.SEND_RETRIES_MIN)
  @Max(LOCAL_NOTIFICATION_VALIDATION_LIMITS.SEND_RETRIES_MAX)
  retryCount?: number;

  @ApiPropertyOptional({ description: "超时时间（毫秒）", default: 30000 })
  @IsOptional()
  @IsNumber()
  @Min(LOCAL_NOTIFICATION_VALIDATION_LIMITS.SEND_TIMEOUT_MIN)
  @Max(LOCAL_NOTIFICATION_VALIDATION_LIMITS.SEND_TIMEOUT_MAX)
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
 * 更新通知渠道DTO - 增强版本
 */
export class UpdateNotificationChannelEnhancedDto {
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
  @Min(LOCAL_NOTIFICATION_VALIDATION_LIMITS.SEND_RETRIES_MIN)
  @Max(LOCAL_NOTIFICATION_VALIDATION_LIMITS.SEND_RETRIES_MAX)
  retryCount?: number;

  @ApiPropertyOptional({ description: "超时时间（毫秒）" })
  @IsOptional()
  @IsNumber()
  @Min(LOCAL_NOTIFICATION_VALIDATION_LIMITS.SEND_TIMEOUT_MIN)
  @Max(LOCAL_NOTIFICATION_VALIDATION_LIMITS.SEND_TIMEOUT_MAX)
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
 * 测试通知渠道DTO - 增强版本
 */
export class TestNotificationChannelEnhancedDto {
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
 * 通知渠道响应DTO - 增强版本
 */
export class NotificationChannelResponseEnhancedDto {
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

// ==================== 通知实例相关DTO - 增强版本 ====================

/**
 * 创建通知DTO - 增强版本
 */
export class CreateNotificationEnhancedDto {
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
 * 通知查询DTO - 增强版本
 */
export class NotificationQueryEnhancedDto {
  @ApiPropertyOptional({ description: "警告ID" })
  @IsOptional()
  @IsString()
  alertId?: string;

  @ApiPropertyOptional({ description: "渠道ID" })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiPropertyOptional({ description: "渠道类型", enum: NotificationChannelType })
  @IsOptional()
  @IsEnum(NotificationChannelType)
  channelType?: NotificationChannelType;

  @ApiPropertyOptional({ description: "通知状态", enum: NotificationStatus })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({ description: "优先级", enum: NotificationPriority })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ description: "接收者" })
  @IsOptional()
  @IsString()
  recipient?: string;

  @ApiPropertyOptional({ description: "开始时间" })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: "结束时间" })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: "排序字段", default: "createdAt" })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: "排序方向", enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}

/**
 * 通知响应DTO - 增强版本
 */
export class NotificationResponseEnhancedDto {
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

// ==================== 兼容性导出 ====================

// 兼容性别名，便于逐步迁移
export { NotificationChannelEnhancedDto as NotificationChannelDto };
export { CreateNotificationChannelEnhancedDto as CreateNotificationChannelDto };
export { UpdateNotificationChannelEnhancedDto as UpdateNotificationChannelDto };
export { TestNotificationChannelEnhancedDto as TestNotificationChannelDto };
export { NotificationChannelResponseEnhancedDto as NotificationChannelResponseDto };
export { CreateNotificationEnhancedDto as CreateNotificationDto };
export { NotificationQueryEnhancedDto as NotificationQueryDto };
export { NotificationResponseEnhancedDto as NotificationResponseDto };
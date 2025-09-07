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
import { VALIDATION_LIMITS } from "../constants";

// 导入各类型通知配置DTO
export * from "./notification-channels";

// ==================== 配置相关DTO ====================
// 注意: 各类型的通知配置DTO已拆分到 notification-channels/ 目录
// 通过上方的导入语句统一导出，便于维护

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
  @Min(VALIDATION_LIMITS.COUNT_LIMITS.RETRIES_MIN)
  @Max(VALIDATION_LIMITS.COUNT_LIMITS.RETRIES_MAX)
  retryCount?: number;

  @ApiPropertyOptional({ description: "超时时间（秒）", default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(VALIDATION_LIMITS.TIME_SECONDS.TIMEOUT_MIN)
  @Max(VALIDATION_LIMITS.TIME_SECONDS.TIMEOUT_MAX)
  timeout?: number;
}

// ==================== 扩展DTO ====================

/**
 * 创建通知渠道DTO - 用于独立的通知渠道管理API（如果需要）
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
  @Min(VALIDATION_LIMITS.COUNT_LIMITS.RETRIES_MIN)
  @Max(VALIDATION_LIMITS.COUNT_LIMITS.RETRIES_MAX)
  retryCount?: number;

  @ApiPropertyOptional({ description: "超时时间（秒）", default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(VALIDATION_LIMITS.TIME_SECONDS.TIMEOUT_MIN)
  @Max(VALIDATION_LIMITS.TIME_SECONDS.TIMEOUT_MAX)
  timeout?: number;

  @ApiPropertyOptional({ description: "优先级", default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  priority?: number;
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
  @Min(VALIDATION_LIMITS.COUNT_LIMITS.RETRIES_MIN)
  @Max(VALIDATION_LIMITS.COUNT_LIMITS.RETRIES_MAX)
  retryCount?: number;

  @ApiPropertyOptional({ description: "超时时间（秒）" })
  @IsOptional()
  @IsNumber()
  @Min(VALIDATION_LIMITS.TIME_SECONDS.TIMEOUT_MIN)
  @Max(VALIDATION_LIMITS.TIME_SECONDS.TIMEOUT_MAX)
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

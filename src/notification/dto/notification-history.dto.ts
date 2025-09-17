/**
 * 通知历史DTO
 * 🎯 通知历史记录的数据传输对象
 *
 * @description 用于NotificationHistoryService的输入输出类型定义
 * @author Claude Code Assistant
 * @date 2025-09-12
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BaseQueryDto } from "@common/dto/base-query.dto";
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsNumber,
  IsDateString,
  IsBoolean,
  Min,
  Max,
} from "class-validator";

import {
  NotificationStatus,
  NotificationPriority,
  NotificationChannelType,
} from "../types/notification.types";

/**
 * 创建通知历史记录DTO
 */
export class CreateNotificationHistoryDto {
  @ApiProperty({
    description: "通知ID",
    example: "notif-123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  @IsNotEmpty()
  readonly notificationId: string;

  @ApiProperty({
    description: "关联的警告ID",
    example: "alert-123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  @IsNotEmpty()
  readonly alertId: string;

  @ApiProperty({
    description: "通知渠道ID",
    example: "channel-123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  @IsNotEmpty()
  readonly channelId: string;

  @ApiProperty({
    description: "通知渠道类型",
    enum: NotificationChannelType,
  })
  @IsEnum(NotificationChannelType)
  readonly channelType: NotificationChannelType;

  @ApiProperty({
    description: "通知状态",
    enum: NotificationStatus,
  })
  @IsEnum(NotificationStatus)
  readonly status: NotificationStatus;

  @ApiProperty({
    description: "通知优先级",
    enum: NotificationPriority,
  })
  @IsEnum(NotificationPriority)
  readonly priority: NotificationPriority;

  @ApiProperty({
    description: "目标接收者",
    example: "user@example.com",
  })
  @IsString()
  @IsNotEmpty()
  readonly recipient: string;

  @ApiProperty({
    description: "通知标题",
    example: "股价异常警告",
  })
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @ApiProperty({
    description: "通知内容",
    example: "股票 AAPL 价格超出预设阈值",
  })
  @IsString()
  @IsNotEmpty()
  readonly content: string;

  @ApiProperty({
    description: "发送时间",
  })
  @IsDateString()
  readonly sentAt: string;

  @ApiPropertyOptional({
    description: "投递时间",
  })
  @IsOptional()
  @IsDateString()
  readonly deliveredAt?: string;

  @ApiPropertyOptional({
    description: "失败时间",
  })
  @IsOptional()
  @IsDateString()
  readonly failedAt?: string;

  @ApiPropertyOptional({
    description: "错误信息",
  })
  @IsOptional()
  @IsString()
  readonly errorMessage?: string;

  @ApiProperty({
    description: "重试次数",
    example: 0,
  })
  @IsNumber()
  @Min(0)
  readonly retryCount: number;

  @ApiPropertyOptional({
    description: "发送耗时(ms)",
    example: 150,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  readonly duration?: number;

  @ApiPropertyOptional({
    description: "扩展元数据",
    type: "object",
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  readonly metadata?: Record<string, any>;
}

/**
 * 通知历史响应DTO
 */
export class NotificationHistoryDto {
  @ApiProperty({ description: "历史记录ID" })
  id: string;

  @ApiProperty({ description: "通知ID" })
  notificationId: string;

  @ApiProperty({ description: "警告ID" })
  alertId: string;

  @ApiProperty({ description: "渠道ID" })
  channelId: string;

  @ApiProperty({ description: "渠道类型", enum: NotificationChannelType })
  channelType: NotificationChannelType;

  @ApiProperty({ description: "通知状态", enum: NotificationStatus })
  status: NotificationStatus;

  @ApiProperty({ description: "优先级", enum: NotificationPriority })
  priority: NotificationPriority;

  @ApiProperty({ description: "接收者" })
  recipient: string;

  @ApiProperty({ description: "通知标题" })
  title: string;

  @ApiProperty({ description: "通知内容" })
  content: string;

  @ApiProperty({ description: "发送时间" })
  sentAt: Date;

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

  @ApiPropertyOptional({ description: "扩展元数据" })
  metadata?: Record<string, any>;

  @ApiProperty({ description: "创建时间" })
  createdAt: Date;

  @ApiProperty({ description: "更新时间" })
  updatedAt: Date;
}

/**
 * 通知历史查询DTO
 * 继承BaseQueryDto，自动获得分页参数和验证
 */
export class NotificationHistoryQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({
    description: "警告ID",
    example: "alert-123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsString()
  alertId?: string;

  @ApiPropertyOptional({
    description: "通知ID",
    example: "notif-123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsString()
  notificationId?: string;

  @ApiPropertyOptional({
    description: "渠道ID",
    example: "channel-123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiPropertyOptional({
    description: "渠道类型",
    enum: NotificationChannelType,
  })
  @IsOptional()
  @IsEnum(NotificationChannelType)
  channelType?: NotificationChannelType;

  @ApiPropertyOptional({
    description: "通知状态",
    enum: NotificationStatus,
  })
  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @ApiPropertyOptional({
    description: "优先级",
    enum: NotificationPriority,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: "接收者",
    example: "user@example.com",
  })
  @IsOptional()
  @IsString()
  recipient?: string;

  @ApiPropertyOptional({
    description: "开始时间",
    example: "2025-09-01T00:00:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: "结束时间",
    example: "2025-09-30T23:59:59.999Z",
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: "排序字段",
    default: "sentAt",
    example: "sentAt",
  })
  @IsOptional()
  @IsString()
  sortBy?: string = "sentAt";

  @ApiPropertyOptional({
    description: "排序方向",
    enum: ["asc", "desc"],
    default: "desc",
  })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";
}

/**
 * 通知统计信息DTO
 */
export class NotificationStatsDto {
  @ApiProperty({ description: "统计时间戳" })
  timestamp: Date;

  @ApiProperty({ description: "统计周期" })
  period: string;

  @ApiProperty({ description: "总通知数" })
  totalNotifications: number;

  @ApiProperty({ description: "成功通知数" })
  successfulNotifications: number;

  @ApiProperty({ description: "失败通知数" })
  failedNotifications: number;

  @ApiProperty({ description: "平均发送时间(ms)" })
  averageSendTime: number;

  @ApiProperty({ description: "成功率(%)" })
  successRate: number;

  @ApiProperty({
    description: "按渠道统计",
    type: "object",
    additionalProperties: {
      type: "object",
      properties: {
        total: { type: "number" },
        successful: { type: "number" },
        failed: { type: "number" },
        averageSendTime: { type: "number" },
      },
    },
  })
  byChannel: Record<
    NotificationChannelType,
    {
      total: number;
      successful: number;
      failed: number;
      averageSendTime: number;
    }
  >;

  @ApiProperty({
    description: "按优先级统计",
    type: "object",
    additionalProperties: {
      type: "object",
      properties: {
        total: { type: "number" },
        successful: { type: "number" },
        failed: { type: "number" },
      },
    },
  })
  byPriority: Record<
    NotificationPriority,
    {
      total: number;
      successful: number;
      failed: number;
    }
  >;

  @ApiProperty({
    description: "按状态统计",
    type: "object",
    additionalProperties: { type: "number" },
  })
  byStatus: Record<NotificationStatus, number>;
}

/**
 * 批量重试结果DTO
 */
export class BatchRetryResultDto {
  @ApiProperty({ description: "总数" })
  total: number;

  @ApiProperty({ description: "重试成功数" })
  retried: number;

  @ApiProperty({ description: "重试失败数" })
  failed: number;

  @ApiProperty({
    description: "失败详情",
    type: [Object],
  })
  failures: Array<{
    notificationId: string;
    error: string;
  }>;

  @ApiProperty({ description: "处理时间" })
  processedAt: Date;
}

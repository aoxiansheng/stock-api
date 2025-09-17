/**
 * 通知查询DTO
 * 🎯 通知查询的数据传输对象
 *
 * @description 继承BaseQueryDto，提供标准化的分页查询功能
 * @author Claude Code Assistant
 * @date 2025-09-16
 */

import { ApiPropertyOptional } from "@nestjs/swagger";
import { BaseQueryDto } from "@common/dto/base-query.dto";
import { IsString, IsEnum, IsOptional, IsDateString } from "class-validator";

import {
  NotificationStatus,
  NotificationPriority,
  NotificationChannelType,
} from "../types/notification.types";

/**
 * 通知查询DTO
 * 继承BaseQueryDto，自动获得分页参数和验证
 */
export class NotificationQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({
    description: "警告ID",
    example: "alert-123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsString()
  alertId?: string;

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

  // 继承自BaseQueryDto的标准分页和排序功能，无需重复定义
  // BaseQueryDto 已提供：page, limit, sortBy, sortOrder
  // 默认排序字段可在服务层设置为 'sentAt'
}

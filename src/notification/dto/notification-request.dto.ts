/**
 * 通知请求DTO
 * 🎯 用于解耦Alert模块的独立通知请求数据传输对象
 * 
 * @description 替代直接使用Alert类型，通过DTO实现模块间松耦合
 * @author Claude Code Assistant
 * @date 2025-09-12
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
  IsDateString,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// 使用Notification模块的独立类型
import {
  NotificationPriority,
  NotificationChannelType,
} from '../types/notification.types';

/**
 * 通知请求DTO
 * 独立的数据传输对象，不依赖Alert模块类型
 */
export class NotificationRequestDto {
  @ApiProperty({ 
    description: '警告ID - 来源警告的唯一标识符',
    example: 'alert-123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  @IsNotEmpty()
  readonly alertId: string;

  @ApiProperty({
    description: '通知优先级',
    enum: NotificationPriority,
    example: NotificationPriority.HIGH
  })
  @IsEnum(NotificationPriority)
  readonly severity: NotificationPriority;

  @ApiProperty({
    description: '通知标题',
    example: '股价异常警告'
  })
  @IsString()
  @IsNotEmpty()
  readonly title: string;

  @ApiProperty({
    description: '通知消息内容',
    example: '股票 AAPL 价格超出预设阈值'
  })
  @IsString()
  @IsNotEmpty()
  readonly message: string;

  @ApiPropertyOptional({
    description: '通知上下文元数据',
    type: 'object',
    additionalProperties: true,
    example: {
      symbol: 'AAPL',
      price: 150.5,
      threshold: 150,
      timestamp: '2025-09-12T10:30:00Z'
    }
  })
  @IsOptional()
  @IsObject()
  readonly metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: '指定的通知渠道类型列表',
    type: [String],
    enum: NotificationChannelType,
    example: [NotificationChannelType.EMAIL, NotificationChannelType.SLACK]
  })
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationChannelType, { each: true })
  readonly channelTypes?: NotificationChannelType[];

  @ApiPropertyOptional({
    description: '目标接收者列表',
    type: [String],
    example: ['user@example.com', 'admin@example.com']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly recipients?: string[];

  @ApiPropertyOptional({
    description: '触发时间',
    example: '2025-09-12T10:30:00Z'
  })
  @IsOptional()
  @IsDateString()
  readonly triggeredAt?: string;

  @ApiPropertyOptional({
    description: '是否需要确认回复',
    default: false
  })
  @IsOptional()
  @IsBoolean()
  readonly requiresAcknowledgment?: boolean;

  @ApiPropertyOptional({
    description: '通知标签，用于分类和过滤',
    type: [String],
    example: ['stock-alert', 'price-threshold']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly tags?: string[];
}

/**
 * 批量通知请求DTO
 */
export class BatchNotificationRequestDto {
  @ApiProperty({
    description: '通知请求列表',
    type: [NotificationRequestDto]
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationRequestDto)
  readonly requests: NotificationRequestDto[];

  @ApiPropertyOptional({
    description: '批量处理并发数限制',
    default: 10,
    minimum: 1,
    maximum: 50
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  readonly concurrency?: number;

  @ApiPropertyOptional({
    description: '失败时是否继续处理其他请求',
    default: true
  })
  @IsOptional()
  @IsBoolean()
  readonly continueOnFailure?: boolean;
}

/**
 * 通知请求结果DTO
 */
export class NotificationRequestResultDto {
  @ApiProperty({
    description: '请求ID',
    example: 'req-123e4567-e89b-12d3-a456-426614174000'
  })
  requestId: string;

  @ApiProperty({
    description: '是否成功',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: '通知ID列表',
    type: [String],
    example: ['notif-1', 'notif-2']
  })
  notificationIds: string[];

  @ApiPropertyOptional({
    description: '错误信息'
  })
  errorMessage?: string;

  @ApiProperty({
    description: '处理耗时(ms)',
    example: 150
  })
  duration: number;

  @ApiProperty({
    description: '处理时间'
  })
  processedAt: Date;

  @ApiPropertyOptional({
    description: '渠道处理结果详情',
    type: 'object',
    additionalProperties: true
  })
  channelResults?: Record<string, {
    success: boolean;
    notificationId?: string;
    error?: string;
    duration?: number;
  }>;
}

/**
 * 创建通知请求的工厂函数
 */
export class NotificationRequestFactory {
  /**
   * 从Alert事件创建通知请求
   */
  static fromAlertEvent(alertData: {
    alertId: string;
    severity: string;
    title: string;
    message: string;
    metadata?: Record<string, any>;
    triggeredAt?: Date;
  }): NotificationRequestDto {
    return {
      alertId: alertData.alertId,
      severity: this.mapSeverity(alertData.severity),
      title: alertData.title,
      message: alertData.message,
      metadata: alertData.metadata,
      triggeredAt: alertData.triggeredAt?.toISOString(),
    };
  }

  /**
   * 映射Alert严重级别到Notification优先级
   */
  private static mapSeverity(alertSeverity: string): NotificationPriority {
    const severityMap: Record<string, NotificationPriority> = {
      'low': NotificationPriority.LOW,
      'normal': NotificationPriority.NORMAL,
      'medium': NotificationPriority.NORMAL,
      'high': NotificationPriority.HIGH,
      'urgent': NotificationPriority.URGENT,
      'critical': NotificationPriority.CRITICAL,
    };

    return severityMap[alertSeverity.toLowerCase()] || NotificationPriority.NORMAL;
  }
}
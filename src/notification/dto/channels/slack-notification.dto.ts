/**
 * Slack通知配置DTO
 * 🎯 提供Slack通知渠道的配置数据传输对象
 * 
 * @description 从Alert模块迁移的Slack通知配置DTO
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

/**
 * Slack通知配置DTO
 */
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
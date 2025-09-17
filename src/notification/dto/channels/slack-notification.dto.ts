/**
 * Slack通知配置DTO
 * 🎯 提供Slack通知渠道的配置数据传输对象
 *
 * @description 从Alert模块迁移的Slack通知配置DTO
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsNotEmpty, MaxLength } from "class-validator";
import { IsValidUrl } from "@common/validators";

/**
 * Slack通知配置DTO
 */
export class SlackConfigDto {
  @ApiProperty({
    description: "Slack Webhook URL",
    example:
      "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
  })
  @IsValidUrl({ message: "Slack Webhook URL格式不正确" })
  webhook_url: string;

  @ApiProperty({
    description: "频道名称",
    example: "#alerts",
  })
  @IsString()
  @IsNotEmpty({ message: "频道名称不能为空" })
  @MaxLength(80, { message: "频道名称不能超过80字符" })
  channel: string;

  @ApiPropertyOptional({
    description: "用户名",
    example: "AlertBot",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "用户名不能超过50字符" })
  username?: string;

  @ApiPropertyOptional({
    description: "图标表情",
    example: ":warning:",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: "图标表情不能超过50字符" })
  icon_emoji?: string;
}

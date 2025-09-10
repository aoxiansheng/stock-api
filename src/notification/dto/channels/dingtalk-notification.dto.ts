/**
 * 钉钉通知配置DTO
 * 🎯 提供钉钉通知渠道的配置数据传输对象
 * 
 * @description 从Alert模块迁移的钉钉通知配置DTO
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsBoolean } from "class-validator";

/**
 * 钉钉通知配置DTO
 */
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
/**
 * Webhook通知配置DTO
 * 🎯 提供Webhook通知渠道的配置数据传输对象
 * 
 * @description 从Alert模块迁移的Webhook通知配置DTO
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

/**
 * Webhook通知配置DTO
 */
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
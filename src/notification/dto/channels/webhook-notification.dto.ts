/**
 * Webhook通知配置DTO
 * 🎯 提供Webhook通知渠道的配置数据传输对象
 *
 * @description 从Alert模块迁移的Webhook通知配置DTO
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { IsValidUrl } from "@common/validators";

/**
 * Webhook通知配置DTO
 */
export class WebhookConfigDto {
  @ApiProperty({
    description: "Webhook URL",
    example: "https://api.example.com/webhook",
  })
  @IsValidUrl({ message: "Webhook URL格式不正确" })
  url: string;

  @ApiPropertyOptional({
    description: "HTTP方法",
    default: "POST",
    enum: ["GET", "POST", "PUT", "PATCH"],
  })
  @IsOptional()
  @IsEnum(["GET", "POST", "PUT", "PATCH"])
  method?: string = "POST";

  @ApiPropertyOptional({
    description: "请求头",
    type: "object",
    additionalProperties: { type: "string" },
    example: {
      "Content-Type": "application/json",
      Authorization: "Bearer token",
    },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: "请求超时(毫秒)",
    minimum: 1000,
    maximum: 60000,
    default: 5000,
    example: 5000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(60000)
  timeout?: number = 5000;

  @ApiPropertyOptional({
    description: "认证令牌",
    example: "Bearer your-token-here",
  })
  @IsOptional()
  @IsString()
  token?: string;
}

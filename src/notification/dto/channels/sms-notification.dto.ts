/**
 * 短信通知配置DTO
 * 🎯 提供短信通知渠道的配置数据传输对象
 * 
 * @description 从Alert模块迁移的短信通知配置DTO
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

/**
 * 短信通知配置DTO
 */
export class SmsConfigDto {
  @ApiProperty({ description: "手机号" })
  @IsString()
  phone: string;

  @ApiProperty({ description: "短信模板ID" })
  @IsString()
  template: string;

  @ApiPropertyOptional({
    description: "模板参数",
    type: "object",
    additionalProperties: { type: "string" },
  })
  @IsOptional()
  params?: Record<string, string>;
}
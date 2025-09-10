/**
 * 邮件通知配置DTO
 * 🎯 提供邮件通知渠道的配置数据传输对象
 * 
 * @description 从Alert模块迁移的邮件通知配置DTO
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

/**
 * 邮件通知配置DTO
 */
export class EmailConfigDto {
  @ApiProperty({ description: "收件人邮箱" })
  @IsString()
  to: string;

  @ApiProperty({ description: "邮件主题" })
  @IsString()
  subject: string;

  @ApiPropertyOptional({ description: "抄送邮箱" })
  @IsOptional()
  @IsString()
  cc?: string;

  @ApiPropertyOptional({ description: "密送邮箱" })
  @IsOptional()
  @IsString()
  bcc?: string;
}
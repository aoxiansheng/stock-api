/**
 * 邮件通知配置DTO
 * 🎯 提供邮件通知渠道的配置数据传输对象
 *
 * @description 从Alert模块迁移的邮件通知配置DTO
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsNotEmpty, MaxLength } from "class-validator";
import { IsValidEmail } from "@common/validators";

/**
 * 邮件通知配置DTO
 */
export class EmailConfigDto {
  @ApiProperty({
    description: "收件人邮箱",
    example: "user@example.com",
  })
  @IsValidEmail({ message: "收件人邮箱格式不正确" })
  to: string;

  @ApiProperty({
    description: "邮件主题",
    minLength: 1,
    maxLength: 200,
    example: "股价异常警告",
  })
  @IsString()
  @IsNotEmpty({ message: "邮件主题不能为空" })
  @MaxLength(200, { message: "邮件主题不能超过200字符" })
  subject: string;

  @ApiPropertyOptional({
    description: "抄送邮箱",
    example: "cc@example.com",
  })
  @IsOptional()
  @IsValidEmail({ message: "抄送邮箱格式不正确" })
  cc?: string;

  @ApiPropertyOptional({
    description: "密送邮箱",
    example: "bcc@example.com",
  })
  @IsOptional()
  @IsValidEmail({ message: "密送邮箱格式不正确" })
  bcc?: string;
}

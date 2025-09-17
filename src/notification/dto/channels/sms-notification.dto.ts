/**
 * 短信通知配置DTO
 * 🎯 提供短信通知渠道的配置数据传输对象
 *
 * @description 从Alert模块迁移的短信通知配置DTO
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsObject,
  ValidateNested,
  IsNotEmpty,
  MaxLength,
} from "class-validator";
import { IsValidPhoneNumber } from "@common/validators";

/**
 * 短信通知配置DTO
 */
export class SmsConfigDto {
  @ApiProperty({
    description: "手机号",
    example: "+86138****8888",
  })
  @IsValidPhoneNumber({ message: "手机号格式不正确" })
  phone: string;

  @ApiProperty({
    description: "短信模板ID",
    minLength: 1,
    maxLength: 50,
    example: "SMS_123456789",
  })
  @IsString()
  @IsNotEmpty({ message: "短信模板ID不能为空" })
  @MaxLength(50, { message: "模板ID不能超过50字符" })
  template: string;

  @ApiPropertyOptional({
    description: "模板参数",
    type: "object",
    additionalProperties: { type: "string" },
    example: { code: "123456", product: "股票警告" },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  params?: Record<string, string>;
}

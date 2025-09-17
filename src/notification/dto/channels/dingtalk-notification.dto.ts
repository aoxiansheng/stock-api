/**
 * 钉钉通知配置DTO
 * 🎯 提供钉钉通知渠道的配置数据传输对象
 *
 * @description 从Alert模块迁移的钉钉通知配置DTO
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  IsArray,
} from "class-validator";
import { IsValidUrl, IsValidPhoneNumber } from "@common/validators";

/**
 * 钉钉通知配置DTO
 */
export class DingTalkConfigDto {
  @ApiProperty({
    description: "钉钉 Webhook URL",
    example: "https://oapi.dingtalk.com/robot/send?access_token=XXXXXX",
  })
  @IsValidUrl({ message: "钉钉 Webhook URL格式不正确" })
  webhook_url: string;

  @ApiProperty({
    description: "安全密钥",
    example: "SECxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  })
  @IsString()
  @IsNotEmpty({ message: "安全密钥不能为空" })
  secret: string;

  @ApiPropertyOptional({
    description: "@所有人",
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  at_all?: boolean = false;

  @ApiPropertyOptional({
    description: "@指定用户手机号列表",
    type: [String],
    example: ["+8613812345678", "+8613987654321"],
  })
  @IsOptional()
  @IsArray()
  at_mobiles?: string[];
}

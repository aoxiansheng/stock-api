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

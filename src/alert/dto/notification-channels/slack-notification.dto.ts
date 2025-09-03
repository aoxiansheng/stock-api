import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

/**
 * Slack通知配置DTO
 */
export class SlackConfigDto {
  @ApiProperty({ description: "Slack Webhook URL" })
  @IsString()
  webhook_url: string;

  @ApiProperty({ description: "频道名称" })
  @IsString()
  channel: string;

  @ApiPropertyOptional({ description: "用户名" })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ description: "图标表情" })
  @IsOptional()
  @IsString()
  icon_emoji?: string;
}

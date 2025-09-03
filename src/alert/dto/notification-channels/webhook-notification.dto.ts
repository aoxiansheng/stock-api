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

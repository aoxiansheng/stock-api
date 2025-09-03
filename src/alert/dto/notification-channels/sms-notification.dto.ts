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

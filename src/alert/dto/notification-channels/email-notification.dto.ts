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

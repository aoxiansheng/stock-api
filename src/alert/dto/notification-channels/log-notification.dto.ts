import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

/**
 * 日志通知配置DTO
 */
export class LogConfigDto {
  @ApiProperty({
    description: "日志级别",
    enum: ["error", "warn", "info", "debug"],
  })
  @IsEnum(["error", "warn", "info", "debug"])
  level: string;

  @ApiPropertyOptional({ description: "日志标签" })
  @IsOptional()
  @IsString()
  tag?: string;
}

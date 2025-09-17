/**
 * 日志通知配置DTO
 * 🎯 提供日志通知渠道的配置数据传输对象
 *
 * @description 从Alert模块迁移的日志通知配置DTO
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

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

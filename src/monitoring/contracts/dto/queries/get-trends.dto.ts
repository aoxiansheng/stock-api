/**
 * 🎯 趋势查询参数 DTO
 *
 * 用于验证趋势分析API的查询参数
 * 继承BaseQueryDto获得标准分页功能
 *
 * @extends BaseQueryDto 获得page和limit属性，支持标准分页
 */

import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, IsIn } from "class-validator";
import { BaseQueryDto } from "@common/dto/base-query.dto";

export class GetTrendsDto extends BaseQueryDto {
  // 继承自BaseQueryDto:
  // - page?: number = 1    // 页码，范围1+
  // - limit?: number = 50  // 每页条数，范围1-1000

  @ApiProperty({
    description: "分析周期",
    required: false,
    enum: ["1h", "4h", "12h", "24h", "7d", "30d"],
    default: "1h",
    example: "1h",
  })
  @IsOptional()
  @IsString()
  @IsIn(["1h", "4h", "12h", "24h", "7d", "30d"], {
    message: "period 必须是以下值之一: 1h, 4h, 12h, 24h, 7d, 30d",
  })
  period?: string = "1h";
}

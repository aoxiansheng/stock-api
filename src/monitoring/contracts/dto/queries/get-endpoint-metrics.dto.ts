/**
 * 🎯 端点指标查询参数 DTO
 *
 * 用于验证端点指标API的查询参数
 * 继承BaseQueryDto获得标准分页功能
 *
 * @extends BaseQueryDto 获得page和limit属性，支持标准分页
 */

import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { BaseQueryDto } from "@common/dto/base-query.dto";

export class GetEndpointMetricsDto extends BaseQueryDto {
  // 继承自BaseQueryDto:
  // - page?: number = 1    // 页码，范围1+
  // - limit?: number = 50  // 每页条数，范围1-1000

  // 可选：重写limit属性以适配原有API限制（500而非1000）
  @ApiProperty({
    description: "返回结果数量限制",
    required: false,
    minimum: 1,
    maximum: 500,
    default: 50,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "limit 必须为数字" })
  @Min(1, { message: "limit 最小值为1" })
  @Max(500, { message: "limit 最大值为500" })
  limit?: number = 50;
}

import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsNumber, Min, Max } from "class-validator";
import { PERFORMANCE_CONSTANTS } from "../constants/unified/performance.constants";

/**
 * 基础查询DTO
 * 包含通用的分页和查询参数
 * 🎯 位于common模块，供所有需要分页的DTO继承
 */
export class BaseQueryDto {
  @ApiPropertyOptional({
    description: "页码，默认为1",
    example: 1,
    minimum: 1,
    default: 1,
    type: Number
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "页码必须为数字" })
  @Min(1, { message: "页码必须大于0" })
  page?: number = 1;

  @ApiPropertyOptional({
    description: "每页条数，默认为10",
    example: PERFORMANCE_CONSTANTS.BATCH_LIMITS.DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: PERFORMANCE_CONSTANTS.BATCH_LIMITS.MAX_PAGE_SIZE,
    default: PERFORMANCE_CONSTANTS.BATCH_LIMITS.DEFAULT_PAGE_SIZE,
    type: Number
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: "每页条数必须为数字" })
  @Min(1, { message: "每页条数必须大于0" })
  @Max(PERFORMANCE_CONSTANTS.BATCH_LIMITS.MAX_PAGE_SIZE, { message: "每页条数不能超过100" })
  limit?: number = PERFORMANCE_CONSTANTS.BATCH_LIMITS.DEFAULT_PAGE_SIZE;
}
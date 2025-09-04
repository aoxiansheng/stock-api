import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsNumber, Min, Max } from "class-validator";
import { DATA_MAPPER_CONFIG, DATA_MAPPER_DEFAULTS } from "../../constants/data-mapper.constants";

/**
 * 基础查询DTO
 * 包含通用的分页和查询参数
 */
export class BaseQueryDto {
  @ApiPropertyOptional({
    description: "页码",
    example: 1,
    minimum: 1,
    default: DATA_MAPPER_DEFAULTS.PAGE_NUMBER,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = DATA_MAPPER_DEFAULTS.PAGE_NUMBER;

  @ApiPropertyOptional({
    description: "每页数量",
    example: DATA_MAPPER_CONFIG.DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: DATA_MAPPER_CONFIG.MAX_PAGE_SIZE,
    default: DATA_MAPPER_CONFIG.DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(DATA_MAPPER_CONFIG.MAX_PAGE_SIZE)
  limit?: number = DATA_MAPPER_CONFIG.DEFAULT_PAGE_SIZE;
}
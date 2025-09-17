import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsNumber, IsOptional } from "class-validator";
import { BaseQueryDto } from "@common/dto/base-query.dto";
import { CacheStatistics, KeyPattern } from "../shared/cache-shared.interfaces";

/**
 * 缓存键模式分析查询DTO
 * 🎯 Phase 5: DTO标准化 - 支持分页查询键模式分析数据
 * ✅ 继承BaseQueryDto获得标准分页功能
 * 🔄 与Common组件分页标准化集成
 */
export class CacheKeyPatternAnalysisQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({
    description: "键模式过滤条件（支持通配符）",
    example: "user:*",
  })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiPropertyOptional({
    description: "最小命中次数过滤",
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  minHits?: number;
}

/**
 * 缓存键模式分析结果DTO
 * 🎯 纯数据DTO，用于分页响应的items字段
 */
export class CacheKeyPatternAnalysisDto implements CacheStatistics, KeyPattern {
  @ApiProperty({ description: "键模式" })
  @IsString()
  pattern: string;

  @ApiProperty({ description: "命中次数" })
  @IsNumber()
  hits: number;

  @ApiProperty({ description: "未命中次数" })
  @IsNumber()
  misses: number;

  @ApiProperty({ description: "命中率" })
  @IsNumber()
  hitRate: number;

  @ApiProperty({ description: "总请求数" })
  @IsNumber()
  totalRequests: number;

  @ApiProperty({ description: "最后访问时间" })
  @IsNumber()
  lastAccessTime: number;
}

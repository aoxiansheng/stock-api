import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
} from "class-validator";
import { CacheStatistics } from "../shared/cache-statistics.interface";
import { KeyPattern } from "../shared/key-pattern.interface";

/**
 * 缓存键模式分析DTO
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
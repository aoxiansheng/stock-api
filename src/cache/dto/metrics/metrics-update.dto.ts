import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
} from "class-validator";

/**
 * 缓存指标更新DTO
 */
export class CacheMetricsUpdateDto {
  @ApiProperty({ description: "缓存键" })
  @IsString()
  key: string;

  @ApiProperty({ description: "操作类型", enum: ["hit", "miss", "set"] })
  @IsEnum(["hit", "miss", "set"])
  operation: "hit" | "miss" | "set";

  @ApiProperty({ description: "键模式" })
  @IsString()
  pattern: string;

  @ApiProperty({ description: "操作时间戳" })
  @IsNumber()
  timestamp: number;

  @ApiProperty({ description: "执行时间（毫秒）", required: false })
  @IsOptional()
  @IsNumber()
  executionTime?: number;
}
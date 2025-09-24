import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from "class-validator";

/**
 * 缓存计算选项DTO
 */
export class CacheComputeOptionsDto {
  @ApiPropertyOptional({
    description: "自定义TTL（秒）",
    minimum: 30,
    maximum: 86400,
  })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(86400)
  customTtl?: number;

  @ApiPropertyOptional({ description: "是否启用压缩", default: false })
  @IsOptional()
  @IsBoolean()
  enableCompression?: boolean;

  @ApiPropertyOptional({ description: "压缩阈值（字节）", default: 10240 })
  @IsOptional()
  @IsNumber()
  @Min(1024)
  compressionThreshold?: number;

  @ApiPropertyOptional({
    description: "缓存优先级",
    enum: ["high", "normal", "low"],
    default: "normal",
  })
  @IsOptional()
  @IsEnum(["high", "normal", "low"])
  priority?: "high" | "normal" | "low";

  @ApiPropertyOptional({ description: "自定义标签" })
  @IsOptional()
  tags?: Record<string, string>;
}


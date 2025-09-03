import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsEnum,
  Min,
  Max,
} from "class-validator";

/**
 * TTL计算参数DTO
 */
export class TtlComputeParamsDto {
  @ApiProperty({ description: "基础TTL（秒）", minimum: 30, maximum: 86400 })
  @IsNumber()
  @Min(30)
  @Max(86400)
  baseTtl: number;

  @ApiProperty({
    description: "市场状态",
    enum: ["pre_market", "market", "after_market", "closed"],
  })
  @IsEnum(["pre_market", "market", "after_market", "closed"])
  marketStatus: "pre_market" | "market" | "after_market" | "closed";

  @ApiProperty({
    description: "数据新鲜度要求",
    enum: ["real_time", "near_real_time", "delayed"],
  })
  @IsEnum(["real_time", "near_real_time", "delayed"])
  freshness: "real_time" | "near_real_time" | "delayed";

  @ApiPropertyOptional({ description: "市场标识符" })
  @IsOptional()
  @IsString()
  market?: string;

  @ApiPropertyOptional({ description: "符号列表" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  symbols?: string[];

  @ApiPropertyOptional({ description: "数据提供商" })
  @IsOptional()
  @IsString()
  provider?: string;
}

/**
 * TTL计算结果DTO
 */
export class TtlComputeResultDto {
  @ApiProperty({ description: "计算得出的TTL（秒）" })
  ttl: number;

  @ApiProperty({ description: "计算依据" })
  reason: string;

  @ApiProperty({ description: "是否为动态计算" })
  isDynamic: boolean;

  @ApiPropertyOptional({ description: "市场因子影响" })
  marketFactor?: number;

  @ApiPropertyOptional({ description: "新鲜度因子影响" })
  freshnessFactor?: number;

  @ApiPropertyOptional({ description: "计算时间戳" })
  computedAt?: number;
}

import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsObject,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsNumber,
} from "class-validator";
import { CacheConfigDto } from "../config/cache-config.dto";

/**
 * 缓存预热配置DTO
 */
export class CacheWarmupConfigDto<T = any> {
  @ApiProperty({ description: "预热数据" })
  @IsObject()
  warmupData: Map<string, T>;

  @ApiProperty({ description: "缓存配置" })
  @ValidateNested()
  @Type(() => CacheConfigDto)
  config: CacheConfigDto;

  @ApiProperty({
    description: "预热策略",
    enum: ["sequential", "parallel"],
    required: false,
  })
  @IsOptional()
  @IsEnum(["sequential", "parallel"])
  strategy?: "sequential" | "parallel";

  @ApiProperty({ description: "最大并发数", required: false })
  @IsOptional()
  @IsNumber()
  maxConcurrency?: number;
}

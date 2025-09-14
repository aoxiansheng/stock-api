import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsObject,
  IsNumber,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { CacheConfigDto } from "../config/cache-config.dto";
import { BatchSizeInfo, RequiredTTL } from "../shared/cache-shared.interfaces";

/**
 * 批量缓存操作DTO
 */
export class BatchCacheOperationDto<T = any> implements BatchSizeInfo, RequiredTTL {
  @ApiProperty({ description: "缓存键值对" })
  @IsObject()
  entries: Map<string, T>;

  @ApiProperty({ description: "TTL设置" })
  @IsNumber()
  ttl: number;

  @ApiProperty({ description: "批量大小" })
  @IsNumber()
  batchSize: number;

  @ApiProperty({ description: "操作配置", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CacheConfigDto)
  config?: CacheConfigDto;
}
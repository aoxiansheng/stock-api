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
import {
  IsValidTTL,
  IsValidBatchSize,
} from "../../decorators/validation.decorators";

/**
 * 批量缓存操作DTO
 * 🎯 重构: 使用Cache专用验证装饰器
 * ✅ 替代基础验证器，提供更精确的缓存验证
 * 🔄 与Common组件标准化集成
 */
export class BatchCacheOperationDto<T = any>
  implements BatchSizeInfo, RequiredTTL
{
  @ApiProperty({ description: "缓存键值对" })
  @IsObject()
  entries: Map<string, T>;

  @ApiProperty({
    description: "TTL设置（秒）",
    minimum: 1,
    maximum: 604800,
    example: 3600,
  })
  @IsValidTTL()
  ttl: number;

  @ApiProperty({
    description: "批量大小",
    minimum: 1,
    maximum: 1000,
    example: 50,
  })
  @IsValidBatchSize()
  batchSize: number;

  @ApiProperty({ description: "操作配置", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CacheConfigDto)
  config?: CacheConfigDto;
}

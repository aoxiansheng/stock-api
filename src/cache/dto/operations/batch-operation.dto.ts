import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsObject,
  IsNumber,
  IsOptional,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { CacheConfigDto } from "../config/cache-config.dto";
import { BatchSizeInfo, RequiredTTL } from "../shared/cache-shared.interfaces";
import { IsValidCacheTTL } from "../../decorators/validation.decorators";
import { IsNumberInRange } from "@common/validators";

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
  @IsValidCacheTTL()
  ttl: number;

  @ApiProperty({
    description: "批量大小",
    minimum: 1,
    maximum: 1000,
    example: 50,
  })
  @IsNumberInRange({ min: 1, max: 1000, message: "批量操作大小必须在 1 到 1000 之间" })
  batchSize: number;

  @ApiProperty({ description: "操作配置", required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => CacheConfigDto)
  config?: CacheConfigDto;
}

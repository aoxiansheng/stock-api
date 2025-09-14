import { ApiProperty } from "@nestjs/swagger";
import {
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
} from "class-validator";
import { SerializerType, SERIALIZER_TYPE_VALUES } from "../../constants/cache.constants";
import { CacheConfigSizeInfo, OptionalTTL } from "../shared/cache-shared.interfaces";

/**
 * 通用缓存配置DTO
 *
 * 用于统一缓存操作的配置参数
 * 包含序列化、压缩、TTL等核心配置
 */
export class CacheConfigDto implements CacheConfigSizeInfo, OptionalTTL {
  @ApiProperty({
    description: "缓存TTL（秒）",
    required: false,
    example: 3600,
  })
  @IsOptional()
  @IsNumber()
  ttl?: number;

  @ApiProperty({
    description: "最大缓存大小（字节）",
    required: false,
    example: 1048576,
  })
  @IsOptional()
  @IsNumber()
  maxSize?: number;

  @ApiProperty({
    description: "是否启用缓存",
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    description: "序列化器类型",
    enum: SERIALIZER_TYPE_VALUES,
    required: false,
    default: "json",
    example: "json",
  })
  @IsOptional()
  @IsEnum(SERIALIZER_TYPE_VALUES)
  serializer?: SerializerType;

  @ApiProperty({
    description: "压缩阈值（字节，超过此大小将自动压缩）",
    required: false,
    example: 1024,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  compressionThreshold?: number;
}
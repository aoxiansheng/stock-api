import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsBoolean, IsEnum } from "class-validator";
import { BaseQueryDto } from "@common/dto/base-query.dto";
import {
  SerializerType,
  SERIALIZER_TYPE_VALUES,
} from "../../constants/cache.constants";
import {
  CacheConfigSizeInfo,
  OptionalTTL,
} from "../shared/cache-shared.interfaces";
// 🎯 Phase 2.4: 使用重构后的验证器
import { IsValidCacheTTL } from "../../decorators/validation.decorators";
import { MaxValueSize } from "@common/validators";

/**
 * 通用缓存配置DTO
 * 🎯 重构: 继承BaseQueryDto获得分页功能
 * ✅ 使用Cache专用验证装饰器替代手动验证
 * 🔄 与Common组件标准化集成
 *
 * 用于统一缓存操作的配置参数
 * 包含序列化、压缩、TTL等核心配置
 * 继承分页功能用于缓存查询场景
 */
export class CacheConfigDto
  extends BaseQueryDto
  implements CacheConfigSizeInfo, OptionalTTL
{
  @ApiProperty({
    description: "缓存TTL（秒）",
    required: false,
    example: 3600,
    minimum: 1,
    maximum: 604800, // 7天
  })
  @IsOptional()
  @IsValidCacheTTL()
  ttl?: number;

  @ApiProperty({
    description: "最大缓存大小（字节）",
    required: false,
    example: 1048576,
    minimum: 0,
  })
  @IsOptional()
  @MaxValueSize(10485760) // 10MB限制
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

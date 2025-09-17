import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsString,
} from "class-validator";
import type {
  SerializerType,
} from "../../constants/cache.constants";
import {
  SERIALIZER_TYPE_VALUES,
} from "../../constants/cache.constants";
import { SizeFields } from "../shared/cache-shared.interfaces";

/**
 * 缓存序列化信息DTO
 */
export class CacheSerializationInfoDto implements SizeFields {
  @ApiProperty({ description: "序列化类型", enum: SERIALIZER_TYPE_VALUES })
  @IsEnum(SERIALIZER_TYPE_VALUES)
  type: SerializerType;

  @ApiProperty({ description: "序列化后的数据大小（字节）" })
  @IsNumber()
  serializedSize: number;

  @ApiProperty({ description: "序列化时间（毫秒）" })
  @IsNumber()
  serializationTimeMs: number;

  @ApiProperty({ description: "是否序列化成功" })
  @IsBoolean()
  success: boolean;

  @ApiProperty({ description: "错误信息", required: false })
  @IsOptional()
  @IsString()
  error?: string;
}

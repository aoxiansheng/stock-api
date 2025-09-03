import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

/**
 * 缓存压缩信息DTO
 */
export class CacheCompressionInfoDto {
  @ApiProperty({ description: "是否需要压缩" })
  @IsBoolean()
  shouldCompress: boolean;

  @ApiProperty({ description: "原始大小（字节）" })
  @IsNumber()
  originalSize: number;

  @ApiProperty({ description: "压缩后大小（字节）", required: false })
  @IsOptional()
  @IsNumber()
  compressedSize?: number;

  @ApiProperty({ description: "压缩比率", required: false })
  @IsOptional()
  @IsNumber()
  compressionRatio?: number;

  @ApiProperty({ description: "压缩算法", required: false })
  @IsOptional()
  @IsString()
  algorithm?: string;
}
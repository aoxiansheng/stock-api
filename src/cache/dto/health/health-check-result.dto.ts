import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsNumber,
  IsArray,
  IsString,
  IsOptional,
  IsObject,
} from "class-validator";
import { BasicHealthStatus, BASIC_HEALTH_STATUS_VALUES } from "../../constants/cache.constants";

/**
 * 缓存健康检查结果DTO
 */
export class CacheHealthCheckResultDto {
  @ApiProperty({
    description: "健康状态",
    enum: BASIC_HEALTH_STATUS_VALUES,
  })
  @IsEnum(BASIC_HEALTH_STATUS_VALUES)
  status: BasicHealthStatus;

  @ApiProperty({ description: "延迟时间（毫秒）" })
  @IsNumber()
  latency: number;

  @ApiProperty({ description: "错误信息列表" })
  @IsArray()
  @IsString({ each: true })
  errors: string[];

  @ApiProperty({ description: "健康检查时间戳", required: false })
  @IsOptional()
  @IsString()
  timestamp?: string;

  @ApiProperty({ description: "内存使用详情", required: false })
  @IsOptional()
  @IsObject()
  memoryInfo?: {
    used: number;
    max: number;
    usageRatio: number;
  };
}
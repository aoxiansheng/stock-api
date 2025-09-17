import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsNumber,
  IsArray,
  IsString,
  IsOptional,
  IsObject,
} from "class-validator";
import {
  BasicHealthStatus,
  BASIC_HEALTH_STATUSES,
} from "../../constants/status/unified-health-status.constants";

/**
 * 缓存健康检查结果DTO
 */
export class CacheHealthCheckResultDto {
  @ApiProperty({
    description: "健康状态",
    enum: BASIC_HEALTH_STATUSES,
  })
  @IsEnum(BASIC_HEALTH_STATUSES)
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
  @IsNumber()
  timestamp?: number;

  @ApiProperty({ description: "内存使用详情", required: false })
  @IsOptional()
  @IsObject()
  memoryInfo?: {
    used: number;
    max: number;
    usageRatio: number;
  };
}

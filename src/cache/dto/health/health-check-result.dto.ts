import { ApiProperty } from "@nestjs/swagger";
import {
  IsEnum,
  IsNumber,
  IsArray,
  IsString,
  IsOptional,
  IsObject,
} from "class-validator";

// 简化的健康状态定义，避免循环依赖
const HEALTH_STATUSES = ["healthy", "warning", "unhealthy"] as const;
type HealthStatus = (typeof HEALTH_STATUSES)[number];

/**
 * 缓存健康检查结果DTO
 */
export class CacheHealthCheckResultDto {
  @ApiProperty({
    description: "健康状态",
    enum: HEALTH_STATUSES,
  })
  @IsEnum(HEALTH_STATUSES)
  status: HealthStatus;

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

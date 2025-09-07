import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
} from "class-validator";
import { ProcessingTimeFields } from "../../../common/interfaces/time-fields.interface";

/**
 * 缓存性能监控DTO
 */
export class CachePerformanceMonitoringDto implements ProcessingTimeFields {
  @ApiProperty({ description: "操作类型" })
  @IsString()
  operation: string;

  @ApiProperty({ description: "处理时间（毫秒）" })
  @IsNumber()
  processingTimeMs: number;

  @ApiProperty({ description: "操作时间戳" })
  @IsNumber()
  timestamp: number;

  @ApiProperty({ description: "是否为慢操作" })
  @IsBoolean()
  isSlowOperation: boolean;

  @ApiProperty({ description: "慢操作阈值（毫秒）" })
  @IsNumber()
  slowOperationThreshold: number;

  @ApiProperty({ description: "额外的性能指标", required: false })
  @IsOptional()
  @IsObject()
  additionalMetrics?: Record<string, any>;
}
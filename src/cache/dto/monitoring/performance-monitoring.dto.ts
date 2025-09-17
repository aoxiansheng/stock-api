import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
  IsDateString,
} from "class-validator";
import { BaseQueryDto } from "@common/dto/base-query.dto";
import { ProcessingTimeFields } from "../../../common/interfaces/time-fields.interface";

/**
 * 缓存性能监控查询DTO
 * 🎯 Phase 5: DTO标准化 - 支持分页查询性能监控数据
 * ✅ 继承BaseQueryDto获得标准分页功能
 * 🔄 与Common组件分页标准化集成
 */
export class CachePerformanceMonitoringQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({
    description: "操作类型过滤",
    example: "get",
  })
  @IsOptional()
  @IsString()
  operation?: string;

  @ApiPropertyOptional({
    description: "开始时间（ISO 8601格式）",
    example: "2023-12-01T00:00:00Z",
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    description: "结束时间（ISO 8601格式）",
    example: "2023-12-31T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    description: "仅显示慢操作",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  slowOperationsOnly?: boolean;
}

/**
 * 缓存性能监控结果DTO
 * 🎯 纯数据DTO，用于分页响应的items字段
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

import {
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  IsEnum,
} from "class-validator";
import { ResponseTimeFields } from "../../../common/interfaces/time-fields.interface";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { 
  BaseHealthMetrics, 
  BaseTimestamp, 
  BasePerformanceSummary, 
  BaseEndpointIdentifier, 
  BaseCacheMetrics, 
  BaseTrendMetric 
} from "../interfaces/base.interface";

/**
 * 分析后数据的DTO定义
 * 用于analyzer层的数据传输
 */

export class PerformanceSummaryDto implements BasePerformanceSummary {
  @ApiProperty({ description: "总操作数" })
  @IsNumber()
  totalOperations: number;

  @ApiProperty({ description: "成功操作数" })
  @IsNumber()
  successfulOperations: number;

  @ApiProperty({ description: "失败操作数" })
  @IsNumber()
  failedOperations: number;

  @ApiProperty({ description: "平均响应时间（毫秒）" })
  @IsNumber()
  responseTimeMs: number;

  @ApiProperty({ description: "错误率（0-1）" })
  @IsNumber()
  errorRate: number;
}


export class EndpointMetricDto implements BaseEndpointIdentifier {
  @ApiProperty({ description: "端点路径" })
  @IsString()
  endpoint: string;

  @ApiProperty({ description: "HTTP方法" })
  @IsString()
  method: string;

  @ApiProperty({ description: "总操作数" })
  @IsNumber()
  totalOperations: number;

  @ApiProperty({ description: "平均响应时间（毫秒）" })
  @IsNumber()
  responseTimeMs: number;

  @ApiProperty({ description: "错误率（0-1）" })
  @IsNumber()
  errorRate: number;

  @ApiProperty({ description: "最后使用时间" })
  @IsDate()
  @Type(() => Date)
  lastUsed: Date;
}

export class DatabaseAnalysisDto implements ResponseTimeFields {
  @ApiProperty({ description: "总操作数" })
  @IsNumber()
  totalOperations: number;

  @ApiProperty({ description: "响应时间（毫秒）" })
  @IsNumber()
  responseTimeMs: number;

  @ApiProperty({ description: "慢查询数量" })
  @IsNumber()
  slowQueries: number;

  @ApiProperty({ description: "失败操作数" })
  @IsNumber()
  failedOperations: number;

  @ApiProperty({ description: "失败率（0-1）" })
  @IsNumber()
  errorRate: number;
}

export class CacheAnalysisDto implements ResponseTimeFields, BaseCacheMetrics {
  @ApiProperty({ description: "总操作数" })
  @IsNumber()
  totalOperations: number;

  @ApiProperty({ description: "命中次数" })
  @IsNumber()
  hits: number;

  @ApiProperty({ description: "未命中次数" })
  @IsNumber()
  misses: number;

  @ApiProperty({ description: "命中率（0-1）" })
  @IsNumber()
  hitRate: number;

  @ApiProperty({ description: "平均响应时间（毫秒）" })
  @IsNumber()
  responseTimeMs: number;

}

// 基础健康状态
export class BaseHealthDto implements Partial<BaseHealthMetrics> {
  @ApiProperty({ description: "健康评分（0-100）" })
  @IsNumber()
  healthScore: number;
}

// API组件健康状态
export class ApiHealthDto extends BaseHealthDto implements ResponseTimeFields {
  @ApiProperty({ description: "响应时间（毫秒）" })
  @IsNumber()
  responseTimeMs: number;

  @ApiProperty({ description: "错误率（0-1）" })
  @IsNumber()
  errorRate: number;
}

// 数据库组件健康状态
export class DatabaseHealthDto extends BaseHealthDto implements ResponseTimeFields {
  @ApiProperty({ description: "平均响应时间（毫秒）" })
  @IsNumber()
  responseTimeMs: number;

  @ApiProperty({ description: "失败率（0-1）" })
  @IsNumber()
  errorRate: number;
}

// 缓存组件健康状态
export class CacheHealthDto extends BaseHealthDto implements ResponseTimeFields {
  @ApiProperty({ description: "命中次数" })
  @IsNumber()
  hits: number;

  @ApiProperty({ description: "未命中次数" })
  @IsNumber()
  misses: number;

  @ApiProperty({ description: "平均响应时间（毫秒）" })
  @IsNumber()
  responseTimeMs: number;

}

// 系统组件健康状态
export class SystemHealthDto extends BaseHealthDto {
  @ApiProperty({ description: "内存使用率（0-1）" })
  @IsNumber()
  memoryUsage: number;

  @ApiProperty({ description: "CPU使用率（0-1）" })
  @IsNumber()
  cpuUsage: number;
}


/**
 * 系统组件健康状态集合DTO - 简化嵌套结构
 */
export class SystemComponentsHealthDto {
  @ApiProperty({ description: "API组件健康状态", type: ApiHealthDto })
  @ValidateNested()
  @Type(() => ApiHealthDto)
  api: ApiHealthDto;

  @ApiProperty({ description: "数据库组件健康状态", type: DatabaseHealthDto })
  @ValidateNested()
  @Type(() => DatabaseHealthDto)
  database: DatabaseHealthDto;

  @ApiProperty({ description: "缓存组件健康状态", type: CacheHealthDto })
  @ValidateNested()
  @Type(() => CacheHealthDto)
  cache: CacheHealthDto;

  @ApiProperty({ description: "系统组件健康状态", type: SystemHealthDto })
  @ValidateNested()
  @Type(() => SystemHealthDto)
  system: SystemHealthDto;
}

/**
 * 性能摘要DTO - 简化嵌套结构
 */
export class PerformanceSummaryDataDto {
  @ApiProperty({ description: "响应时间（毫秒）" })
  @IsNumber()
  responseTimeMs: number;

  @ApiProperty({ description: "失败操作数" })
  @IsNumber()
  failedOperations: number;

  @ApiProperty({ description: "系统负载（0-1）" })
  @IsNumber()
  systemLoad: number;
}


export class OptimizationSuggestionDto {
  @ApiProperty({
    description: "建议类别",
    enum: ["performance", "security", "resource", "optimization"],
  })
  @IsEnum(["performance", "security", "resource", "optimization"])
  category: "performance" | "security" | "resource" | "optimization";

  @ApiProperty({ description: "优先级", enum: ["high", "medium", "low"] })
  @IsEnum(["high", "medium", "low"])
  priority: "high" | "medium" | "low";

  @ApiProperty({ description: "建议标题" })
  @IsString()
  title: string;

  @ApiProperty({ description: "建议描述" })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: "建议行动" })
  @IsOptional()
  @IsString()
  action?: string;
}

export class AnalyzedDataDto implements ResponseTimeFields {
  @ApiProperty({ description: "分析时间戳" })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @ApiProperty({ description: "性能摘要", type: PerformanceSummaryDto })
  @ValidateNested()
  @Type(() => PerformanceSummaryDto)
  summary: PerformanceSummaryDto;

  @ApiProperty({ description: "平均响应时间（毫秒）" })
  @IsNumber()
  responseTimeMs: number;

  @ApiProperty({ description: "错误率（0-1）" })
  @IsNumber()
  errorRate: number;

  @ApiProperty({ description: "吞吐量（请求/分钟）" })
  @IsNumber()
  throughput: number;

  @ApiProperty({ description: "健康评分（0-100）" })
  @IsNumber()
  healthScore: number;

  @ApiPropertyOptional({ description: "趋势分析" })
  @IsOptional()
  trends?: {
    responseTimeTrend: number[];
    errorRateTrend: number[];
    throughputTrend: number[];
  };

  @ApiPropertyOptional({ description: "端点指标", type: [EndpointMetricDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EndpointMetricDto)
  endpointMetrics?: EndpointMetricDto[];

  @ApiPropertyOptional({ description: "数据库指标", type: DatabaseAnalysisDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DatabaseAnalysisDto)
  databaseMetrics?: DatabaseAnalysisDto;

  @ApiPropertyOptional({ description: "缓存指标", type: CacheAnalysisDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CacheAnalysisDto)
  cacheMetrics?: CacheAnalysisDto;
}

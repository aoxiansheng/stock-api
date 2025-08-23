import { IsDate, IsNumber, IsString, IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 层间性能指标DTO定义
 * 用于监控各层之间的性能表现
 */

export enum LayerType {
  COLLECTOR = 'collector',
  ANALYZER = 'analyzer',
  PRESENTER = 'presenter'
}

export enum OperationType {
  DATA_COLLECTION = 'data_collection',
  DATA_ANALYSIS = 'data_analysis',
  CACHE_OPERATION = 'cache_operation',
  DATABASE_OPERATION = 'database_operation',
  API_REQUEST = 'api_request'
}

export class LayerPerformanceMetricDto {
  @ApiProperty({ description: '层类型', enum: LayerType })
  @IsEnum(LayerType)
  layer: LayerType;

  @ApiProperty({ description: '操作类型', enum: OperationType })
  @IsEnum(OperationType)
  operation: OperationType;

  @ApiProperty({ description: '执行时间（毫秒）' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: '是否成功' })
  success: boolean;

  @ApiProperty({ description: '时间戳' })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @ApiPropertyOptional({ description: '额外元数据' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class LayerHealthMetricDto {
  @ApiProperty({ description: '层类型', enum: LayerType })
  @IsEnum(LayerType)
  layer: LayerType;

  @ApiProperty({ description: '健康评分（0-100）' })
  @IsNumber()
  healthScore: number;

  @ApiProperty({ description: '平均响应时间（毫秒）' })
  @IsNumber()
  averageResponseTime: number;

  @ApiProperty({ description: '错误率（0-1）' })
  @IsNumber()
  errorRate: number;

  @ApiProperty({ description: '处理的操作数' })
  @IsNumber()
  operationCount: number;

  @ApiProperty({ description: '时间戳' })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;
}

export class CrossLayerMetricDto {
  @ApiProperty({ description: '源层', enum: LayerType })
  @IsEnum(LayerType)
  sourceLayer: LayerType;

  @ApiProperty({ description: '目标层', enum: LayerType })
  @IsEnum(LayerType)
  targetLayer: LayerType;

  @ApiProperty({ description: '跨层操作时间（毫秒）' })
  @IsNumber()
  crossLayerDuration: number;

  @ApiProperty({ description: '数据传输大小（字节）' })
  @IsNumber()
  dataSize: number;

  @ApiProperty({ description: '操作标识' })
  @IsString()
  operationId: string;

  @ApiProperty({ description: '时间戳' })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;
}

export class LayerCacheMetricDto {
  @ApiProperty({ description: '层类型', enum: LayerType })
  @IsEnum(LayerType)
  layer: LayerType;

  @ApiProperty({ description: '缓存命中次数' })
  @IsNumber()
  hits: number;

  @ApiProperty({ description: '缓存未命中次数' })
  @IsNumber()
  misses: number;

  @ApiProperty({ description: '缓存命中率（0-1）' })
  @IsNumber()
  hitRate: number;

  @ApiProperty({ description: '平均缓存响应时间（毫秒）' })
  @IsNumber()
  averageCacheResponseTime: number;

  @ApiProperty({ description: '统计时间窗口开始' })
  @IsDate()
  @Type(() => Date)
  windowStart: Date;

  @ApiProperty({ description: '统计时间窗口结束' })
  @IsDate()
  @Type(() => Date)
  windowEnd: Date;
}

export class LayerMetricsSummaryDto {
  @ApiProperty({ description: '各层性能指标', type: [LayerHealthMetricDto] })
  @ValidateNested({ each: true })
  @Type(() => LayerHealthMetricDto)
  layerHealth: LayerHealthMetricDto[];

  @ApiProperty({ description: '跨层性能指标', type: [CrossLayerMetricDto] })
  @ValidateNested({ each: true })
  @Type(() => CrossLayerMetricDto)
  crossLayerMetrics: CrossLayerMetricDto[];

  @ApiProperty({ description: '各层缓存指标', type: [LayerCacheMetricDto] })
  @ValidateNested({ each: true })
  @Type(() => LayerCacheMetricDto)
  layerCacheMetrics: LayerCacheMetricDto[];

  @ApiProperty({ description: '整体系统性能评分（0-100）' })
  @IsNumber()
  overallSystemScore: number;

  @ApiProperty({ description: '数据生成时间' })
  @IsDate()
  @Type(() => Date)
  generatedAt: Date;
}
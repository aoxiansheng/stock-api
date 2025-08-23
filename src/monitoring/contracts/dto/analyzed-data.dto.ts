import { IsDate, IsNumber, IsOptional, IsString, ValidateNested, IsArray, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 分析后数据的DTO定义
 * 用于analyzer层的数据传输
 */

export class PerformanceSummaryDto {
  @ApiProperty({ description: '总请求数' })
  @IsNumber()
  totalRequests: number;

  @ApiProperty({ description: '成功请求数' })
  @IsNumber()
  successfulRequests: number;

  @ApiProperty({ description: '失败请求数' })
  @IsNumber()
  failedRequests: number;

  @ApiProperty({ description: '平均响应时间（毫秒）' })
  @IsNumber()
  averageResponseTime: number;

  @ApiProperty({ description: '错误率（0-1）' })
  @IsNumber()
  errorRate: number;
}

export class TrendDto {
  @ApiProperty({ description: '当前值' })
  @IsNumber()
  current: number;

  @ApiProperty({ description: '上一期值' })
  @IsNumber()
  previous: number;

  @ApiProperty({ description: '趋势方向', enum: ['up', 'down', 'stable'] })
  @IsEnum(['up', 'down', 'stable'])
  trend: 'up' | 'down' | 'stable';

  @ApiProperty({ description: '变化百分比' })
  @IsNumber()
  changePercentage: number;
}

export class TrendsDataDto {
  @ApiProperty({ description: '响应时间趋势', type: TrendDto })
  @ValidateNested()
  @Type(() => TrendDto)
  responseTime: TrendDto;

  @ApiProperty({ description: '错误率趋势', type: TrendDto })
  @ValidateNested()
  @Type(() => TrendDto)
  errorRate: TrendDto;

  @ApiProperty({ description: '吞吐量趋势', type: TrendDto })
  @ValidateNested()
  @Type(() => TrendDto)
  throughput: TrendDto;
}

export class EndpointMetricDto {
  @ApiProperty({ description: '端点路径' })
  @IsString()
  endpoint: string;

  @ApiProperty({ description: 'HTTP方法' })
  @IsString()
  method: string;

  @ApiProperty({ description: '请求数量' })
  @IsNumber()
  requestCount: number;

  @ApiProperty({ description: '平均响应时间（毫秒）' })
  @IsNumber()
  averageResponseTime: number;

  @ApiProperty({ description: '错误率（0-1）' })
  @IsNumber()
  errorRate: number;

  @ApiProperty({ description: '最后使用时间' })
  @IsDate()
  @Type(() => Date)
  lastUsed: Date;
}

export class DatabaseAnalysisDto {
  @ApiProperty({ description: '总操作数' })
  @IsNumber()
  totalOperations: number;

  @ApiProperty({ description: '平均查询时间（毫秒）' })
  @IsNumber()
  averageQueryTime: number;

  @ApiProperty({ description: '慢查询数量' })
  @IsNumber()
  slowQueries: number;

  @ApiProperty({ description: '失败操作数' })
  @IsNumber()
  failedOperations: number;

  @ApiProperty({ description: '失败率（0-1）' })
  @IsNumber()
  failureRate: number;
}

export class CacheAnalysisDto {
  @ApiProperty({ description: '总操作数' })
  @IsNumber()
  totalOperations: number;

  @ApiProperty({ description: '命中次数' })
  @IsNumber()
  hits: number;

  @ApiProperty({ description: '未命中次数' })
  @IsNumber()
  misses: number;

  @ApiProperty({ description: '命中率（0-1）' })
  @IsNumber()
  hitRate: number;

  @ApiProperty({ description: '平均响应时间（毫秒）' })
  @IsNumber()
  averageResponseTime: number;
}

export class ComponentHealthDto {
  @ApiProperty({ description: '健康评分（0-100）' })
  @IsNumber()
  score: number;

  @ApiPropertyOptional({ description: '响应时间（毫秒）' })
  @IsOptional()
  @IsNumber()
  responseTime?: number;

  @ApiPropertyOptional({ description: '错误率（0-1）' })
  @IsOptional()
  @IsNumber()
  errorRate?: number;

  @ApiPropertyOptional({ description: '命中率（0-1）' })
  @IsOptional()
  @IsNumber()
  hitRate?: number;

  @ApiPropertyOptional({ description: '内存使用率（0-1）' })
  @IsOptional()
  @IsNumber()
  memoryUsage?: number;

  @ApiPropertyOptional({ description: 'CPU使用率（0-1）' })
  @IsOptional()
  @IsNumber()
  cpuUsage?: number;

  @ApiPropertyOptional({ description: '平均查询时间（毫秒）' })
  @IsOptional()
  @IsNumber()
  averageQueryTime?: number;

  @ApiPropertyOptional({ description: '失败率（0-1）' })
  @IsOptional()
  @IsNumber()
  failureRate?: number;
}

export class HealthReportDataDto {
  @ApiProperty({ description: '整体健康状态' })
  @ValidateNested()
  @Type(() => Object)
  overall: {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    timestamp: Date;
  };

  @ApiProperty({ description: '各组件健康状态' })
  @ValidateNested()
  @Type(() => Object)
  components: {
    api: ComponentHealthDto;
    database: ComponentHealthDto;
    cache: ComponentHealthDto;
    system: ComponentHealthDto;
  };

  @ApiPropertyOptional({ description: '优化建议' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendations?: string[];
}

export class OptimizationSuggestionDto {
  @ApiProperty({ description: '建议类别', enum: ['performance', 'security', 'resource', 'optimization'] })
  @IsEnum(['performance', 'security', 'resource', 'optimization'])
  category: 'performance' | 'security' | 'resource' | 'optimization';

  @ApiProperty({ description: '优先级', enum: ['high', 'medium', 'low'] })
  @IsEnum(['high', 'medium', 'low'])
  priority: 'high' | 'medium' | 'low';

  @ApiProperty({ description: '建议标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '建议描述' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: '建议行动' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: '预期影响' })
  @IsOptional()
  @IsString()
  impact?: string;
}

export class AnalyzedDataDto {
  @ApiProperty({ description: '分析时间戳' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: '性能摘要', type: PerformanceSummaryDto })
  @ValidateNested()
  @Type(() => PerformanceSummaryDto)
  summary: PerformanceSummaryDto;

  @ApiProperty({ description: '平均响应时间（毫秒）' })
  @IsNumber()
  averageResponseTime: number;

  @ApiProperty({ description: '错误率（0-1）' })
  @IsNumber()
  errorRate: number;

  @ApiProperty({ description: '吞吐量（请求/分钟）' })
  @IsNumber()
  throughput: number;

  @ApiProperty({ description: '健康评分（0-100）' })
  @IsNumber()
  healthScore: number;

  @ApiPropertyOptional({ description: '趋势分析', type: TrendsDataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TrendsDataDto)
  trends?: TrendsDataDto;

  @ApiPropertyOptional({ description: '端点指标', type: [EndpointMetricDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EndpointMetricDto)
  endpointMetrics?: EndpointMetricDto[];

  @ApiPropertyOptional({ description: '数据库指标', type: DatabaseAnalysisDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DatabaseAnalysisDto)
  databaseMetrics?: DatabaseAnalysisDto;

  @ApiPropertyOptional({ description: '缓存指标', type: CacheAnalysisDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CacheAnalysisDto)
  cacheMetrics?: CacheAnalysisDto;
}
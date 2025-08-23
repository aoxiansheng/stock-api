import { IsDate, IsNumber, IsOptional, IsString, ValidateNested, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 展示层DTO定义
 * 用于presenter层的API响应
 */

export class PerformanceQueryDto {
  @ApiPropertyOptional({ description: '开始时间' })
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  @IsDate()
  startTime?: Date;

  @ApiPropertyOptional({ description: '结束时间' })
  @IsOptional()
  @Transform(({ value }) => value ? new Date(value) : undefined)
  @IsDate()
  endTime?: Date;

  @ApiPropertyOptional({ description: '是否包含详细信息' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDetails?: boolean;
}

export class EndpointQueryDto {
  @ApiPropertyOptional({ description: '限制返回数量' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: '排序字段', enum: ['requestCount', 'averageResponseTime', 'errorRate'] })
  @IsOptional()
  @IsEnum(['requestCount', 'averageResponseTime', 'errorRate'])
  sortBy?: 'requestCount' | 'averageResponseTime' | 'errorRate';

  @ApiPropertyOptional({ description: '排序方向', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class CacheInvalidationDto {
  @ApiPropertyOptional({ description: '缓存失效模式' })
  @IsOptional()
  @IsString()
  pattern?: string;
}

export class PerformanceResponseDto {
  @ApiProperty({ description: '分析时间戳' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: '性能摘要' })
  @ValidateNested()
  @Type(() => Object)
  summary: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    errorRate: number;
  };

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

  @ApiPropertyOptional({ description: '趋势分析' })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  trends?: {
    responseTime: {
      current: number;
      previous: number;
      trend: 'up' | 'down' | 'stable';
      changePercentage: number;
    };
    errorRate: {
      current: number;
      previous: number;
      trend: 'up' | 'down' | 'stable';
      changePercentage: number;
    };
    throughput: {
      current: number;
      previous: number;
      trend: 'up' | 'down' | 'stable';
      changePercentage: number;
    };
  };

  @ApiPropertyOptional({ description: '端点指标' })
  @IsOptional()
  endpointMetrics?: Array<{
    endpoint: string;
    method: string;
    requestCount: number;
    averageResponseTime: number;
    errorRate: number;
    lastUsed: Date;
  }>;

  @ApiPropertyOptional({ description: '数据库指标' })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  databaseMetrics?: {
    totalOperations: number;
    averageQueryTime: number;
    slowQueries: number;
    failedOperations: number;
    failureRate: number;
  };

  @ApiPropertyOptional({ description: '缓存指标' })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  cacheMetrics?: {
    totalOperations: number;
    hits: number;
    misses: number;
    hitRate: number;
    averageResponseTime: number;
  };
}

export class HealthResponseDto {
  @ApiProperty({ description: '健康评分（0-100）' })
  @IsNumber()
  score: number;

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
    api: {
      score: number;
      responseTime: number;
      errorRate: number;
    };
    database: {
      score: number;
      averageQueryTime: number;
      failureRate: number;
    };
    cache: {
      score: number;
      hitRate: number;
      averageResponseTime: number;
    };
    system: {
      score: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  };

  @ApiPropertyOptional({ description: '优化建议' })
  @IsOptional()
  recommendations?: string[];
}

export class EndpointMetricsResponseDto {
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

export class CacheInvalidationResponseDto {
  @ApiProperty({ description: '操作是否成功' })
  success: boolean;

  @ApiPropertyOptional({ description: '失效的缓存键数量' })
  @IsOptional()
  @IsNumber()
  invalidatedKeys?: number;

  @ApiPropertyOptional({ description: '失效模式' })
  @IsOptional()
  @IsString()
  pattern?: string;

  @ApiProperty({ description: '操作时间戳' })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;
}
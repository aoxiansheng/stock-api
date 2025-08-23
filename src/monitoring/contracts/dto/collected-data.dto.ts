import { IsDate, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 原始收集数据的DTO定义
 * 用于collector层的数据传输
 */

export class RequestMetricDto {
  @ApiProperty({ description: '请求端点' })
  @IsString()
  endpoint: string;

  @ApiProperty({ description: 'HTTP方法' })
  @IsString()
  method: string;

  @ApiProperty({ description: 'HTTP状态码' })
  @IsNumber()
  statusCode: number;

  @ApiProperty({ description: '响应时间（毫秒）' })
  @IsNumber()
  responseTime: number;

  @ApiProperty({ description: '时间戳' })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @ApiPropertyOptional({ description: '认证类型' })
  @IsOptional()
  @IsString()
  authType?: string;

  @ApiPropertyOptional({ description: '用户ID' })
  @IsOptional()
  @IsString()
  userId?: string;
}

export class DatabaseMetricDto {
  @ApiProperty({ description: '数据库操作类型' })
  @IsString()
  operation: string;

  @ApiProperty({ description: '操作持续时间（毫秒）' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: '操作是否成功' })
  success: boolean;

  @ApiProperty({ description: '时间戳' })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @ApiPropertyOptional({ description: '集合/表名' })
  @IsOptional()
  @IsString()
  collection?: string;
}

export class CacheMetricDto {
  @ApiProperty({ description: '缓存操作类型' })
  @IsString()
  operation: string;

  @ApiProperty({ description: '是否命中缓存' })
  hit: boolean;

  @ApiProperty({ description: '操作持续时间（毫秒）' })
  @IsNumber()
  duration: number;

  @ApiProperty({ description: '时间戳' })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @ApiPropertyOptional({ description: '缓存键' })
  @IsOptional()
  @IsString()
  key?: string;
}

export class SystemMetricDto {
  @ApiProperty({ description: '内存使用信息' })
  @ValidateNested()
  @Type(() => Object)
  memory: {
    used: number;
    total: number;
    percentage: number;
  };

  @ApiProperty({ description: 'CPU使用率' })
  @ValidateNested()
  @Type(() => Object)
  cpu: {
    usage: number;
  };

  @ApiProperty({ description: '系统运行时间（秒）' })
  @IsNumber()
  uptime: number;

  @ApiProperty({ description: '时间戳' })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;
}

export class CollectedDataDto {
  @ApiPropertyOptional({ description: '请求指标数组', type: [RequestMetricDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => RequestMetricDto)
  requests?: RequestMetricDto[];

  @ApiPropertyOptional({ description: '数据库指标数组', type: [DatabaseMetricDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => DatabaseMetricDto)
  database?: DatabaseMetricDto[];

  @ApiPropertyOptional({ description: '缓存指标数组', type: [CacheMetricDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CacheMetricDto)
  cache?: CacheMetricDto[];

  @ApiPropertyOptional({ description: '系统指标', type: SystemMetricDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SystemMetricDto)
  system?: SystemMetricDto;
}
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsNumber,
  IsString,
  IsArray,
  IsObject,
  ValidateNested,
} from "class-validator";

export class PerformanceSummaryDataDto {
  @ApiProperty({ description: "总请求数" })
  @IsNumber()
  @Type(() => Number)
  totalRequests: number;

  @ApiProperty({ description: "平均响应时间（毫秒）" })
  @IsNumber()
  @Type(() => Number)
  averageResponseTime: number;

  @ApiProperty({ description: "错误率" })
  @IsNumber()
  @Type(() => Number)
  errorRate: number;

  @ApiProperty({ description: "系统负载" })
  @IsNumber()
  @Type(() => Number)
  systemLoad: number;

  @ApiProperty({ description: "内存使用（GB）" })
  @IsNumber()
  @Type(() => Number)
  memoryUsage: number;

  @ApiProperty({ description: "缓存命中率" })
  @IsNumber()
  @Type(() => Number)
  cacheHitRate: number;
}

export class EndpointMetricsDto {
  @ApiProperty({ description: "端点路径" })
  @IsString()
  @Type(() => String)
  endpoint: string;

  @ApiProperty({ description: "HTTP方法" })
  @IsString()
  @Type(() => String)
  method: string;

  @ApiProperty({ description: "总请求数" })
  @IsNumber()
  @Type(() => Number)
  totalRequests: number;

  @ApiProperty({ description: "成功请求数" })
  @IsNumber()
  @Type(() => Number)
  successfulRequests: number;

  @ApiProperty({ description: "失败请求数" })
  @IsNumber()
  @Type(() => Number)
  failedRequests: number;

  @ApiProperty({ description: "平均响应时间（毫秒）" })
  @IsNumber()
  @Type(() => Number)
  averageResponseTime: number;

  @ApiProperty({ description: "P95响应时间（毫秒）" })
  @IsNumber()
  @Type(() => Number)
  p95ResponseTime: number;

  @ApiProperty({ description: "P99响应时间（毫秒）" })
  @IsNumber()
  @Type(() => Number)
  p99ResponseTime: number;

  @ApiProperty({ description: "最近一分钟请求数" })
  @IsNumber()
  @Type(() => Number)
  lastMinuteRequests: number;

  @ApiProperty({ description: "错误率" })
  @IsNumber()
  @Type(() => Number)
  errorRate: number;
}

export class DatabaseMetricsDto {
  @ApiProperty({ description: "连接池大小" })
  @IsNumber()
  @Type(() => Number)
  connectionPoolSize: number;

  @ApiProperty({ description: "活跃连接数" })
  @IsNumber()
  @Type(() => Number)
  activeConnections: number;

  @ApiProperty({ description: "等待连接数" })
  @IsNumber()
  @Type(() => Number)
  waitingConnections: number;

  @ApiProperty({ description: "平均查询时间（毫秒）" })
  @IsNumber()
  @Type(() => Number)
  averageQueryTime: number;

  @ApiProperty({ description: "慢查询数" })
  @IsNumber()
  @Type(() => Number)
  slowQueries: number;

  @ApiProperty({ description: "总查询数" })
  @IsNumber()
  @Type(() => Number)
  totalQueries: number;
}

export class RedisMetricsDto {
  @ApiProperty({ description: "内存使用（字节）" })
  @IsNumber()
  @Type(() => Number)
  memoryUsage: number;

  @ApiProperty({ description: "连接客户端数" })
  @IsNumber()
  @Type(() => Number)
  connectedClients: number;

  @ApiProperty({ description: "每秒操作数" })
  @IsNumber()
  @Type(() => Number)
  opsPerSecond: number;

  @ApiProperty({ description: "命中率" })
  @IsNumber()
  @Type(() => Number)
  hitRate: number;

  @ApiProperty({ description: "驱逐键数" })
  @IsNumber()
  @Type(() => Number)
  evictedKeys: number;

  @ApiProperty({ description: "过期键数" })
  @IsNumber()
  @Type(() => Number)
  expiredKeys: number;
}

export class SystemMetricsDto {
  @ApiProperty({ description: "CPU使用率" })
  @IsNumber()
  @Type(() => Number)
  cpuUsage: number;

  @ApiProperty({ description: "内存使用（字节）" })
  @IsNumber()
  @Type(() => Number)
  memoryUsage: number;

  @ApiProperty({ description: "堆内存使用（字节）" })
  @IsNumber()
  @Type(() => Number)
  heapUsed: number;

  @ApiProperty({ description: "堆内存总量（字节）" })
  @IsNumber()
  @Type(() => Number)
  heapTotal: number;

  @ApiProperty({ description: "运行时间（秒）" })
  @IsNumber()
  @Type(() => Number)
  uptime: number;

  @ApiProperty({ description: "事件循环延迟（毫秒）" })
  @IsNumber()
  @Type(() => Number)
  eventLoopLag: number;
}

export class PerformanceSummaryDto {
  @ApiProperty({ description: "时间戳" })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: "健康评分" })
  @IsNumber()
  healthScore: number;

  @ApiProperty({ description: "处理时间（毫秒）" })
  @IsNumber()
  processingTime: number;

  @ApiProperty({ description: "性能摘要数据", type: PerformanceSummaryDataDto })
  @ValidateNested()
  @Type(() => PerformanceSummaryDataDto)
  @IsObject()
  summary: PerformanceSummaryDataDto;

  @ApiProperty({ description: "端点指标列表", type: [EndpointMetricsDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EndpointMetricsDto)
  endpoints: EndpointMetricsDto[];

  @ApiProperty({ description: "数据库指标", type: DatabaseMetricsDto })
  @ValidateNested()
  @Type(() => DatabaseMetricsDto)
  @IsObject()
  database: DatabaseMetricsDto;

  @ApiProperty({ description: "Redis指标", type: RedisMetricsDto })
  @ValidateNested()
  @Type(() => RedisMetricsDto)
  @IsObject()
  redis: RedisMetricsDto;

  @ApiProperty({ description: "系统指标", type: SystemMetricsDto })
  @ValidateNested()
  @Type(() => SystemMetricsDto)
  @IsObject()
  system: SystemMetricsDto;
}

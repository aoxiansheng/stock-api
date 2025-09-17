/**
 * 🎯 性能分析响应 DTO
 *
 * 用于标准化性能分析API响应数据结构
 * 替代手动 Swagger schema 定义
 */

import { ApiProperty } from "@nestjs/swagger";

export class PerformanceAnalysisSummaryDto {
  @ApiProperty({ description: "总操作数", example: 15420 })
  totalOperations: number;

  @ApiProperty({ description: "平均响应时间 (ms)", example: 128.5 })
  averageResponseTime: number;

  @ApiProperty({ description: "错误率 (%)", example: 0.12 })
  errorRate: number;

  @ApiProperty({ description: "每秒请求数", example: 45.2 })
  requestsPerSecond: number;
}

export class PerformanceTrendsDto {
  @ApiProperty({
    description: "响应时间趋势",
    type: [Number],
    example: [120, 135, 142, 128],
  })
  responseTime: number[];

  @ApiProperty({
    description: "错误率趋势",
    type: [Number],
    example: [0.1, 0.15, 0.08, 0.12],
  })
  errorRate: number[];

  @ApiProperty({
    description: "吞吐量趋势",
    type: [Number],
    example: [42, 45, 48, 45],
  })
  throughput: number[];

  @ApiProperty({
    description: "时间标签",
    type: [String],
    example: ["10:00", "10:15", "10:30", "10:45"],
  })
  timeLabels: string[];
}

export class EndpointMetricDto {
  @ApiProperty({
    description: "端点路径",
    example: "/api/v1/receiver/get-stock-quote",
  })
  endpoint: string;

  @ApiProperty({ description: "请求数量", example: 1250 })
  requestCount: number;

  @ApiProperty({ description: "平均响应时间 (ms)", example: 85.2 })
  averageResponseTime: number;

  @ApiProperty({ description: "错误数量", example: 2 })
  errorCount: number;

  @ApiProperty({ description: "最大响应时间 (ms)", example: 450.8 })
  maxResponseTime: number;
}

export class DatabaseMetricsDto {
  @ApiProperty({ description: "MongoDB 连接数", example: 25 })
  mongoConnections: number;

  @ApiProperty({ description: "MongoDB 平均查询时间 (ms)", example: 12.5 })
  mongoAverageQueryTime: number;

  @ApiProperty({ description: "MongoDB 慢查询数量", example: 3 })
  mongoSlowQueries: number;

  @ApiProperty({ description: "Redis 连接数", example: 15 })
  redisConnections: number;

  @ApiProperty({ description: "Redis 缓存命中率 (%)", example: 94.2 })
  redisHitRate: number;
}

export class CacheMetricsDto {
  @ApiProperty({ description: "Smart Cache 命中率 (%)", example: 92.5 })
  smartCacheHitRate: number;

  @ApiProperty({ description: "Symbol Cache 命中率 (%)", example: 88.7 })
  symbolCacheHitRate: number;

  @ApiProperty({ description: "总缓存大小 (MB)", example: 145.8 })
  totalCacheSize: number;

  @ApiProperty({ description: "缓存条目数量", example: 8942 })
  cacheEntryCount: number;

  @ApiProperty({ description: "平均缓存访问时间 (ms)", example: 2.1 })
  averageAccessTime: number;
}

export class PerformanceAnalysisDto {
  @ApiProperty({
    description: "分析时间戳",
    example: "2024-09-17T10:30:00.000Z",
  })
  timestamp: string;

  @ApiProperty({ description: "健康分数 (0-100)", example: 92.5 })
  healthScore: number;

  @ApiProperty({ description: "性能摘要", type: PerformanceAnalysisSummaryDto })
  summary: PerformanceAnalysisSummaryDto;

  @ApiProperty({ description: "趋势分析", type: PerformanceTrendsDto })
  trends: PerformanceTrendsDto;

  @ApiProperty({ description: "端点指标", type: [EndpointMetricDto] })
  endpointMetrics: EndpointMetricDto[];

  @ApiProperty({ description: "数据库指标", type: DatabaseMetricsDto })
  databaseMetrics: DatabaseMetricsDto;

  @ApiProperty({ description: "缓存指标", type: CacheMetricsDto })
  cacheMetrics: CacheMetricsDto;
}

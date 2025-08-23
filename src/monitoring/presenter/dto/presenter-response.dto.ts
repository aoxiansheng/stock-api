/**
 * 🎯 监控展示层响应DTO
 * 
 * 标准化监控API的响应格式
 */

import { ApiProperty } from "@nestjs/swagger";

/**
 * 标准监控响应DTO
 */
export class PresenterResponseDto<T = any> {
  @ApiProperty({ description: '响应状态码' })
  statusCode: number;

  @ApiProperty({ description: '响应消息' })
  message: string;

  @ApiProperty({ description: '响应数据' })
  data: T;

  @ApiProperty({ description: '时间戳' })
  timestamp: string;

  @ApiProperty({ description: '请求ID', required: false })
  requestId?: string;

  constructor(data: T, message: string = '获取成功') {
    this.statusCode = 200;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * 健康状态响应DTO
 */
export class HealthStatusResponseDto {
  @ApiProperty({ description: '健康状态', enum: ['healthy', 'degraded', 'unhealthy'] })
  status: 'healthy' | 'degraded' | 'unhealthy';

  @ApiProperty({ description: '健康评分', minimum: 0, maximum: 100 })
  score: number;

  @ApiProperty({ description: '组件状态' })
  components: Record<string, any>;

  @ApiProperty({ description: '检查时间戳' })
  timestamp: string;

  @ApiProperty({ description: '详细信息', required: false })
  details?: any;
}

/**
 * 性能分析响应DTO
 */
export class PerformanceAnalysisResponseDto {
  @ApiProperty({ description: '性能摘要' })
  summary: {
    avgResponseTime: number;
    errorRate: number;
    throughput: number;
    uptime: number;
  };

  @ApiProperty({ description: '健康评分' })
  healthScore: number;

  @ApiProperty({ description: '趋势分析' })
  trends: {
    responseTime: any;
    errorRate: any;
    throughput: any;
  };

  @ApiProperty({ description: '端点指标' })
  endpointMetrics: Array<{
    endpoint: string;
    method: string;
    requestCount: number;
    avgResponseTime: number;
    errorRate: number;
  }>;

  @ApiProperty({ description: '数据库指标' })
  databaseMetrics: {
    totalOperations: number;
    avgQueryTime: number;
    slowQueries: number;
    failureRate: number;
  };

  @ApiProperty({ description: '缓存指标' })
  cacheMetrics: {
    totalOperations: number;
    hitRate: number;
    avgResponseTime: number;
  };

  @ApiProperty({ description: '分析时间戳' })
  timestamp: string;
}

/**
 * 系统仪表板响应DTO
 */
export class DashboardResponseDto {
  @ApiProperty({ description: '健康评分' })
  healthScore: number;

  @ApiProperty({ description: '性能摘要' })
  performanceSummary: {
    responseTime: number;
    errorRate: number;
    throughput: number;
    memoryUsage: number;
    cpuUsage: number;
  };

  @ApiProperty({ description: '趋势数据' })
  trendsData: {
    responseTimeTrend: number[];
    errorRateTrend: number[];
    throughputTrend: number[];
  };

  @ApiProperty({ description: '关键问题' })
  criticalIssues: Array<{
    severity: 'high' | 'medium' | 'low';
    category: string;
    message: string;
    timestamp: string;
  }>;

  @ApiProperty({ description: '优化建议' })
  suggestions: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    action: string;
  }>;

  @ApiProperty({ description: '仪表板时间戳' })
  timestamp: string;
}
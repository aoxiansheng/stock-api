/**
 * 🎯 监控展示层响应DTO
 *
 * 标准化监控API的响应格式
 */

import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate } from "class-validator";
import { TimestampFields } from "../../../common/interfaces/time-fields.interface";
import { TrendDataInterface } from "../../contracts/interfaces/trend-data.interface";

/**
 * 标准监控响应DTO
 */
export class PresenterResponseDto<T = any> {
  @ApiProperty({ description: "响应状态码" })
  statusCode: number;

  @ApiProperty({ description: "响应消息" })
  message: string;

  @ApiProperty({ description: "响应数据" })
  data: T;

  @ApiProperty({ description: "时间戳" })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @ApiProperty({ description: "请求ID", required: false })
  requestId?: string;

  constructor(data: T, message: string = "获取成功") {
    this.statusCode = 200;
    this.message = message;
    this.data = data;
    this.timestamp = new Date();
  }
}

/**
 * 健康状态响应DTO
 */
export class HealthStatusResponseDto {
  @ApiProperty({
    description: "健康状态",
    enum: ["healthy", "degraded", "unhealthy"],
  })
  status: "healthy" | "degraded" | "unhealthy";

  @ApiProperty({ description: "健康评分", minimum: 0, maximum: 100 })
  healthScore: number;

  @ApiProperty({ description: "组件状态" })
  components: Record<string, any>;

  @ApiProperty({ description: "检查时间戳" })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;

  @ApiProperty({ description: "详细信息", required: false })
  details?: any;
}

/**
 * 性能分析响应DTO
 */
export class PerformanceAnalysisResponseDto {
  @ApiProperty({ description: "性能摘要" })
  summary: {
    responseTimeMs: number;
    errorRate: number;
    throughput: number;
    uptime: number;
  };

  @ApiProperty({ description: "健康评分" })
  healthScore: number;

  @ApiProperty({ description: "趋势分析" })
  trends: {
    responseTimeMs: number[];
    errorRate: number[];
    throughput: number[];
  };

  @ApiProperty({ description: "端点指标" })
  endpointMetrics: Array<{
    endpoint: string;
    method: string;
    totalOperations: number;
    responseTimeMs: number;
    errorRate: number;
  }>;

  @ApiProperty({ description: "数据库指标" })
  databaseMetrics: {
    totalOperations: number;
    responseTimeMs: number;
    slowQueries: number;
    errorRate: number;
  };

  @ApiProperty({ description: "缓存指标" })
  cacheMetrics: {
    totalOperations: number;
    hitRate: number;
    responseTimeMs: number;
  };

  @ApiProperty({ description: "分析时间戳" })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;
}

/**
 * 趋势数据DTO - 简化嵌套结构
 */
export class TrendsDataDto implements TrendDataInterface {
  @ApiProperty({ description: "响应时间趋势", type: [Number] })
  responseTimeTrend: number[];

  @ApiProperty({ description: "错误率趋势", type: [Number] })
  errorRateTrend: number[];

  @ApiProperty({ description: "吞吐量趋势", type: [Number] })
  throughputTrend: number[];
}

/**
 * 关键问题DTO - 简化嵌套结构
 */
export class CriticalIssueDto {
  @ApiProperty({ description: "严重程度", enum: ["high", "medium", "low"] })
  severity: "high" | "medium" | "low";

  @ApiProperty({ description: "问题类别" })
  category: string;

  @ApiProperty({ description: "问题描述" })
  message: string;

  @ApiProperty({ description: "发生时间" })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;
}

/**
 * 优化建议DTO - 简化嵌套结构
 */
export class OptimizationSuggestionDto {
  @ApiProperty({ description: "优先级", enum: ["high", "medium", "low"] })
  priority: "high" | "medium" | "low";

  @ApiProperty({ description: "建议标题" })
  title: string;

  @ApiProperty({ description: "详细描述" })
  description: string;

  @ApiProperty({ description: "推荐操作" })
  action: string;
}

/**
 * 系统仪表板响应DTO
 */
export class DashboardResponseDto {
  @ApiProperty({ description: "健康评分" })
  healthScore: number;

  @ApiProperty({ description: "性能摘要" })
  performanceSummary: {
    responseTimeMs: number;
    errorRate: number;
    throughput: number;
    memoryUsage: number;
    cpuUsage: number;
  };

  @ApiProperty({ description: "趋势数据", type: TrendsDataDto })
  @Type(() => TrendsDataDto)
  trendsData: TrendsDataDto;

  @ApiProperty({ description: "关键问题", type: [CriticalIssueDto] })
  @Type(() => CriticalIssueDto)
  criticalIssues: CriticalIssueDto[];

  @ApiProperty({ description: "优化建议", type: [OptimizationSuggestionDto] })
  @Type(() => OptimizationSuggestionDto)
  suggestions: OptimizationSuggestionDto[];

  @ApiProperty({ description: "仪表板时间戳" })
  @IsDate()
  @Type(() => Date)
  timestamp: Date;
}

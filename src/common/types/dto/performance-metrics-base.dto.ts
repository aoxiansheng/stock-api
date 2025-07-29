import { ApiProperty } from "@nestjs/swagger";

/**
 * 基础性能指标DTO接口
 * 定义所有性能指标DTO的通用字段
 */
export interface BasePerformanceMetrics {
  /** 处理时间（毫秒） */
  processingTime: number;

  /** 时间戳 */
  timestamp?: string;
}

/**
 * 系统级性能指标DTO
 * 用于系统整体性能监控
 */
export class SystemPerformanceMetricsDto implements BasePerformanceMetrics {
  @ApiProperty({ description: "时间戳" })
  timestamp: string;

  @ApiProperty({ description: "系统健康评分" })
  healthScore: number;

  @ApiProperty({ description: "处理时间（毫秒）" })
  processingTime: number;

  @ApiProperty({
    description: "性能摘要",
    type: "object",
    properties: {
      totalRequests: { type: "number", description: "总请求数" },
      averageResponseTime: { type: "number", description: "平均响应时间 (ms)" },
      errorRate: { type: "number", description: "错误率" },
      systemLoad: { type: "number", description: "系统负载" },
      memoryUsage: { type: "number", description: "内存使用 (bytes)" },
      cacheHitRate: { type: "number", description: "缓存命中率" },
    },
  })
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    systemLoad: number;
    memoryUsage: number;
    cacheHitRate: number;
  };

  @ApiProperty({ description: "各端点性能指标", type: [Object] })
  endpoints: any[];

  @ApiProperty({ description: "数据库性能指标", type: Object })
  database: any;

  @ApiProperty({ description: "Redis 性能指标", type: Object })
  redis: any;

  @ApiProperty({ description: "系统资源指标", type: Object })
  system: any;
}

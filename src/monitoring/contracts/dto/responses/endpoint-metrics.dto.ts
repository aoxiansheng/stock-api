/**
 * 🎯 端点指标响应 DTO
 *
 * 用于标准化端点指标API响应数据结构
 * 替代手动 Swagger schema 定义
 */

import { ApiProperty } from "@nestjs/swagger";

export class EndpointMetricsDto {
  @ApiProperty({
    description: "端点路径",
    example: "/api/v1/receiver/get-stock-quote",
  })
  endpoint: string;

  @ApiProperty({ description: "HTTP 方法", example: "GET" })
  method: string;

  @ApiProperty({ description: "总操作数", example: 1250 })
  totalOperations: number;

  @ApiProperty({ description: "平均响应时间 (ms)", example: 85.2 })
  responseTimeMs: number;

  @ApiProperty({ description: "错误率 (%)", example: 0.16 })
  errorRate: number;

  @ApiProperty({
    description: "最后使用时间",
    example: "2024-09-17T10:30:00.000Z",
    format: "date-time",
  })
  lastUsed: string;
}

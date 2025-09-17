/**
 * 🎯 健康报告响应 DTO
 *
 * 用于标准化健康报告API响应数据结构
 * 替代手动 Swagger schema 定义
 */

import { ApiProperty } from "@nestjs/swagger";

export class HealthComponentDto {
  @ApiProperty({ description: "组件名称", example: "mongodb" })
  name: string;

  @ApiProperty({
    description: "组件状态",
    enum: ["healthy", "degraded", "unhealthy"],
    example: "healthy",
  })
  status: "healthy" | "degraded" | "unhealthy";

  @ApiProperty({ description: "响应时间 (ms)", example: 12.5 })
  responseTime: number;

  @ApiProperty({ description: "错误信息", required: false, example: null })
  error?: string;

  @ApiProperty({ description: "健康分数 (0-100)", example: 95 })
  score: number;
}

export class HealthOverallDto {
  @ApiProperty({
    description: "整体状态",
    enum: ["healthy", "degraded", "unhealthy"],
    example: "healthy",
  })
  status: "healthy" | "degraded" | "unhealthy";

  @ApiProperty({ description: "整体健康分数 (0-100)", example: 92.5 })
  score: number;

  @ApiProperty({ description: "运行时间 (秒)", example: 86400 })
  uptime: number;

  @ApiProperty({ description: "版本信息", example: "1.0.0" })
  version: string;
}

export class HealthRecommendationDto {
  @ApiProperty({
    description: "优化类别",
    enum: ["performance", "security", "resource", "configuration"],
    example: "performance",
  })
  category: "performance" | "security" | "resource" | "configuration";

  @ApiProperty({
    description: "优先级",
    enum: ["high", "medium", "low"],
    example: "medium",
  })
  priority: "high" | "medium" | "low";

  @ApiProperty({ description: "标题", example: "优化数据库连接池" })
  title: string;

  @ApiProperty({
    description: "描述",
    example: "当前数据库连接池配置可能导致性能瓶颈",
  })
  description: string;

  @ApiProperty({ description: "建议操作", example: "增加连接池大小到50个连接" })
  action: string;

  @ApiProperty({ description: "预期影响", example: "提升数据库查询性能约15%" })
  impact: string;
}

export class HealthReportDto {
  @ApiProperty({ description: "整体健康状况", type: HealthOverallDto })
  overall: HealthOverallDto;

  @ApiProperty({ description: "组件健康状况", type: [HealthComponentDto] })
  components: HealthComponentDto[];

  @ApiProperty({ description: "优化建议", type: [HealthRecommendationDto] })
  recommendations: HealthRecommendationDto[];
}

/**
 * 🎯 趋势分析响应 DTO
 *
 * 用于标准化趋势分析API响应数据结构
 * 替代手动 Swagger schema 定义
 */

import { ApiProperty } from "@nestjs/swagger";

export class TrendDataPointDto {
  @ApiProperty({
    description: "数值数组",
    type: [Number],
    example: [120, 135, 142, 128, 115],
  })
  values: number[];

  @ApiProperty({
    description: "时间标签",
    type: [String],
    example: ["10:00", "10:15", "10:30", "10:45", "11:00"],
  })
  labels: string[];

  @ApiProperty({ description: "平均值", example: 128 })
  average: number;
}

export class TrendsDataDto {
  @ApiProperty({ description: "响应时间趋势数据", type: TrendDataPointDto })
  responseTime: TrendDataPointDto;

  @ApiProperty({ description: "错误率趋势数据", type: TrendDataPointDto })
  errorRate: TrendDataPointDto;

  @ApiProperty({ description: "吞吐量趋势数据", type: TrendDataPointDto })
  throughput: TrendDataPointDto;
}

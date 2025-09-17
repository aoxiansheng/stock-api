/**
 * 🎯 健康评分响应 DTO
 *
 * 用于标准化健康评分API响应数据结构
 * 替代手动 Swagger schema 定义
 */

import { ApiProperty } from "@nestjs/swagger";

export class HealthScoreDto {
  @ApiProperty({
    description: "系统健康评分 (0-100)",
    example: 92.5,
    minimum: 0,
    maximum: 100,
  })
  score: number;

  @ApiProperty({
    description: "评分时间戳",
    example: "2024-09-17T10:30:00.000Z",
    format: "date-time",
  })
  timestamp: string;
}

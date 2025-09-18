import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsBoolean, IsArray } from "class-validator";

/**
 * 告警查询结果DTO
 */
export class AlertQueryResultDto {
  @ApiProperty({ description: "告警列表" })
  @IsArray()
  alerts: any[]; // 🎯 支持IAlert[]类型

  @ApiProperty({ description: "总数量" })
  @IsNumber()
  total: number;

  @ApiProperty({ description: "当前页码" })
  @IsNumber()
  page: number;

  @ApiProperty({ description: "每页数量" })
  @IsNumber()
  limit: number;

  @ApiProperty({ description: "总页数" })
  @IsNumber()
  totalPages: number;

  @ApiProperty({ description: "是否有下一页" })
  @IsBoolean()
  hasNext: boolean;

  @ApiProperty({ description: "是否有上一页" })
  @IsBoolean()
  hasPrev: boolean;
}

/**
 * 告警统计信息DTO
 */
export class AlertStatisticsDto {
  @ApiProperty({ description: "活跃告警数量" })
  @IsNumber()
  activeAlerts: number;

  @ApiProperty({ description: "严重告警数量" })
  @IsNumber()
  criticalAlerts: number;

  @ApiProperty({ description: "警告告警数量" })
  @IsNumber()
  warningAlerts: number;

  @ApiProperty({ description: "信息告警数量" })
  @IsNumber()
  infoAlerts: number;

  @ApiProperty({ description: "今日告警总数" })
  @IsNumber()
  totalAlertsToday: number;

  @ApiProperty({ description: "今日已解决告警数" })
  @IsNumber()
  resolvedAlertsToday: number;

  @ApiProperty({ description: "平均解决时间（分钟）" })
  @IsNumber()
  averageResolutionTime: number;

  @ApiProperty({ description: "统计时间" })
  statisticsTime: Date;
}

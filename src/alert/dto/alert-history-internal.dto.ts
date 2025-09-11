import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsObject,
  IsArray,
  IsEnum,
  IsDateString,
} from "class-validator";

import { AlertStatus } from "../types/alert.types";
import { BaseQueryDto } from "../../common/dto/base-query.dto";

/**
 * 创建告警数据DTO
 */
export class CreateAlertDataDto {
  @ApiProperty({ description: "规则ID" })
  @IsString()
  ruleId: string;

  @ApiProperty({ description: "规则名称" })
  @IsString()
  ruleName: string;

  @ApiProperty({ description: "告警消息" })
  @IsString()
  message: string;

  @ApiProperty({
    description: "告警级别",
    enum: ["critical", "warning", "info"],
  })
  @IsEnum(["critical", "warning", "info"])
  severity: "critical" | "warning" | "info";

  @ApiProperty({ description: "当前值" })
  @IsNumber()
  currentValue: number;

  @ApiProperty({ description: "阈值" })
  @IsNumber()
  threshold: number;

  @ApiProperty({ description: "监控指标" })
  @IsString()
  metric: string;

  @ApiProperty({ description: "标签信息", required: false })
  @IsOptional()
  @IsObject()
  tags?: Record<string, any>;

  @ApiProperty({ description: "告警上下文信息", required: false })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

/**
 * 告警状态更新数据DTO
 */
export class AlertStatusUpdateDataDto {
  @ApiProperty({ description: "告警状态", enum: AlertStatus })
  @IsEnum(AlertStatus)
  status: AlertStatus;

  @ApiProperty({ description: "确认人员", required: false })
  @IsOptional()
  @IsString()
  acknowledgedBy?: string;

  @ApiProperty({ description: "确认时间", required: false })
  @IsOptional()
  acknowledgedAt?: Date;

  @ApiProperty({ description: "解决人员", required: false })
  @IsOptional()
  @IsString()
  resolvedBy?: string;

  @ApiProperty({ description: "解决时间", required: false })
  @IsOptional()
  resolvedAt?: Date;

  @ApiProperty({ description: "结束时间", required: false })
  @IsOptional()
  endTime?: Date;

  @ApiProperty({ description: "更新备注", required: false })
  @IsOptional()
  @IsString()
  updateNote?: string;
}

/**
 * 告警查询参数DTO
 */
export class AlertQueryParamsDto extends BaseQueryDto {

  @ApiProperty({ description: "告警状态", enum: AlertStatus, required: false })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @ApiProperty({ description: "告警级别", required: false })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiProperty({ description: "规则ID", required: false })
  @IsOptional()
  @IsString()
  ruleId?: string;

  @ApiProperty({ description: "开始时间", required: false })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiProperty({ description: "结束时间", required: false })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiProperty({ description: "搜索关键词", required: false })
  @IsOptional()
  @IsString()
  keyword?: string;
}

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

/**
 * 告警清理参数DTO
 */
export class AlertCleanupParamsDto {
  @ApiProperty({ description: "保留天数" })
  @IsNumber()
  daysToKeep: number;

  @ApiProperty({ description: "批量大小", required: false })
  @IsOptional()
  @IsNumber()
  batchSize?: number;

  @ApiProperty({ description: "是否仅清理已解决的告警", required: false })
  @IsOptional()
  @IsBoolean()
  onlyResolved?: boolean;

  @ApiProperty({ description: "排除的规则ID列表", required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeRuleIds?: string[];
}

/**
 * 告警清理结果DTO
 */
export class AlertCleanupResultDto {
  @ApiProperty({ description: "删除的告警数量" })
  @IsNumber()
  deletedCount: number;

  @ApiProperty({ description: "清理耗时（毫秒）" })
  @IsNumber()
  executionTimeMs: number;

  @ApiProperty({ description: "清理开始时间" })
  startTime: Date;

  @ApiProperty({ description: "清理结束时间" })
  endTime: Date;

  @ApiProperty({ description: "清理的最早告警时间", required: false })
  @IsOptional()
  oldestDeletedAlert?: Date;
}

/**
 * 告警ID生成参数DTO
 */
export class AlertIdGenerationDto {
  @ApiProperty({ description: "时间戳部分" })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: "随机部分" })
  @IsString()
  random: string;

  @ApiProperty({ description: "前缀" })
  @IsString()
  prefix: string;

  @ApiProperty({ description: "完整ID" })
  @IsString()
  fullId: string;
}

/**
 * 告警服务日志上下文DTO
 */
export class AlertHistoryLogContextDto {
  @ApiProperty({ description: "操作名称" })
  @IsString()
  operation: string;

  @ApiProperty({ description: "告警ID", required: false })
  @IsOptional()
  @IsString()
  alertId?: string;

  @ApiProperty({ description: "规则ID", required: false })
  @IsOptional()
  @IsString()
  ruleId?: string;

  @ApiProperty({ description: "告警状态", required: false })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ description: "执行时间（毫秒）", required: false })
  @IsOptional()
  @IsNumber()
  executionTime?: number;

  @ApiProperty({ description: "影响的记录数", required: false })
  @IsOptional()
  @IsNumber()
  affectedCount?: number;

  @ApiProperty({ description: "错误信息", required: false })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiProperty({ description: "查询参数", required: false })
  @IsOptional()
  @IsObject()
  queryParams?: Record<string, any>;

  @ApiProperty({ description: "附加上下文", required: false })
  @IsOptional()
  @IsObject()
  additionalContext?: Record<string, any>;
}

/**
 * 活跃告警查询选项DTO
 */
export class ActiveAlertsQueryOptionsDto {
  @ApiProperty({ description: "包含的告警级别", required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includeSeverities?: string[];

  @ApiProperty({ description: "排除的规则ID", required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludeRuleIds?: string[];

  @ApiProperty({ description: "最大返回数量", required: false })
  @IsOptional()
  @IsNumber()
  maxCount?: number;

  @ApiProperty({ description: "排序字段", required: false })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({
    description: "排序方向",
    enum: ["asc", "desc"],
    required: false,
  })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}

/**
 * 告警操作历史DTO
 */
export class AlertOperationHistoryDto {
  @ApiProperty({ description: "操作类型" })
  @IsString()
  operationType: "create" | "update" | "acknowledge" | "resolve" | "delete";

  @ApiProperty({ description: "操作时间" })
  operationTime: Date;

  @ApiProperty({ description: "操作人员", required: false })
  @IsOptional()
  @IsString()
  operatedBy?: string;

  @ApiProperty({ description: "操作前状态", required: false })
  @IsOptional()
  @IsString()
  previousStatus?: string;

  @ApiProperty({ description: "操作后状态", required: false })
  @IsOptional()
  @IsString()
  newStatus?: string;

  @ApiProperty({ description: "操作备注", required: false })
  @IsOptional()
  @IsString()
  operationNote?: string;

  @ApiProperty({ description: "操作详情", required: false })
  @IsOptional()
  @IsObject()
  operationDetails?: Record<string, any>;
}

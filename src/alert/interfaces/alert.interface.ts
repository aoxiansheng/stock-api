import { AlertSeverity, AlertStatus, NotificationChannel } from "../types/alert.types";

/**
 * 告警规则接口
 */
export interface IAlertRule {
  id: string;
  name: string;
  description?: string;
  metric: string;
  operator: "gt" | "lt" | "eq" | "gte" | "lte" | "ne";
  threshold: number;
  duration: number; // 持续时间（秒）
  severity: AlertSeverity;
  enabled: boolean;
  channels: NotificationChannel[];
  cooldown: number; // 冷却时间（秒）
  tags?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

/**
 * 告警实例接口
 */
export interface IAlert {
  id: string;
  ruleId: string;
  ruleName: string;
  metric: string;
  value: number;
  threshold: number;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  startTime: Date;
  endTime?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  tags?: Record<string, string>;
  context?: Record<string, any>;
}

/**
 * 告警统计接口
 */
export interface IAlertStats {
  totalRules: number;
  enabledRules: number;
  activeAlerts: number;
  criticalAlerts: number;
  warningAlerts: number;
  infoAlerts: number;
  totalAlertsToday: number;
  resolvedAlertsToday: number;
  averageResolutionTime: number;
}

/**
 * 告警查询条件接口
 */
export interface IAlertQuery {
  ruleId?: string;
  severity?: AlertSeverity;
  status?: AlertStatus;
  startTime?: Date;
  endTime?: Date;
  metric?: string;
  tags?: Record<string, string>;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

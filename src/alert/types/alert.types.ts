/**
 * 告警系统统一类型定义
 * 🎯 统一定义所有告警相关的类型，解决循环依赖问题
 */

/**
 * 基础实体接口
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 基础统计接口
 */
export interface BaseStats {
  timestamp: Date;
  period: string;
}

/**
 * 基础查询接口
 */
export interface BaseQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * 告警严重级别枚举
 */
export const AlertSeverity = {
  CRITICAL: "critical",
  WARNING: "warning",
  INFO: "info",
} as const;

export type AlertSeverity = (typeof AlertSeverity)[keyof typeof AlertSeverity];

/**
 * 告警状态枚举
 */
export const AlertStatus = {
  FIRING: "firing",
  ACKNOWLEDGED: "acknowledged",
  RESOLVED: "resolved",
  SUPPRESSED: "suppressed",
} as const;

export type AlertStatus = (typeof AlertStatus)[keyof typeof AlertStatus];

/**
 * 通知渠道类型枚举 - 统一定义避免循环依赖
 */
export const NotificationChannelType = {
  EMAIL: "email",
  WEBHOOK: "webhook",
  SLACK: "slack",
  LOG: "log",
  SMS: "sms",
  DINGTALK: "dingtalk",
} as const;

export type NotificationChannelType =
  (typeof NotificationChannelType)[keyof typeof NotificationChannelType];

/**
 * 通知渠道接口 - 解决循环依赖的核心接口
 */
export interface NotificationChannel {
  id?: string;
  name: string;
  type: NotificationChannelType;
  config: Record<string, any>;
  enabled: boolean;
  retryCount?: number;
  timeout?: number;
  priority?: number;
}

/**
 * 告警规则接口
 */
export interface AlertRule extends BaseEntity {
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
  conditions?: AlertCondition[];
}

/**
 * 告警条件接口
 */
export interface AlertCondition {
  field: string;
  operator:
    | "gt"
    | "lt"
    | "eq"
    | "gte"
    | "lte"
    | "ne"
    | "contains"
    | "not_contains";
  value: any;
  logicalOperator?: "and" | "or";
}

/**
 * 告警实例接口
 */
export interface Alert extends BaseEntity {
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
  escalationLevel?: number;
}

/**
 * 告警历史接口
 */
export interface AlertHistory {
  id: string;
  alertId: string;
  action: "created" | "acknowledged" | "resolved" | "escalated" | "cancelled";
  performedBy?: string;
  performedAt: Date;
  details?: Record<string, any>;
  comment?: string;
}

/**
 * 通知结果接口
 */
export interface NotificationResult {
  success: boolean;
  channelId: string;
  channelType: NotificationChannelType;
  message?: string;
  error?: string;
  sentAt: Date;
  duration: number;
  retryCount?: number;
}

/**
 * 批量通知结果接口
 */
export interface BatchNotificationResult {
  total: number;
  successful: number;
  failed: number;
  results: NotificationResult[];
  duration: number;
}

/**
 * 通知发送器接口
 */
export interface NotificationSender {
  type: NotificationChannelType;
  send(
    alert: Alert,
    rule: AlertRule,
    config: Record<string, any>,
  ): Promise<NotificationResult>;
  test(config: Record<string, any>): Promise<boolean>;
  validateConfig(config: Record<string, any>): {
    valid: boolean;
    errors: string[];
  };
}

/**
 * 通知模板接口
 */
export interface NotificationTemplate {
  subject: string;
  body: string;
  variables: Record<string, any>;
  format?: "text" | "html" | "markdown";
}

/**
 * 通知日志接口
 */
export interface NotificationLog {
  id: string;
  alertId: string;
  channelId: string;
  channelType: NotificationChannelType;
  success: boolean;
  message?: string;
  error?: string;
  sentAt: Date;
  duration: number;
  retryCount: number;
  metadata?: Record<string, any>;
}

// 注意: AlertStats 和 AlertRuleStats 接口已移除
// 实际使用中请参考 IAlertStats (src/alert/interfaces/alert.interface.ts)
// 如需扩展统计功能，建议基于 IAlertStats 创建新的扩展接口

/**
 * 告警查询接口
 */
export interface AlertQuery extends BaseQuery {
  ruleId?: string;
  severity?: AlertSeverity;
  status?: AlertStatus;
  startTime?: Date;
  endTime?: Date;
  metric?: string;
  tags?: Record<string, string>;
  acknowledgedBy?: string;
  resolvedBy?: string;
}

/**
 * 规则评估结果接口
 */
export interface RuleEvaluationResult {
  ruleId: string;
  triggered: boolean;
  value: number;
  threshold: number;
  message: string;
  evaluatedAt: Date;
  context?: Record<string, any>;
  severity?: AlertSeverity;
}

/**
 * 指标数据接口
 */
export interface MetricData {
  metric: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
  source?: string;
}

/**
 * 规则引擎接口
 */
export interface RuleEngine {
  evaluateRule(rule: AlertRule, metricData: MetricData[]): RuleEvaluationResult;
  evaluateRules(
    rules: AlertRule[],
    metricData: MetricData[],
  ): RuleEvaluationResult[];
  isInCooldown(ruleId: string): Promise<boolean>;
  setCooldown(ruleId: string, cooldownSeconds: number): Promise<void>;
  validateRule(rule: AlertRule): { valid: boolean; errors: string[] };
}

/**
 * 告警抑制规则接口
 */
export interface AlertSuppressionRule extends BaseEntity {
  name: string;
  conditions: {
    metric?: string;
    severity?: AlertSeverity;
    tags?: Record<string, string>;
  };
  duration: number; // 抑制时间（秒）
  enabled: boolean;
  priority: number;
}

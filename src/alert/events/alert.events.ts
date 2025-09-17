/**
 * Alert事件定义
 * 🎯 用于Alert和Notification模块间的事件驱动通信
 *
 * @description 根据Alert组件拆分计划创建的事件系统
 * @see docs/代码审查文档/常量枚举值审查说明/Alert组件拆分计划.md
 */

import { Alert, AlertRule } from "../types/alert.types";

/**
 * 警告触发事件
 * 当新警告被触发时发出此事件
 */
export class AlertFiredEvent {
  constructor(
    public readonly alert: Alert,
    public readonly rule: AlertRule,
    public readonly context: AlertContext,
  ) {}
}

/**
 * 警告解决事件
 * 当警告被解决/恢复时发出此事件
 */
export class AlertResolvedEvent {
  constructor(
    public readonly alert: Alert,
    public readonly resolvedAt: Date,
    public readonly resolvedBy?: string,
    public readonly comment?: string,
  ) {}
}

/**
 * 警告确认事件
 * 当警告被用户确认时发出此事件
 */
export class AlertAcknowledgedEvent {
  constructor(
    public readonly alert: Alert,
    public readonly acknowledgedAt: Date,
    public readonly acknowledgedBy: string,
    public readonly comment?: string,
  ) {}
}

/**
 * 警告抑制事件
 * 当警告被抑制时发出此事件
 */
export class AlertSuppressedEvent {
  constructor(
    public readonly alert: Alert,
    public readonly suppressedAt: Date,
    public readonly suppressedBy: string,
    public readonly suppressionDuration: number, // 抑制时长(秒)
    public readonly reason?: string,
  ) {}
}

/**
 * 警告升级事件
 * 当警告严重程度升级时发出此事件
 */
export class AlertEscalatedEvent {
  constructor(
    public readonly alert: Alert,
    public readonly previousSeverity: string,
    public readonly newSeverity: string,
    public readonly escalatedAt: Date,
    public readonly escalationReason: string,
  ) {}
}

/**
 * 警告上下文信息
 * 包含警告触发时的环境信息
 */
export interface AlertContext {
  /** 触发时的指标值 */
  metricValue: number;
  /** 阈值 */
  threshold: number;
  /** 触发时间戳 */
  triggeredAt: Date;
  /** 数据源 */
  dataSource?: string;
  /** 相关标签 */
  tags?: Record<string, string>;
  /** 触发条件详情 */
  triggerCondition?: {
    operator: string;
    duration: number;
    consecutiveFailures?: number;
  };
  /** 历史数据点 */
  historicalData?: Array<{
    timestamp: Date;
    value: number;
  }>;
  /** 相关警告ID（用于关联警告） */
  relatedAlerts?: string[];
}

/**
 * 事件名称常量
 * 统一管理所有警告事件的名称
 */
export const ALERT_EVENTS = {
  FIRED: "alert.fired",
  RESOLVED: "alert.resolved",
  ACKNOWLEDGED: "alert.acknowledged",
  SUPPRESSED: "alert.suppressed",
  ESCALATED: "alert.escalated",
} as const;

/**
 * 事件类型定义
 * 用于类型安全的事件处理
 */
export type AlertEventType = (typeof ALERT_EVENTS)[keyof typeof ALERT_EVENTS];

/**
 * 事件映射类型
 * 将事件名称映射到对应的事件类
 */
export type AlertEventMap = {
  [ALERT_EVENTS.FIRED]: AlertFiredEvent;
  [ALERT_EVENTS.RESOLVED]: AlertResolvedEvent;
  [ALERT_EVENTS.ACKNOWLEDGED]: AlertAcknowledgedEvent;
  [ALERT_EVENTS.SUPPRESSED]: AlertSuppressedEvent;
  [ALERT_EVENTS.ESCALATED]: AlertEscalatedEvent;
};

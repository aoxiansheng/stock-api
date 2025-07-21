/**
 * 告警服务接口定义
 * 🎯 定义告警系统相关的服务接口
 */

import {
  AlertRule,
  Alert,
  AlertStats,
  NotificationChannel,
  NotificationResult,
  BatchNotificationResult,
  RuleEvaluationResult,
  MetricData,
  NotificationType,
} from "../types/alert.types";

import { IValidationResult } from "./validation.interface";

/**
 * 告警服务接口
 */
export interface IAlertingService {
  createRule(rule: Partial<AlertRule>): Promise<AlertRule>;
  updateRule(id: string, rule: Partial<AlertRule>): Promise<AlertRule>;
  deleteRule(id: string): Promise<boolean>;
  getRules(): Promise<AlertRule[]>;
  getRuleById(id: string): Promise<AlertRule>;
  toggleRule(id: string, enabled: boolean): Promise<boolean>;
  processMetrics(metricData: MetricData[]): Promise<void>;
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean>;
  resolveAlert(alertId: string, resolvedBy: string): Promise<boolean>;
  getStats(): Promise<AlertStats>;
}

/**
 * 通知服务接口
 */
export interface INotificationService {
  sendNotification(
    alert: Alert,
    rule: AlertRule,
    channel: NotificationChannel,
  ): Promise<NotificationResult>;
  sendBatchNotifications(
    alert: Alert,
    rule: AlertRule,
  ): Promise<BatchNotificationResult>;
  testChannel(
    type: NotificationType,
    config: Record<string, any>,
  ): Promise<boolean>;
  validateChannelConfig(
    type: NotificationType,
    config: Record<string, any>,
  ): IValidationResult;
}

/**
 * 规则引擎服务接口
 */
export interface IRuleEngineService {
  evaluateRule(rule: AlertRule, metricData: MetricData[]): RuleEvaluationResult;
  evaluateRules(
    rules: AlertRule[],
    metricData: MetricData[],
  ): RuleEvaluationResult[];
  isInCooldown(ruleId: string): Promise<boolean>;
  setCooldown(ruleId: string, cooldownSeconds: number): Promise<void>;
  validateRule(rule: AlertRule): IValidationResult;
}

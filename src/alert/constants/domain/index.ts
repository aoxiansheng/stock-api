/**
 * 领域层常量统一导出
 * 🎯 领域层索引 - 导出所有领域专用常量
 */

// 告警规则领域常量
export * from './alert-rules.constants';
export {
  ALERT_RULE_CONSTANTS,
  ALERT_RULE_OPERATIONS,
  ALERT_RULE_MESSAGES,
  ALERT_RULE_METRICS,
  AlertRuleUtil,
  type OperatorType,
  type Operator,
} from './alert-rules.constants';

// 通知系统领域常量
export * from './notifications.constants';
export {
  NOTIFICATION_CONSTANTS,
  NOTIFICATION_OPERATIONS,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_ERROR_TEMPLATES,
  NotificationUtil,
  type NotificationVariable,
} from './notifications.constants';

// 告警历史领域常量
export * from './alert-history.constants';
export {
  ALERT_HISTORY_CONSTANTS,
  ALERT_HISTORY_OPERATIONS,
  ALERT_HISTORY_MESSAGES,
  ALERT_HISTORY_METRICS,
  AlertHistoryUtil,
} from './alert-history.constants';

// 验证规则领域常量
export * from './validation.constants';
export {
  VALIDATION_LIMITS,
  VALIDATION_MESSAGES,
  ValidationUtil,
} from './validation.constants';

// 导入用于重新导出
import {
  ALERT_RULE_CONSTANTS,
  ALERT_RULE_OPERATIONS,
  ALERT_RULE_MESSAGES,
  ALERT_RULE_METRICS,
  AlertRuleUtil,
} from './alert-rules.constants';

import {
  NOTIFICATION_CONSTANTS,
  NOTIFICATION_OPERATIONS,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_ERROR_TEMPLATES,
  NotificationUtil,
} from './notifications.constants';

import {
  ALERT_HISTORY_CONSTANTS,
  ALERT_HISTORY_OPERATIONS,
  ALERT_HISTORY_MESSAGES,
  ALERT_HISTORY_METRICS,
  AlertHistoryUtil,
} from './alert-history.constants';

import {
  VALIDATION_LIMITS,
  VALIDATION_MESSAGES,
  ValidationUtil,
} from './validation.constants';

/**
 * 领域层常量汇总
 * 便于统一访问所有领域常量
 */
export const DOMAIN_CONSTANTS = {
  ALERT_RULES: ALERT_RULE_CONSTANTS,
  NOTIFICATIONS: NOTIFICATION_CONSTANTS,
  ALERT_HISTORY: ALERT_HISTORY_CONSTANTS,
  VALIDATION: VALIDATION_LIMITS,
} as const;

/**
 * 领域层操作汇总
 * 便于统一访问所有操作定义
 */
export const DOMAIN_OPERATIONS = {
  ALERT_HISTORY: ALERT_HISTORY_OPERATIONS,
} as const;

/**
 * 领域层消息汇总
 * 便于统一访问所有消息定义
 */
export const DOMAIN_MESSAGES = {
  ALERT_HISTORY: ALERT_HISTORY_MESSAGES,
  VALIDATION: VALIDATION_MESSAGES,
} as const;

/**
 * 领域层指标汇总
 * 便于统一访问所有指标定义
 */
export const DOMAIN_METRICS = {
  ALERT_HISTORY: ALERT_HISTORY_METRICS,
} as const;

/**
 * 领域层工具类汇总
 * 便于统一访问所有工具类
 */
export const DOMAIN_UTILS = {
  AlertRuleUtil,
  NotificationUtil,
  AlertHistoryUtil,
  ValidationUtil,
} as const;
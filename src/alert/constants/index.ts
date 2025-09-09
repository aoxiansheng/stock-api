/**
 * Alert模块常量统一导出入口
 * 🎯 从 common/constants 剥离的 Alert 模块专用常量
 * 
 * 包含:
 * - AlertSeverity, AlertStatus 枚举
 * - ALERT_MESSAGES 消息模板
 * - Alert域常量 (Alert Rules, History, Notifications, Validation)
 */

// ================================
// 从 common 常量剥离的专属导出
// ================================

// 明确导出主要常量和枚举（避免通配符导出造成的冲突）
export { AlertSeverity, AlertStatus, AlertType, NotificationChannel } from './enums';
export { 
  ALERT_NOTIFICATION_TEMPLATES, 
  AlertMessageUtil 
} from './messages';

// ================================
// Alert 核心层常量导出
// ================================

// 明确导出核心常量
export { 
  ALERT_CORE_TIMEOUTS,
  CORE_CONSTANTS,
  CORE_UTILS,
  TimeConverter,
  TimeValidator,
  PatternValidator,
  LimitValidator
} from './core';

// ================================
// Alert 复合层常量导出  
// ================================

// 明确导出复合常量（包括完整的 ALERT_MESSAGES）
export {
  ALERT_DEFAULTS,
  ALERT_OPERATIONS, 
  ALERT_MESSAGES,     // 这是完整版本，包含 SYSTEM 和 RULES 等属性
  ALERT_METRICS,
  ALERT_ERROR_TEMPLATES,
  AlertDefaultsUtil,
  OperationUtil,
  TemplateUtil
} from './composite';

// ================================
// Alert 域常量导出
// ================================

// 明确导出域常量 (domain ALERT_HISTORY_MESSAGES takes precedence)
export { 
  ALERT_HISTORY_CONSTANTS, 
  ALERT_HISTORY_OPERATIONS, 
  ALERT_HISTORY_MESSAGES,
  ALERT_HISTORY_METRICS,
  AlertHistoryUtil
} from './domain/alert-history.constants';

export {
  ALERT_RULE_CONSTANTS,
  ALERT_RULE_OPERATIONS,
  ALERT_RULE_MESSAGES,
  ALERT_RULE_METRICS,
  VALID_OPERATORS,
  OPERATOR_SYMBOLS,
  AlertRuleUtil,
  type OperatorType,
  type Operator,
  type AlertRuleConstants
} from './domain/alert-rules.constants';

export {
  NOTIFICATION_CONSTANTS,
  NOTIFICATION_OPERATIONS,
  NOTIFICATION_MESSAGES,
  NOTIFICATION_ERROR_TEMPLATES,
  NotificationUtil
} from './domain/notifications.constants';

export {
  VALIDATION_LIMITS,
  VALIDATION_MESSAGES,
  ValidationUtil
} from './domain/validation.constants';
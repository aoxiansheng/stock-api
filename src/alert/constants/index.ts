/**
 * Alert常量统一导出入口
 * 🎯 简化的直观架构，业务语义清晰
 * 📊 按功能分类：超时配置 + 容量限制 + 默认值
 *
 * @author Alert常量重构任务
 * @created 2025-01-10
 * @refactored 2025-01-10
 */

// ================================
// 内部导入（用于默认导出和工具函数）
// ================================
import {
  ALERT_TIMEOUTS,
  OPERATION_TIMEOUTS,
  DATA_RETENTION,
} from "./timeouts.constants";
import {
  RULE_LIMITS,
  RETRY_LIMITS,
} from "./limits.constants";
import {
  ALERT_DEFAULTS,
} from "./defaults.constants";

// ================================
// 核心常量导出 - 新的简化架构
// ================================

// 超时和时间配置
export {
  ALERT_TIMEOUTS,
  OPERATION_TIMEOUTS,
  DATA_RETENTION,
} from "./timeouts.constants";
export type {
  AlertTimeouts,
  OperationTimeouts,
  DataRetention,
} from "./timeouts.constants";

// 容量和限制配置
export {
  RULE_LIMITS,
  RETRY_LIMITS,
} from "./limits.constants";
export type {
  RuleLimits,
  RetryLimits,
} from "./limits.constants";

// 默认值配置
export {
  ALERT_DEFAULTS,
} from "./defaults.constants";
export type {
  AlertDefaults,
} from "./defaults.constants";

// ================================
// 业务枚举和消息导出（保留原有）
// ================================

// 枚举定义（AlertSeverity和AlertStatus已迁移到alert.types.ts）
export {
  AlertType,
  NotificationChannel,
} from "./enums";

// 消息模板（通知相关已迁移）
export {
  ALERT_MESSAGES,
  ALERT_HISTORY_MESSAGES,
  AlertMessageUtil,
  ALERT_OPERATIONS,
  ALERT_METRICS,
  OPERATOR_SYMBOLS,
} from "./messages";

// 工具类
export { AlertRuleUtil } from "../utils/rule.utils";

// ================================
// 操作符常量
// ================================

/**
 * 有效操作符列表
 */
export const VALID_OPERATORS = [
  ">",
  ">=",
  "<",
  "<=",
  "==",
  "!=",
  "contains",
  "not_contains",
  "regex",
] as const;

/**
 * 操作符类型定义
 */
export type Operator = (typeof VALID_OPERATORS)[number];

// ================================
// 工具函数
// ================================


// ================================
// 默认导出（简化架构）
// ================================

export default {
  // 新的分类常量
  ALERT_TIMEOUTS,
  OPERATION_TIMEOUTS,
  DATA_RETENTION,
  RULE_LIMITS,
  RETRY_LIMITS,
  ALERT_DEFAULTS,
};

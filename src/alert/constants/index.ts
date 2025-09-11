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
} from './timeouts.constants';
import {
  RULE_LIMITS,
  STRING_LIMITS,
  RETRY_LIMITS,
  PERFORMANCE_LIMITS,
  VALIDATION_LIMITS,
} from './limits.constants';
import {
  ALERT_DEFAULTS,
  ALERT_CONFIG_PRESETS,
  ALERT_ENV_CONFIG,
} from './defaults.constants';

// ================================
// 核心常量导出 - 新的简化架构
// ================================

// 超时和时间配置
export {
  ALERT_TIMEOUTS,
  OPERATION_TIMEOUTS,
  DATA_RETENTION,
} from './timeouts.constants';
export type {
  AlertTimeouts,
  OperationTimeouts,
  DataRetention,
} from './timeouts.constants';

// 容量和限制配置
export {
  RULE_LIMITS,
  STRING_LIMITS,
  RETRY_LIMITS,
  PERFORMANCE_LIMITS,
  VALIDATION_LIMITS,
} from './limits.constants';
export type {
  RuleLimits,
  StringLimits,
  RetryLimits,
  PerformanceLimits,
  ValidationLimitsType,
} from './limits.constants';

// 默认值和预设配置
export {
  ALERT_DEFAULTS,
  ALERT_CONFIG_PRESETS,
  ALERT_ENV_CONFIG,
} from './defaults.constants';
export type {
  AlertDefaults,
  AlertConfigPresets,
  AlertEnvConfig,
} from './defaults.constants';

// ================================
// 业务枚举和消息导出（保留原有）
// ================================

// 枚举定义
export { AlertSeverity, AlertStatus, AlertType, NotificationChannel } from './enums';

// 消息模板（通知相关已迁移）
export { 
  ALERT_MESSAGES, 
  ALERT_HISTORY_MESSAGES,
  AlertMessageUtil,
  ALERT_OPERATIONS,
  ALERT_METRICS,
  OPERATOR_SYMBOLS,
} from './messages';

// 工具类
export { AlertRuleUtil } from '../utils/rule.utils';

// ================================
// 操作符常量
// ================================

/**
 * 有效操作符列表
 */
export const VALID_OPERATORS = ['>', '>=', '<', '<=', '==', '!=', 'contains', 'not_contains', 'regex'] as const;

/**
 * 操作符类型定义
 */
export type Operator = typeof VALID_OPERATORS[number];


// ================================
// 工具函数
// ================================

/**
 * 根据环境获取配置
 */
export function getAlertConfigForEnvironment(env: 'development' | 'test' | 'production') {
  return ALERT_ENV_CONFIG[env.toUpperCase() as keyof typeof ALERT_ENV_CONFIG];
}

/**
 * 获取预设配置
 */
export function getAlertPresetConfig(
  type: 'RULE' | 'NOTIFICATION' | 'PERFORMANCE',
  preset: string
) {
  const presets = ALERT_CONFIG_PRESETS[`${type}_PRESETS` as keyof typeof ALERT_CONFIG_PRESETS];
  return (presets as any)[preset] || null;
}

// ================================
// 默认导出（简化架构）
// ================================

export default {
  // 新的分类常量
  ALERT_TIMEOUTS,
  OPERATION_TIMEOUTS,
  DATA_RETENTION,
  RULE_LIMITS,
  STRING_LIMITS,
  RETRY_LIMITS,
  PERFORMANCE_LIMITS,
  VALIDATION_LIMITS,
  ALERT_DEFAULTS,
  ALERT_CONFIG_PRESETS,
  ALERT_ENV_CONFIG,
  
  
  // 工具函数
  getAlertConfigForEnvironment,
  getAlertPresetConfig,
};
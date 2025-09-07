/**
 * 复合应用层常量统一导出
 * 🎯 应用层索引 - 导出所有应用级配置常量
 */

// 默认值配置常量
export * from './defaults.constants';
export {
  ALERT_DEFAULTS,
  AlertDefaultsUtil,
  ALERT_RULE_DEFAULTS,
  ALERT_PAGINATION_DEFAULTS,
  ALERT_NOTIFICATION_DEFAULTS,
  ALERT_STATS_DEFAULTS,
  ALERT_PERFORMANCE_DEFAULTS,
  ALERT_SECURITY_DEFAULTS,
  type AlertDefaults,
} from './defaults.constants';

// 操作配置常量
export * from './operations.constants';
export {
  ALERT_OPERATIONS,
  ALERT_MESSAGES,
  ALERT_METRICS,
  ALERT_ERROR_TEMPLATES,
  OPERATION_CONFIG,
  OperationUtil,
  type AlertOperations,
  type AlertMessages,
  type AlertMetrics,
  type OperationConfig,
} from './operations.constants';

// 模板配置常量
export * from './templates.constants';
export {
  TEMPLATE_CONFIG,
  PREDEFINED_TEMPLATES,
  TEMPLATE_FORMATTING_RULES,
  TemplateUtil,
  type TemplateConfig,
  type PredefinedTemplates,
  type TemplateFormattingRules,
} from './templates.constants';

// 导入用于重新导出
import {
  ALERT_DEFAULTS,
  AlertDefaultsUtil,
  ALERT_RULE_DEFAULTS,
  ALERT_PAGINATION_DEFAULTS,
  ALERT_NOTIFICATION_DEFAULTS,
  ALERT_STATS_DEFAULTS,
  ALERT_PERFORMANCE_DEFAULTS,
  ALERT_SECURITY_DEFAULTS,
} from './defaults.constants';

import {
  ALERT_OPERATIONS,
  ALERT_MESSAGES,
  ALERT_METRICS,
  ALERT_ERROR_TEMPLATES,
  OPERATION_CONFIG,
  OperationUtil,
} from './operations.constants';

import {
  TEMPLATE_CONFIG,
  PREDEFINED_TEMPLATES,
  TEMPLATE_FORMATTING_RULES,
  TemplateUtil,
} from './templates.constants';

/**
 * 复合应用层常量汇总
 * 便于统一访问所有应用层配置
 */
export const COMPOSITE_CONSTANTS = {
  DEFAULTS: ALERT_DEFAULTS,
  OPERATIONS: ALERT_OPERATIONS,
  MESSAGES: ALERT_MESSAGES,
  METRICS: ALERT_METRICS,
  TEMPLATES: TEMPLATE_CONFIG,
} as const;

/**
 * 复合应用层工具类汇总
 * 便于统一访问所有工具类
 */
export const COMPOSITE_UTILS = {
  AlertDefaultsUtil,
  OperationUtil,
  TemplateUtil,
} as const;

/**
 * 应用配置汇总
 * 提供完整的应用级配置访问
 */
export const APPLICATION_CONFIG = {
  // 默认值配置
  DEFAULTS: ALERT_DEFAULTS,
  
  // 操作配置
  OPERATIONS: OPERATION_CONFIG,
  
  // 模板配置
  TEMPLATES: TEMPLATE_CONFIG,
  
  // 预定义模板
  PREDEFINED_TEMPLATES,
  
  // 格式化规则
  FORMATTING_RULES: TEMPLATE_FORMATTING_RULES,
} as const;
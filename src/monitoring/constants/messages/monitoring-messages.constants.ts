/**
 * 监控系统消息常量
 * 🎯 统一管理监控系统中的所有消息模板和文本，避免硬编码字符串
 * 提供多语言支持和消息分类管理
 */

/**
 * 消息状态描述 - 临时占位符  
 * 注：健康状态描述请使用 monitoring-health.constants.ts 中的 MONITORING_STATUS_DESCRIPTIONS
 */
export const MONITORING_MESSAGE_STATUS_DESCRIPTIONS = Object.freeze({
  PLACEHOLDER: "placeholder"
} as const);

/**
 * 消息格式化器 - 临时占位符
 */
export class MonitoringMessageFormatter {
  static format(message: string): string {
    return message;
  }
}

/**
 * 监控指标状态描述消息
 * 用于指标状态展示和用户界面的消息定义
 * 注：健康状态描述请使用 monitoring-health.constants.ts 中的 MONITORING_STATUS_DESCRIPTIONS
 */
export const MONITORING_METRIC_STATUS_DESCRIPTIONS = Object.freeze({
  /**
   * 指标状态描述
   */
  METRIC_NORMAL: "指标值在正常范围内",
  METRIC_WARNING: "指标值接近警告阈值",
  METRIC_CRITICAL: "指标值超过严重阈值",
  METRIC_IMPROVING: "指标趋势正在改善",
  METRIC_DETERIORATING: "指标趋势正在恶化"
} as const);

/**
 * 消息类型枚举
 * 用于消息分类和处理
 */
export const MONITORING_MESSAGE_TYPES = Object.freeze({
  OPERATION: 'operation',
  ERROR: 'error',
  LOG: 'log',
  NOTIFICATION: 'notification',
  STATUS: 'status',
  ACTION: 'action'
} as const);

/**
 * 消息严重性级别
 * 用于消息优先级排序
 */
export const MONITORING_MESSAGE_SEVERITY = Object.freeze({
  INFO: 0,
  WARNING: 1,
  ERROR: 2,
  CRITICAL: 3
} as const);

/**
 * 消息模板类型定义
 */
export type MonitoringMessageType = typeof MONITORING_MESSAGE_TYPES[keyof typeof MONITORING_MESSAGE_TYPES];
export type MonitoringMessageSeverity = typeof MONITORING_MESSAGE_SEVERITY[keyof typeof MONITORING_MESSAGE_SEVERITY];
export type MonitoringMetricStatusDescriptions = typeof MONITORING_METRIC_STATUS_DESCRIPTIONS;


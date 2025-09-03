/**
 * 监控常量统一导出入口
 * 🎯 提供监控模块所有常量的集中式导出，简化导入路径
 * 采用分层架构设计，确保清晰的模块化组织
 */

// ========================= 配置层常量 =========================
export {
  MONITORING_KEY_TEMPLATES,
  MONITORING_KEY_PREFIXES,
  MONITORING_KEY_SEPARATORS,
  MonitoringKeyGenerator
} from './config/monitoring-keys.constants';

export {
  MONITORING_METRICS,
  MONITORING_METRIC_CATEGORIES,
  MONITORING_METRIC_UNITS,
  MONITORING_METRIC_THRESHOLDS,
  MONITORING_AGGREGATION_TYPES,
  MONITORING_TIME_WINDOWS,
  MONITORING_METRIC_PRIORITIES,
  getMetricCategory,
  getMetricUnit,
  checkMetricThreshold
} from './config/monitoring-metrics.constants';

// ========================= 状态层常量 =========================
export {
  BASIC_HEALTH_STATUS_VALUES,
  EXTENDED_HEALTH_STATUS_VALUES,
  MONITORING_HEALTH_STATUS,
  MONITORING_BASIC_HEALTH_STATUS_VALUES,
  MONITORING_EXTENDED_HEALTH_STATUS_VALUES,
  mapInternalToExternalStatus,
  isValidMonitoringStatus,
  getMonitoringStatusSeverity
} from './status/monitoring-status.constants';

export type {
  BasicHealthStatus,
  ExtendedHealthStatus
} from './status/monitoring-status.constants';

// ========================= 消息层常量 =========================
export {
  MONITORING_OPERATION_MESSAGES,
  MONITORING_ERROR_MESSAGES,
  MONITORING_LOG_MESSAGES,
  MONITORING_NOTIFICATION_MESSAGES,
  MONITORING_STATUS_DESCRIPTIONS,
  MONITORING_ACTION_PROMPTS,
  MONITORING_MESSAGE_TYPES,
  MONITORING_MESSAGE_SEVERITY,
  MonitoringMessageFormatter
} from './messages/monitoring-messages.constants';

// ========================= 工具类导出 =========================
export { MonitoringSerializer, MonitoringDataSerializer } from '../utils/monitoring-serializer';

// ========================= 类型导出 =========================
export type { MonitoringKeyTemplate } from './config/monitoring-keys.constants';
export type { PerformanceMetricType } from './config/monitoring-metrics.constants';
export type {
  MonitoringOperationMessage,
  MonitoringErrorMessage,
  MonitoringMessageType,
  MonitoringMessageSeverity
} from './messages/monitoring-messages.constants';
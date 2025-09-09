/**
 * 监控常量统一导出入口
 * 🎯 提供监控模块所有常量的集中式导出，简化导入路径
 * 采用分层架构设计，确保清晰的模块化组织
 * 
 * 新增：从 common 常量剥离的业务常量 - MONITORING_BUSINESS
 */

// ========================= 从 common 常量剥离的业务常量 =========================
export * from './business';
export { 
  MONITORING_BUSINESS, 
  MonitoringBusinessUtil,
  type ErrorRateLevel,
  type ChangeLevel,
  type PerformanceLevel,
  type HealthLevel,
  type DataVolume,
  type AlertLevel,
  type CollectionPriority,
  type DataType,
  type MonitoringBusinessConstants
} from './business';

// ========================= 配置层常量 =========================
export {
  MONITORING_KEY_TEMPLATES,
  MONITORING_KEY_PREFIXES,
  MONITORING_KEY_SEPARATORS
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

// 系统限制常量
export {
  MONITORING_SYSTEM_LIMITS,
  MonitoringSystemLimitUtils
} from './config/monitoring-system.constants';

// 健康状态常量（新增）
export {
  MONITORING_HEALTH_STATUS,
  BASIC_HEALTH_STATUS_VALUES,
  EXTENDED_HEALTH_STATUS_VALUES,
  MONITORING_BASIC_HEALTH_STATUS_VALUES,
  MONITORING_EXTENDED_HEALTH_STATUS_VALUES,
  MonitoringHealthUtils,
  isValidMonitoringStatus,
  getMonitoringStatusSeverity,
  mapInternalToExternalStatus,
  MONITORING_STATUS_DESCRIPTIONS,
  MONITORING_STATUS_COLORS
} from './config/monitoring-health.constants';

// ========================= 状态层常量（向后兼容导出） =========================
export type {
  MonitoringHealthStatus,
  BasicHealthStatus,
  ExtendedHealthStatus
} from './status/monitoring-status.constants';

// ========================= 消息层常量 =========================
export {
  MONITORING_MESSAGE_STATUS_DESCRIPTIONS,
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
  MonitoringSystemLimitKeys,
  MonitoringSystemLimits
} from './config/monitoring-system.constants';
export type {
  MonitoringMessageType,
  MonitoringMessageSeverity
} from './messages/monitoring-messages.constants';
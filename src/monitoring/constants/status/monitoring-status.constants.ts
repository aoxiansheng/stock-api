/**
 * 监控系统状态常量
 * 🎯 监控模块专属的健康状态定义，避免跨模块依赖
 * 使用独立的健康状态常量，提高模块独立性
 */

// 使用监控模块专属的健康状态常量
import { type MonitoringHealthStatus } from '../config/monitoring-health.constants';

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
} from '../config/monitoring-health.constants';

// 导出类型
export type { MonitoringHealthStatus } from '../config/monitoring-health.constants';

// 为了保持向后兼容，提供类型别名
export type BasicHealthStatus = MonitoringHealthStatus;
export type ExtendedHealthStatus = MonitoringHealthStatus;
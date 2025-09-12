/**
 * 监控健康状态常量
 * @description 监控模块专属的健康状态定义，避免对cache模块的常量依赖
 * @version 1.0.0
 * @since 2025-09-05
 * @author Claude Code
 */

export const MONITORING_HEALTH_STATUS = {
  /**
   * 健康状态
   * @description 系统运行正常，所有指标在正常范围内
   */
  HEALTHY: 'healthy',
  
  /**
   * 警告状态
   * @description 系统运行基本正常，但存在需要关注的指标
   */
  WARNING: 'warning',
  
  /**
   * 降级状态  
   * @description 系统功能受限，性能下降但仍可用
   */
  DEGRADED: 'degraded',
  
  /**
   * 不健康状态
   * @description 系统出现严重问题，需要立即处理
   */
  UNHEALTHY: 'unhealthy',
  
  /**
   * 未知状态
   * @description 无法确定系统健康状态，可能是监控数据不足
   */
  UNKNOWN: 'unknown',
} as const;

export type MonitoringHealthStatus = 
  typeof MONITORING_HEALTH_STATUS[keyof typeof MONITORING_HEALTH_STATUS];

// 基础健康状态值（核心状态）
export const BASIC_HEALTH_STATUS_VALUES: MonitoringHealthStatus[] = [
  MONITORING_HEALTH_STATUS.HEALTHY,
  MONITORING_HEALTH_STATUS.WARNING, 
  MONITORING_HEALTH_STATUS.UNHEALTHY,
];

// 扩展健康状态值（包含所有状态）
export const EXTENDED_HEALTH_STATUS_VALUES: MonitoringHealthStatus[] = [
  MONITORING_HEALTH_STATUS.HEALTHY,
  MONITORING_HEALTH_STATUS.WARNING,
  MONITORING_HEALTH_STATUS.DEGRADED,
  MONITORING_HEALTH_STATUS.UNHEALTHY,
  MONITORING_HEALTH_STATUS.UNKNOWN,
];

// 监控模块专用的状态值数组
export const MONITORING_BASIC_HEALTH_STATUS_VALUES: MonitoringHealthStatus[] = BASIC_HEALTH_STATUS_VALUES;
export const MONITORING_EXTENDED_HEALTH_STATUS_VALUES: MonitoringHealthStatus[] = EXTENDED_HEALTH_STATUS_VALUES;

/**
 * 监控健康状态工具函数
 */
export const MonitoringHealthUtils = {
  /**
   * 判断是否为健康状态
   */
  isHealthy: (status: MonitoringHealthStatus): boolean =>
    status === MONITORING_HEALTH_STATUS.HEALTHY,
    
  /**
   * 判断是否为警告状态
   */
  isWarning: (status: MonitoringHealthStatus): boolean =>
    status === MONITORING_HEALTH_STATUS.WARNING,
    
  /**
   * 判断是否为降级状态
   */
  isDegraded: (status: MonitoringHealthStatus): boolean =>
    status === MONITORING_HEALTH_STATUS.DEGRADED,
    
  /**
   * 判断是否为不健康状态
   */
  isUnhealthy: (status: MonitoringHealthStatus): boolean =>
    status === MONITORING_HEALTH_STATUS.UNHEALTHY,
    
  /**
   * 判断是否为未知状态
   */
  isUnknown: (status: MonitoringHealthStatus): boolean =>
    status === MONITORING_HEALTH_STATUS.UNKNOWN,
    
  /**
   * 判断系统是否可操作（排除不健康状态）
   */
  isOperational: (status: MonitoringHealthStatus): boolean =>
    status !== MONITORING_HEALTH_STATUS.UNHEALTHY,
    
  /**
   * 判断状态是否需要关注（警告及以上级别）
   */
  needsAttention: (status: MonitoringHealthStatus): boolean =>
    status === MONITORING_HEALTH_STATUS.WARNING ||
    status === MONITORING_HEALTH_STATUS.DEGRADED ||
    status === MONITORING_HEALTH_STATUS.UNHEALTHY ||
    status === MONITORING_HEALTH_STATUS.UNKNOWN,
} as const;

/**
 * 监控组件健康状态验证函数
 * @description 基于监控模块专属类型的验证逻辑
 */
export function isValidMonitoringStatus(status: any): status is MonitoringHealthStatus {
  return EXTENDED_HEALTH_STATUS_VALUES.includes(status as MonitoringHealthStatus);
}

/**
 * 监控状态严重性评分
 * @description 为监控模块提供健康状态的严重性量化
 * @returns 严重性评分，数值越高表示问题越严重
 */
export function getMonitoringStatusSeverity(status: MonitoringHealthStatus): number {
  switch (status) {
    case MONITORING_HEALTH_STATUS.HEALTHY:
      return 0; // 正常
    case MONITORING_HEALTH_STATUS.WARNING:
      return 1; // 警告
    case MONITORING_HEALTH_STATUS.DEGRADED:
      return 2; // 降级
    case MONITORING_HEALTH_STATUS.UNHEALTHY:
      return 3; // 严重
    case MONITORING_HEALTH_STATUS.UNKNOWN:
      return 2; // 未知状态视为需要关注
    default:
      return 3; // 未知状态类型视为严重
  }
}

/**
 * 状态映射工具
 * @description 将监控模块状态映射到标准状态格式
 */
export function mapInternalToExternalStatus(
  internalStatus: MonitoringHealthStatus
): string {
  // 映射到标准状态字符串格式
  switch (internalStatus) {
    case MONITORING_HEALTH_STATUS.HEALTHY:
      return 'healthy';
    case MONITORING_HEALTH_STATUS.WARNING:
      return 'warning';
    case MONITORING_HEALTH_STATUS.DEGRADED:
      return 'degraded';
    case MONITORING_HEALTH_STATUS.UNHEALTHY:
      return 'unhealthy';
    case MONITORING_HEALTH_STATUS.UNKNOWN:
      return 'unknown';
    default:
      return 'unknown';
  }
}

/**
 * 状态描述映射
 */
export const MONITORING_STATUS_DESCRIPTIONS = {
  [MONITORING_HEALTH_STATUS.HEALTHY]: '系统运行正常',
  [MONITORING_HEALTH_STATUS.WARNING]: '系统存在警告，需要关注',
  [MONITORING_HEALTH_STATUS.DEGRADED]: '系统功能降级，性能受影响',
  [MONITORING_HEALTH_STATUS.UNHEALTHY]: '系统出现严重问题，需要立即处理',
  [MONITORING_HEALTH_STATUS.UNKNOWN]: '无法确定系统状态，监控数据不足',
} as const;

/**
 * 状态颜色映射（用于UI显示）
 */
export const MONITORING_STATUS_COLORS = {
  [MONITORING_HEALTH_STATUS.HEALTHY]: '#28a745',   // 绿色
  [MONITORING_HEALTH_STATUS.WARNING]: '#ffc107',   // 黄色
  [MONITORING_HEALTH_STATUS.DEGRADED]: '#fd7e14',  // 橙色
  [MONITORING_HEALTH_STATUS.UNHEALTHY]: '#dc3545', // 红色
  [MONITORING_HEALTH_STATUS.UNKNOWN]: '#6c757d',   // 灰色
} as const;
/**
 * 监控系统接口导出策略
 * 🎯 提供监控系统所有接口和类型的统一导出入口
 * 支持按功能分类和统一导出两种方式
 */

// ========================= 核心接口导出 =========================
/**
 * 监控组件接口
 * 提供监控系统核心组件的标准化接口定义
 */
export {
  IMonitoringComponent,
  IAdvancedMonitoringComponent,
  IInfrastructure,
  ICollector,
  IAnalyzer,
  IPresenter,
  ISerializer,
  IMessageFormatter
} from './shared.interface';

// ========================= 类型定义导出 =========================
/**
 * 基础类型定义
 * 监控系统中使用的核心类型和枚举
 */
export {
  MonitoringMetricType,
  HealthStatus,
  DetailedHealthStatus,
  StandardMetricType,
  AggregationType,
  MonitoringLayer
} from '../types/shared.types';

/**
 * 接口类型定义
 * 监控系统中使用的接口和数据结构
 */
export {
  PerformanceMetrics,
  DetailedPerformanceMetrics,
  HealthCheckResult,
  MetricLabels,
  MetricDataPoint,
  MonitoringConfiguration,
  MonitoringEvent,
  MonitoringReport,
  MonitoringError
} from '../types/shared.types';

// ========================= 按功能分类的导出 =========================
/**
 * 基础监控接口集合
 * 包含最基本的监控功能接口
 */
export const BasicMonitoringInterfaces = {
  IMonitoringComponent: 'IMonitoringComponent' as const,
  ICollector: 'ICollector' as const,
  IPresenter: 'IPresenter' as const
};

/**
 * 高级监控接口集合
 * 包含高级监控功能和分析能力的接口
 */
export const AdvancedMonitoringInterfaces = {
  IAdvancedMonitoringComponent: 'IAdvancedMonitoringComponent' as const,
  IInfrastructure: 'IInfrastructure' as const,
  IAnalyzer: 'IAnalyzer' as const
};

/**
 * 工具类接口集合
 * 包含序列化、格式化等工具类接口
 */
export const UtilityInterfaces = {
  ISerializer: 'ISerializer' as const,
  IMessageFormatter: 'IMessageFormatter' as const
};

// ========================= 接口验证工具 =========================
/**
 * 接口验证工具类
 * 提供运行时接口验证功能
 */
export class InterfaceValidator {
  /**
   * 验证对象是否实现了基础监控组件接口
   */
  static isMonitoringComponent(obj: any): boolean {
    return obj &&
           typeof obj.getHealthStatus === 'function' &&
           typeof obj.getMetrics === 'function';
  }

  /**
   * 验证对象是否实现了序列化器接口
   */
  static isSerializer(obj: any): boolean {
    return obj &&
           typeof obj.serialize === 'function' &&
           typeof obj.deserialize === 'function' &&
           typeof obj.generateKey === 'function' &&
           typeof obj.validateSerialization === 'function';
  }

  /**
   * 验证健康状态值是否有效
   */
  static isValidHealthStatus(status: any): boolean {
    return typeof status === 'string' &&
           ['healthy', 'warning', 'unhealthy', 'degraded', 'connected', 'disconnected'].includes(status);
  }
}

// ========================= 重新导出常量架构 =========================
/**
 * 常量架构集成
 * 重新导出监控常量，确保接口层可以访问所有常量定义
 */
export {
  MONITORING_METRICS,
  MONITORING_HEALTH_STATUS,
  MONITORING_KEY_TEMPLATES,
  MONITORING_MESSAGE_TYPES,
  MonitoringMessageFormatter,
  MonitoringSerializer
} from '../../constants';

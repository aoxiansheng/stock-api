/**
 * Monitoring Constants Index Unit Tests
 * 测试监控常量模块的统一导出功能
 */

import {
  // 配置层常量
  MONITORING_KEY_TEMPLATES,
  MONITORING_KEY_PREFIXES,
  MONITORING_KEY_SEPARATORS,
  MONITORING_METRICS,
  MONITORING_METRIC_CATEGORIES,
  MONITORING_METRIC_UNITS,
  MONITORING_METRIC_THRESHOLDS,
  MONITORING_AGGREGATION_TYPES,
  MONITORING_METRIC_PRIORITIES,
  MONITORING_SYSTEM_LIMITS,
  MonitoringSystemLimitUtils,
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
  MONITORING_STATUS_COLORS,
  
  // 状态层常量
  type MonitoringHealthStatus,
  type BasicHealthStatus,
  type ExtendedHealthStatus,
  
  // 消息层常量
  MONITORING_MESSAGE_STATUS_DESCRIPTIONS,
  MONITORING_MESSAGE_TYPES,
  MONITORING_MESSAGE_SEVERITY,
  MonitoringMessageFormatter,
  
  // 工具类
  MonitoringSerializer,
  MonitoringDataSerializer,
  
  // 类型
  type MonitoringKeyTemplate,
  type PerformanceMetricType,
  type MonitoringSystemLimitKeys,
  type MonitoringSystemLimits,
  type MonitoringMessageType,
  type MonitoringMessageSeverity,
} from '@monitoring/constants/index';

describe('MonitoringConstantsIndex', () => {
  describe('Configuration Layer Exports', () => {
    it('should export key templates', () => {
      expect(MONITORING_KEY_TEMPLATES).toBeDefined();
      expect(typeof MONITORING_KEY_TEMPLATES.REQUEST_KEY).toBe('function');
      expect(typeof MONITORING_KEY_TEMPLATES.CACHE_KEY).toBe('function');
    });

    it('should export key prefixes', () => {
      expect(MONITORING_KEY_PREFIXES).toBeDefined();
      expect(MONITORING_KEY_PREFIXES.METRICS).toBe('metrics');
      expect(MONITORING_KEY_PREFIXES.HEALTH).toBe('health');
    });

    it('should export key separators', () => {
      expect(MONITORING_KEY_SEPARATORS).toBeDefined();
      expect(MONITORING_KEY_SEPARATORS.NAMESPACE).toBe(':');
      expect(MONITORING_KEY_SEPARATORS.COMPONENT).toBe('.');
    });

    it('should export metrics constants', () => {
      expect(MONITORING_METRICS).toBeDefined();
      expect(MONITORING_METRICS.RESPONSE_TIME).toBe('response_time');
      expect(MONITORING_METRICS.CPU_USAGE).toBe('cpu_usage');
    });

    it('should export metric categories', () => {
      expect(MONITORING_METRIC_CATEGORIES).toBeDefined();
      expect(Array.isArray(MONITORING_METRIC_CATEGORIES.PERFORMANCE)).toBe(true);
      expect(Array.isArray(MONITORING_METRIC_CATEGORIES.SYSTEM)).toBe(true);
    });

    it('should export metric units', () => {
      expect(MONITORING_METRIC_UNITS).toBeDefined();
      expect(MONITORING_METRIC_UNITS.response_time).toBe('ms');
      expect(MONITORING_METRIC_UNITS.cpu_usage).toBe('%');
    });

    it('should export metric thresholds', () => {
      expect(MONITORING_METRIC_THRESHOLDS).toBeDefined();
      expect(MONITORING_METRIC_THRESHOLDS.response_time).toBeDefined();
      expect(MONITORING_METRIC_THRESHOLDS.cpu_usage).toBeDefined();
    });

    it('should export aggregation types', () => {
      expect(MONITORING_AGGREGATION_TYPES).toBeDefined();
      expect(MONITORING_AGGREGATION_TYPES.MAX).toBe('maximum');
      expect(MONITORING_AGGREGATION_TYPES.MIN).toBe('minimum');
    });

    it('should export metric priorities', () => {
      expect(MONITORING_METRIC_PRIORITIES).toBeDefined();
      expect(MONITORING_METRIC_PRIORITIES.HIGH).toBe(2);
      expect(MONITORING_METRIC_PRIORITIES.MEDIUM).toBe(3);
    });

    it('should export system limits', () => {
      expect(MONITORING_SYSTEM_LIMITS).toBeDefined();
      expect(MONITORING_SYSTEM_LIMITS.HTTP_SUCCESS_THRESHOLD).toBe(400);
      expect(MONITORING_SYSTEM_LIMITS.HTTP_SERVER_ERROR_THRESHOLD).toBe(500);
    });

    it('should export system limit utilities', () => {
      expect(MonitoringSystemLimitUtils).toBeDefined();
      expect(typeof MonitoringSystemLimitUtils.isClientError).toBe('function');
      expect(typeof MonitoringSystemLimitUtils.isServerError).toBe('function');
    });

    it('should export health status constants', () => {
      expect(MONITORING_HEALTH_STATUS).toBeDefined();
      expect(MONITORING_HEALTH_STATUS.HEALTHY).toBe('healthy');
      expect(MONITORING_HEALTH_STATUS.WARNING).toBe('warning');
    });

    it('should export health status arrays', () => {
      expect(Array.isArray(BASIC_HEALTH_STATUS_VALUES)).toBe(true);
      expect(Array.isArray(EXTENDED_HEALTH_STATUS_VALUES)).toBe(true);
      expect(Array.isArray(MONITORING_BASIC_HEALTH_STATUS_VALUES)).toBe(true);
      expect(Array.isArray(MONITORING_EXTENDED_HEALTH_STATUS_VALUES)).toBe(true);
    });

    it('should export health utilities', () => {
      expect(MonitoringHealthUtils).toBeDefined();
      expect(typeof MonitoringHealthUtils.isHealthy).toBe('function');
      expect(typeof MonitoringHealthUtils.isWarning).toBe('function');
    });

    it('should export health status validation functions', () => {
      expect(typeof isValidMonitoringStatus).toBe('function');
      expect(typeof getMonitoringStatusSeverity).toBe('function');
      expect(typeof mapInternalToExternalStatus).toBe('function');
    });

    it('should export status descriptions and colors', () => {
      expect(MONITORING_STATUS_DESCRIPTIONS).toBeDefined();
      expect(MONITORING_STATUS_COLORS).toBeDefined();
      expect(MONITORING_STATUS_DESCRIPTIONS.healthy).toBe('系统运行正常');
      expect(MONITORING_STATUS_COLORS.healthy).toBe('#28a745');
    });
  });

  describe('Status Layer Exports', () => {
    it('should export health status types', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const healthStatus: MonitoringHealthStatus = 'healthy';
      const basicStatus: BasicHealthStatus = 'warning';
      const extendedStatus: ExtendedHealthStatus = 'degraded';
      
      expect(healthStatus).toBe('healthy');
      expect(basicStatus).toBe('warning');
      expect(extendedStatus).toBe('degraded');
    });
  });

  describe('Message Layer Exports', () => {
    it('should export message status descriptions', () => {
      expect(MONITORING_MESSAGE_STATUS_DESCRIPTIONS).toBeDefined();
    });

    it('should export message types', () => {
      expect(MONITORING_MESSAGE_TYPES).toBeDefined();
      expect(MONITORING_MESSAGE_TYPES.OPERATION).toBe('operation');
      expect(MONITORING_MESSAGE_TYPES.ERROR).toBe('error');
    });

    it('should export message severity levels', () => {
      expect(MONITORING_MESSAGE_SEVERITY).toBeDefined();
      expect(MONITORING_MESSAGE_SEVERITY.WARNING).toBe(1);
      expect(MONITORING_MESSAGE_SEVERITY.ERROR).toBe(2);
    });

    it('should export message formatter', () => {
      expect(MonitoringMessageFormatter).toBeDefined();
      expect(typeof MonitoringMessageFormatter.format).toBe('function');
    });
  });

  describe('Utility Exports', () => {
    it('should export monitoring serializers', () => {
      expect(MonitoringSerializer).toBeDefined();
      expect(MonitoringDataSerializer).toBeDefined();
    });
  });

  describe('Type Exports', () => {
    it('should export monitoring key template type', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const template: MonitoringKeyTemplate = MONITORING_KEY_TEMPLATES.REQUEST_KEY;
      expect(typeof template).toBe('function');
    });

    it('should export performance metric type', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const metric: PerformanceMetricType = 'response_time';
      expect(metric).toBe('response_time');
    });

    it('should export system limit types', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const limitKey: MonitoringSystemLimitKeys = 'HTTP_SUCCESS_THRESHOLD';
      const limits: MonitoringSystemLimits = MONITORING_SYSTEM_LIMITS;
      
      expect(limitKey).toBe('HTTP_SUCCESS_THRESHOLD');
      expect(limits).toBe(MONITORING_SYSTEM_LIMITS);
    });

    it('should export message types', () => {
      // This is a compile-time test - if it compiles, the types are correct
      const messageType: MonitoringMessageType = 'operation';
      const messageSeverity: MonitoringMessageSeverity = 1;
      
      expect(messageType).toBe('operation');
      expect(messageSeverity).toBe(1);
    });
  });
});
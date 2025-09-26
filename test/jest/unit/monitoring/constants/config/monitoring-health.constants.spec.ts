import {
  MONITORING_HEALTH_STATUS,
  MonitoringHealthStatus,
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
} from '@monitoring/constants/config/monitoring-health.constants';

describe('MonitoringHealthConstants', () => {
  describe('MONITORING_HEALTH_STATUS', () => {
    it('should define all health status constants', () => {
      expect(MONITORING_HEALTH_STATUS.HEALTHY).toBe('healthy');
      expect(MONITORING_HEALTH_STATUS.WARNING).toBe('warning');
      expect(MONITORING_HEALTH_STATUS.DEGRADED).toBe('degraded');
      expect(MONITORING_HEALTH_STATUS.UNHEALTHY).toBe('unhealthy');
      expect(MONITORING_HEALTH_STATUS.UNKNOWN).toBe('unknown');
    });

    it('should have correct type for MonitoringHealthStatus', () => {
      const status: MonitoringHealthStatus = MONITORING_HEALTH_STATUS.HEALTHY;
      expect(status).toBe('healthy');
    });
  });

  describe('Health Status Arrays', () => {
    it('should define BASIC_HEALTH_STATUS_VALUES with core statuses', () => {
      expect(BASIC_HEALTH_STATUS_VALUES).toEqual([
        'healthy',
        'warning',
        'unhealthy',
      ]);
    });

    it('should define EXTENDED_HEALTH_STATUS_VALUES with all statuses', () => {
      expect(EXTENDED_HEALTH_STATUS_VALUES).toEqual([
        'healthy',
        'warning',
        'degraded',
        'unhealthy',
        'unknown',
      ]);
    });

    it('should define MONITORING_BASIC_HEALTH_STATUS_VALUES as alias for BASIC_HEALTH_STATUS_VALUES', () => {
      expect(MONITORING_BASIC_HEALTH_STATUS_VALUES).toBe(BASIC_HEALTH_STATUS_VALUES);
    });

    it('should define MONITORING_EXTENDED_HEALTH_STATUS_VALUES as alias for EXTENDED_HEALTH_STATUS_VALUES', () => {
      expect(MONITORING_EXTENDED_HEALTH_STATUS_VALUES).toBe(EXTENDED_HEALTH_STATUS_VALUES);
    });
  });

  describe('MonitoringHealthUtils', () => {
    it('should correctly identify healthy status', () => {
      expect(MonitoringHealthUtils.isHealthy('healthy')).toBe(true);
      expect(MonitoringHealthUtils.isHealthy('warning')).toBe(false);
    });

    it('should correctly identify warning status', () => {
      expect(MonitoringHealthUtils.isWarning('warning')).toBe(true);
      expect(MonitoringHealthUtils.isWarning('healthy')).toBe(false);
    });

    it('should correctly identify degraded status', () => {
      expect(MonitoringHealthUtils.isDegraded('degraded')).toBe(true);
      expect(MonitoringHealthUtils.isDegraded('healthy')).toBe(false);
    });

    it('should correctly identify unhealthy status', () => {
      expect(MonitoringHealthUtils.isUnhealthy('unhealthy')).toBe(true);
      expect(MonitoringHealthUtils.isUnhealthy('healthy')).toBe(false);
    });

    it('should correctly identify unknown status', () => {
      expect(MonitoringHealthUtils.isUnknown('unknown')).toBe(true);
      expect(MonitoringHealthUtils.isUnknown('healthy')).toBe(false);
    });

    it('should correctly determine if system is operational', () => {
      expect(MonitoringHealthUtils.isOperational('healthy')).toBe(true);
      expect(MonitoringHealthUtils.isOperational('warning')).toBe(true);
      expect(MonitoringHealthUtils.isOperational('degraded')).toBe(true);
      expect(MonitoringHealthUtils.isOperational('unknown')).toBe(true);
      expect(MonitoringHealthUtils.isOperational('unhealthy')).toBe(false);
    });

    it('should correctly determine if status needs attention', () => {
      expect(MonitoringHealthUtils.needsAttention('healthy')).toBe(false);
      expect(MonitoringHealthUtils.needsAttention('warning')).toBe(true);
      expect(MonitoringHealthUtils.needsAttention('degraded')).toBe(true);
      expect(MonitoringHealthUtils.needsAttention('unhealthy')).toBe(true);
      expect(MonitoringHealthUtils.needsAttention('unknown')).toBe(true);
    });
  });

  describe('isValidMonitoringStatus', () => {
    it('should validate correct monitoring status values', () => {
      expect(isValidMonitoringStatus('healthy')).toBe(true);
      expect(isValidMonitoringStatus('warning')).toBe(true);
      expect(isValidMonitoringStatus('degraded')).toBe(true);
      expect(isValidMonitoringStatus('unhealthy')).toBe(true);
      expect(isValidMonitoringStatus('unknown')).toBe(true);
    });

    it('should reject invalid monitoring status values', () => {
      expect(isValidMonitoringStatus('invalid')).toBe(false);
      expect(isValidMonitoringStatus(null)).toBe(false);
      expect(isValidMonitoringStatus(undefined)).toBe(false);
      expect(isValidMonitoringStatus(123)).toBe(false);
    });
  });

  describe('getMonitoringStatusSeverity', () => {
    it('should return correct severity scores for each status', () => {
      expect(getMonitoringStatusSeverity('healthy')).toBe(0);
      expect(getMonitoringStatusSeverity('warning')).toBe(1);
      expect(getMonitoringStatusSeverity('degraded')).toBe(2);
      expect(getMonitoringStatusSeverity('unhealthy')).toBe(3);
      expect(getMonitoringStatusSeverity('unknown')).toBe(2);
    });

    it('should return highest severity for unknown status types', () => {
      // @ts-ignore - Testing invalid input
      expect(getMonitoringStatusSeverity('invalid')).toBe(3);
    });
  });

  describe('mapInternalToExternalStatus', () => {
    it('should map internal status to external status strings', () => {
      expect(mapInternalToExternalStatus('healthy')).toBe('healthy');
      expect(mapInternalToExternalStatus('warning')).toBe('warning');
      expect(mapInternalToExternalStatus('degraded')).toBe('degraded');
      expect(mapInternalToExternalStatus('unhealthy')).toBe('unhealthy');
      expect(mapInternalToExternalStatus('unknown')).toBe('unknown');
    });

    it('should map unknown status to "unknown"', () => {
      // @ts-ignore - Testing invalid input
      expect(mapInternalToExternalStatus('invalid')).toBe('unknown');
    });
  });

  describe('MONITORING_STATUS_DESCRIPTIONS', () => {
    it('should define descriptions for all status values', () => {
      expect(MONITORING_STATUS_DESCRIPTIONS.healthy).toBe('系统运行正常');
      expect(MONITORING_STATUS_DESCRIPTIONS.warning).toBe('系统存在警告，需要关注');
      expect(MONITORING_STATUS_DESCRIPTIONS.degraded).toBe('系统功能降级，性能受影响');
      expect(MONITORING_STATUS_DESCRIPTIONS.unhealthy).toBe('系统出现严重问题，需要立即处理');
      expect(MONITORING_STATUS_DESCRIPTIONS.unknown).toBe('无法确定系统状态，监控数据不足');
    });
  });

  describe('MONITORING_STATUS_COLORS', () => {
    it('should define colors for all status values', () => {
      expect(MONITORING_STATUS_COLORS.healthy).toBe('#28a745');
      expect(MONITORING_STATUS_COLORS.warning).toBe('#ffc107');
      expect(MONITORING_STATUS_COLORS.degraded).toBe('#fd7e14');
      expect(MONITORING_STATUS_COLORS.unhealthy).toBe('#dc3545');
      expect(MONITORING_STATUS_COLORS.unknown).toBe('#6c757d');
    });
  });
});
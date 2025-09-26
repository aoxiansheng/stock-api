import {
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
  MonitoringHealthStatus,
} from '@monitoring/constants/status/monitoring-status.constants';

describe('MonitoringStatusConstants', () => {
  describe('MONITORING_HEALTH_STATUS Constants', () => {
    it('should have correct status values', () => {
      expect(MONITORING_HEALTH_STATUS.HEALTHY).toBe('healthy');
      expect(MONITORING_HEALTH_STATUS.WARNING).toBe('warning');
      expect(MONITORING_HEALTH_STATUS.DEGRADED).toBe('degraded');
      expect(MONITORING_HEALTH_STATUS.UNHEALTHY).toBe('unhealthy');
      expect(MONITORING_HEALTH_STATUS.UNKNOWN).toBe('unknown');
    });

    it('should be readonly constants', () => {
      expect(Object.isFrozen(MONITORING_HEALTH_STATUS)).toBe(true);
    });
  });

  describe('Status Arrays', () => {
    it('should have correct basic health status values', () => {
      expect(BASIC_HEALTH_STATUS_VALUES).toEqual([
        'healthy',
        'warning',
        'unhealthy'
      ]);
      expect(BASIC_HEALTH_STATUS_VALUES).toHaveLength(3);
    });

    it('should have correct extended health status values', () => {
      expect(EXTENDED_HEALTH_STATUS_VALUES).toEqual([
        'healthy',
        'warning',
        'degraded',
        'unhealthy',
        'unknown'
      ]);
      expect(EXTENDED_HEALTH_STATUS_VALUES).toHaveLength(5);
    });

    it('should have monitoring-specific arrays equal to base arrays', () => {
      expect(MONITORING_BASIC_HEALTH_STATUS_VALUES).toEqual(BASIC_HEALTH_STATUS_VALUES);
      expect(MONITORING_EXTENDED_HEALTH_STATUS_VALUES).toEqual(EXTENDED_HEALTH_STATUS_VALUES);
    });
  });

  describe('MonitoringHealthUtils', () => {
    it('should correctly identify healthy status', () => {
      expect(MonitoringHealthUtils.isHealthy('healthy')).toBe(true);
      expect(MonitoringHealthUtils.isHealthy('warning')).toBe(false);
      expect(MonitoringHealthUtils.isHealthy('unhealthy')).toBe(false);
    });

    it('should correctly identify warning status', () => {
      expect(MonitoringHealthUtils.isWarning('warning')).toBe(true);
      expect(MonitoringHealthUtils.isWarning('healthy')).toBe(false);
      expect(MonitoringHealthUtils.isWarning('degraded')).toBe(false);
    });

    it('should correctly identify degraded status', () => {
      expect(MonitoringHealthUtils.isDegraded('degraded')).toBe(true);
      expect(MonitoringHealthUtils.isDegraded('warning')).toBe(false);
      expect(MonitoringHealthUtils.isDegraded('unhealthy')).toBe(false);
    });

    it('should correctly identify unhealthy status', () => {
      expect(MonitoringHealthUtils.isUnhealthy('unhealthy')).toBe(true);
      expect(MonitoringHealthUtils.isUnhealthy('healthy')).toBe(false);
      expect(MonitoringHealthUtils.isUnhealthy('degraded')).toBe(false);
    });

    it('should correctly identify unknown status', () => {
      expect(MonitoringHealthUtils.isUnknown('unknown')).toBe(true);
      expect(MonitoringHealthUtils.isUnknown('healthy')).toBe(false);
      expect(MonitoringHealthUtils.isUnknown('warning')).toBe(false);
    });

    it('should correctly determine operational status', () => {
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
    it('should validate correct status values', () => {
      expect(isValidMonitoringStatus('healthy')).toBe(true);
      expect(isValidMonitoringStatus('warning')).toBe(true);
      expect(isValidMonitoringStatus('degraded')).toBe(true);
      expect(isValidMonitoringStatus('unhealthy')).toBe(true);
      expect(isValidMonitoringStatus('unknown')).toBe(true);
    });

    it('should reject invalid status values', () => {
      expect(isValidMonitoringStatus('invalid')).toBe(false);
      expect(isValidMonitoringStatus('')).toBe(false);
      expect(isValidMonitoringStatus(null)).toBe(false);
      expect(isValidMonitoringStatus(undefined)).toBe(false);
      expect(isValidMonitoringStatus(123)).toBe(false);
      expect(isValidMonitoringStatus({})).toBe(false);
    });
  });

  describe('getMonitoringStatusSeverity', () => {
    it('should return correct severity scores', () => {
      expect(getMonitoringStatusSeverity('healthy')).toBe(0);
      expect(getMonitoringStatusSeverity('warning')).toBe(1);
      expect(getMonitoringStatusSeverity('degraded')).toBe(2);
      expect(getMonitoringStatusSeverity('unhealthy')).toBe(3);
      expect(getMonitoringStatusSeverity('unknown')).toBe(2);
    });

    it('should handle invalid status with highest severity', () => {
      // @ts-ignore - Testing invalid inputs
      expect(getMonitoringStatusSeverity('invalid')).toBe(3);
      // @ts-ignore - Testing invalid inputs
      expect(getMonitoringStatusSeverity('')).toBe(3);
    });
  });

  describe('mapInternalToExternalStatus', () => {
    it('should map all statuses correctly', () => {
      expect(mapInternalToExternalStatus('healthy')).toBe('healthy');
      expect(mapInternalToExternalStatus('warning')).toBe('warning');
      expect(mapInternalToExternalStatus('degraded')).toBe('degraded');
      expect(mapInternalToExternalStatus('unhealthy')).toBe('unhealthy');
      expect(mapInternalToExternalStatus('unknown')).toBe('unknown');
    });

    it('should handle invalid status with unknown default', () => {
      // @ts-ignore - Testing invalid inputs
      expect(mapInternalToExternalStatus('invalid')).toBe('unknown');
      // @ts-ignore - Testing invalid inputs
      expect(mapInternalToExternalStatus('')).toBe('unknown');
    });
  });

  describe('MONITORING_STATUS_DESCRIPTIONS', () => {
    it('should have descriptions for all status values', () => {
      expect(MONITORING_STATUS_DESCRIPTIONS['healthy']).toBe('系统运行正常');
      expect(MONITORING_STATUS_DESCRIPTIONS['warning']).toBe('系统存在警告，需要关注');
      expect(MONITORING_STATUS_DESCRIPTIONS['degraded']).toBe('系统功能降级，性能受影响');
      expect(MONITORING_STATUS_DESCRIPTIONS['unhealthy']).toBe('系统出现严重问题，需要立即处理');
      expect(MONITORING_STATUS_DESCRIPTIONS['unknown']).toBe('无法确定系统状态，监控数据不足');
    });

    it('should be readonly', () => {
      expect(Object.isFrozen(MONITORING_STATUS_DESCRIPTIONS)).toBe(true);
    });
  });

  describe('MONITORING_STATUS_COLORS', () => {
    it('should have colors for all status values', () => {
      expect(MONITORING_STATUS_COLORS['healthy']).toBe('#28a745');
      expect(MONITORING_STATUS_COLORS['warning']).toBe('#ffc107');
      expect(MONITORING_STATUS_COLORS['degraded']).toBe('#fd7e14');
      expect(MONITORING_STATUS_COLORS['unhealthy']).toBe('#dc3545');
      expect(MONITORING_STATUS_COLORS['unknown']).toBe('#6c757d');
    });

    it('should be readonly', () => {
      expect(Object.isFrozen(MONITORING_STATUS_COLORS)).toBe(true);
    });

    it('should have valid hex color format', () => {
      const hexColorPattern = /^#[0-9a-f]{6}$/i;
      Object.values(MONITORING_STATUS_COLORS).forEach(color => {
        expect(color).toMatch(hexColorPattern);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work with utility functions using status constants', () => {
      const status = MONITORING_HEALTH_STATUS.WARNING;
      expect(isValidMonitoringStatus(status)).toBe(true);
      expect(getMonitoringStatusSeverity(status)).toBe(1);
      expect(mapInternalToExternalStatus(status)).toBe('warning');
      expect(MonitoringHealthUtils.isWarning(status)).toBe(true);
      expect(MonitoringHealthUtils.needsAttention(status)).toBe(true);
    });

    it('should maintain consistency across all arrays and constants', () => {
      EXTENDED_HEALTH_STATUS_VALUES.forEach(status => {
        expect(isValidMonitoringStatus(status)).toBe(true);
        expect(MONITORING_STATUS_DESCRIPTIONS[status]).toBeDefined();
        expect(MONITORING_STATUS_COLORS[status]).toBeDefined();
        expect(typeof getMonitoringStatusSeverity(status)).toBe('number');
        expect(typeof mapInternalToExternalStatus(status)).toBe('string');
      });
    });
  });

  describe('Comprehensive Coverage Tests', () => {
    it('should test all exported constants', () => {
      expect(MONITORING_HEALTH_STATUS).toBeDefined();
      expect(BASIC_HEALTH_STATUS_VALUES).toBeDefined();
      expect(EXTENDED_HEALTH_STATUS_VALUES).toBeDefined();
      expect(MONITORING_BASIC_HEALTH_STATUS_VALUES).toBeDefined();
      expect(MONITORING_EXTENDED_HEALTH_STATUS_VALUES).toBeDefined();
      expect(MonitoringHealthUtils).toBeDefined();
      expect(MONITORING_STATUS_DESCRIPTIONS).toBeDefined();
      expect(MONITORING_STATUS_COLORS).toBeDefined();
    });

    it('should test all exported functions', () => {
      expect(typeof isValidMonitoringStatus).toBe('function');
      expect(typeof getMonitoringStatusSeverity).toBe('function');
      expect(typeof mapInternalToExternalStatus).toBe('function');
    });

    it('should test all utility functions', () => {
      expect(typeof MonitoringHealthUtils.isHealthy).toBe('function');
      expect(typeof MonitoringHealthUtils.isWarning).toBe('function');
      expect(typeof MonitoringHealthUtils.isDegraded).toBe('function');
      expect(typeof MonitoringHealthUtils.isUnhealthy).toBe('function');
      expect(typeof MonitoringHealthUtils.isUnknown).toBe('function');
      expect(typeof MonitoringHealthUtils.isOperational).toBe('function');
      expect(typeof MonitoringHealthUtils.needsAttention).toBe('function');
    });

    it('should cover edge cases for validation', () => {
      expect(isValidMonitoringStatus(null)).toBe(false);
      expect(isValidMonitoringStatus(undefined)).toBe(false);
      expect(isValidMonitoringStatus(0)).toBe(false);
      expect(isValidMonitoringStatus([])).toBe(false);
    });

    it('should cover all status color values', () => {
      const allColors = Object.values(MONITORING_STATUS_COLORS);
      expect(allColors).toHaveLength(5);
      allColors.forEach(color => {
        expect(typeof color).toBe('string');
        expect(color.startsWith('#')).toBe(true);
      });
    });

    it('should cover all status descriptions', () => {
      const allDescriptions = Object.values(MONITORING_STATUS_DESCRIPTIONS);
      expect(allDescriptions).toHaveLength(5);
      allDescriptions.forEach(description => {
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });
    });
  });
});
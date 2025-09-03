/**
 * 监控状态常量测试
 * 🎯 验证状态常量复用架构的正确性和类型安全性
 */

import {
  BasicHealthStatus,
  ExtendedHealthStatus,
  BASIC_HEALTH_STATUS_VALUES,
  EXTENDED_HEALTH_STATUS_VALUES,
  MONITORING_HEALTH_STATUS,
  MONITORING_BASIC_HEALTH_STATUS_VALUES,
  MONITORING_EXTENDED_HEALTH_STATUS_VALUES,
  mapInternalToExternalStatus,
  isValidMonitoringStatus,
  getMonitoringStatusSeverity
} from '../../../../../../src/monitoring/constants/status/monitoring-status.constants';

import {
  CACHE_STATUS,
  BASIC_HEALTH_STATUS_VALUES as CACHE_BASIC_VALUES,
  EXTENDED_HEALTH_STATUS_VALUES as CACHE_EXTENDED_VALUES
} from '../../../../../../src/cache/constants/status/health-status.constants';

describe('MonitoringStatusConstants', () => {
  describe('类型复用验证', () => {
    it('应该正确复用缓存模块的健康状态类型', () => {
      expect(MONITORING_HEALTH_STATUS).toEqual(CACHE_STATUS);
      expect(MONITORING_BASIC_HEALTH_STATUS_VALUES).toEqual(CACHE_BASIC_VALUES);
      expect(MONITORING_EXTENDED_HEALTH_STATUS_VALUES).toEqual(CACHE_EXTENDED_VALUES);
    });

    it('应该包含所有基础健康状态值', () => {
      const expectedBasicValues = [
        CACHE_STATUS.HEALTHY,
        CACHE_STATUS.WARNING,
        CACHE_STATUS.UNHEALTHY
      ];
      
      expect(BASIC_HEALTH_STATUS_VALUES).toEqual(expectedBasicValues);
      expect(MONITORING_BASIC_HEALTH_STATUS_VALUES).toEqual(expectedBasicValues);
    });

    it('应该包含所有扩展健康状态值', () => {
      const expectedExtendedValues = [
        CACHE_STATUS.HEALTHY,
        CACHE_STATUS.WARNING,
        CACHE_STATUS.UNHEALTHY,
        CACHE_STATUS.CONNECTED,
        CACHE_STATUS.DISCONNECTED,
        CACHE_STATUS.DEGRADED
      ];
      
      expect(EXTENDED_HEALTH_STATUS_VALUES).toEqual(expectedExtendedValues);
      expect(MONITORING_EXTENDED_HEALTH_STATUS_VALUES).toEqual(expectedExtendedValues);
    });
  });

  describe('状态映射函数', () => {
    it('应该将HEALTHY和CONNECTED映射到HEALTHY', () => {
      expect(mapInternalToExternalStatus(CACHE_STATUS.HEALTHY)).toBe(CACHE_STATUS.HEALTHY);
      expect(mapInternalToExternalStatus(CACHE_STATUS.CONNECTED)).toBe(CACHE_STATUS.HEALTHY);
    });

    it('应该将WARNING和DEGRADED映射到WARNING', () => {
      expect(mapInternalToExternalStatus(CACHE_STATUS.WARNING)).toBe(CACHE_STATUS.WARNING);
      expect(mapInternalToExternalStatus(CACHE_STATUS.DEGRADED)).toBe(CACHE_STATUS.WARNING);
    });

    it('应该将UNHEALTHY和DISCONNECTED映射到UNHEALTHY', () => {
      expect(mapInternalToExternalStatus(CACHE_STATUS.UNHEALTHY)).toBe(CACHE_STATUS.UNHEALTHY);
      expect(mapInternalToExternalStatus(CACHE_STATUS.DISCONNECTED)).toBe(CACHE_STATUS.UNHEALTHY);
    });

    it('应该为未知状态返回UNHEALTHY', () => {
      const unknownStatus = 'unknown' as any;
      expect(mapInternalToExternalStatus(unknownStatus)).toBe(CACHE_STATUS.UNHEALTHY);
    });
  });

  describe('监控状态验证函数', () => {
    it('应该验证有效的基础健康状态', () => {
      expect(isValidMonitoringStatus(CACHE_STATUS.HEALTHY)).toBe(true);
      expect(isValidMonitoringStatus(CACHE_STATUS.WARNING)).toBe(true);
      expect(isValidMonitoringStatus(CACHE_STATUS.UNHEALTHY)).toBe(true);
    });

    it('应该拒绝无效的健康状态', () => {
      expect(isValidMonitoringStatus('invalid')).toBe(false);
      expect(isValidMonitoringStatus(null)).toBe(false);
      expect(isValidMonitoringStatus(undefined)).toBe(false);
      expect(isValidMonitoringStatus(123)).toBe(false);
      expect(isValidMonitoringStatus({})).toBe(false);
    });

    it('应该拒绝扩展状态值（仅在基础验证中）', () => {
      expect(isValidMonitoringStatus(CACHE_STATUS.CONNECTED)).toBe(false);
      expect(isValidMonitoringStatus(CACHE_STATUS.DISCONNECTED)).toBe(false);
      expect(isValidMonitoringStatus(CACHE_STATUS.DEGRADED)).toBe(false);
    });
  });

  describe('监控状态严重性评分', () => {
    it('应该为HEALTHY返回0（正常）', () => {
      expect(getMonitoringStatusSeverity(CACHE_STATUS.HEALTHY)).toBe(0);
    });

    it('应该为WARNING返回1（警告）', () => {
      expect(getMonitoringStatusSeverity(CACHE_STATUS.WARNING)).toBe(1);
    });

    it('应该为UNHEALTHY返回2（严重）', () => {
      expect(getMonitoringStatusSeverity(CACHE_STATUS.UNHEALTHY)).toBe(2);
    });

    it('应该为未知状态返回2（视为严重）', () => {
      const unknownStatus = 'unknown' as any;
      expect(getMonitoringStatusSeverity(unknownStatus)).toBe(2);
    });

    it('应该按严重程度正确排序', () => {
      const healthySeverity = getMonitoringStatusSeverity(CACHE_STATUS.HEALTHY);
      const warningSeverity = getMonitoringStatusSeverity(CACHE_STATUS.WARNING);
      const unhealthySeverity = getMonitoringStatusSeverity(CACHE_STATUS.UNHEALTHY);

      expect(healthySeverity).toBeLessThan(warningSeverity);
      expect(warningSeverity).toBeLessThan(unhealthySeverity);
    });
  });

  describe('类型一致性验证', () => {
    it('BasicHealthStatus类型应该与缓存模块一致', () => {
      const basicStatus: BasicHealthStatus = CACHE_STATUS.HEALTHY;
      expect(typeof basicStatus).toBe('string');
      expect(BASIC_HEALTH_STATUS_VALUES).toContain(basicStatus);
    });

    it('ExtendedHealthStatus类型应该与缓存模块一致', () => {
      const extendedStatus: ExtendedHealthStatus = CACHE_STATUS.CONNECTED;
      expect(typeof extendedStatus).toBe('string');
      expect(EXTENDED_HEALTH_STATUS_VALUES).toContain(extendedStatus);
    });
  });

  describe('常量不可变性验证', () => {
    it('健康状态常量应该是不可变的', () => {
      expect(Object.isFrozen(MONITORING_HEALTH_STATUS)).toBe(true);
    });

    it('状态值数组应该是不可变的', () => {
      const originalLength = BASIC_HEALTH_STATUS_VALUES.length;
      
      expect(() => {
        (BASIC_HEALTH_STATUS_VALUES as any).push('new_status');
      }).toThrow();
      
      expect(BASIC_HEALTH_STATUS_VALUES.length).toBe(originalLength);
    });

    it('扩展状态值数组应该是不可变的', () => {
      const originalLength = EXTENDED_HEALTH_STATUS_VALUES.length;
      
      expect(() => {
        (EXTENDED_HEALTH_STATUS_VALUES as any).push('new_status');
      }).toThrow();
      
      expect(EXTENDED_HEALTH_STATUS_VALUES.length).toBe(originalLength);
    });
  });

  describe('边界情况测试', () => {
    it('应该正确处理空字符串', () => {
      expect(isValidMonitoringStatus('')).toBe(false);
      expect(getMonitoringStatusSeverity('' as any)).toBe(2);
    });

    it('应该正确处理Unicode字符串', () => {
      expect(isValidMonitoringStatus('健康')).toBe(false);
      expect(isValidMonitoringStatus('🟢')).toBe(false);
    });

    it('应该正确处理大小写敏感性', () => {
      expect(isValidMonitoringStatus('HEALTHY')).toBe(false);
      expect(isValidMonitoringStatus('Healthy')).toBe(false);
      expect(isValidMonitoringStatus('healthy')).toBe(true);
    });
  });

  describe('性能测试', () => {
    it('验证函数应该快速执行', () => {
      const start = Date.now();
      
      for (let i = 0; i < 10000; i++) {
        isValidMonitoringStatus(CACHE_STATUS.HEALTHY);
        getMonitoringStatusSeverity(CACHE_STATUS.HEALTHY);
        mapInternalToExternalStatus(CACHE_STATUS.CONNECTED);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });

    it('状态数组查找应该高效', () => {
      const start = Date.now();
      
      for (let i = 0; i < 10000; i++) {
        BASIC_HEALTH_STATUS_VALUES.includes(CACHE_STATUS.HEALTHY);
        EXTENDED_HEALTH_STATUS_VALUES.includes(CACHE_STATUS.CONNECTED);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50); // 数组查找应该很快
    });
  });

  describe('文档符合性验证', () => {
    it('应该有正确的常量数量', () => {
      expect(BASIC_HEALTH_STATUS_VALUES.length).toBe(3);
      expect(EXTENDED_HEALTH_STATUS_VALUES.length).toBe(6);
      expect(Object.keys(MONITORING_HEALTH_STATUS).length).toBe(6);
    });

    it('应该有正确的状态严重性级别', () => {
      const severityLevels = [
        getMonitoringStatusSeverity(CACHE_STATUS.HEALTHY),
        getMonitoringStatusSeverity(CACHE_STATUS.WARNING),
        getMonitoringStatusSeverity(CACHE_STATUS.UNHEALTHY)
      ];
      
      expect(new Set(severityLevels).size).toBe(3); // 应该有3个不同的严重性级别
      expect(Math.max(...severityLevels)).toBe(2);
      expect(Math.min(...severityLevels)).toBe(0);
    });
  });
});
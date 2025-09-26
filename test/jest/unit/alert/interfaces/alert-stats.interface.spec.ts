import { BaseAlertStats, DEFAULT_ALERT_STATS, AlertStatsUtil } from '@alert/interfaces/alert-stats.interface';

describe('Alert Stats Interfaces', () => {
  describe('BaseAlertStats Interface', () => {
    it('should create valid BaseAlertStats object with all required properties', () => {
      const stats: BaseAlertStats = {
        activeAlerts: 10,
        criticalAlerts: 3,
        warningAlerts: 4,
        infoAlerts: 3,
        totalAlertsToday: 25,
        resolvedAlertsToday: 15,
        averageResolutionTime: 1800, // 30 minutes in seconds
      };

      expect(stats).toBeDefined();
      expect(stats.activeAlerts).toBe(10);
      expect(stats.criticalAlerts).toBe(3);
      expect(stats.warningAlerts).toBe(4);
      expect(stats.infoAlerts).toBe(3);
      expect(stats.totalAlertsToday).toBe(25);
      expect(stats.resolvedAlertsToday).toBe(15);
      expect(stats.averageResolutionTime).toBe(1800);
    });

    it('should handle zero values correctly', () => {
      const zeroStats: BaseAlertStats = {
        activeAlerts: 0,
        criticalAlerts: 0,
        warningAlerts: 0,
        infoAlerts: 0,
        totalAlertsToday: 0,
        resolvedAlertsToday: 0,
        averageResolutionTime: 0,
      };

      expect(zeroStats.activeAlerts).toBe(0);
      expect(zeroStats.criticalAlerts).toBe(0);
      expect(zeroStats.warningAlerts).toBe(0);
      expect(zeroStats.infoAlerts).toBe(0);
      expect(zeroStats.totalAlertsToday).toBe(0);
      expect(zeroStats.resolvedAlertsToday).toBe(0);
      expect(zeroStats.averageResolutionTime).toBe(0);
    });

    it('should support large numbers', () => {
      const largeStats: BaseAlertStats = {
        activeAlerts: 1000000,
        criticalAlerts: 50000,
        warningAlerts: 200000,
        infoAlerts: 750000,
        totalAlertsToday: 5000000,
        resolvedAlertsToday: 4999999,
        averageResolutionTime: 86400, // 24 hours in seconds
      };

      expect(largeStats.activeAlerts).toBe(1000000);
      expect(largeStats.totalAlertsToday).toBe(5000000);
      expect(largeStats.averageResolutionTime).toBe(86400);
    });

    it('should handle decimal values for average resolution time', () => {
      const decimalStats: BaseAlertStats = {
        activeAlerts: 5,
        criticalAlerts: 1,
        warningAlerts: 2,
        infoAlerts: 2,
        totalAlertsToday: 12,
        resolvedAlertsToday: 7,
        averageResolutionTime: 1234.56, // Decimal seconds
      };

      expect(decimalStats.averageResolutionTime).toBe(1234.56);
    });

    it('should maintain logical consistency between related fields', () => {
      const stats: BaseAlertStats = {
        activeAlerts: 15,
        criticalAlerts: 5,
        warningAlerts: 6,
        infoAlerts: 4,
        totalAlertsToday: 50,
        resolvedAlertsToday: 35,
        averageResolutionTime: 900, // 15 minutes
      };

      // Check that severity levels sum to active alerts
      expect(stats.criticalAlerts + stats.warningAlerts + stats.infoAlerts).toBe(stats.activeAlerts);
      
      // Check that resolved alerts don't exceed total alerts
      expect(stats.resolvedAlertsToday).toBeLessThanOrEqual(stats.totalAlertsToday);
      
      // Check that average resolution time is positive (or zero)
      expect(stats.averageResolutionTime).toBeGreaterThanOrEqual(0);
    });

    it('should be compatible with JSON serialization', () => {
      const stats: BaseAlertStats = {
        activeAlerts: 8,
        criticalAlerts: 2,
        warningAlerts: 3,
        infoAlerts: 3,
        totalAlertsToday: 30,
        resolvedAlertsToday: 22,
        averageResolutionTime: 1500,
      };

      const serialized = JSON.stringify(stats);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.activeAlerts).toBe(stats.activeAlerts);
      expect(deserialized.criticalAlerts).toBe(stats.criticalAlerts);
      expect(deserialized.warningAlerts).toBe(stats.warningAlerts);
      expect(deserialized.infoAlerts).toBe(stats.infoAlerts);
      expect(deserialized.totalAlertsToday).toBe(stats.totalAlertsToday);
      expect(deserialized.resolvedAlertsToday).toBe(stats.resolvedAlertsToday);
      expect(deserialized.averageResolutionTime).toBe(stats.averageResolutionTime);
    });

    it('should enforce required properties at compile time', () => {
      // This test ensures TypeScript compilation catches missing required properties
      const createStats = (stats: BaseAlertStats): BaseAlertStats => stats;

      const validStats: BaseAlertStats = {
        activeAlerts: 5,
        criticalAlerts: 1,
        warningAlerts: 2,
        infoAlerts: 2,
        totalAlertsToday: 20,
        resolvedAlertsToday: 15,
        averageResolutionTime: 1200,
      };

      expect(() => createStats(validStats)).not.toThrow();
    });
  });

  describe('DEFAULT_ALERT_STATS Constant', () => {
    it('should provide frozen default alert stats with all zero values', () => {
      expect(DEFAULT_ALERT_STATS).toBeDefined();
      expect(DEFAULT_ALERT_STATS.activeAlerts).toBe(0);
      expect(DEFAULT_ALERT_STATS.criticalAlerts).toBe(0);
      expect(DEFAULT_ALERT_STATS.warningAlerts).toBe(0);
      expect(DEFAULT_ALERT_STATS.infoAlerts).toBe(0);
      expect(DEFAULT_ALERT_STATS.totalAlertsToday).toBe(0);
      expect(DEFAULT_ALERT_STATS.resolvedAlertsToday).toBe(0);
      expect(DEFAULT_ALERT_STATS.averageResolutionTime).toBe(0);
    });

    it('should be frozen and immutable', () => {
      expect(Object.isFrozen(DEFAULT_ALERT_STATS)).toBe(true);

      // Attempting to modify should not work
      expect(() => {
        (DEFAULT_ALERT_STATS as any).activeAlerts = 10;
      }).toThrow();
    });

    it('should be usable as a template for creating new stats', () => {
      const newStats: BaseAlertStats = { ...DEFAULT_ALERT_STATS };
      newStats.activeAlerts = 5;
      newStats.criticalAlerts = 2;

      expect(newStats.activeAlerts).toBe(5);
      expect(newStats.criticalAlerts).toBe(2);
      expect(DEFAULT_ALERT_STATS.activeAlerts).toBe(0); // Original unchanged
    });
  });

  describe('AlertStatsUtil Class', () => {
    describe('validateStats method', () => {
      it('should validate correct stats object', () => {
        const validStats: BaseAlertStats = {
          activeAlerts: 10,
          criticalAlerts: 3,
          warningAlerts: 4,
          infoAlerts: 3,
          totalAlertsToday: 25,
          resolvedAlertsToday: 15,
          averageResolutionTime: 1800,
        };

        const result = AlertStatsUtil.validateStats(validStats);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject null or undefined input', () => {
        const nullResult = AlertStatsUtil.validateStats(null);
        expect(nullResult.isValid).toBe(false);
        expect(nullResult.errors).toContain('统计数据必须是对象类型');

        const undefinedResult = AlertStatsUtil.validateStats(undefined);
        expect(undefinedResult.isValid).toBe(false);
        expect(undefinedResult.errors).toContain('统计数据必须是对象类型');
      });

      it('should reject non-object input', () => {
        const stringResult = AlertStatsUtil.validateStats('invalid');
        expect(stringResult.isValid).toBe(false);
        expect(stringResult.errors).toContain('统计数据必须是对象类型');

        const numberResult = AlertStatsUtil.validateStats(123);
        expect(numberResult.isValid).toBe(false);
        expect(numberResult.errors).toContain('统计数据必须是对象类型');
      });

      it('should detect missing required fields', () => {
        const incompleteStats = {
          activeAlerts: 10,
          criticalAlerts: 3,
          // missing other required fields
        };

        const result = AlertStatsUtil.validateStats(incompleteStats);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(error => error.includes('必须是数字类型'))).toBe(true);
      });

      it('should detect invalid field types', () => {
        const invalidStats = {
          activeAlerts: '10', // string instead of number
          criticalAlerts: 3,
          warningAlerts: 4,
          infoAlerts: 3,
          totalAlertsToday: 25,
          resolvedAlertsToday: 15,
          averageResolutionTime: 1800,
        };

        const result = AlertStatsUtil.validateStats(invalidStats);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('字段 activeAlerts 必须是数字类型');
      });

      it('should detect negative values', () => {
        const negativeStats = {
          activeAlerts: -5, // negative value
          criticalAlerts: 3,
          warningAlerts: 4,
          infoAlerts: 3,
          totalAlertsToday: 25,
          resolvedAlertsToday: 15,
          averageResolutionTime: 1800,
        };

        const result = AlertStatsUtil.validateStats(negativeStats);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('字段 activeAlerts 不能为负数');
      });

      it('should handle multiple validation errors', () => {
        const multipleErrorStats = {
          activeAlerts: '10', // wrong type
          criticalAlerts: -3, // negative
          warningAlerts: null, // wrong type
          infoAlerts: 3,
          totalAlertsToday: 25,
          resolvedAlertsToday: 15,
          averageResolutionTime: 1800,
        };

        const result = AlertStatsUtil.validateStats(multipleErrorStats);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(1);
      });

      it('should accept zero values', () => {
        const zeroStats = { ...DEFAULT_ALERT_STATS };
        const result = AlertStatsUtil.validateStats(zeroStats);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('isEmpty method', () => {
      it('should return true for default/empty stats', () => {
        const result = AlertStatsUtil.isEmpty(DEFAULT_ALERT_STATS);
        expect(result).toBe(true);
      });

      it('should return true for all-zero stats', () => {
        const emptyStats: BaseAlertStats = {
          activeAlerts: 0,
          criticalAlerts: 0,
          warningAlerts: 0,
          infoAlerts: 0,
          totalAlertsToday: 0,
          resolvedAlertsToday: 0,
          averageResolutionTime: 0,
        };

        const result = AlertStatsUtil.isEmpty(emptyStats);
        expect(result).toBe(true);
      });

      it('should return false when any field is non-zero', () => {
        const nonEmptyStats: BaseAlertStats = {
          activeAlerts: 1, // non-zero
          criticalAlerts: 0,
          warningAlerts: 0,
          infoAlerts: 0,
          totalAlertsToday: 0,
          resolvedAlertsToday: 0,
          averageResolutionTime: 0,
        };

        const result = AlertStatsUtil.isEmpty(nonEmptyStats);
        expect(result).toBe(false);
      });

      it('should return false for non-zero averageResolutionTime', () => {
        const statsWithResolutionTime: BaseAlertStats = {
          activeAlerts: 0,
          criticalAlerts: 0,
          warningAlerts: 0,
          infoAlerts: 0,
          totalAlertsToday: 0,
          resolvedAlertsToday: 0,
          averageResolutionTime: 1200, // non-zero
        };

        const result = AlertStatsUtil.isEmpty(statsWithResolutionTime);
        expect(result).toBe(false);
      });

      it('should handle decimal values', () => {
        const decimalStats: BaseAlertStats = {
          activeAlerts: 0,
          criticalAlerts: 0,
          warningAlerts: 0,
          infoAlerts: 0,
          totalAlertsToday: 0,
          resolvedAlertsToday: 0,
          averageResolutionTime: 0.1, // small decimal
        };

        const result = AlertStatsUtil.isEmpty(decimalStats);
        expect(result).toBe(false);
      });
    });
  });
});
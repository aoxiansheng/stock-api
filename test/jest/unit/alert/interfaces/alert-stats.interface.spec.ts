import { 
  BaseAlertStats, 
  DEFAULT_ALERT_STATS, 
  AlertStatsUtil 
} from "../../../../../src/alert/interfaces/alert-stats.interface";

describe("AlertStatsInterface", () => {
  describe("BaseAlertStats", () => {
    it("should define the correct structure for base alert stats interface", () => {
      const stats: BaseAlertStats = {
        activeAlerts: 2,
        criticalAlerts: 1,
        warningAlerts: 1,
        infoAlerts: 0,
        totalAlertsToday: 5,
        resolvedAlertsToday: 3,
        averageResolutionTime: 120,
      };

      // 验证所有必需字段
      expect(stats.activeAlerts).toBeDefined();
      expect(stats.criticalAlerts).toBeDefined();
      expect(stats.warningAlerts).toBeDefined();
      expect(stats.infoAlerts).toBeDefined();
      expect(stats.totalAlertsToday).toBeDefined();
      expect(stats.resolvedAlertsToday).toBeDefined();
      expect(stats.averageResolutionTime).toBeDefined();

      // 验证字段类型
      expect(typeof stats.activeAlerts).toBe("number");
      expect(typeof stats.criticalAlerts).toBe("number");
      expect(typeof stats.warningAlerts).toBe("number");
      expect(typeof stats.infoAlerts).toBe("number");
      expect(typeof stats.totalAlertsToday).toBe("number");
      expect(typeof stats.resolvedAlertsToday).toBe("number");
      expect(typeof stats.averageResolutionTime).toBe("number");
    });
  });

  describe("DEFAULT_ALERT_STATS", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_ALERT_STATS.activeAlerts).toBe(0);
      expect(DEFAULT_ALERT_STATS.criticalAlerts).toBe(0);
      expect(DEFAULT_ALERT_STATS.warningAlerts).toBe(0);
      expect(DEFAULT_ALERT_STATS.infoAlerts).toBe(0);
      expect(DEFAULT_ALERT_STATS.totalAlertsToday).toBe(0);
      expect(DEFAULT_ALERT_STATS.resolvedAlertsToday).toBe(0);
      expect(DEFAULT_ALERT_STATS.averageResolutionTime).toBe(0);
    });

    it("should be immutable", () => {
      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        DEFAULT_ALERT_STATS.activeAlerts = 1;
      }).toThrow();

      expect(() => {
        // @ts-ignore - TypeScript会阻止这种修改
        DEFAULT_ALERT_STATS.criticalAlerts = 1;
      }).toThrow();
    });
  });

  describe("AlertStatsUtil", () => {
    describe("validateStats", () => {
      it("should validate correct stats object", () => {
        const stats: BaseAlertStats = {
          activeAlerts: 2,
          criticalAlerts: 1,
          warningAlerts: 1,
          infoAlerts: 0,
          totalAlertsToday: 5,
          resolvedAlertsToday: 3,
          averageResolutionTime: 120,
        };

        const result = AlertStatsUtil.validateStats(stats);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("should reject invalid stats object", () => {
        const result = AlertStatsUtil.validateStats(null);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe("统计数据必须是对象类型");
      });

      it("should reject stats with invalid field types", () => {
        const stats = {
          activeAlerts: "invalid", // 应该是数字
          criticalAlerts: 1,
          warningAlerts: 1,
          infoAlerts: 0,
          totalAlertsToday: 5,
          resolvedAlertsToday: 3,
          averageResolutionTime: 120,
        };

        const result = AlertStatsUtil.validateStats(stats);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe("字段 activeAlerts 必须是数字类型");
      });

      it("should reject stats with negative values", () => {
        const stats: any = {
          activeAlerts: -1, // 负数
          criticalAlerts: 1,
          warningAlerts: 1,
          infoAlerts: 0,
          totalAlertsToday: 5,
          resolvedAlertsToday: 3,
          averageResolutionTime: 120,
        };

        const result = AlertStatsUtil.validateStats(stats);
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toBe("字段 activeAlerts 不能为负数");
      });

      it("should reject stats with missing fields", () => {
        const stats = {
          activeAlerts: 2,
          // 缺少其他必需字段
        };

        const result = AlertStatsUtil.validateStats(stats);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe("isEmpty", () => {
      it("should correctly identify empty stats", () => {
        const emptyStats: BaseAlertStats = {
          activeAlerts: 0,
          criticalAlerts: 0,
          warningAlerts: 0,
          infoAlerts: 0,
          totalAlertsToday: 0,
          resolvedAlertsToday: 0,
          averageResolutionTime: 0,
        };

        expect(AlertStatsUtil.isEmpty(emptyStats)).toBe(true);
      });

      it("should correctly identify non-empty stats", () => {
        const nonEmptyStats: BaseAlertStats = {
          activeAlerts: 1,
          criticalAlerts: 0,
          warningAlerts: 0,
          infoAlerts: 0,
          totalAlertsToday: 0,
          resolvedAlertsToday: 0,
          averageResolutionTime: 0,
        };

        expect(AlertStatsUtil.isEmpty(nonEmptyStats)).toBe(false);
      });

      it("should handle partially empty stats", () => {
        const partialStats: BaseAlertStats = {
          activeAlerts: 0,
          criticalAlerts: 0,
          warningAlerts: 1,
          infoAlerts: 0,
          totalAlertsToday: 0,
          resolvedAlertsToday: 0,
          averageResolutionTime: 0,
        };

        expect(AlertStatsUtil.isEmpty(partialStats)).toBe(false);
      });
    });
  });
});
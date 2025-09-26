import { IAlert, IAlertRule, IAlertQuery, IAlertStats } from '@alert/interfaces/alert.interface';
import { IMetricData, IRuleEvaluationResult, IRuleEngine } from '@alert/interfaces/rule-engine.interface';
import { BaseAlertStats } from '@alert/interfaces/alert-stats.interface';

describe('Alert Interfaces Index', () => {
  describe('Interface Exports', () => {
    it('should export IAlert interface', () => {
      // This test verifies that the interface can be imported
      const alert: IAlert = {
        id: 'test-alert',
        ruleId: 'test-rule',
        ruleName: 'Test Rule',
        metric: 'test_metric',
        value: 100,
        threshold: 80,
        severity: 'critical' as any,
        status: 'firing' as any,
        message: 'Test alert',
        startTime: new Date(),
      };

      expect(alert.id).toBe('test-alert');
      expect(alert.ruleId).toBe('test-rule');
    });

    it('should export IAlertRule interface', () => {
      const rule: IAlertRule = {
        id: 'test-rule',
        name: 'Test Rule',
        metric: 'test_metric',
        operator: '>' as any,
        threshold: 80,
        duration: 300,
        severity: 'critical' as any,
        enabled: true,
        channels: [],
        cooldown: 600,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(rule.id).toBe('test-rule');
      expect(rule.name).toBe('Test Rule');
    });

    it('should export IAlertQuery interface', () => {
      const query: IAlertQuery = {
        ruleId: 'test-rule',
        severity: 'critical' as any,
        status: 'firing' as any,
        page: 1,
        limit: 20,
      };

      expect(query.ruleId).toBe('test-rule');
      expect(query.page).toBe(1);
      expect(query.limit).toBe(20);
    });

    it('should export IAlertStats interface', () => {
      const stats: IAlertStats = {
        totalRules: 10,
        enabledRules: 8,
        activeAlerts: 3,
        criticalAlerts: 1,
        warningAlerts: 1,
        infoAlerts: 1,
        totalAlertsToday: 15,
        resolvedAlertsToday: 12,
        averageResolutionTime: 1800,
      };

      expect(stats.totalRules).toBe(10);
      expect(stats.enabledRules).toBe(8);
    });

    it('should export IMetricData interface', () => {
      const metricData: IMetricData = {
        metric: 'cpu_usage',
        value: 85.5,
        timestamp: new Date(),
      };

      expect(metricData.metric).toBe('cpu_usage');
      expect(metricData.value).toBe(85.5);
    });

    it('should export IRuleEvaluationResult interface', () => {
      const result: IRuleEvaluationResult = {
        ruleId: 'test-rule',
        triggered: true,
        value: 85.5,
        threshold: 80.0,
        message: 'Test triggered',
        evaluatedAt: new Date(),
      };

      expect(result.ruleId).toBe('test-rule');
      expect(result.triggered).toBe(true);
    });

    it('should export IRuleEngine interface', () => {
      // Test that we can create an object that conforms to IRuleEngine
      const ruleEngine: IRuleEngine = {
        evaluateRule: jest.fn(),
        evaluateRules: jest.fn(),
        isInCooldown: jest.fn(),
        setCooldown: jest.fn(),
        validateRule: jest.fn(),
      };

      expect(ruleEngine.evaluateRule).toBeDefined();
      expect(ruleEngine.evaluateRules).toBeDefined();
      expect(ruleEngine.isInCooldown).toBeDefined();
      expect(ruleEngine.setCooldown).toBeDefined();
      expect(ruleEngine.validateRule).toBeDefined();
    });

    it('should export BaseAlertStats interface', () => {
      const stats: BaseAlertStats = {
        activeAlerts: 5,
        criticalAlerts: 2,
        warningAlerts: 2,
        infoAlerts: 1,
        totalAlertsToday: 20,
        resolvedAlertsToday: 15,
        averageResolutionTime: 1200,
      };

      expect(stats.activeAlerts).toBe(5);
      expect(stats.totalAlertsToday).toBe(20);
    });
  });

  describe('Interface Compatibility', () => {
    it('should allow combining multiple interfaces', () => {
      // Test that interfaces can be used together
      const combined: IAlert & { additionalField: string } = {
        id: 'combined-alert',
        ruleId: 'combined-rule',
        ruleName: 'Combined Rule',
        metric: 'combined_metric',
        value: 100,
        threshold: 80,
        severity: 'critical' as any,
        status: 'firing' as any,
        message: 'Combined alert',
        startTime: new Date(),
        additionalField: 'extra',
      };

      expect(combined.id).toBe('combined-alert');
      expect(combined.additionalField).toBe('extra');
    });

    it('should support interface extension', () => {
      // Test that IAlertStats extends BaseAlertStats correctly
      const extendedStats: IAlertStats = {
        totalRules: 15,
        enabledRules: 12,
        activeAlerts: 5,
        criticalAlerts: 2,
        warningAlerts: 2,
        infoAlerts: 1,
        totalAlertsToday: 25,
        resolvedAlertsToday: 20,
        averageResolutionTime: 900,
      };

      // Should have all BaseAlertStats properties
      expect(extendedStats.activeAlerts).toBe(5);
      expect(extendedStats.criticalAlerts).toBe(2);
      
      // Should have additional IAlertStats properties
      expect(extendedStats.totalRules).toBe(15);
      expect(extendedStats.enabledRules).toBe(12);
    });
  });
});
import {
  IAlertRule,
  IAlert,
  IAlertStats,
  IAlertQuery,
} from '../../../../../src/alert/interfaces/alert.interface';
import { AlertSeverity, AlertStatus, NotificationChannel } from '../../../../../src/alert/types/alert.types';

describe('Alert Interfaces', () => {
  describe('IAlertRule', () => {
    it('should define alert rule structure correctly', () => {
      const mockAlertRule: IAlertRule = {
        id: 'rule-1',
        name: 'CPU Usage Alert',
        description: 'Alert when CPU usage is high',
        metric: 'cpu_usage',
        operator: 'gt',
        threshold: 80,
        duration: 300,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [NotificationChannel.EMAIL],
        cooldown: 600,
        tags: { team: 'backend' },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin'
      };

      expect(mockAlertRule.id).toBe('rule-1');
      expect(mockAlertRule.name).toBe('CPU Usage Alert');
      expect(mockAlertRule.operator).toBe('gt');
      expect(mockAlertRule.threshold).toBe(80);
      expect(mockAlertRule.enabled).toBe(true);
      expect(Array.isArray(mockAlertRule.channels)).toBe(true);
    });

    it('should support all operator types', () => {
      const operators: Array<IAlertRule['operator']> = ['gt', 'lt', 'eq', 'gte', 'lte', 'ne'];
      
      operators.forEach(operator => {
        const rule: Partial<IAlertRule> = { operator };
        expect(rule.operator).toBe(operator);
      });
    });

    it('should support optional fields', () => {
      const minimalRule: IAlertRule = {
        id: 'rule-2',
        name: 'Minimal Rule',
        metric: 'test_metric',
        operator: 'gt',
        threshold: 50,
        duration: 60,
        severity: AlertSeverity.WARNING,
        enabled: true,
        channels: [],
        cooldown: 300,
        createdAt: new Date(),
        updatedAt: new Date()
        // Optional fields omitted
      };

      expect(minimalRule.description).toBeUndefined();
      expect(minimalRule.tags).toBeUndefined();
      expect(minimalRule.createdBy).toBeUndefined();
    });
  });

  describe('IAlert', () => {
    it('should define alert instance structure correctly', () => {
      const mockAlert: IAlert = {
        id: 'alert-1',
        ruleId: 'rule-1',
        ruleName: 'CPU Usage Alert',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.ACTIVE,
        message: 'CPU usage is 85%, exceeding threshold of 80%',
        startTime: new Date(),
        endTime: new Date(),
        acknowledgedBy: 'admin',
        acknowledgedAt: new Date(),
        tags: { host: 'server1' },
        context: { server: 'prod-1' }
      };

      expect(mockAlert.id).toBe('alert-1');
      expect(mockAlert.value).toBeGreaterThan(mockAlert.threshold);
      expect(mockAlert.status).toBe(AlertStatus.ACTIVE);
      expect(typeof mockAlert.message).toBe('string');
    });

    it('should support optional resolution fields', () => {
      const activeAlert: IAlert = {
        id: 'alert-2',
        ruleId: 'rule-2',
        ruleName: 'Memory Alert',
        metric: 'memory_usage',
        value: 90,
        threshold: 85,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.ACTIVE,
        message: 'Memory usage high',
        startTime: new Date()
        // Resolution fields are optional for active alerts
      };

      expect(activeAlert.endTime).toBeUndefined();
      expect(activeAlert.resolvedBy).toBeUndefined();
      expect(activeAlert.resolvedAt).toBeUndefined();
    });
  });

  describe('IAlertStats', () => {
    it('should define alert statistics structure correctly', () => {
      const mockStats: IAlertStats = {
        totalRules: 10,
        enabledRules: 8,
        activeAlerts: 3,
        criticalAlerts: 1,
        warningAlerts: 2,
        infoAlerts: 0,
        totalAlertsToday: 15,
        resolvedAlertsToday: 12,
        averageResolutionTime: 1800
      };

      expect(mockStats.totalRules).toBe(10);
      expect(mockStats.enabledRules).toBeLessThanOrEqual(mockStats.totalRules);
      expect(mockStats.activeAlerts).toBe(
        mockStats.criticalAlerts + mockStats.warningAlerts + mockStats.infoAlerts
      );
      expect(mockStats.averageResolutionTime).toBeGreaterThan(0);
    });

    it('should have consistent numeric values', () => {
      const stats: IAlertStats = {
        totalRules: 5,
        enabledRules: 3,
        activeAlerts: 2,
        criticalAlerts: 1,
        warningAlerts: 1,
        infoAlerts: 0,
        totalAlertsToday: 10,
        resolvedAlertsToday: 8,
        averageResolutionTime: 900
      };

      Object.values(stats).forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('IAlertQuery', () => {
    it('should define alert query structure with optional filters', () => {
      const complexQuery: IAlertQuery = {
        ruleId: 'rule-1',
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.ACTIVE,
        startTime: new Date('2023-01-01'),
        endTime: new Date('2023-12-31'),
        metric: 'cpu_usage',
        tags: { environment: 'production' },
        page: 1,
        limit: 20,
        sortBy: 'startTime',
        sortOrder: 'desc'
      };

      expect(complexQuery.page).toBe(1);
      expect(complexQuery.limit).toBe(20);
      expect(complexQuery.sortOrder).toBe('desc');
      expect(complexQuery.tags?.environment).toBe('production');
    });

    it('should support minimal query', () => {
      const minimalQuery: IAlertQuery = {};

      expect(Object.keys(minimalQuery)).toHaveLength(0);
    });

    it('should support pagination parameters', () => {
      const paginatedQuery: IAlertQuery = {
        page: 2,
        limit: 50,
        sortBy: 'severity',
        sortOrder: 'asc'
      };

      expect(paginatedQuery.page).toBe(2);
      expect(paginatedQuery.limit).toBe(50);
      expect(['asc', 'desc']).toContain(paginatedQuery.sortOrder);
    });

    it('should support date range filtering', () => {
      const dateRangeQuery: IAlertQuery = {
        startTime: new Date('2023-01-01'),
        endTime: new Date('2023-01-31')
      };

      expect(dateRangeQuery.startTime).toBeInstanceOf(Date);
      expect(dateRangeQuery.endTime).toBeInstanceOf(Date);
      expect(dateRangeQuery.endTime!.getTime()).toBeGreaterThan(dateRangeQuery.startTime!.getTime());
    });
  });

  describe('Interface consistency', () => {
    it('should maintain consistent severity types across interfaces', () => {
      const rule: Partial<IAlertRule> = { severity: AlertSeverity.HIGH };
      const alert: Partial<IAlert> = { severity: AlertSeverity.HIGH };

      expect(rule.severity).toBe(alert.severity);
    });

    it('should maintain consistent ID relationships', () => {
      const ruleId = 'rule-123';
      const rule: Partial<IAlertRule> = { id: ruleId };
      const alert: Partial<IAlert> = { ruleId: ruleId };

      expect(alert.ruleId).toBe(rule.id);
    });
  });
});

import { IAlert, IAlertRule, IAlertQuery, IAlertStats } from '@alert/interfaces/alert.interface';
import { AlertSeverity, AlertStatus } from '@alert/types/alert.types';

describe('Alert Interfaces', () => {
  describe('IAlertRule Interface', () => {
    it('should create valid IAlertRule object with required properties', () => {
      const mockRule: IAlertRule = {
        id: 'rule-123',
        name: 'CPU Usage Alert',
        metric: 'cpu_usage',
        operator: '>',
        threshold: 80,
        duration: 300,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [],
        cooldown: 600,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(mockRule).toBeDefined();
      expect(mockRule.id).toBe('rule-123');
      expect(mockRule.name).toBe('CPU Usage Alert');
      expect(mockRule.metric).toBe('cpu_usage');
      expect(mockRule.operator).toBe('>');
      expect(mockRule.threshold).toBe(80);
      expect(mockRule.severity).toBe(AlertSeverity.CRITICAL);
      expect(mockRule.enabled).toBe(true);
      expect(Array.isArray(mockRule.channels)).toBe(true);
    });

    it('should create valid IAlertRule object with optional properties', () => {
      const mockRule: IAlertRule = {
        id: 'rule-456',
        name: 'Memory Alert',
        description: 'Memory usage monitoring',
        metric: 'memory_usage',
        operator: '>=',
        threshold: 90,
        duration: 180,
        severity: AlertSeverity.WARNING,
        enabled: false,
        channels: [],
        cooldown: 300,
        tags: { environment: 'production', team: 'infrastructure' },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin@example.com',
      };

      expect(mockRule.description).toBe('Memory usage monitoring');
      expect(mockRule.tags).toEqual({ environment: 'production', team: 'infrastructure' });
      expect(mockRule.createdBy).toBe('admin@example.com');
      expect(mockRule.enabled).toBe(false);
    });

    it('should handle different operators and severities', () => {
      const operators = ['>', '>=', '<', '<=', '==', '!='] as const;
      const severities = [AlertSeverity.INFO, AlertSeverity.WARNING, AlertSeverity.CRITICAL];

      operators.forEach(operator => {
        severities.forEach(severity => {
          const rule: IAlertRule = {
            id: `rule-${operator}-${severity}`,
            name: `Test Rule ${operator} ${severity}`,
            metric: 'test_metric',
            operator,
            threshold: 50,
            duration: 60,
            severity,
            enabled: true,
            channels: [],
            cooldown: 120,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          expect(rule.operator).toBe(operator);
          expect(rule.severity).toBe(severity);
        });
      });
    });

    it('should support complex notification channels', () => {
      const rule: IAlertRule = {
        id: 'rule-with-channels',
        name: 'Multi-channel Alert',
        metric: 'disk_usage',
        operator: '>',
        threshold: 95,
        duration: 60,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [
          { name: 'Email Alert', type: 'email', config: { recipients: ['admin@example.com'] }, enabled: true },
          { name: 'Slack Alert', type: 'slack', config: { channel: '#alerts', webhook: 'https://hooks.slack.com/...' }, enabled: true },
        ],
        cooldown: 900,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(rule.channels).toHaveLength(2);
      expect(rule.channels[0].type).toBe('email');
      expect(rule.channels[1].type).toBe('slack');
      expect(rule.channels[0].config.recipients).toContain('admin@example.com');
      expect(rule.channels[1].config.channel).toBe('#alerts');
    });
  });

  describe('IAlert Interface', () => {
    it('should create valid IAlert object with required properties', () => {
      const mockAlert: IAlert = {
        id: 'alert-789',
        ruleId: 'rule-123',
        ruleName: 'CPU Usage Alert',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: 'CPU usage is critically high',
        startTime: new Date(),
      };

      expect(mockAlert).toBeDefined();
      expect(mockAlert.id).toBe('alert-789');
      expect(mockAlert.ruleId).toBe('rule-123');
      expect(mockAlert.value).toBe(85);
      expect(mockAlert.threshold).toBe(80);
      expect(mockAlert.status).toBe(AlertStatus.FIRING);
      expect(mockAlert.startTime).toBeInstanceOf(Date);
    });

    it('should create valid IAlert object with optional properties', () => {
      const acknowledgedAt = new Date();
      const resolvedAt = new Date();
      const endTime = new Date();

      const mockAlert: IAlert = {
        id: 'alert-complete',
        ruleId: 'rule-456',
        ruleName: 'Memory Alert',
        metric: 'memory_usage',
        value: 95,
        threshold: 90,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.RESOLVED,
        message: 'Memory usage resolved',
        startTime: new Date(),
        endTime,
        acknowledgedBy: 'operator@example.com',
        acknowledgedAt,
        resolvedBy: 'admin@example.com',
        resolvedAt,
        tags: { host: 'server-01', datacenter: 'us-east-1' },
        context: {
          previousValue: 88,
          trend: 'increasing',
          affectedServices: ['web', 'api']
        },
      };

      expect(mockAlert.endTime).toBe(endTime);
      expect(mockAlert.acknowledgedBy).toBe('operator@example.com');
      expect(mockAlert.acknowledgedAt).toBe(acknowledgedAt);
      expect(mockAlert.resolvedBy).toBe('admin@example.com');
      expect(mockAlert.resolvedAt).toBe(resolvedAt);
      expect(mockAlert.tags).toEqual({ host: 'server-01', datacenter: 'us-east-1' });
      expect(mockAlert.context).toHaveProperty('previousValue', 88);
      expect(mockAlert.context).toHaveProperty('affectedServices');
    });

    it('should handle different alert statuses', () => {
      const statuses = [AlertStatus.FIRING, AlertStatus.RESOLVED, AlertStatus.ACKNOWLEDGED];

      statuses.forEach(status => {
        const alert: IAlert = {
          id: `alert-${status}`,
          ruleId: 'rule-test',
          ruleName: 'Test Rule',
          metric: 'test_metric',
          value: 100,
          threshold: 50,
          severity: AlertSeverity.INFO,
          status,
          message: `Alert with status ${status}`,
          startTime: new Date(),
        };

        expect(alert.status).toBe(status);
      });
    });

    it('should support complex context data', () => {
      const alert: IAlert = {
        id: 'alert-with-context',
        ruleId: 'rule-context-test',
        ruleName: 'Context Test Rule',
        metric: 'api_response_time',
        value: 5000,
        threshold: 2000,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: 'API response time too high',
        startTime: new Date(),
        context: {
          endpoint: '/api/v1/users',
          method: 'GET',
          statusCode: 200,
          responseTime: 5000,
          userAgent: 'Mozilla/5.0...',
          clientIP: '192.168.1.100',
          errorRate: 0.05,
          requestCount: 1000,
          metadata: {
            loadBalancer: 'lb-01',
            region: 'us-west-2',
            instance: 'i-1234567890abcdef0'
          }
        },
      };

      expect(alert.context).toBeDefined();
      expect(alert.context?.endpoint).toBe('/api/v1/users');
      expect(alert.context?.responseTime).toBe(5000);
      expect(alert.context?.metadata).toHaveProperty('loadBalancer');
    });
  });

  describe('IAlertQuery Interface', () => {
    it('should create valid query with minimal properties', () => {
      const query: IAlertQuery = {};

      expect(query).toBeDefined();
      expect(typeof query).toBe('object');
    });

    it('should create valid query with all properties', () => {
      const startTime = new Date('2023-01-01T00:00:00Z');
      const endTime = new Date('2023-01-02T00:00:00Z');

      const query: IAlertQuery = {
        ruleId: 'rule-123',
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        startTime,
        endTime,
        metric: 'cpu_usage',
        tags: { environment: 'production' },
        page: 1,
        limit: 20,
        sortBy: 'startTime',
        sortOrder: 'desc',
      };

      expect(query.ruleId).toBe('rule-123');
      expect(query.severity).toBe(AlertSeverity.CRITICAL);
      expect(query.status).toBe(AlertStatus.FIRING);
      expect(query.startTime).toBe(startTime);
      expect(query.endTime).toBe(endTime);
      expect(query.metric).toBe('cpu_usage');
      expect(query.tags).toEqual({ environment: 'production' });
      expect(query.page).toBe(1);
      expect(query.limit).toBe(20);
      expect(query.sortBy).toBe('startTime');
      expect(query.sortOrder).toBe('desc');
    });

    it('should handle different sort orders', () => {
      const ascQuery: IAlertQuery = { sortOrder: 'asc' };
      const descQuery: IAlertQuery = { sortOrder: 'desc' };

      expect(ascQuery.sortOrder).toBe('asc');
      expect(descQuery.sortOrder).toBe('desc');
    });

    it('should support complex tag filtering', () => {
      const query: IAlertQuery = {
        tags: {
          environment: 'production',
          team: 'backend',
          service: 'api',
          version: '2.1.0',
          datacenter: 'us-east-1',
          priority: 'high'
        },
      };

      expect(query.tags).toHaveProperty('environment', 'production');
      expect(query.tags).toHaveProperty('team', 'backend');
      expect(Object.keys(query.tags || {})).toHaveLength(6);
    });

    it('should handle pagination parameters', () => {
      const queries = [
        { page: 1, limit: 10 },
        { page: 5, limit: 50 },
        { page: 100, limit: 100 },
      ];

      queries.forEach(({ page, limit }) => {
        const query: IAlertQuery = { page, limit };
        expect(query.page).toBe(page);
        expect(query.limit).toBe(limit);
      });
    });
  });

  describe('IAlertStats Interface', () => {
    it('should create valid alert stats object', () => {
      const stats: IAlertStats = {
        totalRules: 50,
        enabledRules: 45,
        activeAlerts: 12,
        criticalAlerts: 3,
        warningAlerts: 7,
        infoAlerts: 2,
        totalAlertsToday: 25,
        resolvedAlertsToday: 20,
        averageResolutionTime: 1800, // 30 minutes in seconds
      };

      expect(stats).toBeDefined();
      expect(stats.totalRules).toBe(50);
      expect(stats.enabledRules).toBe(45);
      expect(stats.activeAlerts).toBe(12);
      expect(stats.criticalAlerts).toBe(3);
      expect(stats.warningAlerts).toBe(7);
      expect(stats.infoAlerts).toBe(2);
      expect(stats.totalAlertsToday).toBe(25);
      expect(stats.resolvedAlertsToday).toBe(20);
      expect(stats.averageResolutionTime).toBe(1800);
    });

    it('should handle zero values in stats', () => {
      const emptyStats: IAlertStats = {
        totalRules: 0,
        enabledRules: 0,
        activeAlerts: 0,
        criticalAlerts: 0,
        warningAlerts: 0,
        infoAlerts: 0,
        totalAlertsToday: 0,
        resolvedAlertsToday: 0,
        averageResolutionTime: 0,
      };

      expect(emptyStats.totalRules).toBe(0);
      expect(emptyStats.activeAlerts).toBe(0);
      expect(emptyStats.averageResolutionTime).toBe(0);
    });

    it('should calculate meaningful metrics', () => {
      const stats: IAlertStats = {
        totalRules: 100,
        enabledRules: 85,
        activeAlerts: 15,
        criticalAlerts: 5,
        warningAlerts: 8,
        infoAlerts: 2,
        totalAlertsToday: 50,
        resolvedAlertsToday: 35,
        averageResolutionTime: 900,
      };

      // Test that the stats make logical sense
      expect(stats.enabledRules).toBeLessThanOrEqual(stats.totalRules);
      expect(stats.criticalAlerts + stats.warningAlerts + stats.infoAlerts).toBeLessThanOrEqual(stats.activeAlerts);
      expect(stats.resolvedAlertsToday).toBeLessThanOrEqual(stats.totalAlertsToday);
      expect(stats.averageResolutionTime).toBeGreaterThan(0);
    });
  });

  describe('Interface Type Safety', () => {
    it('should enforce required properties in IAlertRule', () => {
      // This test ensures TypeScript compilation catches missing required properties
      const createRule = (rule: IAlertRule): IAlertRule => rule;

      const validRule: IAlertRule = {
        id: 'test',
        name: 'Test Rule',
        metric: 'test_metric',
        operator: '>',
        threshold: 100,
        duration: 60,
        severity: AlertSeverity.INFO,
        enabled: true,
        channels: [],
        cooldown: 300,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => createRule(validRule)).not.toThrow();
    });

    it('should enforce required properties in IAlert', () => {
      const createAlert = (alert: IAlert): IAlert => alert;

      const validAlert: IAlert = {
        id: 'test-alert',
        ruleId: 'test-rule',
        ruleName: 'Test Rule',
        metric: 'test_metric',
        value: 150,
        threshold: 100,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.FIRING,
        message: 'Test alert message',
        startTime: new Date(),
      };

      expect(() => createAlert(validAlert)).not.toThrow();
    });

    it('should allow optional properties to be undefined', () => {
      const alertWithOptionals: IAlert = {
        id: 'optional-test',
        ruleId: 'rule-optional',
        ruleName: 'Optional Test Rule',
        metric: 'optional_metric',
        value: 75,
        threshold: 50,
        severity: AlertSeverity.INFO,
        status: AlertStatus.ACKNOWLEDGED,
        message: 'Optional properties test',
        startTime: new Date(),
        // Optional properties explicitly undefined
        endTime: undefined,
        acknowledgedBy: undefined,
        acknowledgedAt: undefined,
        resolvedBy: undefined,
        resolvedAt: undefined,
        tags: undefined,
        context: undefined,
      };

      expect(alertWithOptionals.endTime).toBeUndefined();
      expect(alertWithOptionals.tags).toBeUndefined();
      expect(alertWithOptionals.context).toBeUndefined();
    });
  });

  describe('Interface Compatibility', () => {
    it('should be compatible with JSON serialization', () => {
      const rule: IAlertRule = {
        id: 'json-test',
        name: 'JSON Test Rule',
        metric: 'json_metric',
        operator: '>=',
        threshold: 200,
        duration: 120,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [{ name: 'Test Email', type: 'email', config: { recipients: ['test@example.com'] }, enabled: true }],
        cooldown: 600,
        tags: { test: 'value' },
        createdAt: new Date('2023-01-01T12:00:00Z'),
        updatedAt: new Date('2023-01-01T12:30:00Z'),
      };

      const serialized = JSON.stringify(rule);
      const deserialized = JSON.parse(serialized);

      expect(deserialized.id).toBe(rule.id);
      expect(deserialized.name).toBe(rule.name);
      expect(deserialized.threshold).toBe(rule.threshold);
      expect(deserialized.channels).toEqual(rule.channels);
      expect(deserialized.channels[0].config.recipients).toEqual(['test@example.com']);
      expect(deserialized.tags).toEqual(rule.tags);
    });

    it('should handle Date objects in JSON serialization', () => {
      const alert: IAlert = {
        id: 'date-test',
        ruleId: 'rule-date',
        ruleName: 'Date Test Rule',
        metric: 'date_metric',
        value: 100,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        status: AlertStatus.RESOLVED,
        message: 'Date handling test',
        startTime: new Date('2023-01-01T10:00:00Z'),
        endTime: new Date('2023-01-01T10:30:00Z'),
        acknowledgedAt: new Date('2023-01-01T10:05:00Z'),
        resolvedAt: new Date('2023-01-01T10:30:00Z'),
      };

      const serialized = JSON.stringify(alert);
      const deserialized = JSON.parse(serialized);

      // Dates become strings after JSON serialization
      expect(typeof deserialized.startTime).toBe('string');
      expect(typeof deserialized.endTime).toBe('string');
      expect(new Date(deserialized.startTime)).toEqual(alert.startTime);
      expect(new Date(deserialized.endTime)).toEqual(alert.endTime);
    });
  });
});
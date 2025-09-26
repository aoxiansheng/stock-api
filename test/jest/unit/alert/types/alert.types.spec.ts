import {
  AlertSeverity,
  AlertStatus,
  NotificationChannelType,
  NotificationStatus,
  BaseEntity,
  BaseStats,
  BaseQuery,
  NotificationChannel,
  AlertRule,
  AlertCondition,
  Alert,
  AlertHistory,
  NotificationResult,
  BatchNotificationResult,
  NotificationSender,
  NotificationTemplate,
  NotificationLog,
  AlertQuery,
  RuleEvaluationResult,
  MetricData,
  RuleEngine,
  AlertSuppressionRule
} from '@alert/types/alert.types';

describe('Alert Types', () => {
  describe('Enum Definitions', () => {
    it('should define AlertSeverity enum correctly', () => {
      expect(AlertSeverity.CRITICAL).toBe('critical');
      expect(AlertSeverity.WARNING).toBe('warning');
      expect(AlertSeverity.INFO).toBe('info');
    });

    it('should define AlertStatus enum correctly', () => {
      expect(AlertStatus.FIRING).toBe('firing');
      expect(AlertStatus.ACKNOWLEDGED).toBe('acknowledged');
      expect(AlertStatus.RESOLVED).toBe('resolved');
      expect(AlertStatus.SUPPRESSED).toBe('suppressed');
    });

    it('should define NotificationChannelType enum correctly', () => {
      expect(NotificationChannelType.EMAIL).toBe('email');
      expect(NotificationChannelType.WEBHOOK).toBe('webhook');
      expect(NotificationChannelType.SLACK).toBe('slack');
      expect(NotificationChannelType.LOG).toBe('log');
      expect(NotificationChannelType.SMS).toBe('sms');
      expect(NotificationChannelType.DINGTALK).toBe('dingtalk');
    });

    it('should define NotificationStatus enum correctly', () => {
      expect(NotificationStatus.PENDING).toBe('pending');
      expect(NotificationStatus.SENT).toBe('sent');
      expect(NotificationStatus.DELIVERED).toBe('delivered');
      expect(NotificationStatus.FAILED).toBe('failed');
      expect(NotificationStatus.RETRY).toBe('retry');
    });
  });

  describe('Interface Definitions', () => {
    it('should define BaseEntity interface correctly', () => {
      const entity: BaseEntity = {
        id: 'test-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(entity.id).toBe('test-id');
      expect(entity.createdAt).toBeInstanceOf(Date);
      expect(entity.updatedAt).toBeInstanceOf(Date);
    });

    it('should define BaseStats interface correctly', () => {
      const stats: BaseStats = {
        timestamp: new Date(),
        period: 'daily',
      };

      expect(stats.timestamp).toBeInstanceOf(Date);
      expect(stats.period).toBe('daily');
    });

    it('should define BaseQuery interface correctly', () => {
      const query: BaseQuery = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      };

      expect(query.page).toBe(1);
      expect(query.limit).toBe(20);
      expect(query.sortBy).toBe('createdAt');
      expect(query.sortOrder).toBe('asc');
    });

    it('should define NotificationChannel interface correctly', () => {
      const channel: NotificationChannel = {
        name: 'Test Channel',
        type: NotificationChannelType.EMAIL,
        config: { recipients: ['test@example.com'] },
        enabled: true,
        retryCount: 3,
        timeout: 5000,
        priority: 1,
      };

      expect(channel.name).toBe('Test Channel');
      expect(channel.type).toBe(NotificationChannelType.EMAIL);
      expect(channel.config.recipients).toContain('test@example.com');
      expect(channel.enabled).toBe(true);
    });

    it('should define AlertRule interface correctly', () => {
      const rule: AlertRule = {
        id: 'rule-123',
        name: 'Test Rule',
        metric: 'cpu_usage',
        operator: '>' as any,
        threshold: 80,
        duration: 300,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [],
        cooldown: 600,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(rule.id).toBe('rule-123');
      expect(rule.name).toBe('Test Rule');
      expect(rule.severity).toBe(AlertSeverity.CRITICAL);
    });

    it('should define Alert interface correctly', () => {
      const alert: Alert = {
        id: 'alert-123',
        ruleId: 'rule-123',
        ruleName: 'Test Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: 'CPU usage is high',
        startTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(alert.id).toBe('alert-123');
      expect(alert.ruleId).toBe('rule-123');
      expect(alert.status).toBe(AlertStatus.FIRING);
    });

    it('should define AlertQuery interface correctly', () => {
      const query: AlertQuery = {
        ruleId: 'rule-123',
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        page: 1,
        limit: 20,
      };

      expect(query.ruleId).toBe('rule-123');
      expect(query.severity).toBe(AlertSeverity.CRITICAL);
      expect(query.status).toBe(AlertStatus.FIRING);
    });

    it('should define MetricData interface correctly', () => {
      const metric: MetricData = {
        metric: 'cpu_usage',
        value: 85.5,
        timestamp: new Date(),
        tags: { host: 'server-1' },
        source: 'prometheus',
      };

      expect(metric.metric).toBe('cpu_usage');
      expect(metric.value).toBe(85.5);
      expect(metric.source).toBe('prometheus');
    });
  });

  describe('Type Safety', () => {
    it('should enforce type safety for AlertSeverity', () => {
      const severity: AlertSeverity = AlertSeverity.CRITICAL;
      expect(typeof severity).toBe('string');
      expect(severity).toBe('critical');
    });

    it('should enforce type safety for AlertStatus', () => {
      const status: AlertStatus = AlertStatus.RESOLVED;
      expect(typeof status).toBe('string');
      expect(status).toBe('resolved');
    });

    it('should enforce type safety for NotificationChannelType', () => {
      const channelType: NotificationChannelType = NotificationChannelType.SLACK;
      expect(typeof channelType).toBe('string');
      expect(channelType).toBe('slack');
    });

    it('should allow combining interfaces', () => {
      const extendedAlert: Alert & { customField: string } = {
        id: 'extended-alert',
        ruleId: 'rule-123',
        ruleName: 'Test Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: 'Test alert',
        startTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        customField: 'extra',
      };

      expect(extendedAlert.customField).toBe('extra');
    });
  });

  describe('Interface Relationships', () => {
    it('should allow AlertRule to contain AlertConditions', () => {
      const rule: AlertRule = {
        id: 'rule-with-conditions',
        name: 'Rule with Conditions',
        metric: 'cpu_usage',
        operator: '>' as any,
        threshold: 80,
        duration: 300,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        channels: [],
        cooldown: 600,
        conditions: [
          {
            field: 'host',
            operator: 'contains',
            value: 'web',
            logicalOperator: 'and',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(rule.conditions).toHaveLength(1);
      expect(rule.conditions?.[0].field).toBe('host');
    });

    it('should allow Alert to have optional fields', () => {
      const minimalAlert: Alert = {
        id: 'minimal-alert',
        ruleId: 'rule-123',
        ruleName: 'Test Rule',
        metric: 'cpu_usage',
        value: 85,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        message: 'Test alert',
        startTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        // Optional fields can be omitted
      };

      expect(minimalAlert.id).toBe('minimal-alert');
      expect(minimalAlert.ruleId).toBe('rule-123');
    });
  });
});
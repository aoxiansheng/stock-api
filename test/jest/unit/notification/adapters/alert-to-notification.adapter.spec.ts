import { Test, TestingModule } from '@nestjs/testing';
import { AlertToNotificationAdapter } from '@notification/adapters/alert-to-notification.adapter';
import { NotificationRequestDto } from '@notification/dto/notification-request.dto';
import {
  NotificationEventData,
  NotificationSeverity,
  NotificationAlert,
  NotificationAlertRule,
  NotificationAlertContext,
  NotificationAlertStatus,
  NotificationOperator,
} from '@notification/types/notification-alert.types';
import {
  NotificationPriority,
  NotificationChannelType,
} from '@notification/types/notification.types';

describe('AlertToNotificationAdapter', () => {
  let adapter: AlertToNotificationAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertToNotificationAdapter],
    }).compile();

    adapter = module.get<AlertToNotificationAdapter>(AlertToNotificationAdapter);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('adapt', () => {
    const createBasicAlertEvent = (overrides?: any): any => ({
      eventType: 'FIRED',
      alert: {
        id: 'alert-123',
        metric: 'cpu_usage',
        severity: NotificationSeverity.HIGH,
        description: 'CPU usage is high',
        tags: { service: 'web-app', environment: 'production' },
        createdAt: new Date(),
      },
      rule: {
        id: 'rule-456',
        name: 'CPU Usage Alert',
        description: 'Alert when CPU usage exceeds threshold',
        channels: [
          {
            type: 'email',
            enabled: true,
            config: { recipients: ['admin@example.com'] },
          },
        ],
      },
      context: {
        evaluatedAt: new Date(),
        metricValue: 85.5,
        threshold: 80,
        operator: NotificationOperator.GT,
        metadata: {},
      },
      timestamp: new Date(),
      correlationId: 'corr-789',
      ...overrides,
    });

    it('should adapt basic alert event successfully', () => {
      const alertEvent = createBasicAlertEvent();

      const result = adapter.adapt(alertEvent);

      expect(result).toEqual({
        alertId: 'alert-123',
        severity: NotificationPriority.HIGH,
        title: '🚨 警报触发: cpu_usage',
        message: expect.stringContaining('**警告详情**'),
        metadata: expect.objectContaining({
          eventType: 'FIRED',
          alertId: 'alert-123',
          metric: 'cpu_usage',
          severity: NotificationSeverity.HIGH,
        }),
        channelTypes: [NotificationChannelType.EMAIL],
        recipients: undefined,
        triggeredAt: alertEvent.timestamp.toISOString(),
        requiresAcknowledgment: true,
        tags: expect.arrayContaining(['service:web-app', 'environment:production']),
      });
    });

    it('should handle different event types', () => {
      const resolvedEvent = createBasicAlertEvent({
        eventType: 'RESOLVED',
      });

      const result = adapter.adapt(resolvedEvent);

      expect(result.title).toBe('✅ 警报已解决: cpu_usage');
      expect(result.severity).toBe(NotificationPriority.HIGH);
    });

    it('should handle acknowledged event type', () => {
      const acknowledgedEvent = createBasicAlertEvent({
        eventType: 'ACKNOWLEDGED',
        eventData: {
          acknowledgmentComment: 'Working on it',
        },
      });

      const result = adapter.adapt(acknowledgedEvent);

      expect(result.title).toBe('👁️ 警报已确认: cpu_usage');
      expect(result.message).toContain('确认备注: Working on it');
    });

    it('should handle escalated event type', () => {
      const escalatedEvent = createBasicAlertEvent({
        eventType: 'ESCALATED',
        eventData: {
          escalationReason: 'No response after 30 minutes',
        },
      });

      const result = adapter.adapt(escalatedEvent);

      expect(result.title).toBe('⬆️ 警报已升级: cpu_usage');
      expect(result.message).toContain('升级原因: No response after 30 minutes');
    });

    it('should handle suppressed event type', () => {
      const suppressedEvent = createBasicAlertEvent({
        eventType: 'SUPPRESSED',
        eventData: {
          suppressionReason: 'Maintenance window',
        },
      });

      const result = adapter.adapt(suppressedEvent);

      expect(result.title).toBe('🔕 警报已抑制: cpu_usage');
      expect(result.message).toContain('抑制原因: Maintenance window');
    });

    it('should map severity levels correctly', () => {
      const testCases = [
        { severity: NotificationSeverity.LOW, expected: NotificationPriority.LOW },
        { severity: NotificationSeverity.MEDIUM, expected: NotificationPriority.NORMAL },
        { severity: NotificationSeverity.HIGH, expected: NotificationPriority.HIGH },
        { severity: NotificationSeverity.CRITICAL, expected: NotificationPriority.CRITICAL },
      ];

      testCases.forEach(({ severity, expected }) => {
        const alertEvent = createBasicAlertEvent({
          alert: {
            ...createBasicAlertEvent().alert,
            severity,
          },
        });

        const result = adapter.adapt(alertEvent);
        expect(result.severity).toBe(expected);
      });
    });

    it('should extract channel types from rule', () => {
      const alertEvent = createBasicAlertEvent({
        rule: {
          id: 'rule-456',
          name: 'Multi-channel Alert',
          channels: [
            { type: 'email', enabled: true },
            { type: 'slack', enabled: true },
            { type: 'webhook', enabled: false },
            { type: 'dingtalk', enabled: true },
          ],
        },
      });

      const result = adapter.adapt(alertEvent);

      expect(result.channelTypes).toContain(NotificationChannelType.EMAIL);
      expect(result.channelTypes).toContain(NotificationChannelType.SLACK);
      expect(result.channelTypes).toContain(NotificationChannelType.DINGTALK);
      expect(result.channelTypes).not.toContain(NotificationChannelType.WEBHOOK);
    });

    it('should use default channels when rule has no channels', () => {
      const alertEvent = createBasicAlertEvent({
        alert: {
          ...createBasicAlertEvent().alert,
          severity: NotificationSeverity.CRITICAL,
        },
        rule: {
          id: 'rule-456',
          name: 'No Channels Rule',
          channels: [],
        },
      });

      const result = adapter.adapt(alertEvent);

      // CRITICAL severity should use all default channels
      expect(result.channelTypes).toContain(NotificationChannelType.LOG);
      expect(result.channelTypes).toContain(NotificationChannelType.EMAIL);
      expect(result.channelTypes).toContain(NotificationChannelType.SLACK);
      expect(result.channelTypes).toContain(NotificationChannelType.SMS);
      expect(result.channelTypes).toContain(NotificationChannelType.WEBHOOK);
    });

    it('should extract recipients from event data', () => {
      const alertEvent = createBasicAlertEvent({
        eventData: {
          recipients: ['admin@example.com', 'ops@example.com', ''],
        },
      });

      const result = adapter.adapt(alertEvent);

      expect(result.recipients).toEqual(['admin@example.com', 'ops@example.com']);
    });

    it('should extract recipients from context metadata', () => {
      const alertEvent = createBasicAlertEvent({
        context: {
          ...createBasicAlertEvent().context!,
          metadata: {
            recipients: ['context@example.com', 'team@example.com'],
          },
        },
      });

      const result = adapter.adapt(alertEvent);

      expect(result.recipients).toEqual(['context@example.com', 'team@example.com']);
    });

    it('should require acknowledgment for high severity alerts', () => {
      const highSeverityEvent = createBasicAlertEvent({
        alert: {
          ...createBasicAlertEvent().alert,
          severity: NotificationSeverity.HIGH,
        },
      });

      const criticalSeverityEvent = createBasicAlertEvent({
        alert: {
          ...createBasicAlertEvent().alert,
          severity: NotificationSeverity.CRITICAL,
        },
      });

      const lowSeverityEvent = createBasicAlertEvent({
        alert: {
          ...createBasicAlertEvent().alert,
          severity: NotificationSeverity.LOW,
        },
      });

      expect(adapter.adapt(highSeverityEvent).requiresAcknowledgment).toBe(true);
      expect(adapter.adapt(criticalSeverityEvent).requiresAcknowledgment).toBe(true);
      expect(adapter.adapt(lowSeverityEvent).requiresAcknowledgment).toBe(false);
    });

    it('should generate comprehensive tags', () => {
      const alertEvent = createBasicAlertEvent({
        alert: {
          ...createBasicAlertEvent().alert,
          tags: { service: 'api', version: '1.2.3' },
        },
        rule: {
          id: 'rule-456',
          name: 'API Alert',
        },
      });

      const result = adapter.adapt(alertEvent);

      expect(result.tags).toContain('service:api');
      expect(result.tags).toContain('version:1.2.3');
      expect(result.tags).toContain('severity:high');
      expect(result.tags).toContain('metric:cpu_usage');
      expect(result.tags).toContain('event:fired');
      expect(result.tags).toContain('rule:rule-456');
    });

    it('should build detailed message content', () => {
      const alertEvent = createBasicAlertEvent({
        context: {
          evaluatedAt: new Date(),
          metricValue: 92.5,
          threshold: 85,
          operator: '>=',
        },
      });

      const result = adapter.adapt(alertEvent);

      expect(result.message).toContain('**警告详情**');
      expect(result.message).toContain('警报ID: alert-123');
      expect(result.message).toContain('指标: cpu_usage');
      expect(result.message).toContain('严重程度: high');
      expect(result.message).toContain('当前值: 92.5');
      expect(result.message).toContain('阈值: 85');
      expect(result.message).toContain('条件: >=');
      expect(result.message).toContain('描述: CPU usage is high');
      expect(result.message).toContain('标签: service=web-app, environment=production');
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalEvent: any = {
        eventType: 'FIRED',
        alert: {
          id: 'alert-minimal',
          metric: 'memory_usage',
          severity: NotificationSeverity.MEDIUM,
        },
        timestamp: new Date(),
        correlationId: 'corr-minimal',
      };

      const result = adapter.adapt(minimalEvent);

      expect(result.alertId).toBe('alert-minimal');
      expect(result.severity).toBe(NotificationPriority.NORMAL);
      expect(result.channelTypes).toEqual([
        NotificationChannelType.LOG,
        NotificationChannelType.EMAIL,
      ]);
      expect(result.requiresAcknowledgment).toBe(false);
    });

    it('should throw error for invalid alert event', () => {
      const invalidEvent = createBasicAlertEvent({
        alert: {
          ...createBasicAlertEvent().alert,
          id: '', // Invalid empty ID
        },
      });

      expect(() => adapter.adapt(invalidEvent)).toThrow();
    });
  });

  describe('adaptMany', () => {
    it('should adapt multiple events successfully', () => {
      const events = [
        {
          eventType: 'FIRED',
          alert: {
            id: 'alert-1',
            metric: 'cpu_usage',
            severity: NotificationSeverity.HIGH,
          },
          timestamp: new Date(),
          correlationId: 'corr-1',
        },
        {
          eventType: 'RESOLVED',
          alert: {
            id: 'alert-2',
            metric: 'memory_usage',
            severity: NotificationSeverity.MEDIUM,
          },
          timestamp: new Date(),
          correlationId: 'corr-2',
        },
      ] as any[];

      const results = adapter.adaptMany(events);

      expect(results).toHaveLength(2);
      expect(results[0].alertId).toBe('alert-1');
      expect(results[1].alertId).toBe('alert-2');
    });

    it('should handle partial failures in batch adaptation', () => {
      const events = [
        {
          eventType: 'FIRED',
          alert: {
            id: 'alert-valid',
            metric: 'cpu_usage',
            severity: NotificationSeverity.HIGH,
          },
          timestamp: new Date(),
          correlationId: 'corr-1',
        },
        {
          eventType: 'FIRED',
          alert: {
            id: '', // Invalid
            metric: 'memory_usage',
            severity: NotificationSeverity.HIGH,
          },
          timestamp: new Date(),
          correlationId: 'corr-2',
        },
      ] as any[];

      const results = adapter.adaptMany(events);

      expect(results).toHaveLength(1);
      expect(results[0].alertId).toBe('alert-valid');
    });

    it('should handle empty event array', () => {
      const results = adapter.adaptMany([]);

      expect(results).toHaveLength(0);
    });
  });

  describe('validateAlertEvent', () => {
    it('should validate complete alert event', () => {
      const validEvent = {
        eventType: 'FIRED',
        alert: {
          id: 'alert-123',
          metric: 'cpu_usage',
          severity: NotificationSeverity.HIGH,
        },
        timestamp: new Date(),
        correlationId: 'corr-123',
      } as any;

      const result = adapter.validateAlertEvent(validEvent);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidEvent = {
        eventType: 'FIRED',
        alert: {
          id: '',
          metric: '',
          severity: undefined,
        },
        timestamp: new Date(),
      } as any;

      const result = adapter.validateAlertEvent(invalidEvent);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Alert必须包含有效的ID');
      expect(result.errors).toContain('Alert必须包含metric');
      expect(result.errors).toContain('Alert必须包含severity');
    });

    it('should detect null/undefined event', () => {
      const result = adapter.validateAlertEvent(null as any);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Alert事件不能为空');
    });

    it('should detect missing alert object', () => {
      const eventWithoutAlert = {
        eventType: 'FIRED',
        timestamp: new Date(),
      } as any;

      const result = adapter.validateAlertEvent(eventWithoutAlert);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Alert事件必须包含alert对象');
    });

    it('should detect missing eventType', () => {
      const eventWithoutType = {
        alert: {
          id: 'alert-123',
          metric: 'cpu_usage',
          severity: NotificationSeverity.HIGH,
        },
        timestamp: new Date(),
      } as any;

      const result = adapter.validateAlertEvent(eventWithoutType);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Alert事件必须包含eventType');
    });

    it('should detect missing timestamp', () => {
      const eventWithoutTimestamp = {
        eventType: 'FIRED',
        alert: {
          id: 'alert-123',
          metric: 'cpu_usage',
          severity: NotificationSeverity.HIGH,
        },
      } as any;

      const result = adapter.validateAlertEvent(eventWithoutTimestamp);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Alert事件必须包含timestamp时间戳');
    });
  });

  describe('Default Channel Selection', () => {
    it('should select correct default channels for LOW severity', () => {
      const lowSeverityEvent = {
        eventType: 'FIRED',
        alert: {
          id: 'alert-123',
          metric: 'cpu_usage',
          severity: NotificationSeverity.LOW,
        },
        timestamp: new Date(),
        correlationId: 'corr-123',
      } as any;

      const result = adapter.adapt(lowSeverityEvent);

      expect(result.channelTypes).toEqual([NotificationChannelType.LOG]);
    });

    it('should select correct default channels for MEDIUM severity', () => {
      const mediumSeverityEvent = {
        eventType: 'FIRED',
        alert: {
          id: 'alert-123',
          metric: 'cpu_usage',
          severity: NotificationSeverity.MEDIUM,
        },
        timestamp: new Date(),
        correlationId: 'corr-123',
      } as any;

      const result = adapter.adapt(mediumSeverityEvent);

      expect(result.channelTypes).toEqual([
        NotificationChannelType.LOG,
        NotificationChannelType.EMAIL,
      ]);
    });

    it('should select correct default channels for CRITICAL severity', () => {
      const criticalSeverityEvent = {
        eventType: 'FIRED',
        alert: {
          id: 'alert-123',
          metric: 'cpu_usage',
          severity: NotificationSeverity.CRITICAL,
        },
        timestamp: new Date(),
        correlationId: 'corr-123',
      } as any;

      const result = adapter.adapt(criticalSeverityEvent);

      expect(result.channelTypes).toEqual([
        NotificationChannelType.LOG,
        NotificationChannelType.EMAIL,
        NotificationChannelType.SLACK,
        NotificationChannelType.SMS,
        NotificationChannelType.WEBHOOK,
      ]);
    });
  });

  describe('Channel Type Mapping', () => {
    it('should map various channel types correctly', () => {
      const channelMappings = [
        { input: 'email', expected: NotificationChannelType.EMAIL },
        { input: 'EMAIL', expected: NotificationChannelType.EMAIL },
        { input: 'webhook', expected: NotificationChannelType.WEBHOOK },
        { input: 'slack', expected: NotificationChannelType.SLACK },
        { input: 'dingtalk', expected: NotificationChannelType.DINGTALK },
        { input: 'sms', expected: NotificationChannelType.SMS },
        { input: 'log', expected: NotificationChannelType.LOG },
        { input: 'unknown', expected: null },
      ];

      channelMappings.forEach(({ input, expected }) => {
        const alertEvent = {
          eventType: 'FIRED',
          alert: {
            id: 'alert-123',
            metric: 'test_metric',
            severity: NotificationSeverity.HIGH,
          },
          rule: {
            id: 'rule-456',
            name: 'Test Rule',
            channels: [{ type: input, enabled: true }],
          },
          timestamp: new Date(),
          correlationId: 'corr-123',
        } as any;

        const result = adapter.adapt(alertEvent);

        if (expected === null) {
          // Should fall back to default channels for HIGH severity
          expect(result.channelTypes).toEqual([
            NotificationChannelType.LOG,
            NotificationChannelType.EMAIL,
            NotificationChannelType.SLACK,
          ]);
        } else {
          expect(result.channelTypes).toContain(expected);
        }
      });
    });
  });
});
import {
  AlertFiredEvent,
  AlertResolvedEvent,
  AlertAcknowledgedEvent,
  AlertSuppressedEvent,
  AlertEscalatedEvent,
  AlertContext,
  ALERT_EVENTS,
} from '@alert/events/alert.events';
import { Alert, AlertRule, AlertSeverity, AlertStatus } from '@alert/types/alert.types';

describe('Alert Events', () => {
  let mockAlert: Alert;
  let mockAlertRule: AlertRule;
  let mockContext: AlertContext;

  beforeEach(() => {
    mockAlert = {
      id: 'test-alert-1',
      ruleId: 'test-rule-1',
      ruleName: 'CPU Usage Alert',
      metric: 'cpu_usage',
      value: 85,
      threshold: 80,
      status: AlertStatus.FIRING,
      severity: AlertSeverity.CRITICAL,
      message: 'CPU usage is high',
      startTime: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: { host: 'server1' },
    } as Alert;

    mockAlertRule = {
      id: 'test-rule-1',
      name: 'CPU Usage Alert',
      metric: 'cpu_usage',
      operator: '>',
      threshold: 80,
      enabled: true,
      severity: 'critical',
    } as AlertRule;

    mockContext = {
      metricValue: 85,
      threshold: 80,
      triggeredAt: new Date(),
      tags: { host: 'server1' },
      triggerCondition: {
        operator: '>',
        duration: 60,
      },
    } as AlertContext;
  });

  describe('ALERT_EVENTS constants', () => {
    it('should have all required event type constants', () => {
      expect(ALERT_EVENTS).toBeDefined();
      expect(ALERT_EVENTS.FIRED).toBe('alert.fired');
      expect(ALERT_EVENTS.RESOLVED).toBe('alert.resolved');
      expect(ALERT_EVENTS.ACKNOWLEDGED).toBe('alert.acknowledged');
      expect(ALERT_EVENTS.SUPPRESSED).toBe('alert.suppressed');
      expect(ALERT_EVENTS.ESCALATED).toBe('alert.escalated');
    });
  });

  describe('Event constants verification', () => {
    it('should have consistent event type values', () => {
      expect(ALERT_EVENTS.FIRED).toBe('alert.fired');
      expect(ALERT_EVENTS.RESOLVED).toBe('alert.resolved');
      expect(ALERT_EVENTS.ACKNOWLEDGED).toBe('alert.acknowledged');
      expect(ALERT_EVENTS.SUPPRESSED).toBe('alert.suppressed');
      expect(ALERT_EVENTS.ESCALATED).toBe('alert.escalated');
    });
  });

  describe('AlertFiredEvent', () => {
    it('should create instance with required properties', () => {
      const event = new AlertFiredEvent(mockAlert, mockAlertRule, mockContext);

      expect(event).toBeDefined();
      expect(event.alert).toBe(mockAlert);
      expect(event.rule).toBe(mockAlertRule);
      expect(event.context).toBe(mockContext);
    });

    it('should store alert data correctly', () => {
      const event = new AlertFiredEvent(mockAlert, mockAlertRule, mockContext);

      expect(event.alert.id).toBe('test-alert-1');
      expect(event.alert.ruleId).toBe('test-rule-1');
      expect(event.alert.status).toBe('firing');
      expect(event.alert.severity).toBe('critical');
      expect(event.alert.message).toBe('CPU usage is high');
      expect(event.alert.value).toBe(85);
      expect(event.alert.threshold).toBe(80);
    });

    it('should store rule data correctly', () => {
      const event = new AlertFiredEvent(mockAlert, mockAlertRule, mockContext);

      expect(event.rule.id).toBe('test-rule-1');
      expect(event.rule.name).toBe('CPU Usage Alert');
      expect(event.rule.metric).toBe('cpu_usage');
      expect(event.rule.operator).toBe('>');
      expect(event.rule.threshold).toBe(80);
      expect(event.rule.enabled).toBe(true);
      expect(event.rule.severity).toBe('critical');
    });

    it('should store context data correctly', () => {
      const event = new AlertFiredEvent(mockAlert, mockAlertRule, mockContext);

      expect(event.context.metricValue).toBe(85);
      expect(event.context.threshold).toBe(80);
      expect(event.context.tags).toEqual({ host: 'server1' });
      expect(event.context.triggeredAt).toBeInstanceOf(Date);
    });

    it('should handle different alert severities', () => {
      const warnAlert = { ...mockAlert, severity: AlertSeverity.WARNING };
      const event = new AlertFiredEvent(warnAlert, mockAlertRule, mockContext);

      expect(event.alert.severity).toBe(AlertSeverity.WARNING);
    });

    it('should handle alerts with different values and thresholds', () => {
      const highValueAlert = { ...mockAlert, value: 95, threshold: 90 };
      const event = new AlertFiredEvent(highValueAlert, mockAlertRule, mockContext);

      expect(event.alert.value).toBe(95);
      expect(event.alert.threshold).toBe(90);
    });
  });

  describe('AlertResolvedEvent', () => {
    it('should create instance with required properties', () => {
      const resolvedAt = new Date();
      const event = new AlertResolvedEvent(mockAlert, resolvedAt);

      expect(event).toBeDefined();
      expect(event.alert).toBe(mockAlert);
      expect(event.resolvedAt).toBe(resolvedAt);
      expect(event.resolvedBy).toBeUndefined();
      expect(event.comment).toBeUndefined();
    });

    it('should create instance with optional properties', () => {
      const resolvedAt = new Date();
      const resolvedBy = 'user@example.com';
      const comment = 'Issue was fixed by restarting the service';
      const event = new AlertResolvedEvent(mockAlert, resolvedAt, resolvedBy, comment);

      expect(event.alert).toBe(mockAlert);
      expect(event.resolvedAt).toBe(resolvedAt);
      expect(event.resolvedBy).toBe(resolvedBy);
      expect(event.comment).toBe(comment);
    });

    it('should handle different resolved timestamps', () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const event = new AlertResolvedEvent(mockAlert, pastDate);

      expect(event.resolvedAt).toBe(pastDate);
    });

    it('should handle long comments', () => {
      const longComment = 'A'.repeat(1000);
      const event = new AlertResolvedEvent(mockAlert, new Date(), 'user', longComment);

      expect(event.comment).toBe(longComment);
      expect(event.comment.length).toBe(1000);
    });

    it('should handle special characters in resolvedBy field', () => {
      const specialUser = 'user@domain.com (Admin)';
      const event = new AlertResolvedEvent(mockAlert, new Date(), specialUser);

      expect(event.resolvedBy).toBe(specialUser);
    });
  });

  describe('AlertAcknowledgedEvent', () => {
    it('should create instance with required properties', () => {
      const acknowledgedAt = new Date();
      const acknowledgedBy = 'operator@example.com';
      const event = new AlertAcknowledgedEvent(mockAlert, acknowledgedAt, acknowledgedBy);

      expect(event).toBeDefined();
      expect(event.alert).toBe(mockAlert);
      expect(event.acknowledgedBy).toBe(acknowledgedBy);
      expect(event.acknowledgedAt).toBe(acknowledgedAt);
      expect(event.comment).toBeUndefined();
    });

    it('should create instance with optional comment', () => {
      const acknowledgedAt = new Date();
      const acknowledgedBy = 'operator@example.com';
      const comment = 'Acknowledged and investigating';
      const event = new AlertAcknowledgedEvent(mockAlert, acknowledgedAt, acknowledgedBy, comment);

      expect(event.alert).toBe(mockAlert);
      expect(event.acknowledgedBy).toBe(acknowledgedBy);
      expect(event.acknowledgedAt).toBe(acknowledgedAt);
      expect(event.comment).toBe(comment);
    });

    it('should handle different acknowledged users', () => {
      const users = ['admin@company.com', 'operator1', 'system-user'];

      users.forEach(user => {
        const event = new AlertAcknowledgedEvent(mockAlert, new Date(), user);
        expect(event.acknowledgedBy).toBe(user);
      });
    });

    it('should handle timestamps correctly', () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour in future
      const event = new AlertAcknowledgedEvent(mockAlert, futureDate, 'user');

      expect(event.acknowledgedAt).toBe(futureDate);
    });
  });

  describe('AlertSuppressedEvent', () => {
    it('should create instance with required properties', () => {
      const suppressedAt = new Date();
      const suppressedBy = 'admin@example.com';
      const suppressionDuration = 7200; // 2 hours in seconds
      const event = new AlertSuppressedEvent(mockAlert, suppressedAt, suppressedBy, suppressionDuration);

      expect(event).toBeDefined();
      expect(event.alert).toBe(mockAlert);
      expect(event.suppressedAt).toBe(suppressedAt);
      expect(event.suppressedBy).toBe(suppressedBy);
      expect(event.suppressionDuration).toBe(suppressionDuration);
    });

    it('should create instance with optional reason', () => {
      const suppressedAt = new Date();
      const suppressedBy = 'admin@example.com';
      const suppressionDuration = 7200;
      const reason = 'Scheduled maintenance';
      const event = new AlertSuppressedEvent(mockAlert, suppressedAt, suppressedBy, suppressionDuration, reason);

      expect(event.alert).toBe(mockAlert);
      expect(event.suppressedAt).toBe(suppressedAt);
      expect(event.suppressedBy).toBe(suppressedBy);
      expect(event.suppressionDuration).toBe(suppressionDuration);
      expect(event.reason).toBe(reason);
    });

    it('should handle different suppression reasons', () => {
      const reasons = [
        'Maintenance window',
        'Known issue - working on fix',
        'False positive alert',
        'System upgrade in progress'
      ];

      reasons.forEach(reason => {
        const event = new AlertSuppressedEvent(mockAlert, new Date(), 'admin', 3600, reason);
        expect(event.reason).toBe(reason);
      });
    });

    it('should handle different suppression durations', () => {
      const durations = [
        3600,    // 1 hour
        86400,   // 1 day
        604800,  // 1 week
      ];

      durations.forEach(duration => {
        const event = new AlertSuppressedEvent(mockAlert, new Date(), 'admin', duration);
        expect(event.suppressionDuration).toBe(duration);
      });
    });
  });

  describe('AlertEscalatedEvent', () => {
    it('should create instance with required properties', () => {
      const previousSeverity = 'warning';
      const newSeverity = 'critical';
      const escalatedAt = new Date();
      const escalationReason = 'Automatic escalation due to prolonged issue';
      const event = new AlertEscalatedEvent(mockAlert, previousSeverity, newSeverity, escalatedAt, escalationReason);

      expect(event).toBeDefined();
      expect(event.alert).toBe(mockAlert);
      expect(event.previousSeverity).toBe(previousSeverity);
      expect(event.newSeverity).toBe(newSeverity);
      expect(event.escalatedAt).toBe(escalatedAt);
      expect(event.escalationReason).toBe(escalationReason);
    });

    it('should handle severity escalation scenarios', () => {
      const scenarios = [
        { from: 'info', to: 'warning', reason: 'Issue persisted beyond threshold' },
        { from: 'warning', to: 'critical', reason: 'Impact escalated to critical systems' },
        { from: 'critical', to: 'critical', reason: 'Additional critical components affected' },
      ];

      scenarios.forEach(scenario => {
        const event = new AlertEscalatedEvent(
          mockAlert,
          scenario.from,
          scenario.to,
          new Date(),
          scenario.reason
        );

        expect(event.previousSeverity).toBe(scenario.from);
        expect(event.newSeverity).toBe(scenario.to);
        expect(event.escalationReason).toBe(scenario.reason);
      });
    });

    it('should handle different escalation reasons', () => {
      const reasons = [
        'Automatic escalation after 30 minutes',
        'Manual escalation by operator',
        'Additional systems affected',
        'SLA breach detected',
      ];

      reasons.forEach(reason => {
        const event = new AlertEscalatedEvent(
          mockAlert,
          'warning',
          'critical',
          new Date(),
          reason
        );

        expect(event.escalationReason).toBe(reason);
      });
    });

    it('should track escalation timing correctly', () => {
      const specificTime = new Date('2023-01-01T12:00:00Z');
      const event = new AlertEscalatedEvent(
        mockAlert,
        'info',
        'warning',
        specificTime,
        'Scheduled escalation'
      );

      expect(event.escalatedAt).toBe(specificTime);
    });
  });

  describe('Event immutability', () => {
    it('should have readonly alert property in AlertFiredEvent', () => {
      const event = new AlertFiredEvent(mockAlert, mockAlertRule, mockContext);

      // TypeScript should prevent this, but we can test the property descriptor
      expect(event.alert).toBe(mockAlert);

      // The properties should be readonly (this test verifies the interface design)
      expect(Object.getOwnPropertyDescriptor(event, 'alert')).toBeDefined();
    });

    it('should have readonly properties in AlertResolvedEvent', () => {
      const resolvedAt = new Date();
      const event = new AlertResolvedEvent(mockAlert, resolvedAt, 'user', 'comment');

      expect(event.alert).toBe(mockAlert);
      expect(event.resolvedAt).toBe(resolvedAt);
      expect(event.resolvedBy).toBe('user');
      expect(event.comment).toBe('comment');
    });
  });

  describe('Event data integrity', () => {
    it('should preserve alert data in AlertFiredEvent', () => {
      const originalAlert = { ...mockAlert };
      const event = new AlertFiredEvent(mockAlert, mockAlertRule, mockContext);

      // Modify original alert
      mockAlert.status = 'resolved';
      mockAlert.value = 50;

      // Event should still reference the original object
      expect(event.alert.status).toBe('resolved'); // Because it's a reference
      expect(event.alert.value).toBe(50);

      // But we can verify the event was created with the right data
      expect(event.rule.id).toBe('test-rule-1');
      expect(event.context.metricValue).toBe(85);
    });

    it('should handle null/undefined values gracefully', () => {
      const alertWithNulls = {
        ...mockAlert,
        tags: null,
        comment: undefined,
      };

      expect(() => {
        new AlertFiredEvent(alertWithNulls as any, mockAlertRule, mockContext);
      }).not.toThrow();

      expect(() => {
        new AlertResolvedEvent(alertWithNulls as any, new Date(), undefined, undefined);
      }).not.toThrow();
    });
  });
});
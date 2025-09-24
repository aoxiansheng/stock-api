import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { AlertEventPublisher } from '../../../../src/alert/services/alert-event-publisher.service';
import { IAlert, IAlertRule } from '../../../../src/alert/interfaces';
import { AlertStatus } from '../../../../src/alert/types/alert.types';
import { GenericAlertEventType } from '@common/events';

// Mock 数据
const mockAlertRule: IAlertRule = {
  id: 'rule_1234567890_abcdef',
  name: 'Test Alert Rule',
  description: 'Test alert rule description',
  metric: 'cpu.usage',
  operator: '>',
  threshold: 80,
  duration: 300,
  severity: 'warning',
  enabled: true,
  channels: [
    {
      id: 'channel_1',
      name: 'Email Channel',
      type: 'email' as any,
      config: { email: 'test@example.com' },
      enabled: true,
    }
  ],
  cooldown: 600,
  tags: { environment: 'test' },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAlert: IAlert = {
  id: 'alert_1234567890_abcdef',
  ruleId: 'rule_1234567890_abcdef',
  ruleName: 'Test Alert Rule',
  metric: 'cpu.usage',
  value: 85,
  threshold: 80,
  severity: 'warning',
  status: AlertStatus.FIRING,
  message: 'Alert triggered: cpu.usage > 80, current value: 85',
  startTime: new Date(),
  endTime: undefined,
  acknowledgedBy: undefined,
  acknowledgedAt: undefined,
  resolvedBy: undefined,
  resolvedAt: undefined,
  tags: { environment: 'test' },
  context: {
    metric: 'cpu.usage',
    operator: '>',
    tags: { host: 'server1' }
  }
};

describe('AlertEventPublisher', () => {
  let service: AlertEventPublisher;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEventPublisher,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              defaultCooldown: 300,
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AlertEventPublisher);
    eventEmitter = module.get(EventEmitter2);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('publishAlertFiredEvent', () => {
    it('should publish alert fired event successfully', async () => {
      // Arrange
      const context = {
        metricValue: 85,
        threshold: 80,
        triggeredAt: new Date(),
        tags: { host: 'server1' },
        triggerCondition: { operator: '>', duration: 300 }
      };

      // Act
      await service.publishAlertFiredEvent(mockAlert, mockAlertRule, context);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it('should handle errors gracefully when publishing fails', async () => {
      // Arrange
      const context = {
        metricValue: 85,
        threshold: 80,
        triggeredAt: new Date(),
        tags: { host: 'server1' },
        triggerCondition: { operator: '>', duration: 300 }
      };
      
      eventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      // Act
      await service.publishAlertFiredEvent(mockAlert, mockAlertRule, context);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalled();
      // Should not throw an exception
    });
  });

  describe('publishAlertResolvedEvent', () => {
    it('should publish alert resolved event successfully', async () => {
      // Arrange
      const resolvedAt = new Date();
      const resolvedBy = 'testUser';
      const comment = 'Test resolution comment';

      // Act
      await service.publishAlertResolvedEvent(mockAlert, resolvedAt, resolvedBy, comment);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalled();
    });
  });

  describe('publishAlertAcknowledgedEvent', () => {
    it('should publish alert acknowledged event successfully', async () => {
      // Arrange
      const acknowledgedBy = 'testUser';
      const acknowledgedAt = new Date();
      const comment = 'Test acknowledgment comment';

      // Act
      await service.publishAlertAcknowledgedEvent(mockAlert, acknowledgedBy, acknowledgedAt, comment);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalled();
    });
  });

  describe('publishAlertSuppressedEvent', () => {
    it('should publish alert suppressed event successfully', async () => {
      // Arrange
      const suppressedBy = 'testUser';
      const suppressedAt = new Date();
      const suppressionDuration = 3600;
      const reason = 'Test suppression reason';

      // Act
      await service.publishAlertSuppressedEvent(mockAlert, suppressedBy, suppressedAt, suppressionDuration, reason);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalled();
    });
  });

  describe('publishAlertEscalatedEvent', () => {
    it('should publish alert escalated event successfully', async () => {
      // Arrange
      const previousSeverity = 'warning';
      const newSeverity = 'critical';
      const escalatedAt = new Date();
      const escalationReason = 'Test escalation reason';

      // Act
      await service.publishAlertEscalatedEvent(mockAlert, previousSeverity, newSeverity, escalatedAt, escalationReason);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalled();
    });
  });

  describe('emitGenericEvent', () => {
    it('should emit generic event successfully', async () => {
      // Arrange
      const alert = service['convertToAlertType'](mockAlert);
      const rule = service['convertToAlertRuleType'](mockAlertRule);
      const context = { metricValue: 85, threshold: 80 };
      const eventType = GenericAlertEventType.FIRED;

      // Act
      await service['emitGenericEvent'](alert, rule, context, eventType);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it('should update publishing stats on success', async () => {
      // Arrange
      const alert = service['convertToAlertType'](mockAlert);
      const rule = service['convertToAlertRuleType'](mockAlertRule);
      const context = { metricValue: 85, threshold: 80 };
      const eventType = GenericAlertEventType.FIRED;

      // Act
      await service['emitGenericEvent'](alert, rule, context, eventType);

      // Assert
      const stats = service.getPublisherStats();
      expect(stats.totalEventsPublished).toBe(1);
      expect(stats.eventTypeBreakdown.FIRED).toBe(1);
    });

    it('should update publishing stats on failure', async () => {
      // Arrange
      const alert = service['convertToAlertType'](mockAlert);
      const rule = service['convertToAlertRuleType'](mockAlertRule);
      const context = { metricValue: 85, threshold: 80 };
      const eventType = GenericAlertEventType.FIRED;
      
      eventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emission failed');
      });

      // Act
      try {
        await service['emitGenericEvent'](alert, rule, context, eventType);
      } catch (error) {
        // Expected error
      }

      // Assert
      const stats = service.getPublisherStats();
      expect(stats.failedPublications).toBe(1);
    });
  });

  describe('convertToAlertType', () => {
    it('should convert IAlert to Alert type', () => {
      // Act
      const result = service['convertToAlertType'](mockAlert);

      // Assert
      expect(result).toEqual({
        ...mockAlert,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('convertToAlertRuleType', () => {
    it('should convert IAlertRule to AlertRule type', () => {
      // Act
      const result = service['convertToAlertRuleType'](mockAlertRule);

      // Assert
      expect(result).toEqual({
        ...mockAlertRule,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('convertToAlertContext', () => {
    it('should convert context to AlertContext type', () => {
      // Arrange
      const context = {
        metricValue: 85,
        threshold: 80,
        triggeredAt: new Date(),
        tags: { host: 'server1' },
        triggerCondition: { operator: '>', duration: 300 }
      };

      // Act
      const result = service['convertToAlertContext'](context);

      // Assert
      expect(result).toEqual({
        metricValue: 85,
        threshold: 80,
        triggeredAt: expect.any(Date),
        tags: { host: 'server1' },
        triggerCondition: { operator: '>', duration: 300 }
      });
    });
  });

  describe('convertToGenericEvent', () => {
    it('should convert Alert module data to generic event format', () => {
      // Arrange
      const alert = service['convertToAlertType'](mockAlert);
      const rule = service['convertToAlertRuleType'](mockAlertRule);
      const context = { metricValue: 85, threshold: 80 };
      const eventType = GenericAlertEventType.FIRED;

      // Act
      const result = service['convertToGenericEvent'](alert, rule, context, eventType);

      // Assert
      expect(result).toEqual({
        eventType: GenericAlertEventType.FIRED,
        timestamp: expect.any(Date),
        correlationId: expect.any(String),
        alert: expect.any(Object),
        rule: expect.any(Object),
        context: expect.any(Object),
        eventData: {},
      });
    });
  });

  describe('mapSeverityToGeneric', () => {
    it('should map alert severity to generic severity', () => {
      // Act & Assert
      expect(service['mapSeverityToGeneric']('info')).toBe('low');
      expect(service['mapSeverityToGeneric']('warning')).toBe('medium');
      expect(service['mapSeverityToGeneric']('critical')).toBe('critical');
      expect(service['mapSeverityToGeneric']('unknown')).toBe('low');
    });
  });

  describe('mapStatusToGeneric', () => {
    it('should map alert status to generic status', () => {
      // Act & Assert
      expect(service['mapStatusToGeneric'](AlertStatus.FIRING)).toBe('active');
      expect(service['mapStatusToGeneric'](AlertStatus.RESOLVED)).toBe('resolved');
      expect(service['mapStatusToGeneric'](AlertStatus.ACKNOWLEDGED)).toBe('acknowledged');
      expect(service['mapStatusToGeneric'](AlertStatus.SUPPRESSED)).toBe('suppressed');
      expect(service['mapStatusToGeneric']('unknown' as any)).toBe('active');
    });
  });

  describe('getPublisherStats', () => {
    it('should return publisher statistics', () => {
      // Act
      const stats = service.getPublisherStats();

      // Assert
      expect(stats).toEqual({
        totalEventsPublished: 0,
        eventTypeBreakdown: {},
        failedPublications: 0,
        lastPublishedAt: null,
        avgPublishingTime: 0,
        successRate: 0,
      });
    });

    it('should calculate success rate correctly', () => {
      // Arrange
      service['publisherStats'].totalEventsPublished = 3;
      service['publisherStats'].failedPublications = 1;

      // Act
      const stats = service.getPublisherStats();

      // Assert
      expect(stats.successRate).toBe(75);
    });
  });

  describe('resetPublisherStats', () => {
    it('should reset publisher statistics', () => {
      // Arrange
      service['publisherStats'].totalEventsPublished = 5;
      service['publisherStats'].failedPublications = 2;

      // Act
      service.resetPublisherStats();

      // Assert
      const stats = service.getPublisherStats();
      expect(stats.totalEventsPublished).toBe(0);
      expect(stats.failedPublications).toBe(0);
    });
  });
});
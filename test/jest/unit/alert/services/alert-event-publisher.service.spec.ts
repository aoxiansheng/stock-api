import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AlertEventPublisher } from '@alert/services/alert-event-publisher.service';
import { IAlert, IAlertRule } from '@alert/interfaces';
import { AlertSeverity, AlertStatus } from '@alert/types/alert.types';
import { Operator } from '@alert/constants';
import { GenericAlertEventType, GenericAlertSeverity, GenericAlertStatus, GENERIC_EVENT_TYPES } from '@common/events';

describe('AlertEventPublisher', () => {
  let service: AlertEventPublisher;
  let mockEventEmitter: any;
  let mockConfigService: any;
  let mockCacheConfig: any;

  const mockAlert: IAlert = {
    id: 'alert_123',
    ruleId: 'rule_456',
    ruleName: 'Test Rule',
    status: AlertStatus.FIRING,
    severity: AlertSeverity.CRITICAL,
    message: 'Test alert message',
    value: 85,
    threshold: 80,
    startTime: new Date('2025-09-24T10:00:00Z'),
    metric: 'cpu_usage',
    tags: { host: 'server-1' },
    context: { additionalInfo: 'test' }
  };

  const mockRule: IAlertRule = {
    id: 'rule_456',
    name: 'Test Rule',
    description: 'Test rule description',
    metric: 'cpu_usage',
    operator: '>',
    threshold: 80,
    duration: 60,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    cooldown: 300,
    channels: [],
    tags: { team: 'infrastructure' },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    mockCacheConfig = {
      defaultTtl: 300
    };

    mockEventEmitter = {
      emit: jest.fn()
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue({
        defaultCooldown: 300
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertEventPublisher,
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'cacheUnified', useValue: mockCacheConfig }
      ],
    }).compile();

    service = module.get<AlertEventPublisher>(AlertEventPublisher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct configuration', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('alert', expect.any(Object));
    });

    it('should get publisher statistics', () => {
      const stats = service.getPublisherStats();

      expect(stats).toHaveProperty('totalEventsPublished');
      expect(stats).toHaveProperty('eventTypeBreakdown');
      expect(stats).toHaveProperty('failedPublications');
      expect(stats).toHaveProperty('lastPublishedAt');
      expect(stats).toHaveProperty('avgPublishingTime');
      expect(stats).toHaveProperty('successRate');
      expect(stats.totalEventsPublished).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('should reset publisher statistics', () => {
      service.resetPublisherStats();
      const stats = service.getPublisherStats();

      expect(stats.totalEventsPublished).toBe(0);
      expect(stats.eventTypeBreakdown).toEqual({});
      expect(stats.failedPublications).toBe(0);
      expect(stats.lastPublishedAt).toBeNull();
    });
  });

  describe('Alert Fired Event', () => {
    it('should publish alert fired event successfully', async () => {
      const context = {
        metricValue: 85,
        threshold: 80,
        tags: { host: 'server-1' }
      };

      await service.publishAlertFiredEvent(mockAlert, mockRule, context);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        GENERIC_EVENT_TYPES.GENERIC_ALERT[GenericAlertEventType.FIRED],
        expect.objectContaining({
          eventType: GenericAlertEventType.FIRED,
          alert: expect.objectContaining({
            id: 'alert_123',
            severity: GenericAlertSeverity.CRITICAL,
            status: GenericAlertStatus.ACTIVE
          }),
          rule: expect.objectContaining({
            id: 'rule_456',
            name: 'Test Rule'
          }),
          timestamp: expect.any(Date),
          correlationId: expect.any(String)
        })
      );

      const stats = service.getPublisherStats();
      expect(stats.totalEventsPublished).toBe(1);
      expect(stats.eventTypeBreakdown[GenericAlertEventType.FIRED]).toBe(1);
    });

    it('should handle alert fired event publish errors gracefully', async () => {
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emission error');
      });

      // Should not throw
      await expect(service.publishAlertFiredEvent(mockAlert, mockRule, {})).resolves.not.toThrow();

      const stats = service.getPublisherStats();
      expect(stats.failedPublications).toBe(1);
    });

    it('should convert alert data to correct generic format', async () => {
      await service.publishAlertFiredEvent(mockAlert, mockRule, {});

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          alert: expect.objectContaining({
            id: 'alert_123',
            severity: GenericAlertSeverity.CRITICAL,
            status: GenericAlertStatus.ACTIVE,
            metric: 'cpu_usage',
            description: 'Test alert message',
            value: 85,
            threshold: 80,
            tags: { host: 'server-1' },
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date)
          })
        })
      );
    });

    it('should convert rule data to correct generic format', async () => {
      await service.publishAlertFiredEvent(mockAlert, mockRule, {});

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          rule: expect.objectContaining({
            id: 'rule_456',
            name: 'Test Rule',
            description: 'Test rule description',
            metric: 'cpu_usage',
            operator: '>',
            threshold: 80,
            enabled: true,
            cooldown: 300,
            tags: { team: 'infrastructure' }
          })
        })
      );
    });
  });

  describe('Alert Resolved Event', () => {
    it('should publish alert resolved event successfully', async () => {
      const resolvedAt = new Date('2025-09-24T11:00:00Z');
      const resolvedBy = 'admin';
      const comment = 'Resolved manually';

      await service.publishAlertResolvedEvent(mockAlert, resolvedAt, resolvedBy, comment);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        GENERIC_EVENT_TYPES.GENERIC_ALERT[GenericAlertEventType.RESOLVED],
        expect.objectContaining({
          eventType: GenericAlertEventType.RESOLVED,
          alert: expect.objectContaining({
            id: 'alert_123'
          }),
          eventData: expect.objectContaining({
            resolvedAt,
            resolvedBy,
            resolutionComment: comment
          })
        })
      );

      const stats = service.getPublisherStats();
      expect(stats.totalEventsPublished).toBe(1);
      expect(stats.eventTypeBreakdown[GenericAlertEventType.RESOLVED]).toBe(1);
    });

    it('should publish resolved event without optional parameters', async () => {
      const resolvedAt = new Date();

      await service.publishAlertResolvedEvent(mockAlert, resolvedAt);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          eventData: expect.objectContaining({
            resolvedAt,
            resolvedBy: undefined,
            resolutionComment: undefined
          })
        })
      );
    });

    it('should handle resolved event publish errors gracefully', async () => {
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emission error');
      });

      await expect(service.publishAlertResolvedEvent(mockAlert, new Date())).resolves.not.toThrow();
    });
  });

  describe('Alert Acknowledged Event', () => {
    it('should publish alert acknowledged event successfully', async () => {
      const acknowledgedBy = 'operator';
      const acknowledgedAt = new Date('2025-09-24T10:30:00Z');
      const comment = 'Working on it';

      await service.publishAlertAcknowledgedEvent(mockAlert, acknowledgedBy, acknowledgedAt, comment);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        GENERIC_EVENT_TYPES.GENERIC_ALERT[GenericAlertEventType.ACKNOWLEDGED],
        expect.objectContaining({
          eventType: GenericAlertEventType.ACKNOWLEDGED,
          alert: expect.objectContaining({
            id: 'alert_123'
          }),
          eventData: expect.objectContaining({
            acknowledgedBy,
            acknowledgedAt,
            acknowledgmentComment: comment
          })
        })
      );

      const stats = service.getPublisherStats();
      expect(stats.eventTypeBreakdown[GenericAlertEventType.ACKNOWLEDGED]).toBe(1);
    });

    it('should publish acknowledged event without comment', async () => {
      const acknowledgedBy = 'operator';
      const acknowledgedAt = new Date();

      await service.publishAlertAcknowledgedEvent(mockAlert, acknowledgedBy, acknowledgedAt);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          eventData: expect.objectContaining({
            acknowledgedBy,
            acknowledgedAt,
            acknowledgmentComment: undefined
          })
        })
      );
    });

    it('should handle acknowledged event publish errors gracefully', async () => {
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emission error');
      });

      await expect(service.publishAlertAcknowledgedEvent(
        mockAlert, 'operator', new Date()
      )).resolves.not.toThrow();
    });
  });

  describe('Alert Suppressed Event', () => {
    it('should publish alert suppressed event successfully', async () => {
      const suppressedBy = 'admin';
      const suppressedAt = new Date('2025-09-24T10:45:00Z');
      const suppressionDuration = 3600;
      const reason = 'Maintenance window';

      await service.publishAlertSuppressedEvent(
        mockAlert, suppressedBy, suppressedAt, suppressionDuration, reason
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        GENERIC_EVENT_TYPES.GENERIC_ALERT[GenericAlertEventType.SUPPRESSED],
        expect.objectContaining({
          eventType: GenericAlertEventType.SUPPRESSED,
          alert: expect.objectContaining({
            id: 'alert_123'
          }),
          eventData: expect.objectContaining({
            suppressedBy,
            suppressedAt,
            suppressionDuration,
            suppressionReason: reason
          })
        })
      );

      const stats = service.getPublisherStats();
      expect(stats.eventTypeBreakdown[GenericAlertEventType.SUPPRESSED]).toBe(1);
    });

    it('should publish suppressed event without reason', async () => {
      const suppressedBy = 'admin';
      const suppressedAt = new Date();
      const suppressionDuration = 1800;

      await service.publishAlertSuppressedEvent(
        mockAlert, suppressedBy, suppressedAt, suppressionDuration
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          eventData: expect.objectContaining({
            suppressedBy,
            suppressedAt,
            suppressionDuration,
            suppressionReason: undefined
          })
        })
      );
    });

    it('should handle suppressed event publish errors gracefully', async () => {
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emission error');
      });

      await expect(service.publishAlertSuppressedEvent(
        mockAlert, 'admin', new Date(), 3600
      )).resolves.not.toThrow();
    });
  });

  describe('Alert Escalated Event', () => {
    it('should publish alert escalated event successfully', async () => {
      const previousSeverity = 'warning';
      const newSeverity = 'critical';
      const escalatedAt = new Date('2025-09-24T12:00:00Z');
      const escalationReason = 'Impact increased';

      await service.publishAlertEscalatedEvent(
        mockAlert, previousSeverity, newSeverity, escalatedAt, escalationReason
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        GENERIC_EVENT_TYPES.GENERIC_ALERT[GenericAlertEventType.ESCALATED],
        expect.objectContaining({
          eventType: GenericAlertEventType.ESCALATED,
          alert: expect.objectContaining({
            id: 'alert_123'
          }),
          eventData: expect.objectContaining({
            previousSeverity: GenericAlertSeverity.MEDIUM,
            newSeverity: GenericAlertSeverity.CRITICAL,
            escalatedAt,
            escalationReason
          })
        })
      );

      const stats = service.getPublisherStats();
      expect(stats.eventTypeBreakdown[GenericAlertEventType.ESCALATED]).toBe(1);
    });

    it('should publish escalated event without reason', async () => {
      const previousSeverity = 'info';
      const newSeverity = 'high';
      const escalatedAt = new Date();

      await service.publishAlertEscalatedEvent(
        mockAlert, previousSeverity, newSeverity, escalatedAt
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          eventData: expect.objectContaining({
            previousSeverity: GenericAlertSeverity.LOW,
            newSeverity: GenericAlertSeverity.HIGH,
            escalatedAt,
            escalationReason: undefined
          })
        })
      );
    });

    it('should handle escalated event publish errors gracefully', async () => {
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error('Event emission error');
      });

      await expect(service.publishAlertEscalatedEvent(
        mockAlert, 'warning', 'critical', new Date()
      )).resolves.not.toThrow();
    });
  });

  describe('Severity and Status Mapping', () => {
    it('should map alert severities correctly', async () => {
      const testCases = [
        { input: 'info', expected: GenericAlertSeverity.LOW },
        { input: 'warning', expected: GenericAlertSeverity.MEDIUM },
        { input: 'critical', expected: GenericAlertSeverity.CRITICAL },
        { input: 'high', expected: GenericAlertSeverity.HIGH },
        { input: 'medium', expected: GenericAlertSeverity.MEDIUM },
        { input: 'low', expected: GenericAlertSeverity.LOW },
        { input: 'unknown', expected: GenericAlertSeverity.LOW }
      ];

      for (const testCase of testCases) {
        const alertWithSeverity = { ...mockAlert, severity: testCase.input as any };
        await service.publishAlertFiredEvent(alertWithSeverity, mockRule, {});

        expect(mockEventEmitter.emit).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.objectContaining({
            alert: expect.objectContaining({
              severity: testCase.expected
            })
          })
        );
      }
    });

    it('should map alert statuses correctly', async () => {
      const testCases = [
        { input: AlertStatus.FIRING, expected: GenericAlertStatus.ACTIVE },
        { input: AlertStatus.RESOLVED, expected: GenericAlertStatus.RESOLVED },
        { input: AlertStatus.ACKNOWLEDGED, expected: GenericAlertStatus.ACKNOWLEDGED },
        { input: AlertStatus.SUPPRESSED, expected: GenericAlertStatus.SUPPRESSED }
      ];

      for (const testCase of testCases) {
        const alertWithStatus = { ...mockAlert, status: testCase.input };
        await service.publishAlertFiredEvent(alertWithStatus, mockRule, {});

        expect(mockEventEmitter.emit).toHaveBeenLastCalledWith(
          expect.any(String),
          expect.objectContaining({
            alert: expect.objectContaining({
              status: testCase.expected
            })
          })
        );
      }
    });
  });

  describe('Generic Event Conversion', () => {
    it('should create default rule when rule is null', async () => {
      await service.publishAlertResolvedEvent(mockAlert, new Date());

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          rule: expect.objectContaining({
            id: expect.stringContaining('default-rule-'),
            name: expect.stringContaining('Default rule for alert'),
            description: 'Auto-generated default rule',
            metric: 'cpu_usage',
            operator: 'gt',
            threshold: 80,
            enabled: true,
            channels: []
          })
        })
      );
    });

    it('should convert context correctly', async () => {
      const context = {
        metricValue: 95,
        threshold: 80,
        triggeredAt: new Date('2025-09-24T10:15:00Z'),
        tags: { environment: 'production' },
        triggerCondition: {
          operator: '>=',
          duration: 600,
          consecutiveFailures: 3
        },
        historicalData: [
          { timestamp: new Date('2025-09-24T10:10:00Z'), value: 90 },
          { timestamp: new Date('2025-09-24T10:15:00Z'), value: 95 }
        ],
        relatedAlerts: ['alert_789']
      };

      await service.publishAlertFiredEvent(mockAlert, mockRule, context);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: expect.objectContaining({
            metricValue: 95,
            threshold: 80,
            duration: 600,
            operator: '>=',
            evaluatedAt: context.triggeredAt,
            dataPoints: [
              { timestamp: context.historicalData[0].timestamp, value: 90 },
              { timestamp: context.historicalData[1].timestamp, value: 95 }
            ],
            metadata: expect.objectContaining({
              tags: { environment: 'production' },
              consecutiveFailures: 3,
              relatedAlerts: ['alert_789']
            })
          })
        })
      );
    });

    it('should handle missing context data gracefully', async () => {
      await service.publishAlertFiredEvent(mockAlert, mockRule, {});

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          context: expect.objectContaining({
            metricValue: 0,
            threshold: 0,
            duration: 300,
            operator: 'gt',
            evaluatedAt: expect.any(Date),
            dataPoints: [],
            metadata: expect.objectContaining({
              tags: {},
              consecutiveFailures: undefined,
              relatedAlerts: []
            })
          })
        })
      );
    });
  });

  describe('Statistics Tracking', () => {
    it('should track publishing time statistics', async () => {
      await service.publishAlertFiredEvent(mockAlert, mockRule, {});
      await service.publishAlertResolvedEvent(mockAlert, new Date());

      const stats = service.getPublisherStats();
      expect(stats.totalEventsPublished).toBe(2);
      expect(stats.avgPublishingTime).toBeGreaterThan(0);
      expect(stats.lastPublishedAt).toBeInstanceOf(Date);
    });

    it('should calculate success rate correctly', async () => {
      // Successful event
      await service.publishAlertFiredEvent(mockAlert, mockRule, {});

      // Failed event
      mockEventEmitter.emit.mockImplementationOnce(() => {
        throw new Error('Emission failed');
      });
      await service.publishAlertResolvedEvent(mockAlert, new Date());

      const stats = service.getPublisherStats();
      expect(stats.totalEventsPublished).toBe(1);
      expect(stats.failedPublications).toBe(1);
      expect(stats.successRate).toBe(50); // 1 success out of 2 total
    });

    it('should track event type breakdown', async () => {
      await service.publishAlertFiredEvent(mockAlert, mockRule, {});
      await service.publishAlertFiredEvent(mockAlert, mockRule, {});
      await service.publishAlertResolvedEvent(mockAlert, new Date());

      const stats = service.getPublisherStats();
      expect(stats.eventTypeBreakdown[GenericAlertEventType.FIRED]).toBe(2);
      expect(stats.eventTypeBreakdown[GenericAlertEventType.RESOLVED]).toBe(1);
    });

    it('should handle zero events correctly', () => {
      const stats = service.getPublisherStats();
      expect(stats.successRate).toBe(0);
      expect(stats.avgPublishingTime).toBe(0);
    });
  });

  describe('Configuration Handling', () => {
    it('should use default configuration when config service returns null', () => {
      mockConfigService.get.mockReturnValue(null);

      // Create new service instance with null config
      const module = Test.createTestingModule({
        providers: [
          AlertEventPublisher,
          { provide: EventEmitter2, useValue: mockEventEmitter },
          { provide: ConfigService, useValue: mockConfigService },
          { provide: 'cacheUnified', useValue: mockCacheConfig }
        ],
      }).compile();

      expect(() => module).not.toThrow();
    });

    it('should use cache config for default rule creation', async () => {
      await service.publishAlertResolvedEvent(mockAlert, new Date());

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          rule: expect.objectContaining({
            cooldown: mockCacheConfig.defaultTtl
          })
        })
      );
    });
  });
});
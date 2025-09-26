import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AlertLifecycleService } from '@alert/services/alert-lifecycle.service';
import { AlertHistoryRepository } from '@alert/repositories/alert-history.repository';
import { AlertEventPublisher } from '@alert/services/alert-event-publisher.service';
import { AlertCacheService } from '@alert/services/alert-cache.service';
import { IAlert, IAlertRule, IRuleEvaluationResult } from '@alert/interfaces';
import { AlertStatus, AlertSeverity } from '@alert/types/alert.types';
import { Operator } from '@alert/constants';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

describe('AlertLifecycleService', () => {
  let service: AlertLifecycleService;
  let mockAlertHistoryRepository: any;
  let mockAlertEventPublisher: any;
  let mockAlertCacheService: any;
  let mockConfigService: any;
  let mockAlertCacheLimits: any;

  const mockRule: IAlertRule = {
    id: '507f1f77bcf86cd799439011',
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

  const mockEvaluationResult: IRuleEvaluationResult = {
    ruleId: '507f1f77bcf86cd799439011',
    triggered: true,
    value: 85,
    threshold: 80,
    message: 'CPU usage exceeded threshold',
    evaluatedAt: new Date()
  };

  const mockAlert: IAlert = {
    id: '507f1f77bcf86cd799439012',
    ruleId: '507f1f77bcf86cd799439011',
    ruleName: 'Test Rule',
    status: AlertStatus.FIRING,
    severity: AlertSeverity.CRITICAL,
    message: 'CPU usage exceeded threshold',
    value: 85,
    threshold: 80,
    startTime: new Date(),
    metric: 'cpu_usage',
    tags: { team: 'infrastructure' },
    context: {}
  };

  beforeEach(async () => {
    mockAlertCacheLimits = {
      batchSize: 100,
      ttl: 300
    };

    mockAlertHistoryRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn()
    };

    mockAlertEventPublisher = {
      publishAlertFiredEvent: jest.fn(),
      publishAlertResolvedEvent: jest.fn(),
      publishAlertAcknowledgedEvent: jest.fn(),
      publishAlertSuppressedEvent: jest.fn(),
      publishAlertEscalatedEvent: jest.fn()
    };

    mockAlertCacheService = {
      setActiveAlert: jest.fn(),
      clearActiveAlert: jest.fn(),
      addToTimeseries: jest.fn()
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue({
        defaultCooldown: 300
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertLifecycleService,
        { provide: AlertHistoryRepository, useValue: mockAlertHistoryRepository },
        { provide: AlertEventPublisher, useValue: mockAlertEventPublisher },
        { provide: AlertCacheService, useValue: mockAlertCacheService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'CONFIGURATION(alertCache)', useValue: mockAlertCacheLimits }
      ],
    }).compile();

    service = module.get<AlertLifecycleService>(AlertLifecycleService);
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

    it('should get lifecycle statistics', () => {
      const stats = service.getLifecycleStats();

      expect(stats).toHaveProperty('totalAlertsCreated');
      expect(stats).toHaveProperty('totalAlertsResolved');
      expect(stats).toHaveProperty('totalAlertsAcknowledged');
      expect(stats).toHaveProperty('averageResolutionTime');
    });
  });

  describe('Create Alert', () => {
    it('should create alert successfully', async () => {
      const expectedAlert = {
        ...mockAlert,
        id: expect.stringMatching(/^alert_\d+_\w+$/),
        startTime: expect.any(Date),
        status: AlertStatus.FIRING
      };

      mockAlertHistoryRepository.create.mockResolvedValue(expectedAlert);
      mockAlertCacheService.setActiveAlert.mockResolvedValue(undefined);
      mockAlertEventPublisher.publishAlertFiredEvent.mockResolvedValue(undefined);

      const result = await service.createAlert(mockEvaluationResult, mockRule);

      expect(mockAlertHistoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: mockRule.id,
          ruleName: mockRule.name,
          metric: mockRule.metric,
          value: mockEvaluationResult.value,
          threshold: mockEvaluationResult.threshold,
          severity: mockRule.severity,
          message: mockEvaluationResult.message,
          tags: mockRule.tags,
          context: mockEvaluationResult.context,
          status: AlertStatus.FIRING,
          startTime: expect.any(Date)
        })
      );

      expect(mockAlertCacheService.setActiveAlert).toHaveBeenCalledWith(
        mockRule.id,
        expectedAlert
      );

      expect(mockAlertEventPublisher.publishAlertFiredEvent).toHaveBeenCalledWith(
        expectedAlert,
        mockRule,
        expect.objectContaining({
          metricValue: mockEvaluationResult.value,
          threshold: mockEvaluationResult.threshold,
          triggeredAt: expect.any(Date),
          tags: mockRule.tags
        })
      );

      expect(result).toEqual(expectedAlert);
    });

    it('should handle create alert errors', async () => {
      mockAlertHistoryRepository.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createAlert(mockEvaluationResult, mockRule)).rejects.toThrow('Database error');
    });

    it('should generate unique alert IDs', async () => {
      // Mock the private method to test ID generation
      const generateAlertIdSpy = jest.spyOn(service as any, 'generateAlertId');
      generateAlertIdSpy.mockReturnValue('alert_1234567890_abc123');

      mockAlertHistoryRepository.create.mockResolvedValue(mockAlert);

      await service.createAlert(mockEvaluationResult, mockRule);

      expect(mockAlertHistoryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'alert_1234567890_abc123'
        })
      );

      generateAlertIdSpy.mockRestore();
    });
  });

  describe('Acknowledge Alert', () => {
    it('should acknowledge alert with object parameters', async () => {
      const params = {
        id: '507f1f77bcf86cd799439012',
        acknowledgedBy: 'operator',
        comment: 'Working on it'
      };

      const acknowledgedAlert = {
        ...mockAlert,
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: 'operator',
        acknowledgedAt: expect.any(Date)
      };

      mockAlertHistoryRepository.update.mockResolvedValue(acknowledgedAlert);
      mockAlertEventPublisher.publishAlertAcknowledgedEvent.mockResolvedValue(undefined);

      const result = await service.acknowledgeAlert(params);

      expect(mockAlertHistoryRepository.update).toHaveBeenCalledWith(
        params.id,
        expect.objectContaining({
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedBy: 'operator',
          acknowledgedAt: expect.any(Date)
        })
      );

      expect(mockAlertEventPublisher.publishAlertAcknowledgedEvent).toHaveBeenCalledWith(
        acknowledgedAlert,
        'operator',
        expect.any(Date),
        'Working on it'
      );

      expect(result).toEqual(acknowledgedAlert);
    });

    it('should acknowledge alert with traditional parameters', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      const acknowledgedBy = 'admin';

      const acknowledgedAlert = {
        ...mockAlert,
        status: AlertStatus.ACKNOWLEDGED
      };

      mockAlertHistoryRepository.update.mockResolvedValue(acknowledgedAlert);
      mockAlertEventPublisher.publishAlertAcknowledgedEvent.mockResolvedValue(undefined);

      const result = await service.acknowledgeAlert(alertId, acknowledgedBy);

      expect(mockAlertHistoryRepository.update).toHaveBeenCalledWith(
        alertId,
        expect.objectContaining({
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedBy,
          acknowledgedAt: expect.any(Date)
        })
      );

      expect(result).toEqual(acknowledgedAlert);
    });

    it('should handle invalid alert ID format in acknowledge', async () => {
      await expect(service.acknowledgeAlert('invalid-id', 'operator')).rejects.toThrow(BadRequestException);
    });

    it('should handle acknowledge errors', async () => {
      mockAlertHistoryRepository.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.acknowledgeAlert('507f1f77bcf86cd799439012', 'operator')).rejects.toThrow('Update failed');
    });

    it('should throw when alert not found during acknowledge', async () => {
      mockAlertHistoryRepository.update.mockResolvedValue(null);

      await expect(service.acknowledgeAlert('507f1f77bcf86cd799439012', 'operator')).rejects.toThrow();
    });
  });

  describe('Resolve Alert', () => {
    it('should resolve alert with object parameters', async () => {
      const params = {
        id: '507f1f77bcf86cd799439012',
        resolvedBy: 'admin',
        ruleId: '507f1f77bcf86cd799439011',
        comment: 'Fixed the issue'
      };

      const resolvedAlert = {
        ...mockAlert,
        status: AlertStatus.RESOLVED,
        resolvedBy: 'admin',
        resolvedAt: expect.any(Date),
        endTime: expect.any(Date)
      };

      mockAlertHistoryRepository.update.mockResolvedValue(resolvedAlert);
      mockAlertCacheService.clearActiveAlert.mockResolvedValue(undefined);
      mockAlertEventPublisher.publishAlertResolvedEvent.mockResolvedValue(undefined);

      const result = await service.resolveAlert(params);

      expect(mockAlertHistoryRepository.update).toHaveBeenCalledWith(
        params.id,
        expect.objectContaining({
          status: AlertStatus.RESOLVED,
          resolvedBy: 'admin',
          resolvedAt: expect.any(Date),
          endTime: expect.any(Date)
        })
      );

      expect(mockAlertCacheService.clearActiveAlert).toHaveBeenCalledWith(params.ruleId);

      expect(mockAlertEventPublisher.publishAlertResolvedEvent).toHaveBeenCalledWith(
        resolvedAlert,
        expect.any(Date),
        'admin',
        'Fixed the issue'
      );

      expect(result).toEqual(resolvedAlert);
    });

    it('should resolve alert with traditional parameters', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      const resolvedBy = 'system';
      const ruleId = '507f1f77bcf86cd799439011';

      const resolvedAlert = {
        ...mockAlert,
        status: AlertStatus.RESOLVED
      };

      mockAlertHistoryRepository.update.mockResolvedValue(resolvedAlert);
      mockAlertCacheService.clearActiveAlert.mockResolvedValue(undefined);
      mockAlertEventPublisher.publishAlertResolvedEvent.mockResolvedValue(undefined);

      const result = await service.resolveAlert(alertId, resolvedBy, ruleId);

      expect(mockAlertHistoryRepository.update).toHaveBeenCalledWith(
        alertId,
        expect.objectContaining({
          status: AlertStatus.RESOLVED,
          resolvedBy,
          resolvedAt: expect.any(Date),
          endTime: expect.any(Date)
        })
      );

      expect(mockAlertCacheService.clearActiveAlert).toHaveBeenCalledWith(ruleId);
      expect(result).toEqual(resolvedAlert);
    });

    it('should handle invalid alert ID format in resolve', async () => {
      await expect(service.resolveAlert('invalid-id', 'admin', '507f1f77bcf86cd799439011')).rejects.toThrow(BadRequestException);
    });

    it('should handle invalid rule ID format in resolve', async () => {
      await expect(service.resolveAlert('507f1f77bcf86cd799439012', 'admin', 'invalid-rule-id')).rejects.toThrow(BadRequestException);
    });

    it('should handle resolve errors', async () => {
      mockAlertHistoryRepository.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.resolveAlert('507f1f77bcf86cd799439012', 'admin', '507f1f77bcf86cd799439011')).rejects.toThrow('Update failed');
    });

    it('should throw when alert not found during resolve', async () => {
      mockAlertHistoryRepository.update.mockResolvedValue(null);

      await expect(service.resolveAlert('507f1f77bcf86cd799439012', 'admin', '507f1f77bcf86cd799439011')).rejects.toThrow();
    });
  });

  describe('Suppress Alert', () => {
    it('should suppress alert successfully', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      const suppressedBy = 'admin';
      const suppressionDuration = 3600;
      const reason = 'Maintenance window';

      const suppressedAlert = {
        ...mockAlert,
        status: AlertStatus.SUPPRESSED
      };

      mockAlertHistoryRepository.update.mockResolvedValue(suppressedAlert);
      mockAlertEventPublisher.publishAlertSuppressedEvent.mockResolvedValue(undefined);

      const result = await service.suppressAlert(alertId, suppressedBy, suppressionDuration, reason);

      expect(mockAlertHistoryRepository.update).toHaveBeenCalledWith(
        alertId,
        expect.objectContaining({
          status: AlertStatus.SUPPRESSED
        })
      );

      expect(mockAlertEventPublisher.publishAlertSuppressedEvent).toHaveBeenCalledWith(
        suppressedAlert,
        suppressedBy,
        expect.any(Date),
        suppressionDuration,
        reason
      );

      expect(result).toEqual(suppressedAlert);
    });

    it('should suppress alert without reason', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      const suppressedBy = 'admin';
      const suppressionDuration = 1800;

      const suppressedAlert = { ...mockAlert, status: AlertStatus.SUPPRESSED };
      mockAlertHistoryRepository.update.mockResolvedValue(suppressedAlert);

      await service.suppressAlert(alertId, suppressedBy, suppressionDuration);

      expect(mockAlertEventPublisher.publishAlertSuppressedEvent).toHaveBeenCalledWith(
        suppressedAlert,
        suppressedBy,
        expect.any(Date),
        suppressionDuration,
        undefined
      );
    });

    it('should handle invalid alert ID format in suppress', async () => {
      await expect(service.suppressAlert('invalid-id', 'admin', 3600)).rejects.toThrow(BadRequestException);
    });

    it('should handle suppress errors', async () => {
      mockAlertHistoryRepository.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.suppressAlert('507f1f77bcf86cd799439012', 'admin', 3600)).rejects.toThrow('Update failed');
    });
  });

  describe('Escalate Alert', () => {
    it('should escalate alert successfully', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      const newSeverity = 'critical';
      const escalatedBy = 'manager';
      const reason = 'Impact increased';

      const existingAlert = { ...mockAlert, severity: AlertSeverity.WARNING };
      const escalatedAlert = { ...mockAlert, severity: AlertSeverity.CRITICAL };

      mockAlertHistoryRepository.findById.mockResolvedValue(existingAlert);
      mockAlertHistoryRepository.update.mockResolvedValue(escalatedAlert);
      mockAlertEventPublisher.publishAlertEscalatedEvent.mockResolvedValue(undefined);

      const result = await service.escalateAlert(alertId, newSeverity, escalatedBy, reason);

      expect(mockAlertHistoryRepository.findById).toHaveBeenCalledWith(alertId);
      expect(mockAlertHistoryRepository.update).toHaveBeenCalledWith(
        alertId,
        expect.objectContaining({
          severity: newSeverity
        })
      );

      expect(mockAlertEventPublisher.publishAlertEscalatedEvent).toHaveBeenCalledWith(
        escalatedAlert,
        AlertSeverity.WARNING,
        newSeverity,
        expect.any(Date),
        reason
      );

      expect(result).toEqual(escalatedAlert);
    });

    it('should escalate alert without reason', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      const newSeverity = 'high';
      const escalatedBy = 'operator';

      const existingAlert = { ...mockAlert, severity: AlertSeverity.WARNING };
      const escalatedAlert = { ...mockAlert, severity: AlertSeverity.CRITICAL };

      mockAlertHistoryRepository.findById.mockResolvedValue(existingAlert);
      mockAlertHistoryRepository.update.mockResolvedValue(escalatedAlert);

      await service.escalateAlert(alertId, newSeverity, escalatedBy);

      expect(mockAlertEventPublisher.publishAlertEscalatedEvent).toHaveBeenCalledWith(
        escalatedAlert,
        AlertSeverity.WARNING,
        newSeverity,
        expect.any(Date),
        undefined
      );
    });

    it('should handle invalid alert ID format in escalate', async () => {
      await expect(service.escalateAlert('invalid-id', 'critical', 'admin')).rejects.toThrow(BadRequestException);
    });

    it('should throw when alert not found for escalation', async () => {
      mockAlertHistoryRepository.findById.mockResolvedValue(null);

      await expect(service.escalateAlert('507f1f77bcf86cd799439012', 'critical', 'admin')).rejects.toThrow();
    });

    it('should throw when alert not found after update', async () => {
      mockAlertHistoryRepository.findById.mockResolvedValue(mockAlert);
      mockAlertHistoryRepository.update.mockResolvedValue(null);

      await expect(service.escalateAlert('507f1f77bcf86cd799439012', 'critical', 'admin')).rejects.toThrow();
    });

    it('should handle escalate errors', async () => {
      mockAlertHistoryRepository.findById.mockRejectedValue(new Error('Database error'));

      await expect(service.escalateAlert('507f1f77bcf86cd799439012', 'critical', 'admin')).rejects.toThrow('Database error');
    });
  });

  describe('Batch Update Alert Status', () => {
    it('should batch update alert status successfully', async () => {
      const alertIds = ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'];
      const status = AlertStatus.RESOLVED;
      const updatedBy = 'admin';

      mockAlertHistoryRepository.update.mockResolvedValue(mockAlert);

      const result = await service.batchUpdateAlertStatus(alertIds, status, updatedBy);

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockAlertHistoryRepository.update).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in batch update', async () => {
      const alertIds = ['507f1f77bcf86cd799439012', '507f1f77bcf86cd799439013'];
      const status = AlertStatus.RESOLVED;
      const updatedBy = 'admin';

      mockAlertHistoryRepository.update
        .mockResolvedValueOnce(mockAlert)
        .mockRejectedValueOnce(new Error('Update failed'));

      const result = await service.batchUpdateAlertStatus(alertIds, status, updatedBy);

      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Update failed');
    });

    it('should handle batch size limit exceeded', async () => {
      const alertIds = new Array(101).fill(0).map((_, i) => `507f1f77bcf86cd79943901${i.toString().padStart(1, '0')}`);
      const status = AlertStatus.RESOLVED;
      const updatedBy = 'admin';

      await expect(service.batchUpdateAlertStatus(alertIds, status, updatedBy)).rejects.toThrow();
    });

    it('should handle invalid alert IDs in batch update', async () => {
      const alertIds = ['invalid-id-1', 'invalid-id-2'];
      const status = AlertStatus.RESOLVED;
      const updatedBy = 'admin';

      await expect(service.batchUpdateAlertStatus(alertIds, status, updatedBy)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Get Alert By ID', () => {
    it('should get alert by ID successfully', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      mockAlertHistoryRepository.findById.mockResolvedValue(mockAlert);

      const result = await service.getAlertById(alertId);

      expect(mockAlertHistoryRepository.findById).toHaveBeenCalledWith(alertId);
      expect(result).toEqual(mockAlert);
    });

    it('should handle invalid alert ID format', async () => {
      await expect(service.getAlertById('invalid-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw when alert not found', async () => {
      mockAlertHistoryRepository.findById.mockResolvedValue(null);

      await expect(service.getAlertById('507f1f77bcf86cd799439012')).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      mockAlertHistoryRepository.findById.mockRejectedValue(new Error('Database error'));

      await expect(service.getAlertById('507f1f77bcf86cd799439012')).rejects.toThrow('Database error');
    });
  });

  describe('Process Alert', () => {
    it('should process alert successfully with ID', async () => {
      const alertData = {
        id: '507f1f77bcf86cd799439012',
        ruleId: '507f1f77bcf86cd799439011',
        data: { metric: 'cpu_usage', value: 90 },
        triggeredAt: new Date()
      };

      mockAlertHistoryRepository.findById.mockResolvedValue(mockAlert);
      mockAlertCacheService.addToTimeseries.mockResolvedValue(undefined);

      await service.processAlert(alertData);

      expect(mockAlertHistoryRepository.findById).toHaveBeenCalledWith(alertData.id);
      expect(mockAlertCacheService.addToTimeseries).toHaveBeenCalledWith(mockAlert);
    });

    it('should process alert successfully without ID', async () => {
      const alertData = {
        ruleId: '507f1f77bcf86cd799439011',
        data: { metric: 'cpu_usage', value: 90 }
      };

      await service.processAlert(alertData);

      expect(mockAlertHistoryRepository.findById).not.toHaveBeenCalled();
      expect(mockAlertCacheService.addToTimeseries).not.toHaveBeenCalled();
    });

    it('should handle invalid alert ID format in process', async () => {
      const alertData = {
        id: 'invalid-id',
        ruleId: '507f1f77bcf86cd799439011'
      };

      await expect(service.processAlert(alertData)).rejects.toThrow(BadRequestException);
    });

    it('should handle invalid rule ID format in process', async () => {
      const alertData = {
        ruleId: 'invalid-rule-id'
      };

      await expect(service.processAlert(alertData)).rejects.toThrow(BadRequestException);
    });

    it('should handle process errors gracefully', async () => {
      const alertData = {
        id: '507f1f77bcf86cd799439012',
        ruleId: '507f1f77bcf86cd799439011'
      };

      mockAlertHistoryRepository.findById.mockRejectedValue(new Error('Database error'));

      await expect(service.processAlert(alertData)).rejects.toThrow('Database error');
    });

    it('should handle missing alert during process', async () => {
      const alertData = {
        id: '507f1f77bcf86cd799439012',
        ruleId: '507f1f77bcf86cd799439011'
      };

      mockAlertHistoryRepository.findById.mockResolvedValue(null);

      // Should not throw, just skip timeseries addition
      await expect(service.processAlert(alertData)).resolves.not.toThrow();
      expect(mockAlertCacheService.addToTimeseries).not.toHaveBeenCalled();
    });
  });

  describe('Private Helper Methods', () => {
    it('should update alert status correctly for ACKNOWLEDGED', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      const status = AlertStatus.ACKNOWLEDGED;
      const updatedBy = 'operator';

      const updatedAlert = {
        ...mockAlert,
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: 'operator',
        acknowledgedAt: expect.any(Date)
      };

      mockAlertHistoryRepository.update.mockResolvedValue(updatedAlert);

      const result = await (service as any).updateAlertStatus(alertId, status, updatedBy);

      expect(mockAlertHistoryRepository.update).toHaveBeenCalledWith(
        alertId,
        expect.objectContaining({
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedBy: updatedBy,
          acknowledgedAt: expect.any(Date)
        })
      );

      expect(result).toEqual(updatedAlert);
    });

    it('should update alert status correctly for RESOLVED', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      const status = AlertStatus.RESOLVED;
      const updatedBy = 'admin';

      const updatedAlert = {
        ...mockAlert,
        status: AlertStatus.RESOLVED,
        resolvedBy: 'admin',
        resolvedAt: expect.any(Date),
        endTime: expect.any(Date)
      };

      mockAlertHistoryRepository.update.mockResolvedValue(updatedAlert);

      const result = await (service as any).updateAlertStatus(alertId, status, updatedBy);

      expect(mockAlertHistoryRepository.update).toHaveBeenCalledWith(
        alertId,
        expect.objectContaining({
          status: AlertStatus.RESOLVED,
          resolvedBy: updatedBy,
          resolvedAt: expect.any(Date),
          endTime: expect.any(Date)
        })
      );

      expect(result).toEqual(updatedAlert);
    });

    it('should handle update alert status when alert not found', async () => {
      mockAlertHistoryRepository.update.mockResolvedValue(null);

      await expect((service as any).updateAlertStatus(
        '507f1f77bcf86cd799439012',
        AlertStatus.RESOLVED,
        'admin'
      )).rejects.toThrow();
    });

    it('should generate unique alert ID', () => {
      const id1 = (service as any).generateAlertId();
      const id2 = (service as any).generateAlertId();

      expect(id1).toMatch(/^alert_\d+_\w+$/);
      expect(id2).toMatch(/^alert_\d+_\w+$/);
      expect(id1).not.toBe(id2);
    });
  });
});
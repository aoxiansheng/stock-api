import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AlertLifecycleService } from '../../../../src/alert/services/alert-lifecycle.service';
import { AlertHistoryRepository } from '../../../../src/alert/repositories/alert-history.repository';
import { AlertEventPublisher } from '../../../../src/alert/services/alert-event-publisher.service';
import { AlertCacheService } from '../../../../src/alert/services/alert-cache.service';
import { IAlert, IAlertRule, IRuleEvaluationResult } from '../../../../src/alert/interfaces';
import { AlertStatus } from '../../../../src/alert/types/alert.types';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';
import { DatabaseValidationUtils } from '@common/utils/database.utils';

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

const mockEvaluationResult: IRuleEvaluationResult = {
  ruleId: 'rule_1234567890_abcdef',
  triggered: true,
  value: 85,
  threshold: 80,
  message: 'Alert triggered: cpu.usage > 80, current value: 85',
  evaluatedAt: new Date(),
  context: {
    metric: 'cpu.usage',
    operator: '>',
    tags: { host: 'server1' }
  }
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

describe('AlertLifecycleService', () => {
  let service: AlertLifecycleService;
  let alertHistoryRepository: jest.Mocked<AlertHistoryRepository>;
  let alertEventPublisher: jest.Mocked<AlertEventPublisher>;
  let alertCacheService: jest.Mocked<AlertCacheService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertLifecycleService,
        {
          provide: AlertHistoryRepository,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: AlertEventPublisher,
          useValue: {
            publishAlertFiredEvent: jest.fn(),
            publishAlertAcknowledgedEvent: jest.fn(),
            publishAlertResolvedEvent: jest.fn(),
            publishAlertSuppressedEvent: jest.fn(),
            publishAlertEscalatedEvent: jest.fn(),
          },
        },
        {
          provide: AlertCacheService,
          useValue: {
            setActiveAlert: jest.fn(),
            clearActiveAlert: jest.fn(),
            addToTimeseries: jest.fn(),
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

    service = module.get(AlertLifecycleService);
    alertHistoryRepository = module.get(AlertHistoryRepository);
    alertEventPublisher = module.get(AlertEventPublisher);
    alertCacheService = module.get(AlertCacheService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAlert', () => {
    it('should create a new alert successfully', async () => {
      // Arrange
      alertHistoryRepository.create.mockResolvedValue(mockAlert);
      alertCacheService.setActiveAlert.mockResolvedValue();

      // Act
      const result = await service.createAlert(mockEvaluationResult, mockAlertRule);

      // Assert
      expect(alertHistoryRepository.create).toHaveBeenCalled();
      expect(alertCacheService.setActiveAlert).toHaveBeenCalledWith(mockAlert.ruleId, mockAlert);
      expect(alertEventPublisher.publishAlertFiredEvent).toHaveBeenCalled();
      expect(result).toEqual(mockAlert);
    });

    it('should handle repository errors during alert creation', async () => {
      // Arrange
      alertHistoryRepository.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.createAlert(mockEvaluationResult, mockAlertRule))
        .rejects
        .toThrow('Database error');
      
      expect(alertHistoryRepository.create).toHaveBeenCalled();
      expect(alertCacheService.setActiveAlert).not.toHaveBeenCalled();
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert using traditional parameters', async () => {
      // Arrange
      const updatedAlert = {
        ...mockAlert,
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: 'testUser',
        acknowledgedAt: new Date(),
      };
      
      alertHistoryRepository.update.mockResolvedValue(updatedAlert);

      // Act
      const result = await service.acknowledgeAlert('alert_1234567890_abcdef', 'testUser', 'Test comment');

      // Assert
      expect(alertHistoryRepository.update).toHaveBeenCalled();
      expect(alertEventPublisher.publishAlertAcknowledgedEvent).toHaveBeenCalled();
      expect(result.status).toBe(AlertStatus.ACKNOWLEDGED);
    });

    it('should acknowledge an alert using object parameters', async () => {
      // Arrange
      const updatedAlert = {
        ...mockAlert,
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: 'testUser',
        acknowledgedAt: new Date(),
      };
      
      alertHistoryRepository.update.mockResolvedValue(updatedAlert);

      // Act
      const result = await service.acknowledgeAlert({
        id: 'alert_1234567890_abcdef',
        acknowledgedBy: 'testUser',
        comment: 'Test comment'
      });

      // Assert
      expect(alertHistoryRepository.update).toHaveBeenCalled();
      expect(alertEventPublisher.publishAlertAcknowledgedEvent).toHaveBeenCalled();
      expect(result.status).toBe(AlertStatus.ACKNOWLEDGED);
    });

    it('should throw an exception when alert is not found', async () => {
      // Arrange
      alertHistoryRepository.update.mockResolvedValue(null);

      // Act & Assert
      await expect(service.acknowledgeAlert('nonexistent_alert', 'testUser'))
        .rejects
        .toThrow();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert using traditional parameters', async () => {
      // Arrange
      const updatedAlert = {
        ...mockAlert,
        status: AlertStatus.RESOLVED,
        resolvedBy: 'testUser',
        resolvedAt: new Date(),
        endTime: new Date(),
      };
      
      alertHistoryRepository.update.mockResolvedValue(updatedAlert);
      alertCacheService.clearActiveAlert.mockResolvedValue();

      // Act
      const result = await service.resolveAlert('alert_1234567890_abcdef', 'testUser', 'rule_1234567890_abcdef', 'Test comment');

      // Assert
      expect(alertHistoryRepository.update).toHaveBeenCalled();
      expect(alertCacheService.clearActiveAlert).toHaveBeenCalledWith('rule_1234567890_abcdef');
      expect(alertEventPublisher.publishAlertResolvedEvent).toHaveBeenCalled();
      expect(result.status).toBe(AlertStatus.RESOLVED);
    });

    it('should resolve an alert using object parameters', async () => {
      // Arrange
      const updatedAlert = {
        ...mockAlert,
        status: AlertStatus.RESOLVED,
        resolvedBy: 'testUser',
        resolvedAt: new Date(),
        endTime: new Date(),
      };
      
      alertHistoryRepository.update.mockResolvedValue(updatedAlert);
      alertCacheService.clearActiveAlert.mockResolvedValue();

      // Act
      const result = await service.resolveAlert({
        id: 'alert_1234567890_abcdef',
        resolvedBy: 'testUser',
        ruleId: 'rule_1234567890_abcdef',
        comment: 'Test comment'
      });

      // Assert
      expect(alertHistoryRepository.update).toHaveBeenCalled();
      expect(alertCacheService.clearActiveAlert).toHaveBeenCalledWith('rule_1234567890_abcdef');
      expect(alertEventPublisher.publishAlertResolvedEvent).toHaveBeenCalled();
      expect(result.status).toBe(AlertStatus.RESOLVED);
    });
  });

  describe('suppressAlert', () => {
    it('should suppress an alert successfully', async () => {
      // Arrange
      const updatedAlert = {
        ...mockAlert,
        status: AlertStatus.SUPPRESSED,
      };
      
      alertHistoryRepository.update.mockResolvedValue(updatedAlert);

      // Act
      const result = await service.suppressAlert('alert_1234567890_abcdef', 'testUser', 3600, 'Test reason');

      // Assert
      expect(alertHistoryRepository.update).toHaveBeenCalled();
      expect(alertEventPublisher.publishAlertSuppressedEvent).toHaveBeenCalled();
      expect(result.status).toBe(AlertStatus.SUPPRESSED);
    });
  });

  describe('escalateAlert', () => {
    it('should escalate an alert successfully', async () => {
      // Arrange
      alertHistoryRepository.findById.mockResolvedValue(mockAlert);
      const updatedAlert = {
        ...mockAlert,
        severity: 'critical',
      };
      alertHistoryRepository.update.mockResolvedValue(updatedAlert);

      // Act
      const result = await service.escalateAlert('alert_1234567890_abcdef', 'critical', 'testUser', 'Test reason');

      // Assert
      expect(alertHistoryRepository.findById).toHaveBeenCalledWith('alert_1234567890_abcdef');
      expect(alertHistoryRepository.update).toHaveBeenCalled();
      expect(alertEventPublisher.publishAlertEscalatedEvent).toHaveBeenCalled();
      expect(result.severity).toBe('critical');
    });

    it('should throw an exception when alert is not found during escalation', async () => {
      // Arrange
      alertHistoryRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.escalateAlert('nonexistent_alert', 'critical', 'testUser'))
        .rejects
        .toThrow();
    });
  });

  describe('batchUpdateAlertStatus', () => {
    it('should batch update alert statuses successfully', async () => {
      // Arrange
      const alertIds = ['alert_1', 'alert_2', 'alert_3'];
      const updatedAlert = {
        ...mockAlert,
        status: AlertStatus.RESOLVED,
        resolvedBy: 'testUser',
        resolvedAt: new Date(),
        endTime: new Date(),
      };
      
      alertHistoryRepository.update.mockResolvedValue(updatedAlert);

      // Act
      const result = await service.batchUpdateAlertStatus(alertIds, AlertStatus.RESOLVED, 'testUser');

      // Assert
      expect(alertHistoryRepository.update).toHaveBeenCalledTimes(3);
      expect(result.successCount).toBe(3);
      expect(result.failedCount).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should handle partial failures in batch update', async () => {
      // Arrange
      const alertIds = ['alert_1', 'alert_2', 'alert_3'];
      const updatedAlert = {
        ...mockAlert,
        status: AlertStatus.RESOLVED,
        resolvedBy: 'testUser',
        resolvedAt: new Date(),
        endTime: new Date(),
      };
      
      alertHistoryRepository.update
        .mockResolvedValueOnce(updatedAlert)
        .mockRejectedValueOnce(new Error('Update failed'))
        .mockResolvedValueOnce(updatedAlert);

      // Act
      const result = await service.batchUpdateAlertStatus(alertIds, AlertStatus.RESOLVED, 'testUser');

      // Assert
      expect(alertHistoryRepository.update).toHaveBeenCalledTimes(3);
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('getAlertById', () => {
    it('should return an alert by ID', async () => {
      // Arrange
      alertHistoryRepository.findById.mockResolvedValue(mockAlert);

      // Act
      const result = await service.getAlertById('alert_1234567890_abcdef');

      // Assert
      expect(alertHistoryRepository.findById).toHaveBeenCalledWith('alert_1234567890_abcdef');
      expect(result).toEqual(mockAlert);
    });

    it('should throw an exception when alert is not found', async () => {
      // Arrange
      alertHistoryRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getAlertById('nonexistent_alert'))
        .rejects
        .toThrow();
    });
  });

  describe('processAlert', () => {
    it('should process an alert successfully', async () => {
      // Arrange
      const alertData = {
        id: 'alert_1234567890_abcdef',
        ruleId: 'rule_1234567890_abcdef',
        data: { value: 85 }
      };
      
      service.getAlertById = jest.fn().mockResolvedValue(mockAlert);
      alertCacheService.addToTimeseries.mockResolvedValue();

      // Act
      await service.processAlert(alertData);

      // Assert
      expect(service.getAlertById).toHaveBeenCalledWith('alert_1234567890_abcdef');
      expect(alertCacheService.addToTimeseries).toHaveBeenCalled();
    });

    it('should process an alert without ID', async () => {
      // Arrange
      const alertData = {
        ruleId: 'rule_1234567890_abcdef',
        data: { value: 85 }
      };

      // Act
      await service.processAlert(alertData);

      // Assert
      expect(alertHistoryRepository.findById).not.toHaveBeenCalled();
      expect(alertCacheService.addToTimeseries).not.toHaveBeenCalled();
    });
  });

  describe('getLifecycleStats', () => {
    it('should return lifecycle statistics', () => {
      // Act
      const stats = service.getLifecycleStats();

      // Assert
      expect(stats).toEqual({
        totalAlertsCreated: 0,
        totalAlertsResolved: 0,
        totalAlertsAcknowledged: 0,
        averageResolutionTime: 0,
      });
    });
  });
});
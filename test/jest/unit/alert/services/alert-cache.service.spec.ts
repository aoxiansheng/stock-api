import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AlertCacheService } from '../../../../src/alert/services/alert-cache.service';
import { CacheService } from '../../../cache/services/cache.service';
import { AlertHistoryRepository } from '../../../../src/alert/repositories/alert-history.repository';
import { IAlert } from '../../../../src/alert/interfaces';
import { AlertStatus } from '../../../../src/alert/types/alert.types';
import { alertCacheKeys } from '../../../../src/alert/utils/alert-cache-keys.util';

// Mock 数据
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

describe('AlertCacheService', () => {
  let service: AlertCacheService;
  let cacheService: jest.Mocked<CacheService>;
  let configService: jest.Mocked<ConfigService>;
  let alertHistoryRepository: jest.Mocked<AlertHistoryRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertCacheService,
        {
          provide: CacheService,
          useValue: {
            safeSet: jest.fn(),
            safeGet: jest.fn(),
            del: jest.fn(),
            listPush: jest.fn(),
            listTrim: jest.fn(),
            expire: jest.fn(),
            listRange: jest.fn(),
            getClient: jest.fn().mockReturnThis(),
            scan: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: AlertHistoryRepository,
          useValue: {
            findActive: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AlertCacheService);
    cacheService = module.get(CacheService);
    configService = module.get(ConfigService);
    alertHistoryRepository = module.get(AlertHistoryRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize the service and load active alerts', async () => {
      // Arrange
      alertHistoryRepository.findActive.mockResolvedValue([mockAlert]);
      service['setActiveAlert'] = jest.fn();

      // Act
      await service.onModuleInit();

      // Assert
      expect(alertHistoryRepository.findActive).toHaveBeenCalled();
      expect(service['setActiveAlert']).toHaveBeenCalledWith(mockAlert.ruleId, mockAlert);
    });
  });

  describe('setActiveAlert', () => {
    it('should set active alert in cache successfully', async () => {
      // Arrange
      const cacheKey = alertCacheKeys.activeAlert(mockAlert.ruleId);
      cacheService.safeSet.mockResolvedValue();

      // Act
      await service.setActiveAlert(mockAlert.ruleId, mockAlert);

      // Assert
      expect(cacheService.safeSet).toHaveBeenCalledWith(cacheKey, mockAlert, { ttl: expect.any(Number) });
      expect(service['addToTimeseries']).toHaveBeenCalledWith(mockAlert);
    });

    it('should handle cache errors gracefully', async () => {
      // Arrange
      cacheService.safeSet.mockRejectedValue(new Error('Cache error'));

      // Act
      await service.setActiveAlert(mockAlert.ruleId, mockAlert);

      // Assert
      expect(cacheService.safeSet).toHaveBeenCalled();
      // Should not throw an exception
    });
  });

  describe('getActiveAlert', () => {
    it('should get active alert from cache successfully', async () => {
      // Arrange
      const cacheKey = alertCacheKeys.activeAlert(mockAlert.ruleId);
      cacheService.safeGet.mockResolvedValue(mockAlert);

      // Act
      const result = await service.getActiveAlert(mockAlert.ruleId);

      // Assert
      expect(cacheService.safeGet).toHaveBeenCalledWith(cacheKey);
      expect(result).toEqual(mockAlert);
    });

    it('should return null when cache error occurs', async () => {
      // Arrange
      cacheService.safeGet.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await service.getActiveAlert(mockAlert.ruleId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('clearActiveAlert', () => {
    it('should clear active alert from cache successfully', async () => {
      // Arrange
      const cacheKey = alertCacheKeys.activeAlert(mockAlert.ruleId);
      cacheService.del.mockResolvedValue(1);

      // Act
      await service.clearActiveAlert(mockAlert.ruleId);

      // Assert
      expect(cacheService.del).toHaveBeenCalledWith(cacheKey);
    });

    it('should handle cache errors gracefully', async () => {
      // Arrange
      cacheService.del.mockRejectedValue(new Error('Cache error'));

      // Act
      await service.clearActiveAlert(mockAlert.ruleId);

      // Assert
      expect(cacheService.del).toHaveBeenCalled();
      // Should not throw an exception
    });
  });

  describe('getAllActiveAlerts', () => {
    it('should get all active alerts successfully', async () => {
      // Arrange
      const pattern = alertCacheKeys.activeAlertPattern();
      service['getKeysByPattern'] = jest.fn().mockResolvedValue([
        'alert:active:rule_1',
        'alert:active:rule_2'
      ]);
      cacheService.safeGet
        .mockResolvedValueOnce({ ...mockAlert, ruleId: 'rule_1', id: 'alert_1' })
        .mockResolvedValueOnce({ ...mockAlert, ruleId: 'rule_2', id: 'alert_2' });

      // Act
      const result = await service.getAllActiveAlerts();

      // Assert
      expect(service['getKeysByPattern']).toHaveBeenCalledWith(pattern);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no active alerts found', async () => {
      // Arrange
      service['getKeysByPattern'] = jest.fn().mockResolvedValue([]);

      // Act
      const result = await service.getAllActiveAlerts();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle cache errors gracefully', async () => {
      // Arrange
      service['getKeysByPattern'] = jest.fn().mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await service.getAllActiveAlerts();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('setCooldown', () => {
    it('should set cooldown successfully', async () => {
      // Arrange
      const cacheKey = alertCacheKeys.cooldown(mockAlert.ruleId);
      cacheService.safeSet.mockResolvedValue();

      // Act
      await service.setCooldown(mockAlert.ruleId, 300);

      // Assert
      expect(cacheService.safeSet).toHaveBeenCalledWith(cacheKey, true, { ttl: 300 });
    });

    it('should skip setting cooldown when time is invalid', async () => {
      // Act
      await service.setCooldown(mockAlert.ruleId, 0);

      // Assert
      expect(cacheService.safeSet).not.toHaveBeenCalled();
    });

    it('should throw error when cache operation fails', async () => {
      // Arrange
      cacheService.safeSet.mockRejectedValue(new Error('Cache error'));

      // Act & Assert
      await expect(service.setCooldown(mockAlert.ruleId, 300))
        .rejects
        .toThrow('Cache error');
    });
  });

  describe('isInCooldown', () => {
    it('should check cooldown status successfully', async () => {
      // Arrange
      const cacheKey = alertCacheKeys.cooldown(mockAlert.ruleId);
      cacheService.safeGet.mockResolvedValue(true);

      // Act
      const result = await service.isInCooldown(mockAlert.ruleId);

      // Assert
      expect(cacheService.safeGet).toHaveBeenCalledWith(cacheKey);
      expect(result).toBe(true);
    });

    it('should return false when cache error occurs', async () => {
      // Arrange
      cacheService.safeGet.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await service.isInCooldown(mockAlert.ruleId);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('clearCooldown', () => {
    it('should clear cooldown successfully', async () => {
      // Arrange
      const cacheKey = alertCacheKeys.cooldown(mockAlert.ruleId);
      cacheService.del.mockResolvedValue(1);

      // Act
      await service.clearCooldown(mockAlert.ruleId);

      // Assert
      expect(cacheService.del).toHaveBeenCalledWith(cacheKey);
    });

    it('should throw error when cache operation fails', async () => {
      // Arrange
      cacheService.del.mockRejectedValue(new Error('Cache error'));

      // Act & Assert
      await expect(service.clearCooldown(mockAlert.ruleId))
        .rejects
        .toThrow('Cache error');
    });
  });

  describe('batchCheckCooldown', () => {
    it('should batch check cooldown status successfully', async () => {
      // Arrange
      service.isInCooldown = jest.fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      // Act
      const result = await service.batchCheckCooldown(['rule_1', 'rule_2']);

      // Assert
      expect(service.isInCooldown).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        'rule_1': true,
        'rule_2': false
      });
    });

    it('should handle individual cooldown check failures', async () => {
      // Arrange
      service.isInCooldown = jest.fn()
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error('Check failed'));

      // Act
      const result = await service.batchCheckCooldown(['rule_1', 'rule_2']);

      // Assert
      expect(result).toEqual({
        'rule_1': true,
        'rule_2': false
      });
    });
  });

  describe('addToTimeseries', () => {
    it('should add alert to timeseries successfully', async () => {
      // Arrange
      const timeseriesKey = alertCacheKeys.timeseries(mockAlert.ruleId);
      cacheService.listPush.mockResolvedValue(1);
      cacheService.listTrim.mockResolvedValue();
      cacheService.expire.mockResolvedValue(1);

      // Act
      await service.addToTimeseries(mockAlert);

      // Assert
      expect(cacheService.listPush).toHaveBeenCalledWith(timeseriesKey, expect.any(String));
      expect(cacheService.listTrim).toHaveBeenCalledWith(timeseriesKey, 0, 999);
      expect(cacheService.expire).toHaveBeenCalledWith(timeseriesKey, expect.any(Number));
    });

    it('should handle cache errors gracefully', async () => {
      // Arrange
      cacheService.listPush.mockRejectedValue(new Error('Cache error'));

      // Act
      await service.addToTimeseries(mockAlert);

      // Assert
      expect(cacheService.listPush).toHaveBeenCalled();
      // Should not throw an exception
    });
  });

  describe('getTimeseries', () => {
    it('should get timeseries data successfully', async () => {
      // Arrange
      const timeseriesKey = alertCacheKeys.timeseries(mockAlert.ruleId);
      const alertData = JSON.stringify({
        ...mockAlert,
        startTime: mockAlert.startTime.toISOString()
      });
      
      cacheService.listRange.mockResolvedValue([alertData]);

      // Act
      const result = await service.getTimeseries(mockAlert.ruleId, 10);

      // Assert
      expect(cacheService.listRange).toHaveBeenCalledWith(timeseriesKey, 0, 9);
      expect(result).toHaveLength(1);
      expect(result[0].startTime).toBeInstanceOf(Date);
    });

    it('should handle parsing errors gracefully', async () => {
      // Arrange
      const timeseriesKey = alertCacheKeys.timeseries(mockAlert.ruleId);
      cacheService.listRange.mockResolvedValue(['invalid_json']);

      // Act
      const result = await service.getTimeseries(mockAlert.ruleId);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return empty array when cache error occurs', async () => {
      // Arrange
      cacheService.listRange.mockRejectedValue(new Error('Cache error'));

      // Act
      const result = await service.getTimeseries(mockAlert.ruleId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('updateTimeseriesAlertStatus', () => {
    it('should update timeseries alert status successfully', async () => {
      // Arrange
      const timeseriesKey = alertCacheKeys.timeseries(mockAlert.ruleId);
      const alertData = JSON.stringify(mockAlert);
      const updatedAlert = { ...mockAlert, status: AlertStatus.RESOLVED };
      
      cacheService.listRange.mockResolvedValue([alertData]);
      cacheService.del.mockResolvedValue(1);
      cacheService.listPush.mockResolvedValue(1);
      cacheService.expire.mockResolvedValue(1);

      // Act
      await service.updateTimeseriesAlertStatus(updatedAlert);

      // Assert
      expect(cacheService.listRange).toHaveBeenCalledWith(timeseriesKey, 0, -1);
      expect(cacheService.del).toHaveBeenCalledWith(timeseriesKey);
      expect(cacheService.listPush).toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      // Arrange
      cacheService.listRange.mockRejectedValue(new Error('Cache error'));

      // Act
      await service.updateTimeseriesAlertStatus(mockAlert);

      // Assert
      expect(cacheService.listRange).toHaveBeenCalled();
      // Should not throw an exception
    });
  });

  describe('cleanupTimeseriesData', () => {
    it('should cleanup timeseries data successfully', async () => {
      // Arrange
      const pattern = alertCacheKeys.timeseriesPattern();
      service['getKeysByPattern'] = jest.fn().mockResolvedValue(['alert:timeseries:rule_1']);
      cacheService.getClient().ttl.mockResolvedValue(300);
      cacheService.expire.mockResolvedValue(1);

      // Act
      const result = await service.cleanupTimeseriesData(7);

      // Assert
      expect(service['getKeysByPattern']).toHaveBeenCalledWith(pattern);
      expect(result.cleanedKeys).toBe(1);
      expect(result.errors).toEqual([]);
    });

    it('should throw error when cleanup fails', async () => {
      // Arrange
      service['getKeysByPattern'] = jest.fn().mockRejectedValue(new Error('Cleanup error'));

      // Act & Assert
      await expect(service.cleanupTimeseriesData(7))
        .rejects
        .toThrow('Cleanup error');
    });
  });

  describe('getKeysByPattern', () => {
    it('should get keys by pattern successfully', async () => {
      // Arrange
      cacheService.getClient().scan
        .mockResolvedValueOnce(['1', ['key1', 'key2']])
        .mockResolvedValueOnce(['0', ['key3']]);

      // Act
      const result = await service['getKeysByPattern']('alert:*');

      // Assert
      expect(result).toEqual(['key1', 'key2', 'key3']);
    });

    it('should return empty array when scan fails', async () => {
      // Arrange
      cacheService.getClient().scan.mockRejectedValue(new Error('Scan error'));

      // Act
      const result = await service['getKeysByPattern']('alert:*');

      // Assert
      expect(result).toEqual([]);
    });
  });
});
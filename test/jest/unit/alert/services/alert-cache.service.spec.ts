import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AlertCacheService } from '@alert/services/alert-cache.service';
import { CacheService } from '@cache/services/cache.service';
import { AlertHistoryRepository } from '@alert/repositories/alert-history.repository';
import { IAlert } from '@alert/interfaces';
import { AlertStatus, AlertSeverity } from '@alert/types/alert.types';

describe('AlertCacheService', () => {
  let service: AlertCacheService;
  let mockCacheService: any;
  let mockAlertHistoryRepository: any;
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

  beforeEach(async () => {
    mockCacheConfig = {
      defaultTtl: 300
    };

    mockCacheService = {
      safeSet: jest.fn(),
      safeGet: jest.fn(),
      del: jest.fn(),
      listPush: jest.fn(),
      listTrim: jest.fn(),
      expire: jest.fn(),
      listRange: jest.fn(),
      getClient: jest.fn().mockReturnValue({
        scan: jest.fn(),
        ttl: jest.fn()
      })
    };

    mockAlertHistoryRepository = {
      findActive: jest.fn()
    };

    mockConfigService = {
      get: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertCacheService,
        { provide: CacheService, useValue: mockCacheService },
        { provide: AlertHistoryRepository, useValue: mockAlertHistoryRepository },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'cacheUnified', useValue: mockCacheConfig }
      ],
    }).compile();

    service = module.get<AlertCacheService>(AlertCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize module and load active alerts', async () => {
      const mockActiveAlerts = [mockAlert];
      mockAlertHistoryRepository.findActive.mockResolvedValue(mockActiveAlerts);
      mockCacheService.safeSet.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockAlertHistoryRepository.findActive).toHaveBeenCalled();
      expect(mockCacheService.safeSet).toHaveBeenCalledWith(
        expect.stringContaining('rule_456'),
        mockAlert,
        { ttl: mockCacheConfig.defaultTtl }
      );
    });

    it('should handle empty active alerts during initialization', async () => {
      mockAlertHistoryRepository.findActive.mockResolvedValue([]);

      await service.onModuleInit();

      expect(mockAlertHistoryRepository.findActive).toHaveBeenCalled();
      expect(mockCacheService.safeSet).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      mockAlertHistoryRepository.findActive.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('Active Alert Management', () => {
    it('should set active alert in cache', async () => {
      mockCacheService.safeSet.mockResolvedValue(undefined);
      mockCacheService.listPush.mockResolvedValue(undefined);
      mockCacheService.listTrim.mockResolvedValue(undefined);
      mockCacheService.expire.mockResolvedValue(undefined);

      await service.setActiveAlert('rule_123', mockAlert);

      expect(mockCacheService.safeSet).toHaveBeenCalledWith(
        expect.stringContaining('rule_123'),
        mockAlert,
        { ttl: mockCacheConfig.defaultTtl }
      );
      expect(mockCacheService.listPush).toHaveBeenCalled();
    });

    it('should handle cache set errors gracefully', async () => {
      mockCacheService.safeSet.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(service.setActiveAlert('rule_123', mockAlert)).resolves.not.toThrow();
    });

    it('should get active alert from cache', async () => {
      mockCacheService.safeGet.mockResolvedValue(mockAlert);

      const result = await service.getActiveAlert('rule_123');

      expect(mockCacheService.safeGet).toHaveBeenCalledWith(
        expect.stringContaining('rule_123')
      );
      expect(result).toEqual(mockAlert);
    });

    it('should return null when active alert not found', async () => {
      mockCacheService.safeGet.mockResolvedValue(null);

      const result = await service.getActiveAlert('rule_123');

      expect(result).toBeNull();
    });

    it('should handle get errors gracefully', async () => {
      mockCacheService.safeGet.mockRejectedValue(new Error('Cache error'));

      const result = await service.getActiveAlert('rule_123');

      expect(result).toBeNull();
    });

    it('should clear active alert from cache', async () => {
      mockCacheService.del.mockResolvedValue(undefined);

      await service.clearActiveAlert('rule_123');

      expect(mockCacheService.del).toHaveBeenCalledWith(
        expect.stringContaining('rule_123')
      );
    });

    it('should handle clear errors gracefully', async () => {
      mockCacheService.del.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(service.clearActiveAlert('rule_123')).resolves.not.toThrow();
    });
  });

  describe('Get All Active Alerts', () => {
    it('should get all active alerts from cache', async () => {
      const mockKeys = ['alert:active:rule_1', 'alert:active:rule_2'];
      const mockAlerts = [mockAlert, { ...mockAlert, id: 'alert_456', ruleId: 'rule_789' }];

      mockCacheService.getClient().scan.mockResolvedValue(['0', mockKeys]);
      mockCacheService.safeGet.mockImplementation((key) => {
        if (key.includes('rule_1')) return Promise.resolve(mockAlerts[0]);
        if (key.includes('rule_2')) return Promise.resolve(mockAlerts[1]);
        return Promise.resolve(null);
      });

      const result = await service.getAllActiveAlerts();

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(mockAlerts[0]);
      expect(result).toContainEqual(mockAlerts[1]);
    });

    it('should return empty array when no active alerts', async () => {
      mockCacheService.getClient().scan.mockResolvedValue(['0', []]);

      const result = await service.getAllActiveAlerts();

      expect(result).toEqual([]);
    });

    it('should handle get all errors gracefully', async () => {
      mockCacheService.getClient().scan.mockRejectedValue(new Error('Cache error'));

      const result = await service.getAllActiveAlerts();

      expect(result).toEqual([]);
    });

    it('should filter out null alerts', async () => {
      const mockKeys = ['alert:active:rule_1', 'alert:active:rule_2'];
      mockCacheService.getClient().scan.mockResolvedValue(['0', mockKeys]);
      mockCacheService.safeGet.mockImplementation((key) => {
        if (key.includes('rule_1')) return Promise.resolve(mockAlert);
        return Promise.resolve(null);
      });

      const result = await service.getAllActiveAlerts();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockAlert);
    });
  });

  describe('Cooldown Management', () => {
    it('should set cooldown for rule', async () => {
      mockCacheService.safeSet.mockResolvedValue(undefined);

      await service.setCooldown('rule_123', 300);

      expect(mockCacheService.safeSet).toHaveBeenCalledWith(
        expect.stringContaining('rule_123'),
        true,
        { ttl: 300 }
      );
    });

    it('should skip invalid cooldown durations', async () => {
      await service.setCooldown('rule_123', 0);
      await service.setCooldown('rule_123', -5);

      expect(mockCacheService.safeSet).not.toHaveBeenCalled();
    });

    it('should throw on cooldown set error', async () => {
      mockCacheService.safeSet.mockRejectedValue(new Error('Cache error'));

      await expect(service.setCooldown('rule_123', 300)).rejects.toThrow('Cache error');
    });

    it('should check if rule is in cooldown', async () => {
      mockCacheService.safeGet.mockResolvedValue(true);

      const result = await service.isInCooldown('rule_123');

      expect(mockCacheService.safeGet).toHaveBeenCalledWith(
        expect.stringContaining('rule_123')
      );
      expect(result).toBe(true);
    });

    it('should return false when not in cooldown', async () => {
      mockCacheService.safeGet.mockResolvedValue(null);

      const result = await service.isInCooldown('rule_123');

      expect(result).toBe(false);
    });

    it('should return false on cooldown check error', async () => {
      mockCacheService.safeGet.mockRejectedValue(new Error('Cache error'));

      const result = await service.isInCooldown('rule_123');

      expect(result).toBe(false);
    });

    it('should clear cooldown', async () => {
      mockCacheService.del.mockResolvedValue(undefined);

      await service.clearCooldown('rule_123');

      expect(mockCacheService.del).toHaveBeenCalledWith(
        expect.stringContaining('rule_123')
      );
    });

    it('should throw on cooldown clear error', async () => {
      mockCacheService.del.mockRejectedValue(new Error('Cache error'));

      await expect(service.clearCooldown('rule_123')).rejects.toThrow('Cache error');
    });

    it('should batch check cooldown status', async () => {
      const ruleIds = ['rule_1', 'rule_2', 'rule_3'];
      mockCacheService.safeGet.mockImplementation((key) => {
        if (key.includes('rule_1')) return Promise.resolve(true);
        if (key.includes('rule_2')) return Promise.resolve(null);
        if (key.includes('rule_3')) return Promise.resolve(true);
        return Promise.resolve(null);
      });

      const result = await service.batchCheckCooldown(ruleIds);

      expect(result).toEqual({
        rule_1: true,
        rule_2: false,
        rule_3: true
      });
    });

    it('should handle individual errors in batch check', async () => {
      const ruleIds = ['rule_1', 'rule_2'];
      mockCacheService.safeGet.mockImplementation((key) => {
        if (key.includes('rule_1')) return Promise.resolve(true);
        if (key.includes('rule_2')) return Promise.reject(new Error('Cache error'));
        return Promise.resolve(null);
      });

      const result = await service.batchCheckCooldown(ruleIds);

      expect(result).toEqual({
        rule_1: true,
        rule_2: false // Error defaults to false
      });
    });
  });

  describe('Timeseries Management', () => {
    it('should add alert to timeseries', async () => {
      mockCacheService.listPush.mockResolvedValue(undefined);
      mockCacheService.listTrim.mockResolvedValue(undefined);
      mockCacheService.expire.mockResolvedValue(undefined);

      await service.addToTimeseries(mockAlert);

      expect(mockCacheService.listPush).toHaveBeenCalledWith(
        expect.stringContaining('rule_456'),
        expect.stringContaining('"id":"alert_123"')
      );
      expect(mockCacheService.listTrim).toHaveBeenCalled();
      expect(mockCacheService.expire).toHaveBeenCalled();
    });

    it('should handle timeseries add errors gracefully', async () => {
      mockCacheService.listPush.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(service.addToTimeseries(mockAlert)).resolves.not.toThrow();
    });

    it('should get timeseries data', async () => {
      const mockTimeseriesData = [
        JSON.stringify({
          id: 'alert_123',
          ruleId: 'rule_456',
          status: AlertStatus.FIRING,
          severity: AlertSeverity.CRITICAL,
          message: 'Test alert',
          value: 85,
          threshold: 80,
          startTime: '2025-09-24T10:00:00Z',
          metric: 'cpu_usage',
          tags: { host: 'server-1' },
          context: { additionalInfo: 'test' }
        })
      ];
      mockCacheService.listRange.mockResolvedValue(mockTimeseriesData);

      const result = await service.getTimeseries('rule_456', 10);

      expect(mockCacheService.listRange).toHaveBeenCalledWith(
        expect.stringContaining('rule_456'),
        0,
        9
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('alert_123');
      expect(result[0].startTime).toBeInstanceOf(Date);
    });

    it('should handle invalid JSON in timeseries data', async () => {
      const invalidData = ['invalid-json', '{"valid": "json"}'];
      mockCacheService.listRange.mockResolvedValue(invalidData);

      const result = await service.getTimeseries('rule_456');

      expect(result).toHaveLength(1); // Only valid JSON should be returned
      expect(result[0].id).toBeDefined();
    });

    it('should handle timeseries get errors', async () => {
      mockCacheService.listRange.mockRejectedValue(new Error('Cache error'));

      const result = await service.getTimeseries('rule_456');

      expect(result).toEqual([]);
    });

    it('should update timeseries alert status', async () => {
      const updatedAlert = {
        ...mockAlert,
        status: AlertStatus.RESOLVED,
        resolvedBy: 'admin',
        resolvedAt: new Date(),
        endTime: new Date()
      };

      const mockTimeseriesData = [
        JSON.stringify({
          id: 'alert_123',
          status: AlertStatus.FIRING,
          ruleId: 'rule_456'
        })
      ];

      mockCacheService.listRange.mockResolvedValue(mockTimeseriesData);
      mockCacheService.del.mockResolvedValue(undefined);
      mockCacheService.listPush.mockResolvedValue(undefined);
      mockCacheService.expire.mockResolvedValue(undefined);

      await service.updateTimeseriesAlertStatus(updatedAlert);

      expect(mockCacheService.del).toHaveBeenCalled();
      expect(mockCacheService.listPush).toHaveBeenCalledWith(
        expect.stringContaining('rule_456'),
        expect.arrayContaining([expect.stringContaining('"status":"resolved"')])
      );
    });

    it('should handle update when alert not found in timeseries', async () => {
      const updatedAlert = { ...mockAlert, status: AlertStatus.RESOLVED };
      const mockTimeseriesData = [JSON.stringify({ id: 'different_alert', ruleId: 'rule_456' })];

      mockCacheService.listRange.mockResolvedValue(mockTimeseriesData);

      // Should not throw and should not update
      await expect(service.updateTimeseriesAlertStatus(updatedAlert)).resolves.not.toThrow();
      expect(mockCacheService.del).not.toHaveBeenCalled();
    });

    it('should handle timeseries update errors gracefully', async () => {
      mockCacheService.listRange.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(service.updateTimeseriesAlertStatus(mockAlert)).resolves.not.toThrow();
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup expired timeseries data', async () => {
      const mockKeys = ['alert:timeseries:rule_1', 'alert:timeseries:rule_2'];
      mockCacheService.getClient().scan.mockResolvedValue(['0', mockKeys]);
      mockCacheService.getClient().ttl.mockResolvedValue(-1);
      mockCacheService.expire.mockResolvedValue(undefined);

      const result = await service.cleanupTimeseriesData(7);

      expect(mockCacheService.getClient().scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        expect.stringContaining('timeseries'),
        'COUNT',
        100
      );
      expect(result.cleanedKeys).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle cleanup errors', async () => {
      const mockKeys = ['alert:timeseries:rule_1'];
      mockCacheService.getClient().scan.mockResolvedValue(['0', mockKeys]);
      mockCacheService.getClient().ttl.mockRejectedValue(new Error('TTL error'));

      const result = await service.cleanupTimeseriesData(7);

      expect(result.cleanedKeys).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('TTL error');
    });

    it('should throw on major cleanup failure', async () => {
      mockCacheService.getClient().scan.mockRejectedValue(new Error('Scan error'));

      await expect(service.cleanupTimeseriesData(7)).rejects.toThrow('Scan error');
    });

    it('should handle scan pagination correctly', async () => {
      const mockKeys1 = ['key1', 'key2'];
      const mockKeys2 = ['key3'];

      mockCacheService.getClient().scan
        .mockResolvedValueOnce(['10', mockKeys1])
        .mockResolvedValueOnce(['0', mockKeys2]);
      mockCacheService.getClient().ttl.mockResolvedValue(-1);
      mockCacheService.expire.mockResolvedValue(undefined);

      const result = await service.cleanupTimeseriesData();

      expect(mockCacheService.getClient().scan).toHaveBeenCalledTimes(2);
      expect(result.cleanedKeys).toBe(3);
    });

    it('should prevent infinite scan loops', async () => {
      // Mock a scenario that could cause infinite loop
      mockCacheService.getClient().scan.mockResolvedValue(['10', []]);

      const result = await service.cleanupTimeseriesData();

      // Should break after max attempts
      expect(mockCacheService.getClient().scan).toHaveBeenCalledTimes(100);
      expect(result.cleanedKeys).toBe(0);
    });
  });
});
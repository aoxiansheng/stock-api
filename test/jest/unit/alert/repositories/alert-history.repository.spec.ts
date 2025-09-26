import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';

import { AlertHistoryRepository } from '@alert/repositories/alert-history.repository';
import { AlertHistory } from '@alert/schemas/alert-history.schema';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { IAlert, IAlertQuery } from '@alert/interfaces';
import { AlertSeverity, AlertStatus } from '@alert/types/alert.types';
import cacheLimitsConfig from '@cache/config/cache-unified.config';
import alertConfig from '@alert/config/alert.config';

describe('AlertHistoryRepository', () => {
  let repository: AlertHistoryRepository;
  let mockModel: any;
  let mockPaginationService: jest.Mocked<PaginationService>;

  const mockAlert: IAlert = {
    id: '507f1f77bcf86cd799439012',
    ruleId: '507f1f77bcf86cd799439011',
    ruleName: 'Test Alert Rule',
    metric: 'cpu_usage',
    value: 85,
    threshold: 80,
    severity: AlertSeverity.WARNING,
    status: AlertStatus.FIRING,
    message: 'CPU usage is above threshold',
    startTime: new Date('2024-01-01T00:00:00.000Z'),
    endTime: undefined,
    acknowledgedBy: undefined,
    acknowledgedAt: undefined,
    resolvedBy: undefined,
    resolvedAt: undefined,
    tags: { environment: 'test' },
    context: { source: 'monitoring' }
  };

  const mockAlertQuery: IAlertQuery = {
    ruleId: '507f1f77bcf86cd799439011',
    severity: AlertSeverity.WARNING,
    status: AlertStatus.FIRING,
    page: 1,
    limit: 10,
    sortBy: 'startTime',
    sortOrder: 'desc'
  };

  const mockCacheLimits = {
    maxBatchSize: 100
  };

  const mockAlertConfig = {
    evaluationInterval: 30
  };

  beforeEach(async () => {
    const mockQueryChain = {
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    mockModel = jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue({
        toObject: jest.fn().mockReturnValue(mockAlert)
      })
    }));

    mockModel.find = jest.fn(() => mockQueryChain);
    mockModel.findOne = jest.fn(() => mockQueryChain);
    mockModel.findOneAndUpdate = jest.fn(() => ({ exec: jest.fn() }));
    mockModel.countDocuments = jest.fn(() => ({ exec: jest.fn().mockResolvedValue(1) }));
    mockModel.deleteMany = jest.fn(() => ({ exec: jest.fn().mockResolvedValue({ deletedCount: 5 }) }));
    mockModel.aggregate = jest.fn().mockResolvedValue([]);

    mockPaginationService = {
      normalizePaginationQuery: jest.fn().mockReturnValue({ page: 1, limit: 10 }),
      calculateSkip: jest.fn().mockReturnValue(0)
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertHistoryRepository,
        {
          provide: getModelToken(AlertHistory.name),
          useValue: mockModel
        },
        {
          provide: cacheLimitsConfig.KEY,
          useValue: mockCacheLimits
        },
        {
          provide: alertConfig.KEY,
          useValue: mockAlertConfig
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService
        }
      ]
    }).compile();

    repository = module.get<AlertHistoryRepository>(AlertHistoryRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new alert successfully', async () => {
      const alertData = {
        ...mockAlert,
        startTime: new Date(),
        status: AlertStatus.FIRING
      };

      const mockInstance = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue(alertData)
        })
      };

      mockModel.mockReturnValueOnce(mockInstance);

      const result = await repository.create(alertData);

      expect(mockModel).toHaveBeenCalledWith(alertData);
      expect(mockInstance.save).toHaveBeenCalled();
      expect(result).toEqual(alertData);
    });

    it('should handle save errors', async () => {
      const alertData = {
        ...mockAlert,
        startTime: new Date(),
        status: AlertStatus.FIRING
      };

      const mockError = new Error('Database save error');
      const mockInstance = {
        save: jest.fn().mockRejectedValue(mockError)
      };

      mockModel.mockReturnValueOnce(mockInstance);

      await expect(repository.create(alertData))
        .rejects.toThrow(mockError);
    });
  });

  describe('update', () => {
    it('should update an existing alert successfully', async () => {
      const updateData = { status: AlertStatus.ACKNOWLEDGED, acknowledgedBy: 'test-user' };
      const updatedAlert = { ...mockAlert, ...updateData };

      mockModel.findOneAndUpdate = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue(updatedAlert)
        })
      }));

      const result = await repository.update(mockAlert.id, updateData);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: mockAlert.id },
        updateData,
        { new: true }
      );
      expect(result).toEqual(updatedAlert);
    });

    it('should return null when alert not found', async () => {
      const updateData = { status: AlertStatus.ACKNOWLEDGED };

      mockModel.findOneAndUpdate = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue(null)
      }));

      const result = await repository.update('nonexistent-id', updateData);

      expect(result).toBeNull();
    });
  });

  describe('find', () => {
    it('should find alerts with pagination', async () => {
      const mockAlerts = [mockAlert];
      const mockTotal = 1;

      // Mock find query chain
      const mockFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAlerts)
      };

      mockModel.find = jest.fn().mockReturnValue(mockFindChain);
      mockModel.countDocuments = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue(mockTotal)
      }));

      const result = await repository.find(mockAlertQuery);

      expect(mockPaginationService.normalizePaginationQuery).toHaveBeenCalledWith({
        page: mockAlertQuery.page,
        limit: mockAlertQuery.limit
      });
      expect(mockPaginationService.calculateSkip).toHaveBeenCalledWith(1, 10);
      expect(result).toEqual({ alerts: mockAlerts, total: mockTotal });
    });

    it('should apply filters correctly', async () => {
      const query: IAlertQuery = {
        ruleId: 'test-rule-id',
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        metric: 'cpu',
        startTime: new Date('2024-01-01'),
        endTime: new Date('2024-01-02'),
        tags: { environment: 'prod' },
        page: 1,
        limit: 10
      };

      const mockFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      };

      mockModel.find = jest.fn().mockReturnValue(mockFindChain);
      mockModel.countDocuments = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue(0)
      }));

      await repository.find(query);

      expect(mockModel.find).toHaveBeenCalledWith({
        ruleId: 'test-rule-id',
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        metric: expect.any(RegExp),
        startTime: {
          $gte: new Date('2024-01-01'),
          $lte: new Date('2024-01-02')
        },
        'tags.environment': 'prod'
      });
    });
  });

  describe('findActive', () => {
    it('should find active alerts', async () => {
      const mockActiveAlerts = [{ ...mockAlert, status: AlertStatus.FIRING }];

      const mockFindChain = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockActiveAlerts)
      };

      mockModel.find = jest.fn().mockReturnValue(mockFindChain);

      const result = await repository.findActive();

      expect(mockModel.find).toHaveBeenCalledWith({
        status: { $in: [AlertStatus.FIRING, AlertStatus.ACKNOWLEDGED] }
      });
      expect(result).toEqual(mockActiveAlerts);
    });
  });

  describe('getStatistics', () => {
    it('should return alert statistics', async () => {
      const mockActiveAlerts = [{ _id: 'WARNING', count: 2 }];
      const mockAvgResolutionTime = [{ _id: null, avgTime: 3600000 }];
      const mockTodayAlerts = 5;
      const mockResolvedToday = 3;

      mockModel.aggregate = jest.fn()
        .mockResolvedValueOnce(mockActiveAlerts)
        .mockResolvedValueOnce(mockAvgResolutionTime);

      // Mock Promise.all structure for getStatistics - countDocuments returns promise directly in getStatistics
      mockModel.countDocuments = jest.fn()
        .mockResolvedValueOnce(mockTodayAlerts)
        .mockResolvedValueOnce(mockResolvedToday);

      const result = await repository.getStatistics();

      expect(result).toEqual({
        activeAlerts: mockActiveAlerts,
        todayAlerts: mockTodayAlerts,
        resolvedToday: mockResolvedToday,
        avgResolutionTime: mockAvgResolutionTime
      });
      expect(mockModel.aggregate).toHaveBeenCalledTimes(2);
      expect(mockModel.countDocuments).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCountByStatus', () => {
    it('should return count by status', async () => {
      const mockStatusCounts = [
        { _id: AlertStatus.FIRING, count: 3 },
        { _id: AlertStatus.RESOLVED, count: 2 }
      ];

      mockModel.aggregate = jest.fn().mockResolvedValue(mockStatusCounts);

      const result = await repository.getCountByStatus();

      expect(result).toEqual({
        [AlertStatus.FIRING]: 3,
        [AlertStatus.RESOLVED]: 2
      });
    });
  });

  describe('getCountBySeverity', () => {
    it('should return count by severity', async () => {
      const mockSeverityCounts = [
        { _id: AlertSeverity.CRITICAL, count: 1 },
        { _id: AlertSeverity.WARNING, count: 4 }
      ];

      mockModel.aggregate = jest.fn().mockResolvedValue(mockSeverityCounts);

      const result = await repository.getCountBySeverity();

      expect(result).toEqual({
        [AlertSeverity.CRITICAL]: 1,
        [AlertSeverity.WARNING]: 4
      });
    });
  });

  describe('getAlertTrend', () => {
    it('should return alert trend data with default interval', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      const mockTrendData = [
        { time: '2024-01-01', count: 5, resolved: 2 },
        { time: '2024-01-02', count: 3, resolved: 1 }
      ];

      mockModel.aggregate = jest.fn().mockResolvedValue(mockTrendData);

      const result = await repository.getAlertTrend(startDate, endDate);

      expect(mockModel.aggregate).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          $match: {
            startTime: { $gte: startDate, $lte: endDate }
          }
        }),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        { $sort: { time: 1 } }
      ]));
      expect(result).toEqual(mockTrendData);
    });

    it('should handle different intervals', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      mockModel.aggregate = jest.fn().mockResolvedValue([]);

      await repository.getAlertTrend(startDate, endDate, 'hour');
      await repository.getAlertTrend(startDate, endDate, 'week');

      expect(mockModel.aggregate).toHaveBeenCalledTimes(2);
    });
  });

  describe('findById', () => {
    it('should find alert by id', async () => {
      const mockFindChain = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAlert)
      };

      mockModel.findOne = jest.fn().mockReturnValue(mockFindChain);

      const result = await repository.findById(mockAlert.id);

      expect(mockModel.findOne).toHaveBeenCalledWith({ id: mockAlert.id });
      expect(result).toEqual(mockAlert);
    });

    it('should return null when alert not found', async () => {
      const mockFindChain = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null)
      };

      mockModel.findOne = jest.fn().mockReturnValue(mockFindChain);

      const result = await repository.findById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('searchByKeyword', () => {
    it('should search alerts by keyword', async () => {
      const keyword = 'cpu';
      const query: IAlertQuery = { page: 1, limit: 10 };
      const mockSearchResults = [mockAlert];

      const mockFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockSearchResults)
      };

      mockModel.find = jest.fn().mockReturnValue(mockFindChain);
      mockModel.countDocuments = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue(1)
      }));

      const result = await repository.searchByKeyword(keyword, query);

      expect(mockModel.find).toHaveBeenCalledWith({
        $or: [
          { message: expect.any(RegExp) },
          { ruleName: expect.any(RegExp) },
          { metric: expect.any(RegExp) }
        ]
      });
      expect(result).toEqual({ alerts: mockSearchResults, total: 1 });
    });

    it('should escape special regex characters in keyword', async () => {
      const keyword = 'cpu.*usage';
      const query: IAlertQuery = { page: 1, limit: 10 };

      const mockFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([])
      };

      mockModel.find = jest.fn().mockReturnValue(mockFindChain);
      mockModel.countDocuments = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue(0)
      }));

      await repository.searchByKeyword(keyword, query);

      const callArgs = mockModel.find.mock.calls[0][0];
      expect(callArgs.$or[0].message.source).toContain('cpu\\.\\*usage');
    });
  });

  describe('cleanup', () => {
    it('should cleanup old resolved alerts', async () => {
      const daysToKeep = 30;
      const mockDeleteResult = { deletedCount: 5 };

      mockModel.deleteMany = jest.fn(() => ({
        exec: jest.fn().mockResolvedValue(mockDeleteResult)
      }));

      const result = await repository.cleanup(daysToKeep);

      expect(mockModel.deleteMany).toHaveBeenCalledWith({
        startTime: { $lt: expect.any(Date) },
        status: AlertStatus.RESOLVED
      });
      expect(result).toBe(5);
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Query } from 'mongoose';
import { AlertHistoryRepository } from '../../../../../src/alert/repositories/alert-history.repository';
import { AlertHistory, AlertHistoryDocument } from '../../../../../src/alert/schemas/alert-history.schema';
import { AlertSeverity, AlertStatus } from '../../../../../src/alert/types/alert.types';
import { IAlert, IAlertQuery } from '../../../../../src/alert/interfaces';

describe('AlertHistoryRepository', () => {
  let repository: AlertHistoryRepository;
  let model: any;

  const mockAlert: IAlert = {
    id: 'alert-123',
    ruleId: 'rule-123',
    ruleName: 'CPU Usage Alert',
    metric: 'cpu_usage',
    value: 85.5,
    threshold: 80,
    severity: AlertSeverity.CRITICAL,
    status: AlertStatus.FIRING,
    message: 'CPU usage is above threshold',
    startTime: new Date('2024-01-01T10:00:00Z'),
    endTime: null,
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    tags: {
      environment: 'production',
      service: 'api-server'
    },
    context: {
      host: 'server-001'
    }
  };

  const createMockDocument = (data: any) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ ...data, toObject: () => data }),
    toObject: () => data,
  });

  const createMockQuery = (result: any) => ({
    exec: jest.fn().mockResolvedValue(result),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    findOneAndUpdate: jest.fn().mockReturnThis(),
  } as unknown as Query<any, any>);

  beforeEach(async () => {
    const mockModel = {
      constructor: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
      deleteMany: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertHistoryRepository,
        {
          provide: getModelToken(AlertHistory.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = module.get<AlertHistoryRepository>(AlertHistoryRepository);
    model = module.get<Model<AlertHistoryDocument>>(getModelToken(AlertHistory.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new alert successfully', async () => {
      const alertData = {
        id: 'alert-new',
        ruleId: 'rule-123',
        ruleName: 'Test Alert',
        metric: 'test_metric',
        value: 100,
        threshold: 80,
        severity: AlertSeverity.WARNING,
        message: 'Test alert message',
        startTime: new Date(),
        status: AlertStatus.FIRING,
        tags: { env: 'test' },
        context: { source: 'test' }
      };

      const mockDocument = createMockDocument(alertData);
      const MockModel = jest.fn().mockImplementation(() => mockDocument);
      (repository as any).alertHistoryModel = MockModel;

      const result = await repository.create(alertData);

      expect(result).toEqual(alertData);
      expect(mockDocument.save).toHaveBeenCalled();
    });

    it('should handle database errors during create', async () => {
      const alertData = {
        id: 'alert-error',
        ruleId: 'rule-123',
        ruleName: 'Error Alert',
        metric: 'test_metric',
        value: 100,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        message: 'Error test',
        startTime: new Date(),
        status: AlertStatus.FIRING,
      };

      const mockDocument = {
        save: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      const MockModel = jest.fn().mockImplementation(() => mockDocument);
      (repository as any).alertHistoryModel = MockModel;

      await expect(repository.create(alertData)).rejects.toThrow('Database connection failed');
    });
  });

  describe('update', () => {
    it('should update an existing alert', async () => {
      const updateData = {
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedBy: 'admin@example.com',
        acknowledgedAt: new Date(),
      };

      const updatedAlert = { ...mockAlert, ...updateData };
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({
          toObject: () => updatedAlert,
        }),
      };

      model.findOneAndUpdate = jest.fn().mockReturnValue(mockQuery);

      const result = await repository.update('alert-123', updateData);

      expect(result).toEqual(updatedAlert);
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'alert-123' },
        updateData,
        { new: true }
      );
      expect(mockQuery.exec).toHaveBeenCalled();
    });

    it('should return null when alert is not found', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue(null),
      };

      model.findOneAndUpdate = jest.fn().mockReturnValue(mockQuery);

      const result = await repository.update('nonexistent-alert', { status: AlertStatus.RESOLVED });

      expect(result).toBeNull();
      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'nonexistent-alert' },
        { status: AlertStatus.RESOLVED },
        { new: true }
      );
    });

    it('should handle database errors during update', async () => {
      const mockQuery = {
        exec: jest.fn().mockRejectedValue(new Error('Update failed')),
      };

      model.findOneAndUpdate = jest.fn().mockReturnValue(mockQuery);

      await expect(
        repository.update('alert-123', { status: AlertStatus.RESOLVED })
      ).rejects.toThrow('Update failed');
    });
  });

  describe('find', () => {
    it('should find alerts with basic query parameters', async () => {
      const query: IAlertQuery = {
        page: 1,
        limit: 10,
      };

      const mockAlerts = [mockAlert];
      const mockFindQuery = createMockQuery(mockAlerts);
      const mockCountQuery = { exec: jest.fn().mockResolvedValue(1) };

      model.find = jest.fn().mockReturnValue(mockFindQuery);
      model.countDocuments = jest.fn().mockReturnValue(mockCountQuery);

      const result = await repository.find(query);

      expect(result.alerts).toEqual(mockAlerts);
      expect(result.total).toBe(1);
      expect(model.find).toHaveBeenCalledWith({});
      expect(model.countDocuments).toHaveBeenCalledWith({});
    });

    it('should find alerts with all filter parameters', async () => {
      const query: IAlertQuery = {
        ruleId: 'rule-123',
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        metric: 'cpu',
        startTime: new Date('2024-01-01T00:00:00Z'),
        endTime: new Date('2024-01-02T00:00:00Z'),
        tags: { environment: 'production' },
        page: 2,
        limit: 5,
        sortBy: 'severity',
        sortOrder: 'asc',
      };

      const mockAlerts = [mockAlert];
      const mockFindQuery = createMockQuery(mockAlerts);
      const mockCountQuery = { exec: jest.fn().mockResolvedValue(1) };

      model.find = jest.fn().mockReturnValue(mockFindQuery);
      model.countDocuments = jest.fn().mockReturnValue(mockCountQuery);

      const result = await repository.find(query);

      const expectedFilter = {
        ruleId: 'rule-123',
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.FIRING,
        metric: new RegExp('cpu', 'i'),
        startTime: {
          $gte: new Date('2024-01-01T00:00:00Z'),
          $lte: new Date('2024-01-02T00:00:00Z'),
        },
        'tags.environment': 'production',
      };

      expect(result.alerts).toEqual(mockAlerts);
      expect(result.total).toBe(1);
      expect(model.find).toHaveBeenCalledWith(expectedFilter);
      expect(mockFindQuery.sort).toHaveBeenCalledWith({ severity: 1 });
      expect(mockFindQuery.skip).toHaveBeenCalledWith(5); // (page 2 - 1) * limit 5
      expect(mockFindQuery.limit).toHaveBeenCalledWith(5);
    });

    it('should handle multiple tags in query', async () => {
      const query: IAlertQuery = {
        tags: {
          environment: 'production',
          service: 'api-server',
          region: 'us-east-1',
        },
      };

      const mockAlerts = [mockAlert];
      const mockFindQuery = createMockQuery(mockAlerts);
      const mockCountQuery = { exec: jest.fn().mockResolvedValue(1) };

      model.find = jest.fn().mockReturnValue(mockFindQuery);
      model.countDocuments = jest.fn().mockReturnValue(mockCountQuery);

      await repository.find(query);

      const expectedFilter = {
        'tags.environment': 'production',
        'tags.service': 'api-server',
        'tags.region': 'us-east-1',
      };

      expect(model.find).toHaveBeenCalledWith(expectedFilter);
    });

    it('should use default pagination and sorting', async () => {
      const query: IAlertQuery = {};

      const mockFindQuery = createMockQuery([]);
      const mockCountQuery = { exec: jest.fn().mockResolvedValue(0) };

      model.find = jest.fn().mockReturnValue(mockFindQuery);
      model.countDocuments = jest.fn().mockReturnValue(mockCountQuery);

      await repository.find(query);

      expect(mockFindQuery.sort).toHaveBeenCalledWith({ startTime: -1 });
      expect(mockFindQuery.skip).toHaveBeenCalledWith(0); // (1 - 1) * 20
      expect(mockFindQuery.limit).toHaveBeenCalledWith(20);
    });

    it('should handle only startTime in date range', async () => {
      const query: IAlertQuery = {
        startTime: new Date('2024-01-01T00:00:00Z'),
      };

      const mockFindQuery = createMockQuery([]);
      const mockCountQuery = { exec: jest.fn().mockResolvedValue(0) };

      model.find = jest.fn().mockReturnValue(mockFindQuery);
      model.countDocuments = jest.fn().mockReturnValue(mockCountQuery);

      await repository.find(query);

      const expectedFilter = {
        startTime: {
          $gte: new Date('2024-01-01T00:00:00Z'),
        },
      };

      expect(model.find).toHaveBeenCalledWith(expectedFilter);
    });

    it('should handle only endTime in date range', async () => {
      const query: IAlertQuery = {
        endTime: new Date('2024-01-02T00:00:00Z'),
      };

      const mockFindQuery = createMockQuery([]);
      const mockCountQuery = { exec: jest.fn().mockResolvedValue(0) };

      model.find = jest.fn().mockReturnValue(mockFindQuery);
      model.countDocuments = jest.fn().mockReturnValue(mockCountQuery);

      await repository.find(query);

      const expectedFilter = {
        startTime: {
          $lte: new Date('2024-01-02T00:00:00Z'),
        },
      };

      expect(model.find).toHaveBeenCalledWith(expectedFilter);
    });
  });

  describe('findActive', () => {
    it('should find all active alerts', async () => {
      const activeAlerts = [
        { ...mockAlert, status: AlertStatus.FIRING },
        { ...mockAlert, id: 'alert-456', status: AlertStatus.ACKNOWLEDGED },
      ];

      const mockQuery = createMockQuery(activeAlerts);
      model.find = jest.fn().mockReturnValue(mockQuery);

      const result = await repository.findActive();

      expect(result).toEqual(activeAlerts);
      expect(model.find).toHaveBeenCalledWith({
        status: { $in: [AlertStatus.FIRING, AlertStatus.ACKNOWLEDGED] },
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ startTime: -1 });
      expect(mockQuery.lean).toHaveBeenCalled();
    });

    it('should return empty array when no active alerts exist', async () => {
      const mockQuery = createMockQuery([]);
      model.find = jest.fn().mockReturnValue(mockQuery);

      const result = await repository.findActive();

      expect(result).toEqual([]);
      expect(model.find).toHaveBeenCalledWith({
        status: { $in: [AlertStatus.FIRING, AlertStatus.ACKNOWLEDGED] },
      });
    });

    it('should handle database errors when finding active alerts', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Database query failed')),
      };

      model.find = jest.fn().mockReturnValue(mockQuery);

      await expect(repository.findActive()).rejects.toThrow('Database query failed');
    });
  });

  describe('getStatistics', () => {
    it('should return comprehensive alert statistics', async () => {
      const mockActiveAlerts = [
        { _id: AlertSeverity.CRITICAL, count: 5 },
        { _id: AlertSeverity.WARNING, count: 10 },
      ];
      const mockTodayAlerts = 20;
      const mockResolvedToday = 15;
      const mockAvgResolutionTime = [{ _id: null, avgTime: 1800000 }]; // 30 minutes

      model.aggregate = jest
        .fn()
        .mockResolvedValueOnce(mockActiveAlerts)
        .mockResolvedValueOnce(mockAvgResolutionTime);

      model.countDocuments = jest
        .fn()
        .mockResolvedValueOnce(mockTodayAlerts)
        .mockResolvedValueOnce(mockResolvedToday);

      const result = await repository.getStatistics();

      expect(result.activeAlerts).toEqual(mockActiveAlerts);
      expect(result.todayAlerts).toBe(mockTodayAlerts);
      expect(result.resolvedToday).toBe(mockResolvedToday);
      expect(result.avgResolutionTime).toEqual(mockAvgResolutionTime);

      // Verify aggregation for active alerts
      expect(model.aggregate).toHaveBeenCalledWith([
        {
          $match: {
            status: { $in: [AlertStatus.FIRING, AlertStatus.ACKNOWLEDGED] },
          },
        },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]);

      // Verify today's date filtering
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(model.countDocuments).toHaveBeenCalledWith({ startTime: { $gte: today } });
      expect(model.countDocuments).toHaveBeenCalledWith({
        startTime: { $gte: today },
        status: AlertStatus.RESOLVED,
      });
    });

    it('should handle empty statistics gracefully', async () => {
      model.aggregate = jest.fn().mockResolvedValue([]);
      model.countDocuments = jest.fn().mockResolvedValue(0);

      const result = await repository.getStatistics();

      expect(result.activeAlerts).toEqual([]);
      expect(result.todayAlerts).toBe(0);
      expect(result.resolvedToday).toBe(0);
      expect(result.avgResolutionTime).toEqual([]);
    });

    it('should handle database errors during statistics gathering', async () => {
      model.aggregate = jest.fn().mockRejectedValue(new Error('Aggregation failed'));
      model.countDocuments = jest.fn().mockResolvedValue(0);

      await expect(repository.getStatistics()).rejects.toThrow('Aggregation failed');
    });
  });

  describe('findById', () => {
    it('should find alert by ID', async () => {
      const mockQuery = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockAlert),
      };

      model.findOne = jest.fn().mockReturnValue(mockQuery);

      const result = await repository.findById('alert-123');

      expect(result).toEqual(mockAlert);
      expect(model.findOne).toHaveBeenCalledWith({ id: 'alert-123' });
      expect(mockQuery.lean).toHaveBeenCalled();
    });

    it('should return null when alert is not found', async () => {
      const mockQuery = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };

      model.findOne = jest.fn().mockReturnValue(mockQuery);

      const result = await repository.findById('nonexistent-alert');

      expect(result).toBeNull();
      expect(model.findOne).toHaveBeenCalledWith({ id: 'nonexistent-alert' });
    });

    it('should handle database errors when finding by ID', async () => {
      const mockQuery = {
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(new Error('Query failed')),
      };

      model.findOne = jest.fn().mockReturnValue(mockQuery);

      await expect(repository.findById('alert-123')).rejects.toThrow('Query failed');
    });
  });

  describe('cleanup', () => {
    it('should clean up old resolved alerts successfully', async () => {
      const daysToKeep = 90;
      const deletedCount = 50;

      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ deletedCount }),
      };

      model.deleteMany = jest.fn().mockReturnValue(mockQuery);

      const result = await repository.cleanup(daysToKeep);

      expect(result).toBe(deletedCount);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      expect(model.deleteMany).toHaveBeenCalledWith({
        startTime: { $lt: expect.any(Date) },
        status: AlertStatus.RESOLVED,
      });

      // Verify the cutoff date is approximately correct (within 1 second)
      const actualCutoffDate = (model.deleteMany as jest.Mock).mock.calls[0][0].startTime.$lt;
      const timeDiff = Math.abs(actualCutoffDate.getTime() - cutoffDate.getTime());
      expect(timeDiff).toBeLessThan(1000);
    });

    it('should return zero when no alerts are deleted', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      };

      model.deleteMany = jest.fn().mockReturnValue(mockQuery);

      const result = await repository.cleanup(30);

      expect(result).toBe(0);
    });

    it('should handle database errors during cleanup', async () => {
      const mockQuery = {
        exec: jest.fn().mockRejectedValue(new Error('Delete operation failed')),
      };

      model.deleteMany = jest.fn().mockReturnValue(mockQuery);

      await expect(repository.cleanup(90)).rejects.toThrow('Delete operation failed');
    });

    it('should calculate correct cutoff date for different retention periods', async () => {
      const mockQuery = {
        exec: jest.fn().mockResolvedValue({ deletedCount: 10 }),
      };

      model.deleteMany = jest.fn().mockReturnValue(mockQuery);

      // Test different retention periods
      const retentionPeriods = [7, 30, 90, 365];

      for (const days of retentionPeriods) {
        jest.clearAllMocks();
        
        await repository.cleanup(days);

        const expectedCutoffDate = new Date();
        expectedCutoffDate.setDate(expectedCutoffDate.getDate() - days);

        const actualCutoffDate = (model.deleteMany as jest.Mock).mock.calls[0][0].startTime.$lt;
        const timeDiff = Math.abs(actualCutoffDate.getTime() - expectedCutoffDate.getTime());
        expect(timeDiff).toBeLessThan(1000); // Within 1 second
      }
    });
  });
});
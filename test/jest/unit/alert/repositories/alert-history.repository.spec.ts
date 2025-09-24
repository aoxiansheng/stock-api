import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AlertHistoryRepository } from '../../../../src/alert/repositories/alert-history.repository';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { IAlert, IAlertQuery } from '../../../../src/alert/interfaces';
import { AlertHistory } from '../../../../src/alert/schemas/alert-history.schema';
import { AlertStatus } from '../../../../src/alert/types/alert.types';

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

describe('AlertHistoryRepository', () => {
  let repository: AlertHistoryRepository;
  let alertHistoryModel: any;
  let paginationService: jest.Mocked<PaginationService>;

  const mockAlertHistoryModel = {
    new: jest.fn().mockResolvedValue(mockAlert),
    constructor: jest.fn().mockResolvedValue(mockAlert),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    deleteMany: jest.fn(),
    exec: jest.fn(),
    lean: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertHistoryRepository,
        {
          provide: getModelToken(AlertHistory.name),
          useValue: mockAlertHistoryModel,
        },
        {
          provide: PaginationService,
          useValue: {
            normalizePaginationQuery: jest.fn().mockImplementation((query) => ({
              page: query.page || 1,
              limit: query.limit || 10,
            })),
            calculateSkip: jest.fn().mockImplementation((page, limit) => (page - 1) * limit),
            createPagination: jest.fn().mockImplementation((page, limit, total) => ({
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            })),
          },
        },
      ],
    }).compile();

    repository = module.get(AlertHistoryRepository);
    alertHistoryModel = module.get(getModelToken(AlertHistory.name));
    paginationService = module.get(PaginationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a new alert history record', async () => {
      // Arrange
      const alertData = {
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
      };
      
      const savedAlert = { ...mockAlert, toObject: jest.fn().mockReturnValue(mockAlert) };
      alertHistoryModel.new.mockReturnValue({ save: jest.fn().mockResolvedValue(savedAlert) });

      // Act
      const result = await repository.create(alertData);

      // Assert
      expect(alertHistoryModel.new).toHaveBeenCalledWith(alertData);
      expect(result).toEqual(mockAlert);
    });
  });

  describe('update', () => {
    it('should update an existing alert history record', async () => {
      // Arrange
      const updateData = { status: AlertStatus.RESOLVED, resolvedAt: new Date() };
      const updatedAlert = { ...mockAlert, ...updateData, toObject: jest.fn().mockReturnValue({ ...mockAlert, ...updateData }) };
      alertHistoryModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(updatedAlert) });

      // Act
      const result = await repository.update('alert_1234567890_abcdef', updateData);

      // Assert
      expect(alertHistoryModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'alert_1234567890_abcdef' },
        updateData,
        { new: true }
      );
      expect(result).toEqual({ ...mockAlert, ...updateData });
    });

    it('should return null when alert is not found for update', async () => {
      // Arrange
      alertHistoryModel.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

      // Act
      const result = await repository.update('nonexistent_alert', { status: AlertStatus.RESOLVED });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('find', () => {
    it('should find alerts with query filters', async () => {
      // Arrange
      const query: IAlertQuery = {
        ruleId: 'rule_1234567890_abcdef',
        status: AlertStatus.FIRING,
        severity: 'warning',
        page: 1,
        limit: 10,
      };
      
      alertHistoryModel.find.mockReturnValue({ 
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockAlert])
      });
      alertHistoryModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

      // Act
      const result = await repository.find(query);

      // Assert
      expect(alertHistoryModel.find).toHaveBeenCalled();
      expect(alertHistoryModel.countDocuments).toHaveBeenCalled();
      expect(result).toEqual({ alerts: [mockAlert], total: 1 });
    });

    it('should handle date range filters', async () => {
      // Arrange
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-02');
      const query: IAlertQuery = {
        startTime: startDate,
        endTime: endDate,
        page: 1,
        limit: 10,
      };
      
      alertHistoryModel.find.mockReturnValue({ 
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockAlert])
      });
      alertHistoryModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

      // Act
      const result = await repository.find(query);

      // Assert
      expect(alertHistoryModel.find).toHaveBeenCalled();
      expect(result.alerts).toEqual([mockAlert]);
    });

    it('should handle tag filters', async () => {
      // Arrange
      const query: IAlertQuery = {
        tags: { environment: 'test' },
        page: 1,
        limit: 10,
      };
      
      alertHistoryModel.find.mockReturnValue({ 
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockAlert])
      });
      alertHistoryModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

      // Act
      const result = await repository.find(query);

      // Assert
      expect(alertHistoryModel.find).toHaveBeenCalled();
      expect(result.alerts).toEqual([mockAlert]);
    });
  });

  describe('findActive', () => {
    it('should find all active alerts', async () => {
      // Arrange
      const activeAlert = { ...mockAlert, status: AlertStatus.FIRING };
      alertHistoryModel.find.mockReturnValue({ 
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([activeAlert])
      });

      // Act
      const result = await repository.findActive();

      // Assert
      expect(alertHistoryModel.find).toHaveBeenCalledWith({
        status: { $in: [AlertStatus.FIRING, AlertStatus.ACKNOWLEDGED] },
      });
      expect(result).toEqual([activeAlert]);
    });
  });

  describe('getStatistics', () => {
    it('should return alert statistics', async () => {
      // Arrange
      const activeAlerts = [{ _id: 'warning', count: 5 }];
      const todayAlerts = 10;
      const resolvedToday = 3;
      const avgResolutionTime = [{ avgTime: 1800000 }]; // 30 minutes
      
      alertHistoryModel.aggregate
        .mockResolvedValueOnce(activeAlerts)
        .mockResolvedValueOnce([{}]) // todayAlerts
        .mockResolvedValueOnce([{}]) // resolvedToday
        .mockResolvedValueOnce(avgResolutionTime);

      // Act
      const result = await repository.getStatistics();

      // Assert
      expect(alertHistoryModel.aggregate).toHaveBeenCalledTimes(4);
      expect(result).toEqual({
        activeAlerts,
        todayAlerts: expect.any(Number),
        resolvedToday: expect.any(Number),
        avgResolutionTime,
      });
    });
  });

  describe('getCountByStatus', () => {
    it('should return alert count grouped by status', async () => {
      // Arrange
      const statusCounts = [
        { _id: AlertStatus.FIRING, count: 5 },
        { _id: AlertStatus.RESOLVED, count: 10 },
      ];
      
      alertHistoryModel.aggregate.mockResolvedValue(statusCounts);

      // Act
      const result = await repository.getCountByStatus();

      // Assert
      expect(alertHistoryModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        [AlertStatus.FIRING]: 5,
        [AlertStatus.RESOLVED]: 10,
      });
    });
  });

  describe('getCountBySeverity', () => {
    it('should return alert count grouped by severity', async () => {
      // Arrange
      const severityCounts = [
        { _id: 'warning', count: 5 },
        { _id: 'critical', count: 2 },
      ];
      
      alertHistoryModel.aggregate.mockResolvedValue(severityCounts);

      // Act
      const result = await repository.getCountBySeverity();

      // Assert
      expect(alertHistoryModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual({
        warning: 5,
        critical: 2,
      });
    });
  });

  describe('getAlertTrend', () => {
    it('should return alert trend data', async () => {
      // Arrange
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-07');
      const trendData = [
        { time: '2023-01-01', count: 5, resolved: 3 },
        { time: '2023-01-02', count: 8, resolved: 6 },
      ];
      
      alertHistoryModel.aggregate.mockResolvedValue(trendData);

      // Act
      const result = await repository.getAlertTrend(startDate, endDate, 'day');

      // Assert
      expect(alertHistoryModel.aggregate).toHaveBeenCalled();
      expect(result).toEqual(trendData);
    });
  });

  describe('findById', () => {
    it('should find an alert by ID', async () => {
      // Arrange
      alertHistoryModel.findOne.mockReturnValue({ lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(mockAlert) });

      // Act
      const result = await repository.findById('alert_1234567890_abcdef');

      // Assert
      expect(alertHistoryModel.findOne).toHaveBeenCalledWith({ id: 'alert_1234567890_abcdef' });
      expect(result).toEqual(mockAlert);
    });

    it('should return null when alert is not found', async () => {
      // Arrange
      alertHistoryModel.findOne.mockReturnValue({ lean: jest.fn().mockReturnThis(), exec: jest.fn().mockResolvedValue(null) });

      // Act
      const result = await repository.findById('nonexistent_alert');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('searchByKeyword', () => {
    it('should search alerts by keyword', async () => {
      // Arrange
      const query: IAlertQuery = { page: 1, limit: 10 };
      alertHistoryModel.find.mockReturnValue({ 
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([mockAlert])
      });
      alertHistoryModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

      // Act
      const result = await repository.searchByKeyword('cpu usage', query);

      // Assert
      expect(alertHistoryModel.find).toHaveBeenCalled();
      expect(alertHistoryModel.countDocuments).toHaveBeenCalled();
      expect(result).toEqual({ alerts: [mockAlert], total: 1 });
    });
  });

  describe('cleanup', () => {
    it('should cleanup old resolved alerts', async () => {
      // Arrange
      const daysToKeep = 30;
      alertHistoryModel.deleteMany.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 5 }) });

      // Act
      const result = await repository.cleanup(daysToKeep);

      // Assert
      expect(alertHistoryModel.deleteMany).toHaveBeenCalled();
      expect(result).toBe(5);
    });
  });
});
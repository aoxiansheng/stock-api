/**
 * AlertHistoryService 单元测试
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AlertHistoryService } from '../../../../../src/alert/services/alert-history.service';
import { AlertHistoryRepository } from '../../../../../src/alert/repositories/alert-history.repository';
import { AlertHistory } from '../../../../../src/alert/schemas/alert-history.schema';
import { AlertStatus } from '../../../../../src/alert/types/alert.types';
import { AlertSeverity } from '../../../../../src/alert/enums/alert-severity.enum';
import { CacheService } from '../../../../../src/cache/cache.service';

describe('AlertHistoryService', () => {
  let service: AlertHistoryService;
  let repository: AlertHistoryRepository;
  let model: Model<AlertHistory>;
  let cacheService: jest.Mocked<CacheService>;

  const mockAlertHistory = {
    _id: 'alert-history-123',
    alertId: 'alert-123',
    ruleId: 'rule-123',
    ruleName: '测试告警规则',
    severity: AlertSeverity.CRITICAL,
    status: AlertStatus.FIRING,
    message: '测试告警消息',
    startTime: new Date(),
    endTime: null,
    acknowledgedBy: null,
    acknowledgedAt: null,
    resolvedBy: null,
    resolvedAt: null,
    details: { metric: 'cpu_usage', value: 95 },
    notificationsSent: [],
    save: jest.fn().mockResolvedValue(this),
  };



  // 创建完整的 Mongoose Model mock，包含链式调用
  const mockModel: any = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({
      toObject: jest.fn().mockReturnValue(mockAlertHistory),
    }),
  }));

  // 为 mockModel 添加静态方法
  mockModel.find = jest.fn().mockReturnThis();
  mockModel.findOne = jest.fn().mockReturnThis();
  mockModel.findOneAndUpdate = jest.fn().mockReturnThis();
  mockModel.deleteOne = jest.fn().mockReturnThis();
  mockModel.deleteMany = jest.fn().mockReturnThis();
  mockModel.create = jest.fn().mockResolvedValue(mockAlertHistory);
  mockModel.findById = jest.fn().mockReturnThis();
  mockModel.aggregate = jest.fn().mockResolvedValue([]);
  mockModel.countDocuments = jest.fn().mockReturnThis();
  mockModel.sort = jest.fn().mockReturnThis();
  mockModel.skip = jest.fn().mockReturnThis();
  mockModel.limit = jest.fn().mockReturnThis();
  mockModel.lean = jest.fn().mockReturnThis();
  mockModel.exec = jest.fn().mockResolvedValue(mockAlertHistory);

  beforeEach(async () => {
    const mockCacheService = {
      getClient: jest.fn().mockReturnValue({
        keys: jest.fn().mockResolvedValue([]),
        get: jest.fn().mockResolvedValue(null),
        set: jest.fn().mockResolvedValue('OK'),
        ts: {
          add: jest.fn().mockResolvedValue(1),
          revrange: jest.fn().mockResolvedValue([]),
        },
      }),
      cacheAlertHistory: jest.fn(),
      getCachedAlertHistory: jest.fn(),
      updateCachedAlertStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertHistoryService,
        AlertHistoryRepository,
        {
          provide: getModelToken(AlertHistory.name),
          useValue: mockModel,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<AlertHistoryService>(AlertHistoryService);
    repository = module.get<AlertHistoryRepository>(AlertHistoryRepository);
    model = module.get<Model<AlertHistory>>(getModelToken(AlertHistory.name));
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAlert', () => {
    it('应该成功创建告警记录', async () => {
      const createDto = {
        ruleId: 'rule-123',
        ruleName: '测试规则',
        metric: 'cpu_usage',
        value: 95,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        message: '测试告警',
        context: {},
      };

      const expectedEntry = {
        ...mockAlertHistory,
        ...createDto,
      };

      // Mock model constructor and save method
      const mockInstance = {
        save: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue(expectedEntry),
        }),
      };
      mockModel.mockImplementation(() => mockInstance);

      const result = await service.createAlert(createDto);

      expect(mockModel).toHaveBeenCalledWith(expect.objectContaining({
        ...createDto,
        id: expect.any(String),
        startTime: expect.any(Date),
        status: AlertStatus.FIRING,
      }));
      expect(result).toEqual(expectedEntry);
    });

    it('应该在创建失败时抛出异常', async () => {
      const createDto = {
        ruleId: 'rule-123',
        ruleName: '测试规则',
        metric: 'cpu_usage',
        value: 95,
        threshold: 80,
        severity: AlertSeverity.CRITICAL,
        message: '测试告警',
        context: {},
      };

      const mockInstance = {
        save: jest.fn().mockRejectedValue(new Error('创建失败')),
      };
      mockModel.mockImplementation(() => mockInstance);

      await expect(service.createAlert(createDto)).rejects.toThrow('创建失败');
    });
  });

  describe('getAlertById', () => {
    it('应该成功根据ID获取告警', async () => {
      const alertId = 'alert-123';
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAlertHistory),
        }),
      });

      const result = await service.getAlertById(alertId);

      expect(mockModel.findOne).toHaveBeenCalledWith({ id: alertId });
      expect(result).toEqual(mockAlertHistory);
    });

    it('应该在告警不存在时返回null', async () => {
      const alertId = 'nonexistent-alert';
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await service.getAlertById(alertId);

      expect(mockModel.findOne).toHaveBeenCalledWith({ id: alertId });
      expect(result).toBeNull();
    });
  });

  describe('queryAlerts', () => {
    it('应该成功查询告警记录', async () => {
      const query = {
        page: 1,
        limit: 10,
        severity: AlertSeverity.CRITICAL,
      };
      
      const mockAlerts = [mockAlertHistory];
      
      // Mock the chain: find().sort().skip().limit().lean().exec()
      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue(mockAlerts),
              }),
            }),
          }),
        }),
      });
      
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.queryAlerts(query);

      expect(result.alerts).toEqual(mockAlerts);
      expect(result.total).toBe(1);
    });

    it('应该在没有记录时返回空数组', async () => {
      const query = { page: 1, limit: 10 };
      
      // Mock the chain: find().sort().skip().limit().lean().exec()
      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });
      
      mockModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const result = await service.queryAlerts(query);

      expect(result.alerts).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getActiveAlerts', () => {
    it('应该成功获取所有活跃告警', async () => {
      const mockActiveAlerts = [
        { ...mockAlertHistory, status: AlertStatus.FIRING },
        { ...mockAlertHistory, _id: 'alert-456', status: AlertStatus.ACKNOWLEDGED },
      ];

      // Mock the chain: find().sort().lean().exec()
      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockActiveAlerts),
          }),
        }),
      });

      const result = await service.getActiveAlerts();

      expect(mockModel.find).toHaveBeenCalledWith({
        status: { $in: [AlertStatus.FIRING, AlertStatus.ACKNOWLEDGED] },
      });
      expect(result).toEqual(mockActiveAlerts);
    });

    it('应该在没有活跃告警时返回空数组', async () => {
      // Mock the chain: find().sort().lean().exec()
      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await service.getActiveAlerts();

      expect(mockModel.find).toHaveBeenCalledWith({
        status: { $in: [AlertStatus.FIRING, AlertStatus.ACKNOWLEDGED] },
      });
      expect(result).toEqual([]);
    });
  });

  describe('updateAlertStatus', () => {
    it('应该成功更新告警状态', async () => {
      const alertId = 'alert-123';
      const newStatus = AlertStatus.RESOLVED;
      const updatedAlert = { ...mockAlertHistory, status: newStatus };

      mockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          toObject: jest.fn().mockReturnValue(updatedAlert),
        }),
      });

      const result = await service.updateAlertStatus(alertId, newStatus);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: alertId },
        expect.objectContaining({
          status: newStatus,
        }),
        { new: true }
      );
      expect(result).toEqual(updatedAlert);
    });

    it('应该在更新不存在的告警时返回null', async () => {
      const alertId = 'nonexistent-alert';
      const newStatus = AlertStatus.RESOLVED;

      mockModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.updateAlertStatus(alertId, newStatus);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: alertId },
        expect.objectContaining({
          status: newStatus,
        }),
        { new: true }
      );
      expect(result).toBeNull();
    });
  });

  describe('getAlertStats', () => {
    it('应该成功获取告警统计信息', async () => {
      const mockActiveAlerts = [
        { _id: 'critical', count: 5 },
        { _id: 'warning', count: 10 },
      ];
      const mockAvgResolutionTime = [{ avgTime: 300000 }]; // 5 minutes in milliseconds

      // Mock aggregate calls for getStatistics()
      mockModel.aggregate
        .mockResolvedValueOnce(mockActiveAlerts) // First call for active alerts
        .mockResolvedValueOnce(mockAvgResolutionTime); // Second call for avg resolution time

      // Mock countDocuments calls for getStatistics()
      mockModel.countDocuments
        .mockResolvedValueOnce(25) // Today alerts
        .mockResolvedValueOnce(20); // Resolved today

      const result = await service.getAlertStats();

      expect(result.activeAlerts).toBe(15);
      expect(result.totalAlertsToday).toBe(25);
      expect(result.resolvedAlertsToday).toBe(20);
      expect(result.averageResolutionTime).toBe(5); // 5 minutes
    });

    it('应该在统计数据不可用时返回空统计', async () => {
      // Mock aggregate calls for getStatistics()
      mockModel.aggregate
        .mockResolvedValueOnce([]) // First call for active alerts
        .mockResolvedValueOnce([]); // Second call for avg resolution time

      // Mock countDocuments calls for getStatistics()
      mockModel.countDocuments
        .mockResolvedValueOnce(0) // Today alerts
        .mockResolvedValueOnce(0); // Resolved today

      const result = await service.getAlertStats();

      expect(result.activeAlerts).toBe(0);
      expect(result.totalAlertsToday).toBe(0);
      expect(result.resolvedAlertsToday).toBe(0);
      expect(result.averageResolutionTime).toBe(0);
    });
  });


  describe('错误处理', () => {
    it('应该在数据库错误时正确抛出异常', async () => {
      const alertId = 'alert-123';
      mockModel.findOne.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(new Error('数据库连接失败')),
        }),
      });

      await expect(service.getAlertById(alertId)).rejects.toThrow('数据库连接失败');
    });

    it('应该在查询参数无效时处理异常', async () => {
      const invalidQuery = { page: -1, limit: 0 };
      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockReturnValue({
                exec: jest.fn().mockRejectedValue(new Error('无效查询参数')),
              }),
            }),
          }),
        }),
      });

      await expect(service.queryAlerts(invalidQuery)).rejects.toThrow('无效查询参数');
    });
  });
});
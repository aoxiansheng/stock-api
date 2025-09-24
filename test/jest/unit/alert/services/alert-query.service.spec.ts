import { Test, TestingModule } from '@nestjs/testing';
import { AlertQueryService } from '../../../../src/alert/services/alert-query.service';
import { AlertHistoryRepository } from '../../../../src/alert/repositories/alert-history.repository';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { IAlert, IAlertQuery } from '../../../../src/alert/interfaces';
import { AlertStatus } from '../../../../src/alert/types/alert.types';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

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

const mockAlertQuery: IAlertQuery = {
  ruleId: 'rule_1234567890_abcdef',
  status: AlertStatus.FIRING,
  severity: 'warning',
  page: 1,
  limit: 10,
};

describe('AlertQueryService', () => {
  let service: AlertQueryService;
  let alertHistoryRepository: jest.Mocked<AlertHistoryRepository>;
  let paginationService: jest.Mocked<PaginationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertQueryService,
        {
          provide: AlertHistoryRepository,
          useValue: {
            find: jest.fn(),
            findActive: jest.fn(),
            getStatistics: jest.fn(),
            getCountByStatus: jest.fn(),
            getCountBySeverity: jest.fn(),
            getAlertTrend: jest.fn(),
            searchByKeyword: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: PaginationService,
          useValue: {
            normalizePaginationQuery: jest.fn().mockImplementation((query) => ({
              page: query.page || 1,
              limit: query.limit || 50,
            })),
            createPagination: jest.fn().mockImplementation((page, limit, total) => ({
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            })),
            calculateSkip: jest.fn().mockImplementation((page, limit) => (page - 1) * limit),
          },
        },
      ],
    }).compile();

    service = module.get(AlertQueryService);
    alertHistoryRepository = module.get(AlertHistoryRepository);
    paginationService = module.get(PaginationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAlerts', () => {
    it('should return alerts by alert ID', async () => {
      // Arrange
      alertHistoryRepository.findById.mockResolvedValue(mockAlert);

      // Act
      const result = await service.getAlerts({ alertId: 'alert_1234567890_abcdef' });

      // Assert
      expect(alertHistoryRepository.findById).toHaveBeenCalledWith('alert_1234567890_abcdef');
      expect(result).toEqual([mockAlert]);
    });

    it('should return alerts by filter criteria', async () => {
      // Arrange
      alertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      // Act
      const result = await service.getAlerts({ ruleId: 'rule_1234567890_abcdef', status: 'firing' });

      // Assert
      expect(alertHistoryRepository.find).toHaveBeenCalled();
      expect(result).toEqual([mockAlert]);
    });

    it('should return empty array when no alerts found by ID', async () => {
      // Arrange
      alertHistoryRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.getAlerts({ alertId: 'nonexistent_alert' });

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getAlertHistory', () => {
    it('should return alert history with pagination', async () => {
      // Arrange
      const mockResult = {
        alerts: [mockAlert],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      };
      
      alertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });
      paginationService.createPagination.mockReturnValue({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });

      // Act
      const result = await service.getAlertHistory(mockAlertQuery);

      // Assert
      expect(alertHistoryRepository.find).toHaveBeenCalledWith(mockAlertQuery);
      expect(result).toEqual(mockResult);
    });
  });

  describe('queryAlerts', () => {
    it('should query alerts with pagination', async () => {
      // Arrange
      const mockResult = {
        alerts: [mockAlert],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      };
      
      alertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });
      paginationService.createPagination.mockReturnValue({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });

      // Act
      const result = await service.queryAlerts(mockAlertQuery);

      // Assert
      expect(alertHistoryRepository.find).toHaveBeenCalledWith(mockAlertQuery);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getActiveAlerts', () => {
    it('should return active alerts sorted by start time', async () => {
      // Arrange
      const activeAlerts = [
        { ...mockAlert, id: 'alert_1', startTime: new Date('2023-01-01T10:00:00Z') },
        { ...mockAlert, id: 'alert_2', startTime: new Date('2023-01-01T12:00:00Z') },
        { ...mockAlert, id: 'alert_3', startTime: new Date('2023-01-01T08:00:00Z') },
      ];
      
      alertHistoryRepository.findActive.mockResolvedValue(activeAlerts);

      // Act
      const result = await service.getActiveAlerts();

      // Assert
      expect(alertHistoryRepository.findActive).toHaveBeenCalled();
      expect(result).toHaveLength(3);
      // Check if sorted correctly (latest first)
      expect(result[0].id).toBe('alert_2');
      expect(result[1].id).toBe('alert_1');
      expect(result[2].id).toBe('alert_3');
    });
  });

  describe('getRecentAlerts', () => {
    it('should return recent alerts with default limit', async () => {
      // Arrange
      alertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      // Act
      const result = await service.getRecentAlerts();

      // Assert
      expect(alertHistoryRepository.find).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result).toEqual([mockAlert]);
    });

    it('should return recent alerts with custom limit', async () => {
      // Arrange
      alertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      // Act
      const result = await service.getRecentAlerts(5);

      // Assert
      expect(alertHistoryRepository.find).toHaveBeenCalledWith({ page: 1, limit: 5 });
      expect(result).toEqual([mockAlert]);
    });

    it('should normalize limit when out of range', async () => {
      // Arrange
      alertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      // Act
      const result = await service.getRecentAlerts(-1);

      // Assert
      expect(alertHistoryRepository.find).toHaveBeenCalledWith({ page: 1, limit: 20 });
      expect(result).toEqual([mockAlert]);
    });
  });

  describe('getAlertsByRuleId', () => {
    it('should return alerts for a specific rule', async () => {
      // Arrange
      alertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      // Act
      const result = await service.getAlertsByRuleId('rule_1234567890_abcdef');

      // Assert
      expect(alertHistoryRepository.find).toHaveBeenCalledWith({
        ruleId: 'rule_1234567890_abcdef',
        page: 1,
        limit: 50,
      });
      expect(result).toEqual([mockAlert]);
    });
  });

  describe('getAlertsByStatus', () => {
    it('should return alerts with specific status', async () => {
      // Arrange
      alertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      // Act
      const result = await service.getAlertsByStatus(AlertStatus.FIRING);

      // Assert
      expect(alertHistoryRepository.find).toHaveBeenCalledWith({
        status: AlertStatus.FIRING,
        page: 1,
        limit: 50,
      });
      expect(result).toEqual([mockAlert]);
    });
  });

  describe('getAlertsBySeverity', () => {
    it('should return alerts with specific severity', async () => {
      // Arrange
      alertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      // Act
      const result = await service.getAlertsBySeverity('warning');

      // Assert
      expect(alertHistoryRepository.find).toHaveBeenCalledWith({
        severity: 'warning',
        page: 1,
        limit: 50,
      });
      expect(result).toEqual([mockAlert]);
    });
  });

  describe('getAlertStatistics', () => {
    it('should return alert statistics', async () => {
      // Arrange
      const mockStats = {
        activeAlerts: [{ _id: 'critical', count: 2 }, { _id: 'warning', count: 5 }],
        todayAlerts: 10,
        resolvedToday: 3,
        avgResolutionTime: [{ avgTime: 1800000 }], // 30 minutes in milliseconds
      };
      
      alertHistoryRepository.getStatistics.mockResolvedValue(mockStats);

      // Act
      const result = await service.getAlertStatistics();

      // Assert
      expect(alertHistoryRepository.getStatistics).toHaveBeenCalled();
      expect(result).toEqual({
        activeAlerts: 7,
        criticalAlerts: 2,
        warningAlerts: 5,
        infoAlerts: 0,
        totalAlertsToday: 10,
        resolvedAlertsToday: 3,
        averageResolutionTime: 30, // 30 minutes
        statisticsTime: expect.any(Date),
      });
    });
  });

  describe('getAlertCountByStatus', () => {
    it('should return alert counts grouped by status', async () => {
      // Arrange
      const mockCounts = {
        [AlertStatus.FIRING]: 5,
        [AlertStatus.ACKNOWLEDGED]: 3,
        [AlertStatus.RESOLVED]: 10,
        [AlertStatus.SUPPRESSED]: 2,
      };
      
      alertHistoryRepository.getCountByStatus.mockResolvedValue(mockCounts);

      // Act
      const result = await service.getAlertCountByStatus();

      // Assert
      expect(alertHistoryRepository.getCountByStatus).toHaveBeenCalled();
      expect(result).toEqual(mockCounts);
    });
  });

  describe('getAlertCountBySeverity', () => {
    it('should return alert counts grouped by severity', async () => {
      // Arrange
      const mockCounts = {
        critical: 2,
        warning: 5,
        info: 3,
        custom: 1,
      };
      
      alertHistoryRepository.getCountBySeverity.mockResolvedValue(mockCounts);

      // Act
      const result = await service.getAlertCountBySeverity();

      // Assert
      expect(alertHistoryRepository.getCountBySeverity).toHaveBeenCalled();
      expect(result).toEqual({
        critical: 2,
        warning: 5,
        info: 3,
        custom: 1,
      });
    });
  });

  describe('getAlertTrend', () => {
    it('should return alert trend data', async () => {
      // Arrange
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-07');
      const mockTrendData = [
        { time: '2023-01-01', count: 5, resolved: 3 },
        { time: '2023-01-02', count: 8, resolved: 6 },
      ];
      
      alertHistoryRepository.getAlertTrend.mockResolvedValue(mockTrendData);

      // Act
      const result = await service.getAlertTrend(startDate, endDate, 'day');

      // Assert
      expect(alertHistoryRepository.getAlertTrend).toHaveBeenCalledWith(startDate, endDate, 'day');
      expect(result).toEqual(mockTrendData);
    });

    it('should throw an exception when start date is after end date', async () => {
      // Arrange
      const startDate = new Date('2023-01-07');
      const endDate = new Date('2023-01-01');

      // Act & Assert
      await expect(service.getAlertTrend(startDate, endDate, 'day'))
        .rejects
        .toThrow();
    });
  });

  describe('searchAlerts', () => {
    it('should search alerts by keyword', async () => {
      // Arrange
      alertHistoryRepository.searchByKeyword.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      // Act
      const result = await service.searchAlerts('cpu usage', { status: AlertStatus.FIRING }, 10);

      // Assert
      expect(alertHistoryRepository.searchByKeyword).toHaveBeenCalled();
      expect(result).toEqual([mockAlert]);
    });

    it('should throw an exception when keyword is empty', async () => {
      // Act & Assert
      await expect(service.searchAlerts('', {}, 10))
        .rejects
        .toThrow();
    });

    it('should throw an exception when keyword is too long', async () => {
      // Act & Assert
      await expect(service.searchAlerts('a'.repeat(101), {}, 10))
        .rejects
        .toThrow();
    });
  });

  describe('exportAlerts', () => {
    it('should export alerts in JSON format', async () => {
      // Arrange
      alertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      // Act
      const result = await service.exportAlerts(mockAlertQuery, 'json');

      // Assert
      expect(alertHistoryRepository.find).toHaveBeenCalledWith({ ...mockAlertQuery, limit: 10000 });
      expect(result.filename).toMatch(/alerts_export_\d{4}-\d{2}-\d{2}\.json/);
      expect(result.mimeType).toBe('application/json');
      expect(result.data).toBe(JSON.stringify([mockAlert], null, 2));
    });

    it('should export alerts in CSV format', async () => {
      // Arrange
      alertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      // Act
      const result = await service.exportAlerts(mockAlertQuery, 'csv');

      // Assert
      expect(alertHistoryRepository.find).toHaveBeenCalledWith({ ...mockAlertQuery, limit: 10000 });
      expect(result.filename).toMatch(/alerts_export_\d{4}-\d{2}-\d{2}\.csv/);
      expect(result.mimeType).toBe('text/csv');
      expect(result.data).toContain('ID,Rule ID,Rule Name,Status,Severity,Metric,Value,Threshold,Message');
    });
  });

  describe('getQueryStats', () => {
    it('should return query statistics', () => {
      // Act
      const stats = service.getQueryStats();

      // Assert
      expect(stats).toEqual({
        totalQueries: 0,
        cacheHitRate: 0,
        averageQueryTime: 0,
        popularFilters: [],
      });
    });
  });
});
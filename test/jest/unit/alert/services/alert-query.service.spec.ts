import { Test, TestingModule } from '@nestjs/testing';
import { AlertQueryService } from '@alert/services/alert-query.service';
import { AlertHistoryRepository } from '@alert/repositories/alert-history.repository';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { IAlert, IAlertQuery } from '@alert/interfaces';
import { AlertStatus, AlertSeverity } from '@alert/types/alert.types';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

describe('AlertQueryService', () => {
  let service: AlertQueryService;
  let mockAlertHistoryRepository: any;
  let mockPaginationService: any;
  let mockCacheLimits: any;

  const mockAlert: IAlert = {
    id: '507f1f77bcf86cd799439012',
    ruleId: '507f1f77bcf86cd799439011',
    ruleName: 'Test Rule',
    status: AlertStatus.FIRING,
    severity: AlertSeverity.CRITICAL,
    message: 'Test alert message',
    value: 85,
    threshold: 80,
    startTime: new Date('2025-09-24T10:00:00Z'),
    metric: 'cpu_usage',
    tags: { host: 'server-1', environment: 'production' },
    context: { additionalInfo: 'test' }
  };

  const mockAlerts = [
    mockAlert,
    {
      ...mockAlert,
      id: '507f1f77bcf86cd799439013',
      severity: AlertSeverity.WARNING,
      status: AlertStatus.RESOLVED,
      value: 75
    },
    {
      ...mockAlert,
      id: '507f1f77bcf86cd799439014',
      severity: AlertSeverity.INFO,
      status: AlertStatus.ACKNOWLEDGED,
      value: 70
    }
  ];

  beforeEach(async () => {
    mockCacheLimits = {
      maxBatchSize: 100,
      defaultTtl: 300,
      maxMemory: 1000
    };

    mockAlertHistoryRepository = {
      findById: jest.fn(),
      find: jest.fn(),
      findActive: jest.fn(),
      getStatistics: jest.fn(),
      getAlertTrend: jest.fn(),
      searchByKeyword: jest.fn(),
      getCountByStatus: jest.fn(),
      getCountBySeverity: jest.fn()
    };

    mockPaginationService = {
      normalizePaginationQuery: jest.fn().mockImplementation((query) => query),
      createPagination: jest.fn().mockImplementation((page, limit, total) => ({
        total,
        totalPages: Math.ceil(total / limit),
        page: page,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }))
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertQueryService,
        { provide: AlertHistoryRepository, useValue: mockAlertHistoryRepository },
        { provide: PaginationService, useValue: mockPaginationService },
        { provide: 'CONFIGURATION(cacheUnified)', useValue: mockCacheLimits }
      ],
    }).compile();

    service = module.get<AlertQueryService>(AlertQueryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Get Alerts', () => {
    it('should get alerts with no filter', async () => {
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: mockAlerts, total: 3 });

      const result = await service.getAlerts({});

      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith({
        page: 1,
        limit: 1000
      });
      expect(result).toEqual(mockAlerts);
    });

    it('should get single alert by alertId', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      mockAlertHistoryRepository.findById.mockResolvedValue(mockAlert);

      const result = await service.getAlerts({ alertId });

      expect(mockAlertHistoryRepository.findById).toHaveBeenCalledWith(alertId);
      expect(result).toEqual([mockAlert]);
    });

    it('should return empty array when alert not found by ID', async () => {
      const alertId = '507f1f77bcf86cd799439012';
      mockAlertHistoryRepository.findById.mockResolvedValue(null);

      const result = await service.getAlerts({ alertId });

      expect(result).toEqual([]);
    });

    it('should get alerts filtered by ruleId', async () => {
      const ruleId = '507f1f77bcf86cd799439011';
      const filteredAlerts = [mockAlert];
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: filteredAlerts, total: 1 });

      const result = await service.getAlerts({ ruleId });

      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith({
        page: 1,
        limit: 1000,
        ruleId
      });
      expect(result).toEqual(filteredAlerts);
    });

    it('should get alerts filtered by status', async () => {
      const status = 'firing';
      const filteredAlerts = [mockAlert];
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: filteredAlerts, total: 1 });

      const result = await service.getAlerts({ status });

      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith({
        page: 1,
        limit: 1000,
        status: AlertStatus.FIRING
      });
      expect(result).toEqual(filteredAlerts);
    });

    it('should get alerts filtered by severity', async () => {
      const severity = 'critical';
      const filteredAlerts = [mockAlert];
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: filteredAlerts, total: 1 });

      const result = await service.getAlerts({ severity });

      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith({
        page: 1,
        limit: 1000,
        severity: 'critical'
      });
      expect(result).toEqual(filteredAlerts);
    });

    it('should get alerts filtered by metric', async () => {
      const metric = 'cpu_usage';
      const filteredAlerts = [mockAlert];
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: filteredAlerts, total: 1 });

      const result = await service.getAlerts({ metric });

      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith({
        page: 1,
        limit: 1000,
        metric
      });
      expect(result).toEqual(filteredAlerts);
    });

    it('should handle get alerts errors', async () => {
      mockAlertHistoryRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.getAlerts({})).rejects.toThrow('Database error');
    });
  });

  describe('Query Alerts', () => {
    it('should query alerts with pagination', async () => {
      const query: IAlertQuery = {
        page: 2,
        limit: 10,
        status: AlertStatus.FIRING,
        severity: AlertSeverity.CRITICAL
      };

      const queryResult = {
        alerts: mockAlerts.slice(0, 2),
        total: 2
      };

      mockAlertHistoryRepository.find.mockResolvedValue(queryResult);
      mockPaginationService.normalizePaginationQuery.mockReturnValue({ page: 2, limit: 10 });
      mockPaginationService.createPagination.mockReturnValue({
        total: 2,
        totalPages: 1,
        page: 2,
        hasNext: false,
        hasPrev: true
      });

      const result = await service.queryAlerts(query);

      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith(query);
      expect(result.alerts).toEqual(queryResult.alerts);
      expect(result.total).toBe(2);
      expect(result.totalPages).toBe(1);
      expect(result.page).toBe(2);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(true);
    });

    it('should handle query alerts errors', async () => {
      mockAlertHistoryRepository.find.mockRejectedValue(new Error('Query failed'));

      await expect(service.queryAlerts({})).rejects.toThrow('Query failed');
    });
  });

  describe('Get Alert History', () => {
    it('should delegate to queryAlerts', async () => {
      const query: IAlertQuery = { page: 1, limit: 20 };
      const queryResult = {
        alerts: mockAlerts,
        total: 3
      };

      mockAlertHistoryRepository.find.mockResolvedValue(queryResult);

      const result = await service.getAlertHistory(query);

      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith(query);
      expect(result.alerts).toEqual(queryResult.alerts);
      expect(result.total).toBe(3);
    });
  });

  describe('Get Active Alerts', () => {
    it('should get active alerts successfully', async () => {
      const activeAlerts = [
        { ...mockAlert, startTime: new Date('2025-09-24T10:05:00Z') },
        { ...mockAlert, id: '507f1f77bcf86cd799439013', startTime: new Date('2025-09-24T10:00:00Z') }
      ];
      mockAlertHistoryRepository.findActive.mockResolvedValue(activeAlerts);

      const result = await service.getActiveAlerts();

      expect(mockAlertHistoryRepository.findActive).toHaveBeenCalled();
      // Should be sorted with latest first
      expect(result[0].id).toBe('507f1f77bcf86cd799439012');
      expect(result[1].id).toBe('507f1f77bcf86cd799439013');
    });

    it('should handle get active alerts errors', async () => {
      mockAlertHistoryRepository.findActive.mockRejectedValue(new Error('Database error'));

      await expect(service.getActiveAlerts()).rejects.toThrow('Database error');
    });
  });

  describe('Get Recent Alerts', () => {
    it('should get recent alerts with default limit', async () => {
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      const result = await service.getRecentAlerts();

      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith({
        page: 1,
        limit: 20
      });
      expect(result).toEqual([mockAlert]);
    });

    it('should get recent alerts with custom limit', async () => {
      const limit = 50;
      const recentAlerts = mockAlerts.slice(0, 2);
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: recentAlerts, total: 2 });

      const result = await service.getRecentAlerts(limit);

      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith({
        page: 1,
        limit
      });
      expect(result).toEqual(recentAlerts);
    });

    it('should normalize limit values', async () => {
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      // Test with negative limit
      const result1 = await service.getRecentAlerts(-5);
      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith({
        page: 1,
        limit: 20
      });

      // Test with too large limit
      const result2 = await service.getRecentAlerts(150);
      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith({
        page: 1,
        limit: 20
      });
    });

    it('should handle get recent alerts errors', async () => {
      mockAlertHistoryRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.getRecentAlerts()).rejects.toThrow('Database error');
    });
  });

  describe('Get Alerts By Rule ID', () => {
    it('should get alerts by rule ID', async () => {
      const ruleId = '507f1f77bcf86cd799439011';
      const ruleAlerts = [mockAlert];
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: ruleAlerts, total: 1 });

      const result = await service.getAlertsByRuleId(ruleId);

      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith({
        ruleId,
        page: 1,
        limit: 50
      });
      expect(result).toEqual(ruleAlerts);
    });

    it('should handle get alerts by rule ID errors', async () => {
      mockAlertHistoryRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.getAlertsByRuleId('some-rule-id')).rejects.toThrow('Database error');
    });
  });

  describe('Get Alerts By Status', () => {
    it('should get alerts by status', async () => {
      const status = AlertStatus.RESOLVED;
      const statusAlerts = [mockAlerts[1]];
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: statusAlerts, total: 1 });

      const result = await service.getAlertsByStatus(status);

      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith({
        status,
        page: 1,
        limit: 50
      });
      expect(result).toEqual(statusAlerts);
    });

    it('should handle get alerts by status errors', async () => {
      mockAlertHistoryRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.getAlertsByStatus(AlertStatus.FIRING)).rejects.toThrow('Database error');
    });
  });

  describe('Get Alerts By Severity', () => {
    it('should get alerts by severity', async () => {
      const severity = 'critical';
      const severityAlerts = [mockAlert];
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: severityAlerts, total: 1 });

      const result = await service.getAlertsBySeverity(severity);

      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith({
        severity,
        page: 1,
        limit: 50
      });
      expect(result).toEqual(severityAlerts);
    });

    it('should handle get alerts by severity errors', async () => {
      mockAlertHistoryRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.getAlertsBySeverity('critical')).rejects.toThrow('Database error');
    });
  });

  describe('Search Alerts', () => {
    it('should search alerts by keyword', async () => {
      const keyword = 'cpu usage';
      const searchResults = { alerts: [mockAlert], total: 1 };
      mockAlertHistoryRepository.searchByKeyword.mockResolvedValue(searchResults);

      const result = await service.searchAlerts(keyword);

      expect(mockAlertHistoryRepository.searchByKeyword).toHaveBeenCalledWith(
        keyword,
        {
          page: 1,
          limit: 50
        }
      );
      expect(result).toEqual([mockAlert]);
    });

    it('should search alerts with filters', async () => {
      const keyword = 'critical';
      const filters = { severity: AlertSeverity.CRITICAL, status: AlertStatus.FIRING };
      const searchResults = { alerts: [mockAlert], total: 1 };
      mockAlertHistoryRepository.searchByKeyword.mockResolvedValue(searchResults);

      const result = await service.searchAlerts(keyword, filters, 30);

      expect(mockAlertHistoryRepository.searchByKeyword).toHaveBeenCalledWith(
        keyword,
        {
          ...filters,
          page: 1,
          limit: 30
        }
      );
      expect(result).toEqual([mockAlert]);
    });

    it('should handle empty keyword', async () => {
      await expect(service.searchAlerts('')).rejects.toThrow();
    });

    it('should handle long keyword', async () => {
      const longKeyword = 'a'.repeat(150);
      await expect(service.searchAlerts(longKeyword)).rejects.toThrow();
    });

    it('should handle search alerts errors', async () => {
      mockAlertHistoryRepository.searchByKeyword.mockRejectedValue(new Error('Search failed'));
      // 模拟降级后的 find 方法也失败
      mockAlertHistoryRepository.find.mockRejectedValue(new Error('Find failed'));

      await expect(service.searchAlerts('test')).rejects.toThrow('Find failed');
    });

    it('should fallback to find when search fails', async () => {
      const keyword = 'test';
      mockAlertHistoryRepository.searchByKeyword.mockRejectedValue(new Error('Search failed'));
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      const result = await service.searchAlerts(keyword);

      expect(mockAlertHistoryRepository.find).toHaveBeenCalledWith({
        page: 1,
        limit: 50
      });
      expect(result).toEqual([mockAlert]);
    });

    it('should handle fallback errors', async () => {
      const keyword = 'test';
      mockAlertHistoryRepository.searchByKeyword.mockRejectedValue(new Error('Search failed'));
      mockAlertHistoryRepository.find.mockRejectedValue(new Error('Find failed'));

      await expect(service.searchAlerts(keyword)).rejects.toThrow('Find failed');
    });
  });

  describe('Get Alert Statistics', () => {
    it('should get alert statistics successfully', async () => {
      const mockStats = {
        activeAlerts: [
          { _id: 'critical', count: 2 },
          { _id: 'warning', count: 3 },
          { _id: 'info', count: 1 }
        ],
        todayAlerts: 10,
        resolvedToday: 5,
        avgResolutionTime: [{ avgTime: 1800000 }] // 30 minutes in milliseconds
      };

      mockAlertHistoryRepository.getStatistics.mockResolvedValue(mockStats);

      const result = await service.getAlertStatistics();

      expect(mockAlertHistoryRepository.getStatistics).toHaveBeenCalled();
      expect(result.activeAlerts).toBe(6);
      expect(result.criticalAlerts).toBe(2);
      expect(result.warningAlerts).toBe(3);
      expect(result.infoAlerts).toBe(1);
      expect(result.totalAlertsToday).toBe(10);
      expect(result.resolvedAlertsToday).toBe(5);
      expect(result.averageResolutionTime).toBe(30); // 30 minutes
    });

    it('should handle get statistics errors', async () => {
      mockAlertHistoryRepository.getStatistics.mockRejectedValue(new Error('Statistics error'));

      await expect(service.getAlertStatistics()).rejects.toThrow('Statistics error');
    });
  });

  describe('Get Alert Count By Status', () => {
    it('should get alert count by status', async () => {
      const statusCounts = {
        [AlertStatus.FIRING]: 5,
        [AlertStatus.ACKNOWLEDGED]: 3,
        [AlertStatus.RESOLVED]: 10,
        [AlertStatus.SUPPRESSED]: 2
      };

      mockAlertHistoryRepository.getCountByStatus.mockResolvedValue(statusCounts);

      const result = await service.getAlertCountByStatus();

      expect(mockAlertHistoryRepository.getCountByStatus).toHaveBeenCalled();
      expect(result[AlertStatus.FIRING]).toBe(5);
      expect(result[AlertStatus.ACKNOWLEDGED]).toBe(3);
      expect(result[AlertStatus.RESOLVED]).toBe(10);
      expect(result[AlertStatus.SUPPRESSED]).toBe(2);
    });

    it('should handle missing status counts', async () => {
      const statusCounts = {
        [AlertStatus.FIRING]: 5
      };

      mockAlertHistoryRepository.getCountByStatus.mockResolvedValue(statusCounts);

      const result = await service.getAlertCountByStatus();

      expect(result[AlertStatus.FIRING]).toBe(5);
      expect(result[AlertStatus.ACKNOWLEDGED]).toBe(0);
      expect(result[AlertStatus.RESOLVED]).toBe(0);
      expect(result[AlertStatus.SUPPRESSED]).toBe(0);
    });

    it('should handle get count by status errors', async () => {
      mockAlertHistoryRepository.getCountByStatus.mockRejectedValue(new Error('Count error'));

      await expect(service.getAlertCountByStatus()).rejects.toThrow('Count error');
    });
  });

  describe('Get Alert Count By Severity', () => {
    it('should get alert count by severity', async () => {
      const severityCounts = {
        critical: 5,
        warning: 3,
        info: 2,
        custom: 1
      };

      mockAlertHistoryRepository.getCountBySeverity.mockResolvedValue(severityCounts);

      const result = await service.getAlertCountBySeverity();

      expect(mockAlertHistoryRepository.getCountBySeverity).toHaveBeenCalled();
      expect(result.critical).toBe(5);
      expect(result.warning).toBe(3);
      expect(result.info).toBe(2);
      expect(result.custom).toBe(1);
    });

    it('should handle get count by severity errors', async () => {
      mockAlertHistoryRepository.getCountBySeverity.mockRejectedValue(new Error('Count error'));

      await expect(service.getAlertCountBySeverity()).rejects.toThrow('Count error');
    });
  });

  describe('Get Alert Trend', () => {
    it('should get alert trend with date range', async () => {
      const startDate = new Date('2025-09-17T00:00:00Z');
      const endDate = new Date('2025-09-24T23:59:59Z');
      const mockTrend = [
        { time: '2025-09-24', count: 5, resolved: 3 },
        { time: '2025-09-23', count: 3, resolved: 2 }
      ];

      mockAlertHistoryRepository.getAlertTrend.mockResolvedValue(mockTrend);

      const result = await service.getAlertTrend(startDate, endDate);

      expect(mockAlertHistoryRepository.getAlertTrend).toHaveBeenCalledWith(startDate, endDate, 'day');
      expect(result).toEqual(mockTrend);
    });

    it('should get alert trend with custom interval', async () => {
      const startDate = new Date('2025-08-24T00:00:00Z');
      const endDate = new Date('2025-09-24T23:59:59Z');
      const interval = 'week';
      const mockTrend = [
        { time: '2025-09-24', count: 10, resolved: 5 }
      ];

      mockAlertHistoryRepository.getAlertTrend.mockResolvedValue(mockTrend);

      const result = await service.getAlertTrend(startDate, endDate, interval);

      expect(mockAlertHistoryRepository.getAlertTrend).toHaveBeenCalledWith(startDate, endDate, interval);
      expect(result).toEqual(mockTrend);
    });

    it('should validate date range', async () => {
      const startDate = new Date('2025-09-24T00:00:00Z');
      const endDate = new Date('2025-09-17T23:59:59Z');

      await expect(service.getAlertTrend(startDate, endDate)).rejects.toThrow();
    });

    it('should validate date range limits', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2025-09-24T23:59:59Z');

      await expect(service.getAlertTrend(startDate, endDate, 'day')).rejects.toThrow();
    });

    it('should handle get trend errors', async () => {
      const startDate = new Date('2025-09-17T00:00:00Z');
      const endDate = new Date('2025-09-24T23:59:59Z');
      mockAlertHistoryRepository.getAlertTrend.mockRejectedValue(new Error('Trend error'));

      await expect(service.getAlertTrend(startDate, endDate)).rejects.toThrow('Trend error');
    });
  });

  describe('Export Alerts', () => {
    it('should export alerts as JSON', async () => {
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      const result = await service.exportAlerts({}, 'json');

      // 创建期望的告警对象，日期转为ISO字符串格式
      const expectedAlert = {
        ...mockAlert,
        startTime: mockAlert.startTime.toISOString(),
        // 如果有endTime也需要转换
        endTime: mockAlert.endTime?.toISOString()
      };

      expect(result.filename).toMatch(/alerts_export_\d{4}-\d{2}-\d{2}\.json/);
      expect(result.mimeType).toBe('application/json');
      expect(typeof result.data).toBe('string');
      expect(JSON.parse(result.data)).toEqual([expectedAlert]);
    });

    it('should export alerts as CSV', async () => {
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: [mockAlert], total: 1 });

      const result = await service.exportAlerts({}, 'csv');

      expect(result.filename).toMatch(/alerts_export_\d{4}-\d{2}-\d{2}\.csv/);
      expect(result.mimeType).toBe('text/csv');
      expect(typeof result.data).toBe('string');
      expect(result.data).toContain('ID,Rule ID,Rule Name,Status,Severity,Metric,Value,Threshold,Message');
    });

    it('should handle export alerts errors', async () => {
      mockAlertHistoryRepository.find.mockRejectedValue(new Error('Export error'));

      await expect(service.exportAlerts({})).rejects.toThrow('Export error');
    });
  });

  describe('Get Query Statistics', () => {
    it('should get query service statistics', () => {
      const stats = service.getQueryStats();

      expect(stats).toHaveProperty('totalQueries');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('averageQueryTime');
      expect(stats).toHaveProperty('popularFilters');
      expect(stats.totalQueries).toBe(0);
      expect(stats.cacheHitRate).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle repository returning null', async () => {
      mockAlertHistoryRepository.find.mockResolvedValue(null);

      const result = await service.getAlerts({});

      expect(result).toEqual([]);
    });

    it('should handle repository returning undefined alerts', async () => {
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: undefined, total: 0 });

      const result = await service.getAlerts({});

      expect(result).toEqual([]);
    });

    it('should handle large query results within limits', async () => {
      const largeResults = new Array(50).fill(mockAlert);
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: largeResults, total: 50 });

      const result = await service.getAlerts({});

      expect(result).toHaveLength(50);
    });

    it('should handle empty search results', async () => {
      mockAlertHistoryRepository.searchByKeyword.mockResolvedValue({ alerts: [], total: 0 });

      const result = await service.searchAlerts('nonexistent');

      expect(result).toEqual([]);
    });

    it('should handle concurrent query requests', async () => {
      mockAlertHistoryRepository.find.mockResolvedValue({ alerts: mockAlerts, total: 3 });

      const promises = [
        service.getAlerts({ status: 'firing' }),
        service.getAlerts({ severity: 'critical' }),
        service.getAlerts({ metric: 'cpu_usage' })
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toEqual(mockAlerts);
      });
    });
  });
});
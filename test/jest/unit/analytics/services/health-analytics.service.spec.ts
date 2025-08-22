import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HealthAnalyticsService } from '../../../../../src/system-status/analytics/services/health-analytics.service';
import { MetricsPerformanceService } from '../../../../../src/system-status/collect-metrics/services/metrics-performance.service';
import { AnalyticsCacheService } from '../../../../../src/system-status/analytics/services/analytics-cache.service';
import { ANALYTICS_EVENTS } from '../../../../../src/system-status/analytics/constants';

describe('HealthAnalyticsService', () => {
  let service: HealthAnalyticsService;
  let MetricsPerformanceService: jest.Mocked<MetricsPerformanceService>;
  let cacheService: jest.Mocked<AnalyticsCacheService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockPerformanceSummary = {
    timestamp: '2024-01-01T00:00:00.000Z',
    healthScore: 85,
    processingTime: 100,
    summary: {
      totalRequests: 1000,
      averageResponseTime: 150,
      errorRate: 0.02,
      systemLoad: 0.3,
      memoryUsage: 500000000,
      cacheHitRate: 0.85
    },
    endpoints: [],
    database: {
      connectionPoolSize: 10,
      activeConnections: 5,
      waitingConnections: 0,
      averageQueryTime: 50,
      slowQueries: 2,
      totalQueries: 500
    },
    redis: {
      memoryUsage: 100000000,
      connectedClients: 10,
      opsPerSecond: 1000,
      hitRate: 0.9,
      evictedKeys: 0,
      expiredKeys: 10
    },
    system: {
      cpuUsage: 0.4,
      memoryUsage: 1000000000,
      heapUsed: 500000000,
      heapTotal: 1000000000,
      uptime: 3600,
      eventLoopLag: 5
    }
  };

  beforeEach(async () => {
    const mockMetricsPerformanceService = {
      getPerformanceSummary: jest.fn(),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthAnalyticsService,
        {
          provide: MetricsPerformanceService,
          useValue: mockMetricsPerformanceService,
        },
        {
          provide: AnalyticsCacheService,
          useValue: mockCacheService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<HealthAnalyticsService>(HealthAnalyticsService);
    MetricsPerformanceService = module.get(MetricsPerformanceService);
    cacheService = module.get(AnalyticsCacheService);
    eventEmitter = module.get(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealthScore', () => {
    it('should return cached health score when available', async () => {
      // 设置性能摘要数据
      MetricsPerformanceService.getPerformanceSummary.mockResolvedValue(mockPerformanceSummary);

      // 第一次调用
      const score1 = await service.getHealthScore();
      expect(typeof score1).toBe('number');
      expect(score1).toBeGreaterThanOrEqual(0);
      expect(score1).toBeLessThanOrEqual(100);

      // 第二次调用应该使用缓存（测试内存缓存功能）
      const score2 = await service.getHealthScore();
      expect(score2).toBe(score1);
    });

    it('should return default score when calculation fails', async () => {
      MetricsPerformanceService.getPerformanceSummary.mockRejectedValue(new Error('Calculation failed'));

      const score = await service.getHealthScore();
      expect(score).toBe(100); // ANALYTICS_DEFAULTS.HEALTH_SCORE
    });
  });

  describe('getHealthStatus', () => {
    it('should return correct status for different scores', async () => {
      expect(await service.getHealthStatus(95)).toBe('healthy');
      expect(await service.getHealthStatus(80)).toBe('warning');
      expect(await service.getHealthStatus(60)).toBe('degraded');
      expect(await service.getHealthStatus(30)).toBe('unhealthy');
    });

    it('should use calculated score when no score provided', async () => {
      MetricsPerformanceService.getPerformanceSummary.mockResolvedValue(mockPerformanceSummary);

      const status = await service.getHealthStatus();
      expect(['healthy', 'warning', 'degraded', 'unhealthy']).toContain(status);
    });

    it('should return unhealthy on error', async () => {
      MetricsPerformanceService.getPerformanceSummary.mockRejectedValue(new Error('Failed to get performance summary'));

      const status = await service.getHealthStatus();
      expect(status).toBe('unhealthy');
    });
  });

  describe('getDetailedHealthReport', () => {
    it('should return cached report when available', async () => {
      const cachedReport = {
        score: 85,
        status: 'warning' as const,
        issues: ['Test issue'],
        recommendations: ['Test recommendation'],
        timestamp: '2024-01-01T00:00:00.000Z',
        priority: 'medium' as const
      };

      cacheService.get.mockResolvedValue(cachedReport);

      const report = await service.getDetailedHealthReport();
      expect(report).toEqual(cachedReport);
      expect(cacheService.get).toHaveBeenCalledWith('detailed_health_report');
    });

    it('should generate new report when cache miss', async () => {
      cacheService.get.mockResolvedValue(null);
      MetricsPerformanceService.getPerformanceSummary.mockResolvedValue(mockPerformanceSummary);

      const report = await service.getDetailedHealthReport();

      expect(report.score).toBe(85);
      expect(report.status).toBe('warning');
      expect(report.timestamp).toBeDefined();
      expect(report.priority).toBe('medium');
      expect(Array.isArray(report.issues)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);

      // 验证缓存设置
      expect(cacheService.set).toHaveBeenCalledWith(
        'detailed_health_report',
        expect.objectContaining({
          score: 85,
          status: 'warning'
        }),
        expect.any(Number)
      );

      // 验证事件发射
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.HEALTH_SCORE_CALCULATED,
        expect.objectContaining({
          score: 85,
          status: 'warning'
        })
      );
    });

    it('should return default report on error', async () => {
      cacheService.get.mockRejectedValue(new Error('Cache error'));
      MetricsPerformanceService.getPerformanceSummary.mockImplementation(() => {
        throw new Error('Performance summary error');
      });

      const report = await service.getDetailedHealthReport();

      expect(report.score).toBe(100);
      expect(report.status).toBe('healthy');
      expect(report.issues).toEqual([]);
      expect(report.recommendations).toEqual([]);

      // 验证错误事件发射
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.HEALTH_SCORE_FAILED,
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });
  });

  describe('identifyIssues', () => {
    it('should identify no issues for healthy system', () => {
      const healthySummary = {
        summary: {
          errorRate: 0.001,
          averageResponseTime: 100
        },
        system: {
          cpuUsage: 0.3,
          memoryUsage: 500000000,
          heapTotal: 2000000000
        }
      };

      const issues = service.identifyIssues(95, healthySummary);
      expect(issues).toHaveLength(0);
    });

    it('should identify multiple issues for problematic system', () => {
      const problematicSummary = {
        summary: {
          errorRate: 0.08, // 8% 错误率
          averageResponseTime: 2000, // 2秒响应时间
          cacheHitRate: 0.5 // 50% 缓存命中率
        },
        system: {
          cpuUsage: 0.85, // 85% CPU使用率
          memoryUsage: 1900000000, // 内存使用率95%
          heapTotal: 2000000000
        },
        database: {
          averageQueryTime: 1500 // 1.5秒查询时间
        }
      };

      const issues = service.identifyIssues(45, problematicSummary);
      
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(issue => issue.includes('错误率'))).toBe(true);
      expect(issues.some(issue => issue.includes('响应时间'))).toBe(true);
      expect(issues.some(issue => issue.includes('CPU使用率'))).toBe(true);
      expect(issues.some(issue => issue.includes('内存使用率'))).toBe(true);
    });
  });

  describe('generateRecommendations', () => {
    it('should generate specific recommendations for identified issues', () => {
      const issues = [
        '错误率过高: 8.00%',
        '平均响应时间过慢: 2000ms',
        'CPU使用率过高: 85.0%'
      ];

      const recommendations = service.generateRecommendations(issues);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(rec => rec.includes('错误'))).toBe(true);
      expect(recommendations.some(rec => rec.includes('查询') || rec.includes('缓存'))).toBe(true);
      expect(recommendations.some(rec => rec.includes('CPU') || rec.includes('异步'))).toBe(true);

      // 验证优化建议事件发射
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ANALYTICS_EVENTS.OPTIMIZATION_SUGGESTED,
        expect.objectContaining({
          recommendationCount: expect.any(Number),
          issueCount: issues.length
        })
      );
    });

    it('should handle empty issues gracefully', () => {
      const recommendations = service.generateRecommendations([]);
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('categorizePriority', () => {
    it('should categorize priority correctly based on health score', () => {
      expect(service.categorizePriority(95)).toBe('low');
      expect(service.categorizePriority(80)).toBe('medium');
      expect(service.categorizePriority(60)).toBe('high');
      expect(service.categorizePriority(30)).toBe('critical');
    });
  });
});
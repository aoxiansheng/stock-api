import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PresenterService } from '@monitoring/presenter/presenter.service';
import { AnalyzerService } from '@monitoring/analyzer/analyzer.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';
import { MONITORING_ERROR_CODES } from '@monitoring/constants/monitoring-error-codes.constants';
import { MONITORING_HEALTH_STATUS } from '@monitoring/constants/config/monitoring-health.constants';

describe('PresenterService', () => {
  let service: PresenterService;
  let analyzerService: jest.Mocked<AnalyzerService>;
  let paginationService: jest.Mocked<PaginationService>;
  let configService: jest.Mocked<ConfigService>;

  const mockAnalysisResult = {
    timestamp: new Date(),
    summary: {
      totalOperations: 150,
      successfulRequests: 140,
      failedRequests: 10,
      responseTimeMs: 250,
      errorRate: 0.067,
    },
    responseTimeMs: 250,
    errorRate: 0.067,
    throughput: 75,
    healthScore: 85,
    trends: {
      responseTimeMs: {
        current: 250,
        previous: 200,
        trend: 'up' as const,
        changePercentage: 25,
      },
      errorRate: {
        current: 0.067,
        previous: 0.05,
        trend: 'up' as const,
        changePercentage: 34,
      },
      throughput: {
        current: 75,
        previous: 70,
        trend: 'up' as const,
        changePercentage: 7.14,
      },
    },
    endpointMetrics: [
      {
        endpoint: '/api/users',
        method: 'GET',
        totalOperations: 100,
        responseTimeMs: 200,
        errorRate: 0.05,
        lastUsed: new Date(),
      },
    ],
    databaseMetrics: {
      totalOperations: 50,
      responseTimeMs: 75,
      slowQueries: 2,
      failedOperations: 1,
      errorRate: 0.02,
    },
    cacheMetrics: {
      totalOperations: 80,
      hits: 70,
      misses: 10,
      hitRate: 0.875,
      responseTimeMs: 12,
    },
  };

  beforeEach(async () => {
    const mockAnalyzerService = {
      getPerformanceAnalysis: jest.fn(),
      getHealthScore: jest.fn(),
      getHealthReport: jest.fn(),
      calculateTrends: jest.fn(),
      getEndpointMetricsWithPagination: jest.fn(),
      getDatabaseMetrics: jest.fn(),
      getCacheMetrics: jest.fn(),
      getOptimizationSuggestions: jest.fn(),
      getCacheStats: jest.fn(),
      invalidateCache: jest.fn(),
    };

    const mockPaginationService = {
      normalizePaginationQuery: jest.fn(),
      createPaginatedResponse: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenterService,
        {
          provide: AnalyzerService,
          useValue: mockAnalyzerService,
        },
        {
          provide: PaginationService,
          useValue: mockPaginationService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<PresenterService>(PresenterService);
    analyzerService = module.get(AnalyzerService);
    paginationService = module.get(PaginationService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getPerformanceAnalysis', () => {
    it('should get performance analysis with date range', async () => {
      const query = {
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-01-02T00:00:00Z',
      };

      analyzerService.getPerformanceAnalysis.mockResolvedValue(mockAnalysisResult);

      const result = await service.getPerformanceAnalysis(query);

      expect(analyzerService.getPerformanceAnalysis).toHaveBeenCalledWith({
        startTime: new Date('2023-01-01T00:00:00Z'),
        endTime: new Date('2023-01-02T00:00:00Z'),
        includeDetails: true,
      });
      expect(result).toEqual(mockAnalysisResult);
    });

    it('should get performance analysis without date range', async () => {
      const query = {};

      analyzerService.getPerformanceAnalysis.mockResolvedValue(mockAnalysisResult);

      const result = await service.getPerformanceAnalysis(query);

      expect(analyzerService.getPerformanceAnalysis).toHaveBeenCalledWith({
        startTime: undefined,
        endTime: undefined,
        includeDetails: true,
      });
      expect(result).toEqual(mockAnalysisResult);
    });
  });

  describe('getHealthScore', () => {
    it('should get health score with timestamp', async () => {
      const mockScore = 92;
      analyzerService.getHealthScore.mockResolvedValue(mockScore);

      const result = await service.getHealthScore();

      expect(result).toMatchObject({
        score: mockScore,
        timestamp: expect.any(String),
      });
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('getHealthReport', () => {
    it('should get detailed health report', async () => {
      const mockHealthReport = {
        overall: {
          healthScore: 85,
          status: MONITORING_HEALTH_STATUS.HEALTHY,
          timestamp: new Date(),
        },
        components: {
          api: { healthScore: 85, responseTimeMs: 150, errorRate: 0.02 },
          database: { healthScore: 90, responseTimeMs: 80, errorRate: 0.01 },
          cache: { healthScore: 95, hitRate: 0.85, responseTimeMs: 10 },
          system: { healthScore: 80, memoryUsage: 0.6, cpuUsage: 0.4 },
        },
        recommendations: [
          'Optimize slow queries',
          'Increase cache hit rate',
        ],
      };

      analyzerService.getHealthReport.mockResolvedValue(mockHealthReport);

      const result = await service.getHealthReport();

      expect(result).toEqual(mockHealthReport);
      expect(analyzerService.getHealthReport).toHaveBeenCalled();
    });
  });

  describe('getTrends', () => {
    it('should get trends for valid period', async () => {
      const period = '1h';
      const mockTrends = {
        responseTimeMs: {
          current: 150,
          previous: 120,
          trend: 'up' as const,
          changePercentage: 25,
        },
        errorRate: {
          current: 0.05,
          previous: 0.03,
          trend: 'up' as const,
          changePercentage: 66.67,
        },
        throughput: {
          current: 50,
          previous: 45,
          trend: 'up' as const,
          changePercentage: 11.11,
        },
      };

      analyzerService.calculateTrends.mockResolvedValue(mockTrends);

      const result = await service.getTrends(period);

      expect(result).toEqual(mockTrends);
      expect(analyzerService.calculateTrends).toHaveBeenCalledWith(period);
    });

    it('should use default period when none provided', async () => {
      const mockTrends = {
        responseTimeMs: {
          current: 150,
          previous: 120,
          trend: 'stable' as const,
          changePercentage: 0,
        },
        errorRate: {
          current: 0.03,
          previous: 0.03,
          trend: 'stable' as const,
          changePercentage: 0,
        },
        throughput: {
          current: 45,
          previous: 45,
          trend: 'stable' as const,
          changePercentage: 0,
        },
      };

      analyzerService.calculateTrends.mockResolvedValue(mockTrends);

      const result = await service.getTrends();

      expect(result).toEqual(mockTrends);
      expect(analyzerService.calculateTrends).toHaveBeenCalledWith('1h');
    });

    it('should throw error for invalid period format', async () => {
      const invalidPeriod = 'invalid-period';

      await expect(service.getTrends(invalidPeriod)).rejects.toMatchObject({
        context: expect.objectContaining({
          period: invalidPeriod,
          monitoringErrorCode: MONITORING_ERROR_CODES.CONFIG_VALIDATION_FAILED,
        }),
      });

      expect(analyzerService.calculateTrends).not.toHaveBeenCalled();
    });

    it('should accept valid period formats', async () => {
      const validPeriods = ['30s', '5m', '2h', '1d'];

      analyzerService.calculateTrends.mockResolvedValue({
        responseTimeMs: { current: 0, previous: 0, trend: 'stable', changePercentage: 0 },
        errorRate: { current: 0, previous: 0, trend: 'stable', changePercentage: 0 },
        throughput: { current: 0, previous: 0, trend: 'stable', changePercentage: 0 },
      });

      for (const period of validPeriods) {
        await expect(service.getTrends(period)).resolves.toBeDefined();
      }

      expect(analyzerService.calculateTrends).toHaveBeenCalledTimes(validPeriods.length);
    });
  });

  describe('getEndpointMetrics', () => {
    it('should get paginated endpoint metrics', async () => {
      const query = { page: 2, limit: 5 };
      const mockEndpointItems = [
        {
          endpoint: '/api/users',
          method: 'GET',
          totalOperations: 100,
          responseTimeMs: 200,
          errorRate: 0.05,
          lastUsed: new Date(),
        },
        {
          endpoint: '/api/posts',
          method: 'POST',
          totalOperations: 80,
          responseTimeMs: 150,
          errorRate: 0.02,
          lastUsed: new Date(),
        },
      ];

      const mockPaginatedData = {
        items: mockEndpointItems,
        total: 10,
      };

      const mockPaginatedResponse = {
        items: mockEndpointItems,
        pagination: {
          page: 2,
          limit: 5,
          total: 10,
          totalPages: 2,
          hasNext: false,
          hasPrev: true,
        },
      };

      paginationService.normalizePaginationQuery.mockReturnValue({ page: 2, limit: 5 });
      analyzerService.getEndpointMetricsWithPagination.mockResolvedValue(mockPaginatedData);
      paginationService.createPaginatedResponse.mockReturnValue(mockPaginatedResponse);

      const result = await service.getEndpointMetrics(query);

      expect(paginationService.normalizePaginationQuery).toHaveBeenCalledWith(query);
      expect(analyzerService.getEndpointMetricsWithPagination).toHaveBeenCalledWith(2, 5);
      expect(paginationService.createPaginatedResponse).toHaveBeenCalledWith(
        mockEndpointItems,
        2,
        5,
        10,
      );
      expect(result).toEqual(mockPaginatedResponse);
    });

    it('should handle empty query parameters', async () => {
      const query = {};
      const mockResult = { items: [], total: 0 };

      paginationService.normalizePaginationQuery.mockReturnValue({ page: 1, limit: 20 });
      analyzerService.getEndpointMetricsWithPagination.mockResolvedValue(mockResult);
      paginationService.createPaginatedResponse.mockReturnValue({
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      });

      await service.getEndpointMetrics(query);

      expect(paginationService.normalizePaginationQuery).toHaveBeenCalledWith(query);
    });
  });

  describe('getDatabaseMetrics', () => {
    it('should get database metrics', async () => {
      const mockDatabaseMetrics = {
        totalOperations: 100,
        responseTimeMs: 85,
        slowQueries: 5,
        failedOperations: 2,
        errorRate: 0.02,
      };

      analyzerService.getDatabaseMetrics.mockResolvedValue(mockDatabaseMetrics);

      const result = await service.getDatabaseMetrics();

      expect(result).toEqual(mockDatabaseMetrics);
      expect(analyzerService.getDatabaseMetrics).toHaveBeenCalled();
    });
  });

  describe('getCacheMetrics', () => {
    it('should get cache metrics', async () => {
      const mockCacheMetrics = {
        totalOperations: 200,
        hits: 175,
        misses: 25,
        hitRate: 0.875,
        responseTimeMs: 15,
      };

      analyzerService.getCacheMetrics.mockResolvedValue(mockCacheMetrics);

      const result = await service.getCacheMetrics();

      expect(result).toEqual(mockCacheMetrics);
      expect(analyzerService.getCacheMetrics).toHaveBeenCalled();
    });
  });

  describe('getOptimizationSuggestions', () => {
    it('should get optimization suggestions', async () => {
      const mockSuggestions = [
        {
          category: 'performance' as const,
          priority: 'high' as const,
          title: 'Optimize Database Queries',
          description: 'Several slow queries detected',
          action: 'Review and optimize database indexes',
          impact: 'Significant performance improvement',
        },
        {
          category: 'resource' as const,
          priority: 'medium' as const,
          title: 'Reduce Memory Usage',
          description: 'Memory consumption is above normal',
          action: 'Implement memory optimization strategies',
          impact: 'Better resource utilization',
        },
      ];

      analyzerService.getOptimizationSuggestions.mockResolvedValue(mockSuggestions);

      const result = await service.getOptimizationSuggestions();

      expect(result).toEqual(mockSuggestions);
      expect(analyzerService.getOptimizationSuggestions).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should get cache statistics', async () => {
      const mockCacheStats = {
        hitRate: 0.82,
        totalOperations: 500,
        totalHits: 410,
        totalMisses: 90,
      };

      analyzerService.getCacheStats.mockResolvedValue(mockCacheStats);

      const result = await service.getCacheStats();

      expect(result).toEqual(mockCacheStats);
      expect(analyzerService.getCacheStats).toHaveBeenCalled();
    });
  });

  describe('getSmartCacheStats', () => {
    it('should get smart cache statistics', async () => {
      const mockCacheStats = {
        hitRate: 0.85,
        totalOperations: 300,
        totalHits: 255,
        totalMisses: 45,
      };

      analyzerService.getCacheStats.mockResolvedValue(mockCacheStats);

      const result = await service.getSmartCacheStats();

      expect(result).toMatchObject({
        hitRate: mockCacheStats.hitRate,
        totalOperations: mockCacheStats.totalOperations,
        totalHits: mockCacheStats.totalHits,
        totalMisses: mockCacheStats.totalMisses,
        smartCache: expect.objectContaining({
          concurrencyAdjustments: expect.any(Number),
          memoryPressureEvents: expect.any(Number),
          avgExecutionTime: expect.any(Number),
        }),
        timestamp: expect.any(String),
      });
    });
  });

  describe('getSmartCacheOptimizationSuggestions', () => {
    it('should generate optimization suggestions based on performance stats', async () => {
      // Mock the private method via service access
      const mockPerformanceStats = {
        memoryPressureEvents: 60, // High memory pressure
        concurrencyAdjustments: 150, // High concurrency adjustments
        avgExecutionTime: 1200, // Slow execution
        dynamicMaxConcurrency: 3, // Low concurrency
      };

      jest.spyOn(service as any, 'getSmartCachePerformanceStats')
        .mockResolvedValue(mockPerformanceStats);

      const result = await service.getSmartCacheOptimizationSuggestions();

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const highPrioritySuggestions = result.filter(s => s.priority === 'high');
      expect(highPrioritySuggestions.length).toBeGreaterThan(0);

      const suggestions = result.map(s => s.title);
      expect(suggestions).toEqual(
        expect.arrayContaining([
          expect.stringContaining('内存压力'),
        ])
      );
    });

    it('should handle normal performance stats with minimal suggestions', async () => {
      const mockPerformanceStats = {
        memoryPressureEvents: 10, // Low memory pressure
        concurrencyAdjustments: 20, // Low concurrency adjustments
        avgExecutionTime: 300, // Normal execution time
        dynamicMaxConcurrency: 8, // Normal concurrency
      };

      jest.spyOn(service as any, 'getSmartCachePerformanceStats')
        .mockResolvedValue(mockPerformanceStats);

      const result = await service.getSmartCacheOptimizationSuggestions();

      // Should have few or no suggestions for normal performance
      const highPrioritySuggestions = result.filter(s => s.priority === 'high');
      expect(highPrioritySuggestions.length).toBe(0);
    });
  });

  describe('createSmartCacheDashboard', () => {
    it('should create smart cache dashboard', async () => {
      // Mock the private createDashboard method
      jest.spyOn(service as any, 'createDashboard').mockResolvedValue({
        dashboardId: 'smart-cache-monitoring',
        title: 'SmartCache性能监控',
        status: 'created',
        timestamp: new Date().toISOString(),
        url: '/monitoring/dashboard/smart-cache-monitoring',
      });

      const result = await service.createSmartCacheDashboard();

      expect(result).toMatchObject({
        dashboardId: 'smart-cache-monitoring',
        title: 'SmartCache性能监控',
        status: 'created',
      });
    });
  });

  describe('getSmartCacheAnalysisReport', () => {
    it('should generate comprehensive smart cache analysis report', async () => {
      const mockPerformanceStats = {
        totalTasks: 1000,
        avgExecutionTime: 450,
        dynamicMaxConcurrency: 8,
        originalMaxConcurrency: 10,
        concurrencyAdjustments: 25,
        memoryPressureEvents: 15,
        tasksCleared: 5,
        currentBatchSize: 15,
      };

      const mockSystemMetrics = {
        memory: { percentage: 0.65, totalMB: 8192, freeMB: 2867 },
        cpu: { usage: 0.45, cores: 8 },
      };

      jest.spyOn(service as any, 'getSmartCachePerformanceStats')
        .mockResolvedValue(mockPerformanceStats);
      jest.spyOn(service as any, 'getSmartCacheSystemMetrics')
        .mockResolvedValue(mockSystemMetrics);
      jest.spyOn(service as any, 'calculateSmartCacheTrends')
        .mockResolvedValue({
          concurrency: { trend: 'stable', change: 2.5, period: '1h' },
          memory: { trend: 'improving', change: -3.2, period: '1h' },
          performance: { trend: 'stable', change: 1.1, period: '1h' },
        });

      const result = await service.getSmartCacheAnalysisReport();

      expect(result).toMatchObject({
        timestamp: expect.any(String),
        healthScore: expect.any(Number),
        summary: expect.objectContaining({
          status: expect.any(String),
          totalTasks: mockPerformanceStats.totalTasks,
          avgExecutionTime: mockPerformanceStats.avgExecutionTime,
          concurrencyOptimization: expect.objectContaining({
            current: mockPerformanceStats.dynamicMaxConcurrency,
            original: mockPerformanceStats.originalMaxConcurrency,
          }),
        }),
        performance: expect.objectContaining({
          concurrencyMetrics: expect.any(Object),
          memoryMetrics: expect.any(Object),
          systemMetrics: expect.any(Object),
        }),
        optimizations: expect.any(Array),
        recommendations: expect.any(Array),
        trends: expect.any(Object),
      });

      expect(result.healthScore).toBeGreaterThanOrEqual(0);
      expect(result.healthScore).toBeLessThanOrEqual(100);
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache with specific pattern', async () => {
      const pattern = 'health';
      analyzerService.invalidateCache.mockResolvedValue(undefined);

      const result = await service.invalidateCache(pattern);

      expect(result).toMatchObject({
        message: '缓存失效成功',
        pattern: pattern,
        timestamp: expect.any(String),
      });
      expect(analyzerService.invalidateCache).toHaveBeenCalledWith(pattern);
    });

    it('should invalidate all cache when no pattern provided', async () => {
      analyzerService.invalidateCache.mockResolvedValue(undefined);

      const result = await service.invalidateCache();

      expect(result).toMatchObject({
        message: '缓存失效成功',
        pattern: 'all',
        timestamp: expect.any(String),
      });
      expect(analyzerService.invalidateCache).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getBasicHealthStatus', () => {
    it('should return basic health status when operational', async () => {
      const result = await service.getBasicHealthStatus();

      expect(result).toMatchObject({
        status: 'operational',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        message: '系统运行正常',
      });
    });

    it('should return error status when exception occurs', async () => {
      // Mock process.uptime to throw error
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('System error');
      });

      const result = await service.getBasicHealthStatus();

      expect(result).toMatchObject({
        status: 'error',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        message: '系统健康检查异常',
      });

      // Restore original function
      process.uptime = originalUptime;
    });
  });

  describe('getDashboardData', () => {
    it('should get dashboard data with all metrics', async () => {
      const mockHealthScore = 88;
      const mockTrends = {
        responseTimeMs: { current: 200, previous: 180, trend: 'up' as const, changePercentage: 11.11 },
        errorRate: { current: 0.03, previous: 0.02, trend: 'up' as const, changePercentage: 50 },
        throughput: { current: 60, previous: 55, trend: 'up' as const, changePercentage: 9.09 },
      };
      const mockSuggestions = [
        { priority: 'high' as const, title: 'Critical Issue', category: 'performance' as const, description: 'Critical performance issue', action: 'Take action', impact: 'High impact' },
        { priority: 'medium' as const, title: 'Medium Issue', category: 'resource' as const, description: 'Medium resource issue', action: 'Take action', impact: 'Medium impact' },
        { priority: 'high' as const, title: 'Another Critical Issue', category: 'security' as const, description: 'Critical security issue', action: 'Take action', impact: 'High impact' },
      ];

      analyzerService.getHealthScore.mockResolvedValue(mockHealthScore);
      analyzerService.getPerformanceAnalysis.mockResolvedValue(mockAnalysisResult);
      analyzerService.calculateTrends.mockResolvedValue(mockTrends);
      analyzerService.getOptimizationSuggestions.mockResolvedValue(mockSuggestions);

      const result = await service.getDashboardData();

      expect(result).toMatchObject({
        timestamp: expect.any(String),
        healthScore: mockHealthScore,
        performanceSummary: expect.objectContaining({
          totalOperations: mockAnalysisResult.summary.totalOperations,
          responseTimeMs: mockAnalysisResult.summary.responseTimeMs,
          errorRate: mockAnalysisResult.summary.errorRate,
          throughput: mockAnalysisResult.throughput,
        }),
        trendsData: mockTrends,
        criticalIssues: expect.arrayContaining([
          expect.objectContaining({ priority: 'high' }),
        ]),
        suggestions: expect.any(Array),
      });

      expect(result.criticalIssues.length).toBe(2); // Two high priority issues
      expect(result.suggestions.length).toBeLessThanOrEqual(5); // Maximum 5 suggestions
    });
  });

  describe('registerCustomMetrics', () => {
    it('should register custom metrics for component', async () => {
      const componentName = 'data-mapper';
      const config = {
        dataMapperMetrics: {
          databaseQueries: true,
          cacheOperations: true,
          mappingOperations: true,
        },
        alertingRules: {
          criticalErrors: ['database_connection_failed', 'cache_timeout'],
        },
      };

      const result = await service.registerCustomMetrics(componentName, config);

      expect(result).toMatchObject({
        componentName,
        status: 'registered',
        timestamp: expect.any(String),
        metricsRegistered: true,
      });

      // Verify the component is stored in the internal registry
      const storedConfig = service['customMetricsConfig']?.get(componentName);
      expect(storedConfig).toBeDefined();
      expect(storedConfig.config).toEqual(config);
      expect(storedConfig.enabled).toBe(true);
    });
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      // Setup custom metrics for testing
      const config = {
        dataMapperMetrics: {
          databaseQueries: true,
          cacheOperations: true,
        },
      };
      service.registerCustomMetrics('data-mapper', config);
    });

    it('should get metrics for registered component', async () => {
      const result = await service.getMetrics('data-mapper');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const metric = result[0];
      expect(metric).toMatchObject({
        name: expect.any(String),
        value: expect.any(Number),
        unit: expect.any(String),
        timestamp: expect.any(Number),
        labels: expect.any(Object),
      });
    });

    it('should throw error for empty component name', async () => {
      await expect(service.getMetrics('')).rejects.toMatchObject({
        context: expect.objectContaining({
          monitoringErrorCode: MONITORING_ERROR_CODES.CONFIG_VALIDATION_FAILED,
        }),
      });
    });

    it('should throw error for non-string component name', async () => {
      await expect(service.getMetrics(null as any)).rejects.toMatchObject({
        context: expect.objectContaining({
          monitoringErrorCode: MONITORING_ERROR_CODES.CONFIG_VALIDATION_FAILED,
        }),
      });
    });

    it('should throw error for unregistered component', async () => {
      await expect(service.getMetrics('unknown-component')).rejects.toMatchObject({
        context: expect.objectContaining({
          monitoringErrorCode: MONITORING_ERROR_CODES.DATA_UNAVAILABLE,
        }),
      });
    });

    it('should normalize component name by trimming whitespace', async () => {
      const result = await service.getMetrics('  data-mapper  ');

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('createDashboard', () => {
    it('should create dashboard with valid configuration', async () => {
      const dashboardId = 'test-dashboard';
      const dashboardConfig = {
        title: 'Test Dashboard',
        description: 'A test monitoring dashboard',
        category: 'performance',
        panels: [
          {
            title: 'Response Time',
            type: 'graph',
            metrics: ['response_time_ms'],
          },
        ],
      };

      const result = await service.createDashboard(dashboardId, dashboardConfig);

      expect(result).toMatchObject({
        dashboardId,
        title: dashboardConfig.title,
        status: 'created',
        timestamp: expect.any(String),
        url: `/monitoring/dashboard/${dashboardId}`,
      });

      // Verify dashboard is stored
      const storedDashboard = service['dashboardConfigs']?.get(dashboardId);
      expect(storedDashboard).toBeDefined();
      expect(storedDashboard.config).toEqual(dashboardConfig);
    });

    it('should throw error for empty dashboard ID', async () => {
      const dashboardConfig = { title: 'Test Dashboard' };

      await expect(service.createDashboard('', dashboardConfig)).rejects.toMatchObject({
        context: expect.objectContaining({
          monitoringErrorCode: MONITORING_ERROR_CODES.CONFIG_VALIDATION_FAILED,
        }),
      });
    });

    it('should throw error for invalid dashboard config', async () => {
      await expect(service.createDashboard('test-dashboard', null)).rejects.toMatchObject({
        context: expect.objectContaining({
          monitoringErrorCode: MONITORING_ERROR_CODES.CONFIG_VALIDATION_FAILED,
        }),
      });
    });

    it('should throw error for empty dashboard title', async () => {
      const dashboardConfig = { title: '' };

      await expect(service.createDashboard('test-dashboard', dashboardConfig)).rejects.toMatchObject({
        context: expect.objectContaining({
          monitoringErrorCode: MONITORING_ERROR_CODES.CONFIG_VALIDATION_FAILED,
        }),
      });
    });

    it('should throw error for duplicate dashboard ID', async () => {
      const dashboardId = 'duplicate-dashboard';
      const dashboardConfig = { title: 'Test Dashboard' };

      // Create first dashboard
      await service.createDashboard(dashboardId, dashboardConfig);

      // Try to create duplicate
      await expect(service.createDashboard(dashboardId, dashboardConfig)).rejects.toMatchObject({
        context: expect.objectContaining({
          monitoringErrorCode: MONITORING_ERROR_CODES.CONFIG_VALIDATION_FAILED,
        }),
      });
    });
  });

  describe('getDashboard', () => {
    beforeEach(async () => {
      // Setup dashboard for testing
      const dashboardConfig = {
        title: 'Test Dashboard',
        panels: [
          {
            title: 'Test Panel',
            type: 'graph',
            metrics: ['test_metric'],
          },
        ],
      };
      await service.createDashboard('test-dashboard', dashboardConfig);
    });

    it('should get dashboard data and increment view count', async () => {
      const result = await service.getDashboard('test-dashboard');

      expect(result).toMatchObject({
        title: 'Test Dashboard',
        panels: expect.arrayContaining([
          expect.objectContaining({
            title: 'Test Panel',
            type: 'graph',
            data: expect.any(Array),
          }),
        ]),
        refreshedAt: expect.any(String),
        metadata: expect.objectContaining({
          dashboardId: 'test-dashboard',
          title: 'Test Dashboard',
          viewCount: 1,
        }),
      });

      // Check that view count incremented
      const secondResult = await service.getDashboard('test-dashboard');
      expect(secondResult.metadata.viewCount).toBe(2);
    });

    it('should throw error for non-existent dashboard', async () => {
      await expect(service.getDashboard('non-existent')).rejects.toMatchObject({
        context: expect.objectContaining({
          monitoringErrorCode: MONITORING_ERROR_CODES.DATA_UNAVAILABLE,
        }),
      });
    });
  });

  describe('private helper methods', () => {
    describe('calculateSmartCacheHealthScore', () => {
      it('should calculate health score correctly', () => {
        const performanceStats = {
          memoryPressureEvents: 10,
          avgExecutionTime: 300,
          concurrencyAdjustments: 30,
          tasksCleared: 2,
        };
        const systemMetrics = {
          memory: { percentage: 0.7 },
        };

        const healthScore = service['calculateSmartCacheHealthScore'](
          performanceStats,
          systemMetrics,
        );

        expect(healthScore).toBeGreaterThanOrEqual(0);
        expect(healthScore).toBeLessThanOrEqual(100);
        expect(typeof healthScore).toBe('number');
      });

      it('should handle severe performance issues', () => {
        const performanceStats = {
          memoryPressureEvents: 100, // High memory pressure
          avgExecutionTime: 3000, // Very slow
          concurrencyAdjustments: 200, // Many adjustments
          tasksCleared: 20, // Many tasks cleared
        };
        const systemMetrics = {
          memory: { percentage: 0.95 }, // Very high memory usage
        };

        const healthScore = service['calculateSmartCacheHealthScore'](
          performanceStats,
          systemMetrics,
        );

        expect(healthScore).toBeLessThan(50); // Should be low score
        expect(healthScore).toBeGreaterThanOrEqual(0); // But not negative
      });
    });

    describe('getSmartCacheStatus', () => {
      it('should return correct status for different health scores', () => {
        expect(service['getSmartCacheStatus'](95)).toBe('excellent');
        expect(service['getSmartCacheStatus'](80)).toBe('good');
        expect(service['getSmartCacheStatus'](65)).toBe('fair');
        expect(service['getSmartCacheStatus'](45)).toBe('poor');
        expect(service['getSmartCacheStatus'](25)).toBe('critical');
      });
    });
  });
});
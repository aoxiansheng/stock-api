/**
 * PresenterController Unit Tests
 * 测试监控展示层控制器的路由和参数处理
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PresenterController } from '@monitoring/presenter/presenter.controller';
import { PresenterService } from '@monitoring/presenter/presenter.service';
import { ExtendedHealthService } from '@monitoring/health/extended-health.service';
import { GetDbPerformanceQueryDto } from '@monitoring/presenter/dto/presenter-query.dto';
import { GetEndpointMetricsDto } from '@monitoring/contracts/dto/queries/get-endpoint-metrics.dto';

describe('PresenterController', () => {
  let controller: PresenterController;
  let presenterService: jest.Mocked<PresenterService>;
  let extendedHealthService: jest.Mocked<ExtendedHealthService>;

  beforeEach(async () => {
    presenterService = {
      getPerformanceAnalysis: jest.fn(),
      getHealthScore: jest.fn(),
      getHealthReport: jest.fn(),
      getTrends: jest.fn(),
      getEndpointMetrics: jest.fn(),
      getDatabaseMetrics: jest.fn(),
      getCacheMetrics: jest.fn(),
      getOptimizationSuggestions: jest.fn(),
      getCacheStats: jest.fn(),
      getSmartCacheStats: jest.fn(),
      getSmartCacheOptimizationSuggestions: jest.fn(),
      createSmartCacheDashboard: jest.fn(),
      getSmartCacheAnalysisReport: jest.fn(),
      invalidateCache: jest.fn(),
      getBasicHealthStatus: jest.fn(),
      getDashboardData: jest.fn(),
    } as any;

    extendedHealthService = {
      getFullHealthStatus: jest.fn(),
      getConfigHealthStatus: jest.fn(),
      getDependenciesHealthStatus: jest.fn(),
      performStartupCheck: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PresenterController],
      providers: [
        {
          provide: PresenterService,
          useValue: presenterService,
        },
        {
          provide: ExtendedHealthService,
          useValue: extendedHealthService,
        },
      ],
    }).compile();

    controller = module.get<PresenterController>(PresenterController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('getPerformanceAnalysis', () => {
    it('should call service method with query parameters', async () => {
      const query: GetDbPerformanceQueryDto = {
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-01-02T00:00:00Z',
      };

      const mockResult = {
        timestamp: new Date(),
        summary: {
          totalOperations: 1000,
          successfulRequests: 980,
          failedRequests: 20,
          responseTimeMs: 150,
          errorRate: 0.02,
          throughput: 500
        },
        responseTimeMs: 150,
        errorRate: 0.02,
        throughput: 500,
        healthScore: 85
      };
      presenterService.getPerformanceAnalysis.mockResolvedValue(mockResult);

      const result = await controller.getPerformanceAnalysis(query);

      expect(result).toBe(mockResult);
      expect(presenterService.getPerformanceAnalysis).toHaveBeenCalledWith(query);
    });
  });

  describe('getHealthScore', () => {
    it('should call service method and return health score', async () => {
      const mockResult = {
        score: 85,
        timestamp: new Date().toISOString()
      };
      presenterService.getHealthScore.mockResolvedValue(mockResult);

      const result = await controller.getHealthScore();

      expect(result).toBe(mockResult);
      expect(presenterService.getHealthScore).toHaveBeenCalled();
    });
  });

  describe('getHealthReport', () => {
    it('should call service method and return health report', async () => {
      const mockResult = {
        overall: {
          healthScore: 85,
          status: 'good' as any,
          timestamp: new Date()
        },
        components: {
          api: { healthScore: 80, responseTimeMs: 150, errorRate: 0.02 },
          database: { healthScore: 90, responseTimeMs: 50, errorRate: 0.01 },
          cache: { healthScore: 85, hitRate: 0.95, responseTimeMs: 10 },
          system: { healthScore: 88, memoryUsage: 0.65, cpuUsage: 0.35 }
        }
      };
      presenterService.getHealthReport.mockResolvedValue(mockResult);

      const result = await controller.getHealthReport();

      expect(result).toBe(mockResult);
      expect(presenterService.getHealthReport).toHaveBeenCalled();
    });
  });

  describe('getTrends', () => {
    it('should call service method with period parameter', async () => {
      const mockResult = {
        responseTimeMs: {
          current: 150,
          previous: 120,
          trend: 'up' as const,
          changePercentage: 25
        },
        errorRate: {
          current: 0.02,
          previous: 0.01,
          trend: 'up' as const,
          changePercentage: 100
        },
        throughput: {
          current: 500,
          previous: 480,
          trend: 'up' as const,
          changePercentage: 4.2
        }
      };
      presenterService.getTrends.mockResolvedValue(mockResult);

      const result = await controller.getTrends('24h');

      expect(result).toBe(mockResult);
      expect(presenterService.getTrends).toHaveBeenCalledWith('24h');
    });

    it('should use default period when not provided', async () => {
      const mockResult = {
        responseTimeMs: {
          current: 150,
          previous: 120,
          trend: 'up' as const,
          changePercentage: 25
        },
        errorRate: {
          current: 0.02,
          previous: 0.01,
          trend: 'up' as const,
          changePercentage: 100
        },
        throughput: {
          current: 500,
          previous: 480,
          trend: 'up' as const,
          changePercentage: 4.2
        }
      };
      presenterService.getTrends.mockResolvedValue(mockResult);

      const result = await controller.getTrends();

      expect(result).toBe(mockResult);
      expect(presenterService.getTrends).toHaveBeenCalledWith('1h');
    });
  });

  describe('getEndpointMetrics', () => {
    it('should call service method with query parameters', async () => {
      const query: GetEndpointMetricsDto = { page: 1, limit: 10 };
      const mockResult = {
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
      presenterService.getEndpointMetrics.mockResolvedValue(mockResult);

      const result = await controller.getEndpointMetrics(query);

      expect(result).toBe(mockResult);
      expect(presenterService.getEndpointMetrics).toHaveBeenCalledWith(query);
    });
  });

  describe('getDatabaseMetrics', () => {
    it('should call service method and return database metrics', async () => {
      const mockResult = {
        totalOperations: 100,
        responseTimeMs: 50,
        slowQueries: 2,
        failedOperations: 5,
        errorRate: 0.05
      };
      presenterService.getDatabaseMetrics.mockResolvedValue(mockResult);

      const result = await controller.getDatabaseMetrics();

      expect(result).toBe(mockResult);
      expect(presenterService.getDatabaseMetrics).toHaveBeenCalled();
    });
  });

  describe('getCacheMetrics', () => {
    it('should call service method and return cache metrics', async () => {
      const mockResult = {
        hitRate: 0.95,
        totalOperations: 1000,
        hits: 950,
        misses: 50,
        responseTimeMs: 10
      };
      presenterService.getCacheMetrics.mockResolvedValue(mockResult);

      const result = await controller.getCacheMetrics();

      expect(result).toBe(mockResult);
      expect(presenterService.getCacheMetrics).toHaveBeenCalled();
    });
  });

  describe('getOptimizationSuggestions', () => {
    it('should call service method and return optimization suggestions', async () => {
      const mockResult = [{
        priority: 'high' as const,
        category: 'performance' as const,
        title: 'Optimize database queries',
        description: 'Consider adding indexes for frequently accessed fields'
      }];
      presenterService.getOptimizationSuggestions.mockResolvedValue(mockResult);

      const result = await controller.getOptimizationSuggestions();

      expect(result).toBe(mockResult);
      expect(presenterService.getOptimizationSuggestions).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should call service method and return cache stats', async () => {
      const mockResult = {
        hitRate: 0.92,
        totalOperations: 5000,
        totalHits: 4600,
        totalMisses: 400
      };
      presenterService.getCacheStats.mockResolvedValue(mockResult);

      const result = await controller.getCacheStats();

      expect(result).toBe(mockResult);
      expect(presenterService.getCacheStats).toHaveBeenCalled();
    });
  });

  describe('getSmartCacheStats', () => {
    it('should call service method and return SmartCache stats', async () => {
      const mockResult = {
        smartCache: {
          enabled: true,
          strategy: 'WEAK_TIMELINESS'
        },
        timestamp: new Date().toISOString(),
        hitRate: 0.88,
        totalOperations: 3000,
        totalHits: 2640,
        totalMisses: 360
      };
      presenterService.getSmartCacheStats.mockResolvedValue(mockResult);

      const result = await controller.getSmartCacheStats();

      expect(result).toBe(mockResult);
      expect(presenterService.getSmartCacheStats).toHaveBeenCalled();
    });
  });

  describe('getSmartCacheOptimizationSuggestions', () => {
    it('should call service method and return SmartCache optimization suggestions', async () => {
      const mockResult = [{ 
        priority: 'high' as const,
        category: 'memory' as const,
        title: 'Memory Optimization',
        description: 'Optimize memory usage'
      }];
      presenterService.getSmartCacheOptimizationSuggestions.mockResolvedValue(mockResult);

      const result = await controller.getSmartCacheOptimizationSuggestions();

      expect(result).toBe(mockResult);
      expect(presenterService.getSmartCacheOptimizationSuggestions).toHaveBeenCalled();
    });
  });

  describe('createSmartCacheDashboard', () => {
    it('should call service method and return dashboard creation result', async () => {
      const mockResult = { 
        dashboardId: 'test-dashboard',
        title: 'Test Dashboard',
        status: 'created',
        timestamp: new Date().toISOString(),
        url: '/monitoring/dashboard/test-dashboard'
      };
      presenterService.createSmartCacheDashboard.mockResolvedValue(mockResult);

      const result = await controller.createSmartCacheDashboard();

      expect(result).toBe(mockResult);
      expect(presenterService.createSmartCacheDashboard).toHaveBeenCalled();
    });
  });

  describe('getSmartCacheAnalysisReport', () => {
    it('should call service method and return SmartCache analysis report', async () => {
      const mockResult = { 
        timestamp: new Date().toISOString(),
        healthScore: 85,
        summary: {
          status: 'good',
          totalTasks: 100,
          avgExecutionTime: 150,
          concurrencyOptimization: {
            current: 5,
            original: 10,
            adjustments: 20
          },
          memoryManagement: {
            pressureEvents: 5,
            tasksCleared: 2,
            currentBatchSize: 15
          }
        },
        performance: {
          concurrencyMetrics: {
            dynamicMaxConcurrency: 5,
            originalMaxConcurrency: 10,
            concurrencyAdjustments: 20,
            efficiency: 0.85
          },
          memoryMetrics: {
            memoryPressureEvents: 5,
            tasksCleared: 2,
            currentBatchSize: 15,
            memoryUtilization: 0.65
          },
          systemMetrics: {}
        },
        optimizations: [],
        recommendations: [],
        trends: {}
      };
      presenterService.getSmartCacheAnalysisReport.mockResolvedValue(mockResult);

      const result = await controller.getSmartCacheAnalysisReport();

      expect(result).toBe(mockResult);
      expect(presenterService.getSmartCacheAnalysisReport).toHaveBeenCalled();
    });
  });

  describe('invalidateCache', () => {
    it('should call service method with pattern parameter', async () => {
      const mockResult = { 
        message: 'Cache invalidated',
        pattern: 'test-pattern',
        timestamp: new Date().toISOString()
      };
      presenterService.invalidateCache.mockResolvedValue(mockResult);

      const result = await controller.invalidateCache('test-pattern');

      expect(result).toBe(mockResult);
      expect(presenterService.invalidateCache).toHaveBeenCalledWith('test-pattern');
    });

    it('should call service method without pattern parameter', async () => {
      const mockResult = { 
        message: 'Cache invalidated',
        pattern: 'all',
        timestamp: new Date().toISOString()
      };
      presenterService.invalidateCache.mockResolvedValue(mockResult);

      const result = await controller.invalidateCache();

      expect(result).toBe(mockResult);
      expect(presenterService.invalidateCache).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getBasicHealthStatus', () => {
    it('should call service method and return basic health status', async () => {
      const mockResult = { 
        status: 'operational',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        message: 'System is operational'
      };
      presenterService.getBasicHealthStatus.mockResolvedValue(mockResult);

      const result = await controller.getBasicHealthStatus();

      expect(result).toBe(mockResult);
      expect(presenterService.getBasicHealthStatus).toHaveBeenCalled();
    });
  });

  describe('getExtendedHealthStatus', () => {
    it('should call extended health service method and return full health status', async () => {
      const mockResult = { 
        status: 'healthy' as any,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.0.0',
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          architecture: process.arch,
          memory: {
            used: 0,
            total: 0,
            percentage: 0
          },
          cpu: {
            usage: 0
          }
        },
        healthScore: 95,
        recommendations: []
      };
      extendedHealthService.getFullHealthStatus.mockResolvedValue(mockResult);

      const result = await controller.getExtendedHealthStatus();

      expect(result).toBe(mockResult);
      expect(extendedHealthService.getFullHealthStatus).toHaveBeenCalled();
    });
  });

  describe('getConfigHealthStatus', () => {
    it('should call extended health service method and return config health status', async () => {
      const mockResult = { 
        isValid: true,
        errors: [],
        warnings: [],
        validatedAt: new Date().toISOString()
      };
      extendedHealthService.getConfigHealthStatus.mockResolvedValue(mockResult);

      const result = await controller.getConfigHealthStatus();

      expect(result).toBe(mockResult);
      expect(extendedHealthService.getConfigHealthStatus).toHaveBeenCalled();
    });
  });

  describe('getDependenciesHealthStatus', () => {
    it('should call extended health service method and return dependencies health status', async () => {
      const mockResult = { 
        mongodb: {
          status: 'connected' as const,
          responseTime: 10
        },
        redis: {
          status: 'connected' as const,
          responseTime: 5
        },
        externalServices: {
          longport: {
            status: 'available' as const
          }
        }
      };
      extendedHealthService.getDependenciesHealthStatus.mockResolvedValue(mockResult);

      const result = await controller.getDependenciesHealthStatus();

      expect(result).toBe(mockResult);
      expect(extendedHealthService.getDependenciesHealthStatus).toHaveBeenCalled();
    });
  });

  describe('performStartupCheck', () => {
    it('should call extended health service method and return startup check result', async () => {
      const mockResult = { 
        success: true,
        checks: [],
        timestamp: new Date(),
        status: 'healthy' as const
      };
      extendedHealthService.performStartupCheck.mockResolvedValue(mockResult);

      const result = await controller.performStartupCheck();

      expect(result).toBe(mockResult);
      expect(extendedHealthService.performStartupCheck).toHaveBeenCalled();
    });
  });

  describe('getDashboardData', () => {
    it('should call service method and return dashboard data', async () => {
      const mockResult = { 
        timestamp: new Date().toISOString(),
        healthScore: 85,
        performanceSummary: {
          totalOperations: 1000,
          responseTimeMs: 150,
          errorRate: 0.02,
          throughput: 500
        },
        trendsData: {
          responseTimeMs: {
            current: 150,
            previous: 140,
            trend: 'up' as const,
            changePercentage: 7.1
          },
          errorRate: {
            current: 0.02,
            previous: 0.01,
            trend: 'up' as const,
            changePercentage: 100
          },
          throughput: {
            current: 500,
            previous: 480,
            trend: 'up' as const,
            changePercentage: 4.2
          }
        },
        criticalIssues: [{
          priority: 'high' as const,
          category: 'performance' as const,
          title: 'Critical Issue',
          description: 'This is a critical issue'
        }],
        suggestions: [{
          priority: 'high' as const,
          category: 'performance' as const,
          title: 'Optimization Suggestion',
          description: 'This is an optimization suggestion'
        }]
      };
      presenterService.getDashboardData.mockResolvedValue(mockResult);

      const result = await controller.getDashboardData();

      expect(result).toBe(mockResult);
      expect(presenterService.getDashboardData).toHaveBeenCalled();
    });
  });
});
/**
 * PresenterService Unit Tests
 * 测试监控展示层业务服务的功能
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { PresenterService } from '@monitoring/presenter/presenter.service';
import { AnalyzerService } from '@monitoring/analyzer/analyzer.service';
import { PaginationService } from '@common/modules/pagination/services/pagination.service';
import { createLogger } from '@common/logging/index';
import { GetDbPerformanceQueryDto } from '@monitoring/presenter/dto/presenter-query.dto';
import { GetEndpointMetricsDto } from '@monitoring/contracts/dto/queries/get-endpoint-metrics.dto';
import { MONITORING_SYSTEM_LIMITS } from '@monitoring/constants/config/monitoring-system.constants';
import { MonitoringUnifiedLimitsConfig } from '@monitoring/config/unified/monitoring-unified-limits.config';

// Mock dependencies
jest.mock('@common/logging/index');

describe('PresenterService', () => {
  let service: PresenterService;
  let analyzerService: jest.Mocked<AnalyzerService>;
  let paginationService: jest.Mocked<PaginationService>;
  let configService: jest.Mocked<ConfigService>;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
    };

    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    analyzerService = {
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
    } as any;

    paginationService = {
      normalizePaginationQuery: jest.fn(),
      createPaginatedResponse: jest.fn(),
    } as any;

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'monitoringUnifiedLimits') {
          return {
            systemLimits: {
              maxBufferSize: 1000,
            },
          } as MonitoringUnifiedLimitsConfig;
        }
        return undefined;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PresenterService,
        {
          provide: AnalyzerService,
          useValue: analyzerService,
        },
        {
          provide: PaginationService,
          useValue: paginationService,
        },
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<PresenterService>(PresenterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct logger', () => {
      expect(createLogger).toHaveBeenCalledWith('PresenterService');
      expect(mockLogger.log).toHaveBeenCalledWith(
        'PresenterService initialized - 展示层业务服务已启动'
      );
    });
  });

  describe('getPerformanceAnalysis', () => {
    it('should get performance analysis with date range', async () => {
      const query: GetDbPerformanceQueryDto = {
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-01-02T00:00:00Z',
      };

      const mockAnalysis = {
        timestamp: new Date(),
        summary: {
          totalOperations: 100,
          successfulRequests: 95,
          failedRequests: 5,
          responseTimeMs: 120,
          errorRate: 0.05
        },
        responseTimeMs: 120,
        errorRate: 0.05,
        throughput: 100,
        healthScore: 85,
      };

      analyzerService.getPerformanceAnalysis.mockResolvedValue(mockAnalysis);

      const result = await service.getPerformanceAnalysis(query);

      expect(result).toBe(mockAnalysis);
      expect(analyzerService.getPerformanceAnalysis).toHaveBeenCalledWith({
        startTime: new Date('2023-01-01T00:00:00Z'),
        endTime: new Date('2023-01-02T00:00:00Z'),
        includeDetails: true,
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '性能分析数据获取成功',
        expect.objectContaining({
          healthScore: 85,
          totalOperations: 100,
        })
      );
    });

    it('should get performance analysis without date range', async () => {
      const query: GetDbPerformanceQueryDto = {};

      const mockAnalysis = {
        timestamp: new Date(),
        summary: {
          totalOperations: 50,
          successfulRequests: 48,
          failedRequests: 2,
          responseTimeMs: 100,
          errorRate: 0.04
        },
        responseTimeMs: 100,
        errorRate: 0.04,
        throughput: 50,
        healthScore: 90,
      };

      analyzerService.getPerformanceAnalysis.mockResolvedValue(mockAnalysis);

      const result = await service.getPerformanceAnalysis(query);

      expect(result).toBe(mockAnalysis);
      expect(analyzerService.getPerformanceAnalysis).toHaveBeenCalledWith({
        startTime: undefined,
        endTime: undefined,
        includeDetails: true,
      });
    });
  });

  describe('getHealthScore', () => {
    it('should get health score', async () => {
      analyzerService.getHealthScore.mockResolvedValue(85);

      const result = await service.getHealthScore();

      expect(result).toEqual({
        score: 85,
        timestamp: expect.any(String),
      });
      expect(analyzerService.getHealthScore).toHaveBeenCalled();
    });
  });

  describe('getHealthReport', () => {
    it('should get health report', async () => {
      const mockReport = {
        overall: { healthScore: 85, status: 'healthy' as any, timestamp: new Date() },
        components: {
          api: { healthScore: 80, responseTimeMs: 150, errorRate: 0.02 },
          database: { healthScore: 90, responseTimeMs: 50, errorRate: 0.01 },
          cache: { healthScore: 85, hitRate: 0.95, responseTimeMs: 10 },
          system: { healthScore: 88, memoryUsage: 0.65, cpuUsage: 0.35 }
        },
        recommendations: ['Optimize queries'],
      };

      analyzerService.getHealthReport.mockResolvedValue(mockReport);

      const result = await service.getHealthReport();

      expect(result).toBe(mockReport);
      expect(analyzerService.getHealthReport).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '健康报告获取成功',
        expect.objectContaining({
          overallScore: 85,
          status: 'healthy',
          recommendationsCount: 1,
        })
      );
    });
  });

  describe('getTrends', () => {
    it('should get trends with valid period', async () => {
      const mockTrends = {
        responseTimeMs: { current: 200, previous: 180, trend: 'up' as const, changePercentage: 11.1 },
        errorRate: { current: 0.02, previous: 0.01, trend: 'up' as const, changePercentage: 100 },
        throughput: { current: 500, previous: 480, trend: 'up' as const, changePercentage: 4.2 },
      };

      analyzerService.calculateTrends.mockResolvedValue(mockTrends);

      const result = await service.getTrends('1h');

      expect(result).toBe(mockTrends);
      expect(analyzerService.calculateTrends).toHaveBeenCalledWith('1h');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '趋势分析获取成功',
        expect.objectContaining({ period: '1h' })
      );
    });

    it('should throw error for invalid period format', async () => {
      await expect(service.getTrends('invalid')).rejects.toThrow(
        'Invalid time period format, supported formats: 1s, 5m, 1h, 1d'
      );
    });

    it('should use default period when not provided', async () => {
      const mockTrends = {
        responseTimeMs: { current: 150, previous: 140, trend: 'up' as const, changePercentage: 7.1 },
        errorRate: { current: 0.015, previous: 0.012, trend: 'up' as const, changePercentage: 25 },
        throughput: { current: 520, previous: 500, trend: 'up' as const, changePercentage: 4 },
      };

      analyzerService.calculateTrends.mockResolvedValue(mockTrends);

      const result = await service.getTrends();

      expect(result).toBe(mockTrends);
      expect(analyzerService.calculateTrends).toHaveBeenCalledWith('1h');
    });
  });

  describe('getEndpointMetrics', () => {
    it('should get endpoint metrics with pagination', async () => {
      const query: GetEndpointMetricsDto = { page: 2, limit: 10 };

      paginationService.normalizePaginationQuery.mockReturnValue({
        page: 2,
        limit: 10,
      });

      const mockPaginatedData = {
        items: [{
          endpoint: '/api/test',
          method: 'GET',
          totalOperations: 1000,
          responseTimeMs: 150,
          errorRate: 0.02,
          lastUsed: new Date()
        }],
        total: 25,
      };

      analyzerService.getEndpointMetricsWithPagination.mockResolvedValue(mockPaginatedData);

      const mockPaginatedResponse = {
        items: mockPaginatedData.items,
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
          hasNext: true,
          hasPrev: true
        },
      };

      paginationService.createPaginatedResponse.mockReturnValue(mockPaginatedResponse);

      const result = await service.getEndpointMetrics(query);

      expect(result).toBe(mockPaginatedResponse);
      expect(paginationService.normalizePaginationQuery).toHaveBeenCalledWith(query);
      expect(analyzerService.getEndpointMetricsWithPagination).toHaveBeenCalledWith(2, 10);
      expect(paginationService.createPaginatedResponse).toHaveBeenCalledWith(
        mockPaginatedData.items,
        2,
        10,
        25
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '端点指标获取成功(分页)',
        expect.objectContaining({
          page: 2,
          limit: 10,
          count: 1,
          total: 25,
          totalPages: 3,
        })
      );
    });
  });

  describe('getDatabaseMetrics', () => {
    it('should get database metrics', async () => {
      const mockMetrics = {
        totalOperations: 100,
        responseTimeMs: 50,
        slowQueries: 2,
        failedOperations: 5,
        errorRate: 0.05
      };

      analyzerService.getDatabaseMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getDatabaseMetrics();

      expect(result).toBe(mockMetrics);
      expect(analyzerService.getDatabaseMetrics).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '数据库指标获取成功',
        expect.objectContaining({
          totalOperations: 100,
          responseTimeMs: 50,
        })
      );
    });
  });

  describe('getCacheMetrics', () => {
    it('should get cache metrics', async () => {
      const mockMetrics = {
        hitRate: 0.95,
        totalOperations: 200,
        hits: 190,
        misses: 10,
        responseTimeMs: 5
      };

      analyzerService.getCacheMetrics.mockResolvedValue(mockMetrics);

      const result = await service.getCacheMetrics();

      expect(result).toBe(mockMetrics);
      expect(analyzerService.getCacheMetrics).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '缓存指标获取成功',
        expect.objectContaining({
          hitRate: 0.95,
          totalOperations: 200,
        })
      );
    });
  });

  describe('getOptimizationSuggestions', () => {
    it('should get optimization suggestions', async () => {
      const mockSuggestions = [
        {
          priority: 'high' as const,
          category: 'performance' as const,
          title: 'Optimize queries',
          description: 'Optimize database queries for better performance'
        },
      ];

      analyzerService.getOptimizationSuggestions.mockResolvedValue(mockSuggestions);

      const result = await service.getOptimizationSuggestions();

      expect(result).toBe(mockSuggestions);
      expect(analyzerService.getOptimizationSuggestions).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '优化建议获取成功',
        expect.objectContaining({
          count: 1,
          highPriority: 1,
        })
      );
    });
  });

  describe('getCacheStats', () => {
    it('should get cache stats', async () => {
      const mockStats = {
        hitRate: 0.92,
        totalOperations: 150,
        totalHits: 138,
        totalMisses: 12
      };

      analyzerService.getCacheStats.mockResolvedValue(mockStats);

      const result = await service.getCacheStats();

      expect(result).toBe(mockStats);
      expect(analyzerService.getCacheStats).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '缓存统计获取成功',
        expect.objectContaining({
          hitRate: 0.92,
          totalOperations: 150,
        })
      );
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache with pattern', async () => {
      analyzerService.invalidateCache.mockResolvedValue(undefined);

      const result = await service.invalidateCache('test-pattern');

      expect(result).toEqual({
        message: '缓存失效成功',
        pattern: 'test-pattern',
        timestamp: expect.any(String),
      });
      expect(analyzerService.invalidateCache).toHaveBeenCalledWith('test-pattern');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '缓存失效操作完成',
        expect.objectContaining({ pattern: 'test-pattern' })
      );
    });

    it('should invalidate all cache when no pattern provided', async () => {
      analyzerService.invalidateCache.mockResolvedValue(undefined);

      const result = await service.invalidateCache();

      expect(result).toEqual({
        message: '缓存失效成功',
        pattern: 'all',
        timestamp: expect.any(String),
      });
      expect(analyzerService.invalidateCache).toHaveBeenCalledWith(undefined);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '缓存失效操作完成',
        expect.objectContaining({ pattern: 'all' })
      );
    });
  });

  describe('getBasicHealthStatus', () => {
    it('should get basic health status', async () => {
      const result = await service.getBasicHealthStatus();

      expect(result).toEqual({
        status: 'operational',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        message: '系统运行正常',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '基础健康状态获取成功',
        expect.objectContaining({
          status: 'operational',
          uptime: expect.any(Number),
        })
      );
    });

    it('should handle errors when getting basic health status', async () => {
      const originalUptime = process.uptime;
      process.uptime = jest.fn(() => {
        throw new Error('Uptime error');
      });

      const result = await service.getBasicHealthStatus();

      expect(result).toEqual({
        status: 'error',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String),
        message: '系统健康检查异常',
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        '获取基础健康状态失败:',
        expect.any(Error)
      );

      // Restore original function
      process.uptime = originalUptime;
    });
  });

  describe('getDashboardData', () => {
    it('should get dashboard data', async () => {
      const mockHealthScore = 85;
      const mockPerformanceAnalysis = {
        timestamp: new Date(),
        summary: { 
          totalOperations: 100, 
          successfulRequests: 95, 
          failedRequests: 5, 
          responseTimeMs: 150, 
          errorRate: 0.05 
        },
        responseTimeMs: 150,
        errorRate: 0.05,
        throughput: 50,
        healthScore: 85
      };
      const mockTrends = {
        responseTimeMs: { current: 150, previous: 140, trend: 'up' as const, changePercentage: 7.1 },
        errorRate: { current: 0.05, previous: 0.04, trend: 'up' as const, changePercentage: 25 },
        throughput: { current: 50, previous: 45, trend: 'up' as const, changePercentage: 11.1 }
      };
      const mockSuggestions = [
        { priority: 'high' as const, title: 'Critical issue', category: 'performance' as const, description: 'This is a critical performance issue' },
        { priority: 'medium' as const, title: 'Medium issue', category: 'resource' as const, description: 'This is a medium resource issue' },
      ];

      analyzerService.getHealthScore.mockResolvedValue(mockHealthScore);
      analyzerService.getPerformanceAnalysis.mockResolvedValue(mockPerformanceAnalysis);
      analyzerService.calculateTrends.mockResolvedValue(mockTrends);
      analyzerService.getOptimizationSuggestions.mockResolvedValue(mockSuggestions);

      const result = await service.getDashboardData();

      expect(result).toEqual({
        timestamp: expect.any(String),
        healthScore: 85,
        performanceSummary: {
          totalOperations: 100,
          responseTimeMs: 150,
          errorRate: 0.05,
          throughput: 50,
        },
        trendsData: mockTrends,
        criticalIssues: [{ priority: 'high', title: 'Critical issue' }],
        suggestions: mockSuggestions.slice(0, 5),
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '仪表板数据获取成功',
        expect.objectContaining({
          healthScore: 85,
          totalOperations: 100,
          criticalIssues: 1,
        })
      );
    });
  });

  describe('SmartCache Methods', () => {
    describe('getSmartCacheStats', () => {
      it('should get SmartCache stats', async () => {
        const mockCacheStats = {
          hitRate: 0.95,
          totalOperations: 200,
          totalHits: 190,
          totalMisses: 10
        };

        analyzerService.getCacheStats.mockResolvedValue(mockCacheStats);

        const result = await service.getSmartCacheStats();

        expect(result).toEqual({
          ...mockCacheStats,
          smartCache: expect.any(Object),
          timestamp: expect.any(String),
        });
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'SmartCache统计获取成功',
          expect.any(Object)
        );
      });
    });

    describe('getSmartCacheOptimizationSuggestions', () => {
      it('should get SmartCache optimization suggestions', async () => {
        // Mock the private method
        const mockPerformanceStats = {
          memoryPressureEvents: 60,
          concurrencyAdjustments: 150,
          avgExecutionTime: 1200,
          dynamicMaxConcurrency: 3,
        };

        (service as any).getSmartCachePerformanceStats = jest.fn().mockResolvedValue(mockPerformanceStats);

        const result = await service.getSmartCacheOptimizationSuggestions();

        expect(result).toHaveLength(4); // Should have 4 suggestions based on the mock data
        expect(result[0].priority).toBe('high');
        expect(result[0].category).toBe('memory');
        expect(mockLogger.debug).toHaveBeenCalledWith(
          'SmartCache优化建议生成成功',
          expect.objectContaining({
            suggestionsCount: 4,
            highPriority: 2,
          })
        );
      });
    });
  });

  describe('Private Helper Methods', () => {
    describe('getSmartCachePerformanceStats', () => {
      it('should get SmartCache performance stats', async () => {
        const stats = await (service as any).getSmartCachePerformanceStats();

        expect(stats).toEqual({
          concurrencyAdjustments: expect.any(Number),
          memoryPressureEvents: expect.any(Number),
          tasksCleared: expect.any(Number),
          avgExecutionTime: expect.any(Number),
          totalTasks: expect.any(Number),
          dynamicMaxConcurrency: expect.any(Number),
          originalMaxConcurrency: 10,
          currentBatchSize: expect.any(Number),
        });
      });

      it('should handle errors when getting SmartCache performance stats', async () => {
        configService.get.mockImplementation(() => {
          throw new Error('Config error');
        });

        const stats = await (service as any).getSmartCachePerformanceStats();

        expect(stats).toEqual({
          concurrencyAdjustments: 0,
          memoryPressureEvents: 0,
          tasksCleared: 0,
          avgExecutionTime: 0,
          totalTasks: 0,
          dynamicMaxConcurrency: 10,
          originalMaxConcurrency: 10,
          currentBatchSize: 10,
        });
        expect(mockLogger.warn).toHaveBeenCalledWith(
          '获取SmartCache性能统计失败，返回默认值',
          expect.any(Error)
        );
      });
    });

    describe('getSmartCacheSystemMetrics', () => {
      it('should get SmartCache system metrics', async () => {
        const metrics = await (service as any).getSmartCacheSystemMetrics();

        expect(metrics).toEqual({
          cpu: expect.any(Object),
          memory: expect.any(Object),
          system: expect.any(Object),
        });
      });

      it('should handle errors when getting system metrics', async () => {
        // Mock require to throw an error
        const originalRequire = require;
        jest.mock('os', () => {
          throw new Error('OS error');
        });

        const metrics = await (service as any).getSmartCacheSystemMetrics();

        expect(metrics).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledWith(
          '获取系统指标失败',
          expect.any(Error)
        );

        // Restore original require
        jest.unmock('os');
      });
    });

    describe('calculateSmartCacheHealthScore', () => {
      it('should calculate health score correctly', () => {
        const performanceStats = {
          memoryPressureEvents: 10,
          avgExecutionTime: 600,
          concurrencyAdjustments: 60,
          tasksCleared: 3,
        };

        const systemMetrics = {
          memory: { percentage: 0.85 },
        };

        const score = (service as any).calculateSmartCacheHealthScore(performanceStats, systemMetrics);

        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    describe('getSmartCacheStatus', () => {
      it('should return correct status based on health score', () => {
        expect((service as any).getSmartCacheStatus(95)).toBe('excellent');
        expect((service as any).getSmartCacheStatus(80)).toBe('good');
        expect((service as any).getSmartCacheStatus(65)).toBe('fair');
        expect((service as any).getSmartCacheStatus(50)).toBe('poor');
        expect((service as any).getSmartCacheStatus(25)).toBe('critical');
      });
    });
  });
});
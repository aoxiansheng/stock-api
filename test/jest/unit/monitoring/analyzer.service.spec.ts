import { Test, TestingModule } from '@nestjs/testing';
import { ConfigType } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AnalyzerService } from '@monitoring/analyzer/analyzer.service';
import { AnalyzerMetricsCalculator } from '@monitoring/analyzer/analyzer-metrics.service';
import { AnalyzerHealthScoreCalculator } from '@monitoring/analyzer/analyzer-score.service';
import { HealthAnalyzerService } from '@monitoring/analyzer/analyzer-health.service';
import { TrendAnalyzerService } from '@monitoring/analyzer/analyzer-trend.service';
import { CacheService } from '@cache/services/cache.service';
import { MonitoringUnifiedTtl } from '@monitoring/config/unified/monitoring-unified-ttl.config';
import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';
import { MonitoringCacheKeys } from '@monitoring/utils/monitoring-cache-keys';
import { ComponentIdentifier, BusinessErrorCode } from '@common/core/exceptions';
import { MONITORING_HEALTH_STATUS } from '@monitoring/constants/config/monitoring-health.constants';

describe('AnalyzerService', () => {
  let service: AnalyzerService;
  let metricsCalculator: jest.Mocked<AnalyzerMetricsCalculator>;
  let healthScoreCalculator: jest.Mocked<AnalyzerHealthScoreCalculator>;
  let healthAnalyzer: jest.Mocked<HealthAnalyzerService>;
  let trendAnalyzer: jest.Mocked<TrendAnalyzerService>;
  let cacheService: jest.Mocked<CacheService>;
  let eventBus: jest.Mocked<EventEmitter2>;

  const mockTtlConfig = {
    health: 300,
    trend: 600,
    performance: 180,
  };

  const mockRawMetrics = {
    requests: [
      {
        type: 'request',
        endpoint: '/api/test',
        method: 'GET',
        statusCode: 200,
        responseTimeMs: 150,
        timestamp: new Date(),
      },
      {
        type: 'request',
        endpoint: '/api/slow',
        method: 'POST',
        statusCode: 500,
        responseTimeMs: 2000,
        timestamp: new Date(),
      },
    ],
    database: [
      {
        type: 'database',
        responseTimeMs: 50,
        timestamp: new Date(),
        metadata: { operation: 'find', success: true },
      },
    ],
    cache: [
      {
        type: 'cache',
        responseTimeMs: 5,
        timestamp: new Date(),
        metadata: { operation: 'get', hit: true },
      },
    ],
    system: {
      memory: { used: 1024, total: 2048, percentage: 0.5 },
      cpu: { usage: 0.3 },
      uptime: 3600,
      timestamp: new Date(),
    },
  };

  beforeEach(async () => {
    const mockMetricsCalculator = {
      calculatePerformanceSummary: jest.fn(),
      calculateAverageResponseTime: jest.fn(),
      calculateErrorRate: jest.fn(),
      calculateThroughput: jest.fn(),
      calculateEndpointMetrics: jest.fn(),
      calculateDatabaseMetrics: jest.fn(),
      calculateCacheMetrics: jest.fn(),
    };

    const mockHealthScoreCalculator = {
      calculateOverallHealthScore: jest.fn(),
    };

    const mockHealthAnalyzer = {
      generateHealthReport: jest.fn(),
      invalidateHealthCache: jest.fn(),
    };

    const mockTrendAnalyzer = {
      calculatePerformanceTrends: jest.fn(),
      invalidateTrendsCache: jest.fn(),
    };

    const mockCacheService = {
      safeGetOrSet: jest.fn(),
      safeGet: jest.fn(),
      safeSet: jest.fn(),
      delByPattern: jest.fn(),
    };

    const mockEventBus = {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyzerService,
        {
          provide: AnalyzerMetricsCalculator,
          useValue: mockMetricsCalculator,
        },
        {
          provide: AnalyzerHealthScoreCalculator,
          useValue: mockHealthScoreCalculator,
        },
        {
          provide: HealthAnalyzerService,
          useValue: mockHealthAnalyzer,
        },
        {
          provide: TrendAnalyzerService,
          useValue: mockTrendAnalyzer,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
        {
          provide: MonitoringUnifiedTtl.KEY,
          useValue: mockTtlConfig,
        },
      ],
    }).compile();

    service = module.get<AnalyzerService>(AnalyzerService);
    metricsCalculator = module.get(AnalyzerMetricsCalculator);
    healthScoreCalculator = module.get(AnalyzerHealthScoreCalculator);
    healthAnalyzer = module.get(HealthAnalyzerService);
    trendAnalyzer = module.get(TrendAnalyzerService);
    cacheService = module.get(CacheService);
    eventBus = module.get(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should setup event listeners on module init', () => {
      service.onModuleInit();
      expect(eventBus.on).toHaveBeenCalled();
    });

    it('should cleanup event listeners on module destroy', () => {
      service.onModuleDestroy();
      expect(eventBus.off).toHaveBeenCalled();
    });
  });

  describe('handleDataResponse', () => {
    it('should handle data response event', () => {
      const responseEvent = {
        requestId: 'test-request-123',
        data: mockRawMetrics,
        dataSize: 4,
        timestamp: new Date(),
        source: 'collector' as const,
        responseType: 'raw_metrics' as const,
        metadata: {},
      };

      // Simulate pending request
      service['dataRequestPromises'].set('test-request-123', {
        resolve: jest.fn(),
        reject: jest.fn(),
        timeout: setTimeout(() => {}, 1000),
      });

      service.handleDataResponse(responseEvent);

      const pendingRequest = service['dataRequestPromises'].get('test-request-123');
      expect(pendingRequest).toBeUndefined(); // Should be removed after handling
    });

    it('should handle unknown request ID', () => {
      const responseEvent = {
        requestId: 'unknown-request',
        data: mockRawMetrics,
        dataSize: 4,
        timestamp: new Date(),
        source: 'collector' as const,
        responseType: 'raw_metrics' as const,
        metadata: {},
      };

      // Should not throw error for unknown request ID
      expect(() => service.handleDataResponse(responseEvent)).not.toThrow();
    });
  });

  describe('handleDataNotAvailable', () => {
    it('should handle data not available event', () => {
      const errorEvent = {
        requestId: 'error-request-123',
        metadata: { error: 'Data unavailable' },
        timestamp: new Date(),
        source: 'collector',
      };

      const mockReject = jest.fn();
      service['dataRequestPromises'].set('error-request-123', {
        resolve: jest.fn(),
        reject: mockReject,
        timeout: setTimeout(() => {}, 1000),
      });

      service.handleDataNotAvailable(errorEvent);

      expect(mockReject).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            requestId: 'error-request-123',
            metadata: errorEvent.metadata,
          }),
        }),
      );
    });
  });

  describe('getPerformanceAnalysis', () => {
    beforeEach(() => {
      // Setup mocks for performance analysis
      metricsCalculator.calculatePerformanceSummary.mockReturnValue({
        totalOperations: 100,
        successfulRequests: 95,
        failedRequests: 5,
        responseTimeMs: 150,
        errorRate: 0.05,
      });

      metricsCalculator.calculateAverageResponseTime.mockReturnValue(150);
      metricsCalculator.calculateErrorRate.mockReturnValue(0.05);
      metricsCalculator.calculateThroughput.mockReturnValue(50);

      healthScoreCalculator.calculateOverallHealthScore.mockReturnValue(85);

      trendAnalyzer.calculatePerformanceTrends.mockResolvedValue({
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
      });

      metricsCalculator.calculateEndpointMetrics.mockReturnValue([
        {
          endpoint: '/api/test',
          method: 'GET',
          totalOperations: 50,
          responseTimeMs: 100,
          errorRate: 0.02,
          lastUsed: new Date(),
        },
      ]);

      metricsCalculator.calculateDatabaseMetrics.mockReturnValue({
        totalOperations: 20,
        responseTimeMs: 50,
        slowQueries: 1,
        failedOperations: 0,
        errorRate: 0,
      });

      metricsCalculator.calculateCacheMetrics.mockReturnValue({
        totalOperations: 30,
        hits: 25,
        misses: 5,
        hitRate: 0.83,
        responseTimeMs: 5,
      });
    });

    it('should get performance analysis with details', async () => {
      // Mock the private requestRawMetrics method
      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockResolvedValue(mockRawMetrics);

      // Mock calculateTrends to avoid circular dependency
      const calculateTrendsSpy = jest.spyOn(service, 'calculateTrends');
      calculateTrendsSpy.mockResolvedValue({
        responseTimeMs: {
          current: 150,
          previous: 120,
          trend: 'up',
          changePercentage: 25,
        },
        errorRate: {
          current: 0.05,
          previous: 0.03,
          trend: 'up',
          changePercentage: 66.67,
        },
        throughput: {
          current: 50,
          previous: 45,
          trend: 'up',
          changePercentage: 11.11,
        },
      });

      const options = {
        startTime: new Date(Date.now() - 60000),
        endTime: new Date(),
        includeDetails: true,
      };

      const result = await service.getPerformanceAnalysis(options);

      expect(result).toMatchObject({
        timestamp: expect.any(Date),
        summary: expect.objectContaining({
          totalOperations: 100,
        }),
        responseTimeMs: 150,
        errorRate: 0.05,
        throughput: 50,
        healthScore: 85,
        trends: expect.objectContaining({
          responseTimeMs: expect.objectContaining({
            current: 150,
            previous: 120,
          }),
        }),
        endpointMetrics: expect.arrayContaining([
          expect.objectContaining({
            endpoint: '/api/test',
          }),
        ]),
        databaseMetrics: expect.objectContaining({
          totalOperations: 20,
        }),
        cacheMetrics: expect.objectContaining({
          hitRate: 0.83,
        }),
      });

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.ANALYSIS_COMPLETED,
        expect.objectContaining({
          source: 'analyzer',
          metadata: expect.objectContaining({
            type: 'performance_analysis',
            healthScore: 85,
          }),
        }),
      );

      requestRawMetricsSpy.mockRestore();
      calculateTrendsSpy.mockRestore();
    });

    it('should get performance analysis without details', async () => {
      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockResolvedValue(mockRawMetrics);

      const options = {
        includeDetails: false,
      };

      const result = await service.getPerformanceAnalysis(options);

      expect(result.trends).toBeUndefined();
      expect(result.endpointMetrics).toBeUndefined();
      expect(result.databaseMetrics).toBeUndefined();
      expect(result.cacheMetrics).toBeUndefined();

      requestRawMetricsSpy.mockRestore();
    });

    it('should handle performance analysis error', async () => {
      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockRejectedValue(new Error('Data request failed'));

      await expect(service.getPerformanceAnalysis()).rejects.toThrow('Data request failed');

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.ANALYSIS_ERROR,
        expect.objectContaining({
          source: 'analyzer',
          metadata: expect.objectContaining({
            error: 'Data request failed',
            operation: 'getPerformanceAnalysis',
          }),
        }),
      );

      requestRawMetricsSpy.mockRestore();
    });
  });

  describe('getHealthScore', () => {
    it('should get health score from cache', async () => {
      cacheService.safeGetOrSet.mockResolvedValue(92);

      const result = await service.getHealthScore();

      expect(result).toBe(92);
      expect(cacheService.safeGetOrSet).toHaveBeenCalledWith(
        MonitoringCacheKeys.health('score'),
        expect.any(Function),
        { ttl: mockTtlConfig.health },
      );
    });

    it('should calculate health score if not cached', async () => {
      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockResolvedValue(mockRawMetrics);

      healthScoreCalculator.calculateOverallHealthScore.mockReturnValue(78);

      // Mock cache to call the factory function
      cacheService.safeGetOrSet.mockImplementation(async (key, factory) => {
        return await factory();
      });

      const result = await service.getHealthScore();

      expect(result).toBe(78);
      expect(healthScoreCalculator.calculateOverallHealthScore).toHaveBeenCalledWith(mockRawMetrics);
      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.HEALTH_SCORE_UPDATED,
        expect.objectContaining({
          source: 'analyzer',
          metadata: expect.objectContaining({
            healthScore: 78,
            previousScore: 50,
          }),
        }),
      );

      requestRawMetricsSpy.mockRestore();
    });

    it('should return default score on error', async () => {
      cacheService.safeGetOrSet.mockRejectedValue(new Error('Cache error'));

      const result = await service.getHealthScore();

      expect(result).toBe(50); // Default middle health score
    });
  });

  describe('getHealthReport', () => {
    it('should get health report', async () => {
      const mockHealthReport = {
        overall: { healthScore: 85, status: MONITORING_HEALTH_STATUS.HEALTHY, timestamp: new Date() },
        components: {
          api: { healthScore: 85, responseTimeMs: 150, errorRate: 0.02 },
          database: { healthScore: 90, responseTimeMs: 80, errorRate: 0.01 },
          cache: { healthScore: 95, hitRate: 0.85, responseTimeMs: 10 },
          system: { healthScore: 80, memoryUsage: 0.6, cpuUsage: 0.4 },
        },
        recommendations: ['Optimize slow queries', 'Increase cache TTL'],
      };

      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockResolvedValue(mockRawMetrics);

      healthAnalyzer.generateHealthReport.mockResolvedValue(mockHealthReport);

      const result = await service.getHealthReport();

      expect(result).toEqual(mockHealthReport);
      expect(healthAnalyzer.generateHealthReport).toHaveBeenCalledWith(mockRawMetrics);

      requestRawMetricsSpy.mockRestore();
    });

    it('should propagate health report error', async () => {
      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockRejectedValue(new Error('Health report error'));

      await expect(service.getHealthReport()).rejects.toThrow('Health report error');

      requestRawMetricsSpy.mockRestore();
    });
  });

  describe('calculateTrends', () => {
    it('should calculate trends with caching', async () => {
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

      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockResolvedValue(mockRawMetrics);

      trendAnalyzer.calculatePerformanceTrends.mockResolvedValue(mockTrends);

      // Mock cache to call the factory function
      cacheService.safeGetOrSet.mockImplementation(async (key, factory) => {
        return await factory();
      });

      const result = await service.calculateTrends('1h');

      expect(result).toEqual(mockTrends);
      expect(cacheService.safeGetOrSet).toHaveBeenCalledWith(
        MonitoringCacheKeys.trend('trends_1h'),
        expect.any(Function),
        { ttl: mockTtlConfig.trend },
      );

      requestRawMetricsSpy.mockRestore();
    });

    it('should return default trends on error', async () => {
      cacheService.safeGetOrSet.mockRejectedValue(new Error('Trends error'));

      const result = await service.calculateTrends('1d');

      expect(result).toMatchObject({
        responseTimeMs: {
          current: 0,
          previous: 0,
          trend: 'stable',
          changePercentage: 0,
        },
        errorRate: {
          current: 0,
          previous: 0,
          trend: 'stable',
          changePercentage: 0,
        },
        throughput: {
          current: 0,
          previous: 0,
          trend: 'stable',
          changePercentage: 0,
        },
      });
    });
  });

  describe('getEndpointMetrics', () => {
    it('should get endpoint metrics without limit', async () => {
      const mockEndpointMetrics = [
        { endpoint: '/api/users', method: 'GET', totalOperations: 100, responseTimeMs: 150, errorRate: 0.02, lastUsed: new Date() },
        { endpoint: '/api/posts', method: 'POST', totalOperations: 80, responseTimeMs: 200, errorRate: 0.01, lastUsed: new Date() },
        { endpoint: '/api/comments', method: 'GET', totalOperations: 120, responseTimeMs: 100, errorRate: 0.03, lastUsed: new Date() },
      ];

      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockResolvedValue(mockRawMetrics);

      metricsCalculator.calculateEndpointMetrics.mockReturnValue(mockEndpointMetrics);

      const result = await service.getEndpointMetrics();

      expect(result).toEqual(mockEndpointMetrics);
      expect(result.length).toBe(3);

      requestRawMetricsSpy.mockRestore();
    });

    it('should get endpoint metrics with limit', async () => {
      const mockEndpointMetrics = [
        { endpoint: '/api/users', method: 'GET', totalOperations: 100, responseTimeMs: 150, errorRate: 0.02, lastUsed: new Date() },
        { endpoint: '/api/posts', method: 'POST', totalOperations: 80, responseTimeMs: 200, errorRate: 0.01, lastUsed: new Date() },
        { endpoint: '/api/comments', method: 'GET', totalOperations: 120, responseTimeMs: 100, errorRate: 0.03, lastUsed: new Date() },
      ];

      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockResolvedValue(mockRawMetrics);

      metricsCalculator.calculateEndpointMetrics.mockReturnValue(mockEndpointMetrics);

      const result = await service.getEndpointMetrics(2);

      expect(result).toEqual(mockEndpointMetrics.slice(0, 2));
      expect(result.length).toBe(2);

      requestRawMetricsSpy.mockRestore();
    });

    it('should return empty array on error', async () => {
      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockRejectedValue(new Error('Metrics error'));

      const result = await service.getEndpointMetrics();

      expect(result).toEqual([]);

      requestRawMetricsSpy.mockRestore();
    });
  });

  describe('getEndpointMetricsWithPagination', () => {
    it('should get paginated endpoint metrics', async () => {
      const mockEndpointMetrics = Array.from({ length: 25 }, (_, i) => ({
        endpoint: `/api/endpoint-${i}`,
        method: i % 2 === 0 ? 'GET' : 'POST',
        totalOperations: 100 + i,
        responseTimeMs: 150 + i * 10,
        errorRate: 0.01 + i * 0.001,
        lastUsed: new Date(Date.now() - i * 1000),
      }));

      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockResolvedValue(mockRawMetrics);

      metricsCalculator.calculateEndpointMetrics.mockReturnValue(mockEndpointMetrics);

      const result = await service.getEndpointMetricsWithPagination(2, 10);

      expect(result.total).toBe(25);
      expect(result.items.length).toBe(10);
      expect(result.items[0].endpoint).toBe('/api/endpoint-10'); // Second page starts at index 10

      requestRawMetricsSpy.mockRestore();
    });

    it('should handle pagination error', async () => {
      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockRejectedValue(new Error('Pagination error'));

      const result = await service.getEndpointMetricsWithPagination(1, 10);

      expect(result).toEqual({ items: [], total: 0 });

      requestRawMetricsSpy.mockRestore();
    });
  });

  describe('getDatabaseMetrics', () => {
    it('should get database metrics', async () => {
      const mockDatabaseMetrics = {
        totalOperations: 50,
        responseTimeMs: 75,
        slowQueries: 3,
        failedOperations: 1,
        errorRate: 0.02,
      };

      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockResolvedValue(mockRawMetrics);

      metricsCalculator.calculateDatabaseMetrics.mockReturnValue(mockDatabaseMetrics);

      const result = await service.getDatabaseMetrics();

      expect(result).toEqual(mockDatabaseMetrics);

      requestRawMetricsSpy.mockRestore();
    });

    it('should return default database metrics on error', async () => {
      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockRejectedValue(new Error('Database metrics error'));

      const result = await service.getDatabaseMetrics();

      expect(result).toEqual({
        totalOperations: 0,
        responseTimeMs: 0,
        slowQueries: 0,
        failedOperations: 0,
        errorRate: 0,
      });

      requestRawMetricsSpy.mockRestore();
    });
  });

  describe('getCacheMetrics', () => {
    it('should get cache metrics', async () => {
      const mockCacheMetrics = {
        totalOperations: 100,
        hits: 85,
        misses: 15,
        hitRate: 0.85,
        responseTimeMs: 8,
      };

      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockResolvedValue(mockRawMetrics);

      metricsCalculator.calculateCacheMetrics.mockReturnValue(mockCacheMetrics);

      const result = await service.getCacheMetrics();

      expect(result).toEqual(mockCacheMetrics);

      requestRawMetricsSpy.mockRestore();
    });

    it('should return default cache metrics on error', async () => {
      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockRejectedValue(new Error('Cache metrics error'));

      const result = await service.getCacheMetrics();

      expect(result).toEqual({
        totalOperations: 0,
        hits: 0,
        misses: 0,
        hitRate: 0,
        responseTimeMs: 0,
      });

      requestRawMetricsSpy.mockRestore();
    });
  });

  describe('getOptimizationSuggestions', () => {
    it('should get optimization suggestions from cache', async () => {
      const mockSuggestions = [
        {
          category: 'performance' as const,
          priority: 'high' as const,
          title: 'Response Time Optimization',
          description: 'Average response time is 2000ms, optimization recommended',
          action: 'Check slow queries, optimize database indexes, add caching',
          impact: 'Significant improvement in user experience and system performance',
        },
      ];

      cacheService.safeGet.mockResolvedValue(mockSuggestions);

      const result = await service.getOptimizationSuggestions();

      expect(result).toEqual(mockSuggestions);
      expect(cacheService.safeGet).toHaveBeenCalledWith(
        MonitoringCacheKeys.performance('optimization_suggestions'),
      );
    });

    it('should generate optimization suggestions if not cached', async () => {
      const mockHealthReport = {
        overall: { healthScore: 65, status: MONITORING_HEALTH_STATUS.WARNING, timestamp: new Date() },
        components: {
          api: { healthScore: 65, responseTimeMs: 200, errorRate: 0.05 },
          database: { healthScore: 70, responseTimeMs: 120, errorRate: 0.03 },
          cache: { healthScore: 60, hitRate: 0.75, responseTimeMs: 15 },
          system: { healthScore: 65, memoryUsage: 0.8, cpuUsage: 0.7 },
        },
        recommendations: [
          'Optimize slow queries',
          'Increase cache hit rate',
          'Reduce memory usage',
        ],
      };

      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockResolvedValue(mockRawMetrics);

      healthAnalyzer.generateHealthReport.mockResolvedValue(mockHealthReport);
      metricsCalculator.calculateAverageResponseTime.mockReturnValue(1500);
      metricsCalculator.calculateErrorRate.mockReturnValue(0.02);
      metricsCalculator.calculateThroughput.mockReturnValue(15);

      cacheService.safeGet.mockResolvedValue(null);
      cacheService.safeSet.mockResolvedValue(undefined);

      const result = await service.getOptimizationSuggestions();

      expect(result).toHaveLength(4); // 3 from health report + 1 from performance analysis
      expect(result[0]).toMatchObject({
        category: expect.any(String),
        priority: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        action: expect.any(String),
        impact: expect.any(String),
      });

      expect(cacheService.safeSet).toHaveBeenCalledWith(
        MonitoringCacheKeys.performance('optimization_suggestions'),
        expect.any(Array),
        { ttl: mockTtlConfig.performance },
      );

      requestRawMetricsSpy.mockRestore();
    });

    it('should return empty array on error', async () => {
      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockRejectedValue(new Error('Suggestions error'));

      cacheService.safeGet.mockResolvedValue(null);

      const result = await service.getOptimizationSuggestions();

      expect(result).toEqual([]);

      requestRawMetricsSpy.mockRestore();
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate specific pattern cache', async () => {
      cacheService.delByPattern.mockResolvedValue(undefined);
      healthAnalyzer.invalidateHealthCache.mockResolvedValue(undefined);
      trendAnalyzer.invalidateTrendsCache.mockResolvedValue(undefined);

      await service.invalidateCache('health');

      expect(cacheService.delByPattern).toHaveBeenCalledWith('monitoring:health:*');
      expect(healthAnalyzer.invalidateHealthCache).toHaveBeenCalled();
      expect(trendAnalyzer.invalidateTrendsCache).toHaveBeenCalled();

      expect(eventBus.emit).toHaveBeenCalledWith(
        SYSTEM_STATUS_EVENTS.CACHE_INVALIDATED,
        expect.objectContaining({
          source: 'analyzer',
          metadata: { pattern: 'health', reason: 'manual_invalidation' },
        }),
      );
    });

    it('should invalidate all cache when no pattern provided', async () => {
      cacheService.delByPattern.mockResolvedValue(undefined);
      healthAnalyzer.invalidateHealthCache.mockResolvedValue(undefined);
      trendAnalyzer.invalidateTrendsCache.mockResolvedValue(undefined);

      await service.invalidateCache();

      expect(cacheService.delByPattern).toHaveBeenCalledWith('monitoring:*');
    });

    it('should handle cache invalidation error', async () => {
      cacheService.delByPattern.mockRejectedValue(new Error('Cache error'));

      // Should not throw error
      await expect(service.invalidateCache('trend')).resolves.toBeUndefined();
    });
  });

  describe('getCacheStats', () => {
    it('should calculate cache statistics', async () => {
      const mockMetricsWithCache = {
        ...mockRawMetrics,
        filter: jest.fn().mockReturnValue([
          { type: 'cache', metadata: { hit: true } },
          { type: 'cache', metadata: { hit: true } },
          { type: 'cache', metadata: { hit: false } },
          { type: 'cache', metadata: { hit: true } },
        ]),
      };

      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockResolvedValue(mockMetricsWithCache);

      const result = await service.getCacheStats();

      expect(result).toMatchObject({
        hitRate: 0.75, // 3 hits out of 4 operations
        totalOperations: 4,
        totalHits: 3,
        totalMisses: 1,
      });

      requestRawMetricsSpy.mockRestore();
    });

    it('should handle no cache metrics', async () => {
      const mockMetricsNoCache = {
        ...mockRawMetrics,
        filter: jest.fn().mockReturnValue([]),
      };

      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockResolvedValue(mockMetricsNoCache);

      const result = await service.getCacheStats();

      expect(result).toEqual({
        hitRate: 0,
        totalOperations: 0,
        totalHits: 0,
        totalMisses: 0,
      });

      requestRawMetricsSpy.mockRestore();
    });

    it('should return default stats on error', async () => {
      const requestRawMetricsSpy = jest.spyOn(service as any, 'requestRawMetrics');
      requestRawMetricsSpy.mockRejectedValue(new Error('Cache stats error'));

      const result = await service.getCacheStats();

      expect(result).toEqual({
        hitRate: 0,
        totalOperations: 0,
        totalHits: 0,
        totalMisses: 0,
      });

      requestRawMetricsSpy.mockRestore();
    });
  });

  describe('private helper methods', () => {
    describe('parsePeriodToMs', () => {
      it('should parse period strings correctly', () => {
        expect(service['parsePeriodToMs']('30s')).toBe(30000);
        expect(service['parsePeriodToMs']('5m')).toBe(300000);
        expect(service['parsePeriodToMs']('2h')).toBe(7200000);
        expect(service['parsePeriodToMs']('1d')).toBe(86400000);
      });

      it('should return default for invalid period', () => {
        expect(service['parsePeriodToMs']('invalid')).toBe(3600000); // 1 hour default
      });
    });

    describe('categorizeRecommendation', () => {
      it('should categorize recommendations correctly', () => {
        expect(service['categorizeRecommendation']('优化响应时间')).toBe('performance');
        expect(service['categorizeRecommendation']('减少内存使用')).toBe('resource');
        expect(service['categorizeRecommendation']('提升安全性')).toBe('security');
        expect(service['categorizeRecommendation']('其他优化建议')).toBe('optimization');
      });
    });

    describe('prioritizeRecommendation', () => {
      it('should prioritize recommendations based on health score', () => {
        expect(service['prioritizeRecommendation']('严重问题', 30)).toBe('high');
        expect(service['prioritizeRecommendation']('重要改进', 60)).toBe('medium');
        expect(service['prioritizeRecommendation']('一般建议', 80)).toBe('low');
      });
    });
  });
});
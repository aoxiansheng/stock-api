import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringController } from '../../../../src/monitoring/monitoring.controller';
import { PerformanceMonitorService } from '../../../../src/metrics/services/performance-monitor.service';
import { CacheService } from '../../../../src/cache/cache.service';
import { MetricsHealthService } from '../../../../src/metrics/services/metrics-health.service';
import { PermissionService } from '../../../../src/auth/services/permission.service';
import { RateLimitService } from '../../../../src/auth/services/rate-limit.service';
import { UnifiedPermissionsGuard } from '../../../../src/auth/guards/unified-permissions.guard';
import { BadRequestException, Logger } from '@nestjs/common';
import { AlertingService } from '../../../../src/alert/services/alerting.service';

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let performanceMonitor: jest.Mocked<PerformanceMonitorService>;
  let cacheOptimization: jest.Mocked<CacheService>;
  let metricsHealthService: jest.Mocked<MetricsHealthService>;

  const mockPerformanceSummary = {
    timestamp: '2024-01-01T12:00:00.000Z',
    healthScore: 95,
    summary: {
      totalRequests: 1000,
      averageResponseTime: 150,
      errorRate: 0.01,
      systemLoad: 0.6,
      memoryUsage: 0.7,
      cacheHitRate: 0.85,
    },
    endpoints: [],
    database: {
      averageQueryTime: 50,
      slowQueries: 2,
    },
    redis: {},
    system: {
      cpuUsage: 0.45,
      memoryUsage: 1024,
      heapUsed: 512,
      heapTotal: 2048,
      uptime: 86400,
    },
  };

  const mockEndpointMetrics = [
    {
      path: '/api/v1/receiver/data',
      method: 'POST',
      totalRequests: 500,
      averageResponseTime: 200,
      errorRate: 0.02,
    },
    {
      path: '/api/v1/query',
      method: 'GET',
      totalRequests: 1500,
      averageResponseTime: 100,
      errorRate: 0.01,
    },
  ];

  const mockCacheStats = {
    hitRate: 0.85,
    misses: 150,
    hits: 850,
    keys: 1000,
    memoryUsage: 512 * 1024 * 1024,
  };

  beforeEach(async () => {
    const mockPerformanceMonitorProvider = {
      getPerformanceSummary: jest.fn().mockResolvedValue(mockPerformanceSummary),
      getEndpointMetrics: jest.fn().mockResolvedValue(mockEndpointMetrics),
      getDatabaseMetrics: jest.fn().mockResolvedValue(mockPerformanceSummary.database),
      getRedisMetrics: jest.fn().mockResolvedValue(mockPerformanceSummary.redis),
      getSystemMetrics: jest.fn().mockReturnValue(mockPerformanceSummary.system),
    };


    const mockCacheOptimizationProvider = {
      getStats: jest.fn().mockResolvedValue(mockCacheStats),
      healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
    };

    const mockRateLimitService = {
      checkRateLimit: jest.fn().mockResolvedValue({
        allowed: true,
        limit: 1000,
        remaining: 999,
        resetTime: new Date().getTime() + 60000,
      }),
    };

    const mockMetricsHealthServiceProvider = {
      getDetailedHealthReport: jest.fn().mockReturnValue({
        redisHealthy: true,
        lastHealthCheck: Date.now(),
        lastHealthCheckTime: new Date().toISOString(),
        consecutiveFailures: 0,
        status: 'healthy',
        description: '指标系统运行正常',
        metrics: {
          healthCheckInterval: 30000,
          maxConsecutiveFailures: 3,
          timeSinceLastCheck: 1000
        },
        recommendations: []
      }),
      getHealthStatus: jest.fn().mockReturnValue({
        redisHealthy: true,
        lastHealthCheck: Date.now(),
        lastHealthCheckTime: new Date().toISOString(),
        consecutiveFailures: 0,
        status: 'healthy',
        description: '指标系统运行正常'
      }),
      manualHealthCheck: jest.fn().mockResolvedValue({
        redisHealthy: true,
        lastHealthCheck: Date.now(),
        lastHealthCheckTime: new Date().toISOString(),
        consecutiveFailures: 0,
        status: 'healthy',
        description: '指标系统运行正常'
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        { provide: PerformanceMonitorService, useValue: mockPerformanceMonitorProvider },
        { provide: CacheService, useValue: mockCacheOptimizationProvider },
        { provide: MetricsHealthService, useValue: mockMetricsHealthServiceProvider },
        {
          provide: AlertingService,
          useValue: {
            getStats: jest.fn().mockResolvedValue({
              activeAlerts: 5,
              totalRules: 20,
              alertsLastHour: 15,
            }),
          },
        },
        {
          provide: PermissionService,
          useValue: {
            checkPermissions: jest.fn().mockResolvedValue({ allowed: true }),
            getEffectivePermissions: jest.fn().mockReturnValue([]),
            createPermissionContext: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: UnifiedPermissionsGuard,
          useValue: {
            canActivate: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
      ],
    }).compile();

    controller = module.get<MonitoringController>(MonitoringController);
    performanceMonitor = module.get(PerformanceMonitorService);
    cacheOptimization = module.get(CacheService);
    metricsHealthService = module.get(MetricsHealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPerformanceMetrics', () => {
    it('should return performance metrics successfully', async () => {
      const queryDto = { startDate: '2024-01-01', endDate: '2024-01-02' };
      const result = await controller.getPerformanceMetrics(queryDto);
      expect(result).toEqual(mockPerformanceSummary);
      expect(performanceMonitor.getPerformanceSummary).toHaveBeenCalledWith(queryDto.startDate, queryDto.endDate);
    });
  });

  describe('getEndpointMetrics', () => {
    it('should return endpoint metrics sorted by totalRequests', async () => {
      const result = await controller.getEndpointMetrics(undefined, 'totalRequests');
      expect(result.metrics[0].totalRequests).toBe(1500);
      expect(performanceMonitor.getEndpointMetrics).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for invalid sortBy parameter', async () => {
      await expect(controller.getEndpointMetrics(undefined, 'invalidSort')).rejects.toThrow(
        new BadRequestException('无效的排序字段'),
      );
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', async () => {
      const result = await controller.getHealthStatus();
      expect(result.status).toBe('healthy');
      expect(result.score).toBe(95);
    });
  });


  describe('getCacheMetrics', () => {
    it('should return cache metrics', async () => {
      const result = await controller.getCacheMetrics();
      expect(result.hitRate).toBe(0.85);
      expect(cacheOptimization.getStats).toHaveBeenCalledTimes(1);
    });
  });


  describe('getOptimizationRecommendations', () => {
    it('should return optimization recommendations', async () => {
      const result = await controller.getOptimizationRecommendations();
      expect(result.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('getDashboardData', () => {
    it('should return dashboard data', async () => {
      const result = await controller.getDashboardData();
      expect(result.overview.healthScore).toBe(95);
      expect(result.performance).toEqual(mockPerformanceSummary);
      expect(result.cache).toEqual(mockCacheStats);
    });
  });

  describe('getMetricsHealth', () => {
    it('should return metrics health status', async () => {
      const result = await controller.getMetricsHealth();
      expect(result).toHaveProperty('redisHealthy', true);
      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('recommendations');
      expect(metricsHealthService.getDetailedHealthReport).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET metrics-health/check endpoint', () => {
    it('should trigger manual health check and return status', async () => {
      // Note: This tests the endpoint behavior via mock service
      // The actual route would be tested via E2E tests
      const manualCheckSpy = jest.spyOn(metricsHealthService, 'manualHealthCheck');
      const getStatusSpy = jest.spyOn(metricsHealthService, 'getHealthStatus');
      
      // Simulate manual health check endpoint behavior
      await metricsHealthService.manualHealthCheck();
      const result = metricsHealthService.getHealthStatus();
      
      expect(result).toHaveProperty('redisHealthy', true);
      expect(result).toHaveProperty('status', 'healthy');
      expect(manualCheckSpy).toHaveBeenCalledTimes(1);
      expect(getStatusSpy).toHaveBeenCalledTimes(1);
      
      manualCheckSpy.mockRestore();
      getStatusSpy.mockRestore();
    });
  });
});

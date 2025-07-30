import { Test, TestingModule } from "@nestjs/testing";
import { MonitoringController } from "../../../../src/monitoring/controller/monitoring.controller";
import { PerformanceMonitorService } from "../../../../src/metrics/services/performance-monitor.service";
import { CacheService } from "../../../../src/cache/services/cache.service";
import { MetricsHealthService } from "../../../../src/metrics/services/metrics-health.service";
import { PermissionService } from "../../../../src/auth/services/permission.service";
import { RateLimitService } from "../../../../src/auth/services/rate-limit.service";
import { UnifiedPermissionsGuard } from "../../../../src/auth/guards/unified-permissions.guard";
import {
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AlertingService } from "../../../../src/alert/services/alerting.service";
import { createLogger } from "../../../../src/common/config/logger.config";
import {
  PerformanceSummaryDto,
  EndpointMetricsDto,
} from "../../../../src/metrics/dto/performance-summary.dto";
import { CacheStatsDto } from "../../../../src/cache/dto/cache-internal.dto";
import { IAlertStats } from "../../../../src/alert/interfaces/alert.interface";

// Mock the logger
jest.mock("../../../../src/common/config/logger.config", () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),  // 添加缺少的log方法
    verbose: jest.fn(), // 添加verbose方法以完善接口
  })),
  sanitizeLogData: jest.fn((data) => data),
}));

describe("MonitoringController", () => {
  let controller: MonitoringController;
  let performanceMonitor: jest.Mocked<PerformanceMonitorService>;
  let cacheOptimization: jest.Mocked<CacheService>;
  let metricsHealthService: jest.Mocked<MetricsHealthService>;
  let alertingService: jest.Mocked<AlertingService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let _mockLogger: any; // Declare _mockLogger
  const MOCK_UPTIME = 12345.678;

  const mockPerformanceSummary: PerformanceSummaryDto = {
    timestamp: "2024-01-01T12:00:00.000Z",
    healthScore: 95,
    processingTime: 10,
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
      connectionPoolSize: 10,
      activeConnections: 5,
      waitingConnections: 0,
      averageQueryTime: 50,
      slowQueries: 2,
      totalQueries: 1000,
    },
    redis: {
      memoryUsage: 1024 * 1024,
      connectedClients: 10,
      opsPerSecond: 100,
      hitRate: 0.9,
      evictedKeys: 0,
      expiredKeys: 10,
    },
    system: {
      cpuUsage: 0.45,
      memoryUsage: 1024,
      heapUsed: 512,
      heapTotal: 2048,
      uptime: 86400,
      eventLoopLag: 5,
    },
  };

  const mockEndpointMetrics: EndpointMetricsDto[] = [
    {
      endpoint: "/api/v1/receiver/data",
      method: "POST",
      totalRequests: 500,
      successfulRequests: 490,
      failedRequests: 10,
      averageResponseTime: 200,
      p95ResponseTime: 400,
      p99ResponseTime: 600,
      lastMinuteRequests: 50,
      errorRate: 0.02,
    },
    {
      endpoint: "/api/v1/query",
      method: "GET",
      totalRequests: 1500,
      successfulRequests: 1485,
      failedRequests: 15,
      averageResponseTime: 100,
      p95ResponseTime: 200,
      p99ResponseTime: 300,
      lastMinuteRequests: 150,
      errorRate: 0.01,
    },
  ];

  const mockCacheStats: CacheStatsDto = {
    hitRate: 0.85,
    misses: 150,
    hits: 850,
    keyCount: 1000,
    memoryUsage: 512 * 1024 * 1024,
    avgTtl: 3600,
  };

  beforeEach(async () => {
    const mockPerformanceMonitorProvider = {
      getPerformanceSummary: jest
        .fn()
        .mockResolvedValue(mockPerformanceSummary),
      getEndpointMetrics: jest.fn().mockResolvedValue(mockEndpointMetrics),
      getDatabaseMetrics: jest
        .fn()
        .mockResolvedValue(mockPerformanceSummary.database),
      getRedisMetrics: jest
        .fn()
        .mockResolvedValue(mockPerformanceSummary.redis),
      getSystemMetrics: jest
        .fn()
        .mockReturnValue(mockPerformanceSummary.system),
    };

    // Mock process.uptime to return a fixed value for stable tests
    jest.spyOn(process, "uptime").mockReturnValue(MOCK_UPTIME);

    const mockCacheOptimizationProvider = {
      getStats: jest.fn().mockResolvedValue(mockCacheStats),
      healthCheck: jest.fn().mockResolvedValue({ status: "healthy" }),
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
        status: "healthy",
        description: "指标系统运行正常",
        metrics: {
          healthCheckInterval: 30000,
          maxConsecutiveFailures: 3,
          timeSinceLastCheck: 1000,
        },
        recommendations: [],
      }),
      getHealthStatus: jest.fn().mockReturnValue({
        redisHealthy: true,
        lastHealthCheck: Date.now(),
        lastHealthCheckTime: new Date().toISOString(),
        consecutiveFailures: 0,
        status: "healthy",
        description: "指标系统运行正常",
      }),
      manualHealthCheck: jest.fn().mockResolvedValue({
        redisHealthy: true,
        lastHealthCheck: Date.now(),
        lastHealthCheckTime: new Date().toISOString(),
        consecutiveFailures: 0,
        status: "healthy",
        description: "指标系统运行正常",
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        {
          provide: PerformanceMonitorService,
          useValue: mockPerformanceMonitorProvider,
        },
        { provide: CacheService, useValue: mockCacheOptimizationProvider },
        {
          provide: MetricsHealthService,
          useValue: mockMetricsHealthServiceProvider,
        },
        {
          provide: AlertingService,
          useValue: {
            getStats: jest.fn().mockResolvedValue({
              activeAlerts: 5,
              totalRules: 20,
              enabledRules: 18,
              criticalAlerts: 1,
              warningAlerts: 4,
              infoAlerts: 0,
              totalAlertsToday: 15,
              resolvedAlertsToday: 10,
              averageResolutionTime: 300,
            } as IAlertStats),
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
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({
        canActivate: jest.fn().mockReturnValue(true),
      })
      .compile();

    controller = module.get<MonitoringController>(MonitoringController);
    performanceMonitor = module.get(PerformanceMonitorService);
    cacheOptimization = module.get(CacheService);
    metricsHealthService = module.get(MetricsHealthService);
    alertingService = module.get(AlertingService);
    _mockLogger = createLogger("MonitoringControllerSpec");
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getPerformanceMetrics", () => {
    it("should return performance metrics successfully", async () => {
      const queryDto = { startDate: "2024-01-01", endDate: "2024-01-02" };
      const result = await controller.getPerformanceMetrics(queryDto);
      expect(result).toEqual(mockPerformanceSummary);
      expect(performanceMonitor.getPerformanceSummary).toHaveBeenCalledWith(
        queryDto.startDate,
        queryDto.endDate,
      );
    });
  });

  describe("getEndpointMetrics", () => {
    it("should return endpoint metrics sorted by totalRequests", async () => {
      const result = await controller.getEndpointMetrics(
        undefined,
        "totalRequests",
      );
      expect(result.metrics[0].totalRequests).toBe(1500);
      expect(performanceMonitor.getEndpointMetrics).toHaveBeenCalledTimes(1);
    });

    it("should throw BadRequestException for invalid sortBy parameter", async () => {
      await expect(
        controller.getEndpointMetrics(undefined, "invalidSort"),
      ).rejects.toThrow(new BadRequestException("无效的排序字段"));
    });
  });

  describe("getHealthStatus", () => {
    it("should return health status", async () => {
      const result = await controller.getHealthStatus();
      expect(result.status).toBe("operational");
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeDefined();
      expect(result.version).toBeDefined();
      expect(result.message).toBe("系统运行正常");
    });
  });

  describe("getCacheMetrics", () => {
    it("should return cache metrics", async () => {
      const result = await controller.getCacheMetrics();
      expect(result.hitRate).toBe(0.85);
      expect(cacheOptimization.getStats).toHaveBeenCalledTimes(1);
    });
  });

  describe("getOptimizationRecommendations", () => {
    it("should return optimization recommendations", async () => {
      const result = await controller.getOptimizationRecommendations();
      expect(result.recommendations).toBeInstanceOf(Array);
    });
  });

  describe("getDashboardData", () => {
    it("should return dashboard data", async () => {
      const result = await controller.getDashboardData();
      expect(result.overview.healthScore).toBe(95);
      expect(result.performance).toEqual(mockPerformanceSummary);
      expect(result.cache).toEqual(mockCacheStats);
    });
  });

  describe("getMetricsHealth", () => {
    it("should return metrics health status", async () => {
      const result = await controller.getMetricsHealth();
      expect(result).toHaveProperty("redisHealthy", true);
      expect(result).toHaveProperty("status", "healthy");
      expect(result).toHaveProperty("metrics");
      expect(result).toHaveProperty("recommendations");
      expect(
        metricsHealthService.getDetailedHealthReport,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET metrics-health/check endpoint", () => {
    it("should trigger manual health check and return status", async () => {
      const result = await controller.triggerMetricsHealthCheck();

      expect(result).toHaveProperty("redisHealthy", true);
      expect(result).toHaveProperty("status", "healthy");
      expect(metricsHealthService.manualHealthCheck).toHaveBeenCalledTimes(1);
      expect(metricsHealthService.getHealthStatus).toHaveBeenCalledTimes(1);
    });

    it("should handle manual health check errors", async () => {
      metricsHealthService.manualHealthCheck.mockRejectedValue(
        new Error("Health check failed"),
      );

      await expect(controller.triggerMetricsHealthCheck()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe("Error Handling and Edge Cases", () => {
    describe("getPerformanceMetrics", () => {
      it("should throw error when performance monitor returns null", async () => {
        performanceMonitor.getPerformanceSummary.mockResolvedValue(null);

        await expect(controller.getPerformanceMetrics({})).rejects.toThrow(
          InternalServerErrorException,
        );
      });

      it("should handle missing healthScore and set default", async () => {
        const incompleteMetrics = { ...mockPerformanceSummary };
        delete (incompleteMetrics as any).healthScore;
        performanceMonitor.getPerformanceSummary.mockResolvedValue(
          incompleteMetrics,
        );

        const result = await controller.getPerformanceMetrics({});

        expect(result.healthScore).toBe(0);
      });

      it("should handle missing endpoints and set empty array", async () => {
        const incompleteMetrics = { ...mockPerformanceSummary };
        delete (incompleteMetrics as any).endpoints;
        performanceMonitor.getPerformanceSummary.mockResolvedValue(
          incompleteMetrics,
        );

        const result = await controller.getPerformanceMetrics({});

        expect(result.endpoints).toEqual([]);
      });

      it("should handle missing processingTime and set default", async () => {
        const incompleteMetrics = { ...mockPerformanceSummary };
        delete (incompleteMetrics as any).processingTime;
        performanceMonitor.getPerformanceSummary.mockResolvedValue(
          incompleteMetrics,
        );

        const result = await controller.getPerformanceMetrics({});

        expect(result.processingTime).toBe(0);
      });

      it("should handle service errors and re-throw", async () => {
        const error = new Error("Service error");
        performanceMonitor.getPerformanceSummary.mockRejectedValue(error);

        await expect(controller.getPerformanceMetrics({})).rejects.toThrow(
          error,
        );
      });
    });

    describe("getEndpointMetrics", () => {
      it("should validate limit parameter range", async () => {
        await expect(
          controller.getEndpointMetrics("0", undefined),
        ).rejects.toThrow(BadRequestException);
        await expect(
          controller.getEndpointMetrics("101", undefined),
        ).rejects.toThrow(BadRequestException);
      });

      it("should handle non-array response from performance monitor", async () => {
        performanceMonitor.getEndpointMetrics.mockResolvedValue({} as any);

        await expect(controller.getEndpointMetrics()).rejects.toThrow(
          InternalServerErrorException,
        );
      });

      it("should sort by averageResponseTime", async () => {
        const unsortedMetrics: EndpointMetricsDto[] = [
          { ...mockEndpointMetrics[0], averageResponseTime: 100 },
          { ...mockEndpointMetrics[1], averageResponseTime: 300 },
        ];
        performanceMonitor.getEndpointMetrics.mockResolvedValue(
          unsortedMetrics,
        );

        const result = await controller.getEndpointMetrics(
          undefined,
          "averageResponseTime",
        );

        expect(result.metrics[0].averageResponseTime).toBe(300);
        expect(result.metrics[1].averageResponseTime).toBe(100);
      });

      it("should sort by errorRate", async () => {
        const unsortedMetrics: EndpointMetricsDto[] = [
          { ...mockEndpointMetrics[0], errorRate: 0.01 },
          { ...mockEndpointMetrics[1], errorRate: 0.05 },
        ];
        performanceMonitor.getEndpointMetrics.mockResolvedValue(
          unsortedMetrics,
        );

        const result = await controller.getEndpointMetrics(
          undefined,
          "errorRate",
        );

        expect(result.metrics[0].errorRate).toBe(0.05);
        expect(result.metrics[1].errorRate).toBe(0.01);
      });

      it("should handle empty metrics array", async () => {
        performanceMonitor.getEndpointMetrics.mockResolvedValue([]);

        const result = await controller.getEndpointMetrics();

        expect(result.metrics).toEqual([]);
        expect(result.total).toBe(0);
      });

      it("should apply limit correctly", async () => {
        performanceMonitor.getEndpointMetrics.mockResolvedValue(
          mockEndpointMetrics,
        );

        const result = await controller.getEndpointMetrics("1", undefined);

        expect(result.metrics).toHaveLength(1);
        expect(result.total).toBe(2);
      });

      it("should handle service errors", async () => {
        const error = new Error("Endpoint metrics error");
        performanceMonitor.getEndpointMetrics.mockRejectedValue(error);

        await expect(controller.getEndpointMetrics()).rejects.toThrow(error);
      });
    });

    describe("getDatabaseMetrics", () => {
      it("should throw error when database metrics are null", async () => {
        performanceMonitor.getDatabaseMetrics.mockResolvedValue(null);

        await expect(controller.getDatabaseMetrics({})).rejects.toThrow(
          InternalServerErrorException,
        );
      });

      it("should provide default values for missing fields", async () => {
        const incompleteMetrics = { connectionPoolSize: 5 };
        performanceMonitor.getDatabaseMetrics.mockResolvedValue(
          incompleteMetrics as any,
        );

        const result = await controller.getDatabaseMetrics({});

        expect(result.connectionPoolSize).toBe(5);
        expect(result.activeConnections).toBe(0);
        expect(result.waitingConnections).toBe(0);
        expect(result.averageQueryTime).toBe(0);
        expect(result.slowQueries).toBe(0);
        expect(result.totalQueries).toBe(0);
        expect(result.timestamp).toBeDefined();
      });

      it("should handle service errors", async () => {
        const error = new Error("Database metrics error");
        performanceMonitor.getDatabaseMetrics.mockRejectedValue(error);

        await expect(controller.getDatabaseMetrics({})).rejects.toThrow(error);
      });
    });

    describe("getRedisMetrics", () => {
      it("should throw error when Redis metrics are null", async () => {
        performanceMonitor.getRedisMetrics.mockResolvedValue(null);

        await expect(controller.getRedisMetrics()).rejects.toThrow(
          InternalServerErrorException,
        );
      });

      it("should provide default values for missing fields", async () => {
        const incompleteMetrics = { memoryUsage: 1024 };
        performanceMonitor.getRedisMetrics.mockResolvedValue(
          incompleteMetrics as any,
        );

        const result = await controller.getRedisMetrics();

        expect(result.memoryUsage).toBe(1024);
        expect(result.connectedClients).toBe(0);
        expect(result.opsPerSecond).toBe(0);
        expect(result.hitRate).toBe(0);
        expect(result.evictedKeys).toBe(0);
        expect(result.expiredKeys).toBe(0);
        expect(result.timestamp).toBeDefined();
      });

      it("should handle service errors", async () => {
        const error = new Error("Redis metrics error");
        performanceMonitor.getRedisMetrics.mockRejectedValue(error);

        await expect(controller.getRedisMetrics()).rejects.toThrow(error);
      });
    });

    describe("getSystemMetrics", () => {
      it("should throw error when system metrics are null", async () => {
        performanceMonitor.getSystemMetrics.mockReturnValue(null);

        await expect(controller.getSystemMetrics()).rejects.toThrow(
          InternalServerErrorException,
        );
      });

      it("should add computed fields", async () => {
        const systemMetrics = {
          cpuUsage: 0.5,
          memoryUsage: 1073741824, // 1GB in bytes
          heapUsed: 536870912, // 512MB
          heapTotal: 1073741824, // 1GB
          uptime: 7200, // 2 hours in seconds
          eventLoopLag: 10,
        };
        performanceMonitor.getSystemMetrics.mockReturnValue(systemMetrics);

        const result = await controller.getSystemMetrics();

        expect(result.memoryUsageGB).toBeCloseTo(1, 3);
        expect(result.heapUsedGB).toBeCloseTo(0.5, 3);
        expect(result.heapTotalGB).toBeCloseTo(1, 3);
        expect(result.uptimeHours).toBeCloseTo(2, 3);
        expect(result.timestamp).toBeDefined();
      });

      it("should handle service errors", async () => {
        const error = new Error("System metrics error");
        performanceMonitor.getSystemMetrics.mockImplementation(() => {
          throw error;
        });

        await expect(controller.getSystemMetrics()).rejects.toThrow(error);
      });
    });

    describe("getHealthStatus", () => {
      // This method returns basic health status without detailed analysis
      it("should return basic health status", async () => {
        const result = await controller.getHealthStatus();
        expect(result.status).toBe("operational");
        expect(result.timestamp).toBeDefined();
        expect(result.uptime).toBe(MOCK_UPTIME);
        expect(result.version).toBeDefined();
        expect(result.message).toBe("系统运行正常");
      });

      it("should handle errors gracefully", async () => {
        // Test that basic health status doesn't depend on external services
        const result = await controller.getHealthStatus();
        expect(result.status).toBe("operational");
        expect(result.message).toBe("系统运行正常");
      });
    });

    describe("getDetailedHealthStatus", () => {
      it("should handle null performance summary", async () => {
        performanceMonitor.getPerformanceSummary.mockResolvedValue(null);

        await expect(controller.getDetailedHealthStatus()).rejects.toThrow(
          InternalServerErrorException,
        );
      });

      it("should determine health status correctly", async () => {
        const testCases = [
          { score: 95, expectedStatus: "healthy" },
          { score: 85, expectedStatus: "warning" },
          { score: 65, expectedStatus: "degraded" },
          { score: 40, expectedStatus: "unhealthy" },
        ];

        for (const { score, expectedStatus } of testCases) {
          const summaryWithScore = {
            ...mockPerformanceSummary,
            healthScore: score,
          };
          performanceMonitor.getPerformanceSummary.mockResolvedValue(
            summaryWithScore,
          );

          const result = await controller.getDetailedHealthStatus();
          expect(result.status).toBe(expectedStatus);
        }
      });

      it("should identify various issues", async () => {
        const problematicSummary = {
          ...mockPerformanceSummary,
          healthScore: 30,
          summary: {
            ...mockPerformanceSummary.summary,
            errorRate: 0.1, // High error rate
            averageResponseTime: 2000, // Slow response
            cacheHitRate: 0.5, // Low cache hit rate
          },
          system: {
            ...mockPerformanceSummary.system,
            cpuUsage: 0.9, // High CPU
            memoryUsage: 1800, // High memory relative to heap
            heapTotal: 2000,
          },
          database: {
            ...mockPerformanceSummary.database,
            averageQueryTime: 600, // Slow queries
          },
        };
        performanceMonitor.getPerformanceSummary.mockResolvedValue(
          problematicSummary as any,
        );

        const result = await controller.getDetailedHealthStatus();

        expect(result.issues).toContain("错误率过高");
        expect(result.issues).toContain("平均响应时间过长");
        expect(result.issues).toContain("CPU使用率过高");
        expect(result.issues).toContain("内存使用率过高");
        expect(result.issues).toContain("缓存命中率过低");
        expect(result.issues).toContain("数据库查询过慢");
      });

      it("should generate recommendations", async () => {
        const problematicSummary = {
          ...mockPerformanceSummary,
          summary: {
            ...mockPerformanceSummary.summary,
            errorRate: 0.1,
          },
        };
        performanceMonitor.getPerformanceSummary.mockResolvedValue(
          problematicSummary as any,
        );

        const result = await controller.getDetailedHealthStatus();

        expect(result.recommendations).toContain(
          "检查错误日志，修复频繁出现的错误",
        );
      });

      it("should handle errors in issue identification", async () => {
        // 使用一个会实际抛出错误的 getter 来模拟
        const problematicSummary = {
          get summary() {
            throw new Error("Property access error");
          },
        };
        performanceMonitor.getPerformanceSummary.mockResolvedValue(
          problematicSummary as any,
        );

        const result = await controller.getDetailedHealthStatus();

        expect(result.issues).toContain("系统健康检查出现异常");
      });

      it("should handle service errors", async () => {
        const error = new Error("Health status error");
        performanceMonitor.getPerformanceSummary.mockRejectedValue(error);

        await expect(controller.getDetailedHealthStatus()).rejects.toThrow(error);
      });
    });

    describe("getOptimizationRecommendations", () => {
      it("should handle performance monitor errors", async () => {
        performanceMonitor.getPerformanceSummary.mockRejectedValue(
          new Error("Performance error"),
        );

        await expect(
          controller.getOptimizationRecommendations(),
        ).rejects.toThrow(InternalServerErrorException);
      });

      it("should handle cache service errors", async () => {
        cacheOptimization.getStats.mockRejectedValue(new Error("Cache error"));

        await expect(
          controller.getOptimizationRecommendations(),
        ).rejects.toThrow(InternalServerErrorException);
      });

      it("should generate comprehensive recommendations", async () => {
        const problematicPerformance = {
          ...mockPerformanceSummary,
          summary: {
            errorRate: 0.1, // High error rate
            averageResponseTime: 2000, // Slow response
          },
          system: {
            cpuUsage: 0.9, // High CPU
          },
          database: {
            averageQueryTime: 600, // Slow DB queries
          },
        } as any;
        const problematicCache = {
          ...mockCacheStats,
          hitRate: 0.6, // Low hit rate
          memoryUsage: 900 * 1024 * 1024, // High memory usage
        } as any;

        performanceMonitor.getPerformanceSummary.mockResolvedValue(
          problematicPerformance,
        );
        cacheOptimization.getStats.mockResolvedValue(problematicCache);

        const result = await controller.getOptimizationRecommendations();

        expect(result.recommendations).toHaveLength(6);
        expect(result.priority.high.count).toBe(3);
        expect(result.priority.medium.count).toBe(2);
        expect(result.priority.low.count).toBe(1); // 增加对low优先级的断言
      });
    });

    describe("getDashboardData", () => {
      it("should aggregate data from all services", async () => {
        const mockAlertStats: IAlertStats = {
          activeAlerts: 5,
          criticalAlerts: 2,
          warningAlerts: 3,
          totalRules: 20,
          enabledRules: 18,
          infoAlerts: 0,
          totalAlertsToday: 10,
          resolvedAlertsToday: 5,
          averageResolutionTime: 600,
        };
        alertingService.getStats.mockResolvedValue(mockAlertStats);

        const result = await controller.getDashboardData();

        expect(result.overview.healthScore).toBe(95);
        expect(result.overview.activeAlerts).toBe(5);
        expect(result.overview.criticalAlerts).toBe(2);
        expect(result.overview.warningAlerts).toBe(3);
        expect(result.performance).toEqual(mockPerformanceSummary);
        expect(result.cache).toEqual(mockCacheStats);
        expect(result.trends).toBeDefined();
        expect(result.alerts).toEqual(mockAlertStats);
      });

      it("should handle service errors", async () => {
        performanceMonitor.getPerformanceSummary.mockRejectedValue(
          new Error("Dashboard error"),
        );

        await expect(controller.getDashboardData()).rejects.toThrow(
          InternalServerErrorException,
        );
      });
    });

    describe("getMetricsHealth", () => {
      it("should handle service errors", async () => {
        metricsHealthService.getDetailedHealthReport.mockImplementation(() => {
          throw new Error("Metrics health error");
        });

        await expect(controller.getMetricsHealth()).rejects.toThrow(
          InternalServerErrorException,
        );
      });
    });
  });

  describe("Private Helper Methods", () => {
    describe("determineHealthStatus", () => {
      it("should determine health status correctly for all ranges", () => {
        expect((controller as any).determineHealthStatus(95)).toBe("healthy");
        expect((controller as any).determineHealthStatus(85)).toBe("warning");
        expect((controller as any).determineHealthStatus(65)).toBe("degraded");
        expect((controller as any).determineHealthStatus(40)).toBe("unhealthy");
        expect((controller as any).determineHealthStatus(90)).toBe("healthy");
        expect((controller as any).determineHealthStatus(70)).toBe("warning");
        expect((controller as any).determineHealthStatus(50)).toBe("degraded");
      });
    });

    describe("identifyIssues", () => {
      it("should handle null summary", () => {
        const issues = (controller as any).identifyIssues(null);
        expect(issues).toContain("系统监控数据不可用");
      });

      it("should handle missing nested objects", () => {
        const summary = {};
        const issues = (controller as any).identifyIssues(summary);
        expect(issues).toBeInstanceOf(Array);
      });

      it("should identify all types of issues", () => {
        const problematicSummary = {
          summary: {
            errorRate: 0.1,
            averageResponseTime: 2000,
            cacheHitRate: 0.5,
          },
          system: {
            cpuUsage: 0.9,
            memoryUsage: 1800,
            heapTotal: 2000,
          },
          database: {
            averageQueryTime: 600,
          },
        };

        const issues = (controller as any).identifyIssues(problematicSummary);

        expect(issues).toContain("错误率过高");
        expect(issues).toContain("平均响应时间过长");
        expect(issues).toContain("CPU使用率过高");
        expect(issues).toContain("内存使用率过高");
        expect(issues).toContain("缓存命中率过低");
        expect(issues).toContain("数据库查询过慢");
      });

      it("should handle errors gracefully", () => {
        // Mock a problematic object that might throw errors
        const problematicSummary = {
          get summary() {
            throw new Error("Property access error");
          },
        };

        const issues = (controller as any).identifyIssues(problematicSummary);
        expect(issues).toContain("系统健康检查出现异常");
      });
    });

    describe("generateRecommendations", () => {
      it("should handle null summary", () => {
        const recommendations = (controller as any).generateRecommendations(
          null,
        );
        expect(recommendations).toContain("请检查系统监控配置");
      });

      it("should generate specific recommendations for issues", () => {
        const problematicSummary = {
          summary: {
            errorRate: 0.1,
            averageResponseTime: 2000,
            cacheHitRate: 0.5,
          },
          system: {
            cpuUsage: 0.9,
            memoryUsage: 1800,
            heapTotal: 2000,
          },
          database: {
            averageQueryTime: 600,
          },
        };

        const recommendations = (controller as any).generateRecommendations(
          problematicSummary,
        );

        expect(recommendations).toContain("检查错误日志，修复频繁出现的错误");
        expect(recommendations).toContain(
          "优化API响应时间，考虑增加缓存或优化数据库查询",
        );
        expect(recommendations).toContain("考虑水平扩容或优化CPU密集型操作");
        expect(recommendations).toContain(
          "检查内存泄漏，考虑增加内存或优化内存使用",
        );
        expect(recommendations).toContain("优化缓存策略，增加缓存命中率");
        expect(recommendations).toContain("优化数据库索引，检查慢查询");
      });

      it("should provide default recommendation when no issues", () => {
        const healthySummary = {
          summary: {
            errorRate: 0.01,
            averageResponseTime: 100,
            cacheHitRate: 0.9,
          },
          system: {
            cpuUsage: 0.3,
            memoryUsage: 500,
            heapTotal: 2000,
          },
          database: {
            averageQueryTime: 50,
          },
        };

        const recommendations = (controller as any).generateRecommendations(
          healthySummary,
        );
        expect(recommendations).toContain("系统运行正常，继续保持当前配置");
      });

      it("should handle errors gracefully", () => {
        const problematicSummary = {
          get summary() {
            throw new Error("Property access error");
          },
        };

        const recommendations = (controller as any).generateRecommendations(
          problematicSummary,
        );
        expect(recommendations).toContain("请联系系统管理员检查监控配置");
      });
    });

    describe("generateOptimizationRecommendations", () => {
      it("should generate recommendations based on performance data", () => {
        const performance = {
          summary: {
            errorRate: 0.1,
            averageResponseTime: 2000,
          },
          system: {
            cpuUsage: 0.9,
          },
          database: {
            averageQueryTime: 600,
          },
        } as any;

        const cache = {
          hitRate: 0.6,
          memoryUsage: 900 * 1024 * 1024,
        } as any;

        const recommendations = (
          controller as any
        ).generateOptimizationRecommendations(performance, cache);

        expect(recommendations).toHaveLength(6);
        expect(recommendations.some((r) => r.type === "error_handling")).toBe(
          true,
        );
        expect(recommendations.some((r) => r.type === "response_time")).toBe(
          true,
        );
        expect(recommendations.some((r) => r.type === "cpu_optimization")).toBe(
          true,
        );
        expect(
          recommendations.some((r) => r.type === "cache_optimization"),
        ).toBe(true);
        expect(
          recommendations.some((r) => r.type === "database_optimization"),
        ).toBe(true);
        // 增加对 cache_memory 类型的断言
        expect(recommendations.some((r) => r.type === "cache_memory")).toBe(
          true,
        );
      });

      it("should return empty array for healthy system", () => {
        const performance = {
          summary: {
            errorRate: 0.01,
            averageResponseTime: 200,
          },
          system: {
            cpuUsage: 0.3,
          },
          database: {
            averageQueryTime: 100,
          },
        } as any;

        const cache = {
          hitRate: 0.9,
          memoryUsage: 100 * 1024 * 1024,
        } as any;

        const recommendations = (
          controller as any
        ).generateOptimizationRecommendations(performance, cache);
        expect(recommendations).toHaveLength(0);
      });
    });

    describe("categorizePriority", () => {
      it("should categorize recommendations by priority", () => {
        const recommendations = [
          { priority: "high", type: "error" },
          { priority: "medium", type: "performance" },
          { priority: "low", type: "optimization" },
          { priority: "high", type: "security" },
        ];

        const categorized = (controller as any).categorizePriority(
          recommendations,
        );

        expect(categorized.high.count).toBe(2);
        expect(categorized.medium.count).toBe(1);
        expect(categorized.low.count).toBe(1);
        expect(categorized.total).toBe(4);
      });
    });

    describe("calculateTrends", () => {
      it("should return trend data", async () => {
        const trends = await (controller as any).calculateTrends();

        expect(trends).toHaveProperty("responseTime");
        expect(trends).toHaveProperty("errorRate");
        expect(trends).toHaveProperty("throughput");
        expect(trends).toHaveProperty("cacheHitRate");
        expect(trends.responseTime.trend).toBe("improving");
        expect(trends.errorRate.trend).toBe("stable");
      });
    });
  });

  describe("Default Methods Coverage", () => {
    it("should cover getDefaultPerformanceMetrics", () => {
      const defaultMetrics = (controller as any).getDefaultPerformanceMetrics();

      expect(defaultMetrics.healthScore).toBe(0);
      expect(defaultMetrics.endpoints).toEqual([]);
      expect(defaultMetrics.system.uptime).toBe(MOCK_UPTIME);
    });

    it("should cover getDefaultDatabaseMetrics", () => {
      const defaultMetrics = (controller as any).getDefaultDatabaseMetrics();

      expect(defaultMetrics.connectionPoolSize).toBe(10);
      expect(defaultMetrics.totalQueries).toBe(0);
      expect(defaultMetrics.timestamp).toBeDefined();
    });

    it("should cover getDefaultRedisMetrics", () => {
      const defaultMetrics = (controller as any).getDefaultRedisMetrics();

      expect(defaultMetrics.memoryUsage).toBe(0);
      expect(defaultMetrics.hitRate).toBe(0);
      expect(defaultMetrics.timestamp).toBeDefined();
    });

    it("should cover getDefaultHealthStatus", () => {
      const defaultStatus = (controller as any).getDefaultHealthStatus();

      expect(defaultStatus.status).toBe("degraded");
      expect(defaultStatus.score).toBe(0);
      expect(defaultStatus.issues).toContain("性能监控服务不可用");
      expect(defaultStatus.uptime).toBe(MOCK_UPTIME);
    });
  });
});

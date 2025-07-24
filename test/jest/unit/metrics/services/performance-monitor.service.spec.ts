import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { PerformanceMonitorService } from "../../../../../src/metrics/services/performance-monitor.service";
import { PerformanceMetricsRepository } from "../../../../../src/metrics/repositories/performance-metrics.repository";
import {
  AuthType,
  AuthStatus,
  OperationStatus,
} from "../../../../../src/metrics/enums/auth-type.enum";
import {
  METRIC_NAMES,
  METRIC_UNITS,
  PERFORMANCE_EVENTS,
  PERFORMANCE_THRESHOLDS,
  PERFORMANCE_DEFAULTS,
} from "../../../../../src/metrics/constants/metrics-performance.constants";

describe("PerformanceMonitorService", () => {
  let service: PerformanceMonitorService;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;
  let performanceMetricsRepository: jest.Mocked<PerformanceMetricsRepository>;

  beforeEach(async () => {
    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config = {
          DB_POOL_SIZE: 10,
          NODE_ENV: "test",
        };
        return config[key] || defaultValue;
      }),
    };

    const mockPerformanceMetricsRepository = {
      recordRequest: jest.fn(),
      recordDatabaseQuery: jest.fn(),
      getEndpointStats: jest.fn(),
      getDatabaseQueryTimes: jest.fn(),
      getRedisInfoPayload: jest.fn(),
      flushMetrics: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceMonitorService,
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PerformanceMetricsRepository,
          useValue: mockPerformanceMetricsRepository,
        },
      ],
    }).compile();

    service = module.get<PerformanceMonitorService>(PerformanceMonitorService);
    eventEmitter = module.get(EventEmitter2);
    configService = module.get(ConfigService);
    performanceMetricsRepository = module.get(PerformanceMetricsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("PerformanceMonitorService - Definition", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should have all required dependencies", () => {
      expect(eventEmitter).toBeDefined();
      expect(configService).toBeDefined();
      expect(performanceMetricsRepository).toBeDefined();
    });
  });

  describe("Request Monitoring", () => {
    describe("recordRequest", () => {
      it("should record API request metrics successfully", async () => {
        const endpoint = "/api/v1/test";
        const method = "GET";
        const responseTime = 150;
        const success = true;

        performanceMetricsRepository.recordRequest.mockResolvedValue(undefined);

        await service.recordRequest(endpoint, method, responseTime, success);

        expect(performanceMetricsRepository.recordRequest).toHaveBeenCalledWith(
          endpoint,
          method,
          responseTime,
          success,
        );
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.API_REQUEST_DURATION,
            value: responseTime,
          }),
        );
      });

      it("should handle failed requests", async () => {
        const endpoint = "/api/v1/error";
        const method = "POST";
        const responseTime = 5000;
        const success = false;

        performanceMetricsRepository.recordRequest.mockResolvedValue(undefined);

        await service.recordRequest(endpoint, method, responseTime, success);

        expect(performanceMetricsRepository.recordRequest).toHaveBeenCalledWith(
          endpoint,
          method,
          responseTime,
          false,
        );
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.API_REQUEST_DURATION,
            value: responseTime,
          }),
        );
      });

      it("should handle repository errors", async () => {
        const endpoint = "/api/v1/test";
        const method = "GET";
        const responseTime = 150;
        const success = true;

        performanceMetricsRepository.recordRequest.mockRejectedValue(
          new Error("Repository error"),
        );

        await expect(
          service.recordRequest(endpoint, method, responseTime, success),
        ).rejects.toThrow("Repository error");
      });
    });
  });

  describe("Database Monitoring", () => {
    describe("recordDatabaseQuery", () => {
      it("should record database query metrics", async () => {
        const queryType = "SELECT";
        const duration = 25;
        const success = true;

        performanceMetricsRepository.recordDatabaseQuery.mockResolvedValue(
          undefined,
        );

        await service.recordDatabaseQuery(queryType, duration, success);

        expect(
          performanceMetricsRepository.recordDatabaseQuery,
        ).toHaveBeenCalledWith(duration);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.DB_QUERY_DURATION,
            value: duration,
          }),
        );
      });

      it("should handle slow database queries", async () => {
        const queryType = "COMPLEX_JOIN";
        const duration = PERFORMANCE_THRESHOLDS.SLOW_QUERY_MS + 100;
        const success = true;

        performanceMetricsRepository.recordDatabaseQuery.mockResolvedValue(
          undefined,
        );

        await service.recordDatabaseQuery(queryType, duration, success);

        expect(
          performanceMetricsRepository.recordDatabaseQuery,
        ).toHaveBeenCalledWith(duration);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.DB_QUERY_DURATION,
            value: duration,
          }),
        );
      });

      it("should handle failed database queries", async () => {
        const queryType = "INSERT";
        const duration = 50;
        const success = false;

        performanceMetricsRepository.recordDatabaseQuery.mockResolvedValue(
          undefined,
        );

        await service.recordDatabaseQuery(queryType, duration, success);

        expect(
          performanceMetricsRepository.recordDatabaseQuery,
        ).toHaveBeenCalledWith(duration);
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.DB_QUERY_DURATION,
            value: duration,
          }),
        );
      });
    });
  });

  describe("Cache Monitoring", () => {
    describe("recordCacheOperation", () => {
      it("should record cache hit operation", () => {
        const operation = "GET";
        const hit = true;
        const duration = 5;

        service.recordCacheOperation(operation, hit, duration);

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.CACHE_OPERATION_TOTAL,
            value: 1,
          }),
        );
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.CACHE_OPERATION_DURATION,
            value: duration,
          }),
        );
      });

      it("should record cache miss operation", () => {
        const operation = "GET";
        const hit = false;

        service.recordCacheOperation(operation, hit);

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.CACHE_OPERATION_TOTAL,
            value: 1,
          }),
        );
        // Duration 不应该被记录，因为没有提供
        expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      });

      it("should record cache operation without duration", () => {
        const operation = "SET";
        const hit = true;

        service.recordCacheOperation(operation, hit);

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.CACHE_OPERATION_TOTAL,
            value: 1,
          }),
        );
        expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("Authentication Monitoring", () => {
    describe("recordAuthentication", () => {
      it("should record successful JWT authentication", () => {
        const type = AuthType.JWT;
        const success = true;
        const duration = 50;

        service.recordAuthentication(type, success, duration);

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.AUTH_DURATION,
            value: duration,
          }),
        );
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.AUTH_TOTAL,
            value: 1,
          }),
        );
      });

      it("should record failed API key authentication", () => {
        const type = AuthType.API_KEY;
        const success = false;
        const duration = 75;

        service.recordAuthentication(type, success, duration);

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.AUTH_DURATION,
            value: duration,
          }),
        );
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.AUTH_TOTAL,
            value: 1,
          }),
        );
      });
    });
  });

  describe("Rate Limiting Monitoring", () => {
    describe("recordRateLimit", () => {
      it("should record allowed rate limit check", () => {
        const apiKey = "ak_test_1234567890";
        const allowed = true;
        const remaining = 95;

        service.recordRateLimit(apiKey, allowed, remaining);

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.RATE_LIMIT_CHECK,
            value: 1,
          }),
        );
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.RATE_LIMIT_REMAINING,
            value: remaining,
          }),
        );
      });

      it("should record blocked rate limit check", () => {
        const apiKey = "ak_test_9876543210";
        const allowed = false;
        const remaining = 0;

        service.recordRateLimit(apiKey, allowed, remaining);

        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.RATE_LIMIT_CHECK,
            value: 1,
          }),
        );
        expect(eventEmitter.emit).toHaveBeenCalledWith(
          PERFORMANCE_EVENTS.METRIC_RECORDED,
          expect.objectContaining({
            metric: METRIC_NAMES.RATE_LIMIT_REMAINING,
            value: remaining,
          }),
        );
      });
    });
  });

  describe("Performance Wrapper", () => {
    describe("wrapWithTiming", () => {
      it("should wrap synchronous operations", () => {
        const operation = jest.fn().mockReturnValue("success");
        const onComplete = jest.fn();

        const result = service.wrapWithTiming(operation, onComplete);

        expect(result).toBe("success");
        expect(operation).toHaveBeenCalledTimes(1);
        expect(onComplete).toHaveBeenCalledWith(
          expect.any(Number),
          true,
          "success",
        );
      });

      it("should wrap asynchronous operations", async () => {
        const operation = jest.fn().mockResolvedValue("async success");
        const onComplete = jest.fn();

        const result = await service.wrapWithTiming(operation, onComplete);

        expect(result).toBe("async success");
        expect(operation).toHaveBeenCalledTimes(1);
        expect(onComplete).toHaveBeenCalledWith(
          expect.any(Number),
          true,
          "async success",
        );
      });

      it("should handle synchronous operation errors", () => {
        const error = new Error("Sync operation failed");
        const operation = jest.fn().mockImplementation(() => {
          throw error;
        });
        const onComplete = jest.fn();

        expect(() => service.wrapWithTiming(operation, onComplete)).toThrow(
          error,
        );
        expect(operation).toHaveBeenCalledTimes(1);
        expect(onComplete).toHaveBeenCalledWith(expect.any(Number), false);
      });

      it("should handle asynchronous operation errors", async () => {
        const error = new Error("Async operation failed");
        const operation = jest.fn().mockRejectedValue(error);
        const onComplete = jest.fn();

        await expect(
          service.wrapWithTiming(operation, onComplete),
        ).rejects.toThrow(error);
        expect(operation).toHaveBeenCalledTimes(1);
        expect(onComplete).toHaveBeenCalledWith(expect.any(Number), false);
      });
    });
  });

  describe("Metrics Retrieval", () => {
    describe("getEndpointMetrics", () => {
      it("should return endpoint metrics", async () => {
        const mockStats = [
          {
            key: "endpoint_stats:GET:/api/v1/test",
            stats: {
              totalRequests: "100",
              successfulRequests: "95",
              failedRequests: "5",
            },
            responseTimes: ["100", "150", "200", "300", "250"],
          },
        ];

        performanceMetricsRepository.getEndpointStats.mockResolvedValue(
          mockStats,
        );

        const result = await service.getEndpointMetrics();

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
          endpoint: "/api/v1/test",
          method: "GET",
          totalRequests: 100,
          successfulRequests: 95,
          failedRequests: 5,
          errorRate: 0.05,
        });
        expect(result[0].averageResponseTime).toBeCloseTo(200, 0);
      });

      it("should return empty array when no stats available", async () => {
        performanceMetricsRepository.getEndpointStats.mockResolvedValue([]);

        const result = await service.getEndpointMetrics();

        expect(result).toEqual([]);
      });

      it("should handle repository errors", async () => {
        performanceMetricsRepository.getEndpointStats.mockRejectedValue(
          new Error("Repository error"),
        );

        await expect(service.getEndpointMetrics()).rejects.toThrow(
          "Repository error",
        );
      });
    });

    describe("getDatabaseMetrics", () => {
      it("should return database metrics", async () => {
        const mockQueryTimes = ["25", "50", "75", "100", "200"];
        performanceMetricsRepository.getDatabaseQueryTimes.mockResolvedValue(
          mockQueryTimes,
        );
        configService.get.mockReturnValue(10);

        const result = await service.getDatabaseMetrics();

        expect(result).toMatchObject({
          connectionPoolSize: 10,
          activeConnections: 0,
          waitingConnections: 0,
          totalQueries: 5,
        });
        expect(result.averageQueryTime).toBeCloseTo(90, 0);
      });

      it("should return default metrics when no data available", async () => {
        performanceMetricsRepository.getDatabaseQueryTimes.mockResolvedValue(
          null,
        );

        const result = await service.getDatabaseMetrics();

        expect(result).toMatchObject({
          connectionPoolSize: PERFORMANCE_DEFAULTS.DB_POOL_SIZE,
          activeConnections: 0,
          waitingConnections: 0,
          averageQueryTime: 0,
          slowQueries: 0,
          totalQueries: 0,
        });
      });
    });

    describe("getRedisMetrics", () => {
      it("should return Redis metrics", async () => {
        const mockRedisInfo = {
          info: "used_memory:1048576\r\n",
          stats:
            "total_commands_processed:1000\r\nkeyspace_hits:800\r\nkeyspace_misses:200\r\nevicted_keys:5\r\nexpired_keys:10\r\n",
          clients: "connected_clients:5\r\n",
        };

        performanceMetricsRepository.getRedisInfoPayload.mockResolvedValue(
          mockRedisInfo,
        );

        const result = await service.getRedisMetrics();

        expect(result).toMatchObject({
          memoryUsage: 1048576,
          connectedClients: 5,
          opsPerSecond: 1000,
          hitRate: 0.8,
          evictedKeys: 5,
          expiredKeys: 10,
        });
      });

      it("should return default metrics when Redis info unavailable", async () => {
        performanceMetricsRepository.getRedisInfoPayload.mockResolvedValue(
          null,
        );

        const result = await service.getRedisMetrics();

        expect(result).toMatchObject({
          memoryUsage: PERFORMANCE_DEFAULTS.REDIS_MEMORY_USAGE,
          connectedClients: 0,
          opsPerSecond: 0,
          hitRate: PERFORMANCE_DEFAULTS.CACHE_HIT_RATE,
          evictedKeys: 0,
          expiredKeys: 0,
        });
      });
    });

    describe("getSystemMetrics", () => {
      it("should return system metrics", () => {
        const result = service.getSystemMetrics();

        expect(result).toHaveProperty("cpuUsage");
        expect(result).toHaveProperty("memoryUsage");
        expect(result).toHaveProperty("heapUsed");
        expect(result).toHaveProperty("heapTotal");
        expect(result).toHaveProperty("uptime");
        expect(result).toHaveProperty("eventLoopLag");
        expect(typeof result.cpuUsage).toBe("number");
        expect(typeof result.memoryUsage).toBe("number");
        expect(typeof result.uptime).toBe("number");
      });
    });

    describe("getPerformanceSummary", () => {
      it("should return comprehensive performance summary", async () => {
        // Mock all dependencies
        const mockEndpointStats = [
          {
            key: "metrics:endpoint_stats:GET:/api/v1/test",
            stats: {
              totalRequests: "100",
              successfulRequests: "95",
              failedRequests: "5",
            },
            responseTimes: ["100", "150", "200"],
          },
        ];
        const mockQueryTimes = ["25", "50", "75"];
        const mockRedisInfo = {
          info: "used_memory:1048576\r\n",
          stats: "keyspace_hits:800\r\nkeyspace_misses:200\r\n",
          clients: "connected_clients:5\r\n",
        };

        performanceMetricsRepository.getEndpointStats.mockResolvedValue(
          mockEndpointStats,
        );
        performanceMetricsRepository.getDatabaseQueryTimes.mockResolvedValue(
          mockQueryTimes,
        );
        performanceMetricsRepository.getRedisInfoPayload.mockResolvedValue(
          mockRedisInfo,
        );

        const result = await service.getPerformanceSummary();

        expect(result).toHaveProperty("timestamp");
        expect(result).toHaveProperty("healthScore");
        expect(result).toHaveProperty("summary");
        expect(result).toHaveProperty("endpoints");
        expect(result).toHaveProperty("database");
        expect(result).toHaveProperty("redis");
        expect(result).toHaveProperty("system");
        expect(result.summary.totalRequests).toBe(100);
        expect(result.endpoints).toHaveLength(1);
        expect(typeof result.healthScore).toBe("number");
      });

      it("should handle errors gracefully", async () => {
        performanceMetricsRepository.getEndpointStats.mockRejectedValue(
          new Error("DB error"),
        );
        performanceMetricsRepository.getDatabaseQueryTimes.mockRejectedValue(
          new Error("DB error"),
        );
        performanceMetricsRepository.getRedisInfoPayload.mockRejectedValue(
          new Error("Redis error"),
        );

        const result = await service.getPerformanceSummary();

        expect(result).toHaveProperty("timestamp");
        expect(result).toHaveProperty("healthScore", 0);
        expect(result).toHaveProperty("summary");
        expect(result.summary.totalRequests).toBe(0);
        expect(result.endpoints).toEqual([]);
      });
    });
  });
});

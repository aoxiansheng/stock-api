import { Test, TestingModule } from "@nestjs/testing";
import { StreamCacheService } from "../../../../../../src/core/05-caching/stream-cache/services/stream-cache.service";
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CACHE_REDIS_CLIENT_TOKEN,
  STREAM_CACHE_CONFIG_TOKEN
} from "../../../../../../src/monitoring/contracts/tokens/injection.tokens";
import { Redis } from "ioredis";
import { CollectorService } from "../../../../../../src/monitoring/collector/collector.service";

describe("StreamCacheService Monitoring Integration", () => {
  let service: StreamCacheService;
  let mockRedisClient: jest.Mocked<Redis>;
  let mockCollectorService: jest.Mocked<CollectorService>;

  beforeEach(async () => {
    // Mock Redis client
    mockRedisClient = {
      ping: jest.fn().mockResolvedValue("PONG"),
      set: jest.fn().mockResolvedValue("OK"),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      flushall: jest.fn().mockResolvedValue("OK"),
      pipeline: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      }),
    } as any;

    // Mock CollectorService
    mockCollectorService = {
      recordSystemHealth: jest.fn().mockResolvedValue(undefined),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamCacheService,
        {
          provide: CACHE_REDIS_CLIENT_TOKEN,
          useValue: mockRedisClient,
        },
        {
          provide: STREAM_CACHE_CONFIG_TOKEN,
          useValue: {
            hotCacheTTL: 30000,
            warmCacheTTL: 300,
            maxHotCacheSize: 100,
            cleanupInterval: 60000,
            compressionThreshold: 1024,
          },
        },
        {
          provide: CollectorService,
          useValue: mockCollectorService,
        },
      ],
    }).compile();

    service = module.get<StreamCacheService>(StreamCacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Health Check with Monitoring Integration", () => {
    it("应该返回健康状态并记录健康检查指标", async () => {
      const healthStatus = await service.getHealthStatus();

      expect(healthStatus).toEqual({
        status: "healthy",
        hotCacheSize: expect.any(Number),
        redisConnected: true,
        lastError: null,
        performance: expect.objectContaining({
          avgHotCacheHitTime: expect.any(Number),
          avgWarmCacheHitTime: expect.any(Number),
          compressionRatio: expect.any(Number),
        }),
      });

      // 验证Redis被调用
      expect(mockRedisClient.ping).toHaveBeenCalled();
    });

    it("应该在Redis不可用时返回不健康状态", async () => {
      mockRedisClient.ping.mockRejectedValue(new Error("Connection failed"));

      const healthStatus = await service.getHealthStatus();

      expect(healthStatus.status).toBe("unhealthy");
      expect(healthStatus.redisConnected).toBe(false);
    });

    it("应该在部分功能异常时返回降级状态", async () => {
      // Redis ping正常，但其他操作异常
      mockRedisClient.set.mockRejectedValue(new Error("Memory full"));

      const healthStatus = await service.getHealthStatus();

      expect(healthStatus.status).toBe("degraded");
    });
  });

  describe("Monitoring Data Reporting", () => {
    it("应该成功向CollectorService报告系统指标", async () => {
      await service.reportSystemMetrics();

      expect(mockCollectorService.recordSystemMetrics).toHaveBeenCalledWith({
        memory: expect.objectContaining({
          used: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        }),
        cpu: expect.objectContaining({
          usage: expect.any(Number),
        }),
        uptime: expect.any(Number),
        timestamp: expect.any(Date),
      });
    });

    it("应该在CollectorService失败时优雅处理不抛出异常", async () => {
      mockCollectorService.recordSystemMetrics.mockImplementation(() => {
        throw new Error("Collector service unavailable");
      });

      await expect(service.reportSystemMetrics()).resolves.toBeUndefined();
      expect(mockCollectorService.recordSystemMetrics).toHaveBeenCalled();
    });

    it("应该报告准确的系统指标数据", async () => {
      // 执行一些缓存操作来生成指标
      const testData = [{ s: "TEST", p: 100, v: 1000, t: Date.now() }];
      await service.setData("metrics-test", testData);

      await service.reportSystemMetrics();

      const callArgs =
        mockCollectorService.recordSystemMetrics.mock.calls[0][0];

      expect(callArgs).toMatchObject({
        memory: expect.objectContaining({
          used: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        }),
        cpu: expect.objectContaining({
          usage: expect.any(Number),
        }),
        uptime: expect.any(Number),
        timestamp: expect.any(Date),
      });

      // 验证内存百分比计算正确
      expect(callArgs.memory.percentage).toBeGreaterThan(0);
      expect(callArgs.memory.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe("Fault Tolerance", () => {
    it("应该在没有CollectorService时仍正常运行", async () => {
      // 创建一个没有CollectorService的service实例
      const moduleWithoutCollector = await Test.createTestingModule({
        providers: [
          StreamCacheService,
          {
            provide: CACHE_REDIS_CLIENT_TOKEN,
            useValue: mockRedisClient,
          },
          {
            provide: STREAM_CACHE_CONFIG_TOKEN,
            useValue: {
              hotCacheTTL: 30000,
              warmCacheTTL: 300,
              maxHotCacheSize: 100,
              cleanupInterval: 60000,
              compressionThreshold: 1024,
            },
          },
          // 不提供CollectorService
        ],
      }).compile();

      const serviceWithoutCollector =
        moduleWithoutCollector.get<StreamCacheService>(StreamCacheService);

      // 核心功能应该仍然工作
      const testData = [{ s: "TEST", p: 100, v: 1000, t: Date.now() }];
      await expect(
        serviceWithoutCollector.setData("test-key", testData),
      ).resolves.toBeUndefined();
    });

    it("应该处理健康检查期间的各种错误情况", async () => {
      // 测试多种错误情况
      const errorScenarios = [
        {
          setup: () => {
            mockRedisClient.ping = jest
              .fn()
              .mockRejectedValue(new Error("Network error"));
          },
          expectedStatus: "unhealthy",
        },
        {
          setup: () => {
            mockRedisClient.ping = jest.fn().mockResolvedValue("PONG");
            mockRedisClient.set = jest
              .fn()
              .mockRejectedValue(new Error("Memory full"));
          },
          expectedStatus: "degraded",
        },
      ];

      for (const scenario of errorScenarios) {
        scenario.setup();
        const healthStatus = await service.getHealthStatus();
        expect(healthStatus.status).toBe(scenario.expectedStatus);
      }
    });
  });

  describe("Real-world Integration Scenarios", () => {
    it("应该正确处理监控数据收集的完整生命周期", async () => {
      // 1. 初始健康检查
      const initialHealth = await service.getHealthStatus();
      expect(initialHealth.status).toBe("healthy");

      // 2. 执行一些缓存操作
      const testData = [{ s: "STOCK1", p: 150.5, v: 2000, t: Date.now() }];
      await service.setData("lifecycle-test", testData);

      // 3. 报告监控指标
      await service.reportSystemMetrics();

      // 4. 验证系统监控数据被正确记录
      expect(mockCollectorService.recordSystemMetrics).toHaveBeenCalledWith({
        memory: expect.objectContaining({
          used: expect.any(Number),
          total: expect.any(Number),
          percentage: expect.any(Number),
        }),
        cpu: expect.objectContaining({
          usage: expect.any(Number),
        }),
        uptime: expect.any(Number),
        timestamp: expect.any(Date),
      });

      // 5. 验证缓存操作对Redis的调用
      expect(mockRedisClient.ping).toHaveBeenCalled();
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    it("应该在监控报告失败时不影响核心缓存功能", async () => {
      // Mock CollectorService failure
      mockCollectorService.recordSystemMetrics.mockImplementation(() => {
        throw new Error("Monitoring system down");
      });

      // 缓存操作应该仍然正常
      const testData = [{ s: "TEST", p: 100, v: 1000, t: Date.now() }];
      await service.setData("resilience-test", testData);
      const retrievedData = await service.getData("resilience-test");

      expect(retrievedData).toEqual(testData);

      // 监控报告失败不应该抛出异常
      await expect(service.reportSystemMetrics()).resolves.toBeUndefined();
    });
  });
});
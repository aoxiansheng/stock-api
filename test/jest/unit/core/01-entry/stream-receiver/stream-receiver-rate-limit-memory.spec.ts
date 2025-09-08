import { Test, TestingModule } from "@nestjs/testing";
import { StreamReceiverService } from "../../../../../../src/core/01-entry/stream-receiver/services/stream-receiver.service";
import { SymbolTransformerService } from "../../../../../../src/core/02-processing/symbol-transformer/services/symbol-transformer.service";
import { DataTransformerService } from "../../../../../../src/core/02-processing/transformer/services/data-transformer.service";
import { StreamDataFetcherService } from "../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service";
import { CollectorService } from "../../../../../../src/monitoring/collector/collector.service";
import { StreamRecoveryWorkerService } from "../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-recovery-worker.service";
import { RateLimitService } from "../../../../../../src/auth/services/rate-limit.service";
import { StreamSubscribeDto } from "../../../../../../src/core/01-entry/stream-receiver/dto/stream-subscribe.dto";
import { REFERENCE_DATA } from '@common/constants/domain';
import { API_OPERATIONS } from '@common/constants/domain';

describe("StreamReceiverService - Rate Limiting & Memory Protection Integration", () => {
  let service: StreamReceiverService;
  let mockRateLimitService: jest.Mocked<RateLimitService>;
  let mockCollectorService: jest.Mocked<CollectorService>;

  // Mock services
  let mockSymbolTransformer: jest.Mocked<SymbolTransformerService>;
  let mockDataTransformer: jest.Mocked<DataTransformerService>;
  let mockStreamDataFetcher: jest.Mocked<StreamDataFetcherService>;
  let mockRecoveryWorker: jest.Mocked<StreamRecoveryWorkerService>;

  beforeEach(async () => {
    // 创建 mock 服务
    mockSymbolTransformer = {
      transformSymbols: jest.fn(),
    } as any;

    mockDataTransformer = {
      transform: jest.fn(),
    } as any;

    mockStreamDataFetcher = {
      getClientStateManager: jest.fn().mockReturnValue({
        addClientSubscription: jest.fn(),
        getClientSubscription: jest.fn(),
        getClientStateStats: jest.fn(),
        broadcastToSymbolViaGateway: jest.fn(),
        addSubscriptionChangeListener: jest.fn(),
      }),
      getStreamDataCache: jest.fn().mockReturnValue({
        setData: jest.fn(),
        getCacheStats: jest.fn(),
      }),
      establishStreamConnection: jest.fn(),
      isConnectionActive: jest.fn(),
      getConnectionStatsByProvider: jest.fn(),
      batchHealthCheck: jest.fn(),
      subscribeToSymbols: jest.fn(),
    } as any;

    mockCollectorService = {
      recordRequest: jest.fn(),
      recordSystemMetrics: jest.fn(),
    } as any;

    // Mock eventBus as a public property for testing
    (mockCollectorService as any).eventBus = {
      emit: jest.fn(),
    };

    mockRecoveryWorker = {
      submitRecoveryJob: jest.fn(),
    } as any;

    mockRateLimitService = {
      checkRateLimit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamReceiverService,
        { provide: SymbolTransformerService, useValue: mockSymbolTransformer },
        { provide: DataTransformerService, useValue: mockDataTransformer },
        { provide: StreamDataFetcherService, useValue: mockStreamDataFetcher },
        { provide: CollectorService, useValue: mockCollectorService },
        { provide: StreamRecoveryWorkerService, useValue: mockRecoveryWorker },
        { provide: RateLimitService, useValue: mockRateLimitService },
      ],
    }).compile();

    service = module.get<StreamReceiverService>(StreamReceiverService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe("Connection Rate Limiting", () => {
    it("should have checkConnectionRateLimit method for IP-based rate limiting", async () => {
      // Act & Assert
      expect(service["checkConnectionRateLimit"]).toBeDefined();
      expect(typeof service["checkConnectionRateLimit"]).toBe("function");
    });

    it("should call checkConnectionRateLimit with correct parameters", async () => {
      // Arrange
      const checkRateLimitSpy = jest
        .spyOn(service as any, "checkConnectionRateLimit")
        .mockResolvedValue(true);

      const subscribeDto: StreamSubscribeDto = {
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        wsCapabilityType: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
      };
      const clientIp = "192.168.1.100";

      // Mock the other methods to avoid actual processing
      jest.spyOn(service as any, "mapSymbols").mockResolvedValue(["700"]);
      jest
        .spyOn(service as any, "getOrCreateConnection")
        .mockResolvedValue({ id: "test-connection" });
      jest
        .spyOn(service as any, "setupDataReceiving")
        .mockImplementation(() => {});

      // Act
      await service.subscribeStream(subscribeDto, "client1", clientIp);

      // Assert
      expect(checkRateLimitSpy).toHaveBeenCalledWith(clientIp);
    });

    it("should handle rate limit check failures gracefully (fail-open strategy)", async () => {
      // Arrange
      const checkRateLimitSpy = jest
        .spyOn(service as any, "checkConnectionRateLimit")
        .mockRejectedValue(new Error("Rate limit service unavailable"));

      const loggerSpy = jest.spyOn(service["logger"], "warn");
      const subscribeDto: StreamSubscribeDto = {
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        wsCapabilityType: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
      };

      // Mock the other methods
      jest.spyOn(service as any, "mapSymbols").mockResolvedValue(["700"]);
      jest
        .spyOn(service as any, "getOrCreateConnection")
        .mockResolvedValue({ id: "test-connection" });
      jest
        .spyOn(service as any, "setupDataReceiving")
        .mockImplementation(() => {});

      // Act & Assert - Should not throw error
      await expect(
        service.subscribeStream(subscribeDto, "client1", "192.168.1.100"),
      ).resolves.not.toThrow();

      // Should log warning but continue processing
      expect(loggerSpy).toHaveBeenCalledWith("连接频率检查失败，允许连接", {
        error: "Rate limit service unavailable",
      });
    });

    it("should reject connections when rate limit is exceeded", async () => {
      // Arrange
      jest
        .spyOn(service as any, "checkConnectionRateLimit")
        .mockResolvedValue(false);

      const subscribeDto: StreamSubscribeDto = {
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        wsCapabilityType: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
      };

      // Act & Assert
      await expect(
        service.subscribeStream(subscribeDto, "client1", "192.168.1.100"),
      ).rejects.toThrow("连接频率过高，请稍后重试");
    });

    it("should reject connections when max connections limit is reached", async () => {
      // Arrange
      jest
        .spyOn(service as any, "checkConnectionRateLimit")
        .mockResolvedValue(true);

      // 填充连接到最大限制
      const activeConnections = service["activeConnections"];
      for (let i = 0; i < 1000; i++) {
        // MAX_CONNECTIONS = 1000
        activeConnections.set(`connection_${i}`, {
          id: `conn_${i}`,
          lastActivity: Date.now(),
        } as any);
      }

      const subscribeDto: StreamSubscribeDto = {
        symbols: [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT],
        wsCapabilityType: API_OPERATIONS.STOCK_DATA.STREAM_QUOTE,
      };

      // Act & Assert
      await expect(
        service.subscribeStream(subscribeDto, "client1", "192.168.1.100"),
      ).rejects.toThrow("服务器连接数已达上限");
    });
  });

  describe("Memory Protection", () => {
    it("should have memory monitoring methods", () => {
      // Assert
      expect(service["initializeMemoryMonitoring"]).toBeDefined();
      expect(service["checkMemoryUsage"]).toBeDefined();
      expect(service["forceConnectionCleanup"]).toBeDefined();
      expect(service["recordMemoryAlert"]).toBeDefined();
    });

    it("should initialize memory monitoring on service start", () => {
      // Arrange
      const initializeSpy = jest.spyOn(
        service as any,
        "initializeMemoryMonitoring",
      );

      // Act
      service["initializeMemoryMonitoring"]();

      // Assert
      expect(service["memoryCheckTimer"]).toBeDefined();
    });

    it("should detect memory warning threshold", () => {
      // Arrange
      const originalMemoryUsage = process.memoryUsage;
      (process as any).memoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 600 * 1024 * 1024,
        heapUsed: 550 * 1024 * 1024, // 550MB - 超过500MB警告阈值
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      const loggerSpy = jest.spyOn(service["logger"], "warn");

      // Act
      service["checkMemoryUsage"]();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith("内存使用接近阈值", {
        heapUsed: 550 * 1024 * 1024,
        connections: expect.any(Number),
      });

      // 恢复原始方法
      process.memoryUsage = originalMemoryUsage;
    });

    it("should trigger memory critical threshold and force cleanup", () => {
      // Arrange
      const originalMemoryUsage = process.memoryUsage;
      (process as any).memoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 900 * 1024 * 1024,
        heapUsed: 850 * 1024 * 1024, // 850MB - 超过800MB临界阈值
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      // 添加测试连接
      const activeConnections = service["activeConnections"];
      for (let i = 0; i < 100; i++) {
        activeConnections.set(`connection_${i}`, {
          id: `conn_${i}`,
          lastActivity: Date.now() - i * 1000, // 不同的活跃时间
        } as any);
      }

      const initialConnectionCount = activeConnections.size;
      const loggerSpy = jest.spyOn(service["logger"], "error");
      const forceCleanupSpy = jest.spyOn(
        service as any,
        "forceConnectionCleanup",
      );

      // Act
      service["checkMemoryUsage"]();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith("内存使用超过临界阈值", {
        heapUsed: 850 * 1024 * 1024,
        connections: initialConnectionCount,
      });
      expect(forceCleanupSpy).toHaveBeenCalled();
      expect(activeConnections.size).toBeLessThan(initialConnectionCount);

      // 恢复原始方法
      process.memoryUsage = originalMemoryUsage;
    });

    it("should record memory alerts through CollectorService", () => {
      // Act
      service["recordMemoryAlert"]("warning", 550 * 1024 * 1024, 50);

      // Assert
      expect((mockCollectorService as any).eventBus.emit).toHaveBeenCalledWith(
        "ALERT_TRIGGERED",
        {
          timestamp: expect.any(Date),
          level: "warning",
          type: "memory_threshold_exceeded",
          message: "内存使用超过阈值",
          metadata: {
            heapUsed: 550 * 1024 * 1024,
            activeConnections: 50,
          },
        },
      );
    });

    it("should force cleanup least active connections first", () => {
      // Arrange
      const activeConnections = service["activeConnections"];
      const now = Date.now();

      // 添加不同活跃度的连接
      activeConnections.set("active_recent", {
        id: "recent",
        lastActivity: now - 1000,
      } as any);
      activeConnections.set("active_old", {
        id: "old",
        lastActivity: now - 10000,
      } as any);
      activeConnections.set("active_oldest", {
        id: "oldest",
        lastActivity: now - 20000,
      } as any);

      // Act
      service["forceConnectionCleanup"]();

      // Assert
      // 最久未活跃的连接应该被清理（10%清理率，至少清理1个）
      expect(activeConnections.has("active_oldest")).toBeFalsy();
      // 最近活跃的连接应该保留
      expect(activeConnections.has("active_recent")).toBeTruthy();
    });

    it("should cleanup memory monitoring timer in onModuleDestroy", () => {
      // Arrange
      service["initializeMemoryMonitoring"]();
      const timer = service["memoryCheckTimer"];
      expect(timer).toBeDefined();

      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      // Act
      service.onModuleDestroy();

      // Assert
      expect(clearIntervalSpy).toHaveBeenCalledWith(timer);
      expect(service["memoryCheckTimer"]).toBeUndefined();

      clearIntervalSpy.mockRestore();
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle both rate limiting and memory protection under stress", () => {
      // Arrange
      const checkRateLimitSpy = jest
        .spyOn(service as any, "checkConnectionRateLimit")
        .mockResolvedValue(true);

      // 模拟内存压力
      const originalMemoryUsage = process.memoryUsage;
      (process as any).memoryUsage = jest.fn().mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 900 * 1024 * 1024,
        heapUsed: 550 * 1024 * 1024, // 警告级别
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      // Act
      service["checkMemoryUsage"]();

      // Assert
      expect((mockCollectorService as any).eventBus.emit).toHaveBeenCalledWith(
        "ALERT_TRIGGERED",
        expect.objectContaining({
          level: "warning",
          type: "memory_threshold_exceeded",
        }),
      );

      // 恢复原始方法
      process.memoryUsage = originalMemoryUsage;
    });

    it("should maintain service availability when protections fail", async () => {
      // Arrange
      jest
        .spyOn(service as any, "checkConnectionRateLimit")
        .mockRejectedValue(new Error("Service unavailable"));

      const loggerSpy = jest.spyOn(service["logger"], "warn");

      // Act & Assert - Should not throw error during fail-open strategy
      try {
        await service["checkConnectionRateLimit"]("192.168.1.100");
      } catch (error) {
        // 应该捕获错误并使用fail-open策略
        expect(error.message).toBe("Service unavailable");
      }

      // Should use fail-open strategy (这个测试验证的是实际实现的行为)
      expect(loggerSpy).toHaveBeenCalledWith("连接频率检查失败，允许连接", {
        error: "Service unavailable",
      });
    });
  });

  describe("Configuration and Constants", () => {
    it("should have proper memory thresholds configured", () => {
      const stats = service["memoryUsageStats"];
      expect(stats.warningThreshold).toBe(500 * 1024 * 1024); // 500MB
      expect(stats.criticalThreshold).toBe(800 * 1024 * 1024); // 800MB
    });

    it("should have proper connection limits configured", () => {
      expect(service["MAX_CONNECTIONS"]).toBe(1000);
    });
  });
});

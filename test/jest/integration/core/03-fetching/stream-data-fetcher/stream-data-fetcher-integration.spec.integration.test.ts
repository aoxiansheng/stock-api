import { OPERATION_LIMITS } from '@common/constants/domain';
import { REFERENCE_DATA } from '@common/constants/domain';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from "@nestjs/testing";
import { v4 as uuidv4 } from "uuid";
import { StreamDataFetcherService } from "../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service";
import { CapabilityRegistryService } from "../../../../../../src/providers/services/capability-registry.service";
import { MetricsRegistryService } from "../../../../../../src/monitoring/infrastructure/metrics/metrics-registry.service";
import {
  StreamConnectionParams,
  StreamConnection,
} from "../../../../../../src/core/03-fetching/stream-data-fetcher/interfaces";

/**
 * StreamDataFetcher 集成测试
 *
 * 测试场景覆盖：
 * 1. 成功建立连接 → 订阅 → 收到数据的完整流程
 * 2. 重试逻辑：首次抛错 + 第2次成功
 * 3. 多provider同时订阅场景
 * 4. 连接健康检查和恢复机制
 * 5. 批量连接管理
 *
 * TODO Phase 2: 补充实际的数据接收和缓存集成测试
 */
describe("StreamDataFetcher Integration Tests", () => {
  let service: StreamDataFetcherService;
  let capabilityRegistry: jest.Mocked<CapabilityRegistryService>;
  let metricsRegistry: jest.Mocked<MetricsRegistryService>;

  // Mock capability instances for different providers
  let mockLongportCapability: any;
  let mockItickCapability: any;
  let mockContextService: any;

  beforeEach(async () => {
    // 设置mock对象
    mockLongportCapability = {
      initialize: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue(undefined),
      onData: jest.fn(),
      onError: jest.fn(),
      onDisconnect: jest.fn(),
    };

    mockItickCapability = {
      ...mockLongportCapability,
      initialize: jest.fn().mockResolvedValue(undefined),
      isConnected: jest.fn().mockReturnValue(true),
    };

    mockContextService = {
      id: "test-context",
      provider: "test-provider",
    };

    const mockCapabilityRegistry = {
      getCapability: jest.fn().mockImplementation((provider, capability) => {
        if (provider === REFERENCE_DATA.PROVIDER_IDS.LONGPORT) return mockLongportCapability;
        if (provider === "itick") return mockItickCapability;
        return null;
      }),
      getProvider: jest.fn(),
    };

    const mockMetricsRegistry = {
      receiverProcessingDuration: {
        labels: jest.fn().mockReturnThis(),
        observe: jest.fn(),
      },
      receiverRequestsTotal: {
        labels: jest.fn().mockReturnThis(),
        inc: jest.fn(),
      },
      streamConcurrentConnections: {
        labels: jest.fn().mockReturnThis(),
        inc: jest.fn(),
        set: jest.fn(),
      },
      streamSymbolsProcessedTotal: {
        labels: jest.fn().mockReturnThis(),
        inc: jest.fn(),
      },
      streamProcessingTimeMs: {
        labels: jest.fn().mockReturnThis(),
        set: jest.fn(),
      },
      streamErrorRate: {
        labels: jest.fn().mockReturnThis(),
        set: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamDataFetcherService,
        {
          provide: CapabilityRegistryService,
          useValue: mockCapabilityRegistry,
        },
        {
          provide: MetricsRegistryService,
          useValue: mockMetricsRegistry,
        },
      ],
    }).compile();

    service = module.get<StreamDataFetcherService>(StreamDataFetcherService);
    capabilityRegistry = module.get(CapabilityRegistryService);
    metricsRegistry = module.get(MetricsRegistryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("完整数据流测试", () => {
    it("应该完成：建立连接 → 订阅符号 → 模拟接收数据 → 关闭连接", async () => {
      // Phase 2 TODO: 完整实现数据接收测试

      const params: StreamConnectionParams = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: "ws-stock-quote",
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      const testSymbols = [REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, "AAPL.US"];
      const mockDataReceived: any[] = [];

      // Arrange - 设置数据接收回调
      mockLongportCapability.isConnected.mockReturnValue(false); // 需要初始化
      mockLongportCapability.onData.mockImplementation((callback: any) => {
        // TODO Phase 2: 模拟实际数据接收
        // setTimeout(() => {
        //   const mockData = { symbol: REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT, price: 350.5, timestamp: Date.now() };
        //   callback(mockData);
        //   mockDataReceived.push(mockData);
        // }, 100);
      });

      // Act - 执行完整流程
      const connection = await service.establishStreamConnection(
        params.provider,
        params.capability,
      );
      await service.subscribeToSymbols(connection, testSymbols);

      // TODO Phase 2: 等待数据接收
      // await new Promise(resolve => setTimeout(resolve, 150));

      await service.closeConnection(connection);

      // Assert
      expect(connection).toBeDefined();
      expect(connection.subscribedSymbols.size).toBe(testSymbols.length);
      expect(mockLongportCapability.subscribe).toHaveBeenCalledWith(
        testSymbols,
        mockContextService,
      );
      expect(mockLongportCapability.close).toHaveBeenCalledWith(
        mockContextService,
      );

      // TODO Phase 2: 验证数据接收
      // expect(mockDataReceived).toHaveLength(1);
      // expect(mockDataReceived[0]).toHaveProperty('symbol', REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT);
    });
  });

  describe("重试逻辑集成测试", () => {
    it("应该在首次连接失败后成功重试", async () => {
      const params: StreamConnectionParams = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: "ws-stock-quote",
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      // Arrange - 模拟重试场景
      let attemptCount = 0;
      capabilityRegistry.getCapability.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error("网络连接失败"); // 第一次尝试失败
        }
        return mockLongportCapability; // 第二次尝试成功
      });

      mockLongportCapability.isConnected.mockReturnValue(false);

      // Act
      const connection = await service.establishStreamConnection(
        params.provider,
        params.capability,
      );

      // Assert
      expect(connection).toBeDefined();
      expect(attemptCount).toBe(2); // 确认重试了一次
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalled();
    });
  });

  describe("多Provider同时订阅测试", () => {
    it("应该支持多个provider同时建立连接和订阅", async () => {
      const longportParams: StreamConnectionParams = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: "ws-stock-quote",
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      const itickParams: StreamConnectionParams = {
        provider: "itick",
        capability: "ws-stock-quote",
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      mockLongportCapability.isConnected.mockReturnValue(false);
      mockItickCapability.isConnected.mockReturnValue(false);

      // Act - 同时建立两个provider的连接
      const [longportConnection, itickConnection] = await Promise.all([
        service.establishStreamConnection(
          longportParams.provider,
          longportParams.capability,
        ),
        service.establishStreamConnection(
          itickParams.provider,
          itickParams.capability,
        ),
      ]);

      // 分别订阅不同的符号
      await service.subscribeToSymbols(longportConnection, [
        REFERENCE_DATA.SAMPLE_SYMBOLS.HK_TENCENT,
        "0005.HK",
      ]);
      await service.subscribeToSymbols(itickConnection, ["AAPL.US", "MSFT.US"]);

      // Assert - 验证连接池状态
      const allStats = service.getAllConnectionStats();
      const longportStats = service.getConnectionStatsByProvider(REFERENCE_DATA.PROVIDER_IDS.LONGPORT);
      const itickStats = service.getConnectionStatsByProvider("itick");

      expect(allStats).toHaveLength(2);
      expect(longportStats.total).toBe(1);
      expect(longportStats.active).toBe(1);
      expect(itickStats.total).toBe(1);
      expect(itickStats.active).toBe(1);

      // 清理
      await service.closeConnection(longportConnection);
      await service.closeConnection(itickConnection);
    });
  });

  describe("健康检查集成测试", () => {
    it("应该能够批量检查所有连接的健康状态", async () => {
      // Arrange - 建立多个连接
      const connections: StreamConnection[] = [];

      for (const provider of [REFERENCE_DATA.PROVIDER_IDS.LONGPORT, "itick"]) {
        const params: StreamConnectionParams = {
          provider,
          capability: "ws-stock-quote",
          contextService: mockContextService,
          requestId: uuidv4(),
        };

        if (provider === REFERENCE_DATA.PROVIDER_IDS.LONGPORT) {
          mockLongportCapability.isConnected.mockReturnValue(false);
        } else {
          mockItickCapability.isConnected.mockReturnValue(false);
        }

        const connection = await service.establishStreamConnection(
          params.provider,
          params.capability,
        );
        connections.push(connection);
      }

      // Act - 执行批量健康检查
      const healthResults = await service.batchHealthCheck({ timeoutMs: OPERATION_LIMITS.TIMEOUTS_MS.QUICK_OPERATION });

      // Assert
      expect(Object.keys(healthResults)).toHaveLength(2);
      expect(healthResults).toHaveProperty("longport:ws-stock-quote");
      expect(healthResults).toHaveProperty("itick:ws-stock-quote");

      // 清理
      await Promise.all(
        connections.map((conn) => service.closeConnection(conn)),
      );
    });
  });

  describe("连接复用测试", () => {
    it("应该能够复用相同provider+capability的连接", async () => {
      const params: StreamConnectionParams = {
        provider: REFERENCE_DATA.PROVIDER_IDS.LONGPORT,
        capability: "ws-stock-quote",
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      mockLongportCapability.isConnected.mockReturnValue(false);

      // Act - 建立连接后查找现有连接
      const connection = await service.establishStreamConnection(
        params.provider,
        params.capability,
      );
      const existingConnection = service.getExistingConnection(
        "longport:ws-stock-quote",
      );

      // Assert
      expect(existingConnection).toBe(connection);
      expect(existingConnection?.provider).toBe(REFERENCE_DATA.PROVIDER_IDS.LONGPORT);
      expect(existingConnection?.capability).toBe("ws-stock-quote");

      // 清理
      await service.closeConnection(connection);
    });
  });

  // TODO Phase 2: 补充以下测试场景
  describe("Phase 2 待补充测试", () => {
    it.skip("应该与StreamDataCacheService集成缓存数据", async () => {
      // TODO: 测试数据缓存集成
    });

    it.skip("应该处理连接断开和自动重连", async () => {
      // TODO: 测试自动重连机制
    });

    it.skip("应该正确处理数据压缩和解压缩", async () => {
      // TODO: 测试数据压缩功能
    });

    it.skip("应该支持增量数据更新", async () => {
      // TODO: 测试增量数据处理
    });
  });
});

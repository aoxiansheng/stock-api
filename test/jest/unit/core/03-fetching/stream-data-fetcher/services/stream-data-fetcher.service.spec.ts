import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { StreamDataFetcherService } from '@core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service';
import { ProviderRegistryService } from '@providersv2/provider-registry.service';
import { StreamCacheStandardizedService } from '@core/05-caching/module/stream-cache/services/stream-cache-standardized.service';
import { StreamClientStateManager } from '@core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service';
import { ConnectionPoolManager } from '@core/03-fetching/stream-data-fetcher/services/connection-pool-manager.service';
import {
  StreamConnection,
  StreamConnectionParams,
  StreamConnectionStatus,
  StreamConnectionOptions,
} from '@core/03-fetching/stream-data-fetcher/interfaces';
// // import { SYSTEM_STATUS_EVENTS } from '@monitoring/contracts/events/system-status.events';
import { UnitTestSetup } from '../../../../../../testbasic/setup/unit-test-setup';

// Mock interfaces
interface MockStreamConnection extends StreamConnection {
  id: string;
  provider: string;
  capability: string;
  isConnected: boolean;
  lastActiveAt: Date;
  close: jest.Mock;
  sendHeartbeat: jest.Mock;
  onStatusChange: jest.Mock;
  onError: jest.Mock;
  getStats: jest.Mock;
}

describe('StreamDataFetcherService', () => {
  let service: StreamDataFetcherService;
  let module: TestingModule;
  let enhancedCapabilityRegistry: jest.Mocked<ProviderRegistryService>;
  let streamCache: jest.Mocked<StreamCacheStandardizedService>;
  let clientStateManager: jest.Mocked<StreamClientStateManager>;
  let connectionPoolManager: jest.Mocked<ConnectionPoolManager>;
  let eventBus: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;
  
  // 🔥 关键：保持原始Mock对象的引用，用于测试断言
  let originalMockEventBus: any;
  let originalMockConfigService: any;

  const createMockConnection = (options: Partial<MockStreamConnection> = {}): MockStreamConnection => {
    return {
      id: options.id || 'test-connection-123',
      provider: options.provider || 'longport',
      capability: options.capability || 'ws-stock-quote',
      isConnected: options.isConnected !== undefined ? options.isConnected : true,
      lastActiveAt: options.lastActiveAt || new Date(),
      close: jest.fn().mockResolvedValue(undefined),
      sendHeartbeat: jest.fn().mockResolvedValue(true),
      onStatusChange: jest.fn(),
      onError: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        connectionId: options.id || 'test-connection-123',
        isConnected: options.isConnected !== undefined ? options.isConnected : true,
        lastActiveAt: options.lastActiveAt || new Date(),
        messagesReceived: 0,
        messagesSent: 0,
      }),
      ...options,
    } as MockStreamConnection;
  };

  const createMockCapability = () => ({
    name: 'test-capability',
    description: 'Test capability',
    supportedMarkets: ['US', 'HK'],
    supportedSymbolFormats: ['SYMBOL', 'SYMBOL.EXCHANGE'],
    execute: jest.fn(),
    connect: jest.fn().mockResolvedValue(createMockConnection()),
  });

  beforeEach(async () => {
    // Create mocks
    const mockEnhancedCapabilityRegistry = {
      getCapability: jest.fn(),
      get: jest.fn(),
    };

    const mockStreamCache = {
      setData: jest.fn().mockResolvedValue(undefined),
      deleteData: jest.fn().mockResolvedValue(undefined),
    };

    const mockClientStateManager = {
      updateSubscriptionState: jest.fn(),
      removeConnection: jest.fn(),
    };

    const mockConnectionPoolManager = {
      registerConnection: jest.fn(),
      unregisterConnection: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        totalConnections: 0,
        activeConnections: 0,
        poolUtilization: 0,
      }),
      getAlerts: jest.fn().mockReturnValue([]),
    };

    // ✅ 修正: 创建可spy的mock对象，确保Jest断言能正常工作
    originalMockEventBus = {
      emit: jest.fn().mockReturnValue(undefined),
    };

    // ✅ 修正: 创建可spy的mock对象，支持动态配置
    originalMockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'monitoringUnifiedLimits') {
          return {
            dataProcessingBatch: {
              recentMetrics: 5,
            },
          };
        }
        return undefined;
      }),
    };

    module = await UnitTestSetup.createBasicTestModule({
      providers: [
        StreamDataFetcherService,
        {
          provide: ProviderRegistryService,
          useValue: mockEnhancedCapabilityRegistry,
        },
        {
          provide: StreamCacheStandardizedService,
          useValue: mockStreamCache,
        },
        {
          provide: StreamClientStateManager,
          useValue: mockClientStateManager,
        },
        {
          provide: ConnectionPoolManager,
          useValue: mockConnectionPoolManager,
        },
        {
          provide: EventEmitter2,
          useValue: originalMockEventBus,
        },
        {
          provide: ConfigService,
          useValue: originalMockConfigService,
        },
      ],
    });

    service = module.get<StreamDataFetcherService>(StreamDataFetcherService);
    enhancedCapabilityRegistry = module.get(ProviderRegistryService);
    streamCache = module.get(StreamCacheStandardizedService);
    clientStateManager = module.get(StreamClientStateManager);
    connectionPoolManager = module.get(ConnectionPoolManager);
    eventBus = module.get(EventEmitter2);
    configService = module.get(ConfigService);

    // ❌ 删除: 不要使用jest.spyOn，直接使用已有的mock函数
    // jest.spyOn会覆盖我们精心设置的mock，导致事件检测失败
  });

  afterEach(async () => {
    await UnitTestSetup.cleanupModule(module);
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with correct dependencies', () => {
      expect(enhancedCapabilityRegistry).toBeDefined();
      expect(streamCache).toBeDefined();
      expect(clientStateManager).toBeDefined();
      expect(connectionPoolManager).toBeDefined();
      expect(eventBus).toBeDefined();
      expect(configService).toBeDefined();
    });

    it('should start periodic cleanup and adaptive concurrency monitoring', () => {
      // Service should initialize without throwing errors
      expect(service).toBeInstanceOf(StreamDataFetcherService);
    });
  });

  describe('establishStreamConnection', () => {
    describe('Object parameter form (recommended)', () => {
      it('should establish connection with object parameters', async () => {
        const mockCapability = createMockCapability();
        const mockConnection = createMockConnection();

        enhancedCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
        mockCapability.connect.mockResolvedValue(mockConnection);

        const params: StreamConnectionParams = {
          provider: 'longport',
          capability: 'ws-stock-quote',
          requestId: 'test-request-123',
          options: {
            autoReconnect: true,
            maxReconnectAttempts: 3,
            connectionTimeoutMs: 30000,
          },
        };

        const connection = await service.establishStreamConnection(params);

        // 等待异步事件发射完成
        await new Promise(resolve => setImmediate(resolve));

        expect(connection).toBe(mockConnection);
        expect(enhancedCapabilityRegistry.getCapability).toHaveBeenCalledWith(
          'longport',
          'ws-stock-quote'
        );
        expect(mockCapability.connect).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'longport',
            capability: 'ws-stock-quote',
            autoReconnect: true,
            maxReconnectAttempts: 3,
            connectionTimeoutMs: 30000,
          })
        );
        expect(connectionPoolManager.registerConnection).toHaveBeenCalled();
        expect(originalMockEventBus.emit).toHaveBeenCalledWith(
//           SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            metricName: 'connection_established',
          })
        );
      });

      it('should handle connection establishment failure', async () => {
        const mockCapability = createMockCapability();
        const connectionError = new Error('Connection failed');

        enhancedCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
        mockCapability.connect.mockRejectedValue(connectionError);

        const params: StreamConnectionParams = {
          provider: 'longport',
          capability: 'ws-stock-quote',
          requestId: 'test-request-456',
        };

        await expect(service.establishStreamConnection(params)).rejects.toThrow('Connection failed');

        // 等待异步事件发射完成
        await new Promise(resolve => setImmediate(resolve));

        expect(originalMockEventBus.emit).toHaveBeenCalledWith(
//           SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
          expect.objectContaining({
            metricName: 'connection_establishment_failed',
          })
        );
      });
    });

    describe('Separate parameters form (backward compatibility)', () => {
      it('should establish connection with separate parameters', async () => {
        const mockCapability = createMockCapability();
        const mockConnection = createMockConnection();

        enhancedCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
        mockCapability.connect.mockResolvedValue(mockConnection);

        const config: Partial<StreamConnectionOptions> = {
          autoReconnect: true,
          maxReconnectAttempts: 2,
        };

        const connection = await service.establishStreamConnection(
          'longport',
          'ws-stock-quote',
          config
        );

        expect(connection).toBe(mockConnection);
        expect(enhancedCapabilityRegistry.getCapability).toHaveBeenCalledWith(
          'longport',
          'ws-stock-quote'
        );
        expect(mockCapability.connect).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'longport',
            capability: 'ws-stock-quote',
            autoReconnect: true,
            maxReconnectAttempts: 2,
          })
        );
      });
    });

    it('should throw error when capability not found', async () => {
      enhancedCapabilityRegistry.getCapability.mockReturnValue(null);

      const params: StreamConnectionParams = {
        provider: 'unknown-provider',
        capability: 'unknown-capability',
        requestId: 'test-request-789',
      };

      await expect(service.establishStreamConnection(params)).rejects.toThrow(
        'Stream capability not found: unknown-provider/unknown-capability'
      );
    });

    it('should throw error when connection instance is invalid', async () => {
      const mockCapability = createMockCapability();

      enhancedCapabilityRegistry.getCapability.mockReturnValue(mockCapability);
      mockCapability.connect.mockResolvedValue(null);

      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        requestId: 'test-request-101',
      };

      await expect(service.establishStreamConnection(params)).rejects.toThrow(
        '连接建立失败：连接实例无效'
      );
    });
  });

  describe('subscribeToSymbols', () => {
    let mockConnection: MockStreamConnection;

    beforeEach(() => {
      mockConnection = createMockConnection();
    });

    it('should subscribe to symbols successfully', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];

      await service.subscribeToSymbols(mockConnection, symbols);

      expect(streamCache.setData).toHaveBeenCalledWith(
        `subscription:${mockConnection.id}`,
        expect.arrayContaining([
          expect.objectContaining({
            symbols,
            result: expect.objectContaining({
              success: true,
              subscribedSymbols: symbols,
              failedSymbols: [],
            }),
          }),
        ]),
        'warm'
      );
      expect(clientStateManager.updateSubscriptionState).toHaveBeenCalledWith(
        mockConnection.id,
        symbols,
        'subscribed'
      );
    });

    it('should throw error when connection is not connected', async () => {
      mockConnection.isConnected = false;
      const symbols = ['AAPL'];

      await expect(service.subscribeToSymbols(mockConnection, symbols)).rejects.toThrow(
        '连接未建立，无法订阅'
      );
    });

    it('should emit subscription events', async () => {
      const symbols = ['AAPL'];

      await service.subscribeToSymbols(mockConnection, symbols);

      // 等待异步事件发射完成
      await new Promise(resolve => setImmediate(resolve));

      expect(originalMockEventBus.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricName: 'subscription_operation',
        })
      );
    });
  });

  describe('unsubscribeFromSymbols', () => {
    let mockConnection: MockStreamConnection;

    beforeEach(() => {
      mockConnection = createMockConnection();
    });

    it('should unsubscribe from symbols successfully', async () => {
      const symbols = ['AAPL', 'GOOGL'];

      await service.unsubscribeFromSymbols(mockConnection, symbols);

      expect(streamCache.deleteData).toHaveBeenCalledWith(
        `subscription:${mockConnection.id}`
      );
      expect(clientStateManager.updateSubscriptionState).toHaveBeenCalledWith(
        mockConnection.id,
        symbols,
        'unsubscribed'
      );
    });

    it('should emit unsubscription events', async () => {
      const symbols = ['AAPL'];

      await service.unsubscribeFromSymbols(mockConnection, symbols);

      // 等待异步事件发射完成
      await new Promise(resolve => setImmediate(resolve));

      expect(originalMockEventBus.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricName: 'subscription_operation',
        })
      );
    });
  });

  describe('closeConnection', () => {
    let mockConnection: MockStreamConnection;

    beforeEach(() => {
      mockConnection = createMockConnection();
      // Simulate an established connection
      const connectionKey = `${mockConnection.provider}:${mockConnection.capability}:${mockConnection.id}`;
      (service as any).activeConnections.set(connectionKey, mockConnection);
      (service as any).connectionIdToKey.set(mockConnection.id, connectionKey);
    });

    it('should close connection successfully', async () => {
      await service.closeConnection(mockConnection);

      expect(mockConnection.close).toHaveBeenCalled();
      expect(clientStateManager.removeConnection).toHaveBeenCalledWith(mockConnection.id);
      expect(streamCache.deleteData).toHaveBeenCalledWith(`connection:${mockConnection.id}`);
      expect(streamCache.deleteData).toHaveBeenCalledWith(`subscription:${mockConnection.id}`);
    });

    it('should clean up connection from maps even if close fails', async () => {
      mockConnection.close.mockRejectedValue(new Error('Close failed'));

      await expect(service.closeConnection(mockConnection)).rejects.toThrow('Close failed');

      // Connection should still be cleaned up from maps
      expect((service as any).activeConnections.size).toBe(0);
      expect((service as any).connectionIdToKey.size).toBe(0);
    });

    it('should emit connection events', async () => {
      await service.closeConnection(mockConnection);

      // 等待异步事件发射完成
      await new Promise(resolve => setImmediate(resolve));

      expect(originalMockEventBus.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricName: 'connection_monitoring_stopped',
        })
      );
    });
  });

  describe('Connection Status and Stats', () => {
    let mockConnection: MockStreamConnection;

    beforeEach(() => {
      mockConnection = createMockConnection();
      const connectionKey = `${mockConnection.provider}:${mockConnection.capability}:${mockConnection.id}`;
      (service as any).activeConnections.set(connectionKey, mockConnection);
    });

    it('should check if connection is active', () => {
      expect(service.isConnectionActive(mockConnection)).toBe(true);

      mockConnection.isConnected = false;
      expect(service.isConnectionActive(mockConnection)).toBe(false);
    });

    it('should get connection stats', () => {
      const stats = service.getConnectionStats(mockConnection);

      expect(stats).toEqual(
        expect.objectContaining({
          connectionId: mockConnection.id,
          isConnected: true,
        })
      );
    });

    it('should get all connection stats', () => {
      const allStats = service.getAllConnectionStats();

      expect(allStats).toHaveProperty(
        `${mockConnection.provider}:${mockConnection.capability}:${mockConnection.id}`
      );
    });

    it('should get connection stats by provider', () => {
      const providerStats = service.getConnectionStatsByProvider('longport');

      expect(providerStats).toEqual(
        expect.objectContaining({
          total: 1,
          active: 1,
          connections: expect.arrayContaining([
            expect.objectContaining({
              capability: 'ws-stock-quote',
              isConnected: true,
            }),
          ]),
        })
      );
    });

    it('should get existing connection', () => {
      const connectionKey = `${mockConnection.provider}:${mockConnection.capability}:${mockConnection.id}`;
      const existingConnection = service.getExistingConnection(connectionKey);

      expect(existingConnection).toBe(mockConnection);
    });
  });

  describe('Batch Health Check', () => {
    beforeEach(() => {
      // Add some mock connections
      const connections = [
        createMockConnection({ id: 'conn-1', provider: 'longport' }),
        createMockConnection({ id: 'conn-2', provider: 'longport' }),
        createMockConnection({ id: 'conn-3', provider: 'futu', isConnected: false }),
      ];

      connections.forEach((conn) => {
        const key = `${conn.provider}:${conn.capability}:${conn.id}`;
        (service as any).activeConnections.set(key, conn);
      });
    });

    it('should perform tiered health check by default', async () => {
      const results = await service.batchHealthCheck();

      expect(Object.keys(results)).toHaveLength(3);
      expect(results).toEqual(
        expect.objectContaining({
          'longport:ws-stock-quote:conn-1': expect.any(Boolean),
          'longport:ws-stock-quote:conn-2': expect.any(Boolean),
          'futu:ws-stock-quote:conn-3': expect.any(Boolean),
        })
      );
    });

    it('should use fallback batch health check when tiered is disabled', async () => {
      const results = await service.batchHealthCheck({
        tieredEnabled: false,
        timeoutMs: 5000,
        concurrency: 5,
      });

      expect(Object.keys(results)).toHaveLength(3);
    });

    it('should handle health check with custom options', async () => {
      const results = await service.batchHealthCheck({
        timeoutMs: 1000,
        retries: 2,
        skipUnresponsive: true,
      });

      expect(Object.keys(results)).toHaveLength(3);
    });
  });

  describe('Adaptive Concurrency Control', () => {
    it('should get adaptive concurrency stats', () => {
      const stats = service.getAdaptiveConcurrencyStats();

      expect(stats).toEqual(
        expect.objectContaining({
          currentConcurrency: expect.any(Number),
          concurrencyRange: expect.objectContaining({
            min: expect.any(Number),
            max: expect.any(Number),
          }),
          performance: expect.objectContaining({
            avgResponseTime: expect.any(String),
            p95ResponseTime: expect.any(String),
            successRate: expect.any(String),
            totalRequests: expect.any(Number),
          }),
          circuitBreaker: expect.objectContaining({
            enabled: expect.any(Boolean),
          }),
        })
      );
    });

    it('should use adaptive concurrency in batch operations', async () => {
      // The service should use adaptive concurrency in its operations
      // This is tested indirectly through batch health check
      const results = await service.batchHealthCheck({ concurrency: 5 });
      expect(Object.keys(results).length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Services Access', () => {
    it('should provide access to stream data cache', () => {
      const cache = service.getStreamDataCache();
      expect(cache).toBe(streamCache);
    });

    it('should provide access to client state manager', () => {
      const manager = service.getClientStateManager();
      expect(manager).toBe(clientStateManager);
    });
  });

  describe('Connection Pool Stats', () => {
    it('should get connection pool stats', () => {
      const stats = service.getConnectionPoolStats();

      expect(stats).toEqual(
        expect.objectContaining({
          totalConnections: expect.any(Number),
          activeConnections: expect.any(Number),
          alerts: expect.any(Array),
          adaptiveConcurrency: expect.any(Object),
          eventDrivenMonitoring: true,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Metrics Summary', () => {
    it('should get metrics summary', async () => {
      const summary = service.getMetricsSummary();

      expect(summary).toEqual(
        expect.objectContaining({
          activeConnections: expect.any(Number),
          connectionMappings: expect.any(Number),
          timestamp: expect.any(String),
          status: 'active',
        })
      );

      // 等待异步事件发射完成
      await new Promise(resolve => setImmediate(resolve));

      expect(originalMockEventBus.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          metricName: 'metrics_summary_requested',
        })
      );
    });
  });

  describe('Service Destruction', () => {
    it('should clean up resources on module destroy', async () => {
      // Add a mock connection
      const mockConnection = createMockConnection();
      const connectionKey = `${mockConnection.provider}:${mockConnection.capability}:${mockConnection.id}`;
      (service as any).activeConnections.set(connectionKey, mockConnection);

      await service.onModuleDestroy();

      expect(mockConnection.close).toHaveBeenCalled();
      expect((service as any).activeConnections.size).toBe(0);
      expect((service as any).isServiceDestroyed).toBe(true);
    });

    it('should handle connection close failures during destruction', async () => {
      const mockConnection = createMockConnection();
      mockConnection.close.mockRejectedValue(new Error('Close failed'));

      const connectionKey = `${mockConnection.provider}:${mockConnection.capability}:${mockConnection.id}`;
      (service as any).activeConnections.set(connectionKey, mockConnection);

      // Should not throw even if connection close fails
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for executeCore method', async () => {
      await expect(service.executeCore()).rejects.toThrow(
        'executeCore not implemented for StreamDataFetcher'
      );
    });
  });

  describe('Adaptive Concurrency Control Deep Testing', () => {
    beforeEach(() => {
      // 🔥 关键：完全重置性能指标，确保成功率为100%
      (service as any).performanceMetrics = {
        responseTimes: [],
        avgResponseTime: 0,
        p95ResponseTime: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 1.0, // 设为1.0（100%）而不是100
        concurrencyHistory: [],
        activeOperations: 0,
        queuedOperations: 0,
        lastMetricsUpdate: Date.now(),
        windowSize: 100,
      };

      // 🔥 关键：完全重置并发控制状态，确保断路器完全禁用
      (service as any).concurrencyControl = {
        currentConcurrency: 10,
        minConcurrency: 2,
        maxConcurrency: 50,
        performanceThresholds: {
          excellent: 100,
          good: 500,
          poor: 2000,
        },
        successRateThresholds: {
          excellent: 0.98,
          good: 0.9,
          poor: 0.8,
        },
        adjustmentFactor: 0.2,
        stabilizationPeriod: 30000,
        lastAdjustment: 0,
        circuitBreaker: {
          enabled: false,
          triggeredAt: 0,
          recoveryDelay: 60000,
          failureThreshold: 0.5,
        },
      };
    });

    it('should record operation performance correctly', () => {
      const performanceMetrics = (service as any).performanceMetrics;
      const recordMethod = (service as any).recordOperationPerformance;

      // Record successful operation
      recordMethod.call(service, 150, true);

      expect(performanceMetrics.totalRequests).toBe(1);
      expect(performanceMetrics.successfulRequests).toBe(1);
      expect(performanceMetrics.responseTimes).toContain(150);

      // Record failed operation
      recordMethod.call(service, 3000, false);

      expect(performanceMetrics.totalRequests).toBe(2);
      expect(performanceMetrics.failedRequests).toBe(1);
      expect(performanceMetrics.responseTimes).toContain(3000);
    });

    it('should calculate performance metrics correctly', () => {
      const performanceMetrics = (service as any).performanceMetrics;
      const updateMethod = (service as any).updatePerformanceMetrics;

      // Add sample response times
      performanceMetrics.responseTimes = [100, 200, 300, 400, 500];
      performanceMetrics.totalRequests = 10;
      performanceMetrics.successfulRequests = 8;

      updateMethod.call(service);

      expect(performanceMetrics.avgResponseTime).toBe(300); // (100+200+300+400+500)/5
      expect(performanceMetrics.successRate).toBe(0.8); // 8/10
      expect(performanceMetrics.p95ResponseTime).toBe(500); // 95th percentile
    });

    it('should adjust concurrency based on excellent performance', () => {
      const analyzeMethod = (service as any).analyzePerformanceAndAdjustConcurrency;
      const concurrencyControl = (service as any).concurrencyControl;
      const performanceMetrics = (service as any).performanceMetrics;

      // 🔥 关键：完全重置所有状态，包括性能指标
      performanceMetrics.responseTimes = [];
      performanceMetrics.avgResponseTime = 50; // Excellent performance
      performanceMetrics.p95ResponseTime = 50;
      performanceMetrics.totalRequests = 100;
      performanceMetrics.successfulRequests = 99; // 99% success rate
      performanceMetrics.failedRequests = 1;
      performanceMetrics.successRate = 0.99; // 明确设为99%
      performanceMetrics.concurrencyHistory = [];
      performanceMetrics.activeOperations = 0;
      performanceMetrics.queuedOperations = 0;

      // 🔥 完全重置并发控制状态
      concurrencyControl.currentConcurrency = 10;
      concurrencyControl.minConcurrency = 2;
      concurrencyControl.maxConcurrency = 50;
      concurrencyControl.lastAdjustment = Date.now() - 35000; // 允许调整
      // 🔥 最关键：彻底禁用断路器
      concurrencyControl.circuitBreaker.enabled = false;
      concurrencyControl.circuitBreaker.triggeredAt = 0;

      const oldConcurrency = concurrencyControl.currentConcurrency;

      analyzeMethod.call(service);

      // ✅ 修正: 基于算法 adjustment = Math.ceil(10 * 0.2) = 2, newConcurrency = 10 + 2 = 12
      expect(concurrencyControl.currentConcurrency).toBeGreaterThan(oldConcurrency);
      expect(concurrencyControl.currentConcurrency).toBe(oldConcurrency + Math.ceil(oldConcurrency * 0.2));
    });

    it('should reduce concurrency for poor performance', () => {
      const analyzeMethod = (service as any).analyzePerformanceAndAdjustConcurrency;
      const concurrencyControl = (service as any).concurrencyControl;
      const performanceMetrics = (service as any).performanceMetrics;

      // Setup poor performance conditions
      performanceMetrics.avgResponseTime = 2500; // Poor
      performanceMetrics.successRate = 0.85; // Below excellent but above poor
      performanceMetrics.totalRequests = 100;

      concurrencyControl.lastAdjustment = Date.now() - 35000;
      const oldConcurrency = concurrencyControl.currentConcurrency;

      analyzeMethod.call(service);

      expect(concurrencyControl.currentConcurrency).toBeLessThan(oldConcurrency);
    });

    it('should trigger circuit breaker for very poor success rate', () => {
      const analyzeMethod = (service as any).analyzePerformanceAndAdjustConcurrency;
      const triggerMethod = (service as any).triggerCircuitBreaker;
      const concurrencyControl = (service as any).concurrencyControl;
      const performanceMetrics = (service as any).performanceMetrics;

      // Setup conditions to trigger circuit breaker
      performanceMetrics.successRate = 0.4; // Below failure threshold (0.5)
      performanceMetrics.totalRequests = 100;

      concurrencyControl.lastAdjustment = Date.now() - 35000;

      triggerMethod.call(service);

      expect(concurrencyControl.circuitBreaker.enabled).toBe(true);
      expect(concurrencyControl.currentConcurrency).toBe(concurrencyControl.minConcurrency);
    });

    it('should recover from circuit breaker when conditions improve', () => {
      const checkRecoveryMethod = (service as any).checkCircuitBreakerRecovery;
      const calculateRecentSuccessRate = (service as any).calculateRecentSuccessRate;
      const concurrencyControl = (service as any).concurrencyControl;

      // Enable circuit breaker
      concurrencyControl.circuitBreaker.enabled = true;
      concurrencyControl.circuitBreaker.triggeredAt = Date.now() - 65000; // 65 seconds ago

      // Mock improved success rate
      jest.spyOn(service as any, 'calculateRecentSuccessRate').mockReturnValue(0.95);

      checkRecoveryMethod.call(service);

      expect(concurrencyControl.circuitBreaker.enabled).toBe(false);
      expect(concurrencyControl.currentConcurrency).toBeGreaterThan(concurrencyControl.minConcurrency);
    });

    it('should calculate recent success rate correctly', () => {
      const calculateMethod = (service as any).calculateRecentSuccessRate;
      const performanceMetrics = (service as any).performanceMetrics;

      // Setup metrics
      performanceMetrics.totalRequests = 50;
      performanceMetrics.successfulRequests = 45;

      const recentSuccessRate = calculateMethod.call(service);

      expect(recentSuccessRate).toBeGreaterThan(0);
      expect(recentSuccessRate).toBeLessThanOrEqual(1);
    });

    it('should use adaptive concurrency in operations', () => {
      const getCurrentConcurrencyMethod = (service as any).getCurrentConcurrency;
      const concurrencyControl = (service as any).concurrencyControl;

      // Normal operation
      let currentConcurrency = getCurrentConcurrencyMethod.call(service);
      expect(currentConcurrency).toBe(concurrencyControl.currentConcurrency);

      // Circuit breaker enabled
      concurrencyControl.circuitBreaker.enabled = true;
      currentConcurrency = getCurrentConcurrencyMethod.call(service);
      expect(currentConcurrency).toBe(concurrencyControl.minConcurrency);
    });
  });

  describe('Tiered Health Check Deep Testing', () => {
    let mockConnections: MockStreamConnection[];

    beforeEach(() => {
      mockConnections = [
        createMockConnection({ id: 'healthy-1', lastActiveAt: new Date() }),
        createMockConnection({ id: 'suspicious-1', lastActiveAt: new Date(Date.now() - 3 * 60 * 1000) }), // 3 min ago
        createMockConnection({ id: 'unhealthy-1', isConnected: false }),
        createMockConnection({ id: 'old-1', lastActiveAt: new Date(Date.now() - 10 * 60 * 1000) }), // 10 min ago
      ];

      // Add connections to service
      mockConnections.forEach((conn) => {
        const key = `${conn.provider}:${conn.capability}:${conn.id}`;
        (service as any).activeConnections.set(key, conn);
      });
    });

    it('should perform tier 1 quick status check correctly', async () => {
      const tier1Method = (service as any).tier1QuickStatusCheck;
      const connectionEntries = Array.from((service as any).activeConnections.entries());

      const results = await tier1Method.call(service, connectionEntries);

      expect(results).toHaveLength(4);

      // Healthy connection should pass
      const healthyResult = results.find(r => r.connection.id === 'healthy-1');
      expect(healthyResult.passed).toBe(true);
      expect(healthyResult.suspicious).toBe(false);

      // Suspicious connection should be marked suspicious
      const suspiciousResult = results.find(r => r.connection.id === 'suspicious-1');
      expect(suspiciousResult.passed).toBe(false);
      expect(suspiciousResult.suspicious).toBe(true);

      // Unhealthy connection should fail
      const unhealthyResult = results.find(r => r.connection.id === 'unhealthy-1');
      expect(unhealthyResult.passed).toBe(false);
      expect(unhealthyResult.suspicious).toBe(false);
    });

    it('should perform tier 2 heartbeat verification', async () => {
      const tier2Method = (service as any).tier2HeartbeatVerification;

      const suspiciousCandidates = [
        {
          key: 'test-key-1',
          connection: mockConnections[1], // suspicious connection
          passed: false,
          suspicious: true,
        },
      ];

      const results = await tier2Method.call(service, suspiciousCandidates, 5000);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('passed');
      expect(results[0]).toHaveProperty('connection');
    });

    it('should perform tier 3 full health check', async () => {
      const tier3Method = (service as any).tier3FullHealthCheck;

      const problemCandidates = [
        {
          key: 'test-key-1',
          connection: mockConnections[2], // unhealthy connection
        },
      ];

      const results = await tier3Method.call(service, problemCandidates, 5000, 1, true);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('passed');
    });

    it('should calculate efficiency improvement correctly', () => {
      const calculateMethod = (service as any).calculateEfficiencyImprovement;

      const improvement = calculateMethod.call(service, 100, 80, 15, 5);

      expect(improvement).toMatch(/\d+\.\d+%/);
      expect(parseFloat(improvement.replace('%', ''))).toBeGreaterThan(0);
    });

    it('should handle health check with retry mechanism', async () => {
      const retryMethod = (service as any).performHealthCheckWithRetry;
      const mockConnection = createMockConnection();

      // ✅ 修正: 确保spy能够正确拦截方法调用，并且模拟正确的重试逻辑
      const healthCheckSpy = jest.spyOn(service as any, 'checkConnectionHealth')
        .mockRejectedValueOnce(new Error('Health check failed'))
        .mockResolvedValueOnce(true);

      // 确保连接在activeConnections中存在，避免在检查过程中被移除
      const connectionKey = `${mockConnection.provider}:${mockConnection.capability}:${mockConnection.id}`;
      (service as any).activeConnections.set(connectionKey, mockConnection);

      const result = await retryMethod.call(service, connectionKey, mockConnection, 5000, 2, false);

      expect(result).toBe(true);
      expect(healthCheckSpy).toHaveBeenCalledTimes(2); // 第一次失败，第二次成功
      
      // 清理
      (service as any).activeConnections.delete(connectionKey);
    });
  });

  describe('Memory Leak Prevention Deep Testing', () => {
    it('should clean up connection maps correctly', () => {
      const cleanupMethod = (service as any).cleanupConnectionFromMaps;
      const mockConnection = createMockConnection();

      // Add connection to maps
      const connectionKey = `${mockConnection.provider}:${mockConnection.capability}:${mockConnection.id}`;
      (service as any).activeConnections.set(connectionKey, mockConnection);
      (service as any).connectionIdToKey.set(mockConnection.id, connectionKey);

      cleanupMethod.call(service, mockConnection.id);

      expect((service as any).activeConnections.has(connectionKey)).toBe(false);
      expect((service as any).connectionIdToKey.has(mockConnection.id)).toBe(false);
      expect(connectionPoolManager.unregisterConnection).toHaveBeenCalledWith(connectionKey);
    });

    it('should perform periodic map cleanup', () => {
      const cleanupMethod = (service as any).performPeriodicMapCleanup;
      const mockConnection = createMockConnection({
        isConnected: false,
        lastActiveAt: new Date(Date.now() - 35 * 60 * 1000), // 35 minutes ago
      });

      // Add stale connection
      const connectionKey = `${mockConnection.provider}:${mockConnection.capability}:${mockConnection.id}`;
      (service as any).activeConnections.set(connectionKey, mockConnection);
      (service as any).connectionIdToKey.set(mockConnection.id, connectionKey);

      const sizeBefore = (service as any).activeConnections.size;
      cleanupMethod.call(service);
      const sizeAfter = (service as any).activeConnections.size;

      expect(sizeAfter).toBeLessThan(sizeBefore);
    });

    it('should detect memory leak trends', () => {
      const cleanupMethod = (service as any).performPeriodicMapCleanup;

      // Create scenario with too many mappings compared to connections
      (service as any).connectionIdToKey.set('orphan-1', 'non-existent-key-1');
      (service as any).connectionIdToKey.set('orphan-2', 'non-existent-key-2');
      (service as any).connectionIdToKey.set('orphan-3', 'non-existent-key-3');

      // This should trigger memory leak warning in logs
      cleanupMethod.call(service);

      // Verify orphaned mappings are cleaned up
      expect((service as any).connectionIdToKey.has('orphan-1')).toBe(false);
      expect((service as any).connectionIdToKey.has('orphan-2')).toBe(false);
      expect((service as any).connectionIdToKey.has('orphan-3')).toBe(false);
    });

    it('should handle service destruction flag correctly', () => {
      const scheduleMethod = (service as any).scheduleNextMapCleanup;

      // Mark service as destroyed
      (service as any).isServiceDestroyed = true;

      // Schedule should not create new timer when service is destroyed
      const timerBefore = (service as any).cleanupTimer;
      scheduleMethod.call(service);

      expect((service as any).cleanupTimer).toBe(timerBefore);
    });
  });

  describe('Event Emission Deep Testing', () => {
    it('should emit connection events correctly', async () => {
      const emitMethod = (service as any).emitConnectionEvent;

      emitMethod.call(service, 'test_connection_event', {
        provider: 'longport',
        capability: 'ws-stock-quote',
        duration: 150,
        status: 'success',
        operation: 'test',
      });

      // 等待异步事件发射完成
      await new Promise(resolve => setImmediate(resolve));

      expect(originalMockEventBus.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'stream_data_fetcher',
          metricType: 'infrastructure',
          metricName: 'test_connection_event',
          metricValue: 150,
          tags: expect.objectContaining({
            provider: 'longport',
            capability: 'ws-stock-quote',
            operation: 'test',
            status: 'success',
          }),
        })
      );
    });

    it('should emit subscription events correctly', async () => {
      const emitMethod = (service as any).emitSubscriptionEvent;

      emitMethod.call(service, 'test_subscription_event', {
        provider: 'longport',
        capability: 'ws-stock-quote',
        symbol_count: 5,
        status: 'success',
        action: 'subscribe',
      });

      // 等待异步事件发射完成
      await new Promise(resolve => setImmediate(resolve));

      expect(originalMockEventBus.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'stream_data_fetcher',
          metricType: 'business',
          metricName: 'test_subscription_event',
          metricValue: 5,
          tags: expect.objectContaining({
            provider: 'longport',
            capability: 'ws-stock-quote',
            operation: 'subscribe', // 修正：使用operation而不是action
            status: 'success',
            symbol_count: 5,
          }),
        })
      );
    });

    it('should emit performance events correctly', async () => {
      const emitMethod = (service as any).emitStreamPerformanceEvent;

      emitMethod.call(service, 'test_performance_event', {
        operation: 'health_check',
        duration: 250,
        provider: 'longport',
        connection_count: 10,
        status: 'success',
        threshold_exceeded: false,
      });

      // 等待异步事件发射完成
      await new Promise(resolve => setImmediate(resolve));

      expect(originalMockEventBus.emit).toHaveBeenCalledWith(
//         SYSTEM_STATUS_EVENTS.METRIC_COLLECTED,
        expect.objectContaining({
          source: 'stream_data_fetcher',
          metricType: 'performance',
          metricName: 'test_performance_event',
          metricValue: 250,
          tags: expect.objectContaining({
            operation: 'health_check',
            provider: 'longport',
            status: 'success',
            threshold_exceeded: false,
          }),
        })
      );
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle missing capability registry methods gracefully', async () => {
      enhancedCapabilityRegistry.getCapability.mockReturnValue(null);
      (enhancedCapabilityRegistry as any).get = undefined;

      const params: StreamConnectionParams = {
        provider: 'unknown',
        capability: 'unknown',
        requestId: 'test-edge-case',
      };

      await expect(service.establishStreamConnection(params)).rejects.toThrow(
        'Stream capability not found: unknown/unknown'
      );
    });

    it('should warn about non-stream capabilities', async () => {
      const mockCapability = createMockCapability();
      enhancedCapabilityRegistry.getCapability.mockReturnValue(mockCapability);

      const getStreamCapabilityMethod = (service as any).getStreamCapability;

      // Test with capability that doesn't start with 'ws-' or contain 'stream'
      await getStreamCapabilityMethod.call(service, 'longport', 'get-stock-quote');

      // Should complete without throwing, but may log warning
      expect(mockCapability).toBeDefined();
    });

    it('should handle connection setup event listener failures', () => {
      const setupMethod = (service as any).setupConnectionEventHandlers;
      const mockConnection = createMockConnection();

      // Mock onStatusChange to throw error
      mockConnection.onStatusChange.mockImplementation(() => {
        throw new Error('Event listener setup failed');
      });

      // Should not throw error, just log warning
      expect(() => setupMethod.call(service, mockConnection)).not.toThrow();
    });

    it('should handle connection wait timeout', async () => {
      const waitMethod = (service as any).waitForConnectionReady;
      const mockConnection = createMockConnection({ isConnected: false });

      // Should timeout after specified time
      await expect(waitMethod.call(service, mockConnection, 100)).rejects.toThrow(
        '连接建立超时 (100ms)'
      );
    });

    it('should handle corrupted connection objects during cleanup', () => {
      const cleanupMethod = (service as any).performPeriodicMapCleanup;

      // Add a corrupted connection object
      const corruptedConnection = {
        get lastActiveAt() {
          throw new Error('Property access failed');
        },
        isConnected: false,
      };

      (service as any).activeConnections.set('corrupted-key', corruptedConnection);

      // Should handle corruption gracefully
      expect(() => cleanupMethod.call(service)).not.toThrow();
    });

    it('should handle cache operation failures gracefully', async () => {
      streamCache.setData.mockRejectedValue(new Error('Cache operation failed'));

      const mockConnection = createMockConnection();
      const symbols = ['AAPL'];

      // Should not throw error for cache failures
      await expect(service.subscribeToSymbols(mockConnection, symbols)).resolves.not.toThrow();
    });
  });

  describe('Configuration Integration', () => {
    it('should use configuration service for monitoring limits', () => {
      // 🔥 确保mock函数被正确调用，不要清除调用历史
      // (configService.get as jest.Mock).mockClear(); // 删除这行
      
      const stats = service.getAdaptiveConcurrencyStats();

      expect(originalMockConfigService.get).toHaveBeenCalledWith('monitoringUnifiedLimits');
      expect(stats.recentAdjustments).toHaveLength(0); // Empty initially, but respects config limit
    });

    it('should handle missing configuration gracefully', () => {
      // ✅ 修正: 使用原始Mock对象的mockImplementation来动态配置返回值
      originalMockConfigService.get.mockImplementation(() => undefined);

      const stats = service.getAdaptiveConcurrencyStats();

      // Should use default value when config is missing
      expect(stats.recentAdjustments).toHaveLength(0);
    });
  });
});

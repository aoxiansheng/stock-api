import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StreamDataFetcherService } from '@core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service';
import { EnhancedCapabilityRegistryService } from '@providers/services/enhanced-capability-registry.service';
import { StreamCacheStandardizedService } from '@core/05-caching/module/stream-cache/services/stream-cache-standardized.service';
import { StreamClientStateManager } from '@core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service';
import { ConnectionPoolManager } from '@core/03-fetching/stream-data-fetcher/services/connection-pool-manager.service';
import {
  StreamConnection,
  StreamConnectionParams,
  StreamConnectionStatus,
  StreamConnectionStats,
  StreamConnectionException,
  StreamSubscriptionException,
} from '@core/03-fetching/stream-data-fetcher/interfaces';
import { OPERATION_LIMITS } from '@common/constants/domain';
import { UniversalExceptionFactory, BusinessErrorCode, ComponentIdentifier } from '@common/core/exceptions';

describe('StreamDataFetcherService', () => {
  let service: StreamDataFetcherService;
  let capabilityRegistry: EnhancedCapabilityRegistryService;
  let streamCache: StreamCacheStandardizedService;
  let clientStateManager: StreamClientStateManager;
  let connectionPoolManager: ConnectionPoolManager;
  let eventBus: EventEmitter2;
  let configService: ConfigService;

  // Mock连接对象
  const mockConnection: StreamConnection = {
    id: 'test-connection-id-123',
    provider: 'longport',
    capability: 'ws-stock-quote',
    isConnected: true,
    createdAt: new Date(),
    lastActiveAt: new Date(),
    subscribedSymbols: new Set<string>(),
    options: {
      autoReconnect: true,
      maxReconnectAttempts: 3,
      connectionTimeoutMs: 30000,
    },
    onData: jest.fn(),
    onStatusChange: jest.fn(),
    onError: jest.fn(),
    sendHeartbeat: jest.fn().mockResolvedValue(true),
    getStats: jest.fn().mockReturnValue({
      connectionId: 'test-connection-id-123',
      status: StreamConnectionStatus.CONNECTED,
      connectionDurationMs: 60000,
      messagesReceived: 100,
      messagesSent: 50,
      errorCount: 0,
      reconnectCount: 0,
      lastHeartbeat: new Date(),
      avgProcessingLatencyMs: 10,
      subscribedSymbolsCount: 5,
    } as StreamConnectionStats),
    isAlive: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(undefined),
  };

  // Mock capability实例
  const mockCapability = {
    connect: jest.fn().mockResolvedValue(mockConnection),
  };

  beforeEach(async () => {
    // 清理所有mock
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamDataFetcherService,
        {
          provide: EnhancedCapabilityRegistryService,
          useValue: {
            getCapability: jest.fn().mockReturnValue(mockCapability),
            get: jest.fn().mockReturnValue(mockCapability),
          },
        },
        {
          provide: StreamCacheStandardizedService,
          useValue: {
            setData: jest.fn().mockResolvedValue(undefined),
            deleteData: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: StreamClientStateManager,
          useValue: {
            updateSubscriptionState: jest.fn(),
            removeConnection: jest.fn(),
          },
        },
        {
          provide: ConnectionPoolManager,
          useValue: {
            registerConnection: jest.fn(),
            unregisterConnection: jest.fn(),
            getStats: jest.fn().mockReturnValue({
              global: 10,
              byKey: {},
              byIP: {},
            }),
            getAlerts: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue({
              dataProcessingBatch: {
                recentMetrics: 5,
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StreamDataFetcherService>(StreamDataFetcherService);
    capabilityRegistry = module.get<EnhancedCapabilityRegistryService>(
      EnhancedCapabilityRegistryService,
    );
    streamCache = module.get<StreamCacheStandardizedService>(
      StreamCacheStandardizedService,
    );
    clientStateManager = module.get<StreamClientStateManager>(
      StreamClientStateManager,
    );
    connectionPoolManager = module.get<ConnectionPoolManager>(
      ConnectionPoolManager,
    );
    eventBus = module.get<EventEmitter2>(EventEmitter2);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    // 清理服务资源
    if (service) {
      await service.onModuleDestroy();
    }
  });

  describe('建立流连接 - establishStreamConnection', () => {
    it('应该成功建立流连接（对象参数形式）', async () => {
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        requestId: 'req_123',
        options: {
          autoReconnect: true,
          maxReconnectAttempts: 3,
        },
      };

      const connection = await service.establishStreamConnection(params);

      expect(connection).toBeDefined();
      expect(connection.id).toBe('test-connection-id-123');
      expect(connection.provider).toBe('longport');
      expect(connection.capability).toBe('ws-stock-quote');
      expect(capabilityRegistry.getCapability).toHaveBeenCalledWith(
        'longport',
        'ws-stock-quote',
      );
      expect(connectionPoolManager.registerConnection).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('应该成功建立流连接（分散参数形式）', async () => {
      const connection = await service.establishStreamConnection(
        'longport',
        'ws-stock-quote',
        { autoReconnect: true },
      );

      expect(connection).toBeDefined();
      expect(connection.provider).toBe('longport');
      expect(capabilityRegistry.getCapability).toHaveBeenCalled();
    });

    it('当获取能力失败时应该抛出StreamConnectionException', async () => {
      (capabilityRegistry.getCapability as jest.Mock).mockReturnValue(null);

      const params: StreamConnectionParams = {
        provider: 'invalid',
        capability: 'invalid',
        requestId: 'req_123',
      };

      await expect(
        service.establishStreamConnection(params),
      ).rejects.toThrow(StreamConnectionException);
    });

    it('当连接建立失败时应该抛出异常', async () => {
      mockCapability.connect.mockRejectedValueOnce(
        new Error('Connection failed'),
      );

      await expect(
        service.establishStreamConnection('longport', 'ws-stock-quote'),
      ).rejects.toThrow('Connection failed');
    });

    it('应该正确处理连接超时', async () => {
      const slowConnection = { ...mockConnection, isConnected: false };
      mockCapability.connect.mockResolvedValueOnce(slowConnection);

      await expect(
        service.establishStreamConnection({
          provider: 'longport',
          capability: 'ws-stock-quote',
          requestId: 'req_123',
          options: { connectionTimeoutMs: 100 },
        }),
      ).rejects.toThrow();
    });
  });

  describe('订阅符号 - subscribeToSymbols', () => {
    it('应该成功订阅符号', async () => {
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];

      await service.subscribeToSymbols(mockConnection, symbols);

      expect(clientStateManager.updateSubscriptionState).toHaveBeenCalledWith(
        mockConnection.id,
        symbols,
        'subscribed',
      );
      expect(streamCache.setData).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('当连接未建立时应该抛出异常', async () => {
      const disconnectedConnection = {
        ...mockConnection,
        isConnected: false,
      };

      await expect(
        service.subscribeToSymbols(disconnectedConnection, ['AAPL']),
      ).rejects.toThrow(StreamConnectionException);
    });

    it('应该处理空符号列表', async () => {
      await service.subscribeToSymbols(mockConnection, []);

      expect(clientStateManager.updateSubscriptionState).toHaveBeenCalledWith(
        mockConnection.id,
        [],
        'subscribed',
      );
    });

    it('应该正确记录性能指标', async () => {
      const symbols = ['AAPL'];
      await service.subscribeToSymbols(mockConnection, symbols);

      // 验证性能指标记录
      const stats = service.getAdaptiveConcurrencyStats();
      expect(stats.performance.totalRequests).toBeGreaterThan(0);
    });
  });

  describe('取消订阅符号 - unsubscribeFromSymbols', () => {
    it('应该成功取消订阅符号', async () => {
      const symbols = ['AAPL', 'GOOGL'];

      await service.unsubscribeFromSymbols(mockConnection, symbols);

      expect(clientStateManager.updateSubscriptionState).toHaveBeenCalledWith(
        mockConnection.id,
        symbols,
        'unsubscribed',
      );
      expect(streamCache.deleteData).toHaveBeenCalled();
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('应该处理空符号列表', async () => {
      await service.unsubscribeFromSymbols(mockConnection, []);

      expect(clientStateManager.updateSubscriptionState).toHaveBeenCalledWith(
        mockConnection.id,
        [],
        'unsubscribed',
      );
    });
  });

  describe('关闭连接 - closeConnection', () => {
    beforeEach(() => {
      // 先建立连接以便关闭
      const connectionKey = `${mockConnection.provider}:${mockConnection.capability}:${mockConnection.id}`;
      (service as any).activeConnections.set(connectionKey, mockConnection);
      (service as any).connectionIdToKey.set(mockConnection.id, connectionKey);
    });

    it('应该成功关闭连接', async () => {
      await service.closeConnection(mockConnection);

      expect(mockConnection.close).toHaveBeenCalled();
      expect(connectionPoolManager.unregisterConnection).toHaveBeenCalled();
      expect(clientStateManager.removeConnection).toHaveBeenCalledWith(
        mockConnection.id,
      );
      expect(eventBus.emit).toHaveBeenCalled();
    });

    it('即使关闭失败也应该清理内存映射', async () => {
      (mockConnection.close as jest.Mock).mockRejectedValueOnce(new Error('Close failed'));

      await expect(
        service.closeConnection(mockConnection),
      ).rejects.toThrow('Close failed');

      // 验证内存映射已清理
      expect((service as any).activeConnections.size).toBe(0);
      expect((service as any).connectionIdToKey.size).toBe(0);
    });
  });

  describe('连接状态检查 - isConnectionActive', () => {
    it('应该正确检查连接活跃状态（通过连接对象）', () => {
      const isActive = service.isConnectionActive(mockConnection);
      expect(isActive).toBe(true);
    });

    it('应该正确检查连接活跃状态（通过连接键）', () => {
      const connectionKey = `${mockConnection.provider}:${mockConnection.capability}:${mockConnection.id}`;
      (service as any).activeConnections.set(connectionKey, mockConnection);

      const isActive = service.isConnectionActive(connectionKey);
      expect(isActive).toBe(true);
    });

    it('应该返回false当连接不存在', () => {
      const isActive = service.isConnectionActive('non-existent-key');
      expect(isActive).toBe(false);
    });
  });

  describe('连接统计 - getConnectionStats', () => {
    it('应该返回连接统计信息', () => {
      const stats = service.getConnectionStats(mockConnection);
      expect(stats).toBeDefined();
      expect(stats?.connectionId).toBe('test-connection-id-123');
      expect(stats?.status).toBe(StreamConnectionStatus.CONNECTED);
    });

    it('应该返回null当连接没有统计信息', () => {
      const connectionWithoutStats = { ...mockConnection, getStats: undefined };
      const stats = service.getConnectionStats(connectionWithoutStats);
      expect(stats).toBeNull();
    });
  });

  describe('批量健康检查 - batchHealthCheck', () => {
    beforeEach(() => {
      // 添加一些测试连接
      const connections = [
        { ...mockConnection, id: 'conn1', lastActiveAt: new Date() },
        { ...mockConnection, id: 'conn2', lastActiveAt: new Date(Date.now() - 3 * 60 * 1000) }, // 3分钟前
        { ...mockConnection, id: 'conn3', lastActiveAt: new Date(Date.now() - 10 * 60 * 1000) }, // 10分钟前
      ];

      connections.forEach((conn, index) => {
        const key = `provider:capability:${conn.id}`;
        (service as any).activeConnections.set(key, conn);
        (service as any).connectionIdToKey.set(conn.id, key);
      });
    });

    it('应该执行分层健康检查', async () => {
      const results = await service.batchHealthCheck({
        timeoutMs: 5000,
        tieredEnabled: true,
      });

      expect(results).toBeDefined();
      expect(Object.keys(results).length).toBeGreaterThan(0);
    });

    it('应该回退到传统批量检查当分层被禁用', async () => {
      const results = await service.batchHealthCheck({
        tieredEnabled: false,
        concurrency: 2,
      });

      expect(results).toBeDefined();
    });

    it('应该处理健康检查超时', async () => {
      (mockConnection.isAlive as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(false), 1000)),
      );

      const results = await service.batchHealthCheck({
        timeoutMs: 100,
        skipUnresponsive: true,
      });

      // 超时的连接应该被标记为不健康
      Object.values(results).forEach((isHealthy) => {
        expect(typeof isHealthy).toBe('boolean');
      });
    });

    it('应该支持重试机制', async () => {
      let callCount = 0;
      (mockConnection.isAlive as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First attempt failed'));
        }
        return Promise.resolve(true);
      });

      const results = await service.batchHealthCheck({
        retries: 2,
      });

      expect(callCount).toBeGreaterThan(1);
    });
  });

  describe('自适应并发控制', () => {
    it('应该获取自适应并发控制统计', () => {
      const stats = service.getAdaptiveConcurrencyStats();

      expect(stats).toBeDefined();
      expect(stats.currentConcurrency).toBeDefined();
      expect(stats.concurrencyRange).toBeDefined();
      expect(stats.performance).toBeDefined();
      expect(stats.circuitBreaker).toBeDefined();
    });

    it('应该记录操作性能', () => {
      // 执行一些操作来生成性能数据
      (service as any).recordOperationPerformance(100, true);
      (service as any).recordOperationPerformance(200, false);

      const stats = service.getAdaptiveConcurrencyStats();
      expect(stats.performance.totalRequests).toBe(2);
      expect(stats.performance.successRate).toBeDefined();
    });

    it('应该在失败率高时触发断路器', () => {
      // 模拟高失败率
      for (let i = 0; i < 10; i++) {
        (service as any).recordOperationPerformance(100, false);
      }
      (service as any).performanceMetrics.successRate = 0.4; // 40%成功率

      (service as any).analyzePerformanceAndAdjustConcurrency();

      expect((service as any).concurrencyControl.circuitBreaker.enabled).toBe(true);
    });

    it('应该在性能良好时增加并发限制', () => {
      const initialConcurrency = (service as any).concurrencyControl.currentConcurrency;

      // 模拟良好性能
      for (let i = 0; i < 20; i++) {
        (service as any).recordOperationPerformance(50, true); // 快速响应，成功
      }
      (service as any).performanceMetrics.avgResponseTime = 50;
      (service as any).performanceMetrics.successRate = 0.99;

      // 设置上次调整时间以避免稳定期限制
      (service as any).concurrencyControl.lastAdjustment = 0;

      (service as any).analyzePerformanceAndAdjustConcurrency();

      expect((service as any).concurrencyControl.currentConcurrency).toBeGreaterThan(initialConcurrency);
    });
  });

  describe('内存管理和清理', () => {
    it('应该定期清理僵尸连接', () => {
      // 添加一个僵尸连接
      const zombieConnection = {
        ...mockConnection,
        id: 'zombie-conn',
        isConnected: false,
        lastActiveAt: new Date(Date.now() - 40 * 60 * 1000), // 40分钟前
      };
      const key = 'provider:capability:zombie-conn';
      (service as any).activeConnections.set(key, zombieConnection);
      (service as any).connectionIdToKey.set(zombieConnection.id, key);

      // 执行清理
      (service as any).performPeriodicMapCleanup();

      // 验证僵尸连接已被清理
      expect((service as any).activeConnections.has(key)).toBe(false);
      expect((service as any).connectionIdToKey.has(zombieConnection.id)).toBe(false);
    });

    it('应该清理无效的连接映射', () => {
      // 添加一个只在映射中存在的连接ID
      (service as any).connectionIdToKey.set('orphan-id', 'orphan-key');

      // 执行清理
      (service as any).performPeriodicMapCleanup();

      // 验证孤儿映射已被清理
      expect((service as any).connectionIdToKey.has('orphan-id')).toBe(false);
    });

    it('应该在销毁时清理所有资源', async () => {
      // 添加一些连接
      const connectionKey = `${mockConnection.provider}:${mockConnection.capability}:${mockConnection.id}`;
      (service as any).activeConnections.set(connectionKey, mockConnection);
      (service as any).connectionIdToKey.set(mockConnection.id, connectionKey);

      // 执行销毁
      await service.onModuleDestroy();

      // 验证资源已清理
      expect((service as any).isServiceDestroyed).toBe(true);
      expect((service as any).activeConnections.size).toBe(0);
      expect((service as any).connectionIdToKey.size).toBe(0);
    });
  });

  describe('连接池管理集成', () => {
    it('应该获取连接池统计信息', () => {
      const stats = service.getConnectionPoolStats();

      expect(stats).toBeDefined();
      expect(stats.activeConnections).toBeDefined();
      expect(stats.adaptiveConcurrency).toBeDefined();
      expect(stats.eventDrivenMonitoring).toBe(true);
      expect(connectionPoolManager.getStats).toHaveBeenCalled();
      expect(connectionPoolManager.getAlerts).toHaveBeenCalled();
    });
  });

  describe('缓存服务集成', () => {
    it('应该返回流数据缓存服务', () => {
      const cache = service.getStreamDataCache();
      expect(cache).toBe(streamCache);
    });

    it('应该返回客户端状态管理器', () => {
      const manager = service.getClientStateManager();
      expect(manager).toBe(clientStateManager);
    });
  });

  describe('现有连接查询', () => {
    it('应该获取现有连接', () => {
      const connectionKey = `${mockConnection.provider}:${mockConnection.capability}:${mockConnection.id}`;
      (service as any).activeConnections.set(connectionKey, mockConnection);

      const conn = service.getExistingConnection(connectionKey);
      expect(conn).toBe(mockConnection);
    });

    it('应该返回null当连接不存在', () => {
      const conn = service.getExistingConnection('non-existent');
      expect(conn).toBeNull();
    });
  });

  describe('按提供商统计', () => {
    it('应该获取提供商连接统计', () => {
      // 添加测试连接
      const conn1 = { ...mockConnection, id: 'conn1', provider: 'longport' };
      const conn2 = { ...mockConnection, id: 'conn2', provider: 'longport', isConnected: false };
      const conn3 = { ...mockConnection, id: 'conn3', provider: 'itick' };

      (service as any).activeConnections.set('longport:ws:conn1', conn1);
      (service as any).activeConnections.set('longport:ws:conn2', conn2);
      (service as any).activeConnections.set('itick:ws:conn3', conn3);

      const stats = service.getConnectionStatsByProvider('longport');

      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.connections).toHaveLength(2);
    });
  });

  describe('指标摘要', () => {
    it('应该获取指标摘要', () => {
      const summary = service.getMetricsSummary();

      expect(summary).toBeDefined();
      expect(summary.activeConnections).toBeDefined();
      expect(summary.connectionMappings).toBeDefined();
      expect(summary.timestamp).toBeDefined();
      expect(summary.status).toBe('active');
      expect(eventBus.emit).toHaveBeenCalled();
    });
  });

  describe('核心执行方法', () => {
    it('应该在executeCore中抛出未实现异常', async () => {
      await expect(service.executeCore()).rejects.toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该处理连接状态变化回调设置失败', async () => {
      const badConnection = {
        ...mockConnection,
        onStatusChange: jest.fn().mockImplementation(() => {
          throw new Error('Callback setup failed');
        }),
      };
      mockCapability.connect.mockResolvedValueOnce(badConnection);

      // 不应该因为回调设置失败而导致连接建立失败
      const connection = await service.establishStreamConnection('longport', 'ws-stock-quote');
      expect(connection).toBeDefined();
    });

    it('应该处理内存泄漏检测', () => {
      // 模拟内存泄漏情况
      for (let i = 0; i < 100; i++) {
        (service as any).connectionIdToKey.set(`id-${i}`, `key-${i}`);
      }
      (service as any).activeConnections.set('single-key', mockConnection);

      // 执行清理（应该触发内存泄漏警告）
      (service as any).performPeriodicMapCleanup();

      // 验证日志记录（通过mock logger或其他方式）
      expect((service as any).connectionIdToKey.size).toBeGreaterThan(
        (service as any).activeConnections.size * 2,
      );
    });
  });
});
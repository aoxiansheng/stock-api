/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';
import { StreamDataFetcherService } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service';
import { CapabilityRegistryService } from '../../../../../../../src/providers/services/capability-registry.service';
import { CollectorService } from '@monitoring/collector/collector.service';
import { StreamMetricsService } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-metrics.service';
import { StreamCacheService } from '../../../../../../../src/core/05-caching/stream-cache/services/stream-cache.service';
import { StreamClientStateManager } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service';
import { ConnectionPoolManager } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/connection-pool-manager.service';
import { StreamMonitoringService } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-monitoring.service';
import {
  StreamConnectionParams,
  StreamConnection,
  StreamConnectionException,
  StreamSubscriptionException,
} from '../../../../../../../src/core/03-fetching/stream-data-fetcher/interfaces';

describe('StreamDataFetcherService', () => {
  let service: StreamDataFetcherService;
  let capabilityRegistry: jest.Mocked<CapabilityRegistryService>;
  let collectorService: jest.Mocked<CollectorService>;

  // Mock对象
  let mockCapabilityInstance: any;
  let mockContextService: any;
  let mockConnection: StreamConnection;

  beforeEach(async () => {
    // 创建mock对象
    mockCapabilityInstance = {
      initialize: jest.fn().mockResolvedValue(undefined),
      _isConnected: jest.fn().mockReturnValue(true),
      subscribe: jest.fn().mockResolvedValue(undefined),
      unsubscribe: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
      ping: jest.fn().mockResolvedValue(undefined),
      onData: jest.fn(),
      onError: jest.fn(),
      onDisconnect: jest.fn(),
    };

    mockContextService = {
      id: 'test-context',
      provider: 'test-provider',
    };

    const mockCapabilityRegistry = {
      getCapability: jest.fn().mockReturnValue(mockCapabilityInstance),
      getProvider: jest.fn(),
    };

    const mockCollectorService = {
      recordRequest: jest.fn(),
      recordDatabaseOperation: jest.fn(),
      recordCacheOperation: jest.fn(),
      recordSystemMetrics: jest.fn(),
      collectRequestMetrics: jest.fn().mockResolvedValue(undefined),
      collectPerformanceData: jest.fn().mockResolvedValue(undefined),
      getRawMetrics: jest.fn().mockResolvedValue({ requests: [], database: [], cache: [], system: undefined }),
      getSystemMetrics: jest.fn().mockResolvedValue({ memory: { used: 0, total: 0, percentage: 0 }, cpu: { usage: 0 }, uptime: 0, timestamp: new Date() }),
    };

    const mockStreamMetricsService = {
      recordConnectionEvent: jest.fn(),
      updateActiveConnectionsCount: jest.fn(),
      recordSymbolProcessing: jest.fn(),
      recordLatency: jest.fn(),
      recordConnectionStatusChange: jest.fn(),
      recordErrorEvent: jest.fn(),
    };

    const mockStreamCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      clear: jest.fn(),
    };

    const mockClientStateManager = {
      addClient: jest.fn(),
      removeClient: jest.fn(),
      updateClientState: jest.fn(),
      getClientState: jest.fn(),
    };

    const mockConnectionPoolManager = {
      canCreateConnection: jest.fn().mockReturnValue(true),
      registerConnection: jest.fn(),
      unregisterConnection: jest.fn(),
      getStats: jest.fn().mockReturnValue({}),
      getAlerts: jest.fn().mockReturnValue([]),
    };

    const mockStreamMonitoringService = {
      startMonitoringConnection: jest.fn().mockReturnValue(true),
      stopMonitoringConnection: jest.fn().mockReturnValue(true),
      getConnectionCount: jest.fn().mockReturnValue(0),
      isDestroyed: false,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamDataFetcherService,
        {
          provide: CapabilityRegistryService,
          useValue: mockCapabilityRegistry,
        },
        {
          provide: CollectorService,
          useValue: mockCollectorService,
        },
        {
          provide: StreamMetricsService,
          useValue: mockStreamMetricsService,
        },
        {
          provide: StreamCacheService,
          useValue: mockStreamCacheService,
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
          provide: StreamMonitoringService,
          useValue: mockStreamMonitoringService,
        },
      ],
    }).compile();

    service = module.get<StreamDataFetcherService>(StreamDataFetcherService);
    capabilityRegistry = module.get(CapabilityRegistryService);
    collectorService = module.get(CollectorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('establishStreamConnection', () => {
    const validParams: StreamConnectionParams = {
      provider: 'longport',
      capability: 'ws-stock-quote',
      contextService: mockContextService,
      requestId: uuidv4(),
      options: {
        autoReconnect: true,
        maxReconnectAttempts: 3,
        heartbeatIntervalMs: 30000,
      },
    };

    it('应该成功建立流连接', async () => {
      // Arrange
      mockCapabilityInstance.isConnected
        .mockReturnValueOnce(false) // 第一次检查需要初始化
        .mockReturnValue(true); // 初始化后连接成功
      capabilityRegistry.getCapability.mockReturnValue(mockCapabilityInstance);

      // Act
      const connection = await service.establishStreamConnection(validParams);

      // Assert
      expect(connection).toBeDefined();
      expect(connection.provider).toBe(validParams.provider);
      expect(connection.capability).toBe(validParams.capability);
      expect(connection.isConnected).toBe(true);
      expect(capabilityRegistry.getCapability).toHaveBeenCalledWith(
        validParams.provider,
        validParams.capability,
      );
      expect(mockCapabilityInstance.initialize).toHaveBeenCalledWith(validParams.contextService);
    });

    it('应该在能力不存在时抛出异常', async () => {
      // Arrange
      capabilityRegistry.getCapability.mockReturnValue(null);

      // Act & Assert
      await expect(service.establishStreamConnection(validParams)).rejects.toThrow(
        StreamConnectionException,
      );
      expect(capabilityRegistry.getCapability).toHaveBeenCalledWith(
        validParams.provider,
        validParams.capability,
      );
    });

    it('应该在连接初始化失败时重试', async () => {
      // Arrange - 让整个连接创建过程失败从而触发service级别的重试
      let attemptCount = 0;
      capabilityRegistry.getCapability.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('初始化失败'); // 第一次尝试失败
        }
        return mockCapabilityInstance; // 第二次尝试成功
      });
      
      mockCapabilityInstance.isConnected
        .mockReturnValueOnce(false)
        .mockReturnValue(true);

      // Act
      const connection = await service.establishStreamConnection(validParams);

      // Assert
      expect(connection).toBeDefined();
      expect(capabilityRegistry.getCapability).toHaveBeenCalledTimes(2); // 重试了一次
    });

    it('应该记录连接建立指标', async () => {
      // Act
      await service.establishStreamConnection(validParams);

      // Assert
      // 验证指标记录 - 连接建立成功时会通过CollectorService记录指标
      expect(collectorService.recordRequest).toHaveBeenCalled();
    });
  });

  describe('subscribeToSymbols', () => {
    let connection: StreamConnection;
    const testSymbols = ['700.HK', '0005.HK', 'AAPL.US'];

    beforeEach(async () => {
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };
      connection = await service.establishStreamConnection(params);
    });

    it('应该成功订阅符号', async () => {
      // Act
      await service.subscribeToSymbols(connection, testSymbols);

      // Assert
      expect(mockCapabilityInstance.subscribe).toHaveBeenCalledWith(
        testSymbols,
        mockContextService,
      );
      expect(connection.subscribedSymbols.size).toBe(testSymbols.length);
      testSymbols.forEach(symbol => {
        expect(connection.subscribedSymbols.has(symbol)).toBe(true);
      });
    });

    it('应该在连接不活跃时抛出异常', async () => {
      // Arrange
      connection.isConnected = false;

      // Act & Assert
      await expect(service.subscribeToSymbols(connection, testSymbols)).rejects.toThrow(
        StreamConnectionException,
      );
      expect(mockCapabilityInstance.subscribe).not.toHaveBeenCalled();
    });

    it('应该在符号列表为空时抛出异常', async () => {
      // Act & Assert
      await expect(service.subscribeToSymbols(connection, [])).rejects.toThrow(
        StreamSubscriptionException,
      );
      await expect(service.subscribeToSymbols(connection, null)).rejects.toThrow(
        StreamSubscriptionException,
      );
      expect(mockCapabilityInstance.subscribe).not.toHaveBeenCalled();
    });

    it('应该在能力实例不支持订阅时抛出异常', async () => {
      // Arrange
      delete mockCapabilityInstance.subscribe;

      // Act & Assert
      await expect(service.subscribeToSymbols(connection, testSymbols)).rejects.toThrow(
        StreamSubscriptionException,
      );
    });

    it('应该记录订阅指标', async () => {
      // Act
      await service.subscribeToSymbols(connection, testSymbols);

      // Assert
      // 验证指标记录 - 订阅成功时会记录指标
      expect(collectorService.recordRequest).toHaveBeenCalled();
    });
  });

  describe('unsubscribeFromSymbols', () => {
    let connection: StreamConnection;
    const testSymbols = ['700.HK', '0005.HK'];

    beforeEach(async () => {
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };
      connection = await service.establishStreamConnection(params);
      
      // 先订阅符号
      await service.subscribeToSymbols(connection, ['700.HK', '0005.HK', 'AAPL.US']);
    });

    it('应该成功取消订阅符号', async () => {
      // Act
      await service.unsubscribeFromSymbols(connection, testSymbols);

      // Assert
      expect(mockCapabilityInstance.unsubscribe).toHaveBeenCalledWith(
        testSymbols,
        mockContextService,
      );
      expect(connection.subscribedSymbols.size).toBe(1); // 只剩AAPL.US
      expect(connection.subscribedSymbols.has('AAPL.US')).toBe(true);
      testSymbols.forEach(symbol => {
        expect(connection.subscribedSymbols.has(symbol)).toBe(false);
      });
    });

    it('应该在连接不活跃时抛出异常', async () => {
      // Arrange
      connection.isConnected = false;

      // Act & Assert
      await expect(service.unsubscribeFromSymbols(connection, testSymbols)).rejects.toThrow(
        StreamConnectionException,
      );
      expect(mockCapabilityInstance.unsubscribe).not.toHaveBeenCalled();
    });

    it('应该在符号列表为空时抛出异常', async () => {
      // Act & Assert
      await expect(service.unsubscribeFromSymbols(connection, [])).rejects.toThrow(
        StreamSubscriptionException,
      );
      expect(mockCapabilityInstance.unsubscribe).not.toHaveBeenCalled();
    });
  });

  describe('closeConnection', () => {
    let connection: StreamConnection;

    beforeEach(async () => {
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };
      connection = await service.establishStreamConnection(params);
    });

    it('应该成功关闭连接', async () => {
      // Act
      await service.closeConnection(connection);

      // Assert
      expect(connection.isConnected).toBe(false);
      expect(connection.subscribedSymbols.size).toBe(0);
      expect(service.isConnectionActive(connection)).toBe(false);
      expect(mockCapabilityInstance.close).toHaveBeenCalledWith(mockContextService);
    });

    it('应该在关闭失败时抛出异常', async () => {
      // Arrange
      mockCapabilityInstance.close.mockRejectedValue(new Error('关闭失败'));

      // Act & Assert
      await expect(service.closeConnection(connection)).rejects.toThrow(
        StreamConnectionException,
      );
    });
  });

  describe('isConnectionActive', () => {
    let connection: StreamConnection;

    beforeEach(async () => {
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };
      connection = await service.establishStreamConnection(params);
    });

    it('应该正确检查连接活跃状态', () => {
      // Act & Assert
      expect(service.isConnectionActive(connection)).toBe(true);

      // 断开连接
      connection.isConnected = false;
      expect(service.isConnectionActive(connection)).toBe(false);
    });
  });

  describe('getConnectionStats', () => {
    let connection: StreamConnection;

    beforeEach(async () => {
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };
      connection = await service.establishStreamConnection(params);
    });

    it('应该返回连接统计信息', () => {
      // Act
      const stats = service.getConnectionStats(connection);

      // Assert
      expect(stats).toBeDefined();
      expect(stats.connectionId).toBe(connection.id);
      expect(stats.status).toBeDefined();
      expect(stats.connectionDurationMs).toBeGreaterThanOrEqual(0);
      expect(stats.messagesReceived).toBe(0);
      expect(stats.subscribedSymbolsCount).toBe(0);
    });
  });

  describe('getAllConnectionStats', () => {
    it('应该返回所有活跃连接的统计信息', async () => {
      // Arrange
      const params1: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };
      const params2: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-option-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      await service.establishStreamConnection(params1);
      await service.establishStreamConnection(params2);

      // Act
      const allStats = service.getAllConnectionStats();

      // Assert
      expect(allStats).toHaveLength(2);
      expect(allStats[0].connectionId).toBeDefined();
      expect(allStats[1].connectionId).toBeDefined();
      expect(allStats[0].connectionId).not.toBe(allStats[1].connectionId);
    });

    it('应该在没有活跃连接时返回空数组', () => {
      // Act
      const allStats = service.getAllConnectionStats();

      // Assert
      expect(allStats).toEqual([]);
    });
  });

  describe('错误处理和重试机制', () => {
    it('应该在网络错误时重试连接', async () => {
      // Arrange
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      // 让service级别的连接创建过程失败并重试
      let attemptCount = 0;
      capabilityRegistry.getCapability.mockImplementation(() => {
        attemptCount++;
        if (attemptCount === 1) {
          throw new Error('网络错误'); // 第一次尝试失败
        }
        return mockCapabilityInstance; // 第二次尝试成功
      });

      mockCapabilityInstance.isConnected
        .mockReturnValueOnce(false)
        .mockReturnValue(true);

      // Act
      const connection = await service.establishStreamConnection(params);

      // Assert
      expect(connection).toBeDefined();
      expect(capabilityRegistry.getCapability).toHaveBeenCalledTimes(2); // 重试了一次
    });

    it('应该记录操作失败指标', async () => {
      // Arrange
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      capabilityRegistry.getCapability.mockReturnValue(null);

      // Act & Assert
      await expect(service.establishStreamConnection(params)).rejects.toThrow();
      // 验证失败指标记录
      expect(collectorService.recordRequest).toHaveBeenCalled();
    });
  });

  describe('性能监控', () => {
    it('应该记录处理时间指标', async () => {
      // Arrange
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      // Act
      await service.establishStreamConnection(params);

      // Assert
      // 验证处理时间指标记录
      expect(collectorService.recordRequest).toHaveBeenCalled();
    });
  });

  describe('与现有CapabilityRegistry集成', () => {
    it('应该正确使用CapabilityRegistryService获取能力', async () => {
      // Arrange
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      // Act
      await service.establishStreamConnection(params);

      // Assert
      expect(capabilityRegistry.getCapability).toHaveBeenCalledWith(
        'longport',
        'ws-stock-quote',
      );
    });

    it('应该检测并警告非流能力', async () => {
      // Arrange
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'get-stock-quote', // 非WebSocket能力
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

      // Act
      await service.establishStreamConnection(params);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        '可能不是流能力',
        expect.objectContaining({
          provider: 'longport',
          capability: 'get-stock-quote',
          suggestion: expect.stringContaining('流能力通常以"ws-"开头'),
        }),
      );

      loggerWarnSpy.mockRestore();
    });
  });

  describe('P1-2: Adaptive Concurrency Control', () => {
    beforeEach(() => {
      // Reset performance metrics before each test
      service['performanceMetrics'] = {
        responseTimes: [],
        avgResponseTime: 0,
        p95ResponseTime: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 100,
        concurrencyHistory: [],
        activeOperations: 0,
        queuedOperations: 0,
        lastMetricsUpdate: Date.now(),
        windowSize: 100,
      };
    });

    it('should initialize with proper performance metrics state', () => {
      // Assert
      expect(service['performanceMetrics']).toBeDefined();
      expect(service['performanceMetrics'].responseTimes).toEqual([]);
      expect(service['performanceMetrics'].avgResponseTime).toBe(0);
      expect(service['performanceMetrics'].successRate).toBe(100);
      expect(service['performanceMetrics'].activeOperations).toBe(0);
    });

    it('should record operation performance metrics', async () => {
      // Arrange
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      // Act
      await service.establishStreamConnection(params);

      // Assert
      expect(service['performanceMetrics'].totalRequests).toBe(1);
      expect(service['performanceMetrics'].successfulRequests).toBe(1);
      expect(service['performanceMetrics'].responseTimes.length).toBe(1);
      expect(service['performanceMetrics'].responseTimes[0]).toBeGreaterThan(0);
    });

    it('should calculate average response time correctly', async () => {
      // Arrange
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      // Act - perform multiple operations
      await service.establishStreamConnection(params);
      await service.establishStreamConnection({ ...params, requestId: uuidv4() });

      // Assert
      expect(service['performanceMetrics'].avgResponseTime).toBeGreaterThan(0);
      expect(service['performanceMetrics'].totalRequests).toBe(2);
      expect(service['performanceMetrics'].responseTimes.length).toBe(2);
    });

    it('should calculate P95 response time correctly', async () => {
      // Arrange
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      // Simulate multiple operations with varying response times
      const responseTimes = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      service['performanceMetrics'].responseTimes = responseTimes;

      // Act
      const p95 = service['calculateP95ResponseTime']();

      // Assert
      expect(p95).toBe(95); // P95 of [10,20,30,40,50,60,70,80,90,100] is 95
    });

    it('should adjust concurrency based on performance metrics', () => {
      // Arrange - simulate poor performance
      service['performanceMetrics'].avgResponseTime = 1000; // High response time
      service['performanceMetrics'].successRate = 70; // Low success rate
      const initialConcurrency = service['currentConcurrency'];

      // Act
      const newConcurrency = service['calculateOptimalConcurrency']();

      // Assert
      expect(newConcurrency).toBeLessThanOrEqual(initialConcurrency);
    });

    it('should increase concurrency when performance is good', () => {
      // Arrange - simulate good performance
      service['performanceMetrics'].avgResponseTime = 50; // Low response time
      service['performanceMetrics'].successRate = 100; // High success rate
      service['currentConcurrency'] = 10;

      // Act
      const newConcurrency = service['calculateOptimalConcurrency']();

      // Assert
      expect(newConcurrency).toBeGreaterThan(10);
    });

    it('should respect minimum and maximum concurrency limits', () => {
      // Arrange - extreme conditions
      service['performanceMetrics'].avgResponseTime = 10000; // Very high
      service['performanceMetrics'].successRate = 0; // Complete failure

      // Act
      const newConcurrency = service['calculateOptimalConcurrency']();

      // Assert
      expect(newConcurrency).toBeGreaterThanOrEqual(service['minConcurrency']);
      expect(newConcurrency).toBeLessThanOrEqual(service['maxConcurrency']);
    });

    it('should implement circuit breaker functionality', () => {
      // Arrange - simulate many failures
      service['performanceMetrics'].failedRequests = 15;
      service['performanceMetrics'].totalRequests = 20;
      service['performanceMetrics'].successRate = 25; // 25% success rate

      // Act
      const isCircuitOpen = service['shouldTriggerCircuitBreaker']();

      // Assert
      expect(isCircuitOpen).toBe(true);
    });

    it('should not trigger circuit breaker with good performance', () => {
      // Arrange - simulate good performance
      service['performanceMetrics'].failedRequests = 1;
      service['performanceMetrics'].totalRequests = 100;
      service['performanceMetrics'].successRate = 99;

      // Act
      const isCircuitOpen = service['shouldTriggerCircuitBreaker']();

      // Assert
      expect(isCircuitOpen).toBe(false);
    });

    it('should track concurrency history for analysis', async () => {
      // Arrange
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      const initialHistoryLength = service['performanceMetrics'].concurrencyHistory.length;

      // Act
      await service.establishStreamConnection(params);

      // Assert
      expect(service['performanceMetrics'].concurrencyHistory.length).toBeGreaterThan(initialHistoryLength);
      
      const latestEntry = service['performanceMetrics'].concurrencyHistory[
        service['performanceMetrics'].concurrencyHistory.length - 1
      ];
      expect(latestEntry).toHaveProperty('concurrency');
      expect(latestEntry).toHaveProperty('timestamp');
      expect(latestEntry).toHaveProperty('performance');
    });

    it('should maintain performance metrics window size', () => {
      // Arrange
      const windowSize = service['performanceMetrics'].windowSize;
      
      // Fill response times beyond window size
      for (let i = 0; i < windowSize + 50; i++) {
        service['performanceMetrics'].responseTimes.push(Math.random() * 100);
      }

      // Act
      service['maintainMetricsWindow']();

      // Assert
      expect(service['performanceMetrics'].responseTimes.length).toBeLessThanOrEqual(windowSize);
    });
  });

  describe('P2-1: StreamMonitoringService Integration', () => {
    it('should use StreamMonitoringService for connection monitoring', async () => {
      // Arrange
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      const mockStreamMonitoringService = service['streamMonitoringService'];

      // Act
      const connection = await service.establishStreamConnection(params);

      // Assert
      expect(mockStreamMonitoringService.startMonitoringConnection).toHaveBeenCalledWith(connection);
    });

    it('should stop monitoring connection when closing', async () => {
      // Arrange
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      const connection = await service.establishStreamConnection(params);
      const mockStreamMonitoringService = service['streamMonitoringService'];

      // Act
      await service.closeConnection(connection);

      // Assert
      expect(mockStreamMonitoringService.stopMonitoringConnection).toHaveBeenCalledWith(connection.id);
    });

    it('should handle monitoring service failures gracefully', async () => {
      // Arrange
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      const mockStreamMonitoringService = service['streamMonitoringService'];
      mockStreamMonitoringService.startMonitoringConnection.mockReturnValue(false);

      const loggerWarnSpy = jest.spyOn(service['logger'], 'warn');

      // Act
      const connection = await service.establishStreamConnection(params);

      // Assert
      expect(connection).toBeDefined();
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        '启动连接监控失败',
        expect.objectContaining({
          connectionId: connection.id,
        })
      );

      loggerWarnSpy.mockRestore();
    });
  });

  describe('Health Check Integration', () => {
    it('should include performance metrics in health check', () => {
      // Arrange
      service['performanceMetrics'].avgResponseTime = 150;
      service['performanceMetrics'].successRate = 95;
      service['performanceMetrics'].activeOperations = 5;

      // Act
      const healthInfo = service['getHealthInfo']();

      // Assert
      expect(healthInfo).toHaveProperty('performance');
      expect(healthInfo.performance).toHaveProperty('avgResponseTime', 150);
      expect(healthInfo.performance).toHaveProperty('successRate', 95);
      expect(healthInfo.performance).toHaveProperty('activeOperations', 5);
      expect(healthInfo.performance).toHaveProperty('currentConcurrency');
    });

    it('should include monitoring service status in health check', () => {
      // Arrange
      const mockStreamMonitoringService = service['streamMonitoringService'];
      mockStreamMonitoringService.getConnectionCount.mockReturnValue(3);
      mockStreamMonitoringService.isDestroyed = false;

      // Act
      const healthInfo = service['getHealthInfo']();

      // Assert
      expect(healthInfo).toHaveProperty('monitoring');
      expect(healthInfo.monitoring).toHaveProperty('connectionCount', 3);
      expect(healthInfo.monitoring).toHaveProperty('isDestroyed', false);
    });

    it('should report unhealthy status when circuit breaker is open', () => {
      // Arrange - simulate circuit breaker conditions
      service['performanceMetrics'].failedRequests = 20;
      service['performanceMetrics'].totalRequests = 25;
      service['performanceMetrics'].successRate = 20;

      // Act
      const healthInfo = service['getHealthInfo']();

      // Assert
      expect(healthInfo.status).toBe('unhealthy');
      expect(healthInfo).toHaveProperty('circuitBreaker');
      expect(healthInfo.circuitBreaker.isOpen).toBe(true);
    });

    it('should report healthy status under normal conditions', () => {
      // Arrange - simulate normal conditions
      service['performanceMetrics'].failedRequests = 2;
      service['performanceMetrics'].totalRequests = 100;
      service['performanceMetrics'].successRate = 98;
      service['performanceMetrics'].avgResponseTime = 80;

      // Act
      const healthInfo = service['getHealthInfo']();

      // Assert
      expect(healthInfo.status).toBe('healthy');
      expect(healthInfo.circuitBreaker.isOpen).toBe(false);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle performance tracking errors gracefully', async () => {
      // Arrange
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      // Mock performance tracking to throw error
      const originalRecordPerformance = service['recordOperationPerformance'];
      service['recordOperationPerformance'] = jest.fn().mockImplementation(() => {
        throw new Error('Performance tracking failed');
      });

      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

      // Act & Assert - should not throw, operation should complete
      const connection = await service.establishStreamConnection(params);
      expect(connection).toBeDefined();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        '记录性能指标失败',
        expect.any(Object)
      );

      // Cleanup
      service['recordOperationPerformance'] = originalRecordPerformance;
      loggerErrorSpy.mockRestore();
    });

    it('should continue operation if concurrency adjustment fails', async () => {
      // Arrange
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      // Mock concurrency calculation to throw error
      const originalCalculateOptimal = service['calculateOptimalConcurrency'];
      service['calculateOptimalConcurrency'] = jest.fn().mockImplementation(() => {
        throw new Error('Concurrency calculation failed');
      });

      const loggerErrorSpy = jest.spyOn(service['logger'], 'error');

      // Act & Assert - should not throw, operation should complete
      const connection = await service.establishStreamConnection(params);
      expect(connection).toBeDefined();

      // Cleanup
      service['calculateOptimalConcurrency'] = originalCalculateOptimal;
      loggerErrorSpy.mockRestore();
    });
  });

  describe('Performance Optimization', () => {
    it('should handle high-concurrency scenarios efficiently', async () => {
      // Arrange
      const concurrentRequests = 50;
      const promises: Promise<any>[] = [];

      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      const startTime = Date.now();

      // Act
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          service.establishStreamConnection({ ...params, requestId: uuidv4() })
        );
      }

      const connections = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(connections).toHaveLength(concurrentRequests);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(service['performanceMetrics'].totalRequests).toBe(concurrentRequests);
    });

    it('should maintain performance metrics accuracy under load', async () => {
      // Arrange
      const operationCount = 100;
      const params: StreamConnectionParams = {
        provider: 'longport',
        capability: 'ws-stock-quote',
        contextService: mockContextService,
        requestId: uuidv4(),
      };

      // Act
      for (let i = 0; i < operationCount; i++) {
        await service.establishStreamConnection({ ...params, requestId: uuidv4() });
      }

      // Assert
      expect(service['performanceMetrics'].totalRequests).toBe(operationCount);
      expect(service['performanceMetrics'].responseTimes.length).toBeLessThanOrEqual(
        service['performanceMetrics'].windowSize
      );
      expect(service['performanceMetrics'].avgResponseTime).toBeGreaterThan(0);
    });
  });
});
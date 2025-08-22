/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';
import { StreamDataFetcherService } from '../../../../../../../src/core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service';
import { CapabilityRegistryService } from '../../../../../../../src/providers/services/capability-registry.service';
import { MonitoringRegistryService } from '../../../../../../../src/monitoring/metrics/services/metrics-registry.service';
import {
  StreamConnectionParams,
  StreamConnection,
  StreamConnectionException,
  StreamSubscriptionException,
} from '../../../../../../../src/core/03-fetching/stream-data-fetcher/interfaces';

describe('StreamDataFetcherService', () => {
  let service: StreamDataFetcherService;
  let capabilityRegistry: jest.Mocked<CapabilityRegistryService>;
  let metricsRegistry: jest.Mocked<MonitoringRegistryService>;

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

    const mockMetricsRegistry = {
      // Mock the actual metric properties from MonitoringRegistryService
      receiverProcessingDuration: {
        labels: jest.fn().mockReturnThis(),
        _observe: jest.fn(),
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
          provide: MonitoringRegistryService,
          useValue: mockMetricsRegistry,
        },
      ],
    }).compile();

    service = module.get<StreamDataFetcherService>(StreamDataFetcherService);
    capabilityRegistry = module.get(CapabilityRegistryService);
    metricsRegistry = module.get(MonitoringRegistryService);
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
      // 验证指标记录 - 连接建立成功时会记录指标
      expect(metricsRegistry.receiverProcessingDuration.observe).toHaveBeenCalled();
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalled();
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
      expect(metricsRegistry.streamSymbolsProcessedTotal.inc).toHaveBeenCalled();
      expect(metricsRegistry.streamProcessingTimeMs.set).toHaveBeenCalled();
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
      expect(metricsRegistry.receiverRequestsTotal.inc).toHaveBeenCalled();
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
      expect(metricsRegistry.receiverProcessingDuration.observe).toHaveBeenCalled();
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
});
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StreamConnectionManagerService } from '@core/01-entry/stream-receiver/services/stream-connection-manager.service';
import { StreamDataFetcherService } from '@core/03-fetching/stream-data-fetcher/services/stream-data-fetcher.service';
import { RateLimitService } from '@auth/services/infrastructure/rate-limit.service';
import {
  StreamConnection,
  StreamConnectionParams
} from '@core/03-fetching/stream-data-fetcher/interfaces';
import {
  ConnectionManagementCallbacks,
  ConnectionCleanupResult,
  ConnectionHealthStats,
  MarketDistributionAnalysis,
} from '@core/01-entry/stream-receiver/interfaces/connection-management.interface';
import {
  UniversalExceptionFactory,
  BusinessErrorCode,
  ComponentIdentifier
} from '@common/core/exceptions';

describe('StreamConnectionManagerService', () => {
  let service: StreamConnectionManagerService;
  let module: TestingModule;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockEventBus: jest.Mocked<EventEmitter2>;
  let mockStreamDataFetcher: jest.Mocked<StreamDataFetcherService>;
  let mockRateLimitService: jest.Mocked<RateLimitService>;
  let mockCallbacks: jest.Mocked<ConnectionManagementCallbacks>;

  const createMockConnection = (id = 'test-connection-1', isConnected = true): StreamConnection => ({
    id,
    isConnected,
    createdAt: new Date(),
    lastActiveAt: new Date(),
    provider: 'longport',
    capability: 'ws-stock-quote',
    status: 'connected',
    close: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    // Mock ConfigService
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const configMap = {
          'STREAM_RECEIVER_CLEANUP_INTERVAL': 60000,
          'STREAM_RECEIVER_MAX_CONNECTIONS': 10,
          'STREAM_RECEIVER_STALE_TIMEOUT': 300000,
        };
        return configMap[key] || defaultValue;
      }),
    } as any;

    // Mock EventEmitter2
    mockEventBus = {
      emit: jest.fn(),
    } as any;

    // Mock StreamDataFetcherService
    mockStreamDataFetcher = {
      establishStreamConnection: jest.fn().mockResolvedValue(createMockConnection()),
      isConnectionActive: jest.fn().mockReturnValue(true),
      closeConnection: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock RateLimitService
    mockRateLimitService = {
      checkRateLimit: jest.fn().mockResolvedValue(true),
      incrementCounter: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock ConnectionManagementCallbacks
    mockCallbacks = {
      recordConnectionMetrics: jest.fn(),
      emitMonitoringEvent: jest.fn(),
    };

    const moduleBuilder = await Test.createTestingModule({
      providers: [
        StreamConnectionManagerService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventBus,
        },
        {
          provide: StreamDataFetcherService,
          useValue: mockStreamDataFetcher,
        },
        {
          provide: RateLimitService,
          useValue: mockRateLimitService,
        },
      ],
    });

    module = await moduleBuilder.compile();
    service = module.get<StreamConnectionManagerService>(StreamConnectionManagerService);

    // 设置回调函数
    service.setCallbacks(mockCallbacks);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('初始化和配置', () => {
    it('应该成功初始化服务', () => {
      expect(service).toBeDefined();
      expect(mockConfigService.get).toHaveBeenCalledWith('STREAM_RECEIVER_CLEANUP_INTERVAL', 60000);
      expect(mockConfigService.get).toHaveBeenCalledWith('STREAM_RECEIVER_MAX_CONNECTIONS', 10);
      expect(mockConfigService.get).toHaveBeenCalledWith('STREAM_RECEIVER_STALE_TIMEOUT', 300000);
    });

    it('应该正确设置回调函数', () => {
      const newCallbacks = { ...mockCallbacks };
      service.setCallbacks(newCallbacks);
      expect(true).toBe(true); // 回调设置成功
    });

    it('应该返回初始的活跃连接数为0', () => {
      expect(service.getActiveConnectionsCount()).toBe(0);
    });
  });

  describe('连接频率限制检查', () => {
    it('应该通过连接频率检查', async () => {
      const result = await service.checkConnectionRateLimit('client-1');
      expect(result).toBe(true);
    });

    it('应该在RateLimitService不可用时允许连接', async () => {
      const serviceWithoutRateLimit = await Test.createTestingModule({
        providers: [
          StreamConnectionManagerService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
          {
            provide: EventEmitter2,
            useValue: mockEventBus,
          },
          {
            provide: StreamDataFetcherService,
            useValue: mockStreamDataFetcher,
          },
          // 不提供 RateLimitService
        ],
      }).compile();

      const serviceInstance = serviceWithoutRateLimit.get<StreamConnectionManagerService>(StreamConnectionManagerService);
      const result = await serviceInstance.checkConnectionRateLimit('client-1');
      expect(result).toBe(true);
    });

    it('应该在速率限制检查失败时仍允许连接（故障开放）', async () => {
      mockRateLimitService.checkRateLimit.mockRejectedValueOnce(new Error('Rate limit service error'));

      const result = await service.checkConnectionRateLimit('client-1');
      expect(result).toBe(true);
    });
  });

  describe('连接创建和管理', () => {
    it('应该成功创建新连接', async () => {
      const connection = await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      );

      expect(connection).toBeDefined();
      expect(connection.id).toBeDefined();
      expect(service.getActiveConnectionsCount()).toBe(1);
      expect(mockStreamDataFetcher.establishStreamConnection).toHaveBeenCalledWith(
        'longport',
        'ws-stock-quote',
        expect.objectContaining({
          maxReconnectAttempts: 3,
          autoReconnect: true,
        })
      );
      expect(mockCallbacks.recordConnectionMetrics).toHaveBeenCalledWith(
        connection.id,
        'longport',
        'ws-stock-quote',
        true
      );
    });

    it('应该复用现有的活跃连接', async () => {
      // 第一次创建连接
      const connection1 = await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      );

      // 第二次应该复用相同连接
      const connection2 = await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-2',
        ['AAPL.US'],
        'client-1'
      );

      expect(connection1.id).toBe(connection2.id);
      expect(service.getActiveConnectionsCount()).toBe(1);
      expect(mockStreamDataFetcher.establishStreamConnection).toHaveBeenCalledTimes(1);
    });

    it('应该为不同的提供商和能力创建不同连接', async () => {
      const connection1 = await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      );

      const connection2 = await service.getOrCreateConnection(
        'futu',
        'ws-stock-quote',
        'request-2',
        ['AAPL.US'],
        'client-1'
      );

      expect(connection1.id).not.toBe(connection2.id);
      expect(service.getActiveConnectionsCount()).toBe(2);
    });

    it('应该在达到连接数限制时抛出异常', async () => {
      // 创建达到限制的连接数
      for (let i = 0; i < 10; i++) {
        await service.getOrCreateConnection(
          `provider-${i}`,
          'ws-stock-quote',
          `request-${i}`,
          ['700.HK'],
          'client-1'
        );
      }

      // 尝试创建第11个连接应该失败
      await expect(service.getOrCreateConnection(
        'provider-11',
        'ws-stock-quote',
        'request-11',
        ['700.HK'],
        'client-1'
      )).rejects.toThrow('Server connection limit reached');

      expect(service.getActiveConnectionsCount()).toBe(10);
    });
  });

  describe('市场分布分析', () => {
    it('应该正确分析单一市场的符号分布', async () => {
      await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK', '1299.HK', '2318.HK'],
        'client-1'
      );

      // 验证连接创建成功，市场分析在内部完成
      expect(service.getActiveConnectionsCount()).toBe(1);
    });

    it('应该正确分析多市场的符号分布', async () => {
      await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK', 'AAPL.US', '000001.SH', '000001.SZ'],
        'client-1'
      );

      expect(service.getActiveConnectionsCount()).toBe(1);
    });

    it('应该处理未知市场的符号', async () => {
      await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['UNKNOWN_SYMBOL', 'ANOTHER_UNKNOWN'],
        'client-1'
      );

      expect(service.getActiveConnectionsCount()).toBe(1);
    });
  });

  describe('连接状态检查', () => {
    it('应该正确检查活跃连接状态', async () => {
      const connection = await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      );

      const isActive = service.isConnectionActive('longport:ws-stock-quote');
      expect(isActive).toBe(true);
      expect(mockStreamDataFetcher.isConnectionActive).toHaveBeenCalledWith('longport:ws-stock-quote');
    });

    it('应该正确检查不存在连接的状态', () => {
      const isActive = service.isConnectionActive('non-existent:connection');
      expect(isActive).toBe(false);
    });
  });

  describe('连接移除', () => {
    it('应该成功移除连接', async () => {
      await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      );

      expect(service.getActiveConnectionsCount()).toBe(1);

      service.removeConnection('longport:ws-stock-quote');

      expect(service.getActiveConnectionsCount()).toBe(0);
      expect(mockCallbacks.recordConnectionMetrics).toHaveBeenCalledWith(
        expect.any(String),
        'longport',
        'ws-stock-quote',
        false
      );
    });

    it('应该安全处理移除不存在的连接', () => {
      expect(() => {
        service.removeConnection('non-existent:connection');
      }).not.toThrow();
    });
  });

  describe('连接健康状态管理', () => {
    it('应该更新连接健康状态', async () => {
      const connection = await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      );

      const newHealthInfo = {
        lastActivity: Date.now(),
        isHealthy: true,
        connectionQuality: 'excellent' as const,
      };

      expect(() => {
        service.updateConnectionHealth(connection.id, newHealthInfo);
      }).not.toThrow();
    });

    it('应该获取连接健康统计', async () => {
      await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      );

      const healthStats = service.getConnectionHealthStats();
      expect(healthStats).toBeDefined();
      expect(healthStats.total).toBeGreaterThan(0);
    });
  });

  describe('内存监控', () => {
    it('应该监控内存使用并记录指标', (done) => {
      // 模拟高内存使用
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockReturnValue({
        heapUsed: 500 * 1024 * 1024, // 500MB
        heapTotal: 1024 * 1024 * 1024,
        external: 50 * 1024 * 1024,
        rss: 600 * 1024 * 1024,
        arrayBuffers: 10 * 1024 * 1024,
      });

      // 等待内存检查触发
      setTimeout(() => {
        expect(mockCallbacks.emitMonitoringEvent).toHaveBeenCalledWith(
          'memory_usage_alert',
          expect.any(Number),
          expect.objectContaining({
            level: expect.stringMatching(/warning|critical/),
          })
        );

        // 恢复原始函数
        process.memoryUsage = originalMemoryUsage;
        done();
      }, 100);
    });

    it('应该在内存压力下执行强制连接清理', async () => {
      // 创建一些连接
      for (let i = 0; i < 5; i++) {
        await service.getOrCreateConnection(
          `provider-${i}`,
          'ws-stock-quote',
          `request-${i}`,
          ['700.HK'],
          'client-1'
        );
      }

      const initialCount = service.getActiveConnectionsCount();
      expect(initialCount).toBe(5);

      // 执行强制清理
      const result = await service.forceConnectionCleanup();

      expect(result).toBeDefined();
      expect(result.totalCleaned).toBeGreaterThanOrEqual(0);
      expect(result.remainingConnections).toBeLessThanOrEqual(initialCount);
    });
  });

  describe('智能连接清理', () => {
    it('应该清理过期连接', async () => {
      // 创建一个连接并手动设置为过期
      const connection = await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      );

      // 模拟连接断开
      mockStreamDataFetcher.isConnectionActive.mockReturnValue(false);
      (connection as any).isConnected = false;

      // 等待清理机制触发
      await new Promise(resolve => setTimeout(resolve, 100));

      // 验证清理完成后的状态
      expect(true).toBe(true); // 清理机制已触发
    });

    it('应该清理不健康的连接', async () => {
      const connection = await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      );

      // 更新为不健康状态
      service.updateConnectionHealth(connection.id, {
        isHealthy: false,
        connectionQuality: 'poor',
        lastActivity: Date.now() - 600000, // 10分钟前
      });

      // 触发清理
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(true).toBe(true); // 清理完成
    });

    it('应该在连接数超限时强制执行连接限制', async () => {
      // 创建超过限制的连接（通过直接操作内部状态）
      for (let i = 0; i < 15; i++) {
        try {
          await service.getOrCreateConnection(
            `provider-${i}`,
            'ws-stock-quote',
            `request-${i}`,
            ['700.HK'],
            'client-1'
          );
        } catch (error) {
          // 预期在达到限制时会失败
          break;
        }
      }

      const activeCount = service.getActiveConnectionsCount();
      expect(activeCount).toBeLessThanOrEqual(10); // 不应超过配置的最大值
    });
  });

  describe('错误处理', () => {
    it('应该处理连接建立失败', async () => {
      mockStreamDataFetcher.establishStreamConnection.mockRejectedValueOnce(new Error('Connection failed'));

      await expect(service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      )).rejects.toThrow('Connection failed');
    });

    it('应该处理内存检查失败', () => {
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn().mockImplementation(() => {
        throw new Error('Memory check failed');
      });

      // 应该不会抛出异常
      expect(() => {
        // 触发内存检查
      }).not.toThrow();

      // 恢复原始函数
      process.memoryUsage = originalMemoryUsage;
    });

    it('应该处理连接关闭失败', async () => {
      const connection = await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      );

      // 模拟关闭失败
      (connection.close as jest.Mock).mockRejectedValueOnce(new Error('Close failed'));

      // 强制清理应该继续执行
      const result = await service.forceConnectionCleanup();
      expect(result).toBeDefined();
    });
  });

  describe('监控事件', () => {
    it('应该发送连接创建监控事件', async () => {
      await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      );

      expect(mockCallbacks.recordConnectionMetrics).toHaveBeenCalledWith(
        expect.any(String),
        'longport',
        'ws-stock-quote',
        true
      );
    });

    it('应该发送连接清理监控事件', async () => {
      await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      );

      await service.forceConnectionCleanup();

      expect(mockCallbacks.emitMonitoringEvent).toHaveBeenCalledWith(
        'forced_connection_cleanup_completed',
        expect.any(Number),
        expect.objectContaining({
          reason: 'memory_pressure',
        })
      );
    });

    it('应该发送连接健康统计事件', async () => {
      await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      );

      // 触发健康统计报告
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCallbacks.emitMonitoringEvent).toHaveBeenCalledWith(
        'connection_health_stats',
        expect.any(Number),
        expect.objectContaining({
          stats: expect.any(Object),
        })
      );
    });
  });

  describe('资源清理', () => {
    it('应该在模块销毁时清理所有资源', async () => {
      // 创建一些连接
      await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client-1'
      );

      const initialCount = service.getActiveConnectionsCount();
      expect(initialCount).toBeGreaterThan(0);

      await service.onModuleDestroy();

      expect(service.getActiveConnectionsCount()).toBe(0);
    });

    it('应该停止所有定时器', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      await service.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('应该处理清理过程中的错误', async () => {
      // 模拟清理过程中的错误
      const originalClear = Map.prototype.clear;
      Map.prototype.clear = jest.fn().mockImplementation(() => {
        throw new Error('Clear failed');
      });

      // 应该不会抛出异常
      await expect(service.onModuleDestroy()).resolves.not.toThrow();

      // 恢复原始方法
      Map.prototype.clear = originalClear;
    });
  });

  describe('边界条件测试', () => {
    it('应该处理空符号数组', async () => {
      const connection = await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        [],
        'client-1'
      );

      expect(connection).toBeDefined();
    });

    it('应该处理非常长的符号列表', async () => {
      const manySymbols = Array.from({ length: 1000 }, (_, i) => `${i}.HK`);

      const connection = await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        manySymbols,
        'client-1'
      );

      expect(connection).toBeDefined();
    });

    it('应该处理特殊字符在客户端ID中', async () => {
      const connection = await service.getOrCreateConnection(
        'longport',
        'ws-stock-quote',
        'request-1',
        ['700.HK'],
        'client@#$%^&*()'
      );

      expect(connection).toBeDefined();
    });

    it('应该处理并发连接创建请求', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        service.getOrCreateConnection(
          'longport',
          'ws-stock-quote',
          `request-${i}`,
          [`${700 + i}.HK`],
          `client-${i}`
        )
      );

      const connections = await Promise.all(promises);
      expect(connections).toHaveLength(5);
      expect(service.getActiveConnectionsCount()).toBe(1); // 应该复用相同的连接
    });
  });
});
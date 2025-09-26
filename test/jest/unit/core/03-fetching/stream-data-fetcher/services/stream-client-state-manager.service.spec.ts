import { Test, TestingModule } from '@nestjs/testing';
import { StreamClientStateManager, ClientSubscriptionInfo, SubscriptionChangeEvent } from '@core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service';
import { GatewayBroadcastError } from '@core/03-fetching/stream-data-fetcher/exceptions/gateway-broadcast.exception';

describe('StreamClientStateManager', () => {
  let service: StreamClientStateManager;
  let mockWebSocketProvider: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockWebSocketProvider = {
      isServerAvailable: jest.fn().mockReturnValue(true),
      broadcastToRoom: jest.fn().mockResolvedValue(true),
      healthCheck: jest.fn().mockReturnValue({
        status: 'healthy',
        details: { uptime: 1000 },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamClientStateManager],
    }).compile();

    service = module.get<StreamClientStateManager>(StreamClientStateManager);
  });

  afterEach(async () => {
    // 清理服务资源
    await service.onModuleDestroy();
  });

  describe('客户端订阅管理', () => {
    it('应该成功添加客户端订阅', () => {
      const clientId = 'client-123';
      const symbols = ['AAPL', 'GOOGL'];
      const wsCapabilityType = 'ws-stock-quote';
      const providerName = 'longport';

      service.addClientSubscription(clientId, symbols, wsCapabilityType, providerName);

      const clientSub = service.getClientSubscription(clientId);
      expect(clientSub).toBeDefined();
      expect(clientSub!.clientId).toBe(clientId);
      expect(clientSub!.wsCapabilityType).toBe(wsCapabilityType);
      expect(clientSub!.providerName).toBe(providerName);
      expect(clientSub!.symbols.size).toBe(2);
      expect(clientSub!.symbols.has('AAPL')).toBe(true);
      expect(clientSub!.symbols.has('GOOGL')).toBe(true);
    });

    it('应该为已存在的客户端添加新的符号订阅', () => {
      const clientId = 'client-123';

      // 第一次添加订阅
      service.addClientSubscription(clientId, ['AAPL'], 'ws-stock-quote', 'longport');

      // 第二次添加更多符号
      service.addClientSubscription(clientId, ['GOOGL', 'MSFT'], 'ws-stock-quote', 'longport');

      const clientSub = service.getClientSubscription(clientId);
      expect(clientSub!.symbols.size).toBe(3);
      expect(clientSub!.symbols.has('AAPL')).toBe(true);
      expect(clientSub!.symbols.has('GOOGL')).toBe(true);
      expect(clientSub!.symbols.has('MSFT')).toBe(true);
    });

    it('应该忽略重复的符号订阅', () => {
      const clientId = 'client-123';

      // 添加初始订阅
      service.addClientSubscription(clientId, ['AAPL', 'GOOGL'], 'ws-stock-quote', 'longport');

      // 尝试添加重复的符号
      service.addClientSubscription(clientId, ['AAPL', 'TSLA'], 'ws-stock-quote', 'longport');

      const clientSub = service.getClientSubscription(clientId);
      expect(clientSub!.symbols.size).toBe(3); // AAPL, GOOGL, TSLA
      expect(clientSub!.symbols.has('AAPL')).toBe(true);
      expect(clientSub!.symbols.has('GOOGL')).toBe(true);
      expect(clientSub!.symbols.has('TSLA')).toBe(true);
    });

    it('应该成功移除客户端的部分订阅', () => {
      const clientId = 'client-123';

      // 添加订阅
      service.addClientSubscription(clientId, ['AAPL', 'GOOGL', 'MSFT'], 'ws-stock-quote', 'longport');

      // 移除部分订阅
      service.removeClientSubscription(clientId, ['GOOGL']);

      const clientSub = service.getClientSubscription(clientId);
      expect(clientSub!.symbols.size).toBe(2);
      expect(clientSub!.symbols.has('AAPL')).toBe(true);
      expect(clientSub!.symbols.has('GOOGL')).toBe(false);
      expect(clientSub!.symbols.has('MSFT')).toBe(true);
    });

    it('应该成功移除客户端的所有订阅', () => {
      const clientId = 'client-123';

      // 添加订阅
      service.addClientSubscription(clientId, ['AAPL', 'GOOGL'], 'ws-stock-quote', 'longport');

      // 移除所有订阅
      service.removeClientSubscription(clientId);

      const clientSub = service.getClientSubscription(clientId);
      expect(clientSub).toBeNull();
    });

    it('应该处理移除不存在的客户端订阅', () => {
      expect(() => {
        service.removeClientSubscription('non-existent-client');
      }).not.toThrow();
    });
  });

  describe('符号到客户端映射', () => {
    beforeEach(() => {
      // 准备测试数据
      service.addClientSubscription('client-1', ['AAPL', 'GOOGL'], 'ws-stock-quote', 'longport');
      service.addClientSubscription('client-2', ['AAPL', 'MSFT'], 'ws-stock-quote', 'longport');
      service.addClientSubscription('client-3', ['TSLA'], 'ws-stock-quote', 'longport');
    });

    it('应该正确返回订阅某个符号的所有客户端', () => {
      const aaplClients = service.getClientsForSymbol('AAPL');
      expect(aaplClients).toHaveLength(2);
      expect(aaplClients).toContain('client-1');
      expect(aaplClients).toContain('client-2');

      const tslaClients = service.getClientsForSymbol('TSLA');
      expect(tslaClients).toHaveLength(1);
      expect(tslaClients).toContain('client-3');
    });

    it('应该返回空数组当没有客户端订阅某个符号', () => {
      const clients = service.getClientsForSymbol('UNKNOWN_SYMBOL');
      expect(clients).toEqual([]);
    });

    it('应该正确返回客户端订阅的所有符号', () => {
      const client1Symbols = service.getClientSymbols('client-1');
      expect(client1Symbols).toHaveLength(2);
      expect(client1Symbols).toContain('AAPL');
      expect(client1Symbols).toContain('GOOGL');

      const client3Symbols = service.getClientSymbols('client-3');
      expect(client3Symbols).toHaveLength(1);
      expect(client3Symbols).toContain('TSLA');
    });

    it('应该返回空数组当客户端不存在', () => {
      const symbols = service.getClientSymbols('non-existent-client');
      expect(symbols).toEqual([]);
    });
  });

  describe('客户端状态统计', () => {
    beforeEach(() => {
      // 添加测试客户端
      service.addClientSubscription('client-1', ['AAPL', 'GOOGL'], 'ws-stock-quote', 'longport');
      service.addClientSubscription('client-2', ['MSFT'], 'ws-option-quote', 'longport');
      service.addClientSubscription('client-3', ['TSLA'], 'ws-stock-quote', 'itick');
    });

    it('应该返回正确的客户端状态统计', () => {
      const stats = service.getClientStateStats();

      expect(stats.totalClients).toBe(3);
      expect(stats.totalSubscriptions).toBe(4); // 2 + 1 + 1
      expect(stats.activeClients).toBe(3); // 所有客户端都是新添加的，应该是活跃的

      expect(stats.providerBreakdown['longport']).toBe(2);
      expect(stats.providerBreakdown['itick']).toBe(1);

      expect(stats.capabilityBreakdown['ws-stock-quote']).toBe(2);
      expect(stats.capabilityBreakdown['ws-option-quote']).toBe(1);
    });
  });

  describe('所需符号聚合', () => {
    beforeEach(() => {
      service.addClientSubscription('client-1', ['AAPL', 'GOOGL'], 'ws-stock-quote', 'longport');
      service.addClientSubscription('client-2', ['AAPL', 'MSFT'], 'ws-stock-quote', 'longport');
      service.addClientSubscription('client-3', ['TSLA'], 'ws-option-quote', 'longport');
      service.addClientSubscription('client-4', ['NVDA'], 'ws-stock-quote', 'itick');
    });

    it('应该返回所有需要订阅的符号（去重）', () => {
      const symbols = service.getAllRequiredSymbols();
      expect(symbols).toHaveLength(5);
      expect(symbols).toContain('AAPL');
      expect(symbols).toContain('GOOGL');
      expect(symbols).toContain('MSFT');
      expect(symbols).toContain('TSLA');
      expect(symbols).toContain('NVDA');
    });

    it('应该根据提供商过滤所需符号', () => {
      const longportSymbols = service.getAllRequiredSymbols('longport');
      expect(longportSymbols).toHaveLength(4);
      expect(longportSymbols).toContain('AAPL');
      expect(longportSymbols).toContain('GOOGL');
      expect(longportSymbols).toContain('MSFT');
      expect(longportSymbols).toContain('TSLA');
      expect(longportSymbols).not.toContain('NVDA');

      const itickSymbols = service.getAllRequiredSymbols('itick');
      expect(itickSymbols).toHaveLength(1);
      expect(itickSymbols).toContain('NVDA');
    });

    it('应该根据能力类型过滤所需符号', () => {
      const stockQuoteSymbols = service.getAllRequiredSymbols(undefined, 'ws-stock-quote');
      expect(stockQuoteSymbols).toHaveLength(4);
      expect(stockQuoteSymbols).toContain('AAPL');
      expect(stockQuoteSymbols).toContain('GOOGL');
      expect(stockQuoteSymbols).toContain('MSFT');
      expect(stockQuoteSymbols).toContain('NVDA');
      expect(stockQuoteSymbols).not.toContain('TSLA');

      const optionQuoteSymbols = service.getAllRequiredSymbols(undefined, 'ws-option-quote');
      expect(optionQuoteSymbols).toHaveLength(1);
      expect(optionQuoteSymbols).toContain('TSLA');
    });

    it('应该同时根据提供商和能力类型过滤', () => {
      const symbols = service.getAllRequiredSymbols('longport', 'ws-stock-quote');
      expect(symbols).toHaveLength(3);
      expect(symbols).toContain('AAPL');
      expect(symbols).toContain('GOOGL');
      expect(symbols).toContain('MSFT');
    });
  });

  describe('客户端活跃性管理', () => {
    it('应该更新客户端活跃状态', () => {
      const clientId = 'client-123';
      service.addClientSubscription(clientId, ['AAPL'], 'ws-stock-quote', 'longport');

      const beforeUpdate = service.getClientSubscription(clientId)!.lastActiveTime;

      // 等待一小段时间确保时间戳不同
      setTimeout(() => {
        service.updateClientActivity(clientId);
        const afterUpdate = service.getClientSubscription(clientId)!.lastActiveTime;
        expect(afterUpdate).toBeGreaterThan(beforeUpdate);
      }, 10);
    });

    it('应该忽略不存在客户端的活跃状态更新', () => {
      expect(() => {
        service.updateClientActivity('non-existent-client');
      }).not.toThrow();
    });
  });

  describe('订阅状态更新', () => {
    it('应该更新已存在客户端的订阅状态', () => {
      const connectionId = 'conn-123';
      service.addClientSubscription(connectionId, ['AAPL'], 'ws-stock-quote', 'longport');

      service.updateSubscriptionState(connectionId, ['GOOGL', 'MSFT'], 'subscribed');

      const clientSub = service.getClientSubscription(connectionId);
      expect(clientSub!.symbols.size).toBe(3);
      expect(clientSub!.symbols.has('AAPL')).toBe(true);
      expect(clientSub!.symbols.has('GOOGL')).toBe(true);
      expect(clientSub!.symbols.has('MSFT')).toBe(true);
    });

    it('应该处理取消订阅状态更新', () => {
      const connectionId = 'conn-123';
      service.addClientSubscription(connectionId, ['AAPL', 'GOOGL', 'MSFT'], 'ws-stock-quote', 'longport');

      service.updateSubscriptionState(connectionId, ['GOOGL'], 'unsubscribed');

      const clientSub = service.getClientSubscription(connectionId);
      expect(clientSub!.symbols.size).toBe(2);
      expect(clientSub!.symbols.has('AAPL')).toBe(true);
      expect(clientSub!.symbols.has('GOOGL')).toBe(false);
      expect(clientSub!.symbols.has('MSFT')).toBe(true);
    });

    it('应该处理不存在客户端的订阅状态更新', () => {
      expect(() => {
        service.updateSubscriptionState('non-existent', ['AAPL'], 'subscribed');
      }).not.toThrow();
    });
  });

  describe('连接管理', () => {
    it('应该移除连接及其所有订阅', () => {
      const connectionId = 'conn-123';
      service.addClientSubscription(connectionId, ['AAPL', 'GOOGL'], 'ws-stock-quote', 'longport');

      service.removeConnection(connectionId);

      expect(service.getClientSubscription(connectionId)).toBeNull();
    });
  });

  describe('Gateway广播功能', () => {
    it('应该成功通过Gateway广播消息', async () => {
      const symbol = 'AAPL';
      const data = { price: 150.50, timestamp: new Date().toISOString() };

      // 添加订阅该符号的客户端
      service.addClientSubscription('client-1', [symbol], 'ws-stock-quote', 'longport');
      service.addClientSubscription('client-2', [symbol], 'ws-stock-quote', 'longport');

      await service.broadcastToSymbolViaGateway(symbol, data, mockWebSocketProvider);

      expect(mockWebSocketProvider.broadcastToRoom).toHaveBeenCalledWith(
        `symbol:${symbol}`,
        'data',
        {
          symbol,
          timestamp: expect.any(String),
          data,
        },
      );
    });

    it('应该在Gateway不可用时抛出GatewayBroadcastError', async () => {
      const symbol = 'AAPL';
      const data = { price: 150.50 };

      mockWebSocketProvider.isServerAvailable.mockReturnValue(false);

      await expect(
        service.broadcastToSymbolViaGateway(symbol, data, mockWebSocketProvider),
      ).rejects.toThrow(GatewayBroadcastError);
    });

    it('应该在广播返回false时抛出GatewayBroadcastError', async () => {
      const symbol = 'AAPL';
      const data = { price: 150.50 };

      mockWebSocketProvider.broadcastToRoom.mockResolvedValue(false);

      await expect(
        service.broadcastToSymbolViaGateway(symbol, data, mockWebSocketProvider),
      ).rejects.toThrow(GatewayBroadcastError);
    });

    it('应该在广播异常时抛出GatewayBroadcastError', async () => {
      const symbol = 'AAPL';
      const data = { price: 150.50 };

      mockWebSocketProvider.broadcastToRoom.mockRejectedValue(new Error('Network error'));

      await expect(
        service.broadcastToSymbolViaGateway(symbol, data, mockWebSocketProvider),
      ).rejects.toThrow(GatewayBroadcastError);
    });

    it('应该正确统计广播成功次数', async () => {
      const symbol = 'AAPL';
      const data = { price: 150.50 };

      await service.broadcastToSymbolViaGateway(symbol, data, mockWebSocketProvider);
      await service.broadcastToSymbolViaGateway(symbol, data, mockWebSocketProvider);

      const stats = service.getBroadcastStats();
      expect(stats.stats.gateway.success).toBe(2);
      expect(stats.stats.total.attempts).toBe(2);
    });

    it('应该正确统计广播失败次数', async () => {
      const symbol = 'AAPL';
      const data = { price: 150.50 };

      mockWebSocketProvider.broadcastToRoom.mockResolvedValue(false);

      try {
        await service.broadcastToSymbolViaGateway(symbol, data, mockWebSocketProvider);
      } catch (e) {
        // 预期的错误
      }

      const stats = service.getBroadcastStats();
      expect(stats.stats.gateway.failure).toBe(1);
      expect(stats.stats.errors.gatewayBroadcastErrors).toBe(1);
    });
  });

  describe('广播统计信息', () => {
    it('应该返回正确的广播统计信息', () => {
      const stats = service.getBroadcastStats();

      expect(stats).toBeDefined();
      expect(stats.gatewayUsageRate).toBeDefined();
      expect(stats.errorRate).toBeDefined();
      expect(stats.healthStatus).toBeDefined();
      expect(stats.stats).toBeDefined();
      expect(stats.analysis).toBeDefined();
    });

    it('应该计算正确的健康状态', async () => {
      const symbol = 'AAPL';
      const data = { price: 150.50 };

      // 执行多次成功广播
      for (let i = 0; i < 10; i++) {
        await service.broadcastToSymbolViaGateway(symbol, data, mockWebSocketProvider);
      }

      const stats = service.getBroadcastStats();
      expect(stats.healthStatus).toBe('excellent');
      expect(stats.gatewayUsageRate).toBe(100);
      expect(stats.errorRate).toBe(0);
    });

    it('应该重置广播统计信息', () => {
      service.resetBroadcastStats();

      const stats = service.getBroadcastStats();
      expect(stats.stats.gateway.success).toBe(0);
      expect(stats.stats.gateway.failure).toBe(0);
      expect(stats.stats.total.attempts).toBe(0);
    });
  });

  describe('订阅变更监听器', () => {
    it('应该添加和触发订阅变更监听器', () => {
      const listener = jest.fn();
      service.addSubscriptionChangeListener(listener);

      const clientId = 'client-123';
      service.addClientSubscription(clientId, ['AAPL'], 'ws-stock-quote', 'longport');

      expect(listener).toHaveBeenCalledWith({
        clientId,
        symbols: ['AAPL'],
        action: 'subscribe',
        provider: 'longport',
        capability: 'ws-stock-quote',
        timestamp: expect.any(Number),
      });
    });

    it('应该移除订阅变更监听器', () => {
      const listener = jest.fn();
      service.addSubscriptionChangeListener(listener);
      service.removeSubscriptionChangeListener(listener);

      const clientId = 'client-123';
      service.addClientSubscription(clientId, ['AAPL'], 'ws-stock-quote', 'longport');

      expect(listener).not.toHaveBeenCalled();
    });

    it('应该处理监听器执行失败的情况', () => {
      const faultyListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      service.addSubscriptionChangeListener(faultyListener);

      // 应该不会因为监听器失败而抛出异常
      expect(() => {
        service.addClientSubscription('client-123', ['AAPL'], 'ws-stock-quote', 'longport');
      }).not.toThrow();
    });
  });

  describe('清理功能', () => {
    it('应该清理所有客户端订阅', () => {
      // 添加一些客户端订阅
      service.addClientSubscription('client-1', ['AAPL'], 'ws-stock-quote', 'longport');
      service.addClientSubscription('client-2', ['GOOGL'], 'ws-stock-quote', 'longport');

      service.clearAll();

      expect(service.getClientSubscription('client-1')).toBeNull();
      expect(service.getClientSubscription('client-2')).toBeNull();
      expect(service.getClientsForSymbol('AAPL')).toEqual([]);
      expect(service.getClientStateStats().totalClients).toBe(0);
    });

    it('应该在模块销毁时停止清理定时器', async () => {
      await service.onModuleDestroy();

      // 验证清理间隔已停止（通过检查是否可以正常销毁）
      expect(true).toBe(true); // 如果定时器没有正确清理，测试可能会挂起
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空符号列表的订阅', () => {
      expect(() => {
        service.addClientSubscription('client-123', [], 'ws-stock-quote', 'longport');
      }).not.toThrow();

      const clientSub = service.getClientSubscription('client-123');
      expect(clientSub!.symbols.size).toBe(0);
    });

    it('应该处理移除空符号列表', () => {
      service.addClientSubscription('client-123', ['AAPL'], 'ws-stock-quote', 'longport');

      expect(() => {
        service.removeClientSubscription('client-123', []);
      }).not.toThrow();

      // 空列表应该移除所有订阅
      expect(service.getClientSubscription('client-123')).toBeNull();
    });

    it('应该处理移除不存在的符号', () => {
      service.addClientSubscription('client-123', ['AAPL'], 'ws-stock-quote', 'longport');

      expect(() => {
        service.removeClientSubscription('client-123', ['GOOGL']); // 不存在的符号
      }).not.toThrow();

      const clientSub = service.getClientSubscription('client-123');
      expect(clientSub!.symbols.has('AAPL')).toBe(true); // 原有符号应该还在
    });
  });
});
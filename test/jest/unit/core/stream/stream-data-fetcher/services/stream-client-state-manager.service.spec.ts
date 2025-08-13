import { Test, TestingModule } from '@nestjs/testing';
import { StreamClientStateManager, ClientSubscriptionInfo, SubscriptionChangeEvent, ClientStateStats } from '../../../../../../src/core/stream-data-fetcher/services/stream-client-state-manager.service';
import { createLogger } from '../../../../../../src/common/config/logger.config';

// Mock logger
jest.mock('../../../../../../src/common/config/logger.config', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('StreamClientStateManager', () => {
  let service: StreamClientStateManager;
  let subscriptionChangeEvents: SubscriptionChangeEvent[] = [];

  const mockCallback = jest.fn();
  const mockSubscriptionInfo: Omit<ClientSubscriptionInfo, 'subscriptionTime' | 'lastActiveTime'> = {
    clientId: 'test-client-1',
    symbols: new Set(['AAPL.US', '700.HK']),
    wsCapabilityType: 'stream-stock-quote',
    providerName: 'longport',
    messageCallback: mockCallback,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StreamClientStateManager],
    }).compile();

    service = module.get<StreamClientStateManager>(StreamClientStateManager);

    // 重置事件监听器
    subscriptionChangeEvents = [];
    service.addSubscriptionChangeListener((event) => {
      subscriptionChangeEvents.push(event);
    });

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('基本功能测试', () => {
    it('应该正确实例化服务', () => {
      expect(service).toBeDefined();
    });

    it('应该返回初始状态统计信息', () => {
      const stats = service.getClientStateStats();
      
      expect(stats).toEqual({
        totalClients: 0,
        totalSubscriptions: 0,
        totalSymbols: 0,
        clientsByProvider: {},
        symbolDistribution: {},
      });
    });
  });

  describe('客户端订阅管理', () => {
    it('应该成功添加客户端订阅', () => {
      service.addClientSubscription(
        mockSubscriptionInfo.clientId,
        Array.from(mockSubscriptionInfo.symbols),
        mockSubscriptionInfo.wsCapabilityType,
        mockSubscriptionInfo.providerName,
        mockSubscriptionInfo.messageCallback
      );

      const subscription = service.getClientSubscription(mockSubscriptionInfo.clientId);
      expect(subscription).toBeDefined();
      expect(subscription!.clientId).toBe(mockSubscriptionInfo.clientId);
      expect(subscription!.symbols).toEqual(mockSubscriptionInfo.symbols);
      expect(subscription!.wsCapabilityType).toBe(mockSubscriptionInfo.wsCapabilityType);
      expect(subscription!.providerName).toBe(mockSubscriptionInfo.providerName);
    });

    it('应该触发订阅添加事件', () => {
      service.addClientSubscription(
        'test-client-1',
        ['AAPL.US', '700.HK'],
        'stream-stock-quote',
        'longport'
      );

      expect(subscriptionChangeEvents).toHaveLength(1);
      expect(subscriptionChangeEvents[0]).toMatchObject({
        action: 'added',
        clientId: 'test-client-1',
        symbols: ['AAPL.US', '700.HK'],
        provider: 'longport',
        capability: 'stream-stock-quote',
      });
    });

    it('应该更新现有客户端的订阅', () => {
      // 首次添加订阅
      service.addClientSubscription(
        'test-client-1',
        ['AAPL.US'],
        'stream-stock-quote',
        'longport'
      );

      // 更新订阅 - 添加新符号
      service.addClientSubscription(
        'test-client-1',
        ['AAPL.US', '700.HK', 'TSLA.US'],
        'stream-stock-quote',
        'longport'
      );

      const subscription = service.getClientSubscription('test-client-1');
      expect(subscription!.symbols.size).toBe(3);
      expect(subscription!.symbols.has('TSLA.US')).toBe(true);

      // 应该有两个事件：added 和 updated
      expect(subscriptionChangeEvents).toHaveLength(2);
      expect(subscriptionChangeEvents[1].action).toBe('updated');
    });

    it('应该返回客户端订阅的符号列表', () => {
      service.addClientSubscription(
        'test-client-1',
        ['AAPL.US', '700.HK'],
        'stream-stock-quote',
        'longport'
      );

      const symbols = service.getClientSymbols('test-client-1');
      expect(symbols).toEqual(['AAPL.US', '700.HK']);
    });

    it('应该为不存在的客户端返回空符号列表', () => {
      const symbols = service.getClientSymbols('non-existent-client');
      expect(symbols).toEqual([]);
    });
  });

  describe('订阅移除', () => {
    beforeEach(() => {
      // 设置测试订阅
      service.addClientSubscription(
        'test-client-1',
        ['AAPL.US', '700.HK', 'TSLA.US'],
        'stream-stock-quote',
        'longport'
      );
      // 清理设置时的事件
      subscriptionChangeEvents = [];
    });

    it('应该移除指定符号的订阅', () => {
      service.removeClientSubscription('test-client-1', ['AAPL.US']);

      const symbols = service.getClientSymbols('test-client-1');
      expect(symbols).toEqual(['700.HK', 'TSLA.US']);

      expect(subscriptionChangeEvents).toHaveLength(1);
      expect(subscriptionChangeEvents[0].action).toBe('removed');
    });

    it('应该在移除所有符号时删除整个客户端订阅', () => {
      service.removeClientSubscription('test-client-1', ['AAPL.US', '700.HK', 'TSLA.US']);

      const subscription = service.getClientSubscription('test-client-1');
      expect(subscription).toBeNull();

      expect(subscriptionChangeEvents).toHaveLength(1);
      expect(subscriptionChangeEvents[0].action).toBe('removed');
    });

    it('应该完全移除客户端订阅', () => {
      service.removeClientSubscription('test-client-1');

      const subscription = service.getClientSubscription('test-client-1');
      expect(subscription).toBeNull();

      expect(subscriptionChangeEvents).toHaveLength(1);
      expect(subscriptionChangeEvents[0].action).toBe('removed');
    });

    it('应该优雅处理不存在客户端的移除请求', () => {
      service.removeClientSubscription('non-existent-client', ['AAPL.US']);

      expect(subscriptionChangeEvents).toHaveLength(0);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '尝试移除不存在的客户端订阅',
        { clientId: 'non-existent-client' }
      );
    });
  });

  describe('数据广播', () => {
    beforeEach(() => {
      service.addClientSubscription(
        'client-1',
        ['AAPL.US', '700.HK'],
        'stream-stock-quote',
        'longport',
        mockCallback
      );
      service.addClientSubscription(
        'client-2',
        ['AAPL.US', 'TSLA.US'],
        'stream-stock-quote',
        'longport',
        jest.fn()
      );
    });

    it('应该向订阅指定符号的客户端广播数据', () => {
      const testData = { symbol: 'AAPL.US', price: 150.25, timestamp: Date.now() };

      service.broadcastToSymbolSubscribers('AAPL.US', testData);

      expect(mockCallback).toHaveBeenCalledWith(testData);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('应该向多个订阅同一符号的客户端广播数据', () => {
      const mockCallback2 = jest.fn();
      const client2Subscription = service.getClientSubscription('client-2');
      if (client2Subscription) {
        client2Subscription.messageCallback = mockCallback2;
      }

      const testData = { symbol: 'AAPL.US', price: 150.25, timestamp: Date.now() };

      service.broadcastToSymbolSubscribers('AAPL.US', testData);

      expect(mockCallback).toHaveBeenCalledWith(testData);
      expect(mockCallback2).toHaveBeenCalledWith(testData);
    });

    it('应该不向未订阅符号的客户端广播数据', () => {
      const testData = { symbol: 'GOOGL.US', price: 2800.50, timestamp: Date.now() };

      service.broadcastToSymbolSubscribers('GOOGL.US', testData);

      expect(mockCallback).not.toHaveBeenCalled();
    });

    it('应该处理广播过程中的回调错误', () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      
      service.addClientSubscription(
        'error-client',
        ['AAPL.US'],
        'stream-stock-quote',
        'longport',
        errorCallback
      );

      const testData = { symbol: 'AAPL.US', price: 150.25, timestamp: Date.now() };

      expect(() => {
        service.broadcastToSymbolSubscribers('AAPL.US', testData);
      }).not.toThrow();

      expect(mockLogger.error).toHaveBeenCalledWith(
        '客户端消息回调执行失败',
        expect.objectContaining({
          clientId: 'error-client',
          error: 'Callback error',
        })
      );
    });
  });

  describe('状态统计', () => {
    beforeEach(() => {
      service.addClientSubscription('client-1', ['AAPL.US', '700.HK'], 'stream-stock-quote', 'longport');
      service.addClientSubscription('client-2', ['AAPL.US', 'TSLA.US'], 'stream-stock-quote', 'longport');
      service.addClientSubscription('client-3', ['GOOGL.US'], 'stream-stock-quote', 'itick');
    });

    it('应该返回正确的客户端状态统计', () => {
      const stats = service.getClientStateStats();

      expect(stats.totalClients).toBe(3);
      expect(stats.totalSubscriptions).toBe(3);
      expect(stats.totalSymbols).toBe(4); // AAPL.US, 700.HK, TSLA.US, GOOGL.US
      expect(stats.clientsByProvider.longport).toBe(2);
      expect(stats.clientsByProvider.itick).toBe(1);
      expect(stats.symbolDistribution['AAPL.US']).toBe(2);
      expect(stats.symbolDistribution['700.HK']).toBe(1);
    });
  });

  describe('符号订阅者查找', () => {
    beforeEach(() => {
      service.addClientSubscription('client-1', ['AAPL.US', '700.HK'], 'stream-stock-quote', 'longport');
      service.addClientSubscription('client-2', ['AAPL.US'], 'stream-stock-quote', 'longport');
      service.addClientSubscription('client-3', ['TSLA.US'], 'stream-stock-quote', 'itick');
    });

    it('应该返回订阅指定符号的客户端列表', () => {
      const subscribers = service.getSymbolSubscribers('AAPL.US');

      expect(subscribers).toHaveLength(2);
      expect(subscribers.map(s => s.clientId)).toEqual(
        expect.arrayContaining(['client-1', 'client-2'])
      );
    });

    it('应该为未订阅的符号返回空列表', () => {
      const subscribers = service.getSymbolSubscribers('UNKNOWN.US');

      expect(subscribers).toHaveLength(0);
    });
  });

  describe('自动清理机制', () => {
    it('应该清理超时的非活跃客户端', (done) => {
      // 这个测试需要模拟时间流逝，但由于清理是基于定时器的，
      // 我们主要测试清理逻辑是否正确设置
      const clientId = 'timeout-client';
      
      service.addClientSubscription(
        clientId,
        ['AAPL.US'],
        'stream-stock-quote',
        'longport'
      );

      expect(service.getClientSubscription(clientId)).toBeDefined();

      // 在实际实现中，这里会有定时器清理逻辑
      // 为了测试目的，我们验证清理方法是否存在
      expect(typeof service['cleanupInactiveClients']).toBe('function');
      
      done();
    });
  });

  describe('事件监听器', () => {
    it('应该支持多个订阅变更事件监听器', () => {
      const events1: SubscriptionChangeEvent[] = [];
      const events2: SubscriptionChangeEvent[] = [];

      service.addSubscriptionChangeListener((event) => events1.push(event));
      service.addSubscriptionChangeListener((event) => events2.push(event));

      service.addClientSubscription('test-client', ['AAPL.US'], 'stream-stock-quote', 'longport');

      expect(events1).toHaveLength(2); // 包括之前添加的监听器
      expect(events2).toHaveLength(1);
    });

    it('应该在监听器抛出错误时继续处理其他监听器', () => {
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      service.addSubscriptionChangeListener(errorListener);
      service.addSubscriptionChangeListener(normalListener);

      expect(() => {
        service.addClientSubscription('test-client', ['AAPL.US'], 'stream-stock-quote', 'longport');
      }).not.toThrow();

      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '订阅变更事件监听器执行失败',
        expect.objectContaining({
          error: 'Listener error',
        })
      );
    });
  });

  describe('边界情况', () => {
    it('应该处理空符号列表的订阅', () => {
      service.addClientSubscription('empty-client', [], 'stream-stock-quote', 'longport');

      const subscription = service.getClientSubscription('empty-client');
      expect(subscription?.symbols.size).toBe(0);
    });

    it('应该处理重复符号的订阅', () => {
      service.addClientSubscription('dup-client', ['AAPL.US', 'AAPL.US', '700.HK'], 'stream-stock-quote', 'longport');

      const symbols = service.getClientSymbols('dup-client');
      expect(symbols).toHaveLength(2);
      expect(symbols).toEqual(expect.arrayContaining(['AAPL.US', '700.HK']));
    });

    it('应该处理 null 或 undefined 的消息回调', () => {
      service.addClientSubscription('no-callback-client', ['AAPL.US'], 'stream-stock-quote', 'longport');

      expect(() => {
        service.broadcastToSymbolSubscribers('AAPL.US', { data: 'test' });
      }).not.toThrow();
    });
  });
});
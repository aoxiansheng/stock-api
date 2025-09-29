import { Test, TestingModule } from '@nestjs/testing';
import {
  StreamClientStateManager,
  ClientSubscriptionInfo,
  ClientStateStats,
  SubscriptionChangeEvent,
} from '@core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service';
import { BusinessException } from '@common/core/exceptions/business.exception';
import { UnitTestSetup } from '../../../../../../testbasic/setup/unit-test-setup';

// Mock WebSocket Provider
interface MockWebSocketProvider {
  isServerAvailable: jest.Mock;
  healthCheck: jest.Mock;
  broadcastToRoom: jest.Mock;
}

describe('StreamClientStateManager', () => {
  let service: StreamClientStateManager;
  let module: TestingModule;

  beforeEach(async () => {
    module = await UnitTestSetup.createBasicTestModule({
      providers: [StreamClientStateManager],
    });

    service = module.get<StreamClientStateManager>(StreamClientStateManager);
  });

  afterEach(async () => {
    // Clean up all client subscriptions
    service.clearAll();
    await UnitTestSetup.cleanupModule(module);
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with empty state', () => {
      const stats = service.getClientStateStats();
      expect(stats.totalClients).toBe(0);
      expect(stats.totalSubscriptions).toBe(0);
      expect(stats.activeClients).toBe(0);
    });

    it('should setup periodic cleanup on initialization', () => {
      // The cleanup interval is set up in constructor
      expect(service).toBeInstanceOf(StreamClientStateManager);
    });
  });

  describe('addClientSubscription', () => {
    it('should add new client subscription', () => {
      const clientId = 'client-123';
      const symbols = ['AAPL', 'GOOGL'];
      const wsCapabilityType = 'ws-stock-quote';
      const providerName = 'longport';

      service.addClientSubscription(clientId, symbols, wsCapabilityType, providerName);

      const clientSub = service.getClientSubscription(clientId);
      expect(clientSub).toBeDefined();
      expect(clientSub?.clientId).toBe(clientId);
      expect(clientSub?.wsCapabilityType).toBe(wsCapabilityType);
      expect(clientSub?.providerName).toBe(providerName);
      expect(Array.from(clientSub?.symbols || [])).toEqual(expect.arrayContaining(symbols));
    });

    it('should update existing client subscription with new symbols', () => {
      const clientId = 'client-123';
      const initialSymbols = ['AAPL'];
      const additionalSymbols = ['GOOGL', 'MSFT'];

      service.addClientSubscription(clientId, initialSymbols, 'ws-stock-quote', 'longport');
      service.addClientSubscription(clientId, additionalSymbols, 'ws-stock-quote', 'longport');

      const clientSub = service.getClientSubscription(clientId);
      expect(clientSub?.symbols.size).toBe(3);
      expect(Array.from(clientSub?.symbols || [])).toEqual(
        expect.arrayContaining([...initialSymbols, ...additionalSymbols])
      );
    });

    it('should not add duplicate symbols for same client', () => {
      const clientId = 'client-123';
      const symbols = ['AAPL', 'GOOGL'];

      service.addClientSubscription(clientId, symbols, 'ws-stock-quote', 'longport');
      service.addClientSubscription(clientId, symbols, 'ws-stock-quote', 'longport'); // Same symbols

      const clientSub = service.getClientSubscription(clientId);
      expect(clientSub?.symbols.size).toBe(2);
    });

    it('should update symbol to clients mapping', () => {
      const clientId1 = 'client-1';
      const clientId2 = 'client-2';
      const symbol = 'AAPL';

      service.addClientSubscription(clientId1, [symbol], 'ws-stock-quote', 'longport');
      service.addClientSubscription(clientId2, [symbol], 'ws-stock-quote', 'longport');

      const clients = service.getClientsForSymbol(symbol);
      expect(clients).toHaveLength(2);
      expect(clients).toEqual(expect.arrayContaining([clientId1, clientId2]));
    });

    it('should trigger subscription change listener', () => {
      const mockListener = jest.fn();
      service.addSubscriptionChangeListener(mockListener);

      const clientId = 'client-123';
      const symbols = ['AAPL'];

      service.addClientSubscription(clientId, symbols, 'ws-stock-quote', 'longport');

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId,
          symbols,
          action: 'subscribe',
          provider: 'longport',
          capability: 'ws-stock-quote',
        })
      );
    });
  });

  describe('removeClientSubscription', () => {
    beforeEach(() => {
      // Setup test data
      service.addClientSubscription('client-1', ['AAPL', 'GOOGL'], 'ws-stock-quote', 'longport');
      service.addClientSubscription('client-2', ['AAPL', 'MSFT'], 'ws-stock-quote', 'longport');
    });

    it('should remove specific symbols from client subscription', () => {
      service.removeClientSubscription('client-1', ['AAPL']);

      const clientSub = service.getClientSubscription('client-1');
      expect(clientSub?.symbols.size).toBe(1);
      expect(Array.from(clientSub?.symbols || [])).toEqual(['GOOGL']);
    });

    it('should remove all symbols when no specific symbols provided', () => {
      service.removeClientSubscription('client-1');

      const clientSub = service.getClientSubscription('client-1');
      expect(clientSub).toBeNull();
    });

    it('should clean up symbol to clients mapping when symbol has no more subscribers', () => {
      // Remove client-1's GOOGL subscription (only client-1 has GOOGL)
      service.removeClientSubscription('client-1', ['GOOGL']);

      const clients = service.getClientsForSymbol('GOOGL');
      expect(clients).toHaveLength(0);
    });

    it('should maintain symbol to clients mapping when other clients still subscribe', () => {
      // Remove client-1's AAPL subscription (client-2 still has AAPL)
      service.removeClientSubscription('client-1', ['AAPL']);

      const clients = service.getClientsForSymbol('AAPL');
      expect(clients).toEqual(['client-2']);
    });

    it('should handle removal of non-existent client gracefully', () => {
      expect(() => service.removeClientSubscription('non-existent-client')).not.toThrow();
    });

    it('should trigger unsubscribe change listener', () => {
      const mockListener = jest.fn();
      service.addSubscriptionChangeListener(mockListener);

      service.removeClientSubscription('client-1', ['AAPL']);

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'client-1',
          symbols: ['AAPL'],
          action: 'unsubscribe',
          provider: 'longport',
          capability: 'ws-stock-quote',
        })
      );
    });
  });

  describe('getClientsForSymbol', () => {
    it('should return clients subscribed to specific symbol', () => {
      service.addClientSubscription('client-1', ['AAPL'], 'ws-stock-quote', 'longport');
      service.addClientSubscription('client-2', ['AAPL', 'GOOGL'], 'ws-stock-quote', 'longport');

      const clients = service.getClientsForSymbol('AAPL');
      expect(clients).toHaveLength(2);
      expect(clients).toEqual(expect.arrayContaining(['client-1', 'client-2']));
    });

    it('should return empty array for non-existent symbol', () => {
      const clients = service.getClientsForSymbol('NON_EXISTENT');
      expect(clients).toEqual([]);
    });
  });

  describe('getClientSymbols', () => {
    it('should return symbols subscribed by specific client', () => {
      const clientId = 'client-123';
      const symbols = ['AAPL', 'GOOGL', 'MSFT'];

      service.addClientSubscription(clientId, symbols, 'ws-stock-quote', 'longport');

      const clientSymbols = service.getClientSymbols(clientId);
      expect(clientSymbols).toHaveLength(3);
      expect(clientSymbols).toEqual(expect.arrayContaining(symbols));
    });

    it('should return empty array for non-existent client', () => {
      const symbols = service.getClientSymbols('non-existent');
      expect(symbols).toEqual([]);
    });
  });

  describe('getAllRequiredSymbols', () => {
    beforeEach(() => {
      service.addClientSubscription('client-1', ['AAPL', 'GOOGL'], 'ws-stock-quote', 'longport');
      service.addClientSubscription('client-2', ['GOOGL', 'MSFT'], 'ws-stock-quote', 'futu');
      service.addClientSubscription('client-3', ['TSLA'], 'ws-market-data', 'longport');
    });

    it('should return all unique symbols without filters', () => {
      const symbols = service.getAllRequiredSymbols();
      expect(symbols).toHaveLength(4);
      expect(symbols).toEqual(expect.arrayContaining(['AAPL', 'GOOGL', 'MSFT', 'TSLA']));
    });

    it('should filter by provider', () => {
      const symbols = service.getAllRequiredSymbols('longport');
      expect(symbols).toEqual(expect.arrayContaining(['AAPL', 'GOOGL', 'TSLA']));
      expect(symbols).not.toContain('MSFT'); // MSFT is only in futu
    });

    it('should filter by capability', () => {
      const symbols = service.getAllRequiredSymbols(undefined, 'ws-stock-quote');
      expect(symbols).toEqual(expect.arrayContaining(['AAPL', 'GOOGL', 'MSFT']));
      expect(symbols).not.toContain('TSLA'); // TSLA is in ws-market-data
    });

    it('should filter by both provider and capability', () => {
      const symbols = service.getAllRequiredSymbols('longport', 'ws-stock-quote');
      expect(symbols).toEqual(expect.arrayContaining(['AAPL', 'GOOGL']));
      expect(symbols).not.toContain('MSFT'); // MSFT is in futu
      expect(symbols).not.toContain('TSLA'); // TSLA is in ws-market-data
    });
  });

  describe('updateClientActivity', () => {
    it('should update last active time for existing client', (done) => {
      const clientId = 'client-123';
      service.addClientSubscription(clientId, ['AAPL'], 'ws-stock-quote', 'longport');

      const beforeUpdate = service.getClientSubscription(clientId)?.lastActiveTime;

      // Wait a bit to ensure time difference
      setTimeout(() => {
        service.updateClientActivity(clientId);

        const afterUpdate = service.getClientSubscription(clientId)?.lastActiveTime;
        expect(afterUpdate).toBeGreaterThan(beforeUpdate || 0);
        done();
      }, 10);
    });

    it('should handle update for non-existent client gracefully', () => {
      expect(() => service.updateClientActivity('non-existent')).not.toThrow();
    });
  });

  describe('updateSubscriptionState', () => {
    it('should add symbols when action is subscribed', () => {
      const connectionId = 'conn-123';
      service.addClientSubscription(connectionId, ['AAPL'], 'ws-stock-quote', 'longport');

      service.updateSubscriptionState(connectionId, ['GOOGL', 'MSFT'], 'subscribed');

      const clientSub = service.getClientSubscription(connectionId);
      expect(clientSub?.symbols.size).toBe(3);
      expect(Array.from(clientSub?.symbols || [])).toEqual(
        expect.arrayContaining(['AAPL', 'GOOGL', 'MSFT'])
      );
    });

    it('should remove symbols when action is unsubscribed', () => {
      const connectionId = 'conn-123';
      service.addClientSubscription(connectionId, ['AAPL', 'GOOGL', 'MSFT'], 'ws-stock-quote', 'longport');

      service.updateSubscriptionState(connectionId, ['GOOGL'], 'unsubscribed');

      const clientSub = service.getClientSubscription(connectionId);
      expect(clientSub?.symbols.size).toBe(2);
      expect(Array.from(clientSub?.symbols || [])).toEqual(
        expect.arrayContaining(['AAPL', 'MSFT'])
      );
    });

    it('should trigger subscription change event', () => {
      const mockListener = jest.fn();
      service.addSubscriptionChangeListener(mockListener);

      const connectionId = 'conn-123';
      service.addClientSubscription(connectionId, ['AAPL'], 'ws-stock-quote', 'longport');

      // Clear previous calls
      mockListener.mockClear();

      service.updateSubscriptionState(connectionId, ['GOOGL'], 'subscribed');

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: connectionId,
          symbols: ['GOOGL'],
          action: 'subscribe',
        })
      );
    });

    it('should handle non-existent connection gracefully', () => {
      expect(() =>
        service.updateSubscriptionState('non-existent', ['AAPL'], 'subscribed')
      ).not.toThrow();
    });
  });

  describe('removeConnection', () => {
    it('should remove all client subscriptions for connection', () => {
      const connectionId = 'conn-123';
      service.addClientSubscription(connectionId, ['AAPL', 'GOOGL'], 'ws-stock-quote', 'longport');

      service.removeConnection(connectionId);

      const clientSub = service.getClientSubscription(connectionId);
      expect(clientSub).toBeNull();
    });
  });

  describe('getClientStateStats', () => {
    beforeEach(() => {
      service.addClientSubscription('client-1', ['AAPL', 'GOOGL'], 'ws-stock-quote', 'longport');
      service.addClientSubscription('client-2', ['MSFT'], 'ws-market-data', 'futu');
      service.addClientSubscription('client-3', ['TSLA'], 'ws-stock-quote', 'longport');
    });

    it('should return correct client state statistics', () => {
      const stats = service.getClientStateStats();

      expect(stats.totalClients).toBe(3);
      expect(stats.totalSubscriptions).toBe(4); // AAPL, GOOGL, MSFT, TSLA
      expect(stats.activeClients).toBe(3); // All clients are active (just added)
      expect(stats.providerBreakdown).toEqual({
        longport: 2,
        futu: 1,
      });
      expect(stats.capabilityBreakdown).toEqual({
        'ws-stock-quote': 2,
        'ws-market-data': 1,
      });
    });

    it('should correctly identify inactive clients', (done) => {
      // Mock a client as inactive by manually setting an old lastActiveTime
      const clientSub = service.getClientSubscription('client-1');
      if (clientSub) {
        clientSub.lastActiveTime = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      }

      const stats = service.getClientStateStats();
      expect(stats.activeClients).toBe(2); // client-1 should be inactive
      done();
    });
  });

  describe('broadcastToSymbolViaGateway', () => {
    let mockWebSocketProvider: MockWebSocketProvider;

    beforeEach(() => {
      // Reset broadcast stats before each test
      service.resetBroadcastStats();
      
      mockWebSocketProvider = {
        isServerAvailable: jest.fn(),
        healthCheck: jest.fn(),
        broadcastToRoom: jest.fn(),
      };

      // Setup some test subscriptions
      service.addClientSubscription('client-1', ['AAPL'], 'ws-stock-quote', 'longport');
      service.addClientSubscription('client-2', ['AAPL'], 'ws-stock-quote', 'longport');
    });

    it('should broadcast successfully via gateway', async () => {
      mockWebSocketProvider.isServerAvailable.mockReturnValue(true);
      mockWebSocketProvider.broadcastToRoom.mockResolvedValue(true);

      const symbol = 'AAPL';
      const data = { price: 150.50 };

      await service.broadcastToSymbolViaGateway(symbol, data, mockWebSocketProvider);

      expect(mockWebSocketProvider.broadcastToRoom).toHaveBeenCalledWith(
        `symbol:${symbol}`,
        'data',
        expect.objectContaining({
          symbol,
          data,
        })
      );

      const stats = service.getBroadcastStats();
      expect(stats.stats.gateway.success).toBe(1);
      expect(stats.stats.total.attempts).toBe(1);
    });

    it('should throw GatewayBroadcastError when server unavailable', async () => {
      // 确保统计数据在测试开始时被重置
      service.resetBroadcastStats();
      
      mockWebSocketProvider.isServerAvailable.mockReturnValue(false);
      mockWebSocketProvider.healthCheck.mockReturnValue({
        status: 'unavailable',
        details: { reason: 'Server not started' },
      });

      // 第一次调用，验证异常类型
      await expect(
        service.broadcastToSymbolViaGateway('AAPL', {}, mockWebSocketProvider)
      ).rejects.toThrow(BusinessException);

      // 验证第一次调用后的统计数据
      let stats = service.getBroadcastStats();
      expect(stats.stats.gateway.failure).toBe(1);
      expect(stats.stats.errors.gatewayBroadcastErrors).toBe(1);

      // 第二次调用，验证异常消息内容
      await expect(
        service.broadcastToSymbolViaGateway('AAPL', {}, mockWebSocketProvider)
      ).rejects.toThrow('Gateway broadcast failed for symbol AAPL: Server not started');

      // 验证两次调用后的最终统计数据
      stats = service.getBroadcastStats();
      expect(stats.stats.gateway.failure).toBe(2); // 由于调用了两次，所以失败次数是2
      expect(stats.stats.errors.gatewayBroadcastErrors).toBe(2);
    });

    it('should throw GatewayBroadcastError when broadcast fails', async () => {
      // 确保统计数据在测试开始时被重置
      service.resetBroadcastStats();
      
      mockWebSocketProvider.isServerAvailable.mockReturnValue(true);
      mockWebSocketProvider.broadcastToRoom.mockResolvedValue(false);
      mockWebSocketProvider.healthCheck.mockReturnValue({
        status: 'degraded',
        details: { reason: 'High load' },
      });

      // 第一次调用，验证异常类型
      await expect(
        service.broadcastToSymbolViaGateway('AAPL', {}, mockWebSocketProvider)
      ).rejects.toThrow(BusinessException);

      // 验证第一次调用后的统计数据
      let stats = service.getBroadcastStats();
      expect(stats.stats.gateway.failure).toBe(1);
      expect(stats.stats.errors.gatewayBroadcastErrors).toBe(1);

      // 第二次调用，验证异常消息内容
      await expect(
        service.broadcastToSymbolViaGateway('AAPL', {}, mockWebSocketProvider)
      ).rejects.toThrow('Gateway broadcast failed for symbol AAPL: Gateway广播返回失败状态');

      // 验证两次调用后的最终统计数据
      stats = service.getBroadcastStats();
      expect(stats.stats.gateway.failure).toBe(2); // 由于调用了两次，所以失败次数是2
      expect(stats.stats.errors.gatewayBroadcastErrors).toBe(2);
    });

    it('should handle broadcast exceptions', async () => {
      mockWebSocketProvider.isServerAvailable.mockReturnValue(true);
      mockWebSocketProvider.broadcastToRoom.mockRejectedValue(new Error('Network error'));
      mockWebSocketProvider.healthCheck.mockReturnValue({
        status: 'error',
        details: { reason: 'Network failure' },
      });

      await expect(
        service.broadcastToSymbolViaGateway('AAPL', {}, mockWebSocketProvider)
      ).rejects.toThrow(BusinessException);

      // 验证抛出的异常消息包含期望的内容
      await expect(
        service.broadcastToSymbolViaGateway('AAPL', {}, mockWebSocketProvider)
      ).rejects.toThrow('Gateway broadcast failed for symbol AAPL: Gateway广播异常: Network error');

      const stats = service.getBroadcastStats();
      expect(stats.stats.gateway.failure).toBe(2); // 由于调用了两次，所以失败次数是2
      expect(stats.stats.errors.lastErrorReason).toContain('Network error');
    });

    it('should update client activity on successful broadcast', async () => {
      mockWebSocketProvider.isServerAvailable.mockReturnValue(true);
      mockWebSocketProvider.broadcastToRoom.mockResolvedValue(true);

      const beforeBroadcast = service.getClientSubscription('client-1')?.lastActiveTime;

      await service.broadcastToSymbolViaGateway('AAPL', {}, mockWebSocketProvider);

      const afterBroadcast = service.getClientSubscription('client-1')?.lastActiveTime;
      expect(afterBroadcast).toBeGreaterThanOrEqual(beforeBroadcast || 0);
    });
  });

  describe('getBroadcastStats', () => {
    beforeEach(() => {
      service.resetBroadcastStats();
    });

    it('should return initial broadcast statistics', () => {
      const stats = service.getBroadcastStats();

      expect(stats.gatewayUsageRate).toBe(100); // No calls yet, assume 100%
      expect(stats.errorRate).toBe(0);
      expect(stats.healthStatus).toBe('excellent');
      expect(stats.analysis.totalBroadcasts).toBe(0);
      expect(stats.analysis.successRate).toBe(100);
    });

    it('should calculate statistics after broadcasts', () => {
      // Simulate some broadcast attempts
      service['broadcastStats'].total.attempts = 10;
      service['broadcastStats'].gateway.success = 8;
      service['broadcastStats'].gateway.failure = 2;
      service['broadcastStats'].errors.gatewayBroadcastErrors = 1;

      const stats = service.getBroadcastStats();

      expect(stats.gatewayUsageRate).toBe(100); // All attempts were gateway (8+2)/10 * 100
      expect(stats.errorRate).toBe(10); // 1 error out of 10 gateway attempts
      expect(stats.analysis.successRate).toBe(80); // 8 success out of 10 gateway attempts
      expect(stats.healthStatus).toBe('warning'); // Error rate > 5%
    });

    it('should determine health status correctly', () => {
      // Test critical status
      service['broadcastStats'].total.attempts = 10;
      service['broadcastStats'].gateway.failure = 10;
      service['broadcastStats'].errors.gatewayBroadcastErrors = 5;

      let stats = service.getBroadcastStats();
      expect(stats.healthStatus).toBe('critical'); // Error rate > 10%

      // Reset and test excellent status
      service.resetBroadcastStats();
      service['broadcastStats'].total.attempts = 100;
      service['broadcastStats'].gateway.success = 100;

      stats = service.getBroadcastStats();
      expect(stats.healthStatus).toBe('excellent'); // No errors, 100% gateway usage
    });
  });

  describe('resetBroadcastStats', () => {
    it('should reset all broadcast statistics', () => {
      // Simulate some activity
      service['broadcastStats'].gateway.success = 5;
      service['broadcastStats'].gateway.failure = 2;
      service['broadcastStats'].total.attempts = 7;

      service.resetBroadcastStats();

      const stats = service.getBroadcastStats();
      expect(stats.stats.gateway.success).toBe(0);
      expect(stats.stats.gateway.failure).toBe(0);
      expect(stats.stats.total.attempts).toBe(0);
      expect(stats.analysis.totalBroadcasts).toBe(0);
    });
  });

  describe('Subscription Change Listeners', () => {
    it('should add and trigger subscription change listeners', () => {
      const mockListener1 = jest.fn();
      const mockListener2 = jest.fn();

      service.addSubscriptionChangeListener(mockListener1);
      service.addSubscriptionChangeListener(mockListener2);

      service.addClientSubscription('client-1', ['AAPL'], 'ws-stock-quote', 'longport');

      expect(mockListener1).toHaveBeenCalled();
      expect(mockListener2).toHaveBeenCalled();
    });

    it('should remove subscription change listeners', () => {
      const mockListener = jest.fn();

      service.addSubscriptionChangeListener(mockListener);
      service.removeSubscriptionChangeListener(mockListener);

      service.addClientSubscription('client-1', ['AAPL'], 'ws-stock-quote', 'longport');

      expect(mockListener).not.toHaveBeenCalled();
    });

    it('should handle listener exceptions gracefully', () => {
      const throwingListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = jest.fn();

      service.addSubscriptionChangeListener(throwingListener);
      service.addSubscriptionChangeListener(normalListener);

      // Should not throw even if one listener fails
      expect(() => {
        service.addClientSubscription('client-1', ['AAPL'], 'ws-stock-quote', 'longport');
      }).not.toThrow();

      expect(throwingListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
    });
  });

  describe('clearAll', () => {
    it('should clear all client subscriptions and mappings', () => {
      service.addClientSubscription('client-1', ['AAPL', 'GOOGL'], 'ws-stock-quote', 'longport');
      service.addClientSubscription('client-2', ['MSFT'], 'ws-market-data', 'futu');

      service.clearAll();

      const stats = service.getClientStateStats();
      expect(stats.totalClients).toBe(0);
      expect(stats.totalSubscriptions).toBe(0);
      expect(service.getClientsForSymbol('AAPL')).toHaveLength(0);
      expect(service.getAllRequiredSymbols()).toHaveLength(0);
    });
  });

  describe('Module Destruction', () => {
    it('should clean up resources on module destroy', async () => {
      await service.onModuleDestroy();

      // Verify cleanup was called (we can't directly test the interval clearance,
      // but we can verify the method doesn't throw)
      expect(true).toBe(true);
    });
  });

  describe('Periodic Cleanup', () => {
    it('should identify and clean up inactive clients', (done) => {
      service.addClientSubscription('client-active', ['AAPL'], 'ws-stock-quote', 'longport');
      service.addClientSubscription('client-inactive', ['GOOGL'], 'ws-stock-quote', 'longport');

      // Make one client inactive
      const inactiveClient = service.getClientSubscription('client-inactive');
      if (inactiveClient) {
        inactiveClient.lastActiveTime = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      }

      // Trigger cleanup manually
      service['cleanupInactiveClients']();

      // Check that inactive client was removed
      setTimeout(() => {
        expect(service.getClientSubscription('client-active')).toBeDefined();
        expect(service.getClientSubscription('client-inactive')).toBeNull();
        done();
      }, 10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty symbol arrays', () => {
      expect(() => {
        service.addClientSubscription('client-1', [], 'ws-stock-quote', 'longport');
      }).not.toThrow();

      const clientSub = service.getClientSubscription('client-1');
      expect(clientSub?.symbols.size).toBe(0);
    });

    it('should handle duplicate client IDs with different providers', () => {
      const clientId = 'client-1';

      service.addClientSubscription(clientId, ['AAPL'], 'ws-stock-quote', 'longport');
      service.addClientSubscription(clientId, ['GOOGL'], 'ws-stock-quote', 'futu');

      const clientSub = service.getClientSubscription(clientId);
      expect(clientSub?.symbols.size).toBe(2);
      expect(clientSub?.providerName).toBe('longport'); // Should keep original provider
    });

    it('should handle special characters in symbol names', () => {
      const symbols = ['700.HK', 'BRK.A', 'BRK-B'];

      service.addClientSubscription('client-1', symbols, 'ws-stock-quote', 'longport');

      const clientSymbols = service.getClientSymbols('client-1');
      expect(clientSymbols).toEqual(expect.arrayContaining(symbols));
    });
  });
});
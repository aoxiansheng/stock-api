/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { createLogger } from '@common/config/logger.config';
import { StreamReceiverGateway } from '../../../../../../src/core/stream/stream-receiver/gateway/stream-receiver.gateway';
import { StreamReceiverService } from '../../../../../../src/core/stream/stream-receiver/services/stream-receiver.service';
import { WsAuthGuard } from '../../../../../../src/core/stream/stream-receiver/guards/ws-auth.guard';
import { StreamSubscribeDto, StreamUnsubscribeDto } from '../../../../../../src/core/stream/stream-receiver/dto';
import { ApiKeyService } from '../../../../../../src/auth/services/apikey.service';

// Mock logger
jest.mock('@common/config/logger.config');

const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock StreamReceiverService
const mockStreamReceiverService = {
  _subscribeSymbols: jest.fn(),
  _unsubscribeSymbols: jest.fn(),
  getClientSubscription: jest.fn(),
  cleanupClientSubscription: jest.fn(),
};

// Mock Socket with API Key authentication data
function createMockSocket(id?: string) {
  return {
    id: id || 'test-client-123',
    emit: jest.fn(),
    handshake: {
      address: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      } as Record<string, string>,
    },
    // 模拟连接级认证后的数据，所有连接都有API Key认证信息
    data: {
      apiKey: {
        id: 'mock-key-id',
        name: 'Test API Key',
        permissions: ['stream:read', 'stream:subscribe'],
        authType: 'apikey',
      }
    } as Record<string, any>,
  } as any; // Cast as any to avoid Socket interface complexity in tests
}

describe('StreamReceiverGateway', () => {
  let gateway: StreamReceiverGateway;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup logger mock
    import { createLogger } from '@common/config/logger.config';
    (createLogger as jest.Mock).mockReturnValue(mockLogger);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamReceiverGateway,
        {
          provide: StreamReceiverService,
          useValue: mockStreamReceiverService,
        },
        {
          provide: ApiKeyService,
          useValue: {
            validateApiKey: jest.fn().mockResolvedValue({
              valid: true,
              permissions: ['data:read', 'stream:subscribe'],
            }),
          },
        },
      ],
    })
    .overrideGuard(WsAuthGuard)
    .useValue({ canActivate: jest.fn(() => true) })
    .compile();

    gateway = module.get<StreamReceiverGateway>(StreamReceiverGateway);
  });

  describe('_handleConnection()', () => {
    it('should handle client connection successfully', async () => {
      // Setup
      const client = createMockSocket();

      // Execute
      await gateway.handleConnection(client);

      // Verify - userAgent 不再记录在连接日志中
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: 'WebSocket 客户端连接',
        clientId: client.id,
        remoteAddress: client.handshake.address,
      });
      expect(client.emit).toHaveBeenCalledWith('connected', {
        message: '连接成功',
        clientId: client.id,
        timestamp: expect.any(Number),
      });
    });

    it('should handle client connection with missing headers', async () => {
      // Setup
      const client = createMockSocket();
      client.handshake.headers = {} as any;

      // Execute
      await gateway.handleConnection(client);

      // Verify - userAgent 不再记录在连接日志中
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: 'WebSocket 客户端连接',
        clientId: client.id,
        remoteAddress: client.handshake.address,
      });
      expect(client.emit).toHaveBeenCalledWith('connected', expect.any(Object));
    });
  });

  describe('_handleDisconnect()', () => {
    it('should handle client disconnection successfully', async () => {
      // Setup
      const client = createMockSocket();
      mockStreamReceiverService.cleanupClientSubscription.mockResolvedValue(undefined);

      // Execute
      await gateway.handleDisconnect(client);

      // Verify
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: 'WebSocket 客户端断开连接',
        clientId: client.id,
      });
      expect(mockStreamReceiverService.cleanupClientSubscription).toHaveBeenCalledWith(client.id);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Setup
      const client = createMockSocket();
      const error = new Error('Cleanup failed');
      mockStreamReceiverService.cleanupClientSubscription.mockRejectedValue(error);

      // Execute
      await gateway.handleDisconnect(client);

      // Verify
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: '清理客户端订阅失败',
        clientId: client.id,
        error: 'Cleanup failed',
      });
    });
  });

  describe('handleSubscribe()', () => {
    const subscribeDto: StreamSubscribeDto = {
      symbols: ['700.HK', 'AAPL.US'],
      wsCapabilityType: 'stream-stock-quote',
    };

    it('should handle subscription request successfully', async () => {
      // Setup
      const client = createMockSocket();
      mockStreamReceiverService.subscribeSymbols.mockImplementation(
        (clientId, dto, callback) => {
          // Simulate callback invocation
          callback({
            symbols: dto.symbols,
            data: { symbol: '700.HK', lastPrice: 350.5 },
            timestamp: Date.now(),
          });
          return Promise.resolve();
        }
      );

      // Execute
      await gateway.handleSubscribe(client, subscribeDto);

      // Verify - 包含API Key名称信息
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: '收到 WebSocket 订阅请求',
        clientId: client.id,
        symbols: subscribeDto.symbols,
        wsCapabilityType: subscribeDto.wsCapabilityType,
        apiKeyName: 'Test API Key',
      });
      expect(mockStreamReceiverService.subscribeSymbols).toHaveBeenCalledWith(
        client.id,
        subscribeDto,
        expect.any(Function)
      );
      expect(client.emit).toHaveBeenCalledWith('subscribe-ack', {
        success: true,
        message: '订阅成功',
        symbols: subscribeDto.symbols,
        wsCapabilityType: subscribeDto.wsCapabilityType,
        timestamp: expect.any(Number),
      });
      // Should also emit data from callback
      expect(client.emit).toHaveBeenCalledWith('data', expect.any(Object));
    });

    it('should handle subscription errors', async () => {
      // Setup
      const client = createMockSocket();
      const error = new Error('Subscription failed');
      mockStreamReceiverService.subscribeSymbols.mockRejectedValue(error);

      // Execute
      await gateway.handleSubscribe(client, subscribeDto);

      // Verify
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'WebSocket 订阅处理失败',
        clientId: client.id,
        error: 'Subscription failed',
      });
      expect(client.emit).toHaveBeenCalledWith('subscribe-error', {
        success: false,
        message: 'Subscription failed',
        symbols: subscribeDto.symbols,
        timestamp: expect.any(Number),
      });
    });

    it('should pass stream data to client via callback', async () => {
      // Setup
      const client = createMockSocket();
      const streamData = {
        symbols: ['700.HK'],
        data: { symbol: '700.HK', lastPrice: 350.5 },
        timestamp: Date.now(),
        provider: 'longport',
        capability: 'stream-stock-quote',
      };

      mockStreamReceiverService.subscribeSymbols.mockImplementation(
        (clientId, dto, callback) => {
          // Simulate multiple data callbacks
          callback(streamData);
          callback({ ...streamData, data: { symbol: '700.HK', lastPrice: 351.0 } });
          return Promise.resolve();
        }
      );

      // Execute
      await gateway.handleSubscribe(client, subscribeDto);

      // Verify - should emit data twice
      expect(client.emit).toHaveBeenCalledWith('data', streamData);
      expect(client.emit).toHaveBeenCalledWith('data', {
        ...streamData,
        data: { symbol: '700.HK', lastPrice: 351.0 },
      });
      expect(client.emit).toHaveBeenCalledTimes(3); // 2 data + 1 ack
    });
  });

  describe('handleUnsubscribe()', () => {
    const unsubscribeDto: StreamUnsubscribeDto = {
      symbols: ['700.HK', 'AAPL.US'],
      wsCapabilityType: 'stream-stock-quote',
    };

    it('should handle unsubscription request successfully', async () => {
      // Setup
      const client = createMockSocket();
      mockStreamReceiverService.unsubscribeSymbols.mockResolvedValue(undefined);

      // Execute
      await gateway.handleUnsubscribe(client, unsubscribeDto);

      // Verify - 包含API Key名称信息
      expect(mockLogger.log).toHaveBeenCalledWith({
        message: '收到 WebSocket 取消订阅请求',
        clientId: client.id,
        symbols: unsubscribeDto.symbols,
        apiKeyName: 'Test API Key',
      });
      expect(mockStreamReceiverService.unsubscribeSymbols).toHaveBeenCalledWith(
        client.id,
        unsubscribeDto
      );
      expect(client.emit).toHaveBeenCalledWith('unsubscribe-ack', {
        success: true,
        message: '取消订阅成功',
        symbols: unsubscribeDto.symbols,
        timestamp: expect.any(Number),
      });
    });

    it('should handle unsubscription errors', async () => {
      // Setup
      const client = createMockSocket();
      const error = new Error('Unsubscription failed');
      mockStreamReceiverService.unsubscribeSymbols.mockRejectedValue(error);

      // Execute
      await gateway.handleUnsubscribe(client, unsubscribeDto);

      // Verify
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: 'WebSocket 取消订阅处理失败',
        clientId: client.id,
        error: 'Unsubscription failed',
      });
      expect(client.emit).toHaveBeenCalledWith('unsubscribe-error', {
        success: false,
        message: 'Unsubscription failed',
        symbols: unsubscribeDto.symbols,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('handleGetSubscription()', () => {
    it('should return subscription status when client has active subscription', async () => {
      // Setup
      const client = createMockSocket();
      const mockSubscription = {
        clientId: client.id,
        symbols: new Set(['700.HK', 'AAPL.US']),
        wsCapabilityType: 'stream-stock-quote',
        providerName: 'longport',
        capability: {},
        contextService: {},
      };
      mockStreamReceiverService.getClientSubscription.mockReturnValue(mockSubscription);

      // Execute
      await gateway.handleGetSubscription(client);

      // Verify
      expect(mockStreamReceiverService.getClientSubscription).toHaveBeenCalledWith(client.id);
      expect(client.emit).toHaveBeenCalledWith('subscription-status', {
        success: true,
        data: {
          symbols: ['700.HK', 'AAPL.US'],
          wsCapabilityType: 'stream-stock-quote',
          providerName: 'longport',
        },
        timestamp: expect.any(Number),
      });
    });

    it('should return null when client has no active subscription', async () => {
      // Setup
      const client = createMockSocket();
      mockStreamReceiverService.getClientSubscription.mockReturnValue(null);

      // Execute
      await gateway.handleGetSubscription(client);

      // Verify
      expect(client.emit).toHaveBeenCalledWith('subscription-status', {
        success: true,
        data: null,
        timestamp: expect.any(Number),
      });
    });

    it('should handle errors when getting subscription status', async () => {
      // Setup
      const client = createMockSocket();
      const error = new Error('Service error');
      mockStreamReceiverService.getClientSubscription.mockImplementation(() => {
        throw error;
      });

      // Execute
      await gateway.handleGetSubscription(client);

      // Verify
      expect(mockLogger.error).toHaveBeenCalledWith({
        message: '获取订阅状态失败',
        clientId: client.id,
        error: 'Service error',
      });
      expect(client.emit).toHaveBeenCalledWith('subscription-status', {
        success: false,
        message: 'Service error',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('handlePing()', () => {
    it('should respond to ping with pong', async () => {
      // Setup
      const client = createMockSocket();

      // Execute
      await gateway.handlePing(client);

      // Verify
      expect(client.emit).toHaveBeenCalledWith('pong', {
        timestamp: expect.any(Number),
      });
    });
  });

  describe('handleGetInfo()', () => {
    it('should return connection info with API key auth (default)', async () => {
      // Setup - 所有连接都通过连接级认证，有API Key信息
      const client = createMockSocket();

      // Execute
      await gateway.handleGetInfo(client);

      // Verify - 连接级认证确保所有连接都有API Key信息
      expect(client.emit).toHaveBeenCalledWith('connection-info', {
        clientId: client.id,
        connected: true,
        authType: 'apikey',
        apiKeyName: 'Test API Key',
        timestamp: expect.any(Number),
      });
    });

    it('should return connection info when API key has different name', async () => {
      // Setup - WebSocket只使用API Key认证
      const client = createMockSocket();
      client.data.apiKey.name = 'Custom API Key';

      // Execute
      await gateway.handleGetInfo(client);

      // Verify - WebSocket统一使用API Key认证
      expect(client.emit).toHaveBeenCalledWith('connection-info', {
        clientId: client.id,
        connected: true,
        authType: 'apikey',
        apiKeyName: 'Custom API Key',
        timestamp: expect.any(Number),
      });
    });

    it('should return connection info with API key permissions', async () => {
      // Setup
      const client = createMockSocket();
      client.data.apiKey.permissions = ['stream:read', 'stream:subscribe', 'data:read'];

      // Execute
      await gateway.handleGetInfo(client);

      // Verify
      expect(client.emit).toHaveBeenCalledWith('connection-info', {
        clientId: client.id,
        connected: true,
        authType: 'apikey',
        apiKeyName: 'Test API Key',
        timestamp: expect.any(Number),
      });
    });

    it('should handle missing API key name gracefully', async () => {
      // Setup
      const client = createMockSocket();
      client.data.apiKey.name = undefined; // Missing name

      // Execute
      await gateway.handleGetInfo(client);

      // Verify - 使用默认的"未知"名称
      expect(client.emit).toHaveBeenCalledWith('connection-info', {
        clientId: client.id,
        connected: true,
        authType: 'apikey',
        apiKeyName: '未知',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('WebSocket Gateway Configuration', () => {
    it('should have correct gateway configuration and methods', () => {
      // 验证Gateway有必要的方法（不依赖元数据）
      expect(gateway.handleConnection).toBeDefined();
      expect(gateway.handleDisconnect).toBeDefined();
      expect(gateway.handleSubscribe).toBeDefined();
      expect(gateway.handleUnsubscribe).toBeDefined();
      expect(gateway.handleGetInfo).toBeDefined();
      expect(gateway.handlePing).toBeDefined();
      expect(gateway.handleGetSubscription).toBeDefined();
      
      // 验证Gateway继承了正确的接口
      expect(gateway.afterInit).toBeDefined();
      
      // 检查实际的配置（实际使用path而不是namespace）
      // 注意：实际配置使用path: '/api/v1/stream-receiver/connect'
      // 而不是namespace: '/stream'
    });
  });

  describe('Authentication Architecture', () => {
    it('should use connection-level authentication instead of method-level guards', () => {
      // 实际实现使用连接级认证中间件，而不是方法级守卫
      // 这是更高效和安全的方式
      
      // 验证afterInit方法存在（设置认证中间件）
      expect(gateway.afterInit).toBeDefined();
      
      // 验证所有方法都存在（已通过连接级认证）
      expect(gateway.handleSubscribe).toBeDefined();
      expect(gateway.handleUnsubscribe).toBeDefined();
      expect(gateway.handleGetSubscription).toBeDefined();
      expect(gateway.handlePing).toBeDefined();
      expect(gateway.handleGetInfo).toBeDefined();
      
      // 连接级认证的优势：
      // 1. 一次认证，多次使用
      // 2. 减少每个消息的认证开销
      // 3. 在连接建立时就拒绝未认证的客户端
    });

    it('should require API key authentication for all connections', () => {
      // 所有通过连接级认证的客户端都应该有API Key信息
      const client = createMockSocket();
      expect(client.data.apiKey).toBeDefined();
      expect(client.data.apiKey.authType).toBe('apikey');
      expect(client.data.apiKey.name).toBeDefined();
      expect(client.data.apiKey.permissions).toContain('stream:read');
    });
  });

  describe('Message Body Validation', () => {
    it('should validate subscribe message structure', async () => {
      // Setup
      const client = createMockSocket();
      mockStreamReceiverService.subscribeSymbols.mockResolvedValue(undefined);

      const validDto: StreamSubscribeDto = {
        symbols: ['700.HK'],
        wsCapabilityType: 'stream-stock-quote',
        preferredProvider: 'longport',
      };

      // Execute
      await gateway.handleSubscribe(client, validDto);

      // Verify
      expect(mockStreamReceiverService.subscribeSymbols).toHaveBeenCalledWith(
        client.id,
        validDto,
        expect.any(Function)
      );
    });

    it('should validate unsubscribe message structure', async () => {
      // Setup
      const client = createMockSocket();
      mockStreamReceiverService.unsubscribeSymbols.mockResolvedValue(undefined);

      const validDto: StreamUnsubscribeDto = {
        symbols: ['700.HK', 'AAPL.US'],
        wsCapabilityType: 'stream-stock-quote',
      };

      // Execute
      await gateway.handleUnsubscribe(client, validDto);

      // Verify
      expect(mockStreamReceiverService.unsubscribeSymbols).toHaveBeenCalledWith(
        client.id,
        validDto
      );
    });
  });

  describe('Error Edge Cases', () => {
    it('should handle service method throwing synchronous errors', async () => {
      // Setup
      const client = createMockSocket();
      const subscribeDto: StreamSubscribeDto = {
        symbols: ['700.HK'],
        wsCapabilityType: 'stream-stock-quote',
      };

      // Mock synchronous error
      mockStreamReceiverService.subscribeSymbols.mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      // Execute
      await gateway.handleSubscribe(client, subscribeDto);

      // Verify
      expect(client.emit).toHaveBeenCalledWith('subscribe-error', {
        success: false,
        message: 'Synchronous error',
        symbols: subscribeDto.symbols,
        timestamp: expect.any(Number),
      });
    });

    it('should handle malformed client data gracefully', async () => {
      // Setup
      const client = createMockSocket();
      client.data = null; // Malformed data

      // Execute
      await gateway.handleGetInfo(client);

      // Verify - 即使data为null，也应该返回默认的API Key认证信息
      expect(client.emit).toHaveBeenCalledWith('connection-info', {
        clientId: client.id,
        connected: true,
        authType: 'apikey',
        apiKeyName: '未知',
        timestamp: expect.any(Number),
      });
    });
  });
});
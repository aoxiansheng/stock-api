import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketRateLimitGuard } from '@core/03-fetching/stream-data-fetcher/guards/websocket-rate-limit.guard';
import { Socket } from 'socket.io';
import { TestWebSocketModule } from '@test/testbasic/modules/test-websocket.module';
import { socketMockFactory } from '@test/testbasic/mocks/socket.mock';
import { WebSocketTestSetup } from '@test/testbasic/setup/websocket-test-setup';

describe('WebSocketRateLimitGuard', () => {
  let module: TestingModule;
  let guard: WebSocketRateLimitGuard;
  let createSocket: (options?: any) => Socket;
  
  // 创建一个全新的测试环境，完全隔离
  beforeEach(async () => {
    // 为每个测试创建全新的模块实例，确保状态完全隔离
    module = await WebSocketTestSetup.createWebSocketTestModule();
    const context = WebSocketTestSetup.getGuardTestContext(module);
    guard = context.guard;
    createSocket = context.createSocket;
    
    // 设置假计时器以控制时间
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    // 恢复真实计时器并清理模块
    jest.useRealTimers();
    jest.clearAllMocks();
    
    // 确保每次测试后关闭模块，清理状态
    if (module) {
      module.close();
    }
  });

  describe('Guard Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(guard).toBeDefined();
      const stats = guard.getStats();
      expect(stats.connections.byIP).toHaveLength(0);
      expect(stats.connections.byUser).toHaveLength(0);
    });
    
    it('should set up periodic cleanup', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      // 创建新实例以验证setInterval被调用
      const newGuard = new WebSocketRateLimitGuard();
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000);
    });
    
    it('should load configuration from environment variables', () => {
      const originalEnv = process.env;
      
      // 设置测试环境变量
      process.env = {
        ...originalEnv,
        WS_MAX_CONNECTIONS_PER_IP: '5',
        WS_MAX_CONNECTIONS_PER_USER: '3',
        WS_MESSAGES_PER_MINUTE: '60',
        WS_MAX_SUBSCRIPTIONS_PER_CONNECTION: '25',
        WS_BURST_MESSAGES: '10'
      };
      
      const customGuard = new WebSocketRateLimitGuard();
      const stats = customGuard.getStats();
      
      expect(stats.config.maxConnectionsPerIP).toBe(5);
      expect(stats.config.maxConnectionsPerUser).toBe(3);
      expect(stats.config.messagesPerMinute).toBe(60);
      expect(stats.config.maxSubscriptionsPerConnection).toBe(25);
      expect(stats.config.burstMessages).toBe(10);
      
      // 恢复原始环境
      process.env = originalEnv;
    });
  });

  describe('canConnect', () => {
    describe('Basic Connection Flow', () => {
      it('should allow connection when within all limits', () => {
        const socket = createSocket();
        const result = guard.canConnect(socket);
        
        expect(result).toBe(true);
        
        const stats = guard.getStats();
        expect(stats.connections.byIP).toHaveLength(1);
        expect(stats.connections.byIP[0].count).toBe(1);
        expect(stats.connections.byIP[0].sockets).toContain('socket-test-123');
      });
      
      it('should register connection with IP and socket ID', () => {
        const socket = createSocket();
        guard.canConnect(socket);
        
        const stats = guard.getStats();
        const ipConnection = stats.connections.byIP.find(conn => conn.ip === '192.168.1.100');
        
        expect(ipConnection).toBeDefined();
        expect(ipConnection.count).toBe(1);
        expect(ipConnection.sockets).toContain('socket-test-123');
      });
    });
    
    describe('IP Connection Limits', () => {
      it('should enforce IP connection limits', () => {
        const limit = 10; // 默认IP限制为10
        
        // 创建到达限制的连接
        for (let i = 0; i < limit; i++) {
          const socket = createSocket({ id: `socket-${i}` });
          const result = guard.canConnect(socket);
          expect(result).toBe(true);
        }
        
        // 第11个连接应该被拒绝
        const overLimitSocket = createSocket({ id: 'socket-over-limit' });
        const result = guard.canConnect(overLimitSocket);
        expect(result).toBe(false);
      });
      
      it('should handle different IPs independently', () => {
        // 填充第一个IP的连接
        for (let i = 0; i < 10; i++) {
          const socket = createSocket({
            id: `socket-ip1-${i}`,
            handshake: { 
              address: '192.168.1.100',
              headers: { 'x-forwarded-for': '192.168.1.100' } 
            }
          });
          expect(guard.canConnect(socket)).toBe(true);
        }
        
        // 不同IP的连接应该能成功
        const socketDifferentIP = createSocket({
          id: 'socket-ip2-1',
          handshake: { 
            address: '192.168.1.101',
            headers: { 'x-forwarded-for': '192.168.1.101' } 
          }
        });
        expect(guard.canConnect(socketDifferentIP)).toBe(true);
      });
      
      it('should extract IP from X-Forwarded-For header', () => {
        const socket = createSocket({
          handshake: {
            headers: {
              'x-forwarded-for': '203.0.113.1, 198.51.100.1'
            }
          }
        });
        
        guard.canConnect(socket);
        
        const stats = guard.getStats();
        const ipConnection = stats.connections.byIP.find(conn => conn.ip === '203.0.113.1');
        expect(ipConnection).toBeDefined();
      });
      
      it('should extract IP from X-Real-IP header when X-Forwarded-For is not present', () => {
        const socket = createSocket({
          handshake: {
            headers: {
              'x-forwarded-for': undefined,
              'x-real-ip': '203.0.113.2'
            }
          }
        });
        
        guard.canConnect(socket);
        
        const stats = guard.getStats();
        const ipConnection = stats.connections.byIP.find(conn => conn.ip === '203.0.113.2');
        expect(ipConnection).toBeDefined();
      });
      
      it('should fall back to handshake address when no headers are present', () => {
        const socket = createSocket({
          handshake: {
            headers: {
              'x-forwarded-for': undefined,
              'x-real-ip': undefined
            },
            address: '192.168.1.200'
          }
        });
        
        guard.canConnect(socket);
        
        const stats = guard.getStats();
        const ipConnection = stats.connections.byIP.find(conn => conn.ip === '192.168.1.200');
        expect(ipConnection).toBeDefined();
      });
      
      it('should handle unknown IP gracefully', () => {
        const socket = createSocket({
          handshake: {
            headers: {
              'x-forwarded-for': undefined,
              'x-real-ip': undefined
            },
            address: null
          }
        });
        
        const result = guard.canConnect(socket);
        expect(result).toBe(true);
        
        const stats = guard.getStats();
        const unknownConnection = stats.connections.byIP.find(conn => conn.ip === 'unknown');
        expect(unknownConnection).toBeDefined();
      });
    });
    
    describe('User Connection Limits', () => {
      it('should enforce user connection limits when user is present', () => {
        const user = { id: 'user123' };
        const limit = 5; // 默认用户连接限制为5
        
        // 创建5个同一用户的连接
        for (let i = 0; i < limit; i++) {
          const socket = createSocket({
            id: `socket-user-${i}`,
            user: user
          });
          expect(guard.canConnect(socket)).toBe(true);
        }
        
        // 第6个连接应该被拒绝
        const overLimitSocket = createSocket({
          id: 'socket-user-over-limit',
          user: user
        });
        expect(guard.canConnect(overLimitSocket)).toBe(false);
        
        // 验证用户连接状态
        const stats = guard.getStats();
        const userConnection = stats.connections.byUser.find(conn => conn.user === 'user123');
        expect(userConnection).toBeDefined();
        expect(userConnection.count).toBe(5);
      });
      
      it('should handle different users independently', () => {
        const user1 = { id: 'user1' };
        const user2 = { id: 'user2' };
        
        // 填充用户1的连接数
        for (let i = 0; i < 5; i++) {
          const socket = createSocket({
            id: `socket-user1-${i}`,
            user: user1
          });
          expect(guard.canConnect(socket)).toBe(true);
        }
        
        // 用户2的连接应该能成功
        const socketUser2 = createSocket({
          id: 'socket-user2-1',
          user: user2
        });
        expect(guard.canConnect(socketUser2)).toBe(true);
      });
      
      it('should skip user limits when no user is present', () => {
        // 不应该应用用户限制
        for (let i = 0; i < 15; i++) {
          const socket = createSocket({
            id: `socket-anonymous-${i}`,
            user: null
          });
          const result = guard.canConnect(socket);
          
          // 应该只受IP限制(10)影响，而不是用户限制(5)
          if (i < 10) {
            expect(result).toBe(true);
          } else {
            expect(result).toBe(false);
          }
        }
      });
    });
    
    describe('Error Handling', () => {
      it('should handle exceptions gracefully and return false', () => {
        // 创建有问题的socket - 使用改进的工厂方法
        const problemSocket = createSocket({ problemType: 'nullHandshake' });
        
        const result = guard.canConnect(problemSocket);
        expect(result).toBe(false);
      });
      
      it('should log connection details on success', () => {
        const loggerSpy = jest.spyOn((guard as any).logger, 'debug');
        
        const socket = createSocket({ user: { id: 'testuser' } });
        guard.canConnect(socket);
        
        expect(loggerSpy).toHaveBeenCalledWith(
          'WebSocket连接已允许',
          expect.objectContaining({
            clientIP: expect.any(String),
            userId: expect.any(String),
            socketId: expect.any(String)
          })
        );
      });
      
      it('should log warnings when limits are exceeded', () => {
        const loggerSpy = jest.spyOn((guard as any).logger, 'warn');
        
        // 填满IP连接
        for (let i = 0; i < 10; i++) {
          const socket = createSocket({ id: `socket-${i}` });
          guard.canConnect(socket);
        }
        
        // 尝试超出限制
        const socket = createSocket({ id: 'socket-exceed' });
        guard.canConnect(socket);
        
        expect(loggerSpy).toHaveBeenCalledWith(
          'IP连接数超限',
          expect.objectContaining({
            clientIP: expect.any(String),
            currentConnections: 10,
            limit: 10
          })
        );
      });
    });
  });
  
  describe('canSendMessage', () => {
    let socket: Socket;
    
    beforeEach(() => {
      // 为了确保每个测试都是独立的，创建新socket并建立连接
      socket = createSocket({ id: 'message-test-socket' });
      expect(guard.canConnect(socket)).toBe(true);
    });
    
    describe('Message Rate Limiting', () => {
      it('should allow messages within rate limit', () => {
        // 一次测试不要发送太多消息，避免超过限制
        // 默认限制为每分钟120条消息
        for (let i = 0; i < 50; i++) {
          const result = guard.canSendMessage(socket, 'test-message');
          expect(result).toBe(true);
        }
        
        // 验证计数器状态
        const stats = guard.getStats();
        const counter = stats.messages.find(m => m.socketId === socket.id);
        expect(counter).toBeDefined();
        expect(counter.count).toBe(50);
      });
      
      it('should reject messages when rate limit is exceeded', () => {
        // 此测试使用全新的guard实例和socket
        
        // 超出默认限制每分钟120条消息
        for (let i = 0; i < 120; i++) {
          guard.canSendMessage(socket, 'test-message');
        }
        
        // 第121条消息应该被拒绝
        const result = guard.canSendMessage(socket, 'test-message');
        expect(result).toBe(false);
      });
      
      it('should reset message counter after time window', () => {
        // 用尽速率限制
        for (let i = 0; i < 120; i++) {
          guard.canSendMessage(socket, 'test-message');
        }
        
        // 应该被拒绝
        expect(guard.canSendMessage(socket, 'test-message')).toBe(false);
        
        // 快进超过1分钟窗口
        jest.advanceTimersByTime(61 * 1000);
        
        // 现在应该能发送消息了
        expect(guard.canSendMessage(socket, 'test-message')).toBe(true);
      });
    });
    
    describe('Burst Message Limiting', () => {
      it('should allow burst messages within limit', () => {
        // 默认突发限制为20条消息
        for (let i = 0; i < 20; i++) {
          const result = guard.canSendMessage(socket, 'burst-message');
          expect(result).toBe(true);
        }
      });
      
      it('should reject burst messages when limit is exceeded', () => {
        // 用尽突发限制(20条消息)
        for (let i = 0; i < 20; i++) {
          guard.canSendMessage(socket, 'burst-message');
        }
        
        // 第21条消息应该被拒绝
        const result = guard.canSendMessage(socket, 'burst-message');
        expect(result).toBe(false);
      });
      
      it('should reset burst counter after burst window', () => {
        // 用尽突发限制
        for (let i = 0; i < 20; i++) {
          guard.canSendMessage(socket, 'burst-message');
        }
        
        // 应该被拒绝
        expect(guard.canSendMessage(socket, 'burst-message')).toBe(false);
        
        // 快进超过10秒突发窗口
        jest.advanceTimersByTime(11 * 1000);
        
        // 现在应该能发送突发消息了
        expect(guard.canSendMessage(socket, 'burst-message')).toBe(true);
      });
    });
    
    describe('Error Handling', () => {
      it('should handle exceptions gracefully and return false', () => {
        // 使用改进的工厂方法创建问题Socket
        const problemSocket = createSocket({ problemType: 'completelyBroken' });
        
        const result = guard.canSendMessage(problemSocket, 'test-message');
        expect(result).toBe(false);
      });
      
      it('should log warnings when message limits are exceeded', () => {
        const loggerSpy = jest.spyOn((guard as any).logger, 'warn');
        
        // 用尽消息速率限制
        for (let i = 0; i < 120; i++) {
          guard.canSendMessage(socket, 'test-message');
        }
        
        // 尝试超出限制
        guard.canSendMessage(socket, 'test-message');
        
        expect(loggerSpy).toHaveBeenCalledWith(
          '消息频率超限',
          expect.objectContaining({
            clientIP: expect.any(String),
            socketId: expect.any(String),
            messageType: 'test-message'
          })
        );
      });
      
      it('should log warnings when burst limits are exceeded', () => {
        const loggerSpy = jest.spyOn((guard as any).logger, 'warn');
        
        // 用尽突发限制
        for (let i = 0; i < 20; i++) {
          guard.canSendMessage(socket, 'burst-message');
        }
        
        // 尝试超出突发限制
        guard.canSendMessage(socket, 'burst-message');
        
        expect(loggerSpy).toHaveBeenCalledWith(
          '突发消息超限',
          expect.objectContaining({
            clientIP: expect.any(String),
            socketId: expect.any(String),
            messageType: 'burst-message'
          })
        );
      });
    });
  });
  
  describe('canSubscribe', () => {
    let socket: Socket;
    
    beforeEach(() => {
      socket = createSocket();
      guard.canConnect(socket);
    });
    
    it('should allow subscriptions within limit', () => {
      // 默认限制为每连接50个订阅
      for (let i = 0; i < 50; i++) {
        const result = guard.canSubscribe(socket, `symbol-${i}`);
        expect(result).toBe(true);
      }
      
      const stats = guard.getStats();
      const subscription = stats.subscriptions.find(sub => sub.socketId === socket.id);
      expect(subscription).toBeDefined();
      expect(subscription.count).toBe(50);
      expect(subscription.symbols).toHaveLength(50);
    });
    
    it('should reject subscriptions when limit is exceeded', () => {
      // 填充到限制
      for (let i = 0; i < 50; i++) {
        guard.canSubscribe(socket, `symbol-${i}`);
      }
      
      // 第51个订阅应该被拒绝
      const result = guard.canSubscribe(socket, 'symbol-51');
      expect(result).toBe(false);
    });
    
    it('should handle duplicate symbol subscriptions', () => {
      // 多次订阅同一个symbol
      guard.canSubscribe(socket, 'AAPL');
      guard.canSubscribe(socket, 'AAPL'); // 重复
      guard.canSubscribe(socket, 'AAPL'); // 重复
      
      const stats = guard.getStats();
      const subscription = stats.subscriptions.find(sub => sub.socketId === socket.id);
      expect(subscription.count).toBe(1); // 应该只计算一次
      expect(subscription.symbols).toEqual(['AAPL']);
    });
    
    it('should log warnings when subscription limit is exceeded', () => {
      const loggerSpy = jest.spyOn((guard as any).logger, 'warn');
      
      // 填充到限制
      for (let i = 0; i < 50; i++) {
        guard.canSubscribe(socket, `symbol-${i}`);
      }
      
      // 尝试超出限制
      guard.canSubscribe(socket, 'symbol-exceed');
      
      expect(loggerSpy).toHaveBeenCalledWith(
        '订阅数量超限',
        expect.objectContaining({
          clientIP: expect.any(String),
          socketId: socket.id,
          symbol: 'symbol-exceed',
          currentSubscriptions: 50,
          limit: 50
        })
      );
    });
  });
  
  describe('removeSubscription', () => {
    let socket: Socket;
    
    beforeEach(() => {
      socket = createSocket();
      guard.canConnect(socket);
    });
    
    it('should remove specific subscriptions', () => {
      // 添加一些订阅
      guard.canSubscribe(socket, 'AAPL');
      guard.canSubscribe(socket, 'GOOGL');
      guard.canSubscribe(socket, 'MSFT');
      
      // 移除一个订阅
      guard.removeSubscription(socket, 'GOOGL');
      
      const stats = guard.getStats();
      const subscription = stats.subscriptions.find(sub => sub.socketId === socket.id);
      expect(subscription.count).toBe(2);
      expect(subscription.symbols).toEqual(expect.arrayContaining(['AAPL', 'MSFT']));
      expect(subscription.symbols).not.toContain('GOOGL');
    });
    
    it('should clean up subscription record when all subscriptions are removed', () => {
      // 添加一个订阅
      guard.canSubscribe(socket, 'AAPL');
      
      // 验证存在
      let stats = guard.getStats();
      expect(stats.subscriptions.find(sub => sub.socketId === socket.id)).toBeDefined();
      
      // 移除订阅
      guard.removeSubscription(socket, 'AAPL');
      
      // 应该清除整个记录
      stats = guard.getStats();
      expect(stats.subscriptions.find(sub => sub.socketId === socket.id)).toBeUndefined();
    });
    
    it('should handle removing non-existent subscriptions gracefully', () => {
      // 尝试移除不存在的订阅
      guard.removeSubscription(socket, 'NON_EXISTENT');
      
      // 不应该有任何问题
      const stats = guard.getStats();
      expect(stats.subscriptions.find(sub => sub.socketId === socket.id)).toBeUndefined();
    });
    
    it('should allow new subscriptions after removal', () => {
      // 填充到限制
      for (let i = 0; i < 50; i++) {
        guard.canSubscribe(socket, `symbol-${i}`);
      }
      
      // 应该已经达到限制
      expect(guard.canSubscribe(socket, 'new-symbol')).toBe(false);
      
      // 移除一些订阅
      guard.removeSubscription(socket, 'symbol-0');
      guard.removeSubscription(socket, 'symbol-1');
      
      // 现在应该能添加新的订阅
      expect(guard.canSubscribe(socket, 'new-symbol-1')).toBe(true);
      expect(guard.canSubscribe(socket, 'new-symbol-2')).toBe(true);
    });
  });
  
  describe('onDisconnect', () => {
    it('should clean up all resources for disconnected socket', () => {
      const socket = createSocket({ user: { id: 'testuser' } });
      
      // 建立连接并添加一些数据
      guard.canConnect(socket);
      guard.canSendMessage(socket, 'test-message');
      guard.canSubscribe(socket, 'AAPL');
      guard.canSubscribe(socket, 'GOOGL');
      
      // 验证数据存在
      let stats = guard.getStats();
      expect(stats.connections.byIP.find(conn => conn.sockets.includes(socket.id))).toBeDefined();
      expect(stats.connections.byUser.find(conn => conn.sockets.includes(socket.id))).toBeDefined();
      expect(stats.messages.find(msg => msg.socketId === socket.id)).toBeDefined();
      expect(stats.subscriptions.find(sub => sub.socketId === socket.id)).toBeDefined();
      
      // 断开连接
      guard.onDisconnect(socket);
      
      // 验证所有数据都被清理
      stats = guard.getStats();
      expect(stats.connections.byIP.find(conn => conn.sockets.includes(socket.id))).toBeUndefined();
      expect(stats.connections.byUser.find(conn => conn.sockets.includes(socket.id))).toBeUndefined();
      expect(stats.messages.find(msg => msg.socketId === socket.id)).toBeUndefined();
      expect(stats.subscriptions.find(sub => sub.socketId === socket.id)).toBeUndefined();
    });
    
    it('should log disconnection details', () => {
      const loggerSpy = jest.spyOn((guard as any).logger, 'debug');
      
      const socket = createSocket({ user: { id: 'testuser' } });
      guard.canConnect(socket);
      guard.onDisconnect(socket);
      
      expect(loggerSpy).toHaveBeenCalledWith(
        'WebSocket连接已清理',
        expect.objectContaining({
          clientIP: expect.any(String),
          userId: expect.any(String),
          socketId: socket.id
        })
      );
    });
  });
  
  describe('Complex Usage Scenarios', () => {
    it('should handle multiple users from same IP correctly', () => {
      const user1 = { id: 'user1' };
      const user2 = { id: 'user2' };
      
      // 从同一IP连接不同用户
      const socket1 = createSocket({ id: 'socket-1', user: user1 });
      const socket2 = createSocket({ id: 'socket-2', user: user1 });
      const socket3 = createSocket({ id: 'socket-3', user: user2 });
      
      expect(guard.canConnect(socket1)).toBe(true);
      expect(guard.canConnect(socket2)).toBe(true);
      expect(guard.canConnect(socket3)).toBe(true);
      
      const stats = guard.getStats();
      
      // 应该有一个IP有3个socket
      expect(stats.connections.byIP).toHaveLength(1);
      expect(stats.connections.byIP[0].count).toBe(3);
      
      // 应该有两个用户
      expect(stats.connections.byUser).toHaveLength(2);
      
      const user1Connection = stats.connections.byUser.find(conn => conn.user === 'user1');
      const user2Connection = stats.connections.byUser.find(conn => conn.user === 'user2');
      
      expect(user1Connection.count).toBe(2);
      expect(user2Connection.count).toBe(1);
    });
    
    it('should maintain accurate counts during complex operations', () => {
      const socket = createSocket({ user: { id: 'testuser' } });
      
      // 连接
      guard.canConnect(socket);
      
      // 发送消息
      for (let i = 0; i < 10; i++) {
        guard.canSendMessage(socket, `message-${i}`);
      }
      
      // 添加订阅
      for (let i = 0; i < 5; i++) {
        guard.canSubscribe(socket, `symbol-${i}`);
      }
      
      // 移除一些订阅
      guard.removeSubscription(socket, 'symbol-0');
      guard.removeSubscription(socket, 'symbol-1');
      
      const stats = guard.getStats();
      
      // 验证计数准确性
      expect(stats.connections.byIP[0].count).toBe(1);
      expect(stats.connections.byUser[0].count).toBe(1);
      expect(stats.messages[0].count).toBe(10);
      expect(stats.subscriptions[0].count).toBe(3);
      expect(stats.subscriptions[0].symbols).toEqual(['symbol-2', 'symbol-3', 'symbol-4']);
    });
  });
});

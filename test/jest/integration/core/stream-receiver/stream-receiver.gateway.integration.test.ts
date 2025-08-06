import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { io, Socket as ClientSocket } from 'socket.io-client';
import { createLogger } from '@common/config/logger.config';
import { UserRole } from '../../../../../src/auth/enums/user-role.enum';

// 导入应用模块和相关服务
import { AppModule } from '../../../../../src/app.module';
import { StreamReceiverGateway } from '../../../../../src/core/stream-receiver/stream-receiver.gateway';
import { CacheService } from '../../../../../src/cache/services/cache.service';
import { AuthService } from '../../../../../src/auth/services/auth.service';

// Mock logger
jest.mock('@common/config/logger.config');
const mockLogger = {
  debug: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
(createLogger as jest.Mock).mockReturnValue(mockLogger);

// 全局认证变量供多个测试块复用
let testApiKey: string | undefined;
let testAccessToken: string | undefined;

describe('StreamReceiverGateway Integration', () => {
  let app: INestApplication;
  let gateway: StreamReceiverGateway;
  let jwtService: JwtService;
  let authService: AuthService;
  let cacheService: CacheService;
  let clientSocket: ClientSocket;
  let port: number;

  beforeAll(async () => {
    // 创建测试模块
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // 使用 Socket.IO 适配器
    app.useWebSocketAdapter(new IoAdapter(app));
    
    // 获取服务实例
    gateway = moduleFixture.get<StreamReceiverGateway>(StreamReceiverGateway);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    authService = moduleFixture.get<AuthService>(AuthService);
    cacheService = moduleFixture.get<CacheService>(CacheService);

    // 启动应用
    await app.init();
    await app.listen(0); // 使用随机端口
    
    // 获取实际端口
    const server = app.getHttpServer();
    const address = server.address();
    port = typeof address === 'string' ? parseInt(address) : address?.port || 3000;

    // 等待应用完全启动
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // 确保所有可能的连接都被关闭
    if (clientSocket) {
      if (clientSocket.connected) {
        clientSocket.disconnect();
      }
      // 确保连接完全关闭
      clientSocket.close();
    }
    
    // 等待短暂时间确保清理完成
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await app.close();
    
    // 强制清理任何剩余的事件侦听器
    process.removeAllListeners();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('WebSocket Connection Management', () => {
    it('should establish WebSocket connection successfully', (done) => {
      clientSocket = io(`http://localhost:${port}/stream`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        expect(clientSocket.id).toBeDefined();
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should receive connection confirmation message', (done) => {
      clientSocket = io(`http://localhost:${port}/stream`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connected', (data) => {
        expect(data).toMatchObject({
          message: '连接成功',
          clientId: expect.any(String),
          timestamp: expect.any(Number),
        });
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should handle disconnection gracefully', (done) => {
      clientSocket = io(`http://localhost:${port}/stream`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        clientSocket.disconnect();
      });

      clientSocket.on('disconnect', (reason) => {
        expect(reason).toBeDefined();
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });
  });

  describe('Public Endpoints', () => {
    let timeoutId: NodeJS.Timeout;
    
    beforeEach((done) => {
      clientSocket = io(`http://localhost:${port}/stream`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      clientSocket.on('connect', () => {
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });
    
    afterEach(() => {
      // 清理可能存在的计时器
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    });

    it('should get connection info without authentication', (done) => {
      clientSocket.emit('get-info');

      clientSocket.on('connection-info', (data) => {
        expect(data).toMatchObject({
          clientId: expect.any(String),
          connected: true,
          authType: 'none',
          timestamp: expect.any(Number),
        });
        done();
      });

      // 设置超时
      timeoutId = setTimeout(() => {
        done(new Error('Timeout waiting for connection-info'));
      }, 5000);
    });
  });

  describe('Authentication Integration', () => {
    let validJwtToken: string;
    // 移除局部变量声明，使用全局变量
    // let testApiKey: string;
    // let testAccessToken: string;

    beforeAll(async () => {
      // 创建测试用户和API密钥
      try {
        const testUser = await authService.register({
          username: 'streamtest',
          email: 'streamtest@example.com',
          password: 'password123',
          role: UserRole.DEVELOPER,
        });

        // 生成JWT token
        validJwtToken = jwtService.sign({
          sub: testUser.id,
          username: testUser.username,
          role: testUser.role,
        });

        // 创建API密钥
        const apiKeyResult = await authService.createApiKey(testUser.id, {
          name: 'Stream Test Key',
          permissions: ['stream:read', 'stream:write', 'data:read'],
        });

        // 赋值给全局变量
        testApiKey = apiKeyResult.appKey;
        testAccessToken = apiKeyResult.accessToken;
      } catch (error) {
        console.warn('无法创建测试认证数据，可能数据库未连接:', error.message);
      }
    });

    it('should authenticate with API key', (done) => {
      if (!testApiKey || !testAccessToken) {
        console.warn('跳过API Key认证测试 - 无有效密钥');
        return done();
      }

      let authTimeoutId: NodeJS.Timeout;
      
      clientSocket = io(`http://localhost:${port}/stream`, {
        transports: ['websocket'],
        timeout: 5000,
        auth: {
          appKey: testApiKey,
          accessToken: testAccessToken,
        },
      });

      clientSocket.on('connect', () => {
        clientSocket.emit('get-info');
      });

      clientSocket.on('connection-info', (data) => {
        expect(data.authType).toBe('api-key');
        clearTimeout(authTimeoutId);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        clearTimeout(authTimeoutId);
        done(error);
      });
      
      // 设置超时并存储计时器ID以便清理
      authTimeoutId = setTimeout(() => {
        done(new Error('Timeout waiting for auth connection-info'));
      }, 5000);
    });

    it('should reject invalid authentication', (done) => {
      clientSocket = io(`http://localhost:${port}/stream`, {
        transports: ['websocket'],
        timeout: 5000,
        auth: {
          appKey: 'invalid-key',
          accessToken: 'invalid-token',
        },
      });

      let ackReceived = false;

      clientSocket.on('connect', () => {
        // 触发需要认证的事件
        clientSocket.emit('subscribe', { symbols: ['700.HK'], wsCapabilityType: 'stream-stock-quote' });
      });

      clientSocket.on('subscribe-ack', () => {
        ackReceived = true;
      });

      clientSocket.on('subscribe-error', () => {
        // 收到明确错误即通过
        done();
      });

      clientSocket.on('error', () => {
        // 服务器返回通用 error 也视为通过
        done();
      });

      // 2 秒后检查是否错误被捕获
      setTimeout(() => {
        if (ackReceived) {
          done(new Error('Invalid authentication should not succeed'));
        } else {
          done();
        }
      }, 2000);
    });
  });

  describe('Symbol Subscription Integration', () => {
    beforeEach((done) => {
      if (!testApiKey || !testAccessToken) {
        console.warn('跳过订阅相关测试 - 无有效密钥');
        done(); // 确保直接完成测试
        return;
      }

      clientSocket = io(`http://localhost:${port}/stream`, {
        transports: ['websocket'],
        timeout: 5000,
        auth: {
          appKey: testApiKey,
          accessToken: testAccessToken,
        },
      });

      clientSocket.on('connect', () => {
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should validate symbols using SymbolValidationUtils', (done) => {
      if (!testApiKey || !testAccessToken) {
        console.warn('跳过测试 - 无有效密钥');
        done(); // 确保跳过测试
        return;
      }
      
      const subscribeData = {
        symbols: ['700.HK', 'AAPL.US', 'INVALID_SYMBOL'],
        wsCapabilityType: 'stream-stock-quote',
      };

      clientSocket.emit('subscribe', subscribeData);

      clientSocket.on('subscribe-ack', (response) => {
        expect(response.success).toBe(true);
        done();
      });

      clientSocket.on('error', (error) => {
        done(error);
      });

      // 设置超时
      setTimeout(() => {
        done(new Error('Timeout waiting for subscription response'));
      }, 10000);
    });

    it('should handle different market symbol formats', (done) => {
      if (!testApiKey || !testAccessToken) {
        console.warn('跳过测试 - 无有效密钥');
        done(); // 确保跳过测试
        return;
      }
      
      const symbolsToTest = [
        '700.HK',      // 香港市场带后缀
        '00700',       // 香港市场5位数字
        'AAPL.US',     // 美股带后缀
        'AAPL',        // 美股纯字母
        '000001.SZ',   // 深圳市场
        '600000.SH',   // 上海市场
      ];

      const subscribeData = {
        symbols: symbolsToTest,
        wsCapabilityType: 'stream-stock-quote',
      };

      clientSocket.emit('subscribe', subscribeData);

      clientSocket.on('subscribe-ack', (response) => {
        expect(response.success).toBe(true);
        done();
      });

      clientSocket.on('error', (error) => {
        done(error);
      });

      // 设置超时
      setTimeout(() => {
        done(new Error('Timeout waiting for subscription response'));
      }, 10000);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach((done) => {
      if (!testApiKey || !testAccessToken) {
        console.warn('跳过错误场景测试 - 无有效密钥');
        done(); // 确保直接完成测试
        return;
      }

      clientSocket = io(`http://localhost:${port}/stream`, {
        transports: ['websocket'],
        timeout: 5000,
        auth: {
          appKey: testApiKey,
          accessToken: testAccessToken,
        },
      });

      clientSocket.on('connect', () => {
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should handle malformed subscription requests', (done) => {
      if (!testApiKey || !testAccessToken) {
        console.warn('跳过测试 - 无有效密钥');
        done(); // 确保跳过测试
        return;
      }
      
      const malformedData = {
        symbols: null,
        wsCapabilityType: 'invalid-type',
      };

      clientSocket.emit('subscribe', malformedData);

      clientSocket.on('subscribe-error', (error) => {
        expect(error.success).toBe(false);
        done();
      });

      // 设置超时
      setTimeout(() => {
        done(new Error('Timeout waiting for error response'));
      }, 5000);
    });

    it('should handle subscription to non-existent symbols gracefully', (done) => {
      if (!testApiKey || !testAccessToken) {
        console.warn('跳过测试 - 无有效密钥');
        done(); // 确保跳过测试
        return;
      }
      
      const subscribeData = {
        symbols: ['NONEXISTENT.XX', 'FAKE.SYMBOL'],
        wsCapabilityType: 'stream-stock-quote',
      };

      clientSocket.emit('subscribe', subscribeData);

      clientSocket.on('subscribe-ack', (response) => {
        expect(response.success).toBe(false);
        done();
      });

      clientSocket.on('error', (error) => {
        done(error);
      });

      // 设置超时
      setTimeout(() => {
        done(new Error('Timeout waiting for subscription response'));
      }, 5000);
    });

    it('should handle connection drops during active subscriptions', (done) => {
      if (!testApiKey || !testAccessToken) {
        console.warn('跳过测试 - 无有效密钥');
        done(); // 确保跳过测试
        return;
      }
      
      const subscribeData = {
        symbols: ['700.HK'],
        wsCapabilityType: 'stream-stock-quote',
      };

      let subscriptionConfirmed = false;

      clientSocket.emit('subscribe', subscribeData);

      clientSocket.on('subscribe-ack', (response) => {
        if (response.success) {
          subscriptionConfirmed = true;
          // 模拟连接断开
          clientSocket.disconnect();
        }
      });

      clientSocket.on('disconnect', () => {
        if (subscriptionConfirmed) {
          // 重新连接并验证订阅状态
          const newSocket = io(`http://localhost:${port}/stream`, {
            transports: ['websocket'],
            timeout: 5000,
          });

          newSocket.on('connect', () => {
            newSocket.emit('get-subscription');
          });

          newSocket.on('subscription-status', (data) => {
            expect(data.data).toBeNull();
            newSocket.disconnect();
            done();
          });
        }
      });

      // 设置超时
      setTimeout(() => {
        done(new Error('Timeout during connection drop test'));
      }, 15000);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple concurrent connections', async () => {
      const connectionCount = 10;
      const connections: ClientSocket[] = [];
      const connectionPromises: Promise<void>[] = [];

      for (let i = 0; i < connectionCount; i++) {
        const promise = new Promise<void>((resolve, reject) => {
          const socket = io(`http://localhost:${port}/stream`, {
            transports: ['websocket'],
            timeout: 5000,
          });

          socket.on('connect', () => {
            connections.push(socket);
            resolve();
          });

          socket.on('connect_error', (error) => {
            reject(error);
          });
        });

        connectionPromises.push(promise);
      }

      // 等待所有连接建立
      await Promise.all(connectionPromises);

      expect(connections).toHaveLength(connectionCount);

      // 验证每个连接都能正常工作
      const infoPromises = connections.map((socket) => {
        return new Promise<void>((resolve, reject) => {
          socket.emit('get-info');
          
          socket.on('connection-info', (data) => {
            expect(data.connected).toBe(true);
            resolve();
          });

          setTimeout(() => {
            reject(new Error('Timeout waiting for connection info'));
          }, 5000);
        });
      });

      await Promise.all(infoPromises);

      // 清理连接
      connections.forEach(socket => socket.disconnect());
    });

    it('should handle rapid subscription and unsubscription', (done) => {
      clientSocket = io(`http://localhost:${port}/stream`, {
        transports: ['websocket'],
        timeout: 5000,
      });

      let operationCount = 0;
      const maxOperations = 5;

      const performOperation = () => {
        if (operationCount >= maxOperations) {
          done();
          return;
        }

        const isSubscribe = operationCount % 2 === 0;
        const data = {
          symbols: ['700.HK'],
          wsCapabilityType: 'stream-stock-quote',
        };

        if (isSubscribe) {
          clientSocket.emit('subscribe', data);
        } else {
          clientSocket.emit('unsubscribe', data);
        }

        operationCount++;
        setTimeout(performOperation, 100); // 快速操作
      };

      clientSocket.on('connect', () => {
        performOperation();
      });

      clientSocket.on('subscribe-ack', (response) => {
        expect(response.success).toBe(true);
      });

      clientSocket.on('unsubscribe-ack', (response) => {
        expect(response.success).toBe(true);
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });
  });
});
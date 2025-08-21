/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Gateway Legacy移除验证集成测试
 * 专门用于验证Gateway功能完整性，确保Legacy代码移除前系统准备就绪
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { io, Socket } from 'socket.io-client';
import { WebSocketServerProvider, WEBSOCKET_SERVER_TOKEN } from '../../../../src/core/03-fetching/stream-data-fetcher/providers/websocket-server.provider';
import { StreamReceiverGateway } from '../../../../src/core/01-entry/stream-receiver/gateway/stream-receiver.gateway';
import { StreamClientStateManager } from '../../../../src/core/03-fetching/stream-data-fetcher/services/stream-client-state-manager.service';

describe('Gateway Legacy移除验证测试', () => {
  let app: INestApplication;
  let module: TestingModule;
  let gateway: StreamReceiverGateway;
  let webSocketProvider: WebSocketServerProvider;
  let clientStateManager: StreamClientStateManager;
  let server: Server;
  let httpServer: HttpServer;
  let clientSocket: Socket;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        StreamReceiverGateway,
        {
          provide: WEBSOCKET_SERVER_TOKEN,
          useClass: WebSocketServerProvider,
        },
        // Mock其他依赖
        {
          provide: 'StreamReceiverService',
          useValue: {
            subscribeStream: jest.fn(),
            unsubscribeStream: jest.fn(),
          },
        },
        {
          provide: 'AuthService',
          useValue: {
            validateApiKey: jest.fn().mockResolvedValue({ isValid: true, apiKey: { name: 'test' } }),
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    
    // 获取服务实例
    gateway = module.get<StreamReceiverGateway>(StreamReceiverGateway);
    webSocketProvider = module.get<WebSocketServerProvider>(WEBSOCKET_SERVER_TOKEN);
    
    await app.init();
    
    // 获取HTTP服务器实例用于地址获取
    httpServer = app.getHttpServer();
    await app.listen(0); // 使用动态端口
    
    // 获取Socket.IO服务器实例  
    server = app.get('socket.io.server'); // 或者从provider获取
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    await app.close();
  });

  describe('Gateway健康状态验证', () => {
    test('应该通过基础健康检查', () => {
      const healthStatus = webSocketProvider.healthCheck();
      
      expect(healthStatus.status).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthStatus.status);
      expect(healthStatus.details).toBeDefined();
    });

    test('应该通过Legacy移除准备检查', () => {
      const readinessCheck = webSocketProvider.isReadyForLegacyRemoval();
      
      expect(readinessCheck).toHaveProperty('ready');
      expect(readinessCheck).toHaveProperty('details');
      
      if (!readinessCheck.ready) {
        console.warn('Gateway尚未准备好移除Legacy:', readinessCheck.reason);
        expect(readinessCheck.reason).toBeDefined();
      } else {
        expect(readinessCheck.details.gatewayValidation).toBeDefined();
        expect(readinessCheck.details.gatewayValidation.validationTime).toBeDefined();
      }
    });
  });

  describe('Gateway广播功能验证', () => {
    beforeEach(async () => {
      // 创建测试客户端连接
      const address = httpServer.address();
      const port = typeof address === 'object' && address ? address.port : 3000;
      clientSocket = io(`http://localhost:${port}`, {
        auth: {
          'x-app-key': 'test-key',
          'x-access-token': 'test-token'
        }
      });

      await new Promise<void>((resolve) => {
        clientSocket.on('connect', resolve);
      });
    });

    afterEach(() => {
      if (clientSocket) {
        clientSocket.disconnect();
      }
    });

    test('应该能成功建立WebSocket连接', () => {
      expect(clientSocket.connected).toBe(true);
      expect(clientSocket.id).toBeDefined();
    });

    test('应该能够加入符号房间', async () => {
      const testSymbol = 'TEST.HK';
      
      // 模拟客户端加入房间
      await new Promise<void>((resolve) => {
        clientSocket.emit('subscribe', {
          symbols: [testSymbol],
          capability: 'stream-stock-quote'
        });
        
        clientSocket.on('subscribed', (data) => {
          expect(data.symbols).toContain(testSymbol);
          resolve();
        });
      });
    });

    test('应该能够通过Gateway广播消息到房间', async () => {
      const testSymbol = 'BROADCAST.TEST';
      const testData = { 
        symbol: testSymbol, 
        price: 100.50, 
        timestamp: new Date().toISOString() 
      };

      // 客户端加入房间
      await new Promise<void>((resolve) => {
        clientSocket.emit('join', `symbol:${testSymbol}`);
        clientSocket.on('joined', resolve);
      });

      // 验证Gateway广播功能
      const broadcastSuccess = await webSocketProvider.broadcastToRoom(
        `symbol:${testSymbol}`,
        'data',
        testData
      );

      expect(broadcastSuccess).toBe(true);

      // 验证客户端收到消息
      await new Promise<void>((resolve) => {
        clientSocket.on('data', (receivedData) => {
          expect(receivedData.symbol).toBe(testSymbol);
          expect(receivedData.price).toBe(100.50);
          resolve();
        });
      });
    });

    test('应该能处理Gateway广播错误情况', async () => {
      // 测试向不存在的房间广播
      const result = await webSocketProvider.broadcastToRoom(
        'nonexistent:room',
        'data',
        { test: 'data' }
      );

      // Gateway应该优雅处理这种情况（不抛出异常）
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Gateway统计信息验证', () => {
    test('应该能获取准确的服务器统计信息', () => {
      const stats = webSocketProvider.getServerStats();
      
      expect(stats).toHaveProperty('isAvailable');
      expect(stats).toHaveProperty('connectedClients');
      expect(stats).toHaveProperty('serverPath');
      expect(stats).toHaveProperty('namespaces');
      expect(stats).toHaveProperty('serverSource');
      
      // 验证serverSource应该是'gateway'而不是'legacy'
      if (stats.isAvailable) {
        expect(stats.serverSource).toBe('gateway');
      }
    });

    test('应该报告正确的连接状态', () => {
      const isAvailable = webSocketProvider.isServerAvailable();
      const stats = webSocketProvider.getServerStats();
      
      expect(isAvailable).toBe(stats.isAvailable);
      
      if (isAvailable) {
        expect(stats.connectedClients).toBeGreaterThanOrEqual(0);
        expect(stats.serverPath).toBeDefined();
      }
    });
  });

  describe('Legacy移除准备状态', () => {
    test('应该确认Gateway-Provider集成完成', () => {
      const readinessCheck = webSocketProvider.isReadyForLegacyRemoval();
      
      if (readinessCheck.ready) {
        // Gateway已准备好，可以安全移除Legacy
        expect(readinessCheck.details.serverSource).toBe('gateway');
        expect(readinessCheck.details.gatewayValidation).toBeDefined();
        
        console.log('✅ Gateway已准备好移除Legacy代码');
        console.log('Gateway验证详情:', readinessCheck.details.gatewayValidation);
      } else {
        // Gateway尚未准备好，需要先修复
        console.warn('⚠️ Gateway尚未准备好移除Legacy:', readinessCheck.reason);
        console.warn('详情:', readinessCheck.details);
        
        // 这种情况下测试应该失败，提醒开发者先修复Gateway
        throw new Error(`Gateway未准备好移除Legacy: ${readinessCheck.reason}`);
      }
    });

    test('应该验证没有Critical级别的问题', () => {
      const healthStatus = webSocketProvider.healthCheck();
      
      // 健康状态不应该是unhealthy
      expect(healthStatus.status).not.toBe('unhealthy');
      
      if (healthStatus.status === 'degraded') {
        console.warn('⚠️ Gateway状态降级:', healthStatus.details);
      }
      
      if (healthStatus.status === 'healthy') {
        console.log('✅ Gateway状态健康');
      }
    });
  });
});

/**
 * 测试辅助函数
 */
class GatewayValidationHelper {
  static async validateGatewayReadiness(provider: WebSocketServerProvider): Promise<boolean> {
    const readinessCheck = provider.isReadyForLegacyRemoval();
    
    if (!readinessCheck.ready) {
      console.error('Gateway验证失败:', readinessCheck.reason);
      console.error('详情:', readinessCheck.details);
      return false;
    }
    
    console.log('Gateway验证通过');
    return true;
  }
  
  static logGatewayStats(provider: WebSocketServerProvider): void {
    const stats = provider.getServerStats();
    console.log('Gateway统计信息:', {
      可用状态: stats.isAvailable,
      连接数: stats.connectedClients,
      服务器路径: stats.serverPath,
      房间数: stats.namespaces.length,
      服务器来源: stats.serverSource
    });
  }
}

export { GatewayValidationHelper };
/**
 * WebSocketServerProvider单元测试
 * 验证Gateway集成和健康检查功能
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Server } from "socket.io";
import {
  WebSocketServerProvider,
  WEBSOCKET_SERVER_TOKEN,
} from "../../../../../../../src/core/03-fetching/stream-data-fetcher/providers/websocket-server.provider";

describe("WebSocketServerProvider单元测试", () => {
  let provider: WebSocketServerProvider;
  let module: TestingModule;
  let mockServer: jest.Mocked<Server>;

  beforeEach(async () => {
    // 创建Mock服务器
    mockServer = {
      path: jest.fn().mockReturnValue("/socket.io"),
      engine: {
        clientsCount: 0,
      },
      of: jest.fn().mockReturnValue({
        adapter: {
          rooms: new Map(),
        },
      }),
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        sockets: new Map(),
      },
    } as any;

    module = await Test.createTestingModule({
      providers: [
        {
          provide: WEBSOCKET_SERVER_TOKEN,
          useClass: WebSocketServerProvider,
        },
      ],
    }).compile();

    provider = module.get<WebSocketServerProvider>(WEBSOCKET_SERVER_TOKEN);
  });

  afterEach(async () => {
    await module.close();
  });

  describe("Gateway集成测试", () => {
    test("应该能正确设置Gateway服务器", () => {
      // 设置Gateway服务器
      provider.setGatewayServer(mockServer);

      // 验证状态
      expect(provider.isServerAvailable()).toBe(true);
      expect(provider.getServer()).toBe(mockServer);

      const stats = provider.getServerStats();
      expect(stats.serverSource).toBe("gateway");
      expect(stats.isAvailable).toBe(true);
    });

    test("应该区分Gateway模式和Legacy模式", () => {
      // 先设置Legacy服务器
      provider.setServer(mockServer);
      let stats = provider.getServerStats();
      expect(stats.serverSource).toBe("legacy");

      // 再设置Gateway服务器（应该覆盖Legacy）
      provider.setGatewayServer(mockServer);
      stats = provider.getServerStats();
      expect(stats.serverSource).toBe("gateway");
    });

    test("Gateway服务器应该优先于Legacy服务器", () => {
      // 设置两个不同的服务器实例
      const legacyServer = {
        ...mockServer,
        path: jest.fn().mockReturnValue("/legacy"),
      } as any;
      const gatewayServer = {
        ...mockServer,
        path: jest.fn().mockReturnValue("/gateway"),
      } as any;

      provider.setServer(legacyServer);
      provider.setGatewayServer(gatewayServer);

      // Gateway应该优先
      expect(provider.getServer()).toBe(gatewayServer);
      expect(provider.getServer()).not.toBe(legacyServer);
    });
  });

  describe("健康检查测试", () => {
    test("没有服务器时应该返回unhealthy", () => {
      const health = provider.healthCheck();

      expect(health.status).toBe("unhealthy");
      expect(health.details.reason).toBe("No server instance");
      expect(health.details.hasGatewayServer).toBe(false);
      expect(health.details.hasLegacyServer).toBe(false);
    });

    test("有Gateway服务器时应该返回healthy", () => {
      provider.setGatewayServer(mockServer);

      const health = provider.healthCheck();

      expect(health.status).toBe("healthy");
      expect(health.details.serverSource).toBe("gateway");
      expect(health.details.isAvailable).toBe(true);
    });

    test("有Legacy服务器时应该返回healthy", () => {
      provider.setServer(mockServer);

      const health = provider.healthCheck();

      expect(health.status).toBe("healthy");
      expect(health.details.serverSource).toBe("legacy");
      expect(health.details.isAvailable).toBe(true);
    });
  });

  describe("Legacy移除准备检查", () => {
    test("没有Gateway服务器时应该返回not ready", () => {
      // 只设置Legacy服务器
      provider.setServer(mockServer);

      const readiness = provider.isReadyForLegacyRemoval();

      expect(readiness.ready).toBe(false);
      expect(readiness.reason).toContain("Gateway服务器未集成");
      expect(readiness.details.hasGatewayServer).toBe(false);
      expect(readiness.details.serverSource).toBe("legacy");
    });

    test("有Gateway服务器时应该返回ready", () => {
      provider.setGatewayServer(mockServer);

      const readiness = provider.isReadyForLegacyRemoval();

      expect(readiness.ready).toBe(true);
      expect(readiness.details.gatewayValidation).toBeDefined();
      expect(readiness.details.gatewayValidation.serverPath).toBe("/socket.io");
      expect(readiness.details.gatewayValidation.validationTime).toBeDefined();
    });

    test("Gateway服务器异常时应该返回not ready", () => {
      // 创建有问题的服务器
      const brokenServer = {
        path: jest.fn().mockImplementation(() => {
          throw new Error("Server error");
        }),
      } as any;

      provider.setGatewayServer(brokenServer);

      const readiness = provider.isReadyForLegacyRemoval();

      expect(readiness.ready).toBe(false);
      expect(readiness.reason).toContain("Gateway功能验证失败");
      expect(readiness.details.error).toBe("Server error");
    });
  });

  describe("广播功能测试", () => {
    beforeEach(() => {
      provider.setGatewayServer(mockServer);
    });

    test("应该能向房间广播消息", async () => {
      const result = await provider.broadcastToRoom("test-room", "test-event", {
        test: "data",
      });

      expect(result).toBe(true);
      expect(mockServer.to).toHaveBeenCalledWith("test-room");
      expect(mockServer.emit).toHaveBeenCalledWith("test-event", {
        test: "data",
      });
    });

    test("服务器不可用时广播应该失败", async () => {
      provider.reset(); // 重置服务器

      const result = await provider.broadcastToRoom("test-room", "test-event", {
        test: "data",
      });

      expect(result).toBe(false);
    });
  });

  describe("重置功能测试", () => {
    test("重置应该清除所有服务器实例", () => {
      provider.setGatewayServer(mockServer);
      provider.setServer(mockServer);

      // 验证设置成功
      expect(provider.isServerAvailable()).toBe(true);

      // 执行重置
      provider.reset();

      // 验证重置结果
      expect(provider.isServerAvailable()).toBe(false);
      expect(provider.getServer()).toBeNull();

      const health = provider.healthCheck();
      expect(health.status).toBe("unhealthy");
      expect(health.details.hasGatewayServer).toBe(false);
      expect(health.details.hasLegacyServer).toBe(false);
    });
  });
});

import { Injectable } from "@nestjs/common";
import { Server } from "socket.io";
import { createLogger } from "@common/logging/index";
import { WebSocketFeatureFlagsService } from '../config/websocket-feature-flags.config';

/**
 * WebSocketServerProvider - 强类型WebSocket服务器提供者
 *
 * 🎯 解决问题：
 * - 移除 forwardRef 循环依赖
 * - 提供强类型支持
 * - 统一WebSocket服务器访问
 * - 生命周期管理
 */
@Injectable()
export class WebSocketServerProvider {
  private readonly logger = createLogger("WebSocketServerProvider");
  private gatewayServer: Server | null = null; // Gateway服务器引用（唯一实例）
  private isInitialized = false;

  constructor(private readonly featureFlags: WebSocketFeatureFlagsService) {}

  /**
   * 从Gateway获取服务器实例（推荐方式）
   * @param server Gateway服务器实例
   */
  setGatewayServer(server: Server): void {
    this.gatewayServer = server;
    this.isInitialized = true;

    this.logger.log("Gateway服务器已集成到Provider", {
      hasServer: !!server,
      serverPath: server?.path(),
      source: "gateway",
      engineConnectionCount: server?.engine?.clientsCount || 0,
    });
  }


  /**
   * 获取WebSocket服务器实例（仅Gateway模式）
   * @returns Socket.IO服务器实例或null
   */
  getServer(): Server | null {
    return this.gatewayServer;
  }

  /**
   * 将客户端加入多个房间（基于Gateway Server）
   */
  async joinClientToRooms(clientId: string, rooms: string[] | string): Promise<boolean> {
    const activeServer = this.getServer();
    const targetRooms = Array.isArray(rooms) ? rooms : [rooms];

    if (!this.isServerAvailable() || !activeServer) {
      this.logger.warn("WebSocket服务器不可用，无法加入房间", {
        clientId,
        rooms: targetRooms,
        serverSource: "gateway",
      });
      return false;
    }

    try {
      const clientSocket = activeServer.sockets.sockets.get(clientId);
      if (!clientSocket) {
        this.logger.warn("客户端Socket连接不存在(加入房间跳过)", { clientId, rooms: targetRooms });
        return false;
      }

      if (!clientSocket.connected) {
        this.logger.warn("客户端Socket已断开(加入房间跳过)", { clientId, rooms: targetRooms });
        return false;
      }

      for (const room of targetRooms) {
        await clientSocket.join(room);
      }

      this.logger.debug("客户端已加入房间", { clientId, rooms: targetRooms });
      return true;
    } catch (error) {
      this.logger.error("加入房间失败", { clientId, rooms: targetRooms, error: (error as any)?.message });
      return false;
    }
  }

  /**
   * 将客户端从多个房间移除（基于Gateway Server）
   */
  async leaveClientFromRooms(clientId: string, rooms: string[] | string): Promise<boolean> {
    const activeServer = this.getServer();
    const targetRooms = Array.isArray(rooms) ? rooms : [rooms];

    if (!this.isServerAvailable() || !activeServer) {
      this.logger.warn("WebSocket服务器不可用，无法退出房间", {
        clientId,
        rooms: targetRooms,
        serverSource: "gateway",
      });
      return false;
    }

    try {
      const clientSocket = activeServer.sockets.sockets.get(clientId);
      if (!clientSocket) {
        this.logger.warn("客户端Socket连接不存在(退出房间跳过)", { clientId, rooms: targetRooms });
        return false;
      }

      for (const room of targetRooms) {
        await clientSocket.leave(room);
      }

      this.logger.debug("客户端已退出房间", { clientId, rooms: targetRooms });
      return true;
    } catch (error) {
      this.logger.error("退出房间失败", { clientId, rooms: targetRooms, error: (error as any)?.message });
      return false;
    }
  }

  /**
   * 检查WebSocket服务器是否可用（仅Gateway模式）
   * @returns 是否可用
   */
  isServerAvailable(): boolean {
    const basicAvailability = this.gatewayServer !== null && this.isInitialized;

    // 检查特性开关状态
    if (!this.featureFlags.isGatewayOnlyModeEnabled()) {
      this.logger.warn("Gateway-only模式未启用，可能影响服务可用性", {
        gatewayOnlyMode: this.featureFlags.isGatewayOnlyModeEnabled(),
        hasGatewayServer: !!this.gatewayServer,
        isInitialized: this.isInitialized
      });
    }

    return basicAvailability;
  }

  /**
   * 获取服务器统计信息
   * @returns 服务器统计信息
   */
  getServerStats(): {
    isAvailable: boolean;
    connectedClients: number;
    serverPath: string;
    namespaces: any[];
    serverSource: "gateway" | "none";
  } {
    const activeServer = this.getServer();

    if (!activeServer) {
      return {
        isAvailable: false,
        connectedClients: 0,
        serverPath: "",
        namespaces: [],
        serverSource: "none",
      };
    }

    const namespaces = Array.from(
      activeServer.of("/").adapter.rooms.keys() || [],
    );

    return {
      isAvailable: this.isInitialized,
      connectedClients: activeServer.engine?.clientsCount || 0,
      serverPath: activeServer.path(),
      namespaces,
      serverSource: "gateway",
    };
  }

  /**
   * 向指定客户端发送消息
   * @param clientId 客户端ID
   * @param event 事件名称
   * @param data 消息数据
   * @returns 是否发送成功
   */
  async emitToClient(
    clientId: string,
    event: string,
    data: any,
  ): Promise<boolean> {
    const activeServer = this.getServer();

    if (!this.isServerAvailable() || !activeServer) {
      this.logger.warn("WebSocket服务器不可用，无法发送消息", {
        clientId,
        event,
        serverSource: "gateway",
      });
      return false;
    }

    try {
      const clientSocket = activeServer.sockets.sockets.get(clientId);
      if (!clientSocket) {
        this.logger.warn("客户端Socket连接不存在", { clientId, event });
        return false;
      }

      if (!clientSocket.connected) {
        this.logger.warn("客户端Socket已断开连接", { clientId, event });
        return false;
      }

      clientSocket.emit(event, data);
      return true;
    } catch (error) {
      this.logger.error("发送消息到客户端失败", {
        clientId,
        event,
        error: error.message,
        serverSource: "gateway",
      });
      return false;
    }
  }

  /**
   * 向指定房间广播消息
   * @param room 房间名称
   * @param event 事件名称
   * @param data 消息数据
   * @returns 是否广播成功
   */
  async broadcastToRoom(
    room: string,
    event: string,
    data: any,
  ): Promise<boolean> {
    const activeServer = this.getServer();

    if (!this.isServerAvailable() || !activeServer) {
      this.logger.warn("WebSocket服务器不可用，无法广播消息", {
        room,
        event,
        serverSource: "gateway",
      });
      return false;
    }

    try {
      activeServer.to(room).emit(event, data);

      this.logger.debug("消息已广播到房间", {
        room,
        event,
        dataSize: JSON.stringify(data).length,
        serverSource: "gateway",
      });

      return true;
    } catch (error) {
      this.logger.error("广播消息到房间失败", {
        room,
        event,
        error: error.message,
        serverSource: "gateway",
      });
      return false;
    }
  }

  /**
   * 重置服务器实例（用于测试或重启场景）
   */
  reset(): void {
    this.gatewayServer = null;
    this.isInitialized = false;
    this.logger.log("WebSocket服务器实例已重置");
  }

  /**
   * 健康检查
   * @returns 健康检查结果
   */
  healthCheck(): {
    status: "healthy" | "degraded" | "unhealthy";
    details: any;
  } {
    const activeServer = this.getServer();

    if (!activeServer) {
      return {
        status: "unhealthy",
        details: {
          reason: "No server instance",
          isInitialized: this.isInitialized,
          hasGatewayServer: !!this.gatewayServer,
        },
      };
    }

    if (!this.isInitialized) {
      return {
        status: "degraded",
        details: {
          reason: "Server not fully initialized",
          hasServer: !!activeServer,
          serverSource: "gateway",
        },
      };
    }

    const stats = this.getServerStats();
    return {
      status: "healthy",
      details: {
        ...stats,
        uptime: process.uptime(),
      },
    };
  }

  /**
   * 强制健康检查 - 用于Legacy代码移除验证
   * 比标准healthCheck更严格，确保Gateway完全可用
   * @returns 是否满足Legacy移除的健康条件
   */
  isReadyForLegacyRemoval(): {
    ready: boolean;
    reason?: string;
    details: any;
  } {
    const healthStatus = this.healthCheck();
    const featureFlagsHealth = this.featureFlags.getHealthStatus();

    // 检查特性开关状态
    if (featureFlagsHealth.status === 'critical') {
      return {
        ready: false,
        reason: `特性开关状态异常: ${featureFlagsHealth.recommendations.join(', ')}`,
        details: {
          featureFlagsHealth,
          healthStatus: healthStatus.details
        },
      };
    }

    // 必须启用Gateway-only模式
    if (!this.featureFlags.isGatewayOnlyModeEnabled()) {
      return {
        ready: false,
        reason: "Gateway-only模式未启用",
        details: {
          gatewayOnlyMode: this.featureFlags.isGatewayOnlyModeEnabled(),
          featureFlags: this.featureFlags.getFeatureFlags()
        },
      };
    }

    // 严格模式下不允许Legacy回退
    if (this.featureFlags.isStrictModeEnabled() && this.featureFlags.isLegacyFallbackAllowed()) {
      return {
        ready: false,
        reason: "严格模式与Legacy回退冲突",
        details: {
          strictMode: this.featureFlags.isStrictModeEnabled(),
          legacyFallback: this.featureFlags.isLegacyFallbackAllowed()
        },
      };
    }

    // 必须是healthy状态
    if (healthStatus.status !== "healthy") {
      return {
        ready: false,
        reason: `Gateway状态不健康: ${healthStatus.status}`,
        details: healthStatus.details,
      };
    }

    // 必须有Gateway服务器（优先于Legacy）
    if (!this.gatewayServer) {
      return {
        ready: false,
        reason: "Gateway服务器未集成，仍使用Legacy模式",
        details: {
          hasGatewayServer: !!this.gatewayServer,
          serverSource: healthStatus.details.serverSource,
        },
      };
    }

    // 检查连接数是否正常（避免在无连接时进行移除）
    const connectedClients = healthStatus.details.connectedClients || 0;
    if (connectedClients < 0) {
      return {
        ready: false,
        reason: "无法获取客户端连接数",
        details: { connectedClients },
      };
    }

    // 验证Gateway功能完整性
    try {
      const serverPath = this.gatewayServer.path();
      const namespaces = Array.from(
        this.gatewayServer.of("/").adapter.rooms.keys() || [],
      );

      return {
        ready: true,
        details: {
          ...healthStatus.details,
          featureFlagsValidation: {
            status: featureFlagsHealth.status,
            flags: featureFlagsHealth.flags,
            lastCheck: featureFlagsHealth.lastCheck
          },
          gatewayValidation: {
            serverPath,
            namespaceCount: namespaces.length,
            connectedClients,
            validationTime: new Date().toISOString(),
          },
        },
      };
    } catch (error) {
      return {
        ready: false,
        reason: `Gateway功能验证失败: ${error.message}`,
        details: { error: error.message },
      };
    }
  }
}

/**
 * WebSocket服务器Token常量
 */
export const WEBSOCKET_SERVER_TOKEN = "WEBSOCKET_SERVER_PROVIDER";

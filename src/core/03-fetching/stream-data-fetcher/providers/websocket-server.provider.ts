import { Injectable } from "@nestjs/common";
import { Server } from "socket.io";
import { createLogger } from "@common/logging/index";

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
  private server: Server | null = null;
  private gatewayServer: Server | null = null; // 新增：Gateway服务器引用
  private isInitialized = false;

  /**
   * 从Gateway获取服务器实例（推荐方式）
   * @param server Gateway服务器实例
   */
  setGatewayServer(server: Server): void {
    this.gatewayServer = server;
    this.server = server; // 兼容现有API
    this.isInitialized = true;

    this.logger.log("Gateway服务器已集成到Provider", {
      hasServer: !!server,
      serverPath: server?.path(),
      source: "gateway",
      engineConnectionCount: server?.engine?.clientsCount || 0,
    });
  }

  /**
   * 设置WebSocket服务器实例（Legacy方式，保持向后兼容）
   * @param server Socket.IO服务器实例
   */
  setServer(server: Server): void {
    if (this.server && this.isInitialized) {
      this.logger.warn("WebSocket服务器已经初始化，覆盖现有实例", {
        hasExistingServer: !!this.server,
        newServerNamespace: server.path(),
        isGatewayServer: !!this.gatewayServer,
      });
    }

    // 如果没有Gateway服务器，则使用Legacy方式
    if (!this.gatewayServer) {
      this.server = server;
      this.isInitialized = true;

      this.logger.log("WebSocket服务器实例已设置 (Legacy模式)", {
        hasServer: !!server,
        serverPath: server?.path(),
        source: "legacy",
        engineConnectionCount: server?.engine?.clientsCount || 0,
      });
    }
  }

  /**
   * 获取实际的WebSocket服务器（Gateway优先）
   * @returns Socket.IO服务器实例或null
   */
  getServer(): Server | null {
    return this.gatewayServer || this.server;
  }

  /**
   * 检查WebSocket服务器是否可用（Gateway优先）
   * @returns 是否可用
   */
  isServerAvailable(): boolean {
    return (this.gatewayServer || this.server) !== null && this.isInitialized;
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
    serverSource: "gateway" | "legacy" | "none";
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
      serverSource: this.gatewayServer ? "gateway" : "legacy",
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
        serverSource: this.gatewayServer ? "gateway" : "legacy",
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
        serverSource: this.gatewayServer ? "gateway" : "legacy",
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
        serverSource: this.gatewayServer ? "gateway" : "legacy",
      });
      return false;
    }

    try {
      activeServer.to(room).emit(event, data);

      this.logger.debug("消息已广播到房间", {
        room,
        event,
        dataSize: JSON.stringify(data).length,
        serverSource: this.gatewayServer ? "gateway" : "legacy",
      });

      return true;
    } catch (error) {
      this.logger.error("广播消息到房间失败", {
        room,
        event,
        error: error.message,
        serverSource: this.gatewayServer ? "gateway" : "legacy",
      });
      return false;
    }
  }

  /**
   * 重置服务器实例（用于测试或重启场景）
   */
  reset(): void {
    this.server = null;
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
          hasLegacyServer: !!this.server,
        },
      };
    }

    if (!this.isInitialized) {
      return {
        status: "degraded",
        details: {
          reason: "Server not fully initialized",
          hasServer: !!activeServer,
          serverSource: this.gatewayServer ? "gateway" : "legacy",
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
          hasLegacyServer: !!this.server,
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

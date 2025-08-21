import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { createLogger } from '@common/config/logger.config';

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
  private readonly logger = createLogger('WebSocketServerProvider');
  private server: Server | null = null;
  private isInitialized = false;

  /**
   * 设置WebSocket服务器实例
   * @param server Socket.IO服务器实例
   */
  setServer(server: Server): void {
    if (this.server && this.isInitialized) {
      this.logger.warn('WebSocket服务器已经初始化，覆盖现有实例', {
        hasExistingServer: !!this.server,
        newServerNamespace: server.path()
      });
    }

    this.server = server;
    this.isInitialized = true;
    
    this.logger.log('WebSocket服务器实例已设置', {
      hasServer: !!server,
      serverPath: server?.path(),
      engineConnectionCount: server?.engine?.clientsCount || 0
    });
  }

  /**
   * 获取WebSocket服务器实例
   * @returns Socket.IO服务器实例或null
   */
  getServer(): Server | null {
    return this.server;
  }

  /**
   * 检查WebSocket服务器是否可用
   * @returns 是否可用
   */
  isServerAvailable(): boolean {
    return this.server !== null && this.isInitialized;
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
  } {
    if (!this.server) {
      return {
        isAvailable: false,
        connectedClients: 0,
        serverPath: '',
        namespaces: []
      };
    }

    const namespaces = Array.from(this.server.of('/').adapter.rooms.keys() || []);
    
    return {
      isAvailable: this.isInitialized,
      connectedClients: this.server.engine?.clientsCount || 0,
      serverPath: this.server.path(),
      namespaces
    };
  }

  /**
   * 向指定客户端发送消息
   * @param clientId 客户端ID
   * @param event 事件名称
   * @param data 消息数据
   * @returns 是否发送成功
   */
  async emitToClient(clientId: string, event: string, data: any): Promise<boolean> {
    if (!this.isServerAvailable()) {
      this.logger.warn('WebSocket服务器不可用，无法发送消息', { clientId, event });
      return false;
    }

    try {
      const clientSocket = this.server!.sockets.sockets.get(clientId);
      if (!clientSocket) {
        this.logger.warn('客户端Socket连接不存在', { clientId, event });
        return false;
      }

      if (!clientSocket.connected) {
        this.logger.warn('客户端Socket已断开连接', { clientId, event });
        return false;
      }

      clientSocket.emit(event, data);
      return true;
      
    } catch (error) {
      this.logger.error('发送消息到客户端失败', {
        clientId,
        event,
        error: error.message
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
  async broadcastToRoom(room: string, event: string, data: any): Promise<boolean> {
    if (!this.isServerAvailable()) {
      this.logger.warn('WebSocket服务器不可用，无法广播消息', { room, event });
      return false;
    }

    try {
      this.server!.to(room).emit(event, data);
      return true;
      
    } catch (error) {
      this.logger.error('广播消息到房间失败', {
        room,
        event,
        error: error.message
      });
      return false;
    }
  }

  /**
   * 重置服务器实例（用于测试或重启场景）
   */
  reset(): void {
    this.server = null;
    this.isInitialized = false;
    this.logger.log('WebSocket服务器实例已重置');
  }

  /**
   * 健康检查
   * @returns 健康检查结果
   */
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  } {
    if (!this.server) {
      return {
        status: 'unhealthy',
        details: {
          reason: 'No server instance',
          isInitialized: this.isInitialized
        }
      };
    }

    if (!this.isInitialized) {
      return {
        status: 'degraded',
        details: {
          reason: 'Server not fully initialized',
          hasServer: !!this.server
        }
      };
    }

    const stats = this.getServerStats();
    return {
      status: 'healthy',
      details: {
        ...stats,
        uptime: process.uptime()
      }
    };
  }
}

/**
 * WebSocket服务器Token常量
 */
export const WEBSOCKET_SERVER_TOKEN = 'WEBSOCKET_SERVER_PROVIDER';
import { Injectable } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { createLogger } from "@app/config/logger.config";

/**
 * WebSocket连接速率限制配置
 */
interface WebSocketRateLimitConfig {
  /** 连接数限制 - 每IP */
  maxConnectionsPerIP: number;
  /** 连接数限制 - 每用户 */
  maxConnectionsPerUser: number;
  /** 消息速率限制 - 每分钟 */
  messagesPerMinute: number;
  /** 订阅限制 - 每连接 */
  maxSubscriptionsPerConnection: number;
  /** 突发消息限制 - 10秒内 */
  burstMessages: number;
}

/**
 * WebSocket DoS防护Guard
 *
 * 功能：
 * - WebSocket连接数限制
 * - 消息频率控制
 * - 订阅数量限制
 * - 突发消息防护
 * - 恶意连接检测
 */
@Injectable()
export class WebSocketRateLimitGuard {
  private readonly logger = createLogger(WebSocketRateLimitGuard.name);

  // 默认配置
  private readonly config: WebSocketRateLimitConfig = {
    maxConnectionsPerIP: parseInt(
      process.env.WS_MAX_CONNECTIONS_PER_IP || "10",
    ),
    maxConnectionsPerUser: parseInt(
      process.env.WS_MAX_CONNECTIONS_PER_USER || "5",
    ),
    messagesPerMinute: parseInt(process.env.WS_MESSAGES_PER_MINUTE || "120"),
    maxSubscriptionsPerConnection: parseInt(
      process.env.WS_MAX_SUBSCRIPTIONS_PER_CONNECTION || "50",
    ),
    burstMessages: parseInt(process.env.WS_BURST_MESSAGES || "20"),
  };

  // 连接计数 - IP级别
  private readonly ipConnections = new Map<string, Set<string>>();

  // 连接计数 - 用户级别
  private readonly userConnections = new Map<string, Set<string>>();

  // 消息计数
  private readonly messageCounters = new Map<
    string,
    { count: number; lastReset: number; burstCount: number; lastBurst: number }
  >();

  // 订阅计数
  private readonly subscriptionCounters = new Map<string, Set<string>>();

  constructor() {
    // 定期清理过期数据
    setInterval(() => this.cleanup(), 60 * 1000); // 每分钟清理

    this.logger.log("WebSocket DoS防护已启用", this.config);
  }

  /**
   * 检查连接是否被允许
   */
  canConnect(socket: Socket): boolean {
    const clientIP = this.getClientIP(socket);
    const userId = this.getUserId(socket);
    const socketId = socket.id;

    try {
      // 1. 检查IP连接数限制
      if (!this.checkIPConnectionLimit(clientIP, socketId)) {
        this.logger.warn("IP连接数超限", {
          clientIP,
          userId,
          currentConnections: this.ipConnections.get(clientIP)?.size || 0,
          limit: this.config.maxConnectionsPerIP,
        });
        return false;
      }

      // 2. 检查用户连接数限制
      if (userId && !this.checkUserConnectionLimit(userId, socketId)) {
        this.logger.warn("用户连接数超限", {
          clientIP,
          userId,
          currentConnections: this.userConnections.get(userId)?.size || 0,
          limit: this.config.maxConnectionsPerUser,
        });
        return false;
      }

      // 3. 注册连接
      this.registerConnection(clientIP, userId, socketId);

      this.logger.debug("WebSocket连接已允许", {
        clientIP,
        userId,
        socketId,
        totalIPConnections: this.ipConnections.get(clientIP)?.size || 0,
        totalUserConnections: userId
          ? this.userConnections.get(userId)?.size || 0
          : 0,
      });

      return true;
    } catch (error) {
      this.logger.error("连接检查异常", {
        clientIP,
        userId,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 检查消息是否被允许
   */
  canSendMessage(socket: Socket, messageType: string): boolean {
    const socketId = socket.id;
    const clientIP = this.getClientIP(socket);

    try {
      // 1. 检查消息频率限制
      if (!this.checkMessageRateLimit(socketId)) {
        this.logger.warn("消息频率超限", {
          clientIP,
          socketId,
          messageType,
        });
        return false;
      }

      // 2. 检查突发消息限制
      if (!this.checkBurstMessageLimit(socketId)) {
        this.logger.warn("突发消息超限", {
          clientIP,
          socketId,
          messageType,
        });
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error("消息检查异常", {
        clientIP,
        socketId,
        messageType,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 检查订阅是否被允许
   */
  canSubscribe(socket: Socket, symbol: string): boolean {
    const socketId = socket.id;
    const clientIP = this.getClientIP(socket);

    const subscriptions = this.subscriptionCounters.get(socketId) || new Set();

    if (subscriptions.size >= this.config.maxSubscriptionsPerConnection) {
      this.logger.warn("订阅数量超限", {
        clientIP,
        socketId,
        symbol,
        currentSubscriptions: subscriptions.size,
        limit: this.config.maxSubscriptionsPerConnection,
      });
      return false;
    }

    // 记录订阅
    subscriptions.add(symbol);
    this.subscriptionCounters.set(socketId, subscriptions);

    return true;
  }

  /**
   * 移除订阅
   */
  removeSubscription(socket: Socket, symbol: string): void {
    const socketId = socket.id;
    const subscriptions = this.subscriptionCounters.get(socketId);

    if (subscriptions) {
      subscriptions.delete(symbol);

      // 如果没有订阅了，清理整个记录
      if (subscriptions.size === 0) {
        this.subscriptionCounters.delete(socketId);
      }
    }
  }

  /**
   * 连接断开清理
   */
  onDisconnect(socket: Socket): void {
    const clientIP = this.getClientIP(socket);
    const userId = this.getUserId(socket);
    const socketId = socket.id;

    // 从IP连接计数中移除
    const ipConnections = this.ipConnections.get(clientIP);
    if (ipConnections) {
      ipConnections.delete(socketId);
      if (ipConnections.size === 0) {
        this.ipConnections.delete(clientIP);
      }
    }

    // 从用户连接计数中移除
    if (userId) {
      const userConnections = this.userConnections.get(userId);
      if (userConnections) {
        userConnections.delete(socketId);
        if (userConnections.size === 0) {
          this.userConnections.delete(userId);
        }
      }
    }

    // 清理消息计数器
    this.messageCounters.delete(socketId);

    // 清理订阅计数器
    this.subscriptionCounters.delete(socketId);

    this.logger.debug("WebSocket连接已清理", {
      clientIP,
      userId,
      socketId,
    });
  }

  /**
   * 检查IP连接数限制
   */
  private checkIPConnectionLimit(clientIP: string, socketId: string): boolean {
    const connections = this.ipConnections.get(clientIP) || new Set();
    return connections.size < this.config.maxConnectionsPerIP;
  }

  /**
   * 检查用户连接数限制
   */
  private checkUserConnectionLimit(userId: string, socketId: string): boolean {
    const connections = this.userConnections.get(userId) || new Set();
    return connections.size < this.config.maxConnectionsPerUser;
  }

  /**
   * 注册连接
   */
  private registerConnection(
    clientIP: string,
    userId: string | null,
    socketId: string,
  ): void {
    // 注册IP连接
    const ipConnections = this.ipConnections.get(clientIP) || new Set();
    ipConnections.add(socketId);
    this.ipConnections.set(clientIP, ipConnections);

    // 注册用户连接
    if (userId) {
      const userConnections = this.userConnections.get(userId) || new Set();
      userConnections.add(socketId);
      this.userConnections.set(userId, userConnections);
    }
  }

  /**
   * 检查消息频率限制
   */
  private checkMessageRateLimit(socketId: string): boolean {
    const now = Date.now();
    let counter = this.messageCounters.get(socketId);

    if (!counter) {
      counter = { count: 0, lastReset: now, burstCount: 0, lastBurst: now };
      this.messageCounters.set(socketId, counter);
    }

    // 重置1分钟窗口
    if (now - counter.lastReset >= 60 * 1000) {
      counter.count = 0;
      counter.lastReset = now;
    }

    if (counter.count >= this.config.messagesPerMinute) {
      return false;
    }

    counter.count++;
    return true;
  }

  /**
   * 检查突发消息限制
   */
  private checkBurstMessageLimit(socketId: string): boolean {
    const now = Date.now();
    const counter = this.messageCounters.get(socketId);

    if (!counter) return true;

    // 重置10秒突发窗口
    if (now - counter.lastBurst >= 10 * 1000) {
      counter.burstCount = 0;
      counter.lastBurst = now;
    }

    if (counter.burstCount >= this.config.burstMessages) {
      return false;
    }

    counter.burstCount++;
    return true;
  }

  /**
   * 获取客户端IP
   */
  private getClientIP(socket: Socket): string {
    // 从Socket.IO握手信息中获取IP
    const forwarded = socket.handshake.headers["x-forwarded-for"] as string;
    const realIP = socket.handshake.headers["x-real-ip"] as string;
    const remoteAddr = socket.handshake.address;

    if (forwarded) {
      return forwarded.split(",")[0].trim();
    }

    if (realIP) {
      return realIP.trim();
    }

    return remoteAddr || "unknown";
  }

  /**
   * 获取用户ID
   */
  private getUserId(socket: Socket): string | null {
    // 从握手认证信息中获取
    const user = (socket as any).user;
    return user?.id || null;
  }

  /**
   * 定期清理
   */
  private cleanup(): void {
    // 这里可以添加更多清理逻辑
    this.logger.debug("WebSocket防护数据清理完成", {
      activeIPs: this.ipConnections.size,
      activeUsers: this.userConnections.size,
      activeMessages: this.messageCounters.size,
      activeSubscriptions: this.subscriptionCounters.size,
    });
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      config: this.config,
      connections: {
        byIP: Array.from(this.ipConnections.entries()).map(([ip, sockets]) => ({
          ip,
          count: sockets.size,
          sockets: Array.from(sockets),
        })),
        byUser: Array.from(this.userConnections.entries()).map(
          ([user, sockets]) => ({
            user,
            count: sockets.size,
            sockets: Array.from(sockets),
          }),
        ),
      },
      messages: Array.from(this.messageCounters.entries()).map(
        ([socketId, counter]) => ({
          socketId,
          count: counter.count,
          burstCount: counter.burstCount,
          lastReset: new Date(counter.lastReset).toISOString(),
          lastBurst: new Date(counter.lastBurst).toISOString(),
        }),
      ),
      subscriptions: Array.from(this.subscriptionCounters.entries()).map(
        ([socketId, subs]) => ({
          socketId,
          count: subs.size,
          symbols: Array.from(subs),
        }),
      ),
    };
  }
}

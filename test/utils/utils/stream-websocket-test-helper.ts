/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Stream Receiver WebSocket测试工具库
 * 为Stream Receiver黑盒测试提供专用的WebSocket连接和数据流测试工具
 */

import { io, Socket } from "socket.io-client";

export interface StreamWebSocketConfig {
  baseURL: string;
  auth: {
    appKey: string;
    accessToken: string;
  };
  timeout?: number;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
}

export interface StreamSubscriptionRequest {
  symbols: string[];
  dataType: string;
  options?: {
    priority?: "high" | "normal" | "low";
    bufferSize?: number;
  };
}

export interface StreamMessage {
  type: string;
  symbol?: string;
  code?: string;
  data: any;
  timestamp?: string;
  sequence?: number;
}

export interface StreamConnectionStats {
  connected: boolean;
  connectionId?: string;
  connectTime?: number;
  disconnectTime?: number;
  reconnectCount: number;
  messagesReceived: number;
  messagesPerSecond: number;
  averageLatency: number;
  errors: string[];
}

export class StreamWebSocketTestHelper {
  private client: Socket | null = null;
  private config: StreamWebSocketConfig;
  private stats: StreamConnectionStats;
  private _messageBuffer: StreamMessage[] = [];
  private connectTime: number = 0;
  private lastMessageTime: number = 0;
  private latencyMeasurements: number[] = [];

  constructor(config: StreamWebSocketConfig) {
    this.config = {
      timeout: 15000,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      ...config,
    };

    this.stats = {
      connected: false,
      reconnectCount: 0,
      messagesReceived: 0,
      messagesPerSecond: 0,
      averageLatency: 0,
      errors: [],
    };
  }

  /**
   * 建立WebSocket连接
   */
  async connect(): Promise<StreamConnectionStats> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`WebSocket连接超时 (${this.config.timeout}_ms)`));
      }, this.config.timeout);

      const wsURL = this.config.baseURL.replace("http", "ws");

      this.client = io(wsURL, {
        path: "/api/v1/stream-receiver/connect",
        auth: this.config.auth,
        transports: ["websocket"],
        timeout: this.config.timeout,
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
      });

      this.client.on("connect", () => {
        clearTimeout(timeout);
        this.connectTime = Date.now();
        this.stats.connected = true;
        this.stats.connectionId = this.client?.id;
        this.stats.connectTime = this.connectTime;

        console.log(`✅ WebSocket连接建立: ${this.client?.id}`);
        resolve(this.stats);
      });

      this.client.on("connect_error", (error) => {
        clearTimeout(timeout);
        this.stats.errors.push(`连接错误: ${error.message}`);
        reject(new Error(`WebSocket连接失败: ${error.message}`));
      });

      this.client.on("disconnect", (reason) => {
        this.stats.connected = false;
        this.stats.disconnectTime = Date.now();
        console.log(`🔌 WebSocket断开连接: ${reason}`);
      });

      this.client.on("reconnect", (attemptNumber) => {
        this.stats.reconnectCount++;
        console.log(`🔄 WebSocket重连成功 (第${attemptNumber}次尝试)`);
      });

      this.setupMessageHandlers();
    });
  }

  /**
   * 设置消息处理器
   */
  private setupMessageHandlers(): void {
    if (!this.client) return;

    // 实时报价数据
    this.client.on("quote_update", (data) => {
      this.handleMessage("quote_update", data);
    });

    // 深度数据
    this.client.on("depth_update", (data) => {
      this.handleMessage("depth_update", data);
    });

    // 成交数据
    this.client.on("trade_update", (data) => {
      this.handleMessage("trade_update", data);
    });

    // 订阅确认
    this.client.on("subscription_confirmed", (data) => {
      console.log("✅ 订阅确认:", data);
    });

    // 订阅错误
    this.client.on("subscription_error", (error) => {
      console.error("❌ 订阅错误:", error);
      this.stats.errors.push(`订阅错误: ${error.message || error}`);
    });

    // 取消订阅确认
    this.client.on("unsubscription_confirmed", (data) => {
      console.log("✅ 取消订阅确认:", data);
    });

    // 认证确认
    this.client.on("authenticated", (data) => {
      console.log("🔑 认证成功:", data);
    });

    // 认证错误
    this.client.on("auth_error", (error) => {
      console.error("🔑❌ 认证失败:", error);
      this.stats.errors.push(`认证错误: ${error.message || error}`);
    });

    // 状态响应
    this.client.on("status_response", (status) => {
      console.log("📊 连接状态:", status);
    });
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(type: string, data: any): void {
    const now = Date.now();
    const message: StreamMessage = {
      type,
      symbol: data.symbol || data.code,
      data,
      timestamp: data.timestamp || new Date().toISOString(),
      sequence: this.stats.messagesReceived + 1,
    };

    this._messageBuffer.push(message);
    this.stats.messagesReceived++;

    // 计算延迟
    if (data.timestamp) {
      const dataTime = new Date(data.timestamp).getTime();
      const latency = now - dataTime;
      this.latencyMeasurements.push(latency);

      // 更新平均延迟
      this.stats.averageLatency =
        this.latencyMeasurements.reduce((sum, lat) => sum + lat, 0) /
        this.latencyMeasurements.length;
    }

    // 计算消息频率
    if (this.lastMessageTime > 0) {
      const timeDiff = (now - this.connectTime) / 1000; // 秒
      this.stats.messagesPerSecond = this.stats.messagesReceived / timeDiff;
    }
    this.lastMessageTime = now;

    console.log(
      `📊 收到${type}消息: ${message.symbol} (总计: ${this.stats.messagesReceived})`,
    );
  }

  /**
   * 订阅股票符号
   */
  async subscribe(request: StreamSubscriptionRequest): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error("WebSocket未连接"));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("订阅超时"));
      }, 10000);

      // 监听订阅确认
      const confirmHandler = (data: any) => {
        clearTimeout(timeout);
        this.client?.off("subscription_confirmed", confirmHandler);
        this.client?.off("subscription_error", errorHandler);
        console.log(`✅ 订阅成功: ${request.symbols.join(", ")}`);
        resolve(true);
      };

      const errorHandler = (error: any) => {
        clearTimeout(timeout);
        this.client?.off("subscription_confirmed", confirmHandler);
        this.client?.off("subscription_error", errorHandler);
        reject(new Error(`订阅失败: ${error.message || error}`));
      };

      this.client.on("subscription_confirmed", confirmHandler);
      this.client.on("subscription_error", errorHandler);

      // 发送订阅请求
      this.client.emit("subscribe", request);
      console.log(`📡 发送订阅请求: ${request.symbols.join(", ")}`);
    });
  }

  /**
   * 取消订阅股票符号
   */
  async unsubscribe(symbols: string[]): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error("WebSocket未连接"));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error("取消订阅超时"));
      }, 10000);

      // 监听取消订阅确认
      const confirmHandler = (data: any) => {
        clearTimeout(timeout);
        this.client?.off("unsubscription_confirmed", confirmHandler);
        console.log(`✅ 取消订阅成功: ${symbols.join(", ")}`);
        resolve(true);
      };

      this.client.on("unsubscription_confirmed", confirmHandler);

      // 发送取消订阅请求
      this.client.emit("unsubscribe", { symbols });
      console.log(`📡 发送取消订阅请求: ${symbols.join(", ")}`);
    });
  }

  /**
   * 获取连接状态
   */
  async getStatus(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.client.connected) {
        reject(new Error("WebSocket未连接"));
        return;
      }

      const timeout = setTimeout(() => {
        resolve({
          connected: this.client?.connected,
          connectionId: this.client?.id,
        });
      }, 5000);

      // 监听状态响应
      const statusHandler = (status: any) => {
        clearTimeout(timeout);
        this.client?.off("status_response", statusHandler);
        resolve(status);
      };

      this.client.on("status_response", statusHandler);
      this.client.emit("get_status");
    });
  }

  /**
   * 等待接收指定数量的消息
   */
  async waitForMessages(
    count: number,
    timeoutMs: number = 30000,
  ): Promise<StreamMessage[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `等待${count}条消息超时，实际收到${this._messageBuffer.length}条`,
          ),
        );
      }, timeoutMs);

      const checkMessages = () => {
        if (this._messageBuffer.length >= count) {
          clearTimeout(timeout);
          resolve(this._messageBuffer.slice(0, count));
        } else {
          setTimeout(checkMessages, 100);
        }
      };

      checkMessages();
    });
  }

  /**
   * 等待接收特定符号的消息
   */
  async waitForSymbolMessages(
    symbols: string[],
    minMessagesPerSymbol: number = 1,
    timeoutMs: number = 30000,
  ): Promise<Map<string, StreamMessage[]>> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const result = this.getMessagesBySymbol(symbols);
        reject(
          new Error(
            `等待符号消息超时，收到: ${Array.from(result.entries())
              .map(([sym, msgs]) => `${sym}:${msgs.length}`)
              .join(", ")}`,
          ),
        );
      }, timeoutMs);

      const checkMessages = () => {
        const symbolMessages = this.getMessagesBySymbol(symbols);
        const allSymbolsSatisfied = symbols.every(
          (symbol) =>
            (symbolMessages.get(symbol)?.length || 0) >= minMessagesPerSymbol,
        );

        if (allSymbolsSatisfied) {
          clearTimeout(timeout);
          resolve(symbolMessages);
        } else {
          setTimeout(checkMessages, 200);
        }
      };

      checkMessages();
    });
  }

  /**
   * 按符号分组获取消息
   */
  getMessagesBySymbol(symbols?: string[]): Map<string, StreamMessage[]> {
    const result = new Map<string, StreamMessage[]>();

    for (const message of this._messageBuffer) {
      if (message.symbol) {
        if (!symbols || symbols.includes(message.symbol)) {
          if (!result.has(message.symbol)) {
            result.set(message.symbol, []);
          }
          result.get(message.symbol)!.push(message);
        }
      }
    }

    return result;
  }

  /**
   * 获取统计信息
   */
  getStats(): StreamConnectionStats {
    return { ...this.stats };
  }

  /**
   * 获取所有收到的消息
   */
  getAllMessages(): StreamMessage[] {
    return [...this._messageBuffer];
  }

  /**
   * 清除消息缓冲区
   */
  clearMessages(): void {
    this._messageBuffer = [];
    this.latencyMeasurements = [];
    this.stats.messagesReceived = 0;
    this.stats.averageLatency = 0;
    this.stats.messagesPerSecond = 0;
  }

  /**
   * 模拟网络断线（用于测试重连）
   */
  simulateDisconnection(): void {
    if (this.client && this.client.connected) {
      console.log("🔌 模拟网络断线...");
      this.client.disconnect();
    }
  }

  /**
   * 断开连接并清理资源
   */
  disconnect(): void {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
      this.stats.connected = false;
      this.stats.disconnectTime = Date.now();
      console.log("🔌 WebSocket连接已断开");
    }
  }

  /**
   * 检查WebSocket连接是否健康
   */
  isHealthy(): boolean {
    return this.client?.connected === true && this.stats.errors.length === 0;
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport(): {
    connectionStats: StreamConnectionStats;
    messageAnalysis: {
      totalMessages: number;
      messagesByType: Map<string, number>;
      messagesBySymbol: Map<string, number>;
      averageLatency: number;
      maxLatency: number;
      minLatency: number;
    };
    recommendations: string[];
  } {
    const messagesByType = new Map<string, number>();
    const messagesBySymbol = new Map<string, number>();

    for (const message of this._messageBuffer) {
      // 按类型统计
      const count = messagesByType.get(message.type) || 0;
      messagesByType.set(message.type, count + 1);

      // 按符号统计
      if (message.symbol) {
        const symbolCount = messagesBySymbol.get(message.symbol) || 0;
        messagesBySymbol.set(message.symbol, symbolCount + 1);
      }
    }

    const maxLatency = Math.max(...this.latencyMeasurements, 0);
    const minLatency = Math.min(...this.latencyMeasurements, 0);

    // 生成建议
    const recommendations: string[] = [];
    if (this.stats.averageLatency > 2000) {
      recommendations.push("平均延迟较高，建议检查网络连接");
    }
    if (this.stats.messagesPerSecond < 0.1) {
      recommendations.push("消息频率较低，可能是数据源问题");
    }
    if (this.stats.reconnectCount > 0) {
      recommendations.push("发生了重连，建议检查连接稳定性");
    }
    if (this.stats.errors.length > 0) {
      recommendations.push(
        `发生了${this.stats.errors.length}个错误，需要检查日志`,
      );
    }

    return {
      connectionStats: this.getStats(),
      messageAnalysis: {
        totalMessages: this._messageBuffer.length,
        messagesByType,
        messagesBySymbol,
        averageLatency: this.stats.averageLatency,
        maxLatency,
        minLatency,
      },
      recommendations,
    };
  }
}

/**
 * 创建Stream WebSocket测试助手的便利函数
 */
export function createStreamWebSocketHelper(
  baseURL: string,
  auth: { appKey: string; accessToken: string },
  options?: Partial<StreamWebSocketConfig>,
): StreamWebSocketTestHelper {
  return new StreamWebSocketTestHelper({
    baseURL,
    auth,
    ...options,
  });
}

/**
 * 验证Stream消息格式的工具函数
 */
export function validateStreamMessage(message: any): message is StreamMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    typeof message.type === "string" &&
    message.data !== undefined
  );
}

/**
 * 生成测试符号列表的工具函数
 */
export function generateTestSymbols(
  markets: string[] = ["HK", "US", "SZ"],
  count: number = 3,
): string[] {
  const symbolTemplates = {
    HK: (i: number) => `${700 + i}.HK`,
    US: (i: number) => `TEST${i}`,
    SZ: (i: number) => `00000${i}`.slice(-6),
  };

  const symbols: string[] = [];
  for (let i = 0; i < count; i++) {
    for (const market of markets) {
      if (symbolTemplates[market as keyof typeof symbolTemplates]) {
        symbols.push(
          symbolTemplates[market as keyof typeof symbolTemplates](i),
        );
      }
    }
  }

  return symbols.slice(0, count);
}

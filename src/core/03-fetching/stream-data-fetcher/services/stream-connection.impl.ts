import { OnModuleDestroy } from "@nestjs/common";
import { createLogger } from "@common/logging";
import { sanitizeLogData } from "@common/logging";
import {
  StreamConnection,
  StreamConnectionOptions,
  StreamConnectionStatus,
  StreamConnectionStats,
} from "../interfaces";

/**
 * 流连接具体实现类
 * 封装第三方SDK的WebSocket连接，提供统一的接口
 */
export class StreamConnectionImpl implements StreamConnection, OnModuleDestroy {
  private readonly logger = createLogger("StreamConnection");

  public readonly id: string;
  public readonly provider: string;
  public readonly capability: string;
  public readonly createdAt: Date;
  public readonly options: StreamConnectionOptions;

  public isConnected: boolean = false;
  public lastActiveAt: Date;
  public subscribedSymbols: Set<string> = new Set();

  // 回调函数
  private dataCallbacks: Array<(data: any) => void> = [];
  private statusCallbacks: Array<(status: StreamConnectionStatus) => void> = [];
  private errorCallbacks: Array<(error: Error) => void> = [];

  // 统计信息
  private stats = {
    messagesReceived: 0,
    messagesSent: 0,
    errorCount: 0,
    reconnectCount: 0,
    lastHeartbeat: new Date(),
    processingTimes: [] as number[],
  };

  // SDK能力实例
  private capabilityInstance: any;
  private contextService: any;

  // 连接状态
  private currentStatus: StreamConnectionStatus =
    StreamConnectionStatus.DISCONNECTED;

  // 定时器管理
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(
    connectionId: string,
    provider: string,
    capability: string,
    capabilityInstance: any,
    contextService: any,
    options: StreamConnectionOptions = {},
  ) {
    this.id = connectionId;
    this.provider = provider;
    this.capability = capability;
    this.capabilityInstance = capabilityInstance;
    this.contextService = contextService;
    this.createdAt = new Date();
    this.lastActiveAt = new Date();
    this.options = {
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectIntervalMs: 3000,
      heartbeatIntervalMs: 30000,
      connectionTimeoutMs: 15000,
      compressionEnabled: false,
      batchSize: 100,
      ...options,
    };

    this.initializeConnection();
  }

  /**
   * 初始化连接
   */
  private async initializeConnection(): Promise<void> {
    try {
      this.updateStatus(StreamConnectionStatus.CONNECTING);

      // 检查能力实例是否已连接
      if (
        this.capabilityInstance.isConnected &&
        this.capabilityInstance.isConnected(this.contextService)
      ) {
        this.isConnected = true;
        this.updateStatus(StreamConnectionStatus.CONNECTED);
        this.lastActiveAt = new Date();

        this.logger.debug("流连接已建立", {
          connectionId: this.id,
          provider: this.provider,
          capability: this.capability,
        });
      } else {
        // 尝试初始化连接
        await this.capabilityInstance.initialize(this.contextService);

        if (this.capabilityInstance.isConnected(this.contextService)) {
          this.isConnected = true;
          this.updateStatus(StreamConnectionStatus.CONNECTED);
          this.lastActiveAt = new Date();

          this.logger.log("流连接初始化成功", {
            connectionId: this.id,
            provider: this.provider,
            capability: this.capability,
          });
        } else {
          throw new Error(
            `流连接初始化失败: ${this.provider}/${this.capability}`,
          );
        }
      }

      // 设置数据接收处理
      this.setupDataReceiving();

      // 启动心跳机制
      if (this.options.heartbeatIntervalMs > 0) {
        this.startHeartbeat();
      }
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  /**
   * 设置数据接收处理
   */
  private setupDataReceiving(): void {
    // 注意: 这里需要根据具体的SDK实现来设置数据接收回调
    // 以下是通用的处理逻辑框架
    if (typeof this.capabilityInstance.onData === "function") {
      this.capabilityInstance.onData((rawData: any) => {
        this.handleIncomingData(rawData);
      });
    }

    if (typeof this.capabilityInstance.onError === "function") {
      this.capabilityInstance.onError((error: any) => {
        this.handleConnectionError(error);
      });
    }

    if (typeof this.capabilityInstance.onDisconnect === "function") {
      this.capabilityInstance.onDisconnect(() => {
        this.handleDisconnection();
      });
    }
  }

  /**
   * 处理接收到的数据
   */
  private handleIncomingData(rawData: any): void {
    const startTime = Date.now();

    try {
      this.stats.messagesReceived++;
      this.lastActiveAt = new Date();

      // 调用所有数据回调函数
      this.dataCallbacks.forEach((callback) => {
        try {
          callback(rawData);
        } catch (error) {
          this.logger.warn("数据回调处理失败", {
            connectionId: this.id,
            error: error.message,
          });
        }
      });

      // 记录处理时间
      const processingTime = Date.now() - startTime;
      this.stats.processingTimes.push(processingTime);

      // 保持最近100次的处理时间记录
      if (this.stats.processingTimes.length > 100) {
        this.stats.processingTimes.shift();
      }
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  /**
   * 处理连接错误
   */
  private handleConnectionError(error: any): void {
    this.stats.errorCount++;
    this.logger.error(
      "流连接错误",
      sanitizeLogData({
        connectionId: this.id,
        provider: this.provider,
        capability: this.capability,
        error: error.message,
        errorType: error.constructor.name,
      }),
    );

    this.updateStatus(StreamConnectionStatus.ERROR);

    // 调用错误回调
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(error);
      } catch (cbError) {
        this.logger.warn("错误回调处理失败", {
          connectionId: this.id,
          error: cbError.message,
        });
      }
    });

    // 自动重连逻辑
    if (
      this.options.autoReconnect &&
      this.stats.reconnectCount < this.options.maxReconnectAttempts
    ) {
      this.scheduleReconnect();
    }
  }

  /**
   * 处理连接断开
   */
  private handleDisconnection(): void {
    this.isConnected = false;
    this.updateStatus(StreamConnectionStatus.DISCONNECTED);

    this.logger.warn("流连接断开", {
      connectionId: this.id,
      provider: this.provider,
      capability: this.capability,
    });

    // 自动重连逻辑
    if (
      this.options.autoReconnect &&
      this.stats.reconnectCount < this.options.maxReconnectAttempts
    ) {
      this.scheduleReconnect();
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    this.updateStatus(StreamConnectionStatus.RECONNECTING);
    this.stats.reconnectCount++;

    setTimeout(async () => {
      try {
        await this.initializeConnection();

        // 重连成功后重新订阅之前的符号
        if (this.subscribedSymbols.size > 0) {
          const symbolsArray = Array.from(this.subscribedSymbols);
          await this.subscribeSymbols(symbolsArray);
        }
      } catch (error) {
        this.logger.error("重连失败", {
          connectionId: this.id,
          reconnectCount: this.stats.reconnectCount,
          error: error.message,
        });
      }
    }, this.options.reconnectIntervalMs);
  }

  /**
   * 更新连接状态
   */
  private updateStatus(status: StreamConnectionStatus): void {
    if (this.currentStatus !== status) {
      const oldStatus = this.currentStatus;
      this.currentStatus = status;

      this.logger.debug("连接状态变化", {
        connectionId: this.id,
        oldStatus,
        newStatus: status,
      });

      // 调用状态变化回调
      this.statusCallbacks.forEach((callback) => {
        try {
          callback(status);
        } catch (error) {
          this.logger.warn("状态回调处理失败", {
            connectionId: this.id,
            error: error.message,
          });
        }
      });
    }
  }

  /**
   * 启动心跳机制
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      if (this.isConnected) {
        try {
          await this.sendHeartbeat();
        } catch (error) {
          this.logger.warn("心跳发送失败", {
            connectionId: this.id,
            error: error.message,
          });
        }
      }
    }, this.options.heartbeatIntervalMs);
  }

  /**
   * 订阅符号 (内部方法)
   */
  private async subscribeSymbols(symbols: string[]): Promise<void> {
    if (typeof this.capabilityInstance.subscribe === "function") {
      await this.capabilityInstance.subscribe(symbols, this.contextService);
      symbols.forEach((symbol) => this.subscribedSymbols.add(symbol));
      this.stats.messagesSent++;
    } else {
      throw new Error("能力实例不支持subscribe方法");
    }
  }

  /**
   * 取消订阅符号 (内部方法)
   */
  private async unsubscribeSymbols(symbols: string[]): Promise<void> {
    if (typeof this.capabilityInstance.unsubscribe === "function") {
      await this.capabilityInstance.unsubscribe(symbols, this.contextService);
      symbols.forEach((symbol) => this.subscribedSymbols.delete(symbol));
      this.stats.messagesSent++;
    } else {
      throw new Error("能力实例不支持unsubscribe方法");
    }
  }

  // === 公共接口实现 ===

  onData(callback: (data: any) => void): void {
    this.dataCallbacks.push(callback);
  }

  onStatusChange(callback: (status: StreamConnectionStatus) => void): void {
    this.statusCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  async sendHeartbeat(): Promise<boolean> {
    try {
      if (
        this.isConnected &&
        typeof this.capabilityInstance.ping === "function"
      ) {
        await this.capabilityInstance.ping(this.contextService);
        this.stats.lastHeartbeat = new Date();
        this.lastActiveAt = new Date();
        return true;
      }
      return false;
    } catch (error) {
      this.logger.warn("心跳发送失败", {
        connectionId: this.id,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * 模块销毁时清理资源
   */
  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  /**
   * 关闭连接 (外部调用接口)
   * 与 StreamDataFetcherService.closeConnection 配合使用
   * @returns Promise<void>
   */
  async close(): Promise<void> {
    try {
      // 清理心跳定时器
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // 清空订阅符号
      this.subscribedSymbols.clear();

      // 关闭底层连接
      if (typeof this.capabilityInstance.close === "function") {
        await this.capabilityInstance.close(this.contextService);
      }

      // 清空事件监听器回调数组（防止内存泄漏）
      this.dataCallbacks.length = 0;
      this.statusCallbacks.length = 0;
      this.errorCallbacks.length = 0;

      // 更新连接状态
      this.isConnected = false;
      this.updateStatus(StreamConnectionStatus.CLOSED);

      this.logger.log("连接已关闭", {
        connectionId: this.id,
        provider: this.provider,
        capability: this.capability,
      });
    } catch (error) {
      this.logger.error("连接关闭失败", {
        connectionId: this.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * 健康检查方法 - 检查连接是否活跃可用
   * @param timeoutMs 健康检查超时时间(毫秒)
   * @returns Promise<boolean> true表示连接健康
   */
  async isAlive(timeoutMs: number = 5000): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      // 检查最近活跃时间
      const timeSinceLastActivity = Date.now() - this.lastActiveAt.getTime();
      const maxInactivityMs = this.options.heartbeatIntervalMs * 2; // 允许2个心跳间隔的不活跃时间

      if (timeSinceLastActivity > maxInactivityMs) {
        this.logger.warn("连接不活跃时间过长", {
          connectionId: this.id,
          timeSinceLastActivity,
          maxInactivityMs,
        });
        return false;
      }

      // 执行心跳检查
      const heartbeatPromise = this.sendHeartbeat();
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error("健康检查超时")), timeoutMs);
      });

      return await Promise.race([heartbeatPromise, timeoutPromise]);
    } catch (error) {
      this.logger.warn("健康检查失败", {
        connectionId: this.id,
        error: error.message,
      });
      return false;
    }
  }

  getStats(): StreamConnectionStats {
    const avgProcessingLatency =
      this.stats.processingTimes.length > 0
        ? this.stats.processingTimes.reduce((sum, time) => sum + time, 0) /
          this.stats.processingTimes.length
        : 0;

    return {
      connectionId: this.id,
      status: this.currentStatus,
      connectionDurationMs: Date.now() - this.createdAt.getTime(),
      messagesReceived: this.stats.messagesReceived,
      messagesSent: this.stats.messagesSent,
      errorCount: this.stats.errorCount,
      reconnectCount: this.stats.reconnectCount,
      lastHeartbeat: this.stats.lastHeartbeat,
      avgProcessingLatencyMs: Math.round(avgProcessingLatency * 100) / 100,
      subscribedSymbolsCount: this.subscribedSymbols.size,
      memoryUsageBytes: process.memoryUsage().heapUsed, // 简单的内存使用估算
    };
  }
}

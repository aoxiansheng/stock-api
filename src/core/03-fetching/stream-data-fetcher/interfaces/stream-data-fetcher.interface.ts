import { REFERENCE_DATA } from "@common/constants/domain";
import { StreamConnectionContext } from "../../../01-entry/stream-receiver/interfaces/connection-management.interface";

/**
 * 流数据获取器接口定义
 * 专门处理WebSocket流式数据的获取和连接管理
 */

/**
 * 流数据获取器主接口
 */
export interface IStreamDataFetcher {
  /**
   * 建立流连接
   * @param params 连接参数
   * @returns 流连接实例
   */
  establishStreamConnection(
    params: StreamConnectionParams,
  ): Promise<StreamConnection>;

  /**
   * 订阅符号数据流
   * @param connection 流连接实例
   * @param symbols 要订阅的符号列表
   * @returns 订阅结果
   */
  subscribeToSymbols(
    connection: StreamConnection,
    symbols: string[],
  ): Promise<void>;

  /**
   * 取消订阅符号数据流
   * @param connection 流连接实例
   * @param symbols 要取消订阅的符号列表
   * @returns 取消订阅结果
   */
  unsubscribeFromSymbols(
    connection: StreamConnection,
    symbols: string[],
  ): Promise<void>;

  /**
   * 关闭流连接
   * @param connection 流连接实例
   * @returns 关闭结果
   */
  closeConnection(connection: StreamConnection): Promise<void>;

  /**
   * 检查连接状态
   * @param connection 流连接实例
   * @returns 连接是否活跃
   */
  isConnectionActive(connection: StreamConnection): boolean;

  /**
   * 获取连接统计信息
   * @param connection 流连接实例
   * @returns 连接统计
   */
  getConnectionStats(connection: StreamConnection): StreamConnectionStats;
}

/**
 * 流连接建立参数
 */
export interface StreamConnectionParams {
  /** 提供商名称 (如: REFERENCE_DATA.PROVIDER_IDS.LONGPORT, 'itick') */
  provider: string;

  /** WebSocket能力类型 (如: 'stream-stock-quote', 'stream-option-quote') */
  capability: string;

  /** 请求ID，用于追踪和日志 */
  requestId: string;

  /** 增强的连接上下文服务 */
  contextService?: StreamConnectionContext;

  /** 可选配置参数 */
  options?: StreamConnectionOptions;
}

/**
 * 流连接可选配置
 */
export interface StreamConnectionOptions {
  /** 自动重连 */
  autoReconnect?: boolean;

  /** 重连最大尝试次数 */
  maxReconnectAttempts?: number;

  /** 重连间隔时间(毫秒) */
  reconnectIntervalMs?: number;

  /** 心跳间隔时间(毫秒) */
  heartbeatIntervalMs?: number;

  /** 连接超时时间(毫秒) */
  connectionTimeoutMs?: number;

  /** 是否启用数据压缩 */
  compressionEnabled?: boolean;

  /** 批量处理大小 */
  batchSize?: number;
}


/**
 * 流操作结果基础接口
 * 通过泛型消除重复代码，支持操作元数据
 */
export interface BaseStreamOperationResult {
  /** 是否成功 */
  success: boolean;

  /** 失败的符号列表 */
  failedSymbols?: string[];

  /** 错误信息 */
  error?: string;

  /** 操作唯一标识 */
  operationId?: string;

  /** 操作时间戳 */
  timestamp?: number;

  /** 操作元数据 */
  metadata?: Record<string, any>;
}

/**
 * 流操作结果泛型接口
 * 通过映射类型动态添加成功字段
 */
export type StreamOperationResult<TSuccessField extends string> = BaseStreamOperationResult & {
  [K in TSuccessField]: string[];
};

/**
 * 订阅结果接口
 * 使用泛型继承统一错误处理模式
 */
export type SubscriptionResult = StreamOperationResult<'subscribedSymbols'>;

/**
 * 取消订阅结果接口
 * 使用泛型继承统一错误处理模式
 */
export type UnsubscriptionResult = StreamOperationResult<'unsubscribedSymbols'>;

/**
 * 未来扩展示例 - 批量操作结果
 * 展示泛型接口的可扩展性
 */
export type BatchOperationResult = StreamOperationResult<'processedSymbols'>;

/**
 * 未来扩展示例 - 验证结果
 * 展示泛型接口的灵活性
 */
export type ValidationResult = StreamOperationResult<'validatedSymbols'>;

/**
 * 流连接实例接口
 */
export interface StreamConnection {
  /** 连接唯一标识 */
  id: string;

  /** 提供商名称 */
  provider: string;

  /** WebSocket能力类型 */
  capability: string;

  /** 连接状态 */
  isConnected: boolean;

  /** 连接创建时间 */
  createdAt: Date;

  /** 最后活跃时间 */
  lastActiveAt: Date;

  /** 当前订阅的符号列表 */
  subscribedSymbols: Set<string>;

  /** 连接配置选项 */
  options: StreamConnectionOptions;

  /**
   * 设置数据接收回调函数
   * @param callback 数据处理回调
   */
  onData(callback: (data: any) => void): void;

  /**
   * 设置连接状态变化回调
   * @param callback 状态变化回调
   */
  onStatusChange(callback: (status: StreamConnectionStatus) => void): void;

  /**
   * 设置错误处理回调
   * @param callback 错误处理回调
   */
  onError(callback: (error: Error) => void): void;

  /**
   * 发送心跳
   * @returns 心跳结果
   */
  sendHeartbeat(): Promise<boolean>;

  /**
   * 获取连接统计信息
   * @returns 统计信息
   */
  getStats(): StreamConnectionStats;

  /**
   * 健康检查方法 - 检查连接是否活跃可用
   * @param timeoutMs 健康检查超时时间(毫秒)
   * @returns Promise<boolean> true表示连接健康
   */
  isAlive(timeoutMs?: number): Promise<boolean>;

  /**
   * 关闭连接并清理资源
   * @returns Promise<void>
   */
  close(): Promise<void>;
}

/**
 * 流连接状态枚举
 */
export enum StreamConnectionStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
  CLOSED = "closed",
}

/**
 * 流连接统计信息
 */
export interface StreamConnectionStats {
  /** 连接ID */
  connectionId: string;

  /** 连接状态 */
  status: StreamConnectionStatus;

  /** 连接持续时间(毫秒) */
  connectionDurationMs: number;

  /** 接收消息总数 */
  messagesReceived: number;

  /** 发送消息总数 */
  messagesSent: number;

  /** 错误计数 */
  errorCount: number;

  /** 重连次数 */
  reconnectCount: number;

  /** 最后心跳时间 */
  lastHeartbeat: Date;

  /** 平均消息处理延迟(毫秒) */
  avgProcessingLatencyMs: number;

  /** 订阅符号数量 */
  subscribedSymbolsCount: number;

  /** 内存使用量(字节) */
  memoryUsageBytes?: number;
}


/**
 * 流数据获取异常基类
 */
export class StreamDataFetcherException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider?: string,
    public readonly capability?: string,
  ) {
    super(message);
    this.name = "StreamDataFetcherException";
  }

  /**
   * 自定义JSON序列化方法
   * 确保异常对象能够正确序列化，包含所有重要属性
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      provider: this.provider,
      capability: this.capability,
      stack: this.stack,
    };
  }
}

/**
 * 流连接异常
 */
export class StreamConnectionException extends StreamDataFetcherException {
  constructor(
    message: string,
    public readonly connectionId?: string,
    provider?: string,
    capability?: string,
  ) {
    super(message, "STREAM_CONNECTION_ERROR", provider, capability);
    this.name = "StreamConnectionException";
  }

  /**
   * 自定义JSON序列化方法
   * 包含连接异常特有的connectionId属性
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      connectionId: this.connectionId,
    };
  }
}

/**
 * 流订阅异常
 */
export class StreamSubscriptionException extends StreamDataFetcherException {
  constructor(
    message: string,
    public readonly symbols?: string[],
    provider?: string,
    capability?: string,
  ) {
    super(message, "STREAM_SUBSCRIPTION_ERROR", provider, capability);
    this.name = "StreamSubscriptionException";
  }

  /**
   * 自定义JSON序列化方法
   * 包含订阅异常特有的symbols属性
   */
  toJSON(): Record<string, any> {
    return {
      ...super.toJSON(),
      symbols: this.symbols,
    };
  }
}
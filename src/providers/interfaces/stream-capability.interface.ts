import { ConnectionStatus } from '../constants/connection.constants';
import { API_OPERATIONS } from '@common/constants/domain';

/**
 * WebSocket 流数据能力接口
 * 与 ICapability 接口相对应，专门用于实时流数据处理
 */
export interface IStreamCapability {
  name: string; // 能力名称，如 API_OPERATIONS.STOCK_DATA.STREAM_QUOTE
  description: string; // 能力描述
  supportedMarkets: string[]; // 支持的市场列表
  supportedSymbolFormats: string[]; // 支持的符号格式
  rateLimit?: StreamRateLimitConfig; // 可选的限流配置

  /**
   * 初始化 WebSocket 连接
   * @param contextService 提供商特定的上下文服务
   */
  initialize(contextService: any): Promise<void>;

  /**
   * 订阅符号数据流
   * @param symbols 要订阅的符号列表
   * @param contextService 提供商特定的上下文服务
   */
  subscribe(symbols: string[], contextService: any): Promise<void>;

  /**
   * 取消订阅符号数据流
   * @param symbols 要取消订阅的符号列表
   * @param contextService 提供商特定的上下文服务
   */
  unsubscribe(symbols: string[], contextService: any): Promise<void>;

  /**
   * 设置消息回调处理器
   * @param callback 消息处理回调函数
   */
  onMessage(callback: (data: any) => void): void;

  /**
   * 清理资源和关闭连接
   */
  cleanup(): Promise<void>;

  /**
   * 检查 WebSocket 连接状态
   * @param contextService 提供商特定的上下文服务（可选）
   */
  isConnected(contextService?: any): boolean;
}

/**
 * WebSocket 限流配置
 */
export interface StreamRateLimitConfig {
  maxConnections?: number; // 最大并发连接数
  maxSubscriptionsPerConnection?: number; // 每个连接最大订阅数
  reconnectDelay?: number; // 重连延迟（毫秒）
  maxReconnectAttempts?: number; // 最大重连尝试次数
}

/**
 * WebSocket 流能力注册信息
 */
export interface IStreamCapabilityRegistration {
  providerName: string;
  capability: IStreamCapability;
  priority: number;
  isEnabled: boolean;
  connectionStatus: ConnectionStatus;
  lastConnectedAt?: Date;
  errorCount: number;
  lastError?: string;
}

/**
 * 流数据回调参数
 */
export interface StreamDataCallbackParams {
  symbol: string;
  data: any;
  timestamp: number;
  provider: string;
  capability: string;
}
